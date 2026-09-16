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

function render({ duration, seed, hits = [], scrape = 0, rumble = 0 }) {
  const length = Math.ceil(duration * RATE);
  const samples = new Float32Array(length);
  const noise = random(seed);
  let filtered = 0;

  for (let i = 0; i < length; i += 1) {
    const time = i / RATE;
    filtered = filtered * 0.72 + noise() * 0.28;
    let value = rumble * Math.sin(time * Math.PI * 2 * 54) * Math.exp(-time * 7);
    value += scrape * filtered * Math.sin(time * Math.PI * 2 * 1100) * Math.exp(-time * 5);
    for (const hit of hits) {
      const elapsed = time - hit.at;
      if (elapsed < 0) continue;
      const decay = Math.exp(-elapsed * hit.decay);
      const metal = Math.sin(elapsed * Math.PI * 2 * hit.frequency)
        + 0.42 * Math.sin(elapsed * Math.PI * 2 * hit.frequency * 2.73);
      const transient = elapsed < 0.018 ? filtered * (1 - elapsed / 0.018) * 1.8 : 0;
      value += (metal * 0.42 + transient) * decay * hit.gain;
    }
    samples[i] = Math.max(-1, Math.min(1, value));
  }
  return samples;
}

function wav(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(RATE, 24); buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => buffer.writeInt16LE(Math.round(sample * 32767), 44 + index * 2));
  return buffer;
}

const sounds = {
  'case-click': { duration: .16, seed: 11, hits: [{ at: 0, frequency: 460, decay: 42, gain: .7 }, { at: .035, frequency: 170, decay: 32, gain: .45 }] },
  'case-unlock': { duration: .52, seed: 22, scrape: .12, hits: [{ at: 0, frequency: 280, decay: 24, gain: .65 }, { at: .14, frequency: 190, decay: 18, gain: .8 }, { at: .3, frequency: 94, decay: 12, gain: .55 }] },
  'case-open': { duration: .82, seed: 33, scrape: .2, rumble: .2, hits: [{ at: 0, frequency: 120, decay: 10, gain: .45 }, { at: .48, frequency: 76, decay: 9, gain: .75 }] },
  'roulette-tick': { duration: .075, seed: 44, hits: [{ at: 0, frequency: 820, decay: 58, gain: .6 }, { at: .012, frequency: 240, decay: 48, gain: .32 }] },
  'roulette-stop': { duration: .34, seed: 55, rumble: .14, hits: [{ at: 0, frequency: 210, decay: 24, gain: .82 }, { at: .055, frequency: 92, decay: 14, gain: .7 }] },
  'reveal-common': { duration: .3, seed: 66, hits: [{ at: 0, frequency: 180, decay: 15, gain: .45 }] },
  'reveal-rare': { duration: .62, seed: 77, rumble: .1, hits: [{ at: 0, frequency: 155, decay: 12, gain: .7 }, { at: .18, frequency: 390, decay: 9, gain: .35 }] },
  'reveal-epic': { duration: .86, seed: 88, rumble: .16, hits: [{ at: 0, frequency: 115, decay: 9, gain: .8 }, { at: .2, frequency: 310, decay: 7, gain: .42 }, { at: .4, frequency: 470, decay: 6, gain: .3 }] },
  'reveal-legendary': { duration: 1.15, seed: 99, scrape: .08, rumble: .22, hits: [{ at: 0, frequency: 82, decay: 7, gain: .9 }, { at: .18, frequency: 245, decay: 6, gain: .5 }, { at: .46, frequency: 510, decay: 5, gain: .34 }] },
  'reveal-mythic': { duration: 1.35, seed: 111, scrape: .13, rumble: .3, hits: [{ at: 0, frequency: 58, decay: 5, gain: 1 }, { at: .16, frequency: 130, decay: 6, gain: .72 }, { at: .4, frequency: 360, decay: 5, gain: .48 }, { at: .66, frequency: 690, decay: 5, gain: .3 }] }
};

await mkdir(output, { recursive: true });
await Promise.all(Object.entries(sounds).map(([name, recipe]) =>
  writeFile(new URL(`${name}.wav`, output), wav(render(recipe)))));
console.log(`Generated ${Object.keys(sounds).length} original mechanical WAV samples.`);
