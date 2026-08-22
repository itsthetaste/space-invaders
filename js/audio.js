/**
 * Space Invaders - Audio System
 * Uses Web Audio API to generate retro sound effects programmatically
 */
class AudioSystem {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.masterGain = null;
        this.initialized = false;
        
        // Music loop state
        this.musicPlaying = false;
        this.musicPaused = false;
        this.musicNodes = [];
        this.musicGain = null;
        this.droneGain = null;
        this.bassGain = null;
        this.atmosphereGain = null;
        this.bassPulseInterval = null;
        this.currentLevel = 1;
        this.bassBaseFreq = 55; // A1
        this.droneBaseFreq = 36.71; // Low D
        this.atmosphereBaseFreq = 146.83; // D3
        
        // Chiptune note frequencies (A minor pentatonic + extensions across octaves)
        this._notes = {
            'A2': 110, 'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'G3': 196,
            'A3': 220, 'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392,
            'A4': 440, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99,
            'A5': 880
        };
        
        // Chiptune melody patterns (note names or null for rest)
        this._melodyPatterns = [
            ['E4', null, 'G4', 'A4', null, 'A4', 'G4', 'E4'],
            ['E4', 'D4', 'C4', null, 'A3', null, 'A3', 'C4'],
            ['A3', 'C4', 'E4', null, 'G4', 'E4', 'C4', 'A3'],
            ['E4', null, 'E4', null, 'G4', null, 'A4', 'G4'],
        ];
        
        // Chiptune bass patterns (one note per beat, 8 beats)
        this._bassPatterns = [
            ['A2', null, 'A2', null, 'G2', null, 'E2', null],
            ['A2', 'A2', 'C3', 'C3', 'E2', 'E2', 'A2', 'A2'],
            ['G2', null, 'G2', null, 'E2', null, 'E2', null],
            ['A2', 'C3', 'E2', 'G2', 'A2', 'C3', 'E2', 'A2'],
        ];
        
        // Arpeggio patterns (chord tones played rapidly)
        this._arpPatterns = [
            ['A2', 'C3', 'E3'],
            ['C3', 'E3', 'G3'],
            ['E2', 'G2', 'B2'],
            ['G2', 'B2', 'D3'],
        ];
        
