// ตัวอย่าง integration test: เปิด server จริง (port 0 = ให้ OS เลือก) แล้วคุยผ่าน WebSocket จริง
// ก๊อปไฟล์นี้ไปเป็นแม่แบบได้
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import type WebSocket from 'ws';
import { openDb } from '../src/db';
import { startServer } from '../src/server';
import { questions } from './fixtures';
import { connect } from './helpers';

let dir: string;
let server: Awaited<ReturnType<typeof startServer>>;
const clients: WebSocket[] = [];

// startServer โหลดโจทย์ตอนเปิด ดังนั้น ':memory:' เติมโจทย์ล่วงหน้าไม่ได้ (server เปิด db เอง)
// -> สร้างไฟล์ db ชั่วคราว ใส่โจทย์ แล้วค่อยให้ server เปิดไฟล์นั้น
beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-quiz-'));
  const dbPath = path.join(dir, 'test.db');
  const db = openDb(dbPath);
  const insert = db.prepare('INSERT INTO questions (id, text, choices) VALUES (?, ?, ?)');
  for (const q of questions) insert.run(q.id, q.text, JSON.stringify(q.choices));
  db.close();
  server = await startServer({ port: 0, dbPath });
});

afterEach(async () => {
  for (const c of clients.splice(0)) c.terminate();
  await server.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('นักเรียนตอบ -> ได้ answer:accepted และครูเห็น tally answered=1', async () => {
  const teacher = await connect(server, clients);
  const student = await connect(server, clients);

  teacher.send({ type: 'teacher:join' });
  student.send({ type: 'join', name: 'Ann' });
  await student.next('joined');

  teacher.send({ type: 'publish', questionId: 'q3' });
  await student.next('question');

  student.send({ type: 'answer', questionId: 'q3', choice: 1 });

  expect(await student.next('answer:accepted')).toMatchObject({ questionId: 'q3' });
  // ครูได้ tally ตอน publish ด้วย (answered=0) -> รอเฉพาะอันที่ answered=1
  expect(await teacher.next('tally', (m) => m.answered === 1)).toMatchObject({ questionId: 'q3', total: 1 });
});
