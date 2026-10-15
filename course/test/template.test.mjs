import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

test('the learner starts from MAD Stage 1 output only', () => {
  assert.ok(!existsSync(new URL('docs/brief.md', root)), 'docs/brief.md must not ship');
  assert.ok(!existsSync(new URL('docs/ARCHITECTURE.md', root)), '/mad-plan Phase 0 writes the architecture');
  assert.doesNotMatch(read('docs/raw-intent.md'), /<[a-z][^>]*>/i, 'raw-intent.md has an unfilled <placeholder>');
});

test('raw intent states the rules the checks grade', () => {
  const intent = read('docs/raw-intent.md');
  for (const rule of ['contracts/petstore-pets.yaml', 'contracts/testids.md', 'form-error', 'GET /health', '2^53']) {
    assert.ok(intent.includes(rule), rule);
  }
});

test('only stack-neutral project skills ship', () => {
  assert.deepEqual(readdirSync(new URL('.claude/skills/', root)).sort(), ['mad-project-context', 'mad-qa-standards']);
  for (const s of ['mad-project-context', 'mad-qa-standards']) {
    const body = read(`.claude/skills/${s}/SKILL.md`);
    assert.doesNotMatch(body, /localhost:\d+|--profile app|FastAPI|Next\.js/, `${s} names a stack or port`);
  }
});

test('deploy state and Terraform files are never committed', () => {
  const ignore = read('.gitignore').split('\n');
  for (const p of ['.deploy/', '.terraform/', '*.tfstate*']) assert.ok(ignore.includes(p), p);
});
