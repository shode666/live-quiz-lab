import { expect, it } from 'vitest';
import { addColumnIfMissing, openDb } from '../src/db';

it('addColumnIfMissing เพิ่มคอลัมน์ครั้งเดียว เรียกซ้ำไม่ error และข้อมูลเดิมอยู่', () => {
  const db = openDb(':memory:');
  db.exec("INSERT INTO current (id, question_id) VALUES (1, 'q3')");
  addColumnIfMissing(db, 'current', 'closed', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing(db, 'current', 'closed', 'INTEGER NOT NULL DEFAULT 0');
  expect(db.prepare('SELECT question_id, closed FROM current').get()).toMatchObject({ question_id: 'q3', closed: 0 });
});
