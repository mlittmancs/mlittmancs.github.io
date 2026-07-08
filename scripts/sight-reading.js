// Sight-Reading Trainer game engine: renders a random melody in a random
// key with VexFlow, plays it back through the Web Audio API with a moving
// note highlight, and cycles to a new melody/key pair on request.

(function () {
  'use strict';

  const TEMPO_BPM = 100;
  const KEY_LABELS = { C: 'C major', F: 'F major', G: 'G major', Bb: 'B♭ major' };
  const RECENT_HISTORY = 8;

  let audioCtx = null;
  let currentRound = null;
  let roundNumber = 0;
  const recentMelodyIds = [];

  function getAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function pickMelody() {
    let pool = MELODIES.filter((m) => !recentMelodyIds.includes(m.id));
    if (pool.length === 0) pool = MELODIES;
    const melody = pool[Math.floor(Math.random() * pool.length)];
    recentMelodyIds.push(melody.id);
    if (recentMelodyIds.length > RECENT_HISTORY) recentMelodyIds.shift();
    return melody;
  }

  function pickKey() {
    const names = MelodyTheory.KEY_NAMES;
    return names[Math.floor(Math.random() * names.length)];
  }

  // Renders one melody into `container` using VexFlow and returns the
  // flattened, playback-ready note list plus the SVG element drawn into.
  function renderMelody(melody, keyName, container) {
    container.innerHTML = '';
    const VF = Vex.Flow;

    const FIRST_WIDTH = 270;
    const OTHER_WIDTH = 190;
    const HEIGHT = 170;
    const totalWidth = FIRST_WIDTH + OTHER_WIDTH * (melody.measures.length - 1) + 20;

    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(totalWidth, HEIGHT);
    const context = renderer.getContext();

    const [beatsNum, beatValue] = melody.meter.split('/').map(Number);
    const allNotes = [];
    let x = 10;

    melody.measures.forEach((measure, measureIndex) => {
      const width = measureIndex === 0 ? FIRST_WIDTH : OTHER_WIDTH;
      const stave = new VF.Stave(x, 20, width);
      if (measureIndex === 0) {
        stave.addClef('treble');
        stave.addKeySignature(keyName);
        stave.addTimeSignature(melody.meter);
      }
      stave.setContext(context).draw();

      const voice = new VF.Voice({ num_beats: beatsNum, beat_value: beatValue });
      voice.setStrict(false);

      const vexNotes = measure.map((n) => {
        const isRest = n.s === null;
        const duration = MelodyTheory.vexDuration(n.d, isRest);
        let vexKey = 'b/4';
        let midi = null;
        if (!isRest) {
          const pitch = MelodyTheory.pitchForStep(keyName, n.s);
          vexKey = pitch.vexKey;
          midi = pitch.midi;
        }
        const staveNote = new VF.StaveNote({ keys: [vexKey], duration: duration, clef: 'treble' });
        allNotes.push({ vexNote: staveNote, midi: midi, isRest: isRest, beats: MelodyTheory.beatsForDuration(n.d) });
        return staveNote;
      });

      voice.addTickables(vexNotes);
      new VF.Formatter().joinVoices([voice]).format([voice], stave.getNoteEndX() - stave.getNoteStartX() - 20);
      voice.draw(context, stave);

      VF.Beam.generateBeams(vexNotes.filter((n) => !n.isRest())).forEach((beam) => {
        beam.setContext(context).draw();
      });

      x += width;
    });

    return { allNotes: allNotes, svgEl: container.querySelector('svg') };
  }

  // Adds a movable highlight circle to the rendered SVG; returns a function
  // that moves it to the note at `index`, or hides it when index < 0.
  function setupHighlight(svgEl, allNotes) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('r', '11');
    circle.setAttribute('fill', 'rgba(255, 149, 0, 0.55)');
    circle.setAttribute('stroke', 'none');
    circle.style.display = 'none';
    svgEl.insertBefore(circle, svgEl.firstChild);

    return function highlight(index) {
      if (index < 0 || index >= allNotes.length) {
        circle.style.display = 'none';
        return;
      }
      const note = allNotes[index];
      const x = note.vexNote.getAbsoluteX();
      const ys = note.vexNote.getYs();
      const y = ys && ys.length ? ys[0] : 60;
      circle.setAttribute('cx', String(x + 5));
      circle.setAttribute('cy', String(y));
      circle.style.display = '';
    };
  }

  function playTone(ctx, midi, startTime, duration) {
    const freq = MelodyTheory.midiToFrequency(midi);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);

    const attack = 0.015;
    const release = 0.09;
    const sustainEnd = Math.max(duration - release, attack);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + attack);
    gain.gain.setValueAtTime(0.3, startTime + sustainEnd);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  // Schedules audio playback and calls `onNote(index)` (or -1 when done)
  // in sync with each note's start time. Calls `onComplete` at the end.
  function playMelody(ctx, allNotes, tempoBpm, onNote, onComplete) {
    const quarterSeconds = 60 / tempoBpm;
    const startAt = ctx.currentTime + 0.08;
    let elapsed = 0;

    allNotes.forEach((note, index) => {
      const duration = note.beats * quarterSeconds;
      if (!note.isRest) {
        playTone(ctx, note.midi, startAt + elapsed, duration * 0.92);
      }
      setTimeout(() => onNote(index), elapsed * 1000);
      elapsed += duration;
    });

    setTimeout(() => {
      onNote(-1);
      onComplete();
    }, elapsed * 1000 + 120);
  }

  function normalize(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function el(id) {
    return document.getElementById(id);
  }

  function startNewRound() {
    const melody = pickMelody();
    const keyName = pickKey();
    const { allNotes, svgEl } = renderMelody(melody, keyName, el('notation'));
    const highlightFn = setupHighlight(svgEl, allNotes);

    currentRound = { melody: melody, keyName: keyName, allNotes: allNotes, highlightFn: highlightFn, playing: false };
    roundNumber += 1;

    el('round-label').textContent = 'Round ' + roundNumber;
    el('key-label').textContent = 'Key: ' + KEY_LABELS[keyName];
    el('melody-title').textContent = '';
    el('melody-title').classList.add('hidden');
    el('guess-input').value = '';
    el('guess-input').disabled = false;
    el('guess-feedback').textContent = '';
    el('guess-feedback').className = 'guess-feedback';
    el('reveal-btn').disabled = false;
    el('replay-btn').disabled = true;
    el('next-btn').disabled = true;
    el('guess-input').focus();
  }

  function playCurrentRound() {
    if (!currentRound || currentRound.playing) return;
    currentRound.playing = true;
    el('replay-btn').disabled = true;
    playMelody(getAudioContext(), currentRound.allNotes, TEMPO_BPM, currentRound.highlightFn, () => {
      currentRound.playing = false;
      el('replay-btn').disabled = false;
    });
  }

  function handleReveal() {
    if (!currentRound) return;

    el('melody-title').textContent = currentRound.melody.title;
    el('melody-title').classList.remove('hidden');
    el('reveal-btn').disabled = true;
    el('guess-input').disabled = true;
    el('next-btn').disabled = false;

    const guess = el('guess-input').value.trim();
    const feedback = el('guess-feedback');
    if (guess) {
      const normGuess = normalize(guess);
      const normTitle = normalize(currentRound.melody.title);
      const isMatch = normGuess.length > 0 && (normTitle.includes(normGuess) || normGuess.includes(normTitle));
      feedback.textContent = isMatch ? 'Nice — looks like you got it!' : 'Your guess was: "' + guess + '"';
      feedback.className = isMatch ? 'guess-feedback correct' : 'guess-feedback';
    }

    playCurrentRound();
  }

  document.addEventListener('DOMContentLoaded', () => {
    el('reveal-btn').addEventListener('click', handleReveal);
    el('replay-btn').addEventListener('click', playCurrentRound);
    el('next-btn').addEventListener('click', startNewRound);
    el('guess-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !el('reveal-btn').disabled) handleReveal();
    });
    startNewRound();
  });
})();
