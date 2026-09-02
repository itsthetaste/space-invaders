'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadGame } = require('./helpers');

test('addScore sorts descending and keeps only the top 10', () => {
    const { leaderboard } = loadGame();
    for (const s of [100, 500, 300, 200, 400, 10, 600, 50, 350, 150, 900]) {
        leaderboard.addScore('p' + s, s, 1);
    }
    const scores = leaderboard.getScores();
    assert.equal(scores.length, 10);
    // Array.from copies into a host-realm array so deepStrictEqual's
    // prototype check passes (game code runs in a separate vm context).
    const vals = Array.from(scores).map((s) => s.score);
    assert.deepEqual(vals, [900, 600, 500, 400, 350, 300, 200, 150, 100, 50]);
    assert.ok(!vals.includes(10), 'lowest score (10) should have been dropped');
});

test('qualifies: always true under 10 entries, then only above the lowest', () => {
    const { leaderboard } = loadGame();
    assert.equal(leaderboard.qualifies(1), true);
    for (const s of [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]) {
        leaderboard.addScore('x', s, 1);
    }
    // Full board: lowest entry is 100
    assert.equal(leaderboard.qualifies(99), false);
    assert.equal(leaderboard.qualifies(100), false, 'tied with the lowest does not qualify');
    assert.equal(leaderboard.qualifies(101), true);
});

test('getTopScore returns the highest score, or 0 when empty', () => {
    const { leaderboard } = loadGame();
    assert.equal(leaderboard.getTopScore(), 0);
    leaderboard.addScore('a', 250, 2);
    leaderboard.addScore('b', 750, 5);
    assert.equal(leaderboard.getTopScore(), 750);
});

test('escapeHtml neutralizes markup (XSS guard)', () => {
    const { leaderboard } = loadGame();
    assert.equal(
        leaderboard.escapeHtml('<img src=x onerror=alert(1)>'),
        '&lt;img src=x onerror=alert(1)&gt;'
    );
});

test('render writes ranked entries to the leaderboard list', () => {
    const { leaderboard, element } = loadGame();
    leaderboard.addScore('Neo', 4200, 3);
    leaderboard.render();
    const html = element('leaderboard-list').innerHTML;
    assert.ok(html.includes('Neo'));
    assert.ok(html.includes('4,200'));
    assert.ok(html.includes('Lvl 3'));
});
