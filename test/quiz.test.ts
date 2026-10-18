import { beforeEach, describe, expect, it } from 'vitest';
import type { Outbound } from '../src/messages';
import { openTestDb } from './fixtures';
import { createQuiz, type Quiz } from '../src/quiz';

// helper: หา message ตาม to + type
const find = (out: Outbound[], to: Outbound['to'], type: string) =>
  out.find((o) => o.to === to && o.msg.type === type)?.msg as any;

let quiz: Quiz;
beforeEach(() => {
  quiz = createQuiz(openTestDb());
});

describe('FR-1 join', () => {
  it('join ชื่อปกติ -> joined + students ถึง teacher (AC-1.1)', () => {
    const out = quiz.join('Somchai');
    expect(find(out, 'self', 'joined')).toMatchObject({ type: 'joined', name: 'Somchai', question: null, answered: false });
    expect(find(out, 'teacher', 'students').students).toEqual([{ name: 'Somchai', connected: true }]);
  });

  it('join ชื่อว่าง / 31 ตัวอักษร -> invalid_name (AC-1.2)', () => {
    for (const name of ['', '   ', 'x'.repeat(31)]) {
      expect(quiz.join(name)).toEqual([{ to: 'self', msg: { type: 'error', reason: 'invalid_name' } }]);
    }
    expect(quiz.state.students.size).toBe(0);
    expect(quiz.join('x'.repeat(30)).length).toBeGreaterThan(0); // 30 ตัวผ่าน
    expect(quiz.state.students.size).toBe(1);
  });

  it('join ชื่อซ้ำที่ต่ออยู่ -> name_taken (AC-1.3)', () => {
    quiz.join('A');
    expect(quiz.join('A')).toEqual([{ to: 'self', msg: { type: 'error', reason: 'name_taken' } }]);
  });

  it('disconnect แล้ว join ชื่อเดิม -> answered=true และคำตอบเดิมอยู่ใน tally (AC-1.4)', () => {
    quiz.join('A');
    quiz.publish('q3');
    quiz.answer('A', 'q3', 2);
    const out = quiz.disconnect('A');
    expect(find(out, 'teacher', 'students').students).toEqual([{ name: 'A', connected: false }]);

    const back = quiz.join('A');
    const joined = find(back, 'self', 'joined');
    expect(joined.answered).toBe(true);
    expect(joined.question).toEqual({ id: 'q3', text: 'Q3?', choices: ['a', 'b', 'c', 'd'] });
    expect(find(quiz.teacherJoin(), 'teacher', 'tally').counts).toEqual([0, 0, 1, 0]);
  });
});

describe('FR-2 publish', () => {
  it('publish id ที่มี -> students ได้ question (ไม่มี field เกิน), teacher ได้ tally ศูนย์ (AC-2.1)', () => {
    quiz.join('A');
    const out = quiz.publish('q3');
    const q = find(out, 'students', 'question');
    expect(q).toMatchObject({ type: 'question', question: { id: 'q3', text: 'Q3?', choices: ['a', 'b', 'c', 'd'] } });
    expect(Object.keys(q.question).sort()).toEqual(['choices', 'id', 'text']);
    expect(find(out, 'teacher', 'tally')).toEqual({
      type: 'tally', questionId: 'q3', counts: [0, 0, 0, 0], answered: 0, total: 1,
    });
  });

  it('publish id ไม่มี -> unknown_question (AC-2.2)', () => {
    expect(quiz.publish('nope')).toEqual([{ to: 'self', msg: { type: 'error', reason: 'unknown_question' } }]);
    expect(quiz.state.current).toBeNull();
  });

  it('publish q4 ทับ q3 -> answers เคลียร์, answer q3 ถูก not_current_question (AC-2.3, AC-3.3)', () => {
    quiz.join('A');
    quiz.join('B');
    quiz.publish('q3');
    quiz.answer('A', 'q3', 0);
    const out = quiz.publish('q4');
    expect(find(out, 'teacher', 'tally')).toMatchObject({ questionId: 'q4', counts: [0, 0], answered: 0 });
    expect(find(quiz.answer('B', 'q3', 0), 'self', 'answer:rejected')).toEqual({
      type: 'answer:rejected', questionId: 'q3', reason: 'not_current_question',
    });
  });
});

