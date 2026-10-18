// ตัวอย่าง integration test: เปิด server จริง (port 0 = ให้ OS เลือก) แล้วคุยผ่าน WebSocket จริง
// ก๊อปไฟล์นี้ไปเป็นแม่แบบได้
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import WebSocket from 'ws';
import { openDb } from '../src/db';
import { startServer } from '../src/server';
import { questions } from './fixtures';

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

// helper: ต่อ ws แล้วเก็บทุกข้อความที่ได้รับไว้ เพื่อให้ next(type) ไม่พลาดข้อความที่มาก่อน
async function connect() {
  const ws = new WebSocket(`ws://localhost:${server.port}`);
  const inbox: any[] = [];
  const waiting: { type: string; where: (m: any) => boolean; resolve: (m: any) => void }[] = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const i = waiting.findIndex((w) => w.type === msg.type && w.where(msg));
    if (i >= 0) waiting.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  await new Promise((resolve, reject) => ws.once('open', resolve).once('error', reject));
  clients.push(ws);
  return {
    send: (msg: object) => ws.send(JSON.stringify(msg)),
    // รอข้อความชนิด type (และเข้าเงื่อนไข where ถ้าระบุ); ถ้ามาถึงแล้วก็คืนทันที
    next(type: string, where: (m: any) => boolean = () => true): Promise<any> {
      const i = inbox.findIndex((m) => m.type === type && where(m));
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve) => waiting.push({ type, where, resolve }));
    },
  };
}

test('นักเรียนตอบ -> ได้ answer:accepted และครูเห็น tally answered=1', async () => {
  const teacher = await connect();
  const student = await connect();

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
