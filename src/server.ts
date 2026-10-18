// I/O เท่านั้น: Express static + ws wiring — กฎทั้งหมดอยู่ใน quiz.ts
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import type { ClientToServer, Outbound, Question, ServerToClient } from './messages';
import { DEFAULT_DB_PATH, openDb } from './db';
import { createQuiz } from './quiz';

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.join(__dirname, '..');

const questions: Question[] = JSON.parse(fs.readFileSync(path.join(ROOT, 'questions.json'), 'utf8'));
const quiz = createQuiz(openDb(process.env.DB_PATH || DEFAULT_DB_PATH), questions); // questions = seed รันครั้งแรกเท่านั้น

const app = express();
app.use(express.static(path.join(ROOT, 'public')));
app.get('/questions.json', (_req, res) => res.sendFile(path.join(ROOT, 'questions.json')));

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

server.listen(PORT, () => {
  console.log(`live-quiz: http://localhost:${PORT}/teacher.html  |  http://localhost:${PORT}/student.html`);
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) {
        console.log(`LAN:       http://${a.address}:${PORT}/teacher.html  |  http://${a.address}:${PORT}/student.html`);
      }
    }
  }
});
