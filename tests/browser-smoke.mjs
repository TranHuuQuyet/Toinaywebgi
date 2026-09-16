import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const targets = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const target = targets.find(({ type, url }) => type === 'page' && url.includes('127.0.0.1:4173'));
assert.ok(target, 'Local site target is not open in Chrome');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const runtimeErrors = [];
let mockedGlobalOpens = 42;
let mockPostCount = 0;
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
  if (message.method === 'Fetch.requestPaused') {
    const { url, method } = message.params.request;
    const isWorker = url.startsWith('https://toinaywebgi-counter.toinaywebgi.workers.dev/');
    if (isWorker && method === 'POST' && url.endsWith('/open-case')) {
      mockedGlobalOpens += 1;
      mockPostCount += 1;
    }
    const body = !isWorker ? { stargazers_count: 123 }
      : url.endsWith('/github-stars') ? { stars: 123 }
        : { totalOpens: mockedGlobalOpens };
    const payload = Buffer.from(JSON.stringify(body), 'utf8').toString('base64');
    void send('Fetch.fulfillRequest', {
      requestId: message.params.requestId,
      responseCode: method === 'OPTIONS' ? 204 : 200,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: 'http://127.0.0.1:4173' },
        { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
        { name: 'Access-Control-Allow-Headers', value: 'Content-Type' }
      ],
      ...(method === 'OPTIONS' ? {} : { body: payload })
    }).catch((error) => runtimeErrors.push(error.message));
  }
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    if (!message.params.entry.text.includes('ERR_CACHE_READ_FAILURE')) {
      runtimeErrors.push(message.params.entry.text);
    }
  }
});

function send(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(expression, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function screenshot(path) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path, Buffer.from(data, 'base64'));
}

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Fetch.enable', {
  patterns: [
    { urlPattern: 'https://api.github.com/repos/TranHuuQuyet/Toinaywebgi', requestStage: 'Request' },
    { urlPattern: 'https://toinaywebgi-counter.toinaywebgi.workers.dev/*', requestStage: 'Request' }
  ]
});
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }]
});

await send('Emulation.setDeviceMetricsOverride', {
  width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
});
await evaluate("localStorage.clear()");
await send('Page.navigate', { url: 'http://127.0.0.1:4173/index.html' });
await waitFor("document.readyState === 'complete'");
await waitFor("document.querySelector('#age-gate') !== null");
await waitFor("document.querySelector('#github-stars').textContent === '★ 123'");
assert.equal(await evaluate("document.querySelector('#age-gate').classList.contains('is-dismissed')"), false);
await evaluate("document.querySelector('#confirm-age').click()");
assert.equal(await evaluate("localStorage.getItem('ageConfirmed')"), 'true');
assert.equal(await evaluate("document.querySelector('#age-gate').classList.contains('is-dismissed')"), true);
await waitFor("getComputedStyle(document.querySelector('#age-gate')).visibility === 'hidden'");

// The shell boots into CASE and keeps inactive screens non-interactive.
assert.equal(await evaluate("document.querySelector('#game-shell').dataset.activeScreen"), 'case');
assert.equal(await evaluate("document.querySelector('[data-screen-panel=case]').getAttribute('aria-hidden')"), 'false');
assert.equal(await evaluate("document.querySelector('[data-screen-panel=collection]').inert"), true);
await evaluate("document.querySelector('[data-screen-target=collection]').click()");
assert.equal(await evaluate("document.querySelector('#game-shell').dataset.activeScreen"), 'collection');
assert.equal(await evaluate("document.querySelector('[data-screen-panel=case]').inert"), true);
assert.equal(await evaluate("document.querySelector('[data-screen-panel=collection]').inert"), false);
await new Promise((resolve) => setTimeout(resolve, 260));
await screenshot('runtime-collection-desktop.png');
await evaluate("document.querySelector('[data-screen-target=info]').click()");
assert.equal(await evaluate("document.querySelector('#game-shell').dataset.activeScreen"), 'info');
await new Promise((resolve) => setTimeout(resolve, 260));
await screenshot('runtime-info-desktop.png');
await evaluate("document.querySelector('[data-screen-target=case]').click()");
await evaluate("document.querySelector('[data-screen-target=case]').focus()");
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight' });
await waitFor("document.querySelector('#game-shell').dataset.activeScreen === 'collection'");
assert.equal(await evaluate("document.activeElement.dataset.screenTarget"), 'collection');
await evaluate("document.querySelector('[data-screen-target=case]').click()");

