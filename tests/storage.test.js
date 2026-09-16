import test from 'node:test';
import assert from 'node:assert/strict';

test('storage falls back to current-session memory when localStorage is unavailable', async () => {
  globalThis.localStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); }
  };
  const { storage } = await import(`../js/storage.js?test=${Date.now()}`);

  storage.confirmAge();
  storage.setUnlocked(['site-001', 'site-001', 'site-002']);
  storage.setSoundEnabled(false);

  assert.equal(storage.isAgeConfirmed(), true);
  assert.deepEqual(storage.getUnlocked(), ['site-001', 'site-002']);
  assert.equal(storage.isSoundEnabled(), false);

  storage.resetCollection();
  assert.deepEqual(storage.getUnlocked(), []);
  delete globalThis.localStorage;
});
