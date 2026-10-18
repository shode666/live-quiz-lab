// GET /LAB.md ส่ง LAB.md ที่ root ของ repo ให้ public/lab.html render
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { startServer } from '../src/server';

let dir: string;
let server: Awaited<ReturnType<typeof startServer>>;

beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-quiz-'));
  server = await startServer({ port: 0, dbPath: path.join(dir, 'test.db') });
});

afterEach(async () => {
  await server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('GET /LAB.md -> 200 text/markdown utf-8 ขึ้นต้นด้วย "# Lab"', async () => {
  const res = await fetch(`http://localhost:${server.port}/LAB.md`);
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toMatch(/text\/markdown; charset=utf-8/i);
  expect((await res.text()).startsWith('# Lab')).toBe(true);
});
