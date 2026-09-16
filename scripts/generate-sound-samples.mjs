import { mkdir, writeFile } from 'node:fs/promises';

const RATE = 44100;
const output = new URL('../assets/sounds/', import.meta.url);

function random(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296 * 2 - 1;
  };
}

/**
 * Procedural synthesis engine for mechanical & tactile game audio:
 * - hits: metallic impacts with multiple inharmonic resonant modes
 * - scrape: friction/creak from textured lowpass noise
 * - rumble: sub-bass pressure waves (35 - 55 Hz)
 * - clank: instantaneous mechanical transient attack
 * - whoosh: swept aerated air displacement
 * - shimmer: crystalline high-frequency metallic luster
 */
function render({
  duration,
  seed = 42,
  hits = [],
  scrape = 0,
  rumble = 0,
  clank = 0,
  whoosh = 0,
  shimmer = 0
}) {
  const length = Math.ceil(duration * RATE);
  const samples = new Float32Array(length);
  const noise = random(seed);
  let filtered = 0;
  let filtered2 = 0;

  for (let i = 0; i < length; i += 1) {
    const time = i / RATE;
    const rawNoise = noise();
    filtered = filtered * 0.65 + rawNoise * 0.35;
    filtered2 = filtered2 * 0.82 + filtered * 0.18;

    let value = 0;

    // Sub-bass rumble
    if (rumble > 0) {
      const freq = 45 - time * 8;
      value += rumble * Math.sin(time * Math.PI * 2 * Math.max(28, freq)) * Math.exp(-time * 5.2);
    }

    // Metal scrape / friction
    if (scrape > 0) {
      value += scrape * filtered2 * Math.sin(time * Math.PI * 2 * 880) * Math.exp(-time * 3.8);
    }

    // Air whoosh
    if (whoosh > 0) {
      const whooshCenter = Math.min(duration * 0.35, 0.25);
      const dist = Math.abs(time - whooshCenter);
      const envelope = Math.exp(-Math.pow(dist / 0.18, 2));
      const sweepFreq = 600 + 1200 * Math.sin((time / duration) * Math.PI);
      value += whoosh * filtered * Math.sin(time * Math.PI * 2 * sweepFreq) * envelope;
    }

    // Shimmer / high metallic ring
    if (shimmer > 0 && time > 0.04) {
      const shimmerElapsed = time - 0.04;
      const ring = (
        Math.sin(shimmerElapsed * Math.PI * 2 * 3150) * 0.35 +
        Math.sin(shimmerElapsed * Math.PI * 2 * 4680) * 0.3 +
        Math.sin(shimmerElapsed * Math.PI * 2 * 6820) * 0.2 +
        Math.sin(shimmerElapsed * Math.PI * 2 * 8940) * 0.15
      ) * Math.exp(-shimmerElapsed * 4.2);
      value += shimmer * ring;
    }

    // Sharp clank transient
    if (clank > 0 && time < 0.02) {
      value += clank * filtered * (1 - time / 0.02) * 2.8;
    }

    // Resonant metallic impacts
    for (const hit of hits) {
      const elapsed = time - hit.at;
      if (elapsed < 0) continue;
      const decay = Math.exp(-elapsed * hit.decay);

      // Inharmonic metal modes (Chladni/bar resonances: f, 2.76f, 5.4f, 8.9f)
      const metal =
        Math.sin(elapsed * Math.PI * 2 * hit.frequency) +
        0.48 * Math.sin(elapsed * Math.PI * 2 * hit.frequency * 2.756) +
        0.22 * Math.sin(elapsed * Math.PI * 2 * hit.frequency * 4.142) +
        0.14 * Math.sin(elapsed * Math.PI * 2 * hit.frequency * 5.418) +
        0.08 * Math.sin(elapsed * Math.PI * 2 * hit.frequency * 8.914);

      const transient = elapsed < 0.012 ? filtered * (1 - elapsed / 0.012) * 2.4 : 0;
      value += (metal * 0.36 + transient) * decay * hit.gain;
    }

    samples[i] = Math.max(-1, Math.min(1, value));
  }
  return samples;
}

function wav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
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

