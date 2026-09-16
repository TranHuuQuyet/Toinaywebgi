const keys = Object.freeze({
  age: 'ageConfirmed',
  unlocked: 'unlockedSites',
  sound: 'soundEnabled'
});
const sessionMemory = new Map();

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // Browsers can block storage in private or restricted contexts.
  }
  return sessionMemory.get(key) ?? fallback;
}

function write(key, value) {
  sessionMemory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // Session memory keeps the game playable when persistence is unavailable.
  }
}

function remove(key) {
  sessionMemory.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing else to clear when browser persistence is unavailable.
  }
}

export const storage = {
  isAgeConfirmed: () => read(keys.age, 'false') === 'true',
  confirmAge() {
    write(keys.age, 'true');
  },
  resetAge() {
    remove(keys.age);
  },
  getUnlocked() {
    try {
      const value = JSON.parse(read(keys.unlocked, '[]'));
      return Array.isArray(value) ? [...new Set(value.filter((id) => typeof id === 'string'))] : [];
    } catch {
      return [];
    }
  },
  setUnlocked(ids) {
    write(keys.unlocked, JSON.stringify([...new Set(ids)]));
  },
  resetCollection() {
    remove(keys.unlocked);
  },
  isSoundEnabled: () => read(keys.sound, 'true') !== 'false',
  setSoundEnabled(enabled) {
    write(keys.sound, String(Boolean(enabled)));
  }
};
