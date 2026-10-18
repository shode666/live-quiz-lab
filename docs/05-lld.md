# LLD — live-quiz

> model requested: fable · served: Fable 5.1 (claude-fable-5-1)
> ต้องสอดคล้องกับ `03-hld.md` และ ADR-001..004 · ส่วนที่ติด **(I2)** = design ของ feature timer (Iteration 2 เป็นหนึ่งใน lab features) ยังไม่ implement ใน main · UI ตั้งค่าเริ่มต้น 30 s แต่ server คงสัญญาเดิม: ไม่ส่ง `timeLimitSec` = ไม่มี timer (UC-5 A3)

## 1. Layout

```
live-quiz/
├── package.json          # scripts: start (tsx watch src/server.ts), test (vitest), reset (ลบ DB)
├── tsconfig.json
├── scripts/reset.ts      # npm run reset: ลบ students/answers/current (เก็บ questions)
├── data/live-quiz.db     # SQLite ที่ commit ไว้ (มีโจทย์ในตาราง questions, DB_PATH override)
├── src/
│   ├── quiz.ts           # state + กฎ — ไม่ import ws/express
│   ├── db.ts             # node:sqlite: openDb + createStore (SQL ทั้งหมด)
│   ├── messages.ts       # TypeScript types ของ contract (ส่วน §3)
│   └── server.ts         # Express static + ws wiring + (I2) timer
├── public/
│   ├── teacher.html      # vanilla JS inline
│   └── student.html
└── test/
    └── quiz.test.ts      # vitest unit tests
```

หน้าที่ต่อไฟล์
- `quiz.ts` — `createQuiz(db)` (db = `DatabaseSync`; โจทย์โหลดจากตาราง questions) คืน object ที่มี `state` และ handlers (§4) · ทุก handler **คืน list ของ outbound messages** ไม่ส่งเอง
- `server.ts` — export `startServer({ port, dbPath })` → คืน `{ port, close() }` (port 0 = OS เลือก; `close()` ปิด ws clients/wss/http/db; `npm start` เรียกผ่าน `if (require.main === module)` โดยอ่าน `PORT`/`DB_PATH`; ตัวอย่างเทสต์ `test/server.test.ts`) · ภายใน: `openDb(dbPath)` → `createQuiz(db)` → เปิด Express (`public/` + `GET /questions.json` ตอบรายการโจทย์จาก DB) → เปิด `ws` บน server เดียวกัน (port 3000) → ต่อ socket: parse JSON → เรียก handler → ส่ง outbound ตาม `to` → `close` เรียก `disconnect`
- `db.ts` — `openDb(file)` สร้างโฟลเดอร์/ไฟล์ + `CREATE TABLE IF NOT EXISTS` (questions, students, current, answers) · `createStore(db)` = SQL ทั้งหมด: `resetConnected`, `load`, `saveStudent`, `setCurrent` (เคลียร์ answers ใน transaction), `saveAnswer`
- `messages.ts` — types เท่านั้น ให้ทั้ง `quiz.ts`, `server.ts`, test ใช้ร่วมกัน

## 2. State model (`quiz.ts`)

```ts
type Student = { name: string; connected: boolean };

type QuizState = {
  questions: Question[];                 // จากตาราง questions (read-only)
  students: Map<string, Student>;        // key = name
  current: {
    questionId: string;
    answers: Map<string, number>;        // studentName -> choice index
    deadlineAt?: number;                 // (I2) epoch ms ฝั่ง server
    closed: boolean;                     // (I2) true หลังหมดเวลา
  } | null;
};
```

`state` เป็น working copy ใน memory ที่ `createQuiz` โหลดจาก SQLite ตอนสร้าง และทุก handler เขียนการเปลี่ยนแปลงลง SQLite ก่อนอัปเดต memory (ADR-004) · `connected` ถูกรีเซ็ตเป็น `false` ตอนโหลด

`server.ts` เก็บ map แยกต่างหาก `socket -> { role: 'teacher' } | { role: 'student', name }` — `quiz.ts` ไม่รู้จัก socket

## 3. WebSocket message contract (`messages.ts`)

ทุก message เป็น JSON 1 object มี `type` · field ที่มี `// I2` เป็น **optional เพิ่มเข้ามา** ใน Iteration 2 เท่านั้น — ห้ามเปลี่ยน/ลบ event เดิม

