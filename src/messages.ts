// Contract ของ WebSocket message (LLD §3) — types เท่านั้น ไม่มี logic
// ทุก message เป็น JSON 1 object ที่มี field `type`

// ---------- client -> server ----------
export type StudentToServer =
  | { type: 'join'; name: string }
  | { type: 'answer'; questionId: string; choice: number };

export type TeacherToServer =
  | { type: 'teacher:join' }
  | { type: 'publish'; questionId: string };

export type ClientToServer = StudentToServer | TeacherToServer;

// ---------- โจทย์ ----------
// รูปแบบโจทย์ (ตาราง questions) (ไม่มีเฉลย)
export type Question = { id: string; text: string; choices: string[] };
// รูปแบบที่ส่งให้ student
export type PublicQuestion = { id: string; text: string; choices: string[] };

// ---------- reasons ----------
export type AnswerReject =
  | 'not_joined'
  | 'not_current_question'
  | 'already_answered'
  | 'invalid_choice';

export type ErrorReason =
  | 'invalid_name'
  | 'name_taken'
  | 'unknown_question'
  | 'bad_message';

// ---------- server -> client ----------
export type ServerToStudent =
  | { type: 'joined'; name: string; question: PublicQuestion | null; answered: boolean }
  | { type: 'question'; question: PublicQuestion }
  | { type: 'answer:accepted'; questionId: string }
  | { type: 'answer:rejected'; questionId: string; reason: AnswerReject }
  | { type: 'error'; reason: ErrorReason };

export type ServerToTeacher =
  | { type: 'students'; students: { name: string; connected: boolean }[] }
  | { type: 'tally'; questionId: string; counts: number[]; answered: number; total: number }
  | { type: 'error'; reason: ErrorReason };

export type ServerToClient = ServerToStudent | ServerToTeacher;

// quiz.ts คืน list ของ Outbound — server.ts เป็นคนส่งจริงตาม `to`
export type Outbound = { to: 'self' | 'students' | 'teacher'; msg: ServerToClient };
