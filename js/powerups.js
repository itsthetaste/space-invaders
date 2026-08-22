/**
 * Space Invaders - Power-up System
 */

const PowerUpTypes = {
    DOUBLE_FIRE: { id: 'double_fire', color: '#ff4444', symbol: '🔥', duration: 10000, label: 'DOUBLE FIRE', points: 250 },
    SHIELD: { id: 'shield', color: '#4488ff', symbol: '🛡️', duration: 8000, label: 'SHIELD', points: 300 },
    SLOW_TIME: { id: 'slow_time', color: '#44ff88', symbol: '⏳', duration: 8000, label: 'SLOW TIME', points: 200 },
    TRIPLE_SHOT: { id: 'triple_shot', color: '#ff88ff', symbol: '🔱', duration: 10000, label: 'TRIPLE SHOT', points: 350 },
    BOMB: { id: 'bomb', color: '#ffaa00', symbol: '💣', duration: 0, label: 'CLEAR SCREEN', points: 500 },
    EXTRA_LIFE: { id: 'extra_life', color: '#ff44aa', symbol: '❤️', duration: 0, label: 'EXTRA LIFE', points: 1000 }
};

class PowerUp {
    constructor(canvas, type) {
        this.canvas = canvas;
        this.x = Math.random() * (canvas.width - 40) + 20;
        this.y = -30;
        this.type = type;
        this.width = 30;
        this.height = 30;
        this.speed = 1.5;
        this.collected = false;
        this.pulsePhase = 0;
    }

    update() {
        this.y += this.speed;
        this.pulsePhase += 0.1;
        
        if (this.y > this.canvas.height + 30) {
            return false; // Remove
        }
        return true; // Keep
    }

    draw(ctx) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
        const size = this.width * pulse;
        const offset = (size - this.width) / 2;
        
        // Glow effect
        ctx.shadowColor = this.type.color;
        ctx.shadowBlur = 15;
        
        // Background circle
        ctx.fillStyle = this.type.color + '40';
        ctx.beginPath();
        ctx.arc(this.x, this.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = this.type.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Symbol
        ctx.font = `${size * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.symbol, this.x, this.y);
    }

    containsPoint(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.width / 2 + 10;
    }
}

class PowerUpManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.activePowerUps = [];
        this.spawnTimer = 0;
        this.spawnInterval = 600; // Frames between spawns
        this.spawnChance = 0.002; // Chance per frame
    }

    update(game) {
        // Try to spawn
        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnInterval = 400 + Math.random() * 400;
            
            if (Math.random() < this.spawnChance * 200) {
                this.spawn(game);
            }
        }

        // Update active power-ups
        this.activePowerUps = this.activePowerUps.filter(powerUp => {
            return powerUp.update();
        });
    }

    spawn(game) {
        const types = Object.values(PowerUpTypes);
        const type = types[Math.floor(Math.random() * types.length)];
        const powerUp = new PowerUp(this.canvas, type);
        this.activePowerUps.push(powerUp);
    }

    draw(ctx) {
        this.activePowerUps.forEach(powerUp => {
            powerUp.draw(ctx);
        });
    }

    checkPlayerCollision(player) {
        const collected = [];
        
        this.activePowerUps = this.activePowerUps.filter(powerUp => {
            if (powerUp.containsPoint(player.x, player.y)) {
                collected.push(powerUp);
                return false;
            }
            return true;
        });
        
        return collected;
    }

    applyPowerUp(powerUp, player, game) {
        const type = powerUp.type;
        audio.playPowerUp();

        switch (type.id) {
            case 'double_fire':
                player.powerUps.doubleFire = type.duration;
                break;
            case 'shield':
                player.shieldActive = true;
                player.shieldTimer = type.duration;
                break;
            case 'slow_time':
                game.slowTimer = type.duration;
                break;
            case 'triple_shot':
                player.powerUps.tripleShot = type.duration;
                break;
            case 'bomb':
                game.clearScreen();
                break;
            case 'extra_life':
                game.lives = Math.min(game.lives + 1, 5);
                if (player) player.lives = game.lives;
                game.updateHUD();
                break;
        }

        // Award points for collected power-up
        if (type.points) {
            game.addScore(type.points);
            game.powerUpPoints += type.points;
            game.showFloatingText(powerUp.x, powerUp.y, `+${type.points} PTS`);
            game.updateHUD();
        }
    }

    clearExpired(player, game) {
        if (player.powerUps.doubleFire > 0) {
            player.powerUps.doubleFire -= 16;
            if (player.powerUps.doubleFire <= 0) {
                player.powerUps.doubleFire = 0;
            }
        }
        
        if (player.powerUps.tripleShot > 0) {
            player.powerUps.tripleShot -= 16;
            if (player.powerUps.tripleShot <= 0) {
                player.powerUps.tripleShot = 0;
            }
        }
        
        if (player.shieldActive) {
            player.shieldTimer -= 16;
            if (player.shieldTimer <= 0) {
                player.shieldActive = false;
                player.shieldTimer = 0;
            }
        }
        
        if (game.slowTimer > 0) {
            game.slowTimer -= 16;
            if (game.slowTimer <= 0) {
                game.slowTimer = 0;
            }
        }
    }

    getActiveEffects(player) {
        const effects = [];
        if (player.powerUps.doubleFire > 0) effects.push(PowerUpTypes.DOUBLE_FIRE);
        if (player.powerUps.tripleShot > 0) effects.push(PowerUpTypes.TRIPLE_SHOT);
        if (player.shieldActive) effects.push(PowerUpTypes.SHIELD);
        if (game.slowTimer > 0) effects.push(PowerUpTypes.SLOW_TIME);
        return effects;
    }
}

window.PowerUpManager = PowerUpManager;
window.PowerUpTypes = PowerUpTypes;
