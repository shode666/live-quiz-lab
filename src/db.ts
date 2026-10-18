// SQLite (node:sqlite) — SQL ทั้งหมดอยู่ที่ไฟล์นี้ที่เดียว (ADR-004)
// ไม่มี ORM / migration: CREATE TABLE IF NOT EXISTS ตอนเปิด; คอลัมน์ใหม่ใช้ addColumnIfMissing
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Question } from './messages';

export const DEFAULT_DB_PATH = path.join(__dirname, '..', 'data', 'live-quiz.db');

// path = ':memory:' สำหรับ test; ไม่งั้นสร้างโฟลเดอร์ให้ถ้ายังไม่มี
export function openDb(file: string): DatabaseSync {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = DELETE'); // ไฟล์เดียว (ไม่มี -wal/-shm) เพราะ db ถูก commit ใน repo
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      pos     INTEGER PRIMARY KEY AUTOINCREMENT,
      id      TEXT NOT NULL UNIQUE,
      text    TEXT NOT NULL,
      choices TEXT NOT NULL            -- JSON array
    );
    CREATE TABLE IF NOT EXISTS students (
      name      TEXT PRIMARY KEY,
      connected INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS current (  -- มีได้แถวเดียว (ข้อที่ publish อยู่)
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      question_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS answers (  -- คำตอบของข้อปัจจุบัน
      student_name TEXT PRIMARY KEY,
      choice       INTEGER NOT NULL
    );
  `);
  return db;
}

// เพิ่มคอลัมน์ถ้ายังไม่มี — ให้ db ที่ commit ไว้ (ไม่มีคอลัมน์ใหม่) ใช้ต่อได้; เรียกใน openDb หลัง CREATE TABLE
// ตัวอย่าง: addColumnIfMissing(db, 'current', 'closed', 'INTEGER NOT NULL DEFAULT 0')
// (table/column/type ต้องเป็นค่าคงที่ในโค้ด ไม่ใช่ input จากผู้ใช้)
export function addColumnIfMissing(db: DatabaseSync, table: string, column: string, type: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

export type Snapshot = {
  questions: Question[];
  students: { name: string; connected: boolean }[];
  current: { questionId: string; answers: [string, number][] } | null;
};

export function createStore(db: DatabaseSync) {
  const transaction = (fn: () => void) => {
    db.exec('BEGIN');
    try {
      fn();
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };

  return {
    // เริ่ม process ใหม่: socket เดิมหายหมด -> ทุกคน offline
    resetConnected() {
      db.exec('UPDATE students SET connected = 0');
    },

    load(): Snapshot {
      const questions = (db.prepare('SELECT id, text, choices FROM questions ORDER BY pos').all() as {
        id: string; text: string; choices: string;
      }[]).map((r) => ({ id: r.id, text: r.text, choices: JSON.parse(r.choices) as string[] }));
      const students = (db.prepare('SELECT name, connected FROM students ORDER BY rowid').all() as {
        name: string; connected: number;
      }[]).map((r) => ({ name: r.name, connected: r.connected === 1 }));
      const cur = db.prepare('SELECT question_id FROM current WHERE id = 1').get() as
        | { question_id: string } | undefined;
      const answers = (db.prepare('SELECT student_name, choice FROM answers ORDER BY rowid').all() as {
        student_name: string; choice: number;
      }[]).map((r) => [r.student_name, r.choice] as [string, number]);
      return { questions, students, current: cur ? { questionId: cur.question_id, answers } : null };
    },

    // upsert ไม่ย้ายลำดับแถวของ student เดิม
    saveStudent(name: string, connected: boolean) {
      db.prepare(
        'INSERT INTO students (name, connected) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET connected = excluded.connected',
      ).run(name, connected ? 1 : 0);
    },

    // publish: เปลี่ยนข้อ + เคลียร์คำตอบ ใน transaction เดียว
    setCurrent(questionId: string) {
      transaction(() => {
        db.exec('DELETE FROM answers');
        db.prepare(
          'INSERT INTO current (id, question_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET question_id = excluded.question_id',
        ).run(questionId);
      });
    },

    saveAnswer(name: string, choice: number) {
      db.prepare('INSERT INTO answers (student_name, choice) VALUES (?, ?)').run(name, choice);
    },
  };
}
