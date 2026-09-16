export class SoundManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.lastTick = 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.context) this.context.suspend();
  }

  unlock() {
    if (!this.enabled) return;
    this.context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }

  tone(frequency, duration = 0.08, type = 'square', gain = 0.035, delay = 0) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  click() {
    this.tone(110, 0.09, 'square', 0.04);
    this.tone(165, 0.06, 'triangle', 0.03, 0.06);
  }

  tick(progress = 0) {
    const now = performance.now();
    const minimumGap = 30 + progress * 55;
    if (now - this.lastTick < minimumGap) return;
    this.lastTick = now;
    this.tone(900 - progress * 360, 0.025, 'square', 0.016);
  }

  reveal(rarity) {
    const patterns = {
      common: [220],
      uncommon: [262, 330],
      rare: [294, 440, 587],
      epic: [196, 392, 523, 784],
      legendary: [147, 294, 440, 880],
      mythic: [98, 196, 392, 784, 1175]
    };
    patterns[rarity].forEach((frequency, index) =>
      this.tone(frequency, 0.22 + index * 0.04, index % 2 ? 'sine' : 'sawtooth', 0.045, index * 0.075));
  }
}
