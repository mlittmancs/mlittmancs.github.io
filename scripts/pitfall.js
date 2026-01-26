/**
 * PITFALL! - Atari 2600 Clone
 * A recreation of the classic Activision game
 */

// ============================================
// GAME CONSTANTS
// ============================================
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.5;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -12;
const GROUND_Y = 320;
const UNDERGROUND_Y = 280;

// Atari 2600 color palette (approximation)
const COLORS = {
    sky: '#87CEEB',
    skyNight: '#1a1a3e',
    ground: '#8B4513',
    groundDark: '#5D3A1A',
    grass: '#228B22',
    tree: '#006400',
    treeTrunk: '#8B4513',
    player: '#FF6B35',
    playerOutline: '#CC5522',
    pit: '#1a1a1a',
    water: '#4169E1',
    waterDeep: '#1E3A8A',
    vine: '#2E8B57',
    vineRope: '#8B7355',
    barrel: '#8B4513',
    barrelStripe: '#CD853F',
    crocodile: '#228B22',
    crocodileDark: '#006400',
    crocodileMouth: '#FF4444',
    treasure: '#FFD700',
    underground: '#3D2914',
    undergroundBrick: '#5D4037',
    ladder: '#CD853F',
    scorpion: '#8B0000',
    log: '#654321'
};

// ============================================
// GAME STATE
// ============================================
let canvas, ctx;
let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover', 'levelcomplete', 'victory'
let score = 0;
let lives = 3;
let currentLevel = 1;
let gameTime = 1200; // 20 minutes in seconds
let frameCount = 0;

// Input state
const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false
};

