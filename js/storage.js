const keys = Object.freeze({
  age: 'ageConfirmed',
  unlocked: 'unlockedSites',
  sound: 'soundEnabled'
});

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

export const storage = {
  isAgeConfirmed: () => read(keys.age, 'false') === 'true',
  confirmAge() {
    localStorage.setItem(keys.age, 'true');
  },
  resetAge() {
    localStorage.removeItem(keys.age);
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
    localStorage.setItem(keys.unlocked, JSON.stringify([...new Set(ids)]));
  },
  resetCollection() {
    localStorage.removeItem(keys.unlocked);
  },
  isSoundEnabled: () => read(keys.sound, 'true') !== 'false',
  setSoundEnabled(enabled) {
    localStorage.setItem(keys.sound, String(Boolean(enabled)));
  }
};
