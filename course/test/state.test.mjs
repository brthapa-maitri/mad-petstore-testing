import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildState } from '../dashboard/state.mjs';

const fakeRun = outputs => async (cmd) => {
  const out = outputs[cmd];
  if (out instanceof Error) throw out;
  return out ?? '';
};
const noJson = async () => null;

test('no tags yet: stage null, plan view, empty board', async () => {
  const s = await buildState({ run: fakeRun({ br: '{"issues":[]}', gh: '[]' }), readJson: noJson });
  assert.equal(s.stage, null);
  assert.equal(s.view, 'plan');
  assert.deepEqual(s.beads, { ready: [], in_progress: [], closed: [] });
  assert.deepEqual(s.errors, []);
});

test('latest started stage picks the view', async () => {
  const s = await buildState({ run: fakeRun({ git: 'course/S04-start\ncourse/S05-start\n', br: '[]', gh: '[]' }), readJson: noJson });
  assert.equal(s.stage, 'S05');
  assert.equal(s.view, 'team');
});

test('beads are grouped by status with role and assignee', async () => {
  const br = JSON.stringify({ issues: [
    { id: 'a', title: 'API', status: 'in_progress', issue_type: 'task', assignee: 'backend-1', labels: ['role:backend'] },
    { id: 'b', title: 'UI', status: 'open', issue_type: 'task', labels: ['role:frontend'] },
    { id: 'c', title: 'Old', status: 'closed', issue_type: 'task', labels: ['role:backend', 'course:fast-forwarded'] },
    { id: 'e', title: 'Epic', status: 'open', issue_type: 'epic', labels: [] },
  ] });
  const s = await buildState({ run: fakeRun({ br, gh: '[]' }), readJson: noJson });
  assert.deepEqual(s.beads.in_progress, [{ id: 'a', title: 'API', type: 'task', role: 'backend', assignee: 'backend-1', fastForwarded: false }]);
  assert.equal(s.beads.ready[0].id, 'b');
  assert.equal(s.beads.closed[0].fastForwarded, true);
  assert.equal([...s.beads.ready, ...s.beads.in_progress, ...s.beads.closed].some(b => b.id === 'e'), false);
});

test('PR state comes from merge and reviewer labels', async () => {
  const gh = JSON.stringify([
    { number: 1, title: 'a', state: 'MERGED', labels: [{ name: 'approved-by-reviewer-agent' }] },
    { number: 2, title: 'b', state: 'OPEN', labels: [{ name: 'needs-changes' }] },
    { number: 3, title: 'c', state: 'OPEN', labels: [{ name: 'approved-by-reviewer-agent' }] },
    { number: 4, title: 'd', state: 'OPEN', labels: [] },
  ]);
  const s = await buildState({ run: fakeRun({ br: '[]', gh }), readJson: noJson });
  assert.deepEqual(s.prs.map(p => p.state), ['merged', 'needs-changes', 'approved', 'open']);
});

test('failing tools are reported, not thrown', async () => {
  const s = await buildState({ run: fakeRun({ br: new Error('no db'), gh: new Error('not logged in') }), readJson: noJson });
  assert.deepEqual(s.beads, { ready: [], in_progress: [], closed: [] });
  assert.deepEqual(s.prs, []);
  assert.equal(s.errors.length, 2);
});

test('cut-off for the current stage', async () => {
  const readJson = async p => p === 'progress/stages.json' ? { S05: { start: 1000, cutoff: 1000 + 35 * 90 } } : null;
  const s = await buildState({ run: fakeRun({ git: 'course/S05-start', br: '[]', gh: '[]' }), readJson, now: (1000 + 630) * 1000 });
  assert.deepEqual(s.cutoff, { stage: 'S05', at: (1000 + 3150) * 1000, remainingMinutes: 42 });
});

test('check results are passed through per stage', async () => {
  const readJson = async p => p === 'progress/checks/S04.json' ? { status: 'pass' } : null;
  const s = await buildState({ run: fakeRun({ br: '[]', gh: '[]' }), readJson });
  assert.deepEqual(s.checks.S04, { status: 'pass' });
  assert.equal(s.checks.S05, null);
});

test('unexpected JSON shapes from br and gh are reported, not thrown', async () => {
  const s = await buildState({ run: fakeRun({ br: 'null', gh: '{}' }), readJson: noJson });
  assert.deepEqual(s.beads, { ready: [], in_progress: [], closed: [] });
  assert.deepEqual(s.prs, []);
  assert.equal(s.errors.length, 2);
});

test('beads with an unknown status appear in no column', async () => {
  const br = JSON.stringify([{ id: 'x', title: 'Blocked', status: 'blocked', issue_type: 'task', labels: [] }]);
  const s = await buildState({ run: fakeRun({ br, gh: '[]' }), readJson: noJson });
  assert.deepEqual(s.beads, { ready: [], in_progress: [], closed: [] });
});