describe('FR-3 answer / FR-4 tally', () => {
  beforeEach(() => {
    quiz.join('A');
    quiz.join('B');
    quiz.publish('q3');
  });

  it('answer ครั้งแรก -> accepted + tally เพิ่ม 1 ช่องเดียว (AC-3.1, AC-4.1)', () => {
    const out = quiz.answer('A', 'q3', 1);
    expect(find(out, 'self', 'answer:accepted')).toEqual({ type: 'answer:accepted', questionId: 'q3' });
    expect(find(out, 'teacher', 'tally')).toEqual({
      type: 'tally', questionId: 'q3', counts: [0, 1, 0, 0], answered: 1, total: 2,
    });
  });

  it('answer ซ้ำ -> already_answered, tally ไม่เปลี่ยน (AC-3.2)', () => {
    quiz.answer('A', 'q3', 1);
    const out = quiz.answer('A', 'q3', 2);
    expect(out).toEqual([{ to: 'self', msg: { type: 'answer:rejected', questionId: 'q3', reason: 'already_answered' } }]);
    expect(find(quiz.teacherJoin(), 'teacher', 'tally').counts).toEqual([0, 1, 0, 0]);
  });

  it('choice = -1 / = choices.length -> invalid_choice (AC-3.4)', () => {
    for (const choice of [-1, 4]) {
      expect(find(quiz.answer('A', 'q3', choice), 'self', 'answer:rejected').reason).toBe('invalid_choice');
    }
    expect(quiz.state.current!.answers.size).toBe(0);
  });

  it('answer โดยไม่ join -> not_joined (AC-3.5)', () => {
    expect(find(quiz.answer('ghost', 'q3', 0), 'self', 'answer:rejected').reason).toBe('not_joined');
  });

  it('teacherJoin ระหว่างมี current -> students + tally ปัจจุบัน (AC-4.2)', () => {
    quiz.answer('A', 'q3', 3);
    const out = quiz.teacherJoin();
    expect(find(out, 'teacher', 'students').students).toHaveLength(2);
    expect(find(out, 'teacher', 'tally')).toMatchObject({ questionId: 'q3', counts: [0, 0, 0, 1], answered: 1 });
  });

  it('tally.total นับรวม student ที่ offline (UC-4 edge)', () => {
    quiz.disconnect('B');
    expect(find(quiz.answer('A', 'q3', 0), 'teacher', 'tally').total).toBe(2);
  });
});

describe('edge cases (review round)', () => {
  it('answer ก่อน publish -> not_current_question', () => {
    quiz.join('A');
    expect(find(quiz.answer('A', 'q3', 0), 'self', 'answer:rejected').reason).toBe('not_current_question');
  });

  it('choice ไม่ใช่จำนวนเต็ม (1.5) -> invalid_choice', () => {
    quiz.join('A');
    quiz.publish('q3');
    expect(find(quiz.answer('A', 'q3', 1.5), 'self', 'answer:rejected').reason).toBe('invalid_choice');
    expect(quiz.state.current!.answers.size).toBe(0);
  });

  it("join('  A ') เก็บชื่อเป็น 'A'", () => {
    const out = quiz.join('  A ');
    expect(find(out, 'self', 'joined').name).toBe('A');
    expect([...quiz.state.students.keys()]).toEqual(['A']);
  });

  it('publish ข้อเดิมซ้ำ -> คำตอบถูกเคลียร์ และตอบใหม่ได้', () => {
    quiz.join('A');
    quiz.publish('q3');
    quiz.answer('A', 'q3', 1);
    const out = quiz.publish('q3');
    expect(find(out, 'teacher', 'tally')).toMatchObject({ counts: [0, 0, 0, 0], answered: 0 });
    expect(find(quiz.answer('A', 'q3', 2), 'self', 'answer:accepted')).toBeDefined();
  });

  it('not_joined ถูกตรวจก่อน not_current_question', () => {
    quiz.publish('q3');
    expect(find(quiz.answer('ghost', 'q4', 0), 'self', 'answer:rejected').reason).toBe('not_joined');
  });
});