```ts
// ---------- client -> server ----------
export type StudentToServer =
  | { type: 'join';   name: string }
  | { type: 'answer'; questionId: string; choice: number };

export type TeacherToServer =
  | { type: 'teacher:join' }
  | { type: 'publish'; questionId: string; timeLimitSec?: number };   // timeLimitSec: I2

export type ClientToServer = StudentToServer | TeacherToServer;

// ---------- server -> client ----------
export type PublicQuestion = {
  id: string; text: string; choices: string[];
  deadlineAt?: number;                                                 // I2, epoch ms
};

export type ServerToStudent =
  | { type: 'joined';          name: string; question: PublicQuestion | null; answered: boolean }
  | { type: 'question';        question: PublicQuestion }
  | { type: 'answer:accepted'; questionId: string }
  | { type: 'answer:rejected'; questionId: string; reason: AnswerReject }
  | { type: 'question:closed'; questionId: string }                    // I2
  | { type: 'error';           reason: ErrorReason };

export type ServerToTeacher =
  | { type: 'students'; students: { name: string; connected: boolean }[] }
  | { type: 'tally';    questionId: string; counts: number[]; answered: number; total: number }
  | { type: 'question:closed'; questionId: string }                    // I2
  | { type: 'error';    reason: ErrorReason };

export type ServerToClient = ServerToStudent | ServerToTeacher;

// ---------- reasons ----------
export type AnswerReject =
  | 'not_joined' | 'not_current_question' | 'already_answered' | 'invalid_choice'
  | 'closed';                                                          // I2

export type ErrorReason =
  | 'invalid_name' | 'name_taken' | 'unknown_question' | 'bad_message'
  | 'invalid_time_limit';                                              // I2
```

ตารางผู้รับ

| Event | ใครได้ |
|---|---|
| `joined`, `answer:*`, `error` | socket ที่ส่งมา (self) |
| `question`, `question:closed` | student ทุกคนที่ต่ออยู่ (+ teacher ได้ `question:closed`) |
| `students`, `tally` | teacher ทุก socket |

## 4. Handlers (`quiz.ts`) — signature

```ts
type Outbound = { to: 'self' | 'students' | 'teacher'; msg: ServerToClient };

join(name: string): Outbound[]                     // FR-1
disconnect(name: string): Outbound[]               // FR-5 (connected=false)
teacherJoin(): Outbound[]                          // FR-4 AC-4.2 -> students + tally
publish(questionId: string, opts?: { now?: number; timeLimitSec?: number }): Outbound[]   // FR-2, FR-6 — opts ทั้งก้อน optional (I2); now default Date.now()
answer(name: string, questionId: string, choice: number, now: number = Date.now()): Outbound[]  // FR-3, FR-7 — now optional (I2)
closeQuestion(questionId: string): Outbound[]      // I2 — เรียกโดย timer ใน server.ts; คืน [] ถ้าไม่ใช่ current
```

**กฎ additive (I2)** — signature ของ Iteration 1 (`publish(questionId)`, `answer(name, questionId, choice)`) ต้องยังเรียกได้เหมือนเดิมและคืน `Outbound[]` เหมือนเดิม: parameter ใหม่เป็น optional เท่านั้น · ไม่เปลี่ยน return type · `deadlineAt` **ไม่คืนจาก `publish`** แต่เก็บใน `state.current.deadlineAt` และติดไปใน `question` message · test เดิมบางตัวเช็ค field แบบ exact (`quiz.test.ts:57` เช็ค `Object.keys`, `quiz.test.ts:46`/`persistence.test.ts:22` ใช้ `toEqual`) → เพิ่ม field ใหม่แบบ optional เฉพาะเมื่อมีค่า เช่น `...(d !== undefined && { deadlineAt: d })` ห้ามใส่ `key: undefined` · ไม่ควรต้องแก้ test เดิม (AGENTS.md)

กฎใน `answer` (ตรวจตามลำดับ): `not_joined` → `not_current_question` → `closed` (I2: `current.closed || now >= deadlineAt`) → `already_answered` → `invalid_choice` → accept

กฎใน `publish`: id ไม่มี → `unknown_question` · (I2) `timeLimitSec` มีค่าแต่ไม่ใช่ integer 10–120 → `invalid_time_limit` · ผ่าน → `current = { questionId, answers: new Map(), deadlineAt?, closed:false }` (`deadlineAt = now + timeLimitSec*1000` เฉพาะเมื่อส่ง `timeLimitSec`) → ส่ง `question` ให้ students (มี `deadlineAt` ถ้ามี) + `tally` ศูนย์ให้ teacher