await evaluate("document.querySelector('#sound-toggle').click()");
assert.equal(await evaluate("localStorage.getItem('soundEnabled')"), 'false');
assert.equal(await evaluate("document.querySelector('#sound-toggle').textContent"), 'SOUND OFF');
await evaluate("document.querySelector('#sound-toggle').click()");
assert.equal(await evaluate("localStorage.getItem('soundEnabled')"), 'true');
await evaluate("document.querySelector('#sound-toggle').click()");

const rarityCases = [
  { random: 0, rarity: 'common', heading: 'NEW DISCOVERY' },
  { random: 0.8, rarity: 'rare', heading: 'NEW DISCOVERY' },
  { random: 0.9, rarity: 'epic', heading: 'EPIC DISCOVERY' },
  { random: 0.96, rarity: 'legendary', heading: 'LEGENDARY DISCOVERY' },
  { random: 0.995, rarity: 'mythic', heading: 'MYTHIC DISCOVERY' }
];
for (const [entryIndex, entry] of rarityCases.entries()) {
  await evaluate(`Math.random = () => ${entry.random}; document.querySelector('#open-case').click()`);
  if (entryIndex === 0) {
    await waitFor("document.querySelector('#case-shell').classList.contains('is-unlocked')");
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(await evaluate("document.querySelector('#case-shell').hidden"), false);
    const openLightOpacity = await evaluate("Number.parseFloat(getComputedStyle(document.querySelector('.crate-light')).opacity)");
    assert.ok(openLightOpacity >= 0.65, `open crate light opacity: ${openLightOpacity}`);
    await screenshot('runtime-case-open.png');
    await waitFor("document.querySelector('#roulette-wrap').classList.contains('is-visible')");
    await screenshot('runtime-roulette.png');
  }
  await waitFor("document.querySelector('#result-dialog').open === true", 9000);
  assert.equal(await evaluate(`document.querySelector('#result-panel').classList.contains('rarity-${entry.rarity}')`), true);
  assert.equal(await evaluate("document.querySelector('#result-kicker').textContent"), entry.heading);
  assert.equal(await evaluate(`(() => { const card = document.querySelector('.roulette-card.is-winner').getBoundingClientRect(); const viewport = document.querySelector('#roulette-viewport').getBoundingClientRect(); const marker = viewport.left + viewport.width / 2; return marker > card.left && marker < card.right; })()`), true);
  if (entry.rarity === 'common') await screenshot('runtime-common.png');
  if (['epic', 'legendary', 'mythic'].includes(entry.rarity)) {
    assert.equal(await evaluate("document.querySelector('#continue-button').disabled"), true);
    await screenshot(`runtime-${entry.rarity}.png`);
  }
  if (['legendary', 'mythic'].includes(entry.rarity)) {
    assert.equal(await evaluate("getComputedStyle(document.querySelector('#close-result')).display"), 'none');
    assert.equal(await evaluate("document.activeElement.id"), 'result-panel');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(await evaluate("document.querySelector('#result-dialog').open"), true);
  }
  await waitFor("document.querySelector('#continue-button').disabled === false");
  await evaluate("document.querySelector('#continue-button').click()");
}

// Exercise ten complete roulette runs and verify every landing remains exact.
for (let index = 0; index < 5; index += 1) {
  await evaluate(`Math.random = () => ${(index + 1) / 10}; document.querySelector('#open-case').click()`);
  await waitFor("document.querySelector('#result-dialog').open === true", 9000);
  assert.equal(await evaluate(`(() => { const card = document.querySelector('.roulette-card.is-winner').getBoundingClientRect(); const viewport = document.querySelector('#roulette-viewport').getBoundingClientRect(); const marker = viewport.left + viewport.width / 2; return marker > card.left + card.width * .2 && marker < card.right - card.width * .2; })()`), true);
  await waitFor("document.querySelector('#continue-button').disabled === false");
  await evaluate("document.querySelector('#continue-button').click()");
}
assert.equal(await evaluate("JSON.parse(localStorage.getItem('unlockedSites')).length"), 10);
assert.equal(mockPostCount, 10);
assert.match(await evaluate("document.querySelector('#collection-count').textContent"), /^10 \/ 50$/);
assert.equal(await evaluate("[...document.images].every((image) => image.complete && image.naturalWidth > 0)"), true);
await evaluate(`(() => { const image = document.querySelector('.collection-card.is-unlocked .brand-mark img'); image.dispatchEvent(new Event('error')); })()`);
await waitFor("document.querySelector('.collection-card.is-unlocked .brand-mark').classList.contains('is-fallback')");
await screenshot('runtime-desktop.png');

