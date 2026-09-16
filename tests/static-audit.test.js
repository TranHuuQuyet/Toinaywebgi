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