        // Drum pattern: 16 steps (16th notes at ~140 BPM)
        this._drumPattern = [
            { kick: true, snare: false, hihat: true },
            { kick: false, snare: false, hihat: false },
            { kick: false, snare: false, hihat: true },
            { kick: false, snare: false, hihat: true },
            { kick: true, snare: false, hihat: true },
            { kick: false, snare: false, hihat: false },
            { kick: false, snare: false, hihat: true },
            { kick: false, snare: true, hihat: true },
            { kick: true, snare: false, hihat: true },
            { kick: false, snare: false, hihat: false },
            { kick: false, snare: false, hihat: true },
            { kick: false, snare: false, hihat: true },
            { kick: true, snare: false, hihat: true },
            { kick: false, snare: false, hihat: false },
            { kick: false, snare: true, hihat: true },
            { kick: false, snare: false, hihat: true },
        ];
    }

    /**
     * Initialize audio context (must be called from user gesture)
     */
    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.audioContext.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }

    /**
     * Resume audio context if suspended
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    /**
     * Generate a laser/shoot sound
     */
    playShoot() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
    }

    /**
     * Generate alien death/explosion sound
     */
    playAlienDeath() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    }

    /**
     * Generate player death/explosion sound
     */
    playPlayerDeath() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        
        // Create noise buffer
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.5);
    }

    /**
     * Generate power-up collection sound
     */
    playPowerUp() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        
        // Ascending tones
        const frequencies = [440, 550, 660, 880];
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const startTime = ctx.currentTime + i * 0.05;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        });
    }

    /**
     * Generate shield hit sound
     */
    playShieldHit() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    }

    /**
     * Generate UFO/flying saucer sound
     */
    playUFO() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sine';
        // Alternating frequency pattern
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(450, now + 0.15);
        osc.frequency.setValueAtTime(400, now + 0.3);
        osc.frequency.setValueAtTime(450, now + 0.45);
        
        gain.gain.setValueAtTime(0.15, now);
        
        osc.start(now);
        osc.stop(now + 0.6);
    }

    /**
     * Generate level complete fanfare
     */
    playLevelComplete() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            const startTime = ctx.currentTime + i * 0.15;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            osc.start(startTime);
            osc.stop(startTime + 0.3);
        });
    }

    /**
     * Generate game over sound
     */
    playGameOver() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const notes = [440, 370, 311, 262]; // Descending
        
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            
            const startTime = ctx.currentTime + i * 0.3;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    /**
     * Generate invader march sound
     */
    playInvaderMarch() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    }

    /**
     * Generate extra life sound
     */
    playExtraLife() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        
        for (let i = 0; i < 5; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.type = 'sine';
            osc.frequency.value = 600 + i * 100;
            
            const startTime = ctx.currentTime + i * 0.08;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
            
            osc.start(startTime);
            osc.stop(startTime + 0.1);
        }
    }

    /**
     * Generate dramatic boss intro sound (low rumble + ascending tension)
     */
    playBossIntro() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // Deep rumble
        const rumble = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumble.connect(rumbleGain);
        rumbleGain.connect(this.masterGain);
        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(40, now);
        rumble.frequency.linearRampToValueAtTime(80, now + 1.5);
        rumbleGain.gain.setValueAtTime(0.4, now);
        rumbleGain.gain.linearRampToValueAtTime(0.1, now + 1.5);
        rumble.start(now);
        rumble.stop(now + 1.5);
        
        // Tension rise
        for (let i = 0; i < 6; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.type = 'square';
            const freq = 200 + i * 100;
            osc.frequency.value = freq;
            const t = now + i * 0.15;
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.2);
        }
    }

    /**
     * Generate boss hit sound (heavier than normal alien death)
     */
    playBossHit() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    }

    /**
     * Generate boss death explosion (long, multi-layered)
     */
    playBossDeath() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        
        // Layer 1: Big rumble
        const rumble = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumble.connect(rumbleGain);
        rumbleGain.connect(this.masterGain);
        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(150, ctx.currentTime);
        rumble.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 1.0);
        rumbleGain.gain.setValueAtTime(0.5, ctx.currentTime);
        rumbleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
        rumble.start(ctx.currentTime);
        rumble.stop(ctx.currentTime + 1.0);
        
        // Layer 2: Noise burst
        const bufferSize = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.6;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.8);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.5, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + 0.8);
        
        // Layer 3: Descending tones
        const freqs = [800, 600, 400, 200];
        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.type = 'square';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.15;
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.25);
        });
    }

    /**
     * Generate spread shot sound (boss firing 3-way)
     */
    playSpreadShot() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.12);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
    }

    /**
     * Generate aimed shot sound (boss firing targeted bullet)
     */
    playAimedShot() {
        if (!this.enabled || !this.initialized) return;
        
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    }

    // ===== PROCEDURAL 90s CHIPTUNE BACKGROUND MUSIC =====

    /**
     * Start the 90s chiptune music loop
     */
    startMusic(level = 1) {
        if (!this.enabled || !this.initialized || this.musicPlaying) return;
        
        this.currentLevel = level;
        this.musicPlaying = true;
        this.musicPaused = false;
        
        const ctx = this.audioContext;
        
        // Master music gain
        this.musicGain = ctx.createGain();
        this.musicGain.gain.value = 0.45;
        this.musicGain.connect(this.masterGain);
        
        // Individual channel gains
        this.leadGain = ctx.createGain();
        this.leadGain.gain.value = 0.2;
        this.leadGain.connect(this.musicGain);
        
        this.bassGain = ctx.createGain();
        this.bassGain.gain.value = 0.22;
        this.bassGain.connect(this.musicGain);
        
        this.arpGain = ctx.createGain();
        this.arpGain.gain.value = 0.12;
        this.arpGain.connect(this.musicGain);
        
        this.drumGain = ctx.createGain();
        this.drumGain.gain.value = 0.3;
        this.drumGain.connect(this.musicGain);
        
        // Start all chiptune layers
        this.startLeadMelody();
        this.startBassLine();
        this.startArpeggiator();
        this.startDrumMachine();
    }

    // ===== LEAD MELODY (square wave, Game Boy style) =====

    startLeadMelody() {
        this._melodyPatternIndex = 0;
        this._melodyBeatIndex = 0;
        this._scheduleNextMelodyNote();
    }

    _scheduleNextMelodyNote() {
        if (!this.musicPlaying || this.musicPaused) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const bpm = 140 + (this.currentLevel - 1) * 3;
        const beatDur = 60 / bpm; // seconds per beat
        const note = this._melodyPatterns[this._melodyPatternIndex][this._melodyBeatIndex];
        
        if (note && this._notes[note]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.type = 'square';
            osc.frequency.value = this._notes[note];
            
            // Classic chiptune filter — bright but not harsh
            filter.type = 'lowpass';
            filter.frequency.value = 2500;
            filter.Q.value = 1.5;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.6, now + 0.01);
            gain.gain.setValueAtTime(0.6, now + beatDur * 0.7);
            gain.gain.linearRampToValueAtTime(0, now + beatDur * 0.9);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.leadGain);
            
            osc.start(now);
            osc.stop(now + beatDur);
        }
        
        // Advance beat
        this._melodyBeatIndex++;
        if (this._melodyBeatIndex >= 8) {
            this._melodyBeatIndex = 0;
            this._melodyPatternIndex = (this._melodyPatternIndex + 1) % this._melodyPatterns.length;
        }
        
        setTimeout(() => {
            this._scheduleNextMelodyNote();
        }, beatDur * 1000);
    }

    // ===== BASS LINE (sawtooth, walking bass) =====

    startBassLine() {
        this._bassPatternIndex = 0;
        this._bassBeatIndex = 0;
        this._scheduleNextBassNote();
    }

    _scheduleNextBassNote() {
        if (!this.musicPlaying || this.musicPaused) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const bpm = 140 + (this.currentLevel - 1) * 3;
        const beatDur = 60 / bpm;
        const note = this._bassPatterns[this._bassPatternIndex][this._bassBeatIndex];
        
        if (note && this._notes[note]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.value = this._notes[note];
            
            filter.type = 'lowpass';
            filter.frequency.value = 600;
            filter.Q.value = 3;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.7, now + 0.01);
            gain.gain.setValueAtTime(0.7, now + beatDur * 0.8);
            gain.gain.linearRampToValueAtTime(0, now + beatDur * 0.95);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.bassGain);
            
            osc.start(now);
            osc.stop(now + beatDur);
        }
        
        this._bassBeatIndex++;
        if (this._bassBeatIndex >= 8) {
            this._bassBeatIndex = 0;
            this._bassPatternIndex = (this._bassPatternIndex + 1) % this._bassPatterns.length;
        }
        
        setTimeout(() => {
            this._scheduleNextBassNote();
        }, beatDur * 1000);
    }

    // ===== ARPEGGIATOR (rapid square wave chord arpeggios) =====

    startArpeggiator() {
        this._arpPatternIndex = 0;
        this._arpNoteIndex = 0;
        this._scheduleNextArpNote();
    }

    _scheduleNextArpNote() {
        if (!this.musicPlaying || this.musicPaused) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const bpm = 140 + (this.currentLevel - 1) * 3;
        // 16th-note arpeggios (4 notes per beat)
        const arpDur = (60 / bpm) / 4;
        const chordTones = this._arpPatterns[this._arpPatternIndex];
        const note = chordTones[this._arpNoteIndex];
        
        if (this._notes[note]) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.value = this._notes[note];
            
            // Short, plucky envelope
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.5, now + 0.003);
            gain.gain.exponentialRampToValueAtTime(0.01, now + arpDur * 0.85);
            
            osc.connect(gain);
            gain.connect(this.arpGain);
            
            osc.start(now);
            osc.stop(now + arpDur);
        }
        
        this._arpNoteIndex++;
        if (this._arpNoteIndex >= chordTones.length) {
            this._arpNoteIndex = 0;
            this._arpPatternIndex = (this._arpPatternIndex + 1) % this._arpPatterns.length;
        }
        
        setTimeout(() => {
            this._scheduleNextArpNote();
        }, arpDur * 1000);
    }

    // ===== DRUM MACHINE (noise-based percussion) =====

    startDrumMachine() {
        this._drumStep = 0;
        this._scheduleNextDrum();
    }

    _scheduleNextDrum() {
        if (!this.musicPlaying || this.musicPaused) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const bpm = 140 + (this.currentLevel - 1) * 3;
        const stepDur = (60 / bpm) / 4; // 16th notes
        const pattern = this._drumPattern[this._drumStep];
        
        // Kick drum
        if (pattern.kick) {
            this._playKick(ctx, now);
        }
        
        // Snare drum
        if (pattern.snare) {
            this._playSnare(ctx, now);
        }
        
        // Hi-hat
        if (pattern.hihat) {
            this._playHiHat(ctx, now, pattern.snare ? 0.04 : 0.08);
        }
        
        this._drumStep++;
        if (this._drumStep >= 16) {
            this._drumStep = 0;
        }
        
        setTimeout(() => {
            this._scheduleNextDrum();
        }, stepDur * 1000);
    }

    _playKick(ctx, now) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
        
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.connect(gain);
        gain.connect(this.drumGain);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }

    _playSnare(ctx, now) {
        // Noise burst for snare body
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.drumGain);
        
        noise.start(now);
        noise.stop(now + 0.12);
        
        // Tone body
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 180;
        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(oscGain);
        oscGain.connect(this.drumGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    _playHiHat(ctx, now, vol = 0.08) {
        const bufferSize = ctx.sampleRate * 0.05;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.drumGain);
        
        noise.start(now);
        noise.stop(now + 0.05);
    }

    /**
     * Intensify music for higher levels (increase BPM)
     */
    intensifyMusic(level) {
        if (!this.musicPlaying || this.musicPaused) return;
        this.currentLevel = level;
    }

    /**
     * Pause the music (soften volume)
     */
    pauseMusic() {
        if (!this.musicPlaying || this.musicPaused) return;
        
        this.musicPaused = true;
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(0.03, now, 0.3);
        }
    }

    /**
     * Resume the music from pause
     */
    resumeMusic() {
        if (!this.musicPlaying || !this.musicPaused) return;
        
        this.musicPaused = false;
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(0.45, now, 0.3);
        }
    }

    /**
     * Stop the music loop completely
     */
    stopMusic() {
        if (!this.musicPlaying) return;
        
        this.musicPlaying = false;
        this.musicPaused = false;
        
        // Stop all music nodes
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        this.musicNodes.forEach(node => {
            try { node.stop(now + 0.1); } catch (e) {}
        });
        
        this.musicNodes = [];
        
        // Disconnect gains
        [this.musicGain, this.leadGain, this.bassGain, this.arpGain, this.drumGain].forEach(gain => {
            if (gain) { try { gain.disconnect(); } catch (e) {} }
        });
        
        this.musicGain = null;
        this.leadGain = null;
        this.bassGain = null;
        this.arpGain = null;
        this.drumGain = null;
    }
}

// Export as singleton
const audio = new AudioSystem();
window.audio = audio;
