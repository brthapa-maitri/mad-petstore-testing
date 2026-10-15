import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../dashboard/server.mjs';

const staticDir = fileURLToPath(new URL('../dashboard/static', import.meta.url));
const run = async cmd => { if (cmd === 'br') throw new Error('no db'); return cmd === 'gh' ? '[]' : ''; };

async function withServer(fn) {
  const server = createServer({ run, readJson: async () => null, staticDir });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.close(); }
}

test('GET /api/state returns 200 even when br fails', () => withServer(async base => {
  const res = await fetch(`${base}/api/state`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.errors.length, 1);
}));

test('GET / serves the dashboard page', () => withServer(async base => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /<title>Petstore course<\/title>/);
}));

test('non-GET is rejected', () => withServer(async base => {
  assert.equal((await fetch(`${base}/api/state`, { method: 'POST' })).status, 405);
}));

test('unknown path is 404', () => withServer(async base => {
  assert.equal((await fetch(`${base}/nope`)).status, 404);
}));

test('handler failure answers 500 and the server keeps serving', async () => {
  const server = createServer({ run, readJson: async () => null, staticDir: '/nonexistent-static-dir' });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base + '/')).status, 500);
    assert.equal((await fetch(`${base}/api/state`)).status, 200);
  } finally { server.close(); }
});
