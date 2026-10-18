// state + กฎของ quiz — pure: ไม่ import ws/express, ไม่รู้จัก socket
// ทุก handler คืน list ของ Outbound (ไม่ส่งเอง) และไม่ throw
import type { DatabaseSync } from 'node:sqlite';
import { createStore } from './db';
import type { AnswerReject, Outbound, PublicQuestion, Question } from './messages';

type Student = { name: string; connected: boolean };

type QuizState = {
  questions: Question[];
  students: Map<string, Student>; // key = name
  current: {
    questionId: string;
    answers: Map<string, number>; // studentName -> choice index
  } | null;
};

const MAX_NAME_LENGTH = 30;

function toPublic(q: Question): PublicQuestion {
  return { id: q.id, text: q.text, choices: q.choices };
}

// state ทำงานใน memory (Map) แต่ทุกการเปลี่ยนแปลงเขียนลง SQLite ทันที และโหลดกลับตอนสร้าง (ADR-004)
// โจทย์อยู่ในตาราง questions ของ db (ไม่มี seed) — ตารางว่าง = ไม่มีโจทย์
export function createQuiz(db: DatabaseSync) {
  const store = createStore(db);
  store.resetConnected(); // socket ไม่รอด restart
  const snap = store.load();
  const state: QuizState = {
    questions: snap.questions,
    students: new Map(snap.students.map((s) => [s.name, s])),
    current: snap.current && { questionId: snap.current.questionId, answers: new Map(snap.current.answers) },
  };

  function findQuestion(id: string): Question | undefined {
    return state.questions.find((q) => q.id === id);
  }

  function studentsMsg(): Outbound {
    return {
      to: 'teacher',
      msg: { type: 'students', students: [...state.students.values()].map((s) => ({ ...s })) },
    };
  }

  // tally ของข้อปัจจุบัน; ไม่มี current -> ไม่ส่งอะไร
  function tallyMsgs(): Outbound[] {
    if (!state.current) return [];
    const question = findQuestion(state.current.questionId)!;
    const counts = question.choices.map(() => 0);
    for (const choice of state.current.answers.values()) counts[choice]++;
    return [
      {
        to: 'teacher',
        msg: {
          type: 'tally',
          questionId: question.id,
          counts,
          answered: state.current.answers.size,
          total: state.students.size, // รวม student ที่ offline
        },
      },
    ];
  }

  // FR-1
  function join(rawName: string): Outbound[] {
    const name = rawName.trim();
    if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
      return [{ to: 'self', msg: { type: 'error', reason: 'invalid_name' } }];
    }
    const existing = state.students.get(name);
    if (existing?.connected) {
      return [{ to: 'self', msg: { type: 'error', reason: 'name_taken' } }];
    }
    // ชื่อใหม่ หรือ reconnect (ชื่อเดิมที่หลุดไปแล้ว) -> คำตอบเดิมยังอยู่
    state.students.set(name, { name, connected: true });
    store.saveStudent(name, true);
    const question = state.current ? findQuestion(state.current.questionId)! : null;
    return [
      {
        to: 'self',
        msg: {
          type: 'joined',
          name,
          question: question ? toPublic(question) : null,
          answered: state.current?.answers.has(name) ?? false,
        },
      },
      studentsMsg(),
    ];
  }

  // FR-5
  function disconnect(name: string): Outbound[] {
    const student = state.students.get(name);
    if (!student) return [];
    student.connected = false;
    store.saveStudent(name, false);
    return [studentsMsg()];
  }

  // FR-4 AC-4.2
  function teacherJoin(): Outbound[] {
    return [studentsMsg(), ...tallyMsgs()];
  }

  // FR-2 — publish ซ้ำ/ทับข้อเดิม = เริ่มใหม่ (เคลียร์คำตอบ)
  function publish(questionId: string): Outbound[] {
    const question = findQuestion(questionId);
    if (!question) {
      return [{ to: 'self', msg: { type: 'error', reason: 'unknown_question' } }];
    }
    store.setCurrent(questionId);
    state.current = { questionId, answers: new Map() };
    return [{ to: 'students', msg: { type: 'question', question: toPublic(question) } }, ...tallyMsgs()];
  }

  // FR-3 — ตรวจตามลำดับ: not_joined -> not_current_question -> already_answered -> invalid_choice
  function answer(name: string, questionId: string, choice: number): Outbound[] {
    const reject = (reason: AnswerReject): Outbound[] => [
      { to: 'self', msg: { type: 'answer:rejected', questionId, reason } },
    ];

    if (!state.students.has(name)) return reject('not_joined');
    if (!state.current || state.current.questionId !== questionId) return reject('not_current_question');
    if (state.current.answers.has(name)) return reject('already_answered');
    const question = findQuestion(questionId)!;
    if (!Number.isInteger(choice) || choice < 0 || choice >= question.choices.length) {
      return reject('invalid_choice');
    }

    store.saveAnswer(name, choice);
    state.current.answers.set(name, choice);
    return [{ to: 'self', msg: { type: 'answer:accepted', questionId } }, ...tallyMsgs()];
  }

  return { state, join, disconnect, teacherJoin, publish, answer };
}

export type Quiz = ReturnType<typeof createQuiz>;