// ============================================
// PLAYER CLASS
// ============================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.isJumping = false;
        this.isDucking = false;
        this.isClimbing = false;
        this.isSwinging = false;
        this.facingRight = true;
        this.animFrame = 0;
        this.animTimer = 0;
        this.swingVine = null;
        this.swingAngle = 0;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.isUnderground = false;
    }

    update(level) {
        // Handle invincibility frames
        if (this.invincible) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
            }
        }

        // Swing on vine
        if (this.isSwinging && this.swingVine) {
            this.updateSwing();
            return;
        }

        // Climbing ladder
        if (this.isClimbing) {
            this.vx = 0;
            this.vy = 0;
            if (keys.up) this.y -= 3;
            if (keys.down) this.y += 3;

            // Check if still on ladder
            let onLadder = false;
            for (let ladder of level.ladders || []) {
                if (this.x + this.width > ladder.x && this.x < ladder.x + ladder.width &&
                    this.y + this.height > ladder.y && this.y < ladder.y + ladder.height) {
                    onLadder = true;
                    break;
                }
            }

            if (!onLadder || keys.jump) {
                this.isClimbing = false;
            }
            return;
        }

        // Horizontal movement
        this.vx = 0;
        if (keys.left) {
            this.vx = -PLAYER_SPEED;
            this.facingRight = false;
        }
        if (keys.right) {
            this.vx = PLAYER_SPEED;
            this.facingRight = true;
        }

        // Ducking
        this.isDucking = keys.down && this.onGround;
        if (this.isDucking) {
            this.vx = 0;
        }

        // Jumping
        if (keys.jump && this.onGround && !this.isJumping) {
            this.vy = JUMP_FORCE;
            this.isJumping = true;
            this.onGround = false;
        }

        // Apply gravity
        if (!this.onGround) {
            this.vy += GRAVITY;
        }

        // Apply velocity
        this.x += this.vx;
        this.y += this.vy;

        // Ground collision
        let groundLevel = this.isUnderground ? CANVAS_HEIGHT - 80 : GROUND_Y;
        if (this.y + this.height >= groundLevel) {
            this.y = groundLevel - this.height;
            this.vy = 0;
            this.onGround = true;
            this.isJumping = false;
        }

        // Screen boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;

        // Animation
        this.animTimer++;
        if (this.animTimer >= 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }

        // Check for ladder grab
        if (keys.up || keys.down) {
            for (let ladder of level.ladders || []) {
                if (this.x + this.width > ladder.x && this.x < ladder.x + ladder.width &&
                    this.y + this.height > ladder.y && this.y < ladder.y + ladder.height) {
                    this.isClimbing = true;
                    this.x = ladder.x + ladder.width/2 - this.width/2;
                    break;
                }
            }
        }

        // Check for vine grab
        if (keys.up) {
            for (let vine of level.vines || []) {
                let vineBottom = vine.y + vine.length;
                if (Math.abs(this.x + this.width/2 - vine.x) < 30 &&
                    this.y < vineBottom && this.y + this.height > vine.y) {
                    this.grabVine(vine);
                    break;
                }
            }
        }
    }

    grabVine(vine) {
        this.isSwinging = true;
        this.swingVine = vine;
        this.swingAngle = vine.angle;
        this.onGround = false;
    }

    updateSwing() {
        let vine = this.swingVine;

        // Swing physics
        let swingSpeed = 0.03;
        if (keys.left) vine.angularVel -= 0.002;
        if (keys.right) vine.angularVel += 0.002;

        vine.angle += vine.angularVel;
        vine.angularVel += -swingSpeed * Math.sin(vine.angle);
        vine.angularVel *= 0.99; // Damping

        // Clamp angle
        if (vine.angle > Math.PI/3) vine.angle = Math.PI/3;
        if (vine.angle < -Math.PI/3) vine.angle = -Math.PI/3;

        // Position player on vine
        this.x = vine.x + Math.sin(vine.angle) * vine.length - this.width/2;
        this.y = vine.y + Math.cos(vine.angle) * vine.length - this.height/2;

        // Release vine with jump
        if (keys.jump) {
            this.isSwinging = false;
            this.swingVine = null;
            this.vx = vine.angularVel * vine.length * 0.5;
            this.vy = JUMP_FORCE * 0.7;
        }
    }

    draw(ctx) {
        if (this.invincible && frameCount % 10 < 5) {
            return; // Flicker when invincible
        }

        ctx.save();

        let drawX = this.x;
        let drawY = this.y;
        let drawHeight = this.height;

        if (this.isDucking) {
            drawHeight = this.height * 0.6;
            drawY = this.y + this.height - drawHeight;
        }

        // Flip if facing left
        if (!this.facingRight) {
            ctx.translate(this.x + this.width, 0);
            ctx.scale(-1, 1);
            drawX = 0;
        }

        // Draw Pitfall Harry (pixel art style)
        // Body
        ctx.fillStyle = COLORS.player;
        ctx.fillRect(drawX + 6, drawY + 10, 12, 18);

        // Head
        ctx.fillStyle = '#FFCC99';
        ctx.fillRect(drawX + 7, drawY, 10, 12);

        // Hat
        ctx.fillStyle = '#654321';
        ctx.fillRect(drawX + 5, drawY - 2, 14, 4);
        ctx.fillRect(drawX + 7, drawY - 6, 10, 4);

        // Legs (animated)
        ctx.fillStyle = '#4A4A4A';
        if (this.onGround && Math.abs(this.vx) > 0) {
            // Running animation
            let legOffset = Math.sin(this.animFrame * Math.PI / 2) * 4;
            ctx.fillRect(drawX + 6, drawY + 28, 5, 12 + legOffset);
            ctx.fillRect(drawX + 13, drawY + 28, 5, 12 - legOffset);
        } else if (!this.onGround) {
            // Jumping pose
            ctx.fillRect(drawX + 4, drawY + 28, 6, 10);
            ctx.fillRect(drawX + 14, drawY + 28, 6, 10);
        } else {
            // Standing
            ctx.fillRect(drawX + 6, drawY + 28, 5, 12);
            ctx.fillRect(drawX + 13, drawY + 28, 5, 12);
        }

        // Arms
        ctx.fillStyle = '#FFCC99';
        if (this.isSwinging) {
            // Arms up for vine
            ctx.fillRect(drawX + 2, drawY + 8, 4, 10);
            ctx.fillRect(drawX + 18, drawY + 8, 4, 10);
        } else if (!this.onGround) {
            // Arms out when jumping
            ctx.fillRect(drawX, drawY + 12, 6, 4);
            ctx.fillRect(drawX + 18, drawY + 12, 6, 4);
        } else {
            // Arms at sides
            ctx.fillRect(drawX + 2, drawY + 12, 4, 12);
            ctx.fillRect(drawX + 18, drawY + 12, 4, 12);
        }

        ctx.restore();
    }

    takeDamage() {
        if (this.invincible) return false;

        lives--;
        updateUI();

        if (lives <= 0) {
            gameState = 'gameover';
            showScreen('game-over-screen');
            document.getElementById('final-score').textContent = score;
            return true;
        }

        this.invincible = true;
        this.invincibleTimer = 120;
        return false;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
        this.isJumping = false;
        this.isDucking = false;
        this.isClimbing = false;
        this.isSwinging = false;
        this.swingVine = null;
        this.isUnderground = false;
    }
}

