/**
 * Space Invaders - Main Game Engine
 */

class SpaceInvaders {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.state = 'menu'; // menu, playing, paused, levelComplete, gameOver
        this.score = 0;
        this.highScore = 0;
        this.level = 1;
        this.lives = 3;
        this.totalShots = 0;
        this.hits = 0;
        this.alienKills = 0;
        
        // Weapon system
        this.weapons = {
            pistol:         { id: 'pistol',         name: 'Pistol',         fireRate: 14, damage: 1,  unlockScore: 0,        color: '#00ff88', shape: 'bolt' },
            machineGun:     { id: 'machineGun',     name: 'Machine Gun',    fireRate: 6,  damage: 1,  unlockScore: 1500,   color: '#ffaa00', shape: 'rapid' },
            microwave:      { id: 'microwave',      name: 'Microwave',      fireRate: 18, damage: 2,  unlockScore: 4000,   color: '#ff4444', shape: 'microwave', areaDamage: 80 },
            laserBeam:      { id: 'laserBeam',      name: 'Laser Beam',     fireRate: 10, damage: 2,  unlockScore: 8000,   color: '#ff44ff', shape: 'laser', piercing: true },
            plasmaCannon:   { id: 'plasmaCannon',   name: 'Plasma Cannon',  fireRate: 25, damage: 5,  unlockScore: 15000,  color: '#44ffff', shape: 'plasma', areaDamage: 100 },
            railgun:        { id: 'railgun',        name: 'Railgun',        fireRate: 30, damage: 10, unlockScore: 30000,  color: '#ffffff', shape: 'rail', piercing: true, armorPiercing: true }
        };
        this.currentWeapon = 'pistol';
        this.weaponUnlockNotifications = []; // {text, alpha, life, maxLife, y}
        this.unlockedWeapons = ['pistol']; // Track which weapons the player has unlocked
        
        // Combo system
        this.combo = 0;
        this.comboTimer = 0;
        this.peakCombo = 0;
        this.comboMultiplier = 1;
        this.comboDecayTime = 2000; // ms before combo resets
        this.comboFloatingTexts = []; // {x, y, text, alpha, life, maxLife}
        
        // Timing
        this.lastTime = 0;
        this.levelStartTime = 0;
        
        // Game objects
        this.player = null;
        this.aliens = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.shields = [];
        this.powerUps = null;
        this.ufo = null;
        this.ufoTimer = 0;
        this.slowTimer = 0;
        
        // Boss
        this.boss = null;
        this.bossIntroActive = false;
        this.bossIntroTimer = 0;
        this.bossIntroPhase = 0; // 0: not started, 1: approaching, 2: ready, 3: defeated
        
        // Alien movement
        this.alienDirection = 1;
        this.alienSpeed = 1;
        this.alienDropDistance = 20;
        this.alienMoveTimer = 0;
        this.alienMoveInterval = 40;
        this.alienShootTimer = 0;
        
        // Stars background
        this.stars = [];
        this.starLayers = { far: [], mid: [], near: [] };
        this.shootingStars = [];
        
        // Screen effects
        this.screenShake = 0;
        this.flashAlpha = 0;
        
        // Cinematic transitions
        this.cinematicActive = false;
        this.cinematicType = null; // 'levelIntro', 'death', 'gameOver'
        this.cinematicTimer = 0;
        this.cinematicDuration = 0;
        this.cinematicCallback = null;
        this.cinematicAnimationFrame = null;
        this.deathCrackLines = [];
        this.gameOverCrackLines = [];
        
        // Final score/level captured at game over — used by submitScore() so
        // the leaderboard always gets the values from the game that just ended,
        // not stale values if the game object state changes later.
        this.finalScore = 0;
        this.finalLevel = 1;
        
        // Constants
        this.CANVAS_WIDTH = 800;
        this.CANVAS_HEIGHT = 600;
        this.MAX_LEVELS = 20;
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.generateStars();
        this.loadHighScore();
        this.setupEventListeners();
        this.updateHUD();
        
