# Space Invaders

A feature-rich, retro-styled **Space Invaders** for the browser. Pure vanilla JavaScript — HTML5 Canvas rendering, procedurally generated Web Audio chiptune music, zero dependencies, zero build step.

**Get the game:** https://github.com/itthestaste/space-invaders

## Quick start

```bash
npm start     # serve the game on http://localhost:8081
# or
npm run dev   # live-reloading dev server on port 8081
```

No install step is needed (the dev servers are fetched via `npx`). You can also just open `index.html` directly in any modern browser.

## How to play

Defend Earth through **20 levels** of invading aliens. Every 5th level is a **boss fight** with its own health bar and rotating bullet patterns.

### Keyboard

| Key | Action |
| --- | --- |
| `←` / `→` or `A` / `D` | Move |
| `Space` | Fire / confirm |
| `1`–`6` | Select weapon |
| `W` / `Q` | Cycle weapons |
| `Esc` | Pause / resume |
| `Enter` | Activate focused menu button |
| `↑` / `↓` / `←` / `→` | Navigate menus |

### Touch (mobile)

On touch devices, on-screen controls appear automatically:

| Button | Action |
| --- | --- |
| `◀` `▶` | Hold to move |
| `FIRE` | Fire |
| Weapon button | Cycle weapons (shows the current weapon) |
| `⏸` | Pause / resume |

All menu buttons are tappable.

## Features

- **20 levels** with scaling difficulty — every 5th level is a boss fight (spread, homing, and ring-burst patterns)
- **6 weapons** unlocked by gameplay score: Pistol → Machine Gun → Microwave (splash) → Laser Beam (piercing) → Plasma Cannon (splash) → Railgun (piercing, armor-piercing)
- **Combo system** — chain kills within 2 s for up to an 8× score multiplier
- **Power-ups** — Double Fire, Shield, Slow Time, Triple Shot, Bomb, Extra Life
- **Classic extras** — destructible shields, mystery UFO, 5-minute level timer, persistent top-10 leaderboard and high score (localStorage)
- **Procedural audio** — every sound effect and the 90s-style chiptune soundtrack (lead, bass, arpeggio, drums) are synthesized with the Web Audio API; the music intensifies as levels rise
- **Cinematics** — level-intro alien parade, slow-motion death sequence with crack effects, game-over sequence, and a victory screen on level 20
- **Frame-rate independent** — the simulation is delta-time normalized, so the game runs at the same speed on 60/120/144 Hz displays
- Parallax starfield with twinkling stars and shooting stars

## Project structure

```
index.html        App shell: all screens, HUD, cinematic overlays
css/style.css     Styling, animations, responsive + touch-control layout
js/game.js        Game engine: loop, entities, weapons, boss, combos, cinematics
js/audio.js       Web Audio sound effects + procedural chiptune music
js/powerups.js    Power-up definitions, dropping, collection, effects
js/leaderboard.js Top-10 score persistence (localStorage)
test/             Node.js test suite (no npm dependencies)
```

## Tests

The core game logic runs under Node using a minimal browser-stub environment — no npm dependencies required (Node 18+):

```bash
npm test
```

Coverage: collision math, combo multipliers, level scaling, weapon unlock progression, run/victory finalization (high-score + leaderboard values), boss-death timeout invalidation, power-up lifecycle, and audio note-table integrity.

## Notes

- Scores persist in `localStorage` under `space_invaders_scores` (top 10) and `space_invaders_high`.
- Weapon unlocks track *gameplay* score, which excludes level-end bonuses.
- Any modern evergreen browser works (Chrome, Edge, Firefox, Safari).

## License

MIT