await send('Emulation.setDeviceMetricsOverride', {
  width: 1366, height: 768, deviceScaleFactor: 1, mobile: false
});
await send('Page.reload', { ignoreCache: true });
await waitFor("document.readyState !== 'loading'");
assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true);
await screenshot('runtime-laptop.png');

for (const width of [360, 390, 430]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width, height: 844, deviceScaleFactor: 1, mobile: true
  });
  await send('Page.reload', { ignoreCache: true });
  await waitFor("document.readyState !== 'loading'");
  await waitFor("document.querySelectorAll('.collection-card').length === 50");
  const overflow = await evaluate(`JSON.stringify([...document.querySelectorAll('*')]
    .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
    .slice(0, 8)
    .map((element) => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right) })))`);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true, `${width}px: ${overflow}`);
  assert.equal(await evaluate("document.querySelector('#age-gate').classList.contains('is-dismissed')"), true);
  await evaluate("document.querySelector('[data-screen-target=collection]').click()");
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.collection-grid')).gridTemplateColumns.split(' ').length"), width <= 480 ? 3 : 5);
  assert.equal(await evaluate("document.querySelector('.game-nav').getBoundingClientRect().bottom <= innerHeight + 1"), true);
  if (width === 390) await screenshot('runtime-mobile-390.png');
  await evaluate("document.querySelector('[data-screen-target=case]').click()");
}
await screenshot('runtime-mobile.png');

await evaluate(`import('./js/data.js').then(({ sites }) => {
  localStorage.setItem('unlockedSites', JSON.stringify(sites.map(({ id }) => id)));
  location.reload();
})`);
await waitFor("document.querySelector('#open-case')?.disabled === true");
assert.equal(await evaluate("document.querySelector('#open-case span').textContent"), 'COLLECTION COMPLETE');
assert.match(await evaluate("document.querySelector('#case-message').textContent"), /COLLECTION COMPLETE 50 \/ 50/);

await evaluate("window.confirm = () => true; document.querySelector('#reset-collection').click()");
assert.equal(await evaluate("localStorage.getItem('unlockedSites')"), null);
assert.equal(await evaluate("document.querySelector('#collection-count').textContent"), '0 / 50');

// Check GitHub badge & global counter
assert.equal(await evaluate("document.querySelector('#github-link').getAttribute('href')"), 'https://github.com/TranHuuQuyet/Toinaywebgi');
assert.equal(await evaluate("document.querySelector('#github-link').getAttribute('target')"), '_blank');
assert.equal(await evaluate("document.querySelector('#global-counter-val').textContent"), '52');
assert.ok(await evaluate("document.querySelector('#global-counter').textContent.includes('Lượt khai mở:')"));
assert.ok(await evaluate("document.querySelector('#reveal-canvas') !== null"));

// Check debug mode and force rarity
await send('Page.navigate', { url: 'http://127.0.0.1:4173/index.html?debug=true' });
await waitFor("document.querySelector('.debug-panel') !== null");
assert.equal(await evaluate("document.querySelector('.debug-panel') !== null"), true);

// Test the three elevated reveal tiers through their dedicated debug controls.
for (const entry of [
  { child: 5, rarity: 'epic' },
  { child: 6, rarity: 'legendary' },
  { child: 7, rarity: 'mythic' }
]) {
  await evaluate(`document.querySelector('.debug-panel button:nth-child(${entry.child})').click()`);
  await waitFor("document.querySelector('#result-dialog').open === true", 10000);
  assert.equal(await evaluate(`document.querySelector('#result-panel').classList.contains('rarity-${entry.rarity}')`), true);
  await waitFor("document.querySelector('#continue-button').disabled === false");
  await evaluate("document.querySelector('#continue-button').click()");
}

await send('Page.navigate', { url: 'http://127.0.0.1:4173/404.html' });
await waitFor("document.querySelector('#error-heading') !== null");
assert.equal(await evaluate("document.querySelector('h1').textContent.trim()"), 'ACCESS DENIED');
await screenshot('runtime-404.png');
assert.deepEqual(runtimeErrors, []);

console.log('Browser smoke test passed: shell navigation, age gate, rarity reveals, exact landing, persistence, responsive inventory, and 404.');
socket.close();
