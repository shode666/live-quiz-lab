// fixture โจทย์สำหรับเทสต์ — ใส่ลง :memory: db (ไม่พึ่งไฟล์ใน repo)
import { openDb } from '../src/db';
import type { Question } from '../src/messages';

export const questions: Question[] = [
  { id: 'q3', text: 'Q3?', choices: ['a', 'b', 'c', 'd'] },
  { id: 'q4', text: 'Q4?', choices: ['x', 'y'] },
];

export function openTestDb() {
  const db = openDb(':memory:');
  const insert = db.prepare('INSERT INTO questions (id, text, choices) VALUES (?, ?, ?)');
  for (const q of questions) insert.run(q.id, q.text, JSON.stringify(q.choices));
  return db;
}
