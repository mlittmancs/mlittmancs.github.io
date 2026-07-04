// Wooly Face - a Wooly Willy-style drawing toy.
// A bald face is drawn once on the base canvas; the user draws on a
// transparent canvas layered on top of it.

(function () {
    const faceCanvas = document.getElementById('face-canvas');
    const drawCanvas = document.getElementById('draw-canvas');
    const faceCtx = faceCanvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');

    const thicknessInput = document.getElementById('thickness');
    const thicknessValue = document.getElementById('thickness-value');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const clearBtn = document.getElementById('clear-btn');

    let penThickness = parseInt(thicknessInput.value, 10);
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    function drawFace() {
        const w = faceCanvas.width;
        const h = faceCanvas.height;
        const ctx = faceCtx;
        ctx.clearRect(0, 0, w, h);

        const skinTone = '#f4c99b';
        const featureColor = '#a8674a';
        ctx.lineWidth = 4;
        ctx.strokeStyle = featureColor;
        ctx.lineJoin = 'round';

        // Ears
        ctx.fillStyle = skinTone;
        [w * 0.16, w * 0.84].forEach((ex) => {
            ctx.beginPath();
            ctx.ellipse(ex, h * 0.48, w * 0.06, h * 0.07, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Head
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h * 0.48, w * 0.34, h * 0.36, 0, 0, Math.PI * 2);
        ctx.fillStyle = skinTone;
        ctx.fill();
        ctx.stroke();

        // Eyes
        [w * 0.37, w * 0.63].forEach((ex) => {
            ctx.beginPath();
            ctx.arc(ex, h * 0.42, w * 0.045, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(ex, h * 0.42, w * 0.016, 0, Math.PI * 2);
            ctx.fillStyle = '#000';
            ctx.fill();
        });

        // Nose
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h * 0.44);
        ctx.quadraticCurveTo(w * 0.47, h * 0.53, w * 0.5, h * 0.56);
        ctx.quadraticCurveTo(w * 0.53, h * 0.57, w * 0.52, h * 0.545);
        ctx.stroke();

        // Mouth (smile)
        ctx.beginPath();
        ctx.moveTo(w * 0.38, h * 0.66);
        ctx.quadraticCurveTo(w * 0.5, h * 0.72, w * 0.62, h * 0.66);
        ctx.stroke();
    }

    function getCanvasPoint(evt) {
        const rect = drawCanvas.getBoundingClientRect();
        const scaleX = drawCanvas.width / rect.width;
        const scaleY = drawCanvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY,
        };
    }

    function startDraw(evt) {
        evt.preventDefault();
        isDrawing = true;
        const p = getCanvasPoint(evt);
        lastX = p.x;
        lastY = p.y;

        // Draw a dot so a simple tap/click still leaves a mark.
        drawCtx.beginPath();
        drawCtx.arc(p.x, p.y, penThickness / 2, 0, Math.PI * 2);
        drawCtx.fillStyle = '#000';
        drawCtx.fill();

        if (drawCanvas.setPointerCapture) {
            drawCanvas.setPointerCapture(evt.pointerId);
        }
    }

    function moveDraw(evt) {
        if (!isDrawing) return;
        evt.preventDefault();
        const p = getCanvasPoint(evt);

        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        drawCtx.strokeStyle = '#000';
        drawCtx.lineWidth = penThickness;

        drawCtx.beginPath();
        drawCtx.moveTo(lastX, lastY);
        drawCtx.lineTo(p.x, p.y);
        drawCtx.stroke();

        lastX = p.x;
        lastY = p.y;
    }

    function endDraw() {
        isDrawing = false;
    }

    drawCanvas.addEventListener('pointerdown', startDraw);
    drawCanvas.addEventListener('pointermove', moveDraw);
    drawCanvas.addEventListener('pointerup', endDraw);
    drawCanvas.addEventListener('pointercancel', endDraw);
    drawCanvas.addEventListener('pointerleave', endDraw);

    function setThickness(size) {
        penThickness = size;
        thicknessInput.value = size;
        thicknessValue.textContent = size + 'px';

        presetButtons.forEach((btn) => {
            btn.classList.toggle('active', parseInt(btn.dataset.size, 10) === size);
        });
    }

    thicknessInput.addEventListener('input', () => {
        setThickness(parseInt(thicknessInput.value, 10));
    });

    presetButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            setThickness(parseInt(btn.dataset.size, 10));
        });
    });

    clearBtn.addEventListener('click', () => {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    });

    drawFace();
    setThickness(penThickness);
})();
