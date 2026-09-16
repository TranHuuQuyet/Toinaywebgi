const SAMPLE_PATHS = Object.freeze({
  click: './assets/sounds/case-click.wav',
  unlock: './assets/sounds/case-unlock.wav',
  open: './assets/sounds/case-open.wav',
  tick: './assets/sounds/roulette-tick.wav',
  stop: './assets/sounds/roulette-stop.wav',
  common: './assets/sounds/reveal-common.wav',
  rare: './assets/sounds/reveal-rare.wav',
  epic: './assets/sounds/reveal-epic.wav',
  legendary: './assets/sounds/reveal-legendary.wav',
  mythic: './assets/sounds/reveal-mythic.wav'
});

export class SoundManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.masterGain = null;
    this.buffers = new Map();
    this.loadingPromise = null;
    this.isReady = false;
  }

  getContext() {
    if (!this.context) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.context = new AudioCtx();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.enabled ? 0.82 : 0.0001;
      this.masterGain.connect(this.context.destination);
    }
    return this.context;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!this.masterGain || !this.context) return;
    const now = this.context.currentTime;
    this.masterGain.gain.setTargetAtTime(enabled ? 0.82 : 0.0001, now, 0.015);
    if (enabled && this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
  }

  unlock() {
    const ctx = this.getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    this.preload();
  }

  preload() {
    if (this.loadingPromise) return this.loadingPromise;
    const ctx = this.getContext();
    if (!ctx) return Promise.resolve();

    this.loadingPromise = Promise.all(
      Object.entries(SAMPLE_PATHS).map(async ([name, path]) => {
        if (this.buffers.has(name)) return;
        try {
          const response = await fetch(path);
          if (!response.ok) return;
          const arrayBuf = await response.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(arrayBuf);
          this.buffers.set(name, audioBuf);
        } catch {
          // Graceful fallback if a sample fails
        }
      })
    ).then(() => {
      this.isReady = true;
    }).catch(() => {
      this.isReady = true;
    });

    return this.loadingPromise;
  }

  async ready() {
    this.unlock();
    if (this.loadingPromise) {
      await this.loadingPromise;
    }
  }

  play(name, gain = 1, playbackRate = 1) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return;
    }

    const buffer = this.buffers.get(name);
    if (!buffer) {
      // If not yet loaded, try to load on-demand
      this.preload()?.then(() => {
        const lateBuf = this.buffers.get(name);
        if (lateBuf && this.enabled && ctx.state === 'running') {
          this._playBuffer(ctx, lateBuf, gain, playbackRate);
        }
      });
      return;
    }

    this._playBuffer(ctx, buffer, gain, playbackRate);
  }

  _playBuffer(ctx, buffer, gain, playbackRate) {
    try {
      const source = ctx.createBufferSource();
      const level = ctx.createGain();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;
      level.gain.value = gain;
      source.connect(level).connect(this.masterGain);
      source.start();
    } catch {
      // Audio playback failed silently
    }
  }

  bass(frequency = 46, duration = 0.65, gain = 0.12) {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + duration);
      env.gain.setValueAtTime(gain, now);
      env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(env).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Oscillator failed silently
    }
  }

  hover() { this.play('tick', 0.08, 1.4); }
  press() { this.play('click', 0.85); }
  unlockCase() { this.play('unlock', 0.95); }
  openCase() { this.play('open', 0.95); }
  tick(progress = 0) {
    // Pitch drops slightly as roulette slows down for extra mechanical feel
    const rate = 1.15 - progress * 0.28;
    const vol = 0.38 + progress * 0.22;
    this.play('tick', vol, rate);
  }
  stop() { this.play('stop', 1.0); }

  reveal(rarity) {
    const sample = rarity === 'uncommon' ? 'common' : rarity;
    const volume = {
      common: 0.7,
      uncommon: 0.85,
      rare: 0.95,
      epic: 1.0,
      legendary: 1.05,
      mythic: 1.1
    }[rarity] || 0.8;

    this.play(sample, volume);

    if (rarity === 'rare') {
      this.bass(58, 0.45, 0.08);
    } else if (rarity === 'epic') {
      this.bass(50, 0.65, 0.12);
    } else if (rarity === 'legendary') {
      this.bass(44, 0.9, 0.16);
    } else if (rarity === 'mythic') {
      this.bass(36, 1.2, 0.22);
    }
  }
}
