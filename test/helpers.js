'use strict';

/**
 * Minimal browser-environment stubs so the game's plain-script files can be
 * loaded and exercised under Node's vm module — no source modifications and
 * no npm dependencies.
 *
 * loadGame() returns:
 *   context     the vm context (classes exposed on context.__classes)
 *   game        the SpaceInvaders instance created via DOMContentLoaded
 *   audio       the AudioSystem singleton
 *   leaderboard the Leaderboard singleton
 *   element(id) cached DOM stub for the given element id
 *   timers      fake setTimeout/clearTimeout with timers.advance(ms)
 *   raf         manual requestAnimationFrame driver
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function escapeHtmlText(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function makeCtxStub() {
    const gradient = { addColorStop() {} };
    return new Proxy({}, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return () => gradient;
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        },
    });
}

function makeCanvasStub() {
    const canvas = {
        width: 800,
        height: 600,
        style: {},
        classSet: new Set(),
        classList: {
            add(...c) { c.forEach((x) => canvas.classSet.add(x)); },
            remove(...c) { c.forEach((x) => canvas.classSet.delete(x)); },
            contains(c) { return canvas.classSet.has(c); },
        },
        addEventListener() {},
        getContext() { return makeCtxStub(); },
    };
    return canvas;
}

function makeElement(id) {
    const el = {
        id,
        style: {},
        value: '',
        innerHTML: '',
        children: [],
        classSet: new Set(),
        listeners: {},
        clientWidth: 1200,
        clientHeight: 900,
        classList: {
            add(...c) { c.forEach((x) => el.classSet.add(x)); },
            remove(...c) { c.forEach((x) => el.classSet.delete(x)); },
            contains(c) { return el.classSet.has(c); },
            toggle(c) {
                if (el.classSet.has(c)) el.classSet.delete(c);
                else el.classSet.add(c);
            },
        },
        addEventListener(type, fn) { (el.listeners[type] ||= []).push(fn); },
        removeEventListener() {},
        focus() {},
        click() { (el.listeners['click'] || []).forEach((f) => f({ preventDefault() {} })); },
        appendChild(child) { el.children.push(child); return child; },
        querySelectorAll() { return []; },
        querySelector() { return makeElement('q'); },
        closest() { return null; },
    };
    // Emulate the DOM: assigning textContent reflects into innerHTML (escaped)
    let text = '';
    Object.defineProperty(el, 'textContent', {
        get() { return text; },
        set(v) {
            text = String(v);
            el.innerHTML = escapeHtmlText(text);
        },
        enumerable: true,
    });
    return el;
}

/** Deterministic fake timers: no real async, no dangling handles. */
function makeTimers() {
    let idSeq = 0;
    let time = 0;
    const queue = [];
    return {
        get time() { return time; },
        setTimeout(fn, delay = 0) {
            const id = ++idSeq;
            queue.push({ id, fn, at: time + delay });
            return id;
        },
        clearTimeout(id) {
            const i = queue.findIndex((t) => t.id === id);
            if (i !== -1) queue.splice(i, 1);
        },
        advance(ms) {
            const target = time + ms;
            for (;;) {
                queue.sort((a, b) => a.at - b.at);
                const next = queue.find((t) => t.at <= target);
                if (!next) { time = target; break; }
                time = next.at;
                queue.splice(queue.indexOf(next), 1);
                next.fn();
            }
        },
    };
}

function makeLocalStorage() {
    const store = new Map();
    return {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: (k) => store.delete(k),
    };
}

function loadGame() {
    const timers = makeTimers();
    const elements = new Map();
    const queryCache = new Map();
    const rafState = { cb: null, id: 0 };
    const canvasIds = new Set(['game-canvas', 'death-cracks-canvas', 'gameover-cracks-canvas']);
    const windowListeners = {};
    const documentListeners = {};

    const env = {
        console,
        setTimeout: timers.setTimeout,
        clearTimeout: timers.clearTimeout,
        requestAnimationFrame(cb) { rafState.cb = cb; return ++rafState.id; },
        cancelAnimationFrame() { rafState.cb = null; },
        localStorage: makeLocalStorage(),
        navigator: { maxTouchPoints: 0 },
        window: {
            listeners: windowListeners,
            addEventListener(type, fn) { (windowListeners[type] ||= []).push(fn); },
            AudioContext: undefined,
            webkitAudioContext: undefined,
        },
        document: {
            listeners: documentListeners,
            addEventListener(type, fn) { (documentListeners[type] ||= []).push(fn); },
            getElementById(id) {
                if (!elements.has(id)) {
                    elements.set(id, canvasIds.has(id) ? makeCanvasStub() : makeElement(id));
                }
                return elements.get(id);
            },
            querySelector(sel) {
                if (!queryCache.has(sel)) queryCache.set(sel, makeElement('q:' + sel));
                return queryCache.get(sel);
            },
            querySelectorAll() { return []; },
            createElement(tag) { return makeElement(tag); },
        },
    };

    const context = vm.createContext(env);

    // Load order matches index.html
    const files = ['js/audio.js', 'js/powerups.js', 'js/leaderboard.js', 'js/game.js'];
    for (const file of files) {
        const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
        vm.runInContext(src, context, { filename: file });
    }

    // Top-level class/const bindings are lexical (not on the context object);
    // expose them for direct test access.
    vm.runInContext(
        'globalThis.__classes = { SpaceInvaders, PowerUp, PowerUpManager, PowerUpTypes, Leaderboard, AudioSystem };',
        context
    );

    // Fire DOMContentLoaded the way a browser would → window.game exists.
    (windowListeners['DOMContentLoaded'] || []).forEach((fn) => fn());

    return {
        context,
        game: env.window.game,
        audio: env.window.audio,
        leaderboard: env.window.leaderboard,
        elements,
        queryElement: (sel) => queryCache.get(sel) || queryCache.set(sel, makeElement('q:' + sel)).get(sel),
        element: (id) => env.document.getElementById(id),
        timers,
        raf: {
            fire(t) {
                const cb = rafState.cb;
                rafState.cb = null;
                if (cb) cb(t);
            },
        },
    };
}

module.exports = { loadGame };
