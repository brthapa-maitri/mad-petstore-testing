import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, type APIRequestContext } from '@playwright/test';
import { API_URL } from './env';

/**
 * Stop and start the local API container for the "API stopped" scenarios. The container is
 * found by the host port it publishes (8000 by default), so this works whatever the compose
 * project is called. Override with E2E_API_CONTAINER. A stopped container no longer publishes
 * its port, so the name found at stop time is remembered for the start.
 */
const port = new URL(API_URL).port || '80';
const remembered = join(tmpdir(), `petstore-e2e-api-container-${port}`);

function runningApiContainer(): string {
  if (process.env.E2E_API_CONTAINER) return process.env.E2E_API_CONTAINER;
  const names = execFileSync('docker', ['ps', '--filter', `publish=${port}`, '--format', '{{.Names}}'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
  if (names.length !== 1) {
    throw new Error(`expected one container publishing port ${port}, found: ${names.join(', ') || 'none'}`);
  }
  return names[0];
}

export function stopApi(): void {
  const name = runningApiContainer();
  writeFileSync(remembered, name);
  execFileSync('docker', ['stop', name], { stdio: 'ignore' });
}

export function startApi(): void {
  const name = process.env.E2E_API_CONTAINER ?? (existsSync(remembered) ? readFileSync(remembered, 'utf8').trim() : '');
  if (!name) throw new Error(`no API container recorded in ${remembered}; was stopApi() run?`);
  execFileSync('docker', ['start', name], { stdio: 'ignore' });
}

export async function waitForApiDown(request: APIRequestContext): Promise<void> {
  await expect
    .poll(async () => (await request.get(`${API_URL}/health`).catch(() => null))?.ok() ?? false, { timeout: 30_000 })
    .toBe(false);
}

export async function waitForApiUp(request: APIRequestContext): Promise<void> {
  await expect
    .poll(async () => (await request.get(`${API_URL}/health`).catch(() => null))?.ok() ?? false, {
      timeout: 60_000,
      intervals: [500],
    })
    .toBe(true);
}
