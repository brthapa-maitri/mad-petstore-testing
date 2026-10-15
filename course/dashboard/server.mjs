// Read-only course dashboard: GET /api/state and the static page, on 127.0.0.1 only.
import http from 'node:http';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { buildState } from './state.mjs';

const execFileP = promisify(execFile);

export function createServer({ run, readJson, staticDir }) {
  return http.createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });

  async function handle(req, res) {
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    if (req.url === '/api/state') {
      const state = await buildState({ run, readJson });
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(state));
      return;
    }
    if (req.url === '/' || req.url === '/index.html') {
      const page = await readFile(join(staticDir, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page);
      return;
    }
    res.writeHead(404).end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.env.COURSE_ROOT ?? (await execFileP('git', ['rev-parse', '--show-toplevel'])).stdout.trim();
  const run = async (cmd, args) => (await execFileP(cmd, args, { cwd: root, maxBuffer: 10_000_000 })).stdout;
  const readJson = async rel => {
    try { return JSON.parse(await readFile(join(root, rel), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  };
  const port = Number(process.env.PORT ?? 4310);
  createServer({ run, readJson, staticDir: join(dirname(fileURLToPath(import.meta.url)), 'static') })
    .listen(port, '127.0.0.1', () => console.log(`Petstore course dashboard: http://localhost:${port}`));
}