// ============================================
// LEVEL CLASS
// ============================================
class Level {
    constructor(config) {
        this.name = config.name;
        this.type = config.type;
        this.platforms = config.platforms || [];
        this.pits = config.pits || [];
        this.barrels = config.barrels || [];
        this.vines = config.vines || [];
        this.crocodiles = config.crocodiles || [];
        this.ladders = config.ladders || [];
        this.treasures = config.treasures || [];
        this.logs = config.logs || [];
        this.hazards = config.hazards || [];
        this.underground = config.underground || null;
        this.exitX = config.exitX || CANVAS_WIDTH - 50;
        this.trees = config.trees || [];
        this.waterArea = config.waterArea || null;
    }

    update() {
        // Update expanding pits
        for (let pit of this.pits) {
            if (pit.expanding) {
                pit.timer += pit.speed;
                pit.currentWidth = pit.minWidth +
                    (pit.maxWidth - pit.minWidth) * (Math.sin(pit.timer) * 0.5 + 0.5);
            }
        }

        // Update rolling barrels
        for (let barrel of this.barrels) {
            barrel.x += barrel.speed;
            barrel.rotation += barrel.speed * 0.1;

            // Reset barrel when off screen
            if (barrel.speed > 0 && barrel.x > CANVAS_WIDTH + 50) {
                barrel.x = -50;
            } else if (barrel.speed < 0 && barrel.x < -50) {
                barrel.x = CANVAS_WIDTH + 50;
            }
        }

        // Update vines
        for (let vine of this.vines) {
            if (!vine.grabbed) {
                vine.angle = Math.sin(frameCount * 0.02 + vine.phase) * 0.3;
            }
        }

        // Update crocodiles
        for (let croc of this.crocodiles) {
            croc.timer += croc.speed;
            croc.mouthOpen = Math.sin(croc.timer) > 0.3;
        }

        // Update logs (floating)
        for (let log of this.logs) {
            log.x += log.speed;
            if (log.x > CANVAS_WIDTH + 100) log.x = -100;
            if (log.x < -100) log.x = CANVAS_WIDTH + 100;
        }
    }

    draw(ctx) {
        // Draw sky
        ctx.fillStyle = COLORS.sky;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw trees in background
        for (let tree of this.trees) {
            this.drawTree(ctx, tree.x, tree.y, tree.size);
        }

        // Draw underground section if exists
        if (this.underground) {
            this.drawUnderground(ctx);
        }

        // Draw water area
        if (this.waterArea) {
            this.drawWater(ctx);
        }

        // Draw ground
        ctx.fillStyle = COLORS.grass;
        ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 10);
        ctx.fillStyle = COLORS.ground;
        ctx.fillRect(0, GROUND_Y + 10, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y - 10);

        // Draw platforms
        for (let platform of this.platforms) {
            ctx.fillStyle = COLORS.ground;
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            ctx.fillStyle = COLORS.grass;
            ctx.fillRect(platform.x, platform.y, platform.width, 5);
        }

        // Draw pits
        for (let pit of this.pits) {
            let width = pit.expanding ? pit.currentWidth : pit.width;
            let x = pit.x - width/2 + pit.width/2;

            ctx.fillStyle = COLORS.pit;
            ctx.fillRect(x, pit.y, width, pit.height);

            // Pit edges
            ctx.fillStyle = COLORS.groundDark;
            ctx.fillRect(x - 5, pit.y, 5, pit.height);
            ctx.fillRect(x + width, pit.y, 5, pit.height);
        }

        // Draw ladders
        for (let ladder of this.ladders) {
            this.drawLadder(ctx, ladder);
        }

        // Draw vines
        for (let vine of this.vines) {
            this.drawVine(ctx, vine);
        }

        // Draw logs
        for (let log of this.logs) {
            this.drawLog(ctx, log);
        }

        // Draw crocodiles
        for (let croc of this.crocodiles) {
            this.drawCrocodile(ctx, croc);
        }

        // Draw barrels
        for (let barrel of this.barrels) {
            this.drawBarrel(ctx, barrel);
        }

        // Draw treasures
        for (let treasure of this.treasures) {
            if (!treasure.collected) {
                this.drawTreasure(ctx, treasure);
            }
        }

