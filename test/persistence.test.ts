import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db';
import { openTestDb, questions } from './fixtures';
import type { Outbound } from '../src/messages';
import { createQuiz } from '../src/quiz';

const find = (out: Outbound[], to: Outbound['to'], type: string) =>
  out.find((o) => o.to === to && o.msg.type === type)?.msg as any;

describe('ADR-004 persistence (สร้าง quiz ใหม่บน db เดิม = restart)', () => {
  it('students, current, answers และ tally ถูกกู้คืน', () => {
    const db = openTestDb();
    const first = createQuiz(db);
    first.join('A');
    first.join('B');
    first.publish('q3');
    first.answer('A', 'q3', 2);

    const second = createQuiz(db);
    const joined = find(second.join('A'), 'self', 'joined');
    expect(joined.answered).toBe(true);
    expect(joined.question).toEqual({ id: 'q3', text: 'Q3?', choices: ['a', 'b', 'c', 'd'] });
    expect(find(second.teacherJoin(), 'teacher', 'tally')).toEqual({
      type: 'tally', questionId: 'q3', counts: [0, 0, 1, 0], answered: 1, total: 2,
    });
    // ตอบซ้ำหลัง restart ยังถูกปฏิเสธ
    expect(find(second.answer('A', 'q3', 1), 'self', 'answer:rejected').reason).toBe('already_answered');
  });

  it('connected รีเซ็ตเป็น false ตอน startup และ join ชื่อเดิมได้ (ไม่ใช่ name_taken)', () => {
    const db = openTestDb();
    const first = createQuiz(db);
    first.join('A');
    first.join('B');
    first.disconnect('B');

    const second = createQuiz(db);
    expect(find(second.teacherJoin(), 'teacher', 'students').students).toEqual([
      { name: 'A', connected: false },
      { name: 'B', connected: false },
    ]);
    expect(find(second.join('A'), 'self', 'joined')).toBeDefined();
  });

  it('publish ทับข้อเดิม -> คำตอบเก่าไม่กลับมาหลัง restart', () => {
    const db = openTestDb();
    const first = createQuiz(db);
    first.join('A');
    first.publish('q3');
    first.answer('A', 'q3', 1);
    first.publish('q4');

    const second = createQuiz(db);
    expect(second.state.current).toMatchObject({ questionId: 'q4' });
    expect(second.state.current?.answers.size).toBe(0);
  });

  it('ยังไม่ publish -> current เป็น null หลัง restart', () => {
    const db = openTestDb();
    createQuiz(db).join('A');
    expect(createQuiz(db).state.current).toBeNull();
  });

  it('โจทย์ถูกโหลดจากตาราง questions ของ db', () => {
    expect(createQuiz(openTestDb()).state.questions).toEqual(questions);
  });

  it('db ไม่มีโจทย์ = ไม่มีโจทย์ (ไม่มี seed)', () => {
    expect(createQuiz(openDb(':memory:')).state.questions).toEqual([]);
  });
});