        // Start render loop
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    resizeCanvas() {
        const container = document.getElementById('game-container');
        const maxWidth = container.clientWidth;
        const maxHeight = container.clientHeight;
        
        // Maintain aspect ratio
        const aspect = this.CANVAS_WIDTH / this.CANVAS_HEIGHT;
        
        let width = maxWidth;
        let height = width / aspect;
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspect;
        }
        
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.canvas.width = this.CANVAS_WIDTH;
        this.canvas.height = this.CANVAS_HEIGHT;
    }

    generateStars() {
        this.starLayers = {
            far: [],    // Tiny, dim, very slow
            mid: [],    // Medium size and speed
            near: []    // Large, bright, fastest
        };
        this.shootingStars = [];

        // Far layer — deep background stars
        for (let i = 0; i < 80; i++) {
            this.starLayers.far.push({
                x: Math.random() * this.CANVAS_WIDTH,
                y: Math.random() * this.CANVAS_HEIGHT,
                size: Math.random() * 1 + 0.3,
                speed: Math.random() * 0.15 + 0.05,
                brightness: Math.random() * 0.4 + 0.1,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }

        // Mid layer — standard starfield
        for (let i = 0; i < 50; i++) {
            this.starLayers.mid.push({
                x: Math.random() * this.CANVAS_WIDTH,
                y: Math.random() * this.CANVAS_HEIGHT,
                size: Math.random() * 1.5 + 0.8,
                speed: Math.random() * 0.3 + 0.15,
                brightness: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }

        // Near layer — prominent foreground stars
        for (let i = 0; i < 20; i++) {
            this.starLayers.near.push({
                x: Math.random() * this.CANVAS_WIDTH,
                y: Math.random() * this.CANVAS_HEIGHT,
                size: Math.random() * 2 + 1.2,
                speed: Math.random() * 0.5 + 0.3,
                brightness: Math.random() * 0.4 + 0.5,
                twinkleSpeed: Math.random() * 0.04 + 0.015,
                twinklePhase: Math.random() * Math.PI * 2
            });
        }
    }

    loadHighScore() {
        this.highScore = parseInt(localStorage.getItem('space_invaders_high') || '0');
    }

    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('space_invaders_high', this.score.toString());
        }
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Keyboard input
        this.keys = {};
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Button handlers
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('resume-btn').addEventListener('click', () => this.resume());
        document.getElementById('quit-btn').addEventListener('click', () => this.quitToMenu());
        document.getElementById('next-level-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('retry-btn').addEventListener('click', () => this.startGame());
        document.getElementById('new-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('leaderboard-btn').addEventListener('click', () => this.showLeaderboard());
        document.getElementById('back-btn').addEventListener('click', () => this.showGameOver());
        document.getElementById('submit-score-btn').addEventListener('click', () => this.submitScore());
        
        // Allow Enter key for modal
        document.getElementById('player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.submitScore();
        });
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;

        // Menu navigation with Enter/Space (skip if modal is open)
        const modalVisible = !document.getElementById('score-modal').classList.contains('hidden');
        if (e.code === 'Enter' || e.code === 'Space') {
            if (modalVisible) return;
            e.preventDefault();
            switch (this.state) {
                case 'menu':
                    this.startGame();
                    break;
                case 'playing':
                    this.shoot();
                    break;
                case 'paused':
                    this.resume();
                    break;
                case 'levelComplete':
                    this.nextLevel();
                    break;
                case 'gameOver':
                    this.startGame();
                    break;
                case 'leaderboard':
                    // Go back to game over screen
                    this.showGameOver();
                    break;
            }
        }

        if (e.code === 'Escape') {
            if (this.state === 'playing') this.pause();
            else if (this.state === 'paused') this.resume();
        }

        // Weapon cycling with W/Q keys
        if (e.code === 'KeyW' && this.state === 'playing') {
            this.cycleWeapon(1); // Cycle forward
        }
        if (e.code === 'KeyQ' && this.state === 'playing') {
            this.cycleWeapon(-1); // Cycle backward
        }

        // Direct weapon selection with number keys (1-6)
        if (this.state === 'playing') {
            const weaponIds = this.getAllWeaponIds();
            const keyMap = { 'Digit1': 0, 'Digit2': 1, 'Digit3': 2, 'Digit4': 3, 'Digit5': 4, 'Digit6': 5 };
            if (keyMap[e.code] !== undefined) {
                const index = keyMap[e.code];
                if (index < weaponIds.length) {
                    const weaponId = weaponIds[index];
                    if (this.unlockedWeapons.includes(weaponId) && this.currentWeapon !== weaponId) {
                        this.currentWeapon = weaponId;
                        const weapon = this.weapons[weaponId];
                        this.weaponUnlockNotifications.push({
                            text: `SWITCHED TO: ${weapon.name}`,
                            alpha: 1,
                            life: 90,
                            maxLife: 90,
                            y: this.CANVAS_HEIGHT / 2 - 80
                        });
                        this.updateHUD();
                    }
                }
            }
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    // ===== GAME FLOW =====

    startGame() {
        audio.init();
        this.state = 'playing';
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.totalShots = 0;
        this.hits = 0;
        this.alienKills = 0;
        
        // Weapon system - reset to pistol at start, persists across levels
        this.currentWeapon = 'pistol';
        this.unlockedWeapons = ['pistol'];
        this.weaponUnlockNotifications = [];
        
        // Combo system
        this.combo = 0;
        this.comboTimer = 0;
        this.peakCombo = 0;
        this.comboMultiplier = 1;
        this.comboFloatingTexts = [];

        // Power-up points tracking
        this.powerUpPoints = 0;

        // Gameplay score (excludes level-end bonuses, used for weapon unlocks)
        this.gameplayScore = 0;

        // Reset screen effects and clear canvas
        this.screenShake = 0;
        this.flashAlpha = 0;
        this.ctx.clearRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

        this.showScreen('game-screen');
        this.updateHUD();
        document.getElementById('game-container').classList.add('playing');

        // Start level (which now plays level intro cinematic)
        this.startLevel();

        // Start procedural background music
        audio.startMusic(this.level);
    }

    addScore(points) {
        this.score += points;
        this.gameplayScore += points;
    }

    startLevel() {
        // Clear any leftover boss state/HUD from a previous level. Without this,
        // dying on a boss level (boss never defeated) leaves the boss health bar
        // showing into the next game. On boss levels, createBoss() re-shows it.
        this.boss = null;
        document.getElementById('boss-hud').classList.remove('active');

        // Play level intro cinematic before starting level
        this.playCinematic('levelIntro', 2500, () => {
            this.state = 'playing';
            document.getElementById('game-container').classList.add('playing');
            this.levelStartTime = Date.now();
            this.bullets = [];
            this.enemyBullets = [];
            this.particles = [];
            this.powerUps = new PowerUpManager(this.canvas);
            this.ufo = null;
            this.ufoTimer = 600 + Math.random() * 600;
            this.slowTimer = 0;
            
            this.boss = null;
            this.bossIntroActive = false;
            this.bossIntroTimer = 0;
            this.bossIntroPhase = 0;
            this.levelCompleteDelay = null;
            this.powerUpPoints = 0;
            this.gameplayScore = 0;
            
            this.createPlayer();
            
            if (this.level % 5 === 0) {
                this.createBoss();
            } else {
                this.createAliens();
                this.createShields();
                this.alienDirection = 1;
                // Toned-down scaling so the game stays playable at higher levels.
                // Original: speed grew by 0.3/level and interval dropped by 3/level
                // (interval floor 5), causing a brutal jump around level 10-11.
                this.alienSpeed = 1 + (this.level - 1) * 0.15;
                this.alienMoveInterval = Math.max(12, 35 - (this.level - 1) * 2);
                this.alienMoveTimer = 0;
            }
        });
        
        // Don't start game logic yet — wait for cinematic
        this.state = 'cinematic';
        return;
    }

    createPlayer() {
        this.player = {
            x: this.CANVAS_WIDTH / 2,
            y: this.CANVAS_HEIGHT - 50,
            width: 40,
            height: 30,
            speed: 5,
            lives: this.lives,
            cooldown: 0,
            cooldownRate: 15,
            powerUps: {
                doubleFire: 0,
                tripleShot: 0
            },
            shieldActive: false,
            shieldTimer: 0,
            invincible: 0,
            visible: true
        };
        this.lives = this.player.lives;
    }

    createAliens() {
        this.aliens = [];
        const rows = Math.min(5 + Math.floor(this.level / 3), 8);
        const cols = Math.min(8 + Math.floor(this.level / 4), 12);
        const startX = 80;
        const startY = 60;
        const spacingX = 55;
        const spacingY = 45;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const type = this.getAlienType(row, rows);
                const points = type.points;
                
                this.aliens.push({
                    x: startX + col * spacingX,
                    y: startY + row * spacingY,
                    width: 35,
                    height: 25,
                    type: type,
                    points: points,
                    alive: true,
                    health: type.health || 1,
                    maxHealth: type.health || 1
                });
            }
        }
    }

    getAlienType(row, totalRows) {
        const rowPercent = row / totalRows;
        
        if (rowPercent < 0.2) {
            return { type: 'top', symbol: '👾', color: '#aa44ff', points: 30, health: 1 };
        } else if (rowPercent < 0.5) {
            return { type: 'middle', symbol: '👽', color: '#44ff44', points: 20, health: 1 };
        } else {
            return { type: 'bottom', symbol: '🛸', color: '#4488ff', points: 10, health: 1 };
        }
    }

    createShields() {
        this.shields = [];
        const shieldCount = 4;
        const spacing = this.CANVAS_WIDTH / (shieldCount + 1);
        
        for (let i = 0; i < shieldCount; i++) {
            const x = spacing * (i + 1) - 30;
            const y = this.CANVAS_HEIGHT - 150;
            this.shields.push(this.createShieldShape(x, y));
        }
    }

    // ===== BOSS SYSTEM =====

    createBoss() {
        const bossHealth = 50 + (this.level * 10);
        this.boss = {
            x: this.CANVAS_WIDTH / 2,
            y: -80, // Start off-screen for intro
            targetY: 80,
            width: 120,
            height: 80,
            health: bossHealth,
            maxHealth: bossHealth,
            phase: 'approach', // approach, fight, dying
            direction: 1,
            speed: 1.5 + (this.level / 5) * 0.5,
            shootTimer: 0,
            shootInterval: 45,
            pattern: 0, // 0: spread shots, 1: aimed shots, 2: mix
            patternTimer: 0,
            patternDuration: 180, // frames per pattern
            hitFlash: 0,
            introScale: 0,
            introAlpha: 0,
            eyePhase: 0,
            bodyWobble: 0
        };
        this.bossIntroActive = true;
        this.bossIntroTimer = 180; // 3 seconds intro
        this.bossIntroPhase = 1;
        
        // Play boss intro sound
        audio.playBossIntro();
    }

    updateBoss(deltaTime) {
        if (!this.boss) return;
        
        const boss = this.boss;
        
        // Boss intro animation
        if (boss.phase === 'approach') {
            boss.introScale = Math.min(1, boss.introScale + 0.02);
            boss.introAlpha = Math.min(1, boss.introAlpha + 0.03);
            
            // Move from off-screen to position
            if (boss.y < boss.targetY) {
                boss.y += 2;
            }
            
            // Dramatic entrance effects
            boss.eyePhase += 0.1;
            boss.bodyWobble += 0.05;
            
            // Screen shake on arrival
            if (boss.y >= boss.targetY && boss.introScale >= 1) {
                this.screenShake = 15;
                this.flashAlpha = 0.4;
                boss.phase = 'fight';
                this.bossIntroPhase = 2;
                
                // Big explosion effect on arrival
                this.createExplosion(boss.x, boss.targetY, '#ff3344', 40);
                this.createExplosion(boss.x, boss.targetY, '#ffaa00', 30);
            }
            
            this.updateBossHUD();
            return;
        }
        
        if (boss.phase === 'dying') {
            boss.y += 1;
            boss.introScale = Math.max(0, boss.introScale - 0.02);
            boss.introAlpha = Math.max(0, boss.introAlpha - 0.02);
            
            if (boss.introAlpha <= 0) {
                boss.phase = 'defeated';
                this.bossIntroPhase = 3;
            }
            this.updateBossHUD();
            return;
        }
        
        // Boss fight phase
        boss.eyePhase += 0.15;
        boss.bodyWobble += 0.08;
        
        // Horizontal movement - sinusoidal pattern
        boss.x += boss.speed * boss.direction;
        
        // Bounce off walls
        if (boss.x > this.CANVAS_WIDTH - 80) {
            boss.direction = -1;
        } else if (boss.x < 80) {
            boss.direction = 1;
        }
        
        // Slight vertical drift
        boss.y = boss.targetY + Math.sin(boss.bodyWobble) * 10;
        
        // Pattern switching
        boss.patternTimer++;
        if (boss.patternTimer >= boss.patternDuration) {
            boss.patternTimer = 0;
            boss.pattern = (boss.pattern + 1) % 3;
        }
        
        // Boss shooting
        boss.shootTimer++;
        if (boss.shootTimer >= boss.shootInterval) {
            boss.shootTimer = 0;
            this.bossShoot(boss);
        }
        
        this.updateBossHUD();
    }

    bossShoot(boss) {
        const playerX = this.player ? this.player.x : this.CANVAS_WIDTH / 2;
        
        switch (boss.pattern) {
            case 0: // Spread shots - 5 bullets fan out
                audio.playSpreadShot();
                const angles = [-0.6, -0.3, 0, 0.3, 0.6];
                angles.forEach((angle, i) => {
                    this.enemyBullets.push({
                        x: boss.x + (i - 2) * 20,
                        y: boss.y + boss.height / 2,
                        width: 6,
                        height: 10,
                        speed: 3.5,
                        color: '#ff44ff',
                        vx: Math.sin(angle) * 2,
                        vy: Math.cos(angle) * 3.5,
                        isBossBullet: true
                    });
                });
                break;
                
            case 1: // Aimed shots - 3 bullets track player
                audio.playAimedShot();
                for (let i = 0; i < 3; i++) {
                    const dx = playerX - boss.x;
                    const dy = this.player.y - boss.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const speed = 4.5;
                    this.enemyBullets.push({
                        x: boss.x + (i - 1) * 30,
                        y: boss.y + boss.height / 2,
                        width: 6,
                        height: 12,
                        speed: speed,
                        color: '#ff0000',
                        vx: (dx / dist) * speed * 0.5,
                        vy: Math.abs(dy / dist) * speed,
                        isBossBullet: true,
                        homing: true,
                        homingStrength: 0.02
                    });
                }
                break;
                
            case 2: // Mix - ring burst + aimed
                audio.playSpreadShot();
                // Ring burst
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    this.enemyBullets.push({
                        x: boss.x,
                        y: boss.y,
                        width: 5,
                        height: 8,
                        speed: 3,
                        color: '#ffaa00',
                        vx: Math.cos(angle) * 3,
                        vy: Math.sin(angle) * 3,
                        isBossBullet: true
                    });
                }
                setTimeout(() => {
                    if (this.boss && this.boss.phase === 'fight') {
                        audio.playAimedShot();
                        const dx = playerX - boss.x;
                        const dy = this.player.y - boss.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        const speed = 5;
                        this.enemyBullets.push({
                            x: boss.x,
                            y: boss.y + boss.height / 2,
                            width: 8,
                            height: 14,
                            speed: speed,
                            color: '#ff0000',
                            vx: (dx / dist) * speed * 0.4,
                            vy: Math.abs(dy / dist) * speed,
                            isBossBullet: true
                        });
                    }
                }, 300);
                break;
        }
    }

    updateBossHUD() {
        const bossHud = document.getElementById('boss-hud');
        const bossHealthFill = document.getElementById('boss-health-fill');
        
        if (!this.boss || this.boss.phase === 'defeated') {
            bossHud.classList.remove('active');
            return;
        }
        
        bossHud.classList.add('active');
        const healthPercent = (this.boss.health / this.boss.maxHealth) * 100;
        bossHealthFill.style.width = healthPercent + '%';
        
        if (healthPercent < 25) {
            bossHealthFill.classList.add('low');
        } else {
            bossHealthFill.classList.remove('low');
        }
    }

    damageBoss(damage) {
        if (!this.boss || this.boss.phase !== 'fight') return;

        this.boss.health -= damage;
        this.boss.hitFlash = 8;
        audio.playBossHit();

        // Hit particles
        this.createExplosion(
            this.boss.x + (Math.random() - 0.5) * this.boss.width,
            this.boss.y + (Math.random() - 0.5) * this.boss.height,
            '#ffaa00', 8
        );

        if (this.boss.health <= 0) {
            this.destroyBoss();
        } else {
            this.updateHUD();
        }
    }

    destroyBoss() {
        this.boss.phase = 'dying';
        audio.playBossDeath();
        this.screenShake = 25;
        this.flashAlpha = 0.6;
        
        // Massive explosion
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (this.boss) {
                    this.createExplosion(
                        this.boss.x + (Math.random() - 0.5) * this.boss.width,
                        this.boss.y + (Math.random() - 0.5) * this.boss.height,
                        ['#ff3344', '#ffaa00', '#ff44ff', '#44ffff', '#ffffff'][i],
                        25
                    );
                }
            }, i * 150);
        }
        
        // Drop multiple power-ups
        setTimeout(() => {
            if (this.powerUps) {
                const powerUpTypes = Object.values(PowerUpTypes);
                // Drop 3-5 power-ups
                const count = 3 + Math.floor(Math.random() * 3);
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                        const pu = new PowerUp(this.canvas, type);
                        pu.x = this.boss.x + (Math.random() - 0.5) * 100;
                        pu.y = this.boss.y;
                        this.powerUps.activePowerUps.push(pu);
                    }, i * 200);
                }
            }
        }, 500);
        
        // Award bonus score
        setTimeout(() => {
            const bonus = 1000 + (this.level * 200);
            this.score += bonus;
            this.showFloatingText(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, `BOSS DEFEATED! +${bonus}`);
            this.updateHUD();
        }, 800);
        
        // Complete level after animation
        setTimeout(() => {
            if (this.state === 'playing') {
                this.completeLevel();
            }
        }, 2000);
    }

    renderBoss() {
        if (!this.boss) return;
        const boss = this.boss;
        const ctx = this.ctx;
        
        if (boss.phase === 'defeated') return;
        
        ctx.save();
        
        // Intro effects
        if (boss.phase === 'approach') {
            ctx.globalAlpha = boss.introAlpha;
            const scale = boss.introScale;
            ctx.translate(boss.x, boss.y);
            ctx.scale(scale, scale);
            ctx.translate(-boss.x, -boss.y);
        }
        
        const x = boss.x;
        const y = boss.y;
        const w = boss.width;
        const h = boss.height;
        
        // Hit flash
        if (boss.hitFlash > 0) {
            boss.hitFlash--;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 30;
        } else {
            ctx.shadowColor = '#ff3344';
            ctx.shadowBlur = 15 + Math.sin(boss.eyePhase) * 5;
        }
        
        // Main body - large menacing alien shape
        const bodyColor = boss.hitFlash > 0 ? '#ffffff' : '#aa2244';
        const accentColor = boss.hitFlash > 0 ? '#ffaaaa' : '#ff4466';
        
        // Outer shell
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner body
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.ellipse(x, y, w / 3, h / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#220011';
        ctx.beginPath();
        ctx.ellipse(x, y, w / 5, h / 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes - glowing and menacing
        const eyeY = y - 8;
        const eyeSpacing = 22;
        const eyeSize = 10 + Math.sin(boss.eyePhase) * 2;
        
        // Left eye
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.ellipse(x - eyeSpacing, eyeY, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Right eye
        ctx.beginPath();
        ctx.ellipse(x + eyeSpacing, eyeY, eyeSize, eyeSize * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye pupils
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x - eyeSpacing, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + eyeSpacing, eyeY, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Mouth - menacing grin
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y + 15, 20, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.stroke();
        
        // Teeth
        ctx.fillStyle = '#ffffff';
        for (let i = -3; i <= 3; i++) {
            const toothX = x + i * 6;
            ctx.beginPath();
            ctx.moveTo(toothX - 3, y + 18);
            ctx.lineTo(toothX, y + 25);
            ctx.lineTo(toothX + 3, y + 18);
            ctx.closePath();
            ctx.fill();
        }
        
        // Tentacles/appendages
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
            const tentacleX = x + i * 18;
            const baseY = y + h / 2;
            const wave = Math.sin(boss.bodyWobble + i * 0.8) * 10;
            
            ctx.beginPath();
            ctx.moveTo(tentacleX, baseY);
            ctx.quadraticCurveTo(
                tentacleX + wave, baseY + 15,
                tentacleX + wave * 1.5, baseY + 25
            );
            ctx.stroke();
        }
        
        // Rotating ring around boss
        ctx.strokeStyle = '#ff446660';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.ellipse(x, y, w / 2 + 10, h / 2 + 10, boss.bodyWobble * 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.restore();
    }

    createShieldShape(x, y) {
        const pixels = [];
        const blockSize = 4;
        
        // Arch shape
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 15; col++) {
                if (row >= 5 && col >= 4 && col <= 10) continue; // Gap at bottom
                if (row >= 6 && col >= 2 && col <= 12) continue; // Bigger gap
                if (row >= 7) continue; // No bottom row
                
                // Rounded top
                const dx = col - 7;
                if (row === 0 && Math.abs(dx) > 5) continue;
                if (row === 1 && Math.abs(dx) > 6) continue;
                
                pixels.push({ x: x + col * blockSize, y: y + row * blockSize, health: 4 });
            }
        }
        
        return { pixels, width: 15 * blockSize, height: 8 * blockSize };
    }

    // ===== GAME LOOP =====

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        try {
            if (this.state === 'playing') {
                if (!this.cinematicActive) {
                    this.update(deltaTime);
                }
            }

            // Update cinematic transitions
            if (this.cinematicActive) {
                this.updateCinematic(deltaTime);
            }

            this.render();
        } catch (e) {
            // Never let a stray exception kill the loop — that would freeze the
            // game permanently (e.g. stuck on the GAME OVER screen with no restart).
            console.error('Game loop error:', e);
        } finally {
            requestAnimationFrame((t) => this.gameLoop(t));
        }
    }

    update(deltaTime) {
        const timeScale = this.slowTimer > 0 ? 0.4 : 1;
        
        this.updatePlayer();
        this.updateAliens();
        this.updateBullets();
        this.updateEnemyBullets();
        this.updateParticles();
        this.updatePowerUps();
        this.updateUFO();
        this.updateStars();
        this.updateShields();
        this.updateScreenEffects();
        this.updateCombo(deltaTime);
        this.updateWeaponNotifications();
        
        // Update boss if active
        if (this.boss && this.boss.phase !== 'defeated') {
            this.updateBoss(deltaTime);
        }
        
        // Check all collisions
        this.checkCollisions();
        
        // Check win condition - boss defeat takes priority over player death
        if (this.boss && this.boss.phase === 'defeated') {
            // Boss defeated - already handled in destroyBoss
        } else if (this.aliens.filter(a => a.alive).length === 0 && !this.boss) {
            this.completeLevel();
        }
        
        // Check lose condition - only trigger if boss is not being defeated.
        // IMPORTANT: skip while a cinematic is active. A player death starts the
        // death cinematic (which hands off to gameOver when it finishes). Without
        // this guard, this check runs in the SAME frame as playerHit(), calls
        // gameOver() while the death cinematic is still active — so gameOver's
        // own playCinematic('gameOver') early-returns (no GAME OVER screen ever
        // shows) yet state is already flipped to 'gameOver', blocking the death
        // cinematic's later, legitimate gameOver() call. Net effect: the game
        // freezes on the faded death overlay with no GAME OVER text or buttons.
        if (this.lives <= 0 && !this.player && !this.cinematicActive &&
            !(this.boss && this.boss.phase === 'defeated')) {
            this.gameOver();
        }
    }

    updatePlayer() {
        if (!this.player) return;
        
        // Movement
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
            this.player.x -= this.player.speed;
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.player.x += this.player.speed;
        }
        
        // Clamp position
        this.player.x = Math.max(this.player.width / 2, Math.min(this.CANVAS_WIDTH - this.player.width / 2, this.player.x));
        
        // Cooldown
        if (this.player.cooldown > 0) this.player.cooldown--;
        
        // Invincibility
        if (this.player.invincible > 0) {
            this.player.invincible--;
            this.player.visible = Math.floor(this.player.invincible / 4) % 2 === 0;
        } else {
            this.player.visible = true;
        }
    }

    updateAliens() {
        const aliveAliens = this.aliens.filter(a => a.alive);
        if (aliveAliens.length === 0) return;
        
        // Calculate speed based on remaining aliens
        const aliveRatio = aliveAliens.length / this.aliens.length;
        const speedMultiplier = 1 + (1 - aliveRatio) * 3;
        this.alienMoveTimer += speedMultiplier;
        
        if (this.alienMoveTimer >= this.alienMoveInterval) {
            this.alienMoveTimer = 0;
            this.moveAliens();
            audio.playInvaderMarch();
        }
        
        // Enemy shooting
        this.alienShootTimer++;
        const shootInterval = Math.max(20, 60 - this.level * 3);
        
        if (this.alienShootTimer >= shootInterval) {
            this.alienShootTimer = 0;
            this.enemyShoot(aliveAliens);
        }
    }

    moveAliens() {
        let shouldDrop = false;
        const aliveAliens = this.aliens.filter(a => a.alive);
        
        // Check boundaries
        aliveAliens.forEach(alien => {
            if ((this.alienDirection > 0 && alien.x + alien.width >= this.CANVAS_WIDTH - 20) ||
                (this.alienDirection < 0 && alien.x <= 20)) {
                shouldDrop = true;
            }
        });
        
        if (shouldDrop) {
            this.alienDirection *= -1;
            this.aliens.forEach(alien => {
                if (alien.alive) {
                    alien.y += this.alienDropDistance;
                }
            });
        } else {
            this.aliens.forEach(alien => {
                if (alien.alive) {
                    alien.x += this.alienSpeed * 10 * this.alienDirection;
                }
            });
        }
    }

    enemyShoot(aliveAliens) {
        // Find bottom-most alien in each column
        const columns = {};
        aliveAliens.forEach(alien => {
            const col = Math.round(alien.x / 55);
            if (!columns[col] || alien.y > columns[col].y) {
                columns[col] = alien;
            }
        });
        
        const shooters = Object.values(columns);
        if (shooters.length === 0) return;
        
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        
        this.enemyBullets.push({
            x: shooter.x,
            y: shooter.y + shooter.height,
            width: 4,
            height: 12,
            speed: 3 + this.level * 0.15,
            color: '#ff4444'
        });
    }

    updateBullets() {
        this.bullets = this.bullets.filter(bullet => {
            bullet.y -= bullet.speed;
            return bullet.y > -20;
        });
    }

    updateEnemyBullets() {
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            if (bullet.isBossBullet) {
                // Boss bullets can have horizontal velocity
                if (bullet.homing && this.player) {
                    // Slight homing toward player
                    const dx = this.player.x - bullet.x;
                    bullet.vx += (dx / Math.abs(dx || 1)) * bullet.homingStrength;
                }
                bullet.x += bullet.vx || 0;
                bullet.y += bullet.vy || bullet.speed;
            } else {
                bullet.y += bullet.speed;
            }
            return bullet.y < this.CANVAS_HEIGHT + 20 && bullet.y > -20 && 
                   bullet.x > -20 && bullet.x < this.CANVAS_WIDTH + 20;
        });
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.vy += 0.05; // Gravity
            return p.life > 0;
        });
    }

    updatePowerUps() {
        if (!this.powerUps) return;

        // Player can be null briefly after death (during the death->gameOver gap)
        if (this.player) {
            const collected = this.powerUps.checkPlayerCollision(this.player);
            collected.forEach(powerUp => {
                this.powerUps.applyPowerUp(powerUp, this.player, this);
                this.createExplosion(this.player.x, this.player.y, powerUp.type.color, 10);
            });
        }

        this.powerUps.update(this);

        if (this.player) {
            this.powerUps.clearExpired(this.player, this);
        }
    }

    updateUFO() {
        this.ufoTimer--;
        
        if (!this.ufo && this.ufoTimer <= 0) {
            // Spawn UFO
            const direction = Math.random() > 0.5 ? 1 : -1;
            this.ufo = {
                x: direction > 0 ? -50 : this.CANVAS_WIDTH + 50,
                y: 35,
                width: 50,
                height: 25,
                speed: direction * 2,
                points: [50, 100, 150, 300][Math.floor(Math.random() * 4)]
            };
            this.ufoTimer = 600 + Math.random() * 600;
        }
        
        if (this.ufo) {
            this.ufo.x += this.ufo.speed;
            
            // Play sound occasionally
            if (Math.random() < 0.01) audio.playUFO();
            
            if ((this.ufo.speed > 0 && this.ufo.x > this.CANVAS_WIDTH + 60) ||
                (this.ufo.speed < 0 && this.ufo.x < -60)) {
                this.ufo = null;
            }
        }
    }

    updateStars() {
        const slowFactor = this.slowTimer > 0 ? 0.3 : 1;

        // Update parallax star layers
        for (const layerName of ['far', 'mid', 'near']) {
            const layer = this.starLayers[layerName];
            layer.forEach(star => {
                star.y += star.speed * slowFactor;
                star.twinklePhase += star.twinkleSpeed;

                // Twinkle effect
                const twinkle = Math.sin(star.twinklePhase);
                const factor = 0.6 + 0.4 * twinkle;
                star.currentBrightness = star.brightness * factor;

                if (star.y > this.CANVAS_HEIGHT) {
                    star.y = -2;
                    star.x = Math.random() * this.CANVAS_WIDTH;
                }
            });
        }

        // Update shooting stars
        this.updateShootingStars();
    }

    updateShootingStars() {
        // Randomly spawn a shooting star
        if (Math.random() < 0.0005) {
            this.shootingStars.push({
                x: Math.random() * this.CANVAS_WIDTH,
                y: Math.random() * this.CANVAS_HEIGHT * 0.5,
                vx: (Math.random() * 4 + 3) * (Math.random() > 0.5 ? 1 : -1),
                vy: Math.random() * 3 + 2,
                length: Math.random() * 60 + 40,
                life: 0,
                maxLife: Math.random() * 30 + 20,
                brightness: 1
            });
        }

        // Update existing shooting stars
        this.shootingStars = this.shootingStars.filter(s => {
            s.x += s.vx;
            s.y += s.vy;
            s.life++;
            s.brightness = 1 - (s.life / s.maxLife);
            return s.life < s.maxLife;
        });
    }

    drawStarLayer(layer, opacityMultiplier) {
        const ctx = this.ctx;
        for (const star of layer) {
            const alpha = star.currentBrightness * opacityMultiplier;
            if (alpha < 0.05) continue;

            // Star color varies slightly by layer
            if (layer === this.starLayers.far) {
                ctx.fillStyle = `rgba(180, 200, 255, ${alpha})`;
            } else if (layer === this.starLayers.mid) {
                ctx.fillStyle = `rgba(220, 230, 255, ${alpha})`;
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            }

            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawShootingStars() {
        const ctx = this.ctx;
        for (const s of this.shootingStars) {
            const tailX = s.x - (s.vx / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.length;
            const tailY = s.y - (s.vy / Math.sqrt(s.vx * s.vx + s.vy * s.vy)) * s.length;

            const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
            grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
            grad.addColorStop(0.7, `rgba(255, 255, 255, ${s.brightness * 0.3})`);
            grad.addColorStop(1, `rgba(255, 255, 255, ${s.brightness})`);

            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();

            // Bright head
            ctx.fillStyle = `rgba(255, 255, 255, ${s.brightness})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ===== COMBO SYSTEM =====

    getComboMultiplier() {
        if (this.combo >= 50) return 8;
        if (this.combo >= 40) return 6;
        if (this.combo >= 30) return 5;
        if (this.combo >= 25) return 4;
        if (this.combo >= 20) return 3;
        if (this.combo >= 15) return 2.5;
        if (this.combo >= 10) return 2;
        if (this.combo >= 5) return 1.5;
        return 1;
    }

    updateCombo(deltaTime) {
        if (this.combo > 0) {
            this.comboTimer -= deltaTime;
            if (this.comboTimer <= 0) {
                // Reset combo
                this.showComboFloatingText(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2, this.combo, 1, 0, true);
                this.combo = 0;
                this.comboTimer = 0;
                this.comboMultiplier = 1;
            } else {
                // Update multiplier
                this.comboMultiplier = this.getComboMultiplier();
            }
        }

        // Update combo floating texts
        this.comboFloatingTexts = this.comboFloatingTexts.filter(ft => {
            ft.life--;
            ft.y -= 0.5;
            ft.alpha = ft.life / ft.maxLife;
            return ft.life > 0;
        });
    }

    showComboFloatingText(x, y, comboCount, multiplier, points, isReset = false) {
        if (isReset) {
            this.comboFloatingTexts.push({
                x, y,
                text: `COMBO BROKEN! Peak: ${this.peakCombo}`,
                alpha: 1,
                life: 90,
                maxLife: 90,
                color: '#ff4444',
                size: 18
            });
            return;
        }
        if (multiplier <= 1) return;

        const color = multiplier >= 4 ? '#ffaa00' : multiplier >= 2.5 ? '#ff44ff' : '#44ff88';
        this.comboFloatingTexts.push({
            x, y,
            text: `${comboCount}x COMBO! +${points}`,
            alpha: 1,
            life: 60,
            maxLife: 60,
            color,
            size: 14 + Math.min(multiplier * 1.5, 8)
        });
    }

    renderComboFloatingTexts() {
        const ctx = this.ctx;
        for (const ft of this.comboFloatingTexts) {
            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = `bold ${ft.size}px 'Courier New', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Glow
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);

            // White outline
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeText(ft.text, ft.x, ft.y);

            ctx.restore();
        }
    }

    updateShields() {
        this.shields.forEach(shield => {
            shield.pixels = shield.pixels.filter(pixel => pixel.health > 0);
        });
    }

    updateScreenEffects() {
        if (this.screenShake > 0) this.screenShake *= 0.9;
        if (this.screenShake < 0.5) this.screenShake = 0;
        if (this.flashAlpha > 0) this.flashAlpha *= 0.95;
    }

    // ===== WEAPON SYSTEM =====

    getAllWeaponIds() {
        return Object.keys(this.weapons);
    }

    checkWeaponUnlock() {
        // Check all weapons and unlock any that are reachable
        let newlyUnlocked = false;
        this.getAllWeaponIds().forEach((weaponId) => {
            if (!this.unlockedWeapons.includes(weaponId) && this.gameplayScore >= this.weapons[weaponId].unlockScore) {
                this.unlockedWeapons.push(weaponId);
                const weapon = this.weapons[weaponId];
                this.weaponUnlockNotifications.push({
                    text: `WEAPON UNLOCKED: ${weapon.name}! (Press W to select)`,
                    alpha: 1,
                    life: 240,
                    maxLife: 240,
                    y: this.CANVAS_HEIGHT / 2 - 50
                });
                audio.playLevelComplete();
                newlyUnlocked = true;
            }
        });

        // Auto-advance to first unlocked weapon that's better than current
        if (newlyUnlocked) {
            const weaponIds = this.getAllWeaponIds();
            const unlockedIndices = weaponIds
                .map((id, i) => ({ id, i }))
                .filter(w => this.unlockedWeapons.includes(w.id));

            if (unlockedIndices.length > 0) {
                // Find the best unlocked weapon by score threshold
                const best = unlockedIndices.reduce((a, b) =>
                    this.weapons[a.id].unlockScore > this.weapons[b.id].unlockScore ? a : b
                );
                // Only auto-advance if the new best weapon is significantly better
                const currentUnlockedIndex = weaponIds.indexOf(this.currentWeapon);
                const bestIndex = best.i;
                if (bestIndex > currentUnlockedIndex) {
                    this.currentWeapon = best.id;
                }
            }
        }

        // Always refresh HUD after checking unlocks (weapon may have changed)
        this.updateHUD();
    }

    cycleWeapon(direction) {
        const weaponIds = this.getAllWeaponIds();
        const available = weaponIds.filter(id => this.unlockedWeapons.includes(id));
        if (available.length <= 1) return;

        const currentIndex = available.indexOf(this.currentWeapon);
        const newIndex = (currentIndex + direction + available.length) % available.length;
        this.currentWeapon = available[newIndex];

        // Show notification
        const weapon = this.weapons[this.currentWeapon];
        this.weaponUnlockNotifications.push({
            text: `SWITCHED TO: ${weapon.name}`,
            alpha: 1,
            life: 90,
            maxLife: 90,
            y: this.CANVAS_HEIGHT / 2 - 80
        });

        // Update HUD to reflect new weapon
        this.updateHUD();
    }

    updateWeaponNotifications() {
        this.weaponUnlockNotifications = this.weaponUnlockNotifications.filter(ntf => {
            ntf.life--;
            ntf.y -= 0.3;
            ntf.alpha = (ntf.life / ntf.maxLife);
            return ntf.life > 0;
        });
    }

    renderWeaponNotifications() {
        const ctx = this.ctx;
        for (const ntf of this.weaponUnlockNotifications) {
            ctx.save();
            ctx.globalAlpha = ntf.alpha;
            ctx.font = 'bold 24px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Glow effect
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(ntf.text, this.CANVAS_WIDTH / 2, ntf.y);
            
            // White outline
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeText(ntf.text, this.CANVAS_WIDTH / 2, ntf.y);
            
            ctx.restore();
        }
    }

    // ===== SHOOTING =====

    shoot() {
        if (!this.player) return;

        const weapon = this.weapons[this.currentWeapon];
        if (this.player.cooldown > 0) return;

        audio.playShoot();

        const baseX = this.player.x;
        const baseY = this.player.y - this.player.height / 2;

        // Railgun: single powerful beam (no main bullet template)
        if (this.currentWeapon === 'railgun') {
            this.bullets.push({
                x: baseX,
                y: baseY,
                width: 8,
                height: 30,
                speed: 12,
                color: '#ffffff',
                damage: 10,
                weapon: 'railgun',
                shape: 'rail',
                piercing: true,
                areaDamage: 0,
                hitAliens: [],
                armorPiercing: true
            });
        } else {
            // Main bullet with weapon properties for all other weapons
            this.bullets.push({
                x: baseX,
                y: baseY,
                width: weapon.shape === 'laser' ? 3 : weapon.shape === 'plasma' ? 10 : 4,
                height: weapon.shape === 'laser' ? 22 : weapon.shape === 'plasma' ? 10 : 15,
                speed: weapon.shape === 'plasma' ? 6 : 8,
                color: weapon.color,
                damage: weapon.damage,
                weapon: this.currentWeapon,
                shape: weapon.shape,
                piercing: weapon.piercing || false,
                areaDamage: weapon.areaDamage || 0,
                hitAliens: [] // Track pierced aliens for laser
            });

            // Machine Gun: extra side bullets for visual flair
            if (this.currentWeapon === 'machineGun') {
                this.bullets.push({
                    x: baseX - 6,
                    y: baseY + 3,
                    width: 3,
                    height: 12,
                    speed: 8,
                    color: weapon.color,
                    damage: 1,
                    weapon: this.currentWeapon,
                    shape: 'rapid',
                    piercing: false,
                    areaDamage: 0,
                    hitAliens: []
                });
                this.bullets.push({
                    x: baseX + 6,
                    y: baseY + 3,
                    width: 3,
                    height: 12,
                    speed: 8,
                    color: weapon.color,
                    damage: 1,
                    weapon: this.currentWeapon,
                    shape: 'rapid',
                    piercing: false,
                    areaDamage: 0,
                    hitAliens: []
                });
            }

            // Microwave: 3-bullet spread with area damage
            if (this.currentWeapon === 'microwave') {
                this.bullets.push({
                    x: baseX - 12,
                    y: baseY,
                    width: 6,
                    height: 10,
                    speed: 7,
                    color: '#ff4444',
                    damage: 2,
                    weapon: 'microwave',
                    shape: 'microwave',
                    piercing: false,
                    areaDamage: 80,
                    hitAliens: []
                });
                this.bullets.push({
                    x: baseX + 12,
                    y: baseY,
                    width: 6,
                    height: 10,
                    speed: 7,
                    color: '#ff4444',
                    damage: 2,
                    weapon: 'microwave',
                    shape: 'microwave',
                    piercing: false,
                    areaDamage: 80,
                    hitAliens: []
                });
            }
        }

        // Double fire power-up (stacks with weapon)
        if (this.player.powerUps.doubleFire > 0) {
            this.bullets.push({
                x: baseX - 8,
                y: baseY + 5,
                width: 4,
                height: 15,
                speed: 8,
                color: '#ff4444',
                damage: 1,
                weapon: 'doubleFire',
                shape: 'bolt',
                piercing: false,
                areaDamage: 0,
                hitAliens: []
            });
            this.bullets.push({
                x: baseX + 8,
                y: baseY + 5,
                width: 4,
                height: 15,
                speed: 8,
                color: '#ff4444',
                damage: 1,
                weapon: 'doubleFire',
                shape: 'bolt',
                piercing: false,
                areaDamage: 0,
                hitAliens: []
            });
        }

        // Triple shot power-up (stacks with weapon)
        if (this.player.powerUps.tripleShot > 0) {
            this.bullets.push({
                x: baseX - 15,
                y: baseY,
                width: 4,
                height: 15,
                speed: 8,
                color: '#ff88ff',
                damage: 1,
                weapon: 'tripleShot',
                shape: 'bolt',
                piercing: false,
                areaDamage: 0,
                hitAliens: []
            });
            this.bullets.push({
                x: baseX + 15,
                y: baseY,
                width: 4,
                height: 15,
                speed: 8,
                color: '#ff88ff',
                damage: 1,
                weapon: 'tripleShot',
                shape: 'bolt',
                piercing: false,
                areaDamage: 0,
                hitAliens: []
            });
        }

        this.player.cooldown = weapon.fireRate;
        this.totalShots++;
    }

    // ===== COLLISION DETECTION =====

    checkCollisions() {
        // Player bullets vs aliens
        this.bullets = this.bullets.filter(bullet => {
            let hit = false;
            
            this.aliens.forEach(alien => {
                if (!alien.alive) return;
                
                // Skip if already pierced this alien (laser piercing)
                if (bullet.piercing && bullet.hitAliens && bullet.hitAliens.includes(alien)) return;
                
                if (this.rectsOverlap(
                    bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height,
                    alien.x - alien.width/2, alien.y - alien.height/2, alien.width, alien.height
                )) {
                    // Apply damage
                    alien.health -= bullet.damage;
                    
                    // Track pierced aliens
                    if (bullet.piercing && bullet.hitAliens) {
                        bullet.hitAliens.push(alien);
                    }
                    
                    // Area damage (plasma cannon) - damage nearby aliens
                    if (bullet.areaDamage > 0) {
                        this.aliens.forEach(nearAlien => {
                            if (!nearAlien.alive || nearAlien === alien) return;
                            if (bullet.piercing && bullet.hitAliens && bullet.hitAliens.includes(nearAlien)) return;
                            const dx = nearAlien.x - alien.x;
                            const dy = nearAlien.y - alien.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist < bullet.areaDamage) {
                                nearAlien.health -= Math.max(1, Math.floor(bullet.damage * (1 - dist / bullet.areaDamage)));
                                if (nearAlien.health <= 0) {
                                    nearAlien.alive = false;
                                    this.alienKills++;
                                    this.hits++;
                                    this.combo++;
                                    this.comboTimer = this.comboDecayTime;
                                    if (this.combo > this.peakCombo) this.peakCombo = this.combo;
                                    this.comboMultiplier = this.getComboMultiplier();
                                    const bonusPoints = Math.floor(nearAlien.points * (this.comboMultiplier - 1));
                                    const totalPoints = nearAlien.points + bonusPoints;
                                    this.addScore(totalPoints);
                                    this.showComboFloatingText(nearAlien.x, nearAlien.y, this.combo, this.comboMultiplier, totalPoints);
                                    this.createExplosion(nearAlien.x, nearAlien.y, nearAlien.type.color, 12);
                                    audio.playAlienDeath();
                                    this.updateHUD();
                                } else {
                                    this.createExplosion(nearAlien.x, nearAlien.y, '#ff8800', 4);
                                }
                            }
                        });
                        // Plasma explosion effect
                        this.createExplosion(alien.x, alien.y, '#44ffff', 20);
                    }
                    
                    if (alien.health <= 0) {
                        alien.alive = false;
                        this.alienKills++;
                        this.hits++;
                        
                        // Combo system
                        this.combo++;
                        this.comboTimer = this.comboDecayTime;
                        if (this.combo > this.peakCombo) this.peakCombo = this.combo;
                        this.comboMultiplier = this.getComboMultiplier();
                        
                        const bonusPoints = Math.floor(alien.points * (this.comboMultiplier - 1));
                        const totalPoints = alien.points + bonusPoints;
                        this.addScore(totalPoints);

                        // Check for weapon unlock
                        this.checkWeaponUnlock();
                        
                        // Visual feedback
                        this.showComboFloatingText(alien.x, alien.y, this.combo, this.comboMultiplier, totalPoints);

                        this.createExplosion(alien.x, alien.y, alien.type.color, 15);
                        audio.playAlienDeath();
                        this.updateHUD();
                    } else {
                        this.createExplosion(bullet.x, bullet.y, '#ffffff', 5);
                    }
                    
                    // Non-piercing bullets stop on hit
                    if (!bullet.piercing) {
                        hit = true;
                    }
                }
            });
            
            // Player bullets vs UFO
            if (!hit && this.ufo && this.rectsOverlap(
                bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height,
                this.ufo.x - this.ufo.width/2, this.ufo.y - this.ufo.height/2, this.ufo.width, this.ufo.height
            )) {
                this.addScore(this.ufo.points);
                this.createExplosion(this.ufo.x, this.ufo.y, '#ffaa00', 20);
                audio.playAlienDeath();
                this.showFloatingText(this.ufo.x, this.ufo.y, this.ufo.points + ' pts');
                this.ufo = null;
                hit = true;
                this.updateHUD();
            }

            // Player bullets vs Boss
            if (!hit && this.boss && this.boss.phase === 'fight' && this.rectsOverlap(
                bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height,
                this.boss.x - this.boss.width/2, this.boss.y - this.boss.height/2, this.boss.width, this.boss.height
            )) {
                this.damageBoss(bullet.damage || 1);
                hit = true;
            }
            
            // Piercing bullets never stop — they pass through everything
            return !hit;
        });
        
        // Enemy bullets vs player
        if (this.player && this.player.invincible <= 0) {
            for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                const bullet = this.enemyBullets[i];
                if (this.rectsOverlap(
                    bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height,
                    this.player.x - this.player.width/2, this.player.y - this.player.height/2, this.player.width, this.player.height
                )) {
                    if (this.player.shieldActive) {
                        this.player.shieldActive = false;
                        this.createExplosion(this.player.x, this.player.y, '#4488ff', 10);
                        audio.playShieldHit();
                    } else {
                        this.playerHit();
                    }
                    this.enemyBullets.splice(i, 1);
                    break;
                }
            }
        }
        
        // Enemy bullets vs shields
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            let hitShield = false;
            this.shields.forEach(shield => {
                shield.pixels = shield.pixels.filter(pixel => {
                    if (Math.abs(bullet.x - pixel.x) < 6 && Math.abs(bullet.y - pixel.y) < 6) {
                        pixel.health--;
                        hitShield = true;
                        return false;
                    }
                    return true;
                });
            });
            if (hitShield) {
                this.enemyBullets.splice(i, 1);
            }
        }
        
        // Aliens vs shields
        this.aliens.forEach(alien => {
            if (!alien.alive) return;
            this.shields.forEach(shield => {
                shield.pixels = shield.pixels.filter(pixel => {
                    return !this.rectsOverlap(
                        alien.x - alien.width/2, alien.y - alien.height/2, alien.width, alien.height,
                        pixel.x, pixel.y, 5, 5
                    );
                });
            });
        });
        
        // Aliens reaching player level
        if (this.player) {
            this.aliens.forEach(alien => {
                if (alien.alive && alien.y + alien.height >= this.player.y - this.player.height) {
                    this.gameOver();
                }
            });
        }
    }

    rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    playerHit() {
        this.lives--;
        this.player.lives = this.lives;
        this.createExplosion(this.player.x, this.player.y, '#ff4444', 30);
        this.screenShake = 10;
        this.flashAlpha = 0.3;
        audio.playPlayerDeath();
        
        if (this.lives <= 0) {
            this.player = null;
            // Play death cinematic before game over
            this.playCinematic('death', 2500, () => {
                this.slowTimer = 0; // End slow-mo
                setTimeout(() => this.gameOver(), 500);
            });
        } else {
            this.player.invincible = 120; // 2 seconds at 60fps
        }
        
        this.updateHUD();
    }

    // ===== PARTICLES =====

    createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
            const speed = 1 + Math.random() * 4;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 30 + Math.random() * 20,
                color: color,
                size: 2 + Math.random() * 4
            });
        }
    }

    showFloatingText(x, y, text) {
        // Simple floating text - just add to particles with special type
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: -1,
            life: 60,
            text: text,
            color: '#ffaa00',
            isText: true
        });
    }

    clearScreen() {
        // Destroy all aliens with effect
        this.aliens.forEach(alien => {
            if (alien.alive) {
                this.createExplosion(alien.x, alien.y, alien.type.color, 10);
                this.addScore(Math.floor(alien.points / 2)); // Half points for bomb
                alien.alive = false;
                this.alienKills++;
            }
        });
        this.screenShake = 15;
        this.flashAlpha = 0.5;
        audio.playAlienDeath();
        this.updateHUD();
    }

    // ===== LEVEL MANAGEMENT =====

    completeLevel() {
        // Auto-apply any power-ups still on screen
        if (this.powerUps && this.powerUps.activePowerUps.length > 0) {
            this.powerUps.activePowerUps.forEach(pu => {
                this.applyPowerUpEffect(pu.type);
            });
            this.powerUps.activePowerUps = [];
        }

        this.state = 'levelComplete';

        const timeBonus = Math.max(0, Math.floor((300000 - (Date.now() - this.levelStartTime)) / 1000)) * 5;
        const livesBonus = this.lives * 100;
        const powerUpBonus = this.powerUpPoints;
        const totalBonus = timeBonus + livesBonus + powerUpBonus;

        this.score += totalBonus;
        this.updateHUD();

        document.getElementById('level-bonus').textContent = totalBonus;
        document.getElementById('time-bonus').textContent = timeBonus;
        document.getElementById('lives-bonus').textContent = livesBonus;
        document.getElementById('powerup-bonus').textContent = powerUpBonus;
        document.getElementById('total-bonus-display').textContent = totalBonus;
        
        audio.playLevelComplete();
        
        // Simple transition effect for level completion (no death cracks)
        this.screenShake = 5;
        this.flashAlpha = 0.3;
        
        setTimeout(() => {
            if (this.state === 'levelComplete') {
                this.showScreen('level-screen');
                document.getElementById('game-container').classList.remove('playing');
            }
        }, 500);
    }

    applyPowerUpEffect(type) {
        if (!this.player) return;
        // Extra life still gives the life
        if (type.id === 'extra_life') {
            this.lives = Math.min(this.lives + 1, 5);
            this.player.lives = this.lives;
            this.updateHUD();
        }
        // All power-ups also award points
        if (type.points) {
            this.score += type.points;
            this.powerUpPoints += type.points;
            this.updateHUD();
        }
    }

    nextLevel() {
        this.level++;

        if (this.level > this.MAX_LEVELS) {
            // Victory!
            this.state = 'gameOver';
            this.showGameOver();
            return;
        }

        this.showScreen('game-screen');
        this.state = 'playing';
        this.startLevel();
        this.updateHUD();
        
        // Intensify music for new level
        audio.intensifyMusic(this.level);
    }

    gameOver() {
        if (this.state === 'gameOver') return;

        this.state = 'gameOver';
        // Lock in the final score and level so submitScore() always has the
        // correct values even if the game object is reused later.
        this.finalScore = this.score;
        this.finalLevel = this.level;
        this.saveHighScore();
        document.getElementById('game-container').classList.remove('playing');

        audio.playGameOver();
        audio.stopMusic();

        // Set up game over UI data
        document.getElementById('final-score').textContent = this.score.toLocaleString();
        document.getElementById('final-level').textContent = this.level;
        document.getElementById('final-kills').textContent = this.alienKills;
        document.getElementById('final-combo').textContent = this.peakCombo;

        const accuracy = this.totalShots > 0 ? Math.round((this.hits / this.totalShots) * 100) : 0;
        document.getElementById('final-accuracy').textContent = accuracy + '%';

        // Check for new high score
        const isNewHigh = this.score > this.highScore ||
            (this.highScore === 0 && this.score > 0);

        // Play game over cinematic first
        this.playCinematic('gameOver', 4000, () => {
            // After cinematic, show the game over screen
            if (isNewHigh || leaderboard.qualifies(this.score)) {
                document.getElementById('new-high-score').classList.remove('hidden');
                setTimeout(() => {
                    document.getElementById('score-modal').classList.remove('hidden');
                    document.getElementById('player-name').focus();
                }, 500);
            }

            this.showScreen('gameover-screen');
        });
    }

    submitScore() {
        const name = document.getElementById('player-name').value.trim() || 'Anonymous';
        leaderboard.addScore(name, this.finalScore, this.finalLevel);

        document.getElementById('score-modal').classList.add('hidden');
        document.getElementById('player-name').value = '';

        this.showLeaderboard();
    }

    // ===== UI =====

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    updateHUD() {
        document.getElementById('score-display').textContent = this.score.toLocaleString();
        document.getElementById('high-score-display').textContent = this.highScore.toLocaleString();
        document.getElementById('level-display').textContent = this.level;
        document.getElementById('lives-display').textContent = '♥'.repeat(Math.max(0, this.lives));
        
        // Weapon display
        this.updateWeaponHUD();
        
        // Combo display
        const comboDisplay = document.getElementById('combo-display');
        if (comboDisplay && this.combo >= 3) {
            comboDisplay.classList.add('active');
            comboDisplay.textContent = `${this.combo}x COMBO`;
            comboDisplay.style.color = this.comboMultiplier >= 4 ? '#ffaa00' : this.comboMultiplier >= 2.5 ? '#ff44ff' : '#44ff88';
            comboDisplay.style.fontSize = `${1.2 + Math.min(this.comboMultiplier * 0.15, 0.8)}rem`;
        } else {
            comboDisplay.classList.remove('active');
        }
    }

    updateWeaponHUD() {
        const weaponDisplay = document.getElementById('weapon-display');
        const weaponIcon = document.getElementById('weapon-icon');
        const weaponName = document.getElementById('weapon-name');

        if (!weaponDisplay || !weaponIcon || !weaponName) return;

        const weapon = this.weapons[this.currentWeapon];
        weaponName.textContent = weapon.name.toUpperCase();

        // Set icon based on weapon
        const icons = {
            pistol: '🔫',
            machineGun: '⚡',
            microwave: '🌊',
            laserBeam: '🔆',
            plasmaCannon: '💥',
            railgun: '🎯'
        };
        weaponIcon.textContent = icons[this.currentWeapon] || '🔫';

        // Update class for styling
        weaponDisplay.className = 'weapon-display';
        if (this.currentWeapon === 'machineGun') weaponDisplay.classList.add('machine-gun');
        else if (this.currentWeapon === 'microwave') weaponDisplay.classList.add('microwave');
        else if (this.currentWeapon === 'laserBeam') weaponDisplay.classList.add('laser-beam');
        else if (this.currentWeapon === 'plasmaCannon') weaponDisplay.classList.add('plasma-cannon');
        else if (this.currentWeapon === 'railgun') weaponDisplay.classList.add('railgun');

        // Show weapon cycling hint
        const availableCount = this.unlockedWeapons.length;
        if (availableCount > 1) {
            const nextWeapon = this.getNextUnlockedWeapon(1);
            const prevWeapon = this.getNextUnlockedWeapon(-1);
            weaponName.textContent = `${weapon.name.toUpperCase()} [W/Q]`;
        }
    }

    getNextUnlockedWeapon(direction) {
        const weaponIds = this.getAllWeaponIds();
        const available = weaponIds.filter(id => this.unlockedWeapons.includes(id));
        if (available.length <= 1) return null;

        const currentIndex = available.indexOf(this.currentWeapon);
        const newIndex = (currentIndex + direction + available.length) % available.length;
        return this.weapons[available[newIndex]];
    }

    showLeaderboard() {
        leaderboard.render();
        this.showScreen('leaderboard-screen');
        this.state = 'leaderboard';
        document.getElementById('game-container').classList.remove('playing');
    }

    showGameOver() {
        this.showScreen('gameover-screen');
        this.state = 'gameOver';
        document.getElementById('game-container').classList.remove('playing');
    }

    pause() {
        this.state = 'paused';
        this.showScreen('pause-screen');
        document.getElementById('game-container').classList.remove('playing');

        // Soften music when paused
        audio.pauseMusic();
    }

    resume() {
        this.state = 'playing';
        this.showScreen('game-screen');
        document.getElementById('game-container').classList.add('playing');

        // Resume music from pause
        audio.resumeMusic();
    }

    quitToMenu() {
        this.state = 'menu';
        this.showScreen('start-screen');
        document.getElementById('game-container').classList.remove('playing');

        // Stop music when returning to menu
        audio.stopMusic();
    }

    // ===== RENDERING =====

    render() {
        const ctx = this.ctx;
        const W = this.CANVAS_WIDTH;
        const H = this.CANVAS_HEIGHT;
        
        // Clear with shake
        ctx.save();
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            ctx.translate(shakeX, shakeY);
        }
        
        // Nebula gradient background
        const nebulaGrad = ctx.createRadialGradient(W * 0.3, H * 0.4, 0, W * 0.3, H * 0.4, W * 0.8);
        nebulaGrad.addColorStop(0, 'rgba(15, 5, 40, 0.8)');
        nebulaGrad.addColorStop(0.5, 'rgba(5, 2, 25, 0.4)');
        nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebulaGrad;
        ctx.fillRect(0, 0, W, H);

        const nebulaGrad2 = ctx.createRadialGradient(W * 0.75, H * 0.6, 0, W * 0.75, H * 0.6, W * 0.6);
        nebulaGrad2.addColorStop(0, 'rgba(5, 20, 40, 0.5)');
        nebulaGrad2.addColorStop(0.6, 'rgba(2, 10, 30, 0.2)');
        nebulaGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebulaGrad2;
        ctx.fillRect(0, 0, W, H);

        // Draw parallax star layers (far → near for depth)
        this.drawStarLayer(this.starLayers.far, 0.4);
        this.drawStarLayer(this.starLayers.mid, 0.7);
        this.drawStarLayer(this.starLayers.near, 1.0);

        // Shooting stars
        this.drawShootingStars();

        // Combo floating texts
        this.renderComboFloatingTexts();
        
        if (this.state === 'playing' || this.state === 'paused') {
            // Shields
            this.renderShields();
            
            // Aliens (skip on boss levels)
            if (!this.boss) {
                this.renderAliens();
            }
            
            // Boss
            this.renderBoss();
            
            // UFO
            this.renderUFO();
            
            // Player
            this.renderPlayer();
            
            // Player bullets
            this.renderBullets();
            
            // Enemy bullets
            this.renderEnemyBullets();
            
            // Power-ups
            if (this.powerUps) {
                this.powerUps.draw(ctx);
            }
            
            // Particles
            this.renderParticles();
            
            // Weapon unlock notifications
            this.renderWeaponNotifications();
        }
        
        // Flash effect
        if (this.flashAlpha > 0.01) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
            ctx.fillRect(0, 0, W, H);
        }
        
        ctx.restore();
    }

    renderPlayer() {
        if (!this.player || !this.player.visible) return;
        
        const ctx = this.ctx;
        const x = this.player.x;
        const y = this.player.y;
        
        // Shield effect
        if (this.player.shieldActive) {
            ctx.strokeStyle = '#4488ff80';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Ship body
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.lineTo(x - 20, y + 10);
        ctx.lineTo(x - 10, y + 15);
        ctx.lineTo(x + 10, y + 15);
        ctx.lineTo(x + 20, y + 10);
        ctx.closePath();
        ctx.fill();
        
        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y - 15);
        ctx.lineTo(x - 20, y + 10);
        ctx.lineTo(x - 10, y + 15);
        ctx.lineTo(x + 10, y + 15);
        ctx.lineTo(x + 20, y + 10);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    renderAliens() {
        const ctx = this.ctx;
        const time = Date.now() / 500;

        this.aliens.forEach(alien => {
            if (!alien.alive) return;

            const x = alien.x;
            const y = alien.y;
            const bob = Math.sin(time + alien.x * 0.05) * 2;
            const walkFrame = Math.floor((Date.now() / 300 + alien.x * 0.01) % 2);

            switch (alien.type.type) {
                case 'top':
                    this.drawTopAlien(ctx, x, y + bob, alien.type.color, walkFrame);
                    break;
                case 'middle':
                    this.drawMiddleAlien(ctx, x, y + bob, alien.type.color, walkFrame);
                    break;
                case 'bottom':
                    this.drawBottomAlien(ctx, x, y + bob, alien.type.color, walkFrame);
                    break;
            }

            // Health bar for tough aliens
            if (alien.maxHealth > 1) {
                const barWidth = alien.width;
                const barHeight = 3;
                const barX = alien.x - barWidth / 2;
                const barY = alien.y - alien.height / 2 - 10;

                ctx.fillStyle = '#333';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                ctx.fillStyle = alien.type.color;
                ctx.fillRect(barX, barY, barWidth * (alien.health / alien.maxHealth), barHeight);
            }
        });
    }

    drawTopAlien(ctx, x, y, color, walkFrame) {
        // Insectoid crab alien — compact 32x22
        const cx = x;
        const cy = y;
        const s = 1.3;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;

        // Body
        ctx.fillStyle = color;
        ctx.fillRect(cx - 10 * s, cy - 7 * s, 20 * s, 14 * s);
        ctx.fillRect(cx - 7 * s, cy - 10 * s, 14 * s, 4 * s);
        ctx.fillRect(cx - 13 * s, cy + 7 * s, 26 * s, 4 * s);

        // Legs
        ctx.fillStyle = color;
        if (walkFrame === 0) {
            ctx.fillRect(cx - 17 * s, cy + 3 * s, 6 * s, 8 * s);
            ctx.fillRect(cx + 11 * s, cy + 3 * s, 6 * s, 8 * s);
            ctx.fillRect(cx - 14 * s, cy + 8 * s, 6 * s, 5 * s);
            ctx.fillRect(cx + 8 * s, cy + 8 * s, 6 * s, 5 * s);
        } else {
            ctx.fillRect(cx - 14 * s, cy + 8 * s, 6 * s, 5 * s);
            ctx.fillRect(cx + 8 * s, cy + 8 * s, 6 * s, 5 * s);
            ctx.fillRect(cx - 17 * s, cy + 3 * s, 6 * s, 8 * s);
            ctx.fillRect(cx + 11 * s, cy + 3 * s, 6 * s, 8 * s);
        }

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 6 * s, cy - 4 * s, 4 * s, 4 * s);
        ctx.fillRect(cx + 2 * s, cy - 4 * s, 4 * s, 4 * s);
        ctx.fillStyle = '#111';
        ctx.fillRect(cx - 5 * s, cy - 3 * s, 2 * s, 2 * s);
        ctx.fillRect(cx + 3 * s, cy - 3 * s, 2 * s, 2 * s);

        // Antennae
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 4 * s, cy - 10 * s);
        ctx.lineTo(cx - 7 * s, cy - 14 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 4 * s, cy - 10 * s);
        ctx.lineTo(cx + 7 * s, cy - 14 * s);
        ctx.stroke();
        ctx.fillStyle = '#ff88ff';
        ctx.fillRect(cx - 8 * s, cy - 15 * s, 3 * s, 3 * s);
        ctx.fillRect(cx + 5 * s, cy - 15 * s, 3 * s, 3 * s);

        // Teeth
        ctx.fillStyle = '#ffffff';
        for (let i = -2; i <= 2; i++) {
            ctx.fillRect(cx + i * 3 * s - s, cy + 2 * s, 2 * s, 2 * s);
        }

        ctx.restore();
    }

    drawMiddleAlien(ctx, x, y, color, walkFrame) {
        // Classic humanoid alien — compact 32x22
        const cx = x;
        const cy = y;
        const s = 1.3;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;

        // Head
        ctx.fillStyle = color;
        ctx.fillRect(cx - 10 * s, cy - 14 * s, 20 * s, 14 * s);
        ctx.fillRect(cx - 7 * s, cy - 17 * s, 14 * s, 4 * s);

        // Body
        ctx.fillRect(cx - 7 * s, cy - 2 * s, 14 * s, 12 * s);

        // Arms
        ctx.fillStyle = color;
        if (walkFrame === 0) {
            ctx.fillRect(cx - 14 * s, cy + 1 * s, 7 * s, 6 * s);
            ctx.fillRect(cx + 7 * s, cy - 2 * s, 7 * s, 6 * s);
            ctx.fillRect(cx - 14 * s, cy + 5 * s, 5 * s, 6 * s);
            ctx.fillRect(cx + 9 * s, cy - 7 * s, 5 * s, 6 * s);
        } else {
            ctx.fillRect(cx - 14 * s, cy - 2 * s, 7 * s, 6 * s);
            ctx.fillRect(cx + 7 * s, cy + 1 * s, 7 * s, 6 * s);
            ctx.fillRect(cx - 14 * s, cy + 5 * s, 5 * s, 6 * s);
            ctx.fillRect(cx + 9 * s, cy + 5 * s, 5 * s, 6 * s);
        }

        // Legs
        ctx.fillRect(cx - 5 * s, cy + 10 * s, 5 * s, 7 * s);
        ctx.fillRect(cx + 1 * s, cy + 10 * s, 5 * s, 7 * s);

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 6 * s, cy - 9 * s, 5 * s, 5 * s);
        ctx.fillRect(cx + 1 * s, cy - 9 * s, 5 * s, 5 * s);
        ctx.fillStyle = '#000000';
        const pupilOff = Math.sin(Date.now() / 800) * 2;
        ctx.fillRect(cx - 5 * s + pupilOff, cy - 8 * s, 3 * s, 3 * s);
        ctx.fillRect(cx + 2 * s + pupilOff, cy - 8 * s, 3 * s, 3 * s);

        // Antennae
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 2 * s, cy - 17 * s);
        ctx.lineTo(cx - 5 * s, cy - 21 * s);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 2 * s, cy - 17 * s);
        ctx.lineTo(cx + 5 * s, cy - 21 * s);
        ctx.stroke();
        ctx.fillStyle = '#88ff88';
        ctx.beginPath();
        ctx.arc(cx - 5 * s, cy - 22 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 5 * s, cy - 22 * s, 3 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawBottomAlien(ctx, x, y, color, walkFrame) {
        // Tank alien — compact 32x22
        const cx = x;
        const cy = y;
        const s = 1.3;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;

        // Main body
        ctx.fillStyle = color;
        ctx.fillRect(cx - 14 * s, cy - 4 * s, 28 * s, 10 * s);
        // Turret
        ctx.fillRect(cx - 7 * s, cy - 11 * s, 14 * s, 8 * s);
        ctx.fillRect(cx - 4 * s, cy - 13 * s, 9 * s, 3 * s);

        // Tracks
        ctx.fillStyle = color;
        for (let i = 0; i < 3; i++) {
            const trackY = cy + 6 * s + i * 3 * s;
            ctx.fillRect(cx - 17 * s, trackY, 6 * s, 3 * s);
            ctx.fillRect(cx + 11 * s, trackY, 6 * s, 3 * s);
        }
        ctx.fillStyle = '#2244aa';
        ctx.fillRect(cx - 17 * s, cy + 4 * s, 6 * s, 7 * s);
        ctx.fillRect(cx + 11 * s, cy + 4 * s, 6 * s, 7 * s);

        // Cannon
        ctx.fillStyle = color;
        ctx.fillRect(cx - 2 * s, cy - 3 * s, 5 * s, 14 * s);
        ctx.fillStyle = '#88bbff';
        ctx.fillRect(cx - 3 * s, cy + 11 * s, 7 * s, 3 * s);

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 4 * s, cy - 8 * s, 3 * s, 3 * s);
        ctx.fillRect(cx + 1 * s, cy - 8 * s, 3 * s, 3 * s);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(cx - 3 * s, cy - 7 * s, 2 * s, 2 * s);
        ctx.fillRect(cx + 2 * s, cy - 7 * s, 2 * s, 2 * s);

        // Rivets
        ctx.fillStyle = '#6688cc';
        ctx.fillRect(cx - 11 * s, cy - 2 * s, 2 * s, 2 * s);
        ctx.fillRect(cx + 9 * s, cy - 2 * s, 2 * s, 2 * s);

        ctx.restore();
    }

    renderUFO() {
        if (!this.ufo) return;

        const ctx = this.ctx;
        const x = this.ufo.x;
        const y = this.ufo.y;
        const time = Date.now() / 200;

        // Glow
        ctx.shadowColor = '#ffaa00';
        ctx.shadowBlur = 25;

        // Main saucer body (bottom disc)
        ctx.fillStyle = '#cc8800';
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 30, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Top disc
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.ellipse(x, y, 28, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dome (glass)
        ctx.fillStyle = '#88ddff80';
        ctx.strokeStyle = '#aaffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 14, 14, 0, Math.PI, 0);
        ctx.fill();
        ctx.stroke();

        // Dome highlight
        ctx.fillStyle = '#ffffff40';
        ctx.beginPath();
        ctx.ellipse(x - 4, y - 8, 5, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Ring lights around the saucer
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + time * 0.3;
            const lightX = x + Math.cos(angle) * 26;
            const lightY = y + 4 + Math.sin(angle) * 5;
            const brightness = (Math.sin(time * 2 + i * 0.8) + 1) / 2;
            ctx.fillStyle = `rgba(255, ${Math.floor(150 + brightness * 105)}, 0, ${0.5 + brightness * 0.5})`;
            ctx.beginPath();
            ctx.arc(lightX, lightY, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bottom lights (red)
        for (let i = -1; i <= 1; i++) {
            const lightX = x + i * 12;
            const brightness = (Math.sin(time * 1.5 + i) + 1) / 2;
            ctx.fillStyle = `rgba(255, 50, 50, ${0.3 + brightness * 0.7})`;
            ctx.beginPath();
            ctx.arc(lightX, y + 10, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Exhaust glow underneath
        ctx.fillStyle = `rgba(255, 200, 50, ${0.2 + Math.sin(time) * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(x, y + 14, 8, 4 + Math.sin(time * 2) * 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Points text
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(this.ufo.points + ' PTS', x, y - 30);
    }

    renderBullets() {
        const ctx = this.ctx;
        
        this.bullets.forEach(bullet => {
            ctx.save();
            ctx.shadowColor = bullet.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = bullet.color;
            
            switch (bullet.shape) {
                case 'bolt':
                    // Classic thin bolt — Pistol, Double Fire, Triple Shot
                    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
                    // Trail
                    ctx.fillStyle = bullet.color + '40';
                    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y + bullet.height / 2, bullet.width, bullet.height * 2);
                    break;
                    
                case 'rapid':
                    // Machine Gun: slightly wider with notch
                    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
                    // Small center notch
                    ctx.fillStyle = '#ffffff80';
                    ctx.fillRect(bullet.x - 1, bullet.y - bullet.height / 4, 2, bullet.height / 2);
                    // Trail
                    ctx.fillStyle = bullet.color + '30';
                    ctx.fillRect(bullet.x - bullet.width / 2 + 1, bullet.y + bullet.height / 2, bullet.width - 2, bullet.height);
                    break;
                    
                case 'laser':
                    // Laser Beam: thin glowing line with bright core
                    ctx.shadowBlur = 20;
                    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
                    // Bright white core
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 0;
                    ctx.fillRect(bullet.x - 1, bullet.y - bullet.height / 2, 2, bullet.height);
                    // Long trail
                    ctx.fillStyle = bullet.color + '30';
                    ctx.fillRect(bullet.x - 1, bullet.y + bullet.height / 2, 2, bullet.height * 3);
                    break;
                    
                case 'plasma':
                    // Plasma Cannon: round orb with glow
                    ctx.shadowBlur = 18;
                    ctx.beginPath();
                    ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                    // Inner bright core
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 0;
                    ctx.beginPath();
                    ctx.arc(bullet.x, bullet.y, bullet.width / 4, 0, Math.PI * 2);
                    ctx.fill();
                    // Plasma trail
                    ctx.fillStyle = bullet.color + '25';
                    ctx.beginPath();
                    ctx.arc(bullet.x, bullet.y + bullet.height / 2, bullet.width / 3, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'microwave':
                    // Microwave: wide horizontal burst
                    ctx.shadowBlur = 15;
                    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 4, bullet.width, bullet.height / 2);
                    // Glow trail
                    ctx.fillStyle = bullet.color + '40';
                    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y + bullet.height / 4, bullet.width, bullet.height);
                    break;

                case 'rail':
                    // Railgun: thin bright beam with energy trail
                    ctx.shadowBlur = 25;
                    ctx.shadowColor = '#ffffff';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
                    // Inner glow
                    ctx.fillStyle = '#aaddff';
                    ctx.fillRect(bullet.x - bullet.width / 4, bullet.y - bullet.height / 2, bullet.width / 2, bullet.height);
                    // Energy trail
                    ctx.fillStyle = '#ffffff30';
                    ctx.fillRect(bullet.x - 1, bullet.y + bullet.height / 2, 2, bullet.height * 4);
                    break;

                default:
                    ctx.fillRect(bullet.x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
            }
            
            ctx.restore();
        });
    }

    renderEnemyBullets() {
        const ctx = this.ctx;
        
        this.enemyBullets.forEach(bullet => {
            ctx.shadowColor = bullet.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = bullet.color;
            
            // Zigzag pattern
            const time = Date.now() / 100;
            const x = bullet.x + Math.sin(time + bullet.y * 0.1) * 3;
            
            ctx.fillRect(x - bullet.width / 2, bullet.y - bullet.height / 2, bullet.width, bullet.height);
            ctx.shadowBlur = 0;
        });
    }

    renderShields() {
        const ctx = this.ctx;
        
        this.shields.forEach(shield => {
            shield.pixels.forEach(pixel => {
                const alpha = pixel.health / 4;
                ctx.fillStyle = `rgba(0, 255, 136, ${alpha})`;
                ctx.fillRect(pixel.x, pixel.y, 4, 4);
            });
        });
    }

    renderParticles() {
        const ctx = this.ctx;
        
        this.particles.forEach(p => {
            if (p.isText) {
                ctx.fillStyle = p.color;
                ctx.font = 'bold 16px Courier New';
                ctx.textAlign = 'center';
                ctx.fillText(p.text, p.x, p.y);
            } else {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life / 50;
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                ctx.globalAlpha = 1;
            }
        });
    }

    // ===== CINEMATIC TRANSITIONS =====

    playCinematic(type, duration, callback) {
        if (this.cinematicActive) return;
        
        this.cinematicActive = true;
        this.cinematicType = type;
        this.cinematicDuration = duration;
        this.cinematicTimer = 0;
        this.cinematicCallback = callback;
        this.cinematicPaused = false;

        // Safety backstop: the cinematic timer is normally advanced by the rAF
        // game loop. If that loop ever stalls, the cinematic (and the screen
        // transition in its callback) would never fire, leaving the player
        // stranded on an overlay (e.g. a grey level-intro or the GAME OVER
        // screen). This wall-clock timer guarantees the cinematic always ends.
        clearTimeout(this.cinematicBackstop);
        this.cinematicBackstop = setTimeout(() => {
            if (this.cinematicActive && this.cinematicType === type) {
                this.endCinematic();
            }
        }, duration + 1500);

        switch (type) {
            case 'levelIntro':
                this.playLevelIntro();
                break;
            case 'death':
                this.playDeath();
                break;
            case 'gameOver':
                this.playGameOverCinematic();
                break;
        }
    }

    updateCinematic(deltaTime) {
        if (!this.cinematicActive) return;
        
        // Allow slow-mo to affect cinematic timer
        const timeScale = this.cinematicPaused ? 0.2 : 1;
        this.cinematicTimer += deltaTime * timeScale;
        
        switch (this.cinematicType) {
            case 'levelIntro':
                this.updateLevelIntro();
                break;
            case 'death':
                this.updateDeath();
                break;
            case 'gameOver':
                this.updateGameOverCinematic();
                break;
        }
        
        if (this.cinematicTimer >= this.cinematicDuration) {
            this.endCinematic();
        }
    }

    endCinematic() {
        clearTimeout(this.cinematicBackstop);
        const callback = this.cinematicCallback;
        this.hideAllCinematics();
        this.cinematicActive = false;
        this.cinematicType = null;
        this.cinematicCallback = null;
        this.cinematicPaused = false;
        
        // Remove shake class
        document.getElementById('game-container').classList.remove('shake');
        
        if (callback) {
            callback();
        }
    }

    hideAllCinematics() {
        const levelIntro = document.getElementById('level-intro-overlay');
        const deathOverlay = document.getElementById('death-overlay');
        const gameOverOverlay = document.getElementById('gameover-cinematic-overlay');
        
        [levelIntro, deathOverlay, gameOverOverlay].forEach(el => {
            if (el) el.classList.add('hidden');
        });
    }

    // ===== LEVEL INTRO CINEMATIC =====

    playLevelIntro() {
        const overlay = document.getElementById('level-intro-overlay');
        const textEl = document.getElementById('level-intro-text');
        const subtitleEl = document.querySelector('.level-subtitle');
        const paradeEl = document.getElementById('alien-parade');
        
        overlay.classList.remove('hidden');
        
        // Update text with current level number
        textEl.textContent = `LEVEL ${this.level}`;
        
        // Generate parade aliens
        const alienSymbols = ['👾', '👽', '🛸', '👾', '👽'];
        paradeEl.innerHTML = '';
        alienSymbols.forEach((symbol, i) => {
            const span = document.createElement('span');
            span.className = 'parade-alien';
            span.textContent = symbol;
            span.style.animationDelay = `${i * 0.15}s`;
            paradeEl.appendChild(span);
        });
        
        // Animate parade entry
        setTimeout(() => {
            paradeEl.classList.add('active');
            paradeEl.querySelectorAll('.parade-alien').forEach((el, i) => {
                setTimeout(() => el.classList.add('animate'), i * 150);
            });
        }, 200);
        
        // Animate text zoom
        setTimeout(() => {
            textEl.classList.add('animate');
        }, 400);
        
        // Animate subtitle
        setTimeout(() => {
            subtitleEl.classList.add('animate');
        }, 800);
        
        // Play sound
        audio.playLevelComplete();
    }

    updateLevelIntro() {
        // Nothing to update frame-by-frame
    }

    // ===== DEATH CINEMATIC =====

    playDeath() {
        const overlay = document.getElementById('death-overlay');
        const redFlash = document.getElementById('red-flash');
        const cracksCanvas = document.getElementById('death-cracks-canvas');
        const container = document.getElementById('game-container');
        
        overlay.classList.remove('hidden');
        
        // Red flash
        setTimeout(() => redFlash.classList.add('animate'), 50);
        
        // Screen shake
        container.classList.add('shake');
        
        // Draw cracks on canvas
        const ctx = cracksCanvas.getContext('2d');
        cracksCanvas.width = this.CANVAS_WIDTH;
        cracksCanvas.height = this.CANVAS_HEIGHT;
        
        // Generate random crack lines from center
        this.deathCrackLines = [];
        const numCracks = 12 + Math.floor(Math.random() * 8);
        const centerX = this.CANVAS_WIDTH / 2;
        const centerY = this.CANVAS_HEIGHT / 2;
        
        for (let i = 0; i < numCracks; i++) {
            const angle = (Math.PI * 2 / numCracks) * i + (Math.random() - 0.5) * 0.5;
            const length = 100 + Math.random() * 200;
            const crack = this.generateCrackLine(centerX, centerY, angle, length);
            this.deathCrackLines.push(crack);
        }
        
        // Animate cracks appearing
        setTimeout(() => {
            cracksCanvas.classList.add('animate');
            this.animateCracks(ctx, cracksCanvas);
        }, 100);
        
        // Set slow-mo for the visual particle drift (see updateDeath).
        // NOTE: we intentionally do NOT slow the cinematic timer here — game
        // logic is already frozen while a cinematic is active, and scaling the
        // timer stretched this 2.5s cinematic into ~12.5s of shaking stars
        // before the game-over screen appeared.
        this.slowTimer = 2000; // 2 seconds slow-mo

        // Play death sound
        audio.playPlayerDeath();
    }

    generateCrackLine(startX, startY, angle, length, depth = 0) {
        // Stop recursion if branch is too small or depth is too deep
        if (length < 10 || depth > 3) {
            return [{ x: startX, y: startY }];
        }
        
        const points = [{ x: startX, y: startY }];
        const segments = 6 + Math.floor(Math.random() * 6);
        const segmentLength = length / segments;
        
        let currentX = startX;
        let currentY = startY;
        
        for (let i = 0; i < segments; i++) {
            const deviation = (Math.random() - 0.5) * 0.8;
            const newAngle = angle + deviation;
            currentX += Math.cos(newAngle) * segmentLength;
            currentY += Math.sin(newAngle) * segmentLength;
            points.push({ x: currentX, y: currentY });
            
            // Add branch cracks occasionally (only if depth < max)
            if (depth < 3 && Math.random() < 0.25) {
                const branchAngle = newAngle + (Math.random() > 0.5 ? 0.8 : -0.8);
                const branchLength = segmentLength * 1.2;
                const branchPoints = this.generateCrackLine(currentX, currentY, branchAngle, branchLength, depth + 1);
                this.deathCrackLines.push(branchPoints);
            }
        }
        
        return points;
    }

    animateCracks(ctx, canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw main cracks
        this.deathCrackLines.forEach((crack, crackIndex) => {
            if (crack.length < 2) return;
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + Math.random() * 0.4})`;
            ctx.lineWidth = 2 + Math.random() * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Glow effect
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.moveTo(crack[0].x, crack[0].y);
            
            for (let i = 1; i < crack.length; i++) {
                ctx.lineTo(crack[i].x, crack[i].y);
            }
            ctx.stroke();
            
            ctx.shadowBlur = 0;
        });
    }

    updateDeath() {
        // Slow-mo particles continue during death cinematic
        const timeScale = 0.2;
        this.particles = this.particles.filter(p => {
            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.life--;
            p.vy += 0.05 * timeScale;
            return p.life > 0;
        });
    }

    // ===== GAME OVER CINEMATIC =====

    playGameOverCinematic() {
        const overlay = document.getElementById('gameover-cinematic-overlay');
        const cracksCanvas = document.getElementById('gameover-cracks-canvas');
        const fadeBlack = document.getElementById('fade-black');
        const textEl = document.querySelector('.gameover-cinematic-text');
        
        overlay.classList.remove('hidden');
        
        // Draw cracks
        const ctx = cracksCanvas.getContext('2d');
        cracksCanvas.width = this.CANVAS_WIDTH;
        cracksCanvas.height = this.CANVAS_HEIGHT;
        
        this.gameOverCrackLines = [];
        const numCracks = 15 + Math.floor(Math.random() * 10);
        const centerX = this.CANVAS_WIDTH / 2;
        const centerY = this.CANVAS_HEIGHT / 2;
        
        for (let i = 0; i < numCracks; i++) {
            const angle = (Math.PI * 2 / numCracks) * i + (Math.random() - 0.5) * 0.6;
            const length = 150 + Math.random() * 250;
            const crack = this.generateCrackLine(centerX, centerY, angle, length);
            this.gameOverCrackLines.push(crack);
        }
        
        // Animate sequence
        setTimeout(() => {
            // First, draw cracks
            ctx.clearRect(0, 0, cracksCanvas.width, cracksCanvas.height);
            this.gameOverCrackLines.forEach((crack) => {
                if (crack.length < 2) return;
                ctx.strokeStyle = `rgba(255, 100, 100, ${0.5 + Math.random() * 0.5})`;
                ctx.lineWidth = 2 + Math.random() * 3;
                ctx.lineCap = 'round';
                ctx.shadowColor = '#ff3344';
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.moveTo(crack[0].x, crack[0].y);
                for (let i = 1; i < crack.length; i++) {
                    ctx.lineTo(crack[i].x, crack[i].y);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            });
            cracksCanvas.classList.add('animate');
        }, 300);
        
        // Then show text
        setTimeout(() => {
            textEl.classList.add('animate');
        }, 800);
        
        // Finally fade to black
        setTimeout(() => {
            fadeBlack.classList.add('animate');
        }, 1500);
        
        // Play game over sound
        audio.playGameOver();
    }

    updateGameOverCinematic() {
        // Nothing frame-by-frame, all CSS animations
    }
}

// Initialize game when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const game = new SpaceInvaders();
    window.game = game;
});
