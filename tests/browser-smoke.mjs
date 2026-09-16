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
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text);
  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') runtimeErrors.push(message.params.entry.text);
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

await send('Emulation.setDeviceMetricsOverride', {
  width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false
});
await evaluate("localStorage.clear()");
await send('Page.navigate', { url: 'http://127.0.0.1:4173/index.html' });
await waitFor("document.readyState === 'complete'");
await waitFor("document.querySelector('#age-gate') !== null");
assert.equal(await evaluate("document.querySelector('#age-gate').classList.contains('is-dismissed')"), false);
await evaluate("document.querySelector('#confirm-age').click()");
assert.equal(await evaluate("localStorage.getItem('ageConfirmed')"), 'true');
assert.equal(await evaluate("document.querySelector('#age-gate').classList.contains('is-dismissed')"), true);

await evaluate("document.querySelector('#sound-toggle').click()");
assert.equal(await evaluate("localStorage.getItem('soundEnabled')"), 'false');
assert.equal(await evaluate("document.querySelector('#sound-toggle').textContent"), 'SOUND OFF');
await evaluate("document.querySelector('#sound-toggle').click()");
assert.equal(await evaluate("localStorage.getItem('soundEnabled')"), 'true');

await evaluate("document.querySelector('#open-case').click()");
await waitFor("document.querySelector('#result-dialog').open === true", 10000);
assert.equal(await evaluate("JSON.parse(localStorage.getItem('unlockedSites')).length"), 1);
assert.match(await evaluate("document.querySelector('#collection-count').textContent"), /^1 \/ 50$/);
await screenshot('runtime-desktop.png');

await evaluate("document.querySelector('#continue-button').click()");
await send('Emulation.setDeviceMetricsOverride', {
  width: 390, height: 844, deviceScaleFactor: 1, mobile: true
});
await send('Page.reload', { ignoreCache: true });
await waitFor("document.readyState === 'complete'");
await waitFor("document.querySelectorAll('.collection-card').length === 50");
const overflow = await evaluate(`JSON.stringify([...document.querySelectorAll('*')]
  .filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
  .slice(0, 8)
  .map((element) => ({ tag: element.tagName, className: element.className, right: Math.round(element.getBoundingClientRect().right) })))`);
assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true, overflow);
assert.equal(await evaluate("document.querySelector('#age-gate').classList.contains('is-dismissed')"), true);
await screenshot('runtime-mobile.png');

await evaluate(`import('./js/data.js').then(({ sites }) => {
  localStorage.setItem('unlockedSites', JSON.stringify(sites.map(({ id }) => id)));
  location.reload();
})`);
await waitFor("document.querySelector('#open-case')?.disabled === true");
assert.equal(await evaluate("document.querySelector('#open-case span').textContent"), 'COLLECTION COMPLETE');
assert.match(await evaluate("document.querySelector('#case-message').textContent"), /50 \/ 50 UNLOCKED/);

await evaluate("window.confirm = () => true; document.querySelector('#reset-collection').click()");
assert.equal(await evaluate("localStorage.getItem('unlockedSites')"), null);
assert.equal(await evaluate("document.querySelector('#collection-count').textContent"), '0 / 50');

await send('Page.navigate', { url: 'http://127.0.0.1:4173/404.html' });
await waitFor("document.title.includes('404')");
assert.equal(await evaluate("document.querySelector('h1').textContent.trim()"), 'ACCESS DENIED');
assert.deepEqual(runtimeErrors, []);

console.log('Browser smoke test passed: age gate, persistence, case opening, collection, mobile overflow, and 404.');
socket.close();
