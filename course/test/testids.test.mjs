import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const documented = new Set([...read('contracts/testids.md').matchAll(/^\| `([a-z-]+)` \|/gm)].map(m => m[1]));
const used = new Set(['prototype/index.html', 'prototype/add.html', 'prototype/app.js']
  .flatMap(f => [...read(f).matchAll(/data-testid="([a-z-]+)"/g)].map(m => m[1])));

test('every testid used in the prototype is documented', () => {
  assert.deepEqual([...used].filter(t => !documented.has(t)), []);
});

test('every documented testid is used in the prototype', () => {
  assert.deepEqual([...documented].filter(t => !used.has(t)), []);
});

test('status filter defaults to available', () => {
  assert.match(read('prototype/index.html'), /<option value="available" selected>/);
});
