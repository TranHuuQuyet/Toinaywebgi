import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
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
