// Music theory helpers for the Sight-Reading Trainer.
//
// Melodies are stored key-independently as diatonic scale *steps* counted
// from the tonic (0 = tonic/do, 1 = re, 2 = mi, ... and negative/>6 values
// reach into neighboring octaves). This file turns a step number into a
// concrete pitch (VexFlow key string + MIDI number) for one of a handful
// of practice keys, and provides note-duration helpers shared by the
// renderer and the audio player.

(function (global) {
  'use strict';

  // Each key lists, for scale degrees 0-6 (tonic..leading tone), the
  // VexFlow pitch-class string (letter + accidental) and the octave that
  // degree lands on in a comfortable, mostly-on-the-staff register.
  // Octaves were chosen so a melody written in C survives the equivalent
  // of a small transposition (F: up a 4th, G: up a 5th, Bb: down a step)
  // without running far off the treble staff.
  const KEYS = {
    C:  { vexKeySig: 'C',  pcs: ['c', 'd', 'e', 'f', 'g', 'a', 'b'],   refOct: [4, 4, 4, 4, 4, 4, 4] },
    F:  { vexKeySig: 'F',  pcs: ['f', 'g', 'a', 'bb', 'c', 'd', 'e'],  refOct: [4, 4, 4, 4, 5, 5, 5] },
    G:  { vexKeySig: 'G',  pcs: ['g', 'a', 'b', 'c', 'd', 'e', 'f#'],  refOct: [4, 4, 4, 5, 5, 5, 5] },
    Bb: { vexKeySig: 'Bb', pcs: ['bb', 'c', 'd', 'eb', 'f', 'g', 'a'], refOct: [3, 4, 4, 4, 4, 4, 4] },
  };

  const KEY_NAMES = Object.keys(KEYS);

  const LETTER_SEMITONES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

  // Base duration -> quarter-note beats.
  const BASE_BEATS = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25 };

  function isDotted(durCode) {
    return durCode.endsWith('.');
  }

  function baseDur(durCode) {
    return isDotted(durCode) ? durCode.slice(0, -1) : durCode;
  }

  // Beats (in quarter notes) that a note/rest of this duration code occupies.
  function beatsForDuration(durCode) {
    const base = baseDur(durCode);
    const beats = BASE_BEATS[base];
    if (beats === undefined) {
      throw new Error('Unknown duration code: ' + durCode);
    }
    return isDotted(durCode) ? beats * 1.5 : beats;
  }

  // Convert our compact duration code (e.g. "q", "8.", "h") into a VexFlow
  // duration string, optionally marking it as a rest.
  function vexDuration(durCode, isRest) {
    const base = baseDur(durCode);
    return base + (isDotted(durCode) ? 'd' : '') + (isRest ? 'r' : '');
  }

  // Turn a diatonic step (relative to the tonic) into { vexKey, midi } for
  // the given key name, e.g. pitchForStep('G', 6) -> { vexKey: 'f#/5', ... }
  function pitchForStep(keyName, step) {
    const key = KEYS[keyName];
    if (!key) throw new Error('Unknown key: ' + keyName);
    const degreeIndex = ((step % 7) + 7) % 7;
    const octaveOffset = Math.floor(step / 7);
    const pc = key.pcs[degreeIndex];
    const octave = key.refOct[degreeIndex] + octaveOffset;
    const letter = pc[0];
    const accidental = pc.slice(1); // '', '#', or 'b'
    const accidentalShift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
    const midi = 12 * (octave + 1) + LETTER_SEMITONES[letter] + accidentalShift;
    return { vexKey: pc + '/' + octave, midi: midi };
  }

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  global.MelodyTheory = {
    KEYS: KEYS,
    KEY_NAMES: KEY_NAMES,
    beatsForDuration: beatsForDuration,
    vexDuration: vexDuration,
    pitchForStep: pitchForStep,
    midiToFrequency: midiToFrequency,
  };
})(window);
