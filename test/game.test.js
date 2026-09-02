'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers');

function oneAliveAlien(game) {
    return {
        x: 100,
        y: 100,
        width: 35,
        height: 25,
        type: game.getAlienType(0, 1),
        points: 10,
        alive: true,
        health: 1,
        maxHealth: 1,
    };
}

test('rectsOverlap detects overlap, separation, and edge touching', () => {
    const { game } = loadGame();
    assert.equal(game.rectsOverlap(0, 0, 10, 10, 5, 5, 10, 10), true);
    assert.equal(game.rectsOverlap(0, 0, 10, 10, 20, 0, 10, 10), false);
    assert.equal(game.rectsOverlap(0, 0, 10, 10, 10, 0, 10, 10), false, 'edge touching is not overlap');
});

test('getComboMultiplier thresholds', () => {
    const { game } = loadGame();
    const m = (combo) => {
        const prev = game.combo;
        game.combo = combo;
        const r = game.getComboMultiplier();
        game.combo = prev;
        return r;
    };
    assert.equal(m(0), 1);
    assert.equal(m(4), 1);
    assert.equal(m(5), 1.5);
    assert.equal(m(10), 2);
    assert.equal(m(15), 2.5);
    assert.equal(m(20), 3);
    assert.equal(m(25), 4);
    assert.equal(m(30), 5);
    assert.equal(m(40), 6);
    assert.equal(m(50), 8);
});

test('createAliens builds a level-scaled grid with row-banded types', () => {
    const { game } = loadGame();
    game.level = 1;
    game.createAliens();
    assert.equal(game.aliens.length, 5 * 8, 'level 1: 5 rows x 8 cols');

    game.level = 12;
    game.createAliens();
    assert.equal(game.aliens.length, 8 * 11, 'level 12: rows capped at 8, cols at 11');
    assert.equal(game.aliens.find((a) => a.y === 60).type.type, 'top');
});

test('player movement scales with frame time (refresh-rate independent)', () => {
    const { game } = loadGame();
    game.state = 'playing';
    game.createPlayer();
    game.aliens.push(oneAliveAlien(game));

    const x0 = game.player.x;
    game.keys['ArrowLeft'] = true;
    game.update(16.67); // ~1 frame at 60Hz → ~5px
    const moved60 = x0 - game.player.x;
    game.keys['ArrowLeft'] = false;
    game.player.x = x0;

    game.keys['ArrowLeft'] = true;
    game.update(33.34); // ~2 frames → ~10px
    const moved30 = x0 - game.player.x;
    game.keys['ArrowLeft'] = false;

    assert.ok(Math.abs(moved60 - 5) < 0.2, `expected ~5px at 60Hz frame, got ${moved60}`);
    assert.ok(Math.abs(moved30 - 10) < 0.4, `expected ~10px at 30Hz frame, got ${moved30}`);
});

test('weapon unlocks at gameplay score thresholds and auto-equips', () => {
    const { game } = loadGame();
    game.startGame();
    assert.deepEqual(Array.from(game.unlockedWeapons), ['pistol']);
    assert.equal(game.gameplayScore, 0);

    game.addScore(1500);
    game.checkWeaponUnlock();
    assert.ok(game.unlockedWeapons.includes('machineGun'));
    assert.equal(game.currentWeapon, 'machineGun', 'auto-equips the new best weapon');
    assert.ok(!game.unlockedWeapons.includes('microwave'));

    game.addScore(2500); // total 4000
    game.checkWeaponUnlock();
    assert.ok(game.unlockedWeapons.includes('microwave'));
    assert.ok(!game.unlockedWeapons.includes('laserBeam'));
});

test('startGame resets run state (score, weapons, lives, level)', () => {
    const { game } = loadGame();
    game.startGame();
    game.addScore(2000);
    game.checkWeaponUnlock();
    assert.ok(game.unlockedWeapons.length > 1);

    game.startGame(); // new run
    assert.equal(game.score, 0);
    assert.equal(game.gameplayScore, 0);
    assert.deepEqual(Array.from(game.unlockedWeapons), ['pistol']);
    assert.equal(game.currentWeapon, 'pistol');
    assert.equal(game.lives, 3);
    assert.equal(game.level, 1);
});

test('bossDeathToken invalidates on state transitions', () => {
    const { game } = loadGame();
    const t0 = game.bossDeathToken;
    game.startGame();
    const t1 = game.bossDeathToken;
    assert.ok(t1 > t0, 'startGame invalidates pending boss-death callbacks');
    game.gameOver();
    const t2 = game.bossDeathToken;
    assert.ok(t2 > t1, 'gameOver invalidates pending boss-death callbacks');
    game.quitToMenu();
    const t3 = game.bossDeathToken;
    assert.ok(t3 > t2, 'quitToMenu invalidates pending boss-death callbacks');
    game.startGame();
    game.completeLevel();
    const t4 = game.bossDeathToken;
    assert.ok(t4 > t3, 'completeLevel invalidates pending boss-death callbacks');
});

test('finalizeGame locks the score, saves the high score, and sets isNewHigh correctly', () => {
    const { game, context, element } = loadGame();
    const ls = context.localStorage;

    game.highScore = 0;
    game.score = 5000;
    game.finalizeGame();
    assert.equal(game.finalScore, 5000, 'submitScore() must receive the locked-in value');
    assert.equal(game.isNewHigh, true);
    assert.equal(game.highScore, 5000);
    assert.equal(ls.getItem('space_invaders_high'), '5000');
    assert.ok(element('new-high-score').classList.contains('hidden'), 'banner reset to hidden on finalize');

    // Not a new high when below the stored one
    game.score = 3000;
    game.finalizeGame();
    assert.equal(game.isNewHigh, false);
    assert.equal(game.highScore, 5000, 'stored high score is not lowered');
});

test('winGame clamps the level, celebrates, and routes to the end screen', () => {
    const env = loadGame();
    const { game, timers, element, queryElement } = env;
    game.level = 21; // nextLevel() over-incremented past MAX_LEVELS
    game.score = 12345;

    game.winGame();
    assert.equal(game.state, 'gameOver');
    assert.equal(game.level, 20, 'end screen shows the last level played');
    assert.equal(game.finalLevel, 20);
    assert.equal(game.finalScore, 12345);

    const title = queryElement('.game-over-title');
    assert.equal(title.textContent, 'EARTH SAVED!');
    assert.ok(title.classList.contains('victory'));

    assert.equal(game.menuButtons.length, 2, 'end-screen menu buttons are set');
    assert.ok(element('gameover-screen').classList.contains('active'));

    // Name-entry modal appears 500ms later (score qualifies on a fresh board)
    assert.ok(element('score-modal').classList.contains('hidden'));
    timers.advance(500);
    assert.ok(!element('score-modal').classList.contains('hidden'));
    assert.ok(!element('new-high-score').classList.contains('hidden'));
});
