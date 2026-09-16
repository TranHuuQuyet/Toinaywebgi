import { mkdir, writeFile } from 'node:fs/promises';

const RATE = 44100;
const output = new URL('../assets/sounds/', import.meta.url);

// Deterministic pseudo-random noise generator
function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296 * 2 - 1;
  };
}

/**
 * Render a mechanical/metallic sound from synthesis parameters.
 * - hits: metallic resonances with harmonics
 * - scrape: filtered noise simulating metal friction
 * - rumble: low sub-bass oscillation
 * - clank: sharp transient attack
 */
function render({ duration, seed, hits = [], scrape = 0, rumble = 0, clank = 0 }) {
  const length = Math.ceil(duration * RATE);
  const samples = new Float32Array(length);
  const noise = random(seed);
  let filtered = 0;
  let filtered2 = 0;

  for (let i = 0; i < length; i += 1) {
    const time = i / RATE;
    const rawNoise = noise();
    // Two-pole lowpass for warmer noise character
    filtered = filtered * 0.68 + rawNoise * 0.32;
    filtered2 = filtered2 * 0.82 + filtered * 0.18;

    let value = 0;

    // Sub-bass rumble
    if (rumble > 0) {
      value += rumble * Math.sin(time * Math.PI * 2 * 48) * Math.exp(-time * 6);
    }

    // Metal scrape / friction
    if (scrape > 0) {
      value += scrape * filtered2 * Math.sin(time * Math.PI * 2 * 950) * Math.exp(-time * 4.5);
    }

    // Sharp clank transient
    if (clank > 0 && time < 0.025) {
      value += clank * filtered * (1 - time / 0.025) * 2.5;
    }

    // Metal hit resonances with harmonics
    for (const hit of hits) {
      const elapsed = time - hit.at;
      if (elapsed < 0) continue;
      const decay = Math.exp(-elapsed * hit.decay);

      // Fundamental + inharmonic overtones (metal-like)
      const metal =
        Math.sin(elapsed * Math.PI * 2 * hit.frequency) +
        0.45 * Math.sin(elapsed * Math.PI * 2 * hit.frequency * 2.76) +
        0.2 * Math.sin(elapsed * Math.PI * 2 * hit.frequency * 4.17) +
        0.1 * Math.sin(elapsed * Math.PI * 2 * hit.frequency * 5.43);

      // Sharp noise transient at impact point
      const transient = elapsed < 0.015
        ? filtered * (1 - elapsed / 0.015) * 2.2
        : 0;

      value += (metal * 0.38 + transient) * decay * hit.gain;
    }

    samples[i] = Math.max(-1, Math.min(1, value));
  }
  return samples;
}

// Create WAV buffer from float samples
function wav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);   // PCM
  buffer.writeUInt16LE(1, 22);   // mono
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) =>
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2)
  );
  return buffer;
}

/* ===== Sound Recipes =====
 * Designed for mechanical / case-opening game feel.
 * Each sound uses metallic resonance + noise transients.
 */

const sounds = {
  // Short metallic click — button press / case interaction
  'case-click': {
    duration: 0.14,
    seed: 11,
    clank: 0.6,
    hits: [
      { at: 0, frequency: 520, decay: 48, gain: 0.75 },
      { at: 0.025, frequency: 180, decay: 35, gain: 0.4 }
    ]
  },

  // Mechanical lock release — two-stage metal impact
  'case-unlock': {
    duration: 0.48,
    seed: 22,
    scrape: 0.15,
    clank: 0.4,
    hits: [
      { at: 0, frequency: 320, decay: 26, gain: 0.7 },
      { at: 0.12, frequency: 210, decay: 20, gain: 0.85 },
      { at: 0.28, frequency: 105, decay: 14, gain: 0.5 }
    ]
  },

  // Heavy case open — low metal creak + impact
  'case-open': {
    duration: 0.78,
    seed: 33,
    scrape: 0.22,
    rumble: 0.22,
    hits: [
      { at: 0, frequency: 130, decay: 11, gain: 0.5 },
      { at: 0.4, frequency: 82, decay: 9, gain: 0.8 }
    ]
  },

  // Roulette tick — very short, dry, sharp click
  'roulette-tick': {
    duration: 0.06,
    seed: 44,
    clank: 0.8,
    hits: [
      { at: 0, frequency: 900, decay: 65, gain: 0.65 },
      { at: 0.008, frequency: 280, decay: 55, gain: 0.3 }
    ]
  },

  // Roulette stop — final heavy clack
  'roulette-stop': {
    duration: 0.32,
    seed: 55,
    rumble: 0.16,
    clank: 0.5,
    hits: [
      { at: 0, frequency: 240, decay: 26, gain: 0.88 },
      { at: 0.04, frequency: 100, decay: 16, gain: 0.72 }
    ]
  },

  // Reveal common — simple short confirmation
  'reveal-common': {
    duration: 0.25,
    seed: 66,
    hits: [
      { at: 0, frequency: 200, decay: 16, gain: 0.5 }
    ]
  },

  // Reveal rare — blue burst, stronger
  'reveal-rare': {
    duration: 0.58,
    seed: 77,
    rumble: 0.12,
    hits: [
      { at: 0, frequency: 170, decay: 13, gain: 0.75 },
      { at: 0.15, frequency: 420, decay: 10, gain: 0.38 }
    ]
  },

  // Reveal epic — strong impact with resonance
  'reveal-epic': {
    duration: 0.82,
    seed: 88,
    rumble: 0.18,
    scrape: 0.06,
    hits: [
      { at: 0, frequency: 125, decay: 10, gain: 0.85 },
      { at: 0.18, frequency: 340, decay: 8, gain: 0.45 },
      { at: 0.38, frequency: 500, decay: 7, gain: 0.32 }
    ]
  },

  // Reveal legendary — gold sweep, heavy impact
  'reveal-legendary': {
    duration: 1.1,
    seed: 99,
    scrape: 0.1,
    rumble: 0.25,
    hits: [
      { at: 0, frequency: 90, decay: 7, gain: 0.95 },
      { at: 0.16, frequency: 270, decay: 7, gain: 0.55 },
      { at: 0.42, frequency: 540, decay: 6, gain: 0.36 }
    ]
  },

  // Reveal mythic — heavy bass + multi-stage impact (jackpot!)
  'reveal-mythic': {
    duration: 1.3,
    seed: 111,
    scrape: 0.15,
    rumble: 0.35,
    clank: 0.3,
    hits: [
      { at: 0, frequency: 62, decay: 5, gain: 1.0 },
      { at: 0.14, frequency: 140, decay: 6, gain: 0.78 },
      { at: 0.36, frequency: 380, decay: 5.5, gain: 0.5 },
      { at: 0.6, frequency: 720, decay: 5, gain: 0.32 }
    ]
  }
};

await mkdir(output, { recursive: true });
await Promise.all(
  Object.entries(sounds).map(([name, recipe]) =>
    writeFile(new URL(`${name}.wav`, output), wav(render(recipe)))
  )
);
console.log(`Generated ${Object.keys(sounds).length} mechanical WAV samples.`);
