export class SoundManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
    this.masterGain = null;
    this.lastTick = 0;
    this.noiseBuffer = null;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!this.context) return;
    if (enabled) this.unlock();
    this.masterGain.gain.setTargetAtTime(enabled ? 0.72 : 0.0001, this.context.currentTime, 0.018);
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.72;
      this.masterGain.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }

  tone(frequency, duration = 0.08, type = 'square', gain = 0.035, delay = 0, endFrequency = frequency) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.006);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope).connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  noise(duration = 0.08, gain = 0.025, delay = 0, frequency = 900) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    if (!this.noiseBuffer) {
      this.noiseBuffer = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
      const channel = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;
    }
    const start = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 1.4;
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(envelope).connect(this.masterGain);
    source.start(start);
    source.stop(start + duration);
  }

  hover() { this.tone(720, 0.025, 'sine', 0.008, 0, 860); }
  press() { this.tone(115, 0.075, 'square', 0.04, 0, 78); this.noise(0.045, 0.018, 0.01, 1250); }
  mechanicalClick(delay = 0) { this.noise(0.055, 0.04, delay, 720); this.tone(145, 0.065, 'triangle', 0.035, delay, 82); }
  unlockCase() { this.mechanicalClick(0); this.mechanicalClick(0.13); this.tone(86, 0.34, 'sawtooth', 0.028, 0.2, 43); }
  openCase() { this.noise(0.24, 0.035, 0, 420); this.tone(72, 0.42, 'triangle', 0.045, 0, 38); this.tone(520, 0.16, 'sine', 0.02, 0.09, 940); }

  tick(progress = 0) {
    const now = performance.now();
    const minimumGap = 24 + progress * 70;
    if (now - this.lastTick < minimumGap) return;
    this.lastTick = now;
    this.tone(1050 - progress * 510, 0.023 + progress * 0.018, 'square', 0.013 + progress * 0.006);
    if (progress > 0.78) this.tone(120, 0.035, 'triangle', 0.008);
  }

  reveal(rarity) {
    const patterns = {
      common: [220], uncommon: [262, 330], rare: [294, 440, 587],
      epic: [196, 392, 523, 784], legendary: [147, 294, 440, 880],
      mythic: [72, 98, 196, 392, 784, 1175]
    };
    if (rarity === 'legendary' || rarity === 'mythic') {
      this.noise(rarity === 'mythic' ? 0.8 : 0.46, 0.035, 0, rarity === 'mythic' ? 180 : 1500);
      this.tone(rarity === 'mythic' ? 48 : 74, 0.72, 'sine', 0.065, 0, 34);
    }
    patterns[rarity].forEach((frequency, index) =>
      this.tone(frequency, 0.22 + index * 0.05, index % 2 ? 'sine' : 'triangle', 0.04, index * 0.075, frequency * 1.08));
  }
}