const sounds = {
  // Case button press: snappy metallic click
  'case-click': {
    duration: 0.15,
    seed: 11,
    clank: 0.65,
    hits: [
      { at: 0, frequency: 580, decay: 52, gain: 0.8 },
      { at: 0.02, frequency: 220, decay: 38, gain: 0.42 }
    ]
  },

  // Lock release: tactile mechanical double clack
  'case-unlock': {
    duration: 0.45,
    seed: 22,
    scrape: 0.16,
    clank: 0.5,
    hits: [
      { at: 0, frequency: 340, decay: 30, gain: 0.72 },
      { at: 0.09, frequency: 460, decay: 28, gain: 0.85 },
      { at: 0.22, frequency: 120, decay: 16, gain: 0.55 }
    ]
  },

  // Heavy lid open: metal hinge creak & internal air displacement
  'case-open': {
    duration: 0.78,
    seed: 33,
    scrape: 0.26,
    rumble: 0.28,
    whoosh: 0.35,
    hits: [
      { at: 0, frequency: 140, decay: 11, gain: 0.52 },
      { at: 0.36, frequency: 85, decay: 8, gain: 0.78 }
    ]
  },

  // Roulette tick: ultra-dry, crisp mechanical teeth tick
  'roulette-tick': {
    duration: 0.055,
    seed: 44,
    clank: 0.85,
    hits: [
      { at: 0, frequency: 1080, decay: 72, gain: 0.7 },
      { at: 0.006, frequency: 360, decay: 62, gain: 0.35 }
    ]
  },

  // Final stop: authoritative heavy CLACK
  'roulette-stop': {
    duration: 0.36,
    seed: 55,
    rumble: 0.22,
    clank: 0.65,
    hits: [
      { at: 0, frequency: 260, decay: 28, gain: 0.95 },
      { at: 0.035, frequency: 115, decay: 16, gain: 0.75 },
      { at: 0.075, frequency: 540, decay: 34, gain: 0.4 }
    ]
  },

  // Common: minimal clean impact
  'reveal-common': {
    duration: 0.26,
    seed: 66,
    clank: 0.4,
    hits: [
      { at: 0, frequency: 220, decay: 18, gain: 0.55 },
      { at: 0.02, frequency: 440, decay: 22, gain: 0.3 }
    ]
  },

  // Rare: blue impact with tonal shimmer
  'reveal-rare': {
    duration: 0.65,
    seed: 77,
    rumble: 0.16,
    shimmer: 0.38,
    whoosh: 0.22,
    hits: [
      { at: 0, frequency: 180, decay: 14, gain: 0.8 },
      { at: 0.12, frequency: 460, decay: 10, gain: 0.48 }
    ]
  },

  // Epic: purple impact with strong whoosh and shimmer tail
  'reveal-epic': {
    duration: 0.9,
    seed: 88,
    rumble: 0.26,
    scrape: 0.08,
    whoosh: 0.5,
    shimmer: 0.55,
    hits: [
      { at: 0, frequency: 130, decay: 10, gain: 0.9 },
      { at: 0.15, frequency: 380, decay: 8, gain: 0.55 },
      { at: 0.32, frequency: 580, decay: 7, gain: 0.38 }
    ]
  },

  // Legendary: cinematic gold impact with deep rumble, wide whoosh & bright metallic tail
  'reveal-legendary': {
    duration: 1.25,
    seed: 99,
    rumble: 0.38,
    whoosh: 0.68,
    shimmer: 0.72,
    scrape: 0.1,
    hits: [
      { at: 0, frequency: 95, decay: 6.5, gain: 1.0 },
      { at: 0.14, frequency: 290, decay: 6.8, gain: 0.62 },
      { at: 0.38, frequency: 620, decay: 5.5, gain: 0.44 },
      { at: 0.6, frequency: 980, decay: 5.0, gain: 0.28 }
    ]
  },

  // Mythic: jackpot-grade shockwave, sub-bass seismic impact & high-frequency tail
  'reveal-mythic': {
    duration: 1.5,
    seed: 111,
    rumble: 0.55,
    whoosh: 0.85,
    shimmer: 0.9,
    scrape: 0.14,
    clank: 0.4,
    hits: [
      { at: 0, frequency: 58, decay: 4.5, gain: 1.0 },
      { at: 0.12, frequency: 155, decay: 5.2, gain: 0.85 },
      { at: 0.32, frequency: 420, decay: 5.0, gain: 0.58 },
      { at: 0.58, frequency: 840, decay: 4.8, gain: 0.38 },
      { at: 0.85, frequency: 1240, decay: 4.5, gain: 0.26 }
    ]
  }
};

await mkdir(output, { recursive: true });
await Promise.all(
  Object.entries(sounds).map(([name, recipe]) =>
    writeFile(new URL(`${name}.wav`, output), wav(render(recipe)))
  )
);
console.log(`Generated ${Object.keys(sounds).length} V2.2 mechanical WAV samples.`);