`server.ts` (I2) หลัง `publish` สำเร็จ: `clearTimeout(timer)`; อ่าน `const d = quiz.state.current?.deadlineAt`; ถ้ามี → `timer = setTimeout(() => dispatch(undefined, quiz.closeQuestion(id)), d - Date.now())` · `dispatch` เปลี่ยนเป็น `dispatch(self: WebSocket | undefined, outbound: Outbound[])` — call site เดิมส่ง `ws` เหมือนเดิม; timer ไม่มี socket จึงส่ง `undefined` (`to:'self'` ถูกข้ามเมื่อไม่มี self; `closeQuestion` ส่งเฉพาะ `students`/`teacher`)

## 5. Error handling

- JSON parse ไม่ได้ / ไม่มี `type` ที่รู้จัก → `error bad_message` แล้วเพิกเฉย (ไม่ปิด socket)
- message ของ student จาก socket ที่ยังไม่ join → `answer:rejected not_joined` (สำหรับ answer) · ข้ามไปสำหรับ type อื่น
- ไม่ throw ออกจาก handler — ทุกเคสผิดคืน `error`/`rejected` เป็น Outbound

## 6. Test plan

### Iteration 1 — `test/quiz.test.ts` (vitest, ไม่เปิด socket)

| Test | AC |
|---|---|
| join ชื่อปกติ → `joined` + `students` ถึง teacher | AC-1.1 |
| join ชื่อว่าง / 31 ตัวอักษร → `invalid_name` | AC-1.2 |
| join ชื่อซ้ำที่ต่ออยู่ → `name_taken` | AC-1.3 |
| disconnect แล้ว join ชื่อเดิม → `joined.answered=true` ถ้าตอบไว้, คำตอบเดิมอยู่ใน tally | AC-1.4 |
| publish id ที่มี → students ได้ `question` (ไม่มี field เกิน), teacher ได้ `tally` ศูนย์ | AC-2.1 |
| publish id ไม่มี → `unknown_question` | AC-2.2 |
| publish q4 ทับ q3 → answers เคลียร์, answer q3 ถูก `not_current_question` | AC-2.3, AC-3.3 |
| answer ครั้งแรก → accepted + tally counts เพิ่ม 1 ช่องเดียว | AC-3.1, AC-4.1 |
| answer ซ้ำ → `already_answered`, tally ไม่เปลี่ยน | AC-3.2 |
| choice = -1 / = choices.length → `invalid_choice` | AC-3.4 |
| answer โดยไม่ join → `not_joined` | AC-3.5 |
| teacherJoin ระหว่างมี current → ได้ `students` + `tally` ปัจจุบัน | AC-4.2 |
| `tally.total` นับรวม student ที่ offline | UC-4 edge |

### Persistence (ADR-004) — `test/persistence.test.ts`

สร้าง `createQuiz` ใหม่บน db `:memory:` เดิม = จำลอง restart: students/current/answers/tally กู้คืน · `connected` รีเซ็ตเป็น false · publish ทับแล้วคำตอบเก่าไม่กลับมา · โจทย์โหลดจากตาราง questions; db ไม่มีโจทย์ = ไม่มีโจทย์ (ไม่มี seed)

### Iteration 2 — tests ที่ต้อง **เพิ่ม** (ห้ามแก้ test เดิมให้ fail)

| Test | AC |
|---|---|
| `publish('q3', { now: 1000, timeLimitSec: 30 })` → `question.deadlineAt === 31000` และ `state.current.deadlineAt === 31000` | AC-6.1 |
| `timeLimitSec` = 5 / 121 / 30.5 → `invalid_time_limit` | AC-6.2 |
| `publish('q3')` (ไม่ส่ง opts) → ไม่มี `deadlineAt`, คืน `Outbound[]` เหมือน I1; `answer('A','q3',1)` 3 args ยัง accepted (regression) | UC-5 A3 |
| answer ด้วย `now = deadlineAt` → `closed`; `now = deadlineAt - 1` → accepted | AC-7.2 |
| `closeQuestion(q3)` → `question:closed` ถึง students + teacher; answer หลังจากนั้น → `closed` | AC-7.1 |
| `closeQuestion` ของ id ที่ไม่ใช่ current → คืน `[]` (ป้องกัน timer เก่า) | AC-7.3 |
| student reconnect ระหว่างนับ → `joined.question.deadlineAt` เท่าเดิม | UC-5 A5 |
| `server.ts`: publish ใหม่ก่อน deadline แล้ว `clearTimeout` ถูกเรียก (ใช้ `vi.useFakeTimers`) | AC-7.3 |