        // Draw hazards (scorpions, etc)
        for (let hazard of this.hazards) {
            this.drawHazard(ctx, hazard);
        }

        // Draw exit marker
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.exitX, GROUND_Y - 60, 10, 60);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px monospace';
        ctx.fillText('EXIT', this.exitX - 5, GROUND_Y - 65);
    }

    drawTree(ctx, x, y, size) {
        // Trunk
        ctx.fillStyle = COLORS.treeTrunk;
        ctx.fillRect(x - size/6, y, size/3, size);

        // Foliage
        ctx.fillStyle = COLORS.tree;
        ctx.beginPath();
        ctx.arc(x, y - size/4, size/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - size/3, y, size/3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size/3, y, size/3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawVine(ctx, vine) {
        let endX = vine.x + Math.sin(vine.angle) * vine.length;
        let endY = vine.y + Math.cos(vine.angle) * vine.length;

        // Draw rope
        ctx.strokeStyle = COLORS.vineRope;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(vine.x, vine.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Draw leaves
        ctx.fillStyle = COLORS.vine;
        for (let i = 0; i < 5; i++) {
            let t = i / 4;
            let lx = vine.x + Math.sin(vine.angle) * vine.length * t;
            let ly = vine.y + Math.cos(vine.angle) * vine.length * t;
            ctx.beginPath();
            ctx.ellipse(lx + 5, ly, 8, 4, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawLadder(ctx, ladder) {
        ctx.fillStyle = COLORS.ladder;
        // Rails
        ctx.fillRect(ladder.x, ladder.y, 4, ladder.height);
        ctx.fillRect(ladder.x + ladder.width - 4, ladder.y, 4, ladder.height);
        // Rungs
        let rungs = Math.floor(ladder.height / 20);
        for (let i = 0; i <= rungs; i++) {
            ctx.fillRect(ladder.x, ladder.y + i * 20, ladder.width, 4);
        }
    }

    drawBarrel(ctx, barrel) {
        ctx.save();
        ctx.translate(barrel.x + barrel.width/2, barrel.y + barrel.height/2);
        ctx.rotate(barrel.rotation);

        // Barrel body
        ctx.fillStyle = COLORS.barrel;
        ctx.fillRect(-barrel.width/2, -barrel.height/2, barrel.width, barrel.height);

        // Stripes
        ctx.fillStyle = COLORS.barrelStripe;
        ctx.fillRect(-barrel.width/2, -barrel.height/2 + 5, barrel.width, 4);
        ctx.fillRect(-barrel.width/2, barrel.height/2 - 9, barrel.width, 4);

        ctx.restore();
    }

    drawCrocodile(ctx, croc) {
        let y = croc.y;

        // Body (partially submerged)
        ctx.fillStyle = COLORS.crocodile;
        ctx.fillRect(croc.x, y, croc.width, 20);

        // Head
        ctx.fillStyle = COLORS.crocodileDark;
        ctx.fillRect(croc.x + croc.width - 30, y - 10, 35, 30);

        // Eyes
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(croc.x + croc.width - 10, y - 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        if (croc.mouthOpen) {
            ctx.fillStyle = COLORS.crocodileMouth;
            ctx.beginPath();
            ctx.moveTo(croc.x + croc.width, y);
            ctx.lineTo(croc.x + croc.width + 25, y + 10);
            ctx.lineTo(croc.x + croc.width, y + 20);
            ctx.fill();

            // Teeth
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(croc.x + croc.width + 5 + i * 5, y + 5, 3, 5);
                ctx.fillRect(croc.x + croc.width + 5 + i * 5, y + 12, 3, 5);
            }
        }

        // Tail
        ctx.fillStyle = COLORS.crocodile;
        ctx.beginPath();
        ctx.moveTo(croc.x, y);
        ctx.lineTo(croc.x - 20, y + 10);
        ctx.lineTo(croc.x, y + 20);
        ctx.fill();
    }

    drawLog(ctx, log) {
        ctx.fillStyle = COLORS.log;
        ctx.fillRect(log.x, log.y, log.width, log.height);

        // Wood grain
        ctx.fillStyle = '#5D4E37';
        for (let i = 0; i < log.width; i += 15) {
            ctx.fillRect(log.x + i, log.y, 2, log.height);
        }

        // End circles
        ctx.beginPath();
        ctx.fillStyle = '#8B7355';
        ctx.arc(log.x, log.y + log.height/2, log.height/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(log.x + log.width, log.y + log.height/2, log.height/2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawTreasure(ctx, treasure) {
        ctx.fillStyle = COLORS.treasure;

        if (treasure.type === 'gold') {
            // Gold bar
            ctx.fillRect(treasure.x, treasure.y, 30, 15);
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(treasure.x + 2, treasure.y + 2, 26, 11);
        } else if (treasure.type === 'ring') {
            // Diamond ring
            ctx.beginPath();
            ctx.arc(treasure.x + 10, treasure.y + 10, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.moveTo(treasure.x + 10, treasure.y);
            ctx.lineTo(treasure.x + 18, treasure.y + 10);
            ctx.lineTo(treasure.x + 10, treasure.y + 20);
            ctx.lineTo(treasure.x + 2, treasure.y + 10);
            ctx.fill();
        } else {
            // Money bag
            ctx.beginPath();
            ctx.arc(treasure.x + 12, treasure.y + 15, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#006400';
            ctx.font = 'bold 14px monospace';
            ctx.fillText('$', treasure.x + 7, treasure.y + 20);
        }
    }

    drawHazard(ctx, hazard) {
        if (hazard.type === 'scorpion') {
            ctx.fillStyle = COLORS.scorpion;
            // Body
            ctx.fillRect(hazard.x + 5, hazard.y + 5, 20, 10);
            // Tail
            ctx.beginPath();
            ctx.moveTo(hazard.x + 25, hazard.y + 10);
            ctx.quadraticCurveTo(hazard.x + 35, hazard.y, hazard.x + 30, hazard.y - 5);
            ctx.lineTo(hazard.x + 32, hazard.y - 8);
            ctx.stroke();
            // Claws
            ctx.fillRect(hazard.x, hazard.y + 3, 8, 4);
            ctx.fillRect(hazard.x, hazard.y + 13, 8, 4);
        } else if (hazard.type === 'snake') {
            ctx.fillStyle = '#228B22';
            ctx.beginPath();
            ctx.moveTo(hazard.x, hazard.y + 10);
            for (let i = 0; i < 30; i += 5) {
                ctx.lineTo(hazard.x + i, hazard.y + 10 + Math.sin(i * 0.5 + frameCount * 0.1) * 5);
            }
            ctx.stroke();
        }
    }

    drawUnderground(ctx) {
        let ug = this.underground;

        // Underground background
        ctx.fillStyle = COLORS.underground;
        ctx.fillRect(ug.x, ug.y, ug.width, ug.height);

        // Brick pattern
        ctx.fillStyle = COLORS.undergroundBrick;
        for (let row = 0; row < ug.height; row += 20) {
            let offset = (row / 20) % 2 === 0 ? 0 : 20;
            for (let col = offset; col < ug.width; col += 40) {
                ctx.fillRect(ug.x + col, ug.y + row, 38, 18);
            }
        }

        // Underground floor
        ctx.fillStyle = COLORS.groundDark;
        ctx.fillRect(ug.x, ug.y + ug.height - 20, ug.width, 20);
    }

    drawWater(ctx) {
        let water = this.waterArea;

        // Deep water
        ctx.fillStyle = COLORS.waterDeep;
        ctx.fillRect(water.x, water.y, water.width, water.height);

        // Water surface with waves
        ctx.fillStyle = COLORS.water;
        ctx.beginPath();
        ctx.moveTo(water.x, water.y);
        for (let x = water.x; x <= water.x + water.width; x += 10) {
            let waveY = water.y + Math.sin((x + frameCount * 2) * 0.05) * 3;
            ctx.lineTo(x, waveY);
        }
        ctx.lineTo(water.x + water.width, water.y + 20);
        ctx.lineTo(water.x, water.y + 20);
        ctx.fill();
    }

    checkCollisions(player) {
        // Check pit collisions
        for (let pit of this.pits) {
            let width = pit.expanding ? pit.currentWidth : pit.width;
            let x = pit.x - width/2 + pit.width/2;

            if (player.x + player.width > x && player.x < x + width &&
                player.y + player.height > pit.y) {
                return { type: 'pit', object: pit };
            }
        }

        // Check barrel collisions
        for (let barrel of this.barrels) {
            if (this.rectCollision(player, barrel)) {
                return { type: 'barrel', object: barrel };
            }
        }

        // Check crocodile collisions
        for (let croc of this.crocodiles) {
            let headBox = {
                x: croc.x + croc.width - 30,
                y: croc.y - 10,
                width: 35,
                height: 30
            };

            // Landing on closed mouth is safe
            if (player.vy > 0 && !croc.mouthOpen) {
                let bodyBox = { x: croc.x, y: croc.y - 15, width: croc.width, height: 15 };
                if (this.rectCollision(player, bodyBox)) {
                    player.y = croc.y - 15 - player.height;
                    player.vy = 0;
                    player.onGround = true;
                    return null;
                }
            }

            // Open mouth is deadly
            if (croc.mouthOpen && this.rectCollision(player, headBox)) {
                return { type: 'crocodile', object: croc };
            }
        }

        // Check water collision (if no crocodile/log to land on)
        if (this.waterArea) {
            let water = this.waterArea;
            if (player.x + player.width > water.x && player.x < water.x + water.width &&
                player.y + player.height > water.y + 10) {

                // Check if on a log
                let onLog = false;
                for (let log of this.logs) {
                    if (player.x + player.width > log.x && player.x < log.x + log.width &&
                        player.y + player.height >= log.y && player.y + player.height <= log.y + 20) {
                        onLog = true;
                        player.x += log.speed; // Move with log
                        player.y = log.y - player.height;
                        player.vy = 0;
                        player.onGround = true;
                        break;
                    }
                }

                // Check if on crocodile
                for (let croc of this.crocodiles) {
                    if (!croc.mouthOpen &&
                        player.x + player.width > croc.x && player.x < croc.x + croc.width &&
                        player.y + player.height >= croc.y - 15 && player.y + player.height <= croc.y + 5) {
                        onLog = true;
                        break;
                    }
                }

                if (!onLog) {
                    return { type: 'water', object: water };
                }
            }
        }

        // Check hazard collisions
        for (let hazard of this.hazards) {
            if (this.rectCollision(player, { x: hazard.x, y: hazard.y, width: 30, height: 20 })) {
                return { type: 'hazard', object: hazard };
            }
        }

        // Check treasure collection
        for (let treasure of this.treasures) {
            if (!treasure.collected && this.rectCollision(player,
                { x: treasure.x, y: treasure.y, width: 25, height: 20 })) {
                treasure.collected = true;
                score += treasure.points;
                updateUI();
            }
        }

        // Check level exit
        if (player.x + player.width >= this.exitX && player.onGround) {
            return { type: 'exit' };
        }

        return null;
    }

    rectCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
}

// ============================================
// LEVEL DEFINITIONS
// ============================================
function createLevels() {
    return [
        // Level 1: Expanding/Contracting Pit
        new Level({
            name: "The Expanding Pit",
            type: "pit",
            trees: [
                { x: 50, y: 200, size: 80 },
                { x: 200, y: 180, size: 100 },
                { x: 500, y: 190, size: 90 }
            ],
            pits: [
                { x: 280, y: GROUND_Y, width: 80, height: 80,
                  expanding: true, minWidth: 40, maxWidth: 150, currentWidth: 40, timer: 0, speed: 0.03 }
            ],
            treasures: [
                { x: 150, y: GROUND_Y - 25, type: 'gold', points: 1000, collected: false },
                { x: 450, y: GROUND_Y - 25, type: 'ring', points: 2000, collected: false }
            ],
            hazards: [
                { x: 180, y: GROUND_Y - 20, type: 'scorpion' }
            ],
            exitX: 600
        }),

        // Level 2: Rolling Barrels
        new Level({
            name: "Barrel Run",
            type: "barrels",
            trees: [
                { x: 100, y: 150, size: 120 },
                { x: 400, y: 170, size: 100 }
            ],
            platforms: [
                { x: 200, y: GROUND_Y - 60, width: 100, height: 20 },
                { x: 400, y: GROUND_Y - 100, width: 80, height: 20 }
            ],
            barrels: [
                { x: 0, y: GROUND_Y - 35, width: 35, height: 35, speed: 3, rotation: 0 },
                { x: 200, y: GROUND_Y - 35, width: 35, height: 35, speed: 4, rotation: 0 },
                { x: 400, y: GROUND_Y - 35, width: 35, height: 35, speed: 2.5, rotation: 0 }
            ],
            treasures: [
                { x: 230, y: GROUND_Y - 85, type: 'money', points: 1500, collected: false },
                { x: 420, y: GROUND_Y - 125, type: 'gold', points: 2000, collected: false }
            ],
            exitX: 600
        }),

        // Level 3: Underground Section
        new Level({
            name: "Underground Passage",
            type: "underground",
            trees: [
                { x: 80, y: 180, size: 90 },
                { x: 550, y: 170, size: 100 }
            ],
            underground: {
                x: 150,
                y: GROUND_Y + 10,
                width: 350,
                height: 70
            },
            ladders: [
                { x: 160, y: GROUND_Y - 30, width: 30, height: 110 },
                { x: 460, y: GROUND_Y - 30, width: 30, height: 110 }
            ],
            pits: [
                { x: 200, y: GROUND_Y, width: 250, height: 10, expanding: false }
            ],
            hazards: [
                { x: 280, y: GROUND_Y + 55, type: 'scorpion' },
                { x: 380, y: GROUND_Y + 55, type: 'snake' }
            ],
            treasures: [
                { x: 320, y: GROUND_Y + 45, type: 'ring', points: 3000, collected: false },
                { x: 100, y: GROUND_Y - 25, type: 'gold', points: 1000, collected: false }
            ],
            exitX: 600
        }),

        // Level 4: Vine Swinging
        new Level({
            name: "Jungle Vines",
            type: "vines",
            trees: [
                { x: 50, y: 100, size: 150 },
                { x: 300, y: 80, size: 160 },
                { x: 550, y: 90, size: 140 }
            ],
            pits: [
                { x: 150, y: GROUND_Y, width: 120, height: 80, expanding: false },
                { x: 350, y: GROUND_Y, width: 150, height: 80, expanding: false }
            ],
            vines: [
                { x: 180, y: 50, length: 150, angle: 0, angularVel: 0, phase: 0 },
                { x: 380, y: 40, length: 160, angle: 0, angularVel: 0, phase: Math.PI/2 },
                { x: 500, y: 50, length: 140, angle: 0, angularVel: 0, phase: Math.PI }
            ],
            treasures: [
                { x: 300, y: 100, type: 'ring', points: 2500, collected: false },
                { x: 480, y: 120, type: 'gold', points: 2000, collected: false }
            ],
            exitX: 600
        }),

        // Level 5: Crocodile Crossing
        new Level({
            name: "Crocodile Swamp",
            type: "crocodiles",
            trees: [
                { x: 30, y: 180, size: 90 },
                { x: 580, y: 170, size: 100 }
            ],
            waterArea: {
                x: 120,
                y: GROUND_Y - 20,
                width: 400,
                height: 100
            },
            crocodiles: [
                { x: 140, y: GROUND_Y, width: 80, height: 25, mouthOpen: false, timer: 0, speed: 0.04 },
                { x: 260, y: GROUND_Y, width: 80, height: 25, mouthOpen: false, timer: Math.PI/2, speed: 0.05 },
                { x: 380, y: GROUND_Y, width: 80, height: 25, mouthOpen: false, timer: Math.PI, speed: 0.035 }
            ],
            logs: [
                { x: 200, y: GROUND_Y - 10, width: 60, height: 15, speed: 0.5 },
                { x: 350, y: GROUND_Y - 10, width: 50, height: 15, speed: -0.3 }
            ],
            treasures: [
                { x: 50, y: GROUND_Y - 25, type: 'gold', points: 1000, collected: false },
                { x: 300, y: GROUND_Y - 45, type: 'ring', points: 3000, collected: false },
                { x: 550, y: GROUND_Y - 25, type: 'money', points: 2000, collected: false }
            ],
            exitX: 600
        })
    ];
}

// ============================================
// GAME INITIALIZATION
// ============================================
let player;
let levels;
let currentLevelObj;

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Set up input handlers
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Button handlers
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);
    document.getElementById('nextLevelButton').addEventListener('click', nextLevel);
    document.getElementById('playAgainButton').addEventListener('click', restartGame);

    // Initialize game objects
    levels = createLevels();
    player = new Player(50, GROUND_Y - 50);

    // Start game loop
    gameLoop();
}

function handleKeyDown(e) {
    switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            keys.right = true;
            break;
        case 'ArrowUp':
        case 'KeyW':
            keys.up = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            keys.down = true;
            break;
        case 'Space':
            keys.jump = true;
            e.preventDefault();
            break;
        case 'KeyR':
            if (gameState === 'playing') {
                restartLevel();
            }
            break;
    }
}

function handleKeyUp(e) {
    switch(e.code) {
        case 'ArrowLeft':
        case 'KeyA':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            keys.right = false;
            break;
        case 'ArrowUp':
        case 'KeyW':
            keys.up = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            keys.down = false;
            break;
        case 'Space':
            keys.jump = false;
            break;
    }
}

function startGame() {
    hideScreen('start-screen');
    gameState = 'playing';
    score = 0;
    lives = 3;
    currentLevel = 1;
    gameTime = 1200;
    loadLevel(currentLevel);
    updateUI();
}

function restartGame() {
    hideAllScreens();
    startGame();
}

function restartLevel() {
    loadLevel(currentLevel);
}

function nextLevel() {
    hideScreen('level-complete-screen');
    currentLevel++;
    if (currentLevel > levels.length) {
        gameState = 'victory';
        showScreen('victory-screen');
        document.getElementById('victory-score').textContent = score;
    } else {
        loadLevel(currentLevel);
        gameState = 'playing';
    }
}

function loadLevel(levelNum) {
    currentLevelObj = createLevels()[levelNum - 1];
    player.reset(50, GROUND_Y - 50);
    updateUI();
}

function completeLevel() {
    gameState = 'levelcomplete';
    let timeBonus = Math.floor(gameTime / 10) * 10;
    score += timeBonus;

    showScreen('level-complete-screen');
    document.getElementById('level-score').textContent = score - timeBonus;
    document.getElementById('time-bonus').textContent = timeBonus;
}

// ============================================
// UI FUNCTIONS
// ============================================
function updateUI() {
    document.getElementById('score').textContent = String(score).padStart(4, '0');
    document.getElementById('lives').textContent = '♥'.repeat(lives) + '♡'.repeat(3 - lives);

    let minutes = Math.floor(gameTime / 60);
    let seconds = gameTime % 60;
    document.getElementById('timer').textContent =
        String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

    document.getElementById('level').textContent = currentLevel;
}

function showScreen(id) {
    document.getElementById(id).classList.remove('hidden');
}

function hideScreen(id) {
    document.getElementById(id).classList.add('hidden');
}

function hideAllScreens() {
    hideScreen('start-screen');
    hideScreen('game-over-screen');
    hideScreen('level-complete-screen');
    hideScreen('victory-screen');
}

// ============================================
// GAME LOOP
// ============================================
function gameLoop() {
    frameCount++;

    if (gameState === 'playing') {
        update();

        // Update timer every 60 frames (1 second at 60fps)
        if (frameCount % 60 === 0) {
            gameTime--;
            updateUI();

            if (gameTime <= 0) {
                gameState = 'gameover';
                showScreen('game-over-screen');
                document.getElementById('final-score').textContent = score;
            }
        }
    }

    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update level elements
    currentLevelObj.update();

    // Update player
    player.update(currentLevelObj);

    // Check collisions
    let collision = currentLevelObj.checkCollisions(player);
    if (collision) {
        switch(collision.type) {
            case 'pit':
            case 'water':
            case 'barrel':
            case 'crocodile':
            case 'hazard':
                if (player.takeDamage()) {
                    // Game over handled in takeDamage
                } else {
                    // Reset player position
                    player.reset(50, GROUND_Y - 50);
                }
                break;
            case 'exit':
                completeLevel();
                break;
        }
    }
}

function render() {
    // Clear canvas
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState === 'playing' || gameState === 'levelcomplete') {
        // Draw level
        currentLevelObj.draw(ctx);

        // Draw player
        player.draw(ctx);

        // Draw level name
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('Level ' + currentLevel + ': ' + currentLevelObj.name, 10, 25);
    } else if (gameState === 'start') {
        // Draw demo background
        ctx.fillStyle = COLORS.grass;
        ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 10);
        ctx.fillStyle = COLORS.ground;
        ctx.fillRect(0, GROUND_Y + 10, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y - 10);

        // Draw some trees
        for (let i = 0; i < 5; i++) {
            let x = 80 + i * 140;
            ctx.fillStyle = COLORS.treeTrunk;
            ctx.fillRect(x - 10, 200, 20, 120);
            ctx.fillStyle = COLORS.tree;
            ctx.beginPath();
            ctx.arc(x, 170, 50, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// ============================================
// START THE GAME
// ============================================
window.onload = init;
