import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, stat } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

test('required GitHub Pages entry files exist', async () => {
  await Promise.all(['index.html', '404.html', 'README.md'].map((file) => access(file)));
});

test('project source contains no outbound adult website addresses', async () => {
  const sourceFiles = [];
  for await (const file of glob(['*.html', 'css/*.css', 'js/*.js'])) sourceFiles.push(file);
  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8');
    const urls = [...source.matchAll(/https?:\/\/[^\s"'`<>]+/gi)].map((m) => m[0]);
    for (const url of urls) {
      // Allowed external targets: official GitHub repository, GitHub API, Cloudflare worker domain
      assert.ok(
        url.startsWith('https://github.com/TranHuuQuyet/Toinaywebgi') ||
        url.startsWith('https://api.github.com/') ||
        url.includes('workers.dev') ||
        url.startsWith('https://tranhuuquyet.github.io'),
        `${file} contains unauthorized external URL: ${url}`
      );
      // Strictly no adult external addresses
      assert.doesNotMatch(url, /\.(?:com|net|org|xxx|tv|me|io|top|fun)\/(?:video|watch|porn|sex|phim)/i);
    }
  }
});

test('HTML asset and navigation paths are relative for repository subdirectories', async () => {
  for (const file of ['index.html', '404.html']) {
    const html = await readFile(file, 'utf8');
    assert.doesNotMatch(html, /(?:src|href)=["']\/(?!\/)/, `${file} contains a root-relative path`);
  }
});

test('application navigation stays internal and has no external window navigation except GitHub repo', async () => {
  const html = await readFile('index.html', 'utf8');
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(
    hrefs.every((href) => href.startsWith('./') || href.startsWith('#') || href === 'https://github.com/TranHuuQuyet/Toinaywebgi'),
    true
  );

  for await (const file of glob('js/*.js')) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /window\.(?:open|location)|location\.(?:assign|replace)/);
  }
});

test('dataset items only contain safe metadata without URLs', async () => {
  const { sites } = await import('../js/data.js');
  for (const site of sites) {
    assert.equal(typeof site.id, 'string');
    assert.equal(typeof site.name, 'string');
    assert.equal(typeof site.rarity, 'string');
    assert.equal(typeof site.logo, 'string');
    assert.equal('url' in site, false);
    assert.equal('domain' in site, false);
    assert.equal('href' in site, false);
  }
});

test('production UI copy avoids the old archive and terminal framing', async () => {
  const source = `${await readFile('index.html', 'utf8')}\n${await readFile('js/app.js', 'utf8')}`;
  assert.doesNotMatch(source, /WEB ARCHIVE|CLASSIFIED CASE|LIVE DECRYPTION|AUTHENTICATING CASE|TARGET ACQUIRED/);
});

test('V2.3 uses a three-screen game shell with no document footer', async () => {
  const html = await readFile('index.html', 'utf8');

  assert.match(html, /class=["'][^"']*game-shell/);
  for (const screen of ['case', 'collection', 'info']) {
    assert.match(html, new RegExp(`data-screen-panel=["']${screen}["']`));
    assert.match(html, new RegExp(`data-screen-target=["']${screen}["']`));
  }
  assert.doesNotMatch(html, /<footer\b/i);
  assert.doesNotMatch(html, /đạp quả nọ ngay/i);
});

test('404 page uses the V2.3 access-denied identity and returns to the game', async () => {
  const html = await readFile('404.html', 'utf8');
  assert.match(html, />\s*404\s*</i);
  assert.match(html, /ACCESS DENIED|NOT AVAILABLE/i);
  assert.match(html, /href=["']\.\/index\.html["']/);
  assert.doesNotMatch(html, /LỌ ÍT THÔI|DM lọ/i);
});

test('V2.3.1 keeps GitHub stars live without making the global counter local', async () => {
  const source = await readFile('js/app.js', 'utf8');

  assert.match(source, /https:\/\/api\.github\.com\/repos\/\$\{GITHUB_REPO\}/);
  assert.match(source, /stargazers_count/);
  assert.match(source, /async function fetchGlobalOpens\(\)[\s\S]*?if \(!API_BASE_URL\)[\s\S]*?textContent = '\.\.\.'/);
  assert.match(source, /async function recordGlobalOpen\(\)[\s\S]*?if \(!API_BASE_URL\) return/);
  assert.doesNotMatch(source, /setItem\([^)]*(?:global|totalOpens|counter)/i);
});

test('V2.3.1 removes internal-facing labels and clearly opens the crate lid', async () => {
  const html = await readFile('index.html', 'utf8');
  const css = await readFile('css/style.css', 'utf8');

  assert.doesNotMatch(html, /SYSTEM \/\/ V2\.3|INVENTORY \/\/ LOCAL|ACCESS CHECK/);
  assert.match(css, /\.case-shell\.is-unlocked \.crate-lid[^}]*rotateX\(-(?:6[5-9]|7\d|8[0-5])deg\)/);
});

test('Legendary and Mythic rewards hide the dialog close control', async () => {
  const css = await readFile('css/style.css', 'utf8');
  assert.match(css, /\.reveal-legendary \.dialog-close[^}]*display:\s*none/);
  assert.match(css, /\.reveal-mythic \.dialog-close[^}]*display:\s*none/);
});

test('debug openings never call the global counter endpoint', async () => {
  const source = await readFile('js/app.js', 'utf8');
  assert.match(source, /const isDebugMode\s*=\s*new URLSearchParams\(location\.search\)\.get\('debug'\) === 'true'/);
  assert.match(source, /if \(!isDebugMode\)\s*{\s*recordGlobalOpen\(\);\s*}/);
});

test('all required mechanical sound samples are stored locally', async () => {
  const names = [
    'case-click', 'case-unlock', 'case-open', 'roulette-tick', 'roulette-stop',
    'reveal-common', 'reveal-rare', 'reveal-epic', 'reveal-legendary', 'reveal-mythic'
  ];
  for (const name of names) {
    const info = await stat(`assets/sounds/${name}.wav`);
    assert.ok(info.size > 100, name);
  }
});
