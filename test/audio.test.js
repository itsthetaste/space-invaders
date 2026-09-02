'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers');

test('every note referenced by a music pattern is defined in _notes', () => {
    const { audio } = loadGame();
    const patterns = [
        ...audio._melodyPatterns.flat(),
        ...audio._bassPatterns.flat(),
        ...audio._arpPatterns.flat(),
    ].filter((n) => n !== null);
    const missing = patterns.filter((n) => !(n in audio._notes));
    assert.deepEqual(missing, [], `notes used by patterns but missing from _notes: ${missing.join(', ')}`);
});

test('_notes frequencies are positive finite numbers', () => {
    const { audio } = loadGame();
    assert.ok(Object.keys(audio._notes).length >= 18, 'expected a full note table');
    for (const [name, freq] of Object.entries(audio._notes)) {
        assert.ok(Number.isFinite(freq) && freq > 0, `${name}=${freq} is not a valid frequency`);
    }
});

test('audio degrades gracefully without Web Audio and play calls stay safe', () => {
    const { audio } = loadGame();
    assert.equal(audio.initialized, false);
    audio.init(); // no AudioContext in the stub → must disable, not throw
    assert.equal(audio.enabled, false);
    // None of these may throw once audio is disabled
    audio.playShoot();
    audio.playAlienDeath();
    audio.playPlayerDeath();
    audio.playPowerUp();
    audio.playBossDeath();
    audio.startMusic(1);
    audio.stopMusic();
});
