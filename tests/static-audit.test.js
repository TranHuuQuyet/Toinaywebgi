import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, stat } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

test('required GitHub Pages entry files exist', async () => {
  await Promise.all(['index.html', '404.html', 'README.md'].map((file) => access(file)));
});

test('project source contains no external web addresses', async () => {
  const sourceFiles = [];
  for await (const file of glob(['*.html', 'css/*.css', 'js/*.js'])) sourceFiles.push(file);
  for (const file of sourceFiles) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /https?:\/\//i, `${file} contains an external address`);
  }
});

test('HTML asset and navigation paths are relative for repository subdirectories', async () => {
  for (const file of ['index.html', '404.html']) {
    const html = await readFile(file, 'utf8');
    assert.doesNotMatch(html, /(?:src|href)=["']\/(?!\/)/, `${file} contains a root-relative path`);
  }
});

test('application navigation stays internal and has no external window navigation', async () => {
  const html = await readFile('index.html', 'utf8');
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(hrefs.every((href) => href.startsWith('./') || href.startsWith('#')), true);

  for await (const file of glob('js/*.js')) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /window\.(?:open|location)|location\.(?:assign|replace)/);
  }
});

test('production UI copy avoids the old archive and terminal framing', async () => {
  const source = `${await readFile('index.html', 'utf8')}\n${await readFile('js/app.js', 'utf8')}`;
  assert.doesNotMatch(source, /WEB ARCHIVE|CLASSIFIED CASE|LIVE DECRYPTION|AUTHENTICATING CASE|TARGET ACQUIRED/);
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
