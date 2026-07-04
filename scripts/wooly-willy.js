// Wooly Face - a Wooly Willy-style drawing toy.
// A bald face is drawn once on the base canvas; the user draws on a
// transparent canvas layered on top of it.
//
// Facial-hair rule: the head is split into quadrants by a horizontal line
// through its center and a vertical line down its center.
//   - Above the horizontal line: unconstrained, freehand drawing.
//   - Below the horizontal line: every stroke is mirrored across the
//     vertical midline, and must connect (directly, or through previously
//     accepted ink) to either the vertical midline or the horizontal line
//     where it meets an ear. Anything that doesn't connect fades out.

(function () {
    const faceCanvas = document.getElementById('face-canvas');
    const drawCanvas = document.getElementById('draw-canvas');
    const pendingCanvas = document.getElementById('pending-canvas');
    const faceCtx = faceCanvas.getContext('2d');
    const drawCtx = drawCanvas.getContext('2d');
    const pendingCtx = pendingCanvas.getContext('2d');

    const thicknessInput = document.getElementById('thickness');
    const thicknessValue = document.getElementById('thickness-value');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const clearBtn = document.getElementById('clear-btn');

    const W = faceCanvas.width;
    const H = faceCanvas.height;

    // Shared face geometry, also used by drawFace() below.
    const geo = {
        cx: W * 0.5,
        cy: H * 0.48,
        rx: W * 0.34,
        ry: H * 0.36,
        earLeftX: W * 0.16,
        earRightX: W * 0.84,
    };

    let penThickness = parseInt(thicknessInput.value, 10);
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // --- Connectivity grid for the constrained lower half -------------

    const CELL_SIZE = 6;
    const GRID_COLS = Math.ceil(W / CELL_SIZE);
    const GRID_ROWS = Math.ceil(H / CELL_SIZE);

    const anchorGrid = new Uint8Array(GRID_COLS * GRID_ROWS);
    const validInkGrid = new Uint8Array(GRID_COLS * GRID_ROWS);
    let pendingCells = new Set();

    function cellIndex(col, row) {
        return row * GRID_COLS + col;
    }

    function buildAnchorGrid() {
        const midlineHalfWidth = 6;
        const earAnchorHalfWidth = 26;
        const earAnchorHalfHeight = 16;

        for (let row = 0; row < GRID_ROWS; row++) {
            const cellY = row * CELL_SIZE + CELL_SIZE / 2;
            if (cellY < geo.cy) continue;

            for (let col = 0; col < GRID_COLS; col++) {
                const cellX = col * CELL_SIZE + CELL_SIZE / 2;
                let isAnchor = Math.abs(cellX - geo.cx) <= midlineHalfWidth;

                if (!isAnchor && Math.abs(cellY - geo.cy) <= earAnchorHalfHeight) {
                    if (Math.abs(cellX - geo.earLeftX) <= earAnchorHalfWidth) isAnchor = true;
                    if (Math.abs(cellX - geo.earRightX) <= earAnchorHalfWidth) isAnchor = true;
                }

                if (isAnchor) anchorGrid[cellIndex(col, row)] = 1;
            }
        }
    }

    function markCellsNear(x, y) {
        const radius = penThickness / 2 + CELL_SIZE;
        const minCol = Math.max(0, Math.floor((x - radius) / CELL_SIZE));
        const maxCol = Math.min(GRID_COLS - 1, Math.floor((x + radius) / CELL_SIZE));
        const minRow = Math.max(0, Math.floor((y - radius) / CELL_SIZE));
        const maxRow = Math.min(GRID_ROWS - 1, Math.floor((y + radius) / CELL_SIZE));

        for (let row = minRow; row <= maxRow; row++) {
            const cellY = row * CELL_SIZE + CELL_SIZE / 2;
            for (let col = minCol; col <= maxCol; col++) {
                const cellX = col * CELL_SIZE + CELL_SIZE / 2;
                const dx = cellX - x;
                const dy = cellY - y;
                if (dx * dx + dy * dy <= radius * radius) {
                    pendingCells.add(cellIndex(col, row));
                }
            }
        }
    }

    function markCellsAlongSegment(x0, y0, x1, y1) {
        const dist = Math.hypot(x1 - x0, y1 - y0);
        const steps = Math.max(1, Math.ceil(dist / (CELL_SIZE / 2)));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            markCellsNear(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
        }
    }

    // Flood-fill through pendingCells + already-accepted ink, 8-connected,
    // to see whether the new stroke reaches an anchor cell.
    function reachesAnchor() {
        const visited = new Set(pendingCells);
        const queue = Array.from(pendingCells);

        while (queue.length) {
            const idx = queue.pop();
            if (anchorGrid[idx]) return true;

            const row = Math.floor(idx / GRID_COLS);
            const col = idx % GRID_COLS;

            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nRow = row + dr;
                    const nCol = col + dc;
                    if (nRow < 0 || nRow >= GRID_ROWS || nCol < 0 || nCol >= GRID_COLS) continue;

                    const nIdx = cellIndex(nCol, nRow);
                    if (visited.has(nIdx)) continue;
                    if (validInkGrid[nIdx] || anchorGrid[nIdx]) {
                        visited.add(nIdx);
                        queue.push(nIdx);
                    }
                }
            }
        }

        return false;
    }

    function mirrorX(x) {
        return 2 * geo.cx - x;
    }

    // --- Face rendering -------------------------------------------------

    function drawFace() {
        const w = W;
        const h = H;
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

    // --- Drawing interaction ---------------------------------------------

    function getCanvasPoint(evt) {
        const rect = drawCanvas.getBoundingClientRect();
        const scaleX = drawCanvas.width / rect.width;
        const scaleY = drawCanvas.height / rect.height;
        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY,
        };
    }

    function dotAt(ctx, x, y) {
        ctx.beginPath();
        ctx.arc(x, y, penThickness / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
    }

    function strokeSegment(ctx, x0, y0, x1, y1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = penThickness;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
    }

    function drawConstrainedDot(x, y) {
        dotAt(pendingCtx, x, y);
        dotAt(pendingCtx, mirrorX(x), y);
        markCellsNear(x, y);
        markCellsNear(mirrorX(x), y);
    }

    function drawConstrainedSegment(x0, y0, x1, y1) {
        strokeSegment(pendingCtx, x0, y0, x1, y1);
        strokeSegment(pendingCtx, mirrorX(x0), y0, mirrorX(x1), y1);
        markCellsAlongSegment(x0, y0, x1, y1);
        markCellsAlongSegment(mirrorX(x0), y0, mirrorX(x1), y1);
    }

    function clearPendingCanvas() {
        pendingCtx.clearRect(0, 0, W, H);
    }

    function resolveConstrainedStroke() {
        if (pendingCells.size === 0) return;

        if (reachesAnchor()) {
            drawCtx.drawImage(pendingCanvas, 0, 0);
            pendingCells.forEach((idx) => {
                validInkGrid[idx] = 1;
            });
            clearPendingCanvas();
        } else {
            pendingCanvas.style.transition = 'opacity 250ms ease-out';
            pendingCanvas.style.opacity = '0';
            setTimeout(() => {
                clearPendingCanvas();
                pendingCanvas.style.transition = '';
                pendingCanvas.style.opacity = '1';
            }, 250);
        }

        pendingCells = new Set();
    }

    function startDraw(evt) {
        evt.preventDefault();
        isDrawing = true;
        const p = getCanvasPoint(evt);
        lastX = p.x;
        lastY = p.y;
        pendingCells = new Set();

        if (p.y < geo.cy) {
            dotAt(drawCtx, p.x, p.y);
        } else {
            drawConstrainedDot(p.x, p.y);
        }

        if (drawCanvas.setPointerCapture) {
            drawCanvas.setPointerCapture(evt.pointerId);
        }
    }

    function moveDraw(evt) {
        if (!isDrawing) return;
        evt.preventDefault();
        const p = getCanvasPoint(evt);
        const fromAbove = lastY < geo.cy;
        const toAbove = p.y < geo.cy;

        if (fromAbove && toAbove) {
            strokeSegment(drawCtx, lastX, lastY, p.x, p.y);
        } else if (!fromAbove && !toAbove) {
            drawConstrainedSegment(lastX, lastY, p.x, p.y);
        } else {
            // The segment crosses the horizontal line; split it there.
            const t = (geo.cy - lastY) / (p.y - lastY);
            const ix = lastX + (p.x - lastX) * t;
            if (fromAbove) {
                strokeSegment(drawCtx, lastX, lastY, ix, geo.cy);
                drawConstrainedSegment(ix, geo.cy, p.x, p.y);
            } else {
                drawConstrainedSegment(lastX, lastY, ix, geo.cy);
                strokeSegment(drawCtx, ix, geo.cy, p.x, p.y);
            }
        }

        lastX = p.x;
        lastY = p.y;
    }

    function endDraw() {
        if (isDrawing) resolveConstrainedStroke();
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
        clearPendingCanvas();
        validInkGrid.fill(0);
    });

    buildAnchorGrid();
    drawFace();
    setThickness(penThickness);
})();
