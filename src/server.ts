// I/O เท่านั้น: Express static + ws wiring — กฎทั้งหมดอยู่ใน quiz.ts
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import type { ClientToServer, Outbound, ServerToClient } from './messages';
import { DEFAULT_DB_PATH, openDb } from './db';
import { createQuiz } from './quiz';

const ROOT = path.join(__dirname, '..');

// เปิดทั้งระบบ (db + express + ws) แล้วคืน port จริงที่ bind (port: 0 = ให้ OS เลือก) และ close() สำหรับ test
export async function startServer(opts: { port: number; dbPath: string }) {
  const db = openDb(opts.dbPath);
  const quiz = createQuiz(db);

  const app = express();
  app.use(express.static(path.join(ROOT, 'public')));
  // teacher.html โหลดรายการโจทย์จากที่นี่ (public/ ไม่เปลี่ยน) — ข้อมูลมาจากตาราง questions
  app.get('/questions.json', (_req, res) => res.json(quiz.state.questions));
  // lab.html อ่าน LAB.md จากที่นี่ตอนเปิดหน้า (LAB.md เป็นแหล่งเดียว ไม่ก๊อปเนื้อหา)
  app.get('/LAB.md', (_req, res) =>
    res.type('text/markdown; charset=utf-8').sendFile(path.join(ROOT, 'LAB.md')));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // socket -> ใครคือใคร (quiz.ts ไม่รู้จัก socket)
  type Who = { role: 'teacher' } | { role: 'student'; name: string };
  const sockets = new Map<WebSocket, Who>();

  function sendTo(ws: WebSocket, msg: ServerToClient) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  // ส่ง outbound ตาม `to` (self = undefined เมื่อไม่มี socket ต้นเรื่อง เช่น งานที่เกิดจาก timer -> ข้าม to:'self')
  function dispatch(self: WebSocket | undefined, outbound: Outbound[]) {
    for (const { to, msg } of outbound) {
      if (to === 'self') {
        if (self) sendTo(self, msg);
        continue;
      }
      const role = to === 'teacher' ? 'teacher' : 'student';
      for (const [ws, who] of sockets) {
        if (who.role === role) sendTo(ws, msg);
      }
    }
  }

  function parse(raw: string): ClientToServer | null {
    try {
      const m = JSON.parse(raw);
      if (m?.type === 'join' && typeof m.name === 'string') return m;
      if (m?.type === 'answer' && typeof m.questionId === 'string' && typeof m.choice === 'number') return m;
      if (m?.type === 'teacher:join') return m;
      if (m?.type === 'publish' && typeof m.questionId === 'string') return m;
    } catch {
      // JSON ไม่ถูกต้อง -> คืน null ด้านล่าง
    }
    return null;
  }

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      const msg = parse(data.toString());
      if (!msg) return sendTo(ws, { type: 'error', reason: 'bad_message' });

      const who = sockets.get(ws);
      switch (msg.type) {
        case 'join': {
          if (who) return; // socket นี้ join ไปแล้ว
          const out = quiz.join(msg.name);
          // ชื่อที่เก็บ = ชื่อใน joined (quiz.ts เป็นคน trim)
          const joined = out.find((o) => o.msg.type === 'joined')?.msg;
          if (joined?.type === 'joined') sockets.set(ws, { role: 'student', name: joined.name });
          return dispatch(ws, out);
        }
        case 'answer':
          if (who?.role !== 'student') {
            return sendTo(ws, { type: 'answer:rejected', questionId: msg.questionId, reason: 'not_joined' });
          }
          return dispatch(ws, quiz.answer(who.name, msg.questionId, msg.choice));
        case 'teacher:join':
          if (!who) sockets.set(ws, { role: 'teacher' });
          return dispatch(ws, quiz.teacherJoin());
        case 'publish':
          if (who?.role !== 'teacher') return sendTo(ws, { type: 'error', reason: 'bad_message' });
          return dispatch(ws, quiz.publish(msg.questionId));
      }
    });

    ws.on('close', () => {
      const who = sockets.get(ws);
      sockets.delete(ws);
      if (who?.role === 'student') dispatch(ws, quiz.disconnect(who.name));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(opts.port, resolve);
  });
  const port = (server.address() as AddressInfo).port;

  return {
    port,
    async close() {
      for (const ws of wss.clients) ws.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
      db.close();
    },
  };
}

// รันตรงผ่าน `npm start` (tsx, CommonJS) -> เปิด server ตาม env; ถูก import จาก test จะไม่เปิดเอง
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  startServer({ port, dbPath: process.env.DB_PATH || DEFAULT_DB_PATH }).then(() => {
    console.log(`Lab:       http://localhost:${port}/lab.html`);
    console.log(`live-quiz: http://localhost:${port}/teacher.html  |  http://localhost:${port}/student.html`);
    for (const addrs of Object.values(os.networkInterfaces())) {
      for (const a of addrs ?? []) {
        if (a.family === 'IPv4' && !a.internal) {
          console.log(`LAN:       http://${a.address}:${port}/teacher.html  |  http://${a.address}:${port}/student.html`);
        }
      }
    }
  });
}
