export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.ambientBus = null;
    this.muted = false;
    this.started = false;
    this.lastSwing = 0;
    this.musicStep = 0;
    this.musicTimer = 0;
    this.mode = 'city';
  }

  init() {
    if (this.started) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.started = true;
    this.master = ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.14;
    this.musicBus.connect(this.master);

    this.ambientBus = ctx.createGain();
    this.ambientBus.gain.value = 0.1;
    this.ambientBus.connect(this.master);

    this.noise = this.makeNoise(2.5);
    this.startCityAmbience();
    this.startMusic();
  }

  makeNoise(seconds) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.96 + white * 0.04;
      data[i] = last * 3.2;
    }
    return buffer;
  }

  tone({ freq = 220, endFreq = freq, duration = 0.2, type = 'sine', gain = 0.2, bus = this.sfxBus, delay = 0, attack = 0.005 }) {
    if (!this.started) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(bus);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  noiseBurst({ duration = 0.2, gain = 0.2, filter = 1200, filterEnd = 300, type = 'lowpass', bus = this.sfxBus, delay = 0 }) {
    if (!this.started) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.setValueAtTime(filter, now);
    filt.frequency.exponentialRampToValueAtTime(Math.max(40, filterEnd), now + duration);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filt);
    filt.connect(amp);
    amp.connect(bus);
    src.start(now, Math.random() * 1.5);
    src.stop(now + duration + 0.03);
  }

  startCityAmbience() {
    if (!this.started) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 420;
    const trem = ctx.createGain();
    trem.gain.value = 0.42;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain);
    lfoGain.connect(trem.gain);
    src.connect(low);
    low.connect(trem);
    trem.connect(this.ambientBus);
    src.start();
    lfo.start();
    this.ambientSource = src;
    this.ambientFilter = low;
    this.tone({ freq: 58, endFreq: 55, duration: 7, type: 'sine', gain: 0.09, bus: this.ambientBus });
  }

  startMusic() {
    if (!this.started) return;
    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx) return;
      const cityNotes = [110, 130.81, 146.83, 164.81, 196, 164.81, 146.83, 130.81];
      const spaceNotes = [55, 82.41, 110, 146.83, 220, 146.83, 110, 82.41];
      const notes = this.mode === 'city' ? cityNotes : spaceNotes;
      const note = notes[this.musicStep % notes.length];
      this.musicStep++;
      this.tone({ freq: note, endFreq: note, duration: 0.6, type: 'triangle', gain: 0.12, bus: this.musicBus });
      if (this.musicStep % 2 === 0) {
        this.tone({ freq: note * 2, endFreq: note * 2, duration: 0.15, type: 'sine', gain: 0.035, bus: this.musicBus });
      }
      if (this.musicStep % 8 === 0) {
        this.noiseBurst({ duration: 0.6, gain: 0.03, filter: 900, filterEnd: 150, bus: this.musicBus });
      }
    }, 520);
  }

  setMode(mode) {
    this.mode = mode;
    if (this.ambientFilter) {
      const target = mode === 'city' ? 420 : 90;
      this.ambientFilter.frequency.linearRampToValueAtTime(target, this.ctx.currentTime + 2);
    }
  }

  play(name, data = {}) {
    if (!this.started || this.muted) return;
    switch (name) {
      case 'ui':
        this.tone({ freq: 860, endFreq: 630, duration: 0.06, type: 'square', gain: 0.035 });
        break;
      case 'thwip':
        this.noiseBurst({ duration: 0.13, gain: 0.15, filter: 4200, filterEnd: 800, type: 'bandpass' });
        this.tone({ freq: 1100, endFreq: 280, duration: 0.1, type: 'sawtooth', gain: 0.04 });
        break;
      case 'swing':
        this.noiseBurst({ duration: 0.32, gain: 0.1, filter: 1600, filterEnd: 260, type: 'bandpass' });
        this.tone({ freq: 150, endFreq: 90, duration: 0.28, type: 'sine', gain: 0.05 });
        break;
      case 'jump':
        this.tone({ freq: 170, endFreq: 260, duration: 0.12, type: 'triangle', gain: 0.07 });
        this.noiseBurst({ duration: 0.1, gain: 0.05, filter: 2200, filterEnd: 900 });
        break;
      case 'punch':
        this.noiseBurst({ duration: 0.1, gain: 0.3, filter: 900, filterEnd: 90 });
        this.tone({ freq: 95, endFreq: 45, duration: 0.13, type: 'sine', gain: 0.24 });
        break;
      case 'heavy':
        this.noiseBurst({ duration: 0.3, gain: 0.42, filter: 1300, filterEnd: 60 });
        this.tone({ freq: 72, endFreq: 32, duration: 0.4, type: 'sine', gain: 0.34 });
        break;
      case 'blast':
        this.tone({ freq: 1400, endFreq: 320, duration: 0.13, type: 'sawtooth', gain: 0.07 });
        this.noiseBurst({ duration: 0.16, gain: 0.12, filter: 5000, filterEnd: 1200, type: 'bandpass' });
        break;
      case 'hit':
        this.noiseBurst({ duration: 0.08, gain: 0.14, filter: 2400, filterEnd: 400 });
        this.tone({ freq: 330, endFreq: 180, duration: 0.07, type: 'square', gain: 0.03 });
        break;
      case 'hurt':
        this.noiseBurst({ duration: 0.2, gain: 0.28, filter: 550, filterEnd: 80 });
        this.tone({ freq: 130, endFreq: 65, duration: 0.22, type: 'sawtooth', gain: 0.12 });
        break;
      case 'explosion':
        this.noiseBurst({ duration: 0.8, gain: 0.5, filter: 1000, filterEnd: 50 });
        this.tone({ freq: 85, endFreq: 25, duration: 0.9, type: 'sine', gain: 0.42 });
        this.tone({ freq: 160, endFreq: 40, duration: 0.5, type: 'sawtooth', gain: 0.12 });
        break;
      case 'collect':
        [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, endFreq: f, duration: 0.18, type: 'sine', gain: 0.11, delay: i * 0.06 }));
        break;
      case 'quest':
        [392, 523, 659].forEach((f, i) => this.tone({ freq: f, endFreq: f, duration: 0.45, type: 'triangle', gain: 0.1, delay: i * 0.11 }));
        break;
      case 'sense':
        this.tone({ freq: 300, endFreq: 900, duration: 0.35, type: 'sine', gain: 0.09 });
        this.tone({ freq: 301, endFreq: 902, duration: 0.35, type: 'sine', gain: 0.06 });
        break;
      case 'transition':
        this.tone({ freq: 55, endFreq: 440, duration: 1.8, type: 'sawtooth', gain: 0.12 });
        this.tone({ freq: 110, endFreq: 880, duration: 1.6, type: 'sine', gain: 0.1 });
        this.noiseBurst({ duration: 1.8, gain: 0.12, filter: 300, filterEnd: 5000, type: 'bandpass' });
        break;
      case 'god':
        [130.81, 164.81, 196, 261.63, 329.63, 392].forEach((f, i) => this.tone({ freq: f, endFreq: f, duration: 1.5, type: 'sine', gain: 0.12, delay: i * 0.12 }));
        this.tone({ freq: 65, endFreq: 65, duration: 3, type: 'sawtooth', gain: 0.1 });
        break;
      case 'death':
        this.tone({ freq: 220, endFreq: 40, duration: 1.5, type: 'sawtooth', gain: 0.18 });
        this.noiseBurst({ duration: 1.4, gain: 0.2, filter: 800, filterEnd: 50 });
        break;
      case 'boss':
        this.tone({ freq: 55, endFreq: 45, duration: 1.2, type: 'sawtooth', gain: 0.18 });
        this.tone({ freq: 82, endFreq: 55, duration: 1.2, type: 'square', gain: 0.06 });
        break;
      default:
        break;
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.linearRampToValueAtTime(muted ? 0 : 0.55, this.ctx.currentTime + 0.15);
    }
    return muted;
  }

  setIntensity(value) {
    if (this.musicBus) this.musicBus.gain.linearRampToValueAtTime(0.1 + value * 0.1, this.ctx.currentTime + 0.4);
  }
}
