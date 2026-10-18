import { describe, expect, it } from 'vitest';
import { openDb } from '../src/db';
import type { Outbound, Question } from '../src/messages';
import { createQuiz } from '../src/quiz';

const questions: Question[] = [
  { id: 'q3', text: 'Q3?', choices: ['a', 'b', 'c', 'd'] },
  { id: 'q4', text: 'Q4?', choices: ['x', 'y'] },
];
const find = (out: Outbound[], to: Outbound['to'], type: string) =>
  out.find((o) => o.to === to && o.msg.type === type)?.msg as any;

describe('ADR-004 persistence (สร้าง quiz ใหม่บน db เดิม = restart)', () => {
  it('students, current, answers และ tally ถูกกู้คืน', () => {
    const db = openDb(':memory:');
    const first = createQuiz(db, questions);
    first.join('A');
    first.join('B');
    first.publish('q3');
    first.answer('A', 'q3', 2);

    const second = createQuiz(db, questions);
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
    const db = openDb(':memory:');
    const first = createQuiz(db, questions);
    first.join('A');
    first.join('B');
    first.disconnect('B');

    const second = createQuiz(db, questions);
    expect(find(second.teacherJoin(), 'teacher', 'students').students).toEqual([
      { name: 'A', connected: false },
      { name: 'B', connected: false },
    ]);
    expect(find(second.join('A'), 'self', 'joined')).toBeDefined();
  });

  it('publish ทับข้อเดิม -> คำตอบเก่าไม่กลับมาหลัง restart', () => {
    const db = openDb(':memory:');
    const first = createQuiz(db, questions);
    first.join('A');
    first.publish('q3');
    first.answer('A', 'q3', 1);
    first.publish('q4');

    const second = createQuiz(db, questions);
    expect(second.state.current).toEqual({ questionId: 'q4', answers: new Map() });
  });

  it('ยังไม่ publish -> current เป็น null หลัง restart', () => {
    const db = openDb(':memory:');
    createQuiz(db, questions).join('A');
    expect(createQuiz(db, questions).state.current).toBeNull();
  });

  it('seed เฉพาะตอนตาราง questions ว่าง; รอบสองใช้โจทย์ใน db', () => {
    const db = openDb(':memory:');
    createQuiz(db, questions);
    const second = createQuiz(db, [{ id: 'zz', text: 'other', choices: ['1'] }]);
    expect(second.state.questions).toEqual(questions);
  });
});
