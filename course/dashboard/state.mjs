// Builds dashboard state from git, br, gh and progress files. It never grades; it shows what checks wrote.
export const STAGES = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09'];
const TEAM_STAGES = new Set(['S05', 'S06', 'S07']);

const prState = pr => {
  const labels = (pr.labels ?? []).map(l => l.name);
  if (pr.state === 'MERGED') return 'merged';
  if (labels.includes('needs-changes')) return 'needs-changes';
  if (labels.includes('approved-by-reviewer-agent')) return 'approved';
  return 'open';
};

const toBead = b => ({
  id: b.id, title: b.title, type: b.issue_type,
  role: (b.labels ?? []).find(l => l.startsWith('role:'))?.slice(5) ?? null,
  assignee: b.assignee ?? null,
  fastForwarded: (b.labels ?? []).includes('course:fast-forwarded'),
});

export async function buildState({ run, readJson, now = Date.now() }) {
  const errors = [];
  const attempt = async (label, fn, fallback) => {
    try { return await fn(); } catch (e) { errors.push(`${label}: ${e.message}`); return fallback; }
  };

  const tags = await attempt('git', () => run('git', ['tag', '-l', 'course/S*-start']), '');
  const started = tags.split('\n').map(t => t.trim().match(/^course\/(S\d\d)-start$/)?.[1]).filter(Boolean).sort();
  const stage = started.at(-1) ?? null;

  const checks = {};
  for (const s of STAGES) checks[s] = await attempt(`check ${s}`, () => readJson(`progress/checks/${s}.json`), null);

  const issues = await attempt('br', async () => {
    const parsed = JSON.parse(await run('br', ['list', '--all', '--json', '--limit', '0']));
    const list = Array.isArray(parsed) ? parsed : parsed?.issues;
    if (!Array.isArray(list)) throw new Error('unexpected output shape');
    return list.filter(b => b.issue_type === 'task' || b.issue_type === 'bug');
  }, []);
  const beads = { ready: [], in_progress: [], closed: [] };
  const column = { open: 'ready', in_progress: 'in_progress', closed: 'closed' };
  for (const b of issues) if (column[b.status]) beads[column[b.status]].push(toBead(b));

  const prList = await attempt('gh', async () => {
    const list = JSON.parse(await run('gh',
      ['pr', 'list', '--state', 'all', '--base', 'develop', '--limit', '100', '--json', 'number,title,labels,state']));
    if (!Array.isArray(list)) throw new Error('unexpected output shape');
    return list;
  }, []);
  const prs = prList.map(p => ({ number: p.number, title: p.title, state: prState(p) }));

  const stages = await attempt('stages', () => readJson('progress/stages.json'), null);
  const cut = stage && stages?.[stage]?.cutoff;
  const cutoff = cut ? { stage, at: cut * 1000, remainingMinutes: Math.round((cut * 1000 - now) / 60000) } : null;

  return { stage, view: TEAM_STAGES.has(stage) ? 'team' : 'plan', checks, beads, prs, cutoff, errors, generatedAt: now };
}
