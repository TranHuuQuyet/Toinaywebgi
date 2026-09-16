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
    this.loading = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!this.context) return;
    if (enabled) this.unlock();
    this.masterGain.gain.setTargetAtTime(enabled ? 0.78 : 0.0001, this.context.currentTime, 0.018);
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.78;
      this.masterGain.connect(this.context.destination);
      this.loading = Promise.all(Object.entries(SAMPLE_PATHS).map(async ([name, path]) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Sound sample failed: ${name}`);
        this.buffers.set(name, await this.context.decodeAudioData(await response.arrayBuffer()));
      })).catch(() => {});
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }

  play(name, gain = 1, playbackRate = 1) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    const level = this.context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    level.gain.value = gain;
    source.connect(level).connect(this.masterGain);
    source.start();
  }

  bass(frequency = 48, duration = .55, gain = .09) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(32, now + duration);
    envelope.gain.setValueAtTime(gain, now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope).connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  hover() { this.play('tick', .08, 1.45); }
  press() { this.play('click', .72); }
  unlockCase() { this.play('unlock', .92); }
  openCase() { this.play('open', .9); }
  tick(progress = 0) { this.play('tick', .34 + progress * .18, 1.12 - progress * .24); }
  stop() { this.play('stop', 1); }

  reveal(rarity) {
    const sample = rarity === 'uncommon' ? 'common' : rarity;
    this.play(sample, rarity === 'common' ? .62 : .92, rarity === 'uncommon' ? .92 : 1);
    if (rarity === 'legendary') this.bass(52, .7, .08);
    if (rarity === 'mythic') this.bass(42, .9, .12);
  }
}
