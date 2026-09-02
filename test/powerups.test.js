'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers');

const canvas = () => ({ width: 800, height: 600 });

function makePlayer() {
    return {
        x: 400,
        y: 550,
        width: 40,
        height: 30,
        powerUps: { doubleFire: 0, tripleShot: 0 },
        shieldActive: false,
        shieldTimer: 0,
        lives: 3,
    };
}

function makeGameStub() {
    return {
        slowTimer: 0,
        score: 0,
        powerUpPoints: 0,
        hudUpdates: 0,
        cleared: 0,
        lives: 3,
        addScore(p) { this.score += p; },
        updateHUD() { this.hudUpdates++; },
        clearScreen() { this.cleared++; },
        showFloatingText() {},
    };
}

test('power-up falls and is removed once off-screen', () => {
    const { context } = loadGame();
    const { PowerUp, PowerUpTypes } = context.__classes;
    const pu = new PowerUp(canvas(), PowerUpTypes.DOUBLE_FIRE);
    const start = pu.y;
    assert.equal(pu.update(1), true);
    assert.ok(pu.y > start, 'power-up should fall downward');
    pu.y = canvas().height + 40;
    assert.equal(pu.update(1), false, 'off-screen power-up should be removed');
});

test('containsPoint uses a radius of half the size plus 10px', () => {
    const { context } = loadGame();
    const { PowerUp, PowerUpTypes } = context.__classes;
    const pu = new PowerUp(canvas(), PowerUpTypes.SHIELD);
    pu.x = 100;
    pu.y = 100;
    assert.equal(pu.containsPoint(100, 100), true);
    assert.equal(pu.containsPoint(120, 100), true); // 20px away < 25px radius
    assert.equal(pu.containsPoint(200, 100), false); // 100px away
});

test('manager collects power-ups on player contact', () => {
    const { context } = loadGame();
    const { PowerUpManager, PowerUp, PowerUpTypes } = context.__classes;
    const mgr = new PowerUpManager(canvas());
    const pu = new PowerUp(canvas(), PowerUpTypes.SHIELD);
    pu.x = 100;
    pu.y = 100;
    mgr.activePowerUps.push(pu);
    const collected = mgr.checkPlayerCollision({ x: 105, y: 105 });
    assert.equal(collected.length, 1);
    assert.equal(mgr.activePowerUps.length, 0, 'collected power-up is removed from the field');
});

test('applyPowerUp: double_fire sets its duration and awards points', () => {
    const { context } = loadGame();
    const { PowerUpManager, PowerUp, PowerUpTypes } = context.__classes;
    const mgr = new PowerUpManager(canvas());
    const game = makeGameStub();
    const player = makePlayer();
    mgr.applyPowerUp(new PowerUp(canvas(), PowerUpTypes.DOUBLE_FIRE), player, game);
    assert.equal(player.powerUps.doubleFire, 10000);
    assert.equal(game.score, 250);
    assert.equal(game.powerUpPoints, 250);
    assert.ok(game.hudUpdates > 0);
});

test('applyPowerUp: extra life is capped at 5 and awards points', () => {
    const { context } = loadGame();
    const { PowerUpManager, PowerUp, PowerUpTypes } = context.__classes;
    const mgr = new PowerUpManager(canvas());
    const game = makeGameStub();
    const player = makePlayer();
    game.lives = 4;
    player.lives = 4;
    const pu = new PowerUp(canvas(), PowerUpTypes.EXTRA_LIFE);
    mgr.applyPowerUp(pu, player, game);
    assert.equal(game.lives, 5);
    assert.equal(player.lives, 5);
    assert.equal(game.score, 1000);
    mgr.applyPowerUp(pu, player, game);
    assert.equal(game.lives, 5, 'life cap is 5');
});

test('applyPowerUp: bomb clears the screen and awards points', () => {
    const { context } = loadGame();
    const { PowerUpManager, PowerUp, PowerUpTypes } = context.__classes;
    const mgr = new PowerUpManager(canvas());
    const game = makeGameStub();
    const player = makePlayer();
    mgr.applyPowerUp(new PowerUp(canvas(), PowerUpTypes.BOMB), player, game);
    assert.equal(game.cleared, 1);
    assert.equal(game.score, 500);
});

test('clearExpired decrements durations by real elapsed milliseconds', () => {
    const { context } = loadGame();
    const { PowerUpManager } = context.__classes;
    const mgr = new PowerUpManager(canvas());
    const game = makeGameStub();
    const player = makePlayer();
    player.powerUps.doubleFire = 100;
    player.powerUps.tripleShot = 100;
    player.shieldActive = true;
    player.shieldTimer = 100;
    game.slowTimer = 100;

    mgr.clearExpired(player, game, 40);
    assert.equal(player.powerUps.doubleFire, 60);
    assert.equal(player.powerUps.tripleShot, 60);
    assert.equal(player.shieldTimer, 60);
    assert.equal(player.shieldActive, true);
    assert.equal(game.slowTimer, 60);

    mgr.clearExpired(player, game, 60);
    assert.equal(player.powerUps.doubleFire, 0);
    assert.equal(player.powerUps.tripleShot, 0);
    assert.equal(player.shieldTimer, 0);
    assert.equal(player.shieldActive, false, 'shield expires when its timer runs out');
    assert.equal(game.slowTimer, 0);
});
