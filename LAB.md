# Lab: AI-Assisted Software Development

อ่านแบบสวย ๆ: เปิด http://localhost:3000/lab.html หลัง `npm start`

ใช้ coding agent เพิ่ม feature จริงให้แอป Live Quiz ตั้งแต่ requirement จนถึง verify

- ไม่มีคะแนน ไม่ต้องส่ง ทำไม่เสร็จในห้องก็เอาไปทำต่อที่บ้านได้ ทุกอย่างอยู่ในไฟล์นี้
- สิ่งที่ฝึกคือ **วิธีทำงานกับ agent** ไม่ใช่ปริมาณโค้ด
- **ส่ง prompt ทีละขั้นเอง** อย่าสั่ง "ทำ lab ให้เสร็จ" เพราะ agent ถูกตั้งไว้ให้ปฏิเสธ (ดู AGENTS.md หัวข้อ Workshop) และเราจะไม่ได้ฝึกอะไรเลย

| ขั้น | ทำอะไร | เวลาโดยประมาณ |
|---|---|---|
| 1 | Setup | 5 นาที |
| 2 | Warm-up: จำนักศึกษาด้วย token — ทำไปพร้อมวิทยากรบนจอ | 20–25 นาที |
| 3 | เลือก 1 feature แล้วทำตามบทของมัน: Requirement → Design → Explore → Plan → Implement → Verify | 30–90 นาที ตามความยาก |
| 4 | ทบทวน | 5 นาที |

ในห้องส่วนใหญ่จะทำได้ถึง Plan หรือต้น Implement ของ feature ที่เลือก — ไม่เป็นไร ที่เหลือทำต่อที่บ้านได้

---

## 1. Setup

ต้องมี: Node.js **22.13 ขึ้นไป** (`node --version`), git, coding agent ที่ login แล้ว

```bash
git clone https://github.com/shode666/live-quiz-lab.git
cd live-quiz-lab
npm install
npm test            # ต้องเห็น passed ทั้งหมด ไม่มี failed
git checkout -b my-lab
npm start           # เปิดค้างไว้ใน terminal นี้ แก้โค้ดแล้ว restart เอง
```

- เปิด URL ที่ขึ้นในจอ: หน้าอาจารย์ 1 แท็บ, หน้านักศึกษา 2 แท็บ ลองเล่นหนึ่งรอบ — ต้องรู้ว่าของเดิมทำอะไรได้ ก่อนเพิ่มของใหม่
- เปิด coding agent ใน **terminal อีกหน้าต่าง** ที่ root ของ repo (ไม่ต้องเปิด server ซ้ำ agent รันเทสต์ด้วย `npm test` ได้เลย)
- อ่าน `AGENTS.md` สักรอบ — กฎที่ agent อ่านทุก session มีตาราง "ใช้ของที่มีอยู่แล้ว" ที่จะช่วยตอนตัดแผน
- ExperimentalWarning ของ SQLite ตอนรัน = ปกติ ไม่ต้องสนใจ

**ข้อมูลอยู่ใน `data/live-quiz.db`** (SQLite ไฟล์เดียว commit ไว้ใน repo) เล่นแล้วอยากเริ่มใหม่: `npm run reset` หรือ `git checkout data/live-quiz.db`

---

## 2. Warm-up: จำนักศึกษาคนเดิมด้วย token (วิทยากรทำระหว่างบรรยาย)

วิทยากรทำบนจอทีละขั้น เราส่ง prompt ขั้นเดียวกันใน repo ของตัวเองไปพร้อมกัน แล้วเทียบคำตอบของ agent เรากับบนจอ — agent แต่ละเครื่องตอบไม่เหมือนกันเป๊ะ นั่นคือเรื่องปกติ prompt ให้ copy ทุกขั้น รอบนี้โฟกัสที่ **การอ่านแผน** กับ **การ verify**

**ปัญหาตอนนี้:** refresh หน้านักศึกษาแล้วต้องพิมพ์ชื่อใหม่ และถ้าเจ้าของชื่อหลุด คนอื่นพิมพ์ชื่อเดียวกันแล้วได้สถานะของเขาไปเลย (สวมชื่อ) — ลองทำให้เห็นกับตาก่อน

### 2.1 Explore

```text
อ่าน AGENTS.md, src/quiz.ts (join, disconnect) และ public/student.html แล้วอธิบายว่า
(1) ตอนนักศึกษาหลุดหรือ refresh หน้า ระบบจำเขาได้ยังไง
(2) ถ้าคนอื่น join ด้วยชื่อเดียวกันตอนที่เจ้าของชื่อหลุดอยู่ จะเกิดอะไร
ยังไม่ต้องแก้ไฟล์ใด ๆ
```

เช็ค: ต้องบอกว่าจำด้วยชื่ออย่างเดียว, refresh แล้วชื่อหาย, และสวมชื่อคนที่ offline ได้ ถ้าไม่ตรง ให้อ่านใหม่ก่อนไปต่อ

### 2.2 Plan

```text
เสนอแผนให้ระบบจำนักศึกษาคนเดิมได้

Goal: นักศึกษา refresh หน้าแล้วกลับเข้าห้องเป็นคนเดิมเองโดยไม่ต้องพิมพ์ชื่อ และคนอื่นใช้ชื่อของคนที่หลุดไปไม่ได้

Context: join และ disconnect ใน src/quiz.ts, ตาราง students ใน src/db.ts, public/student.html, AC-1.4 ใน docs/01-prd.md, docs/04-adr/ADR-004-sqlite-state.md

Constraints:
- ห้ามเพิ่ม library (ดูตาราง "ใช้ของที่มีอยู่แล้ว" ใน AGENTS.md)
- ห้ามเปลี่ยน event เดิม เพิ่ม field optional ได้
- quiz.ts ต้องยัง pure ไม่ import ws/express
- token เก็บในตาราง students ผ่าน src/db.ts และ localStorage ฝั่ง browser ไม่ต้องมี login, JWT หรือ session library
- token ห้ามไปโผล่ใน message ที่ส่งถึงอาจารย์หรือนักศึกษาคนอื่น
- data/live-quiz.db ที่ commit ไว้ต้องใช้ต่อได้ (เพิ่ม column ด้วย addColumnIfMissing ใน openDb)

Done when:
- join ครั้งแรกได้ token กลับมาใน joined
- join ชื่อเดิมพร้อม token ที่ถูก ได้สถานะเดิม (answered)
- join ชื่อเดิมแต่ token ผิดหรือไม่มี ได้ name_taken แม้เจ้าของจะ offline
- refresh browser แล้วกลับเข้าห้องเองโดยไม่ต้องพิมพ์ชื่อ
- มีเทสต์ใหม่ครอบทุกข้อ, npm test และ npm run typecheck ผ่าน

ยังไม่ต้องแก้ไฟล์ เสนอแผนเป็นข้อ ๆ: ไฟล์ที่จะแก้, message ที่เปลี่ยน, เทสต์ที่จะเพิ่ม/เปลี่ยน แล้วรอผมอนุมัติ
```

อ่านแผนแล้วเช็ค 3 อย่าง:
- **เกินไหม** — ถ้ามี JWT, bcrypt, cookie/session library, ระบบ login หรือไฟล์ใหม่หลายไฟล์ ตอบกลับ:
  ```text
  ตัดให้เหลือแค่ token สุ่มด้วย crypto.randomUUID เก็บเป็นคอลัมน์ในตาราง students และเก็บใน localStorage ฝั่ง browser ไม่ต้องมีระบบ login หรือ library ใหม่ เสนอแผนใหม่
  ```
- **เทสต์เดิม** — เทสต์ที่ join ชื่อเดิมซ้ำโดยไม่ส่ง token จะไม่ผ่านแล้ว (AC-1.4 ใน `test/quiz.test.ts` และ 2 จุดใน `test/persistence.test.ts`) เพราะ requirement เปลี่ยน แก้ได้แค่ให้ส่ง token เข้าไป assertion ต้องเหมือนเดิม นี่คือการแก้เทสต์ที่ถูกต้อง ต่างจาก "แก้เทสต์ให้ผ่าน" — ถ้า agent หยุดถามเรื่องนี้ แปลว่ามันทำถูกตาม AGENTS.md
- **schema** — เทสต์ใช้ db ใน memory ที่สร้างใหม่ทุกครั้ง แต่ `data/live-quiz.db` มีตาราง students อยู่แล้ว `CREATE TABLE IF NOT EXISTS` ไม่เพิ่มคอลัมน์ให้ แผนต้องพูดถึงเรื่องนี้ ไม่งั้นเทสต์ผ่านแต่ server พังตอนรันจริง

agent มักถามกลับก่อนลงมือ คำตอบที่ใช้ได้:
- ชื่อที่มีในตารางแต่ token ยังว่าง (NULL) → คนแรกที่ join ได้ชื่อไปพร้อม token ใหม่
- เทสต์ "refresh แล้วกลับเข้าห้องเอง" → ตรวจด้วยมือ ไม่ต้องเพิ่ม library สำหรับเทสต์ browser
- ต้องเขียน ADR ใหม่ไหม → ไม่ต้อง บันทึกใน LLD พอ
- ต้องไฮไลต์ปุ่มที่เคยเลือกไหม → ไม่ต้อง answered พอ
- token ถูกแต่ server ยังเห็นว่า socket เก่าต่ออยู่ → ได้ name_taken แล้วกด Join ใหม่ / รอ auto-reconnect พอ ไม่ต้องเตะ socket เก่า
- ต้องแก้ docs ไหม → แก้ AC-1.4 ใน docs/01-prd.md และ contract ของ join/joined ใน docs/05-lld.md พอ

### 2.3 Implement

```text
แผนโอเค ลงมือได้
แก้ได้เฉพาะเทสต์เดิมที่ join ชื่อเดิมซ้ำโดยไม่ส่ง token (AC-1.4 ใน test/quiz.test.ts และใน test/persistence.test.ts) ให้ส่ง token เดิมเข้าไป assertion ห้ามเปลี่ยน เทสต์อื่นห้ามแตะ
ชื่อที่ token เป็น NULL ให้คนแรกที่ join ได้ไปพร้อม token ใหม่ / refresh ตรวจด้วยมือ ไม่เพิ่ม library / ไม่ต้องเขียน ADR ใหม่ / answered พอ ไม่ต้องไฮไลต์คำตอบเดิม / token ถูกแต่ socket เก่ายังค้าง = name_taken แล้วลองใหม่ / docs แก้แค่ AC-1.4 + LLD contract
ทำทีละขั้น commit เมื่อแต่ละขั้นผ่าน แล้วรัน npm test กับ npm run typecheck แสดง output จริงให้ดู
```

### 2.4 Verify — ทำเองใน terminal อย่าเชื่อคำว่า "เสร็จแล้ว"

```bash
npm test
npm run typecheck
git diff main --stat
git diff main -- test
```

- [ ] เทสต์ผ่านทั้งหมด typecheck ไม่มี error
- [ ] ในไฟล์เทสต์เดิม มีบรรทัด `-` เฉพาะจุดที่ join ชื่อซ้ำ และเปลี่ยนแค่การส่ง token
- [ ] ลองจริง: หน้าต่างปกติ join เป็น Alice ตอบ 1 ข้อ → refresh → กลับมาเป็น Alice เอง
- [ ] ปิดหน้าต่างนั้น → เปิด **incognito หรือ browser อื่น** พิมพ์ Alice → ต้องได้ `name_taken` (แท็บในหน้าต่างเดียวกันใช้ localStorage ร่วมกัน จะเข้าเป็น Alice เองทันที — นั่นคือถูกแล้ว)
- [ ] devtools → Network → WS: token ไม่อยู่ใน message ที่อาจารย์ได้รับ
- [ ] อ่าน diff: server ตรวจ token เองไหม ถ้า agent แค่จำชื่อใน localStorage แล้ว join ใหม่ ช่องโหว่ยังอยู่ครบ

ผ่านแล้ว commit แล้วไปขั้น 3

---

## 3. เลือก 1 feature

| Feature | ระดับ | แตะส่วนไหน |
|---|---|---|
| A. ตั้งเวลาก่อน publish | กลาง | teacher.html, student.html, quiz.ts, db.ts, messages.ts, server.ts |
| B. อาจารย์เพิ่ม / ลบโจทย์ | กลาง | teacher.html, quiz.ts, db.ts, messages.ts, server.ts |
| C. หน้ารวมคะแนน | ยาก | ทุกชั้น รวม schema |
| D. เลือก Theme | ง่าย | `public/*` เท่านั้น |

ไม่แน่ใจ → เริ่มจาก D (Theme)

แต่ละ feature มีบทครบ 5 ขั้น: **Requirement → Design → Explore → Plan → Implement → Verify** copy prompt ไปส่งทีละขั้น รอ agent ตอบ อ่านคำตอบ แล้วค่อยส่งขั้นถัดไป เรื่องที่ต้องตัดสินใจ ตัดสินไว้ให้แล้วในหัวข้อ "ตัดสินใจไว้แล้ว" และใส่ไว้ใน prompt แล้ว งานของเราคือ **ตรวจว่า agent ทำตามนั้นจริง**

ทุกขั้น ก่อนไปต่อ:
- **Design** — AC ทุกข้อวัดได้ไหม ("ใช้งานง่าย", "สวย" = วัดไม่ได้ แก้เอง), เรื่องที่ไม่ได้ขออยู่ใน "ตัด" ไหม → commit doc ก่อนไปขั้นถัดไป
- **Plan** — มีอะไรที่ doc ไม่ได้ขอ, library ใหม่, หรือรายการ "agent ชอบทำเกิน" ของ feature นั้นไหม → ตัดก่อนอนุมัติ
- **Verify** — รันเองใน terminal อย่าเชื่อคำว่า "เสร็จแล้ว"

<!-- tabs:start -->
### A. ตั้งเวลาก่อน publish

อาจารย์เลือกเวลาต่อข้อ 10–120 วินาที (ค่าเริ่มต้นบน slider = 30) นักศึกษาเห็นนับถอยหลัง และ **server ปิดรับคำตอบเองเมื่อหมดเวลา**

มีสเปกเดิมให้แล้ว: `docs/01-prd.md` FR-6/FR-7, `docs/02-use-cases.md` UC-5, `docs/04-adr/ADR-003-server-authoritative-timer.md`, `docs/05-lld.md` ส่วน Iteration 2

ตัดสินใจไว้แล้ว:
- ค่าเริ่มต้น 30 วินาทีอยู่ที่ UI (slider) เท่านั้น — publish ที่ไม่ส่งเวลา = ไม่มี timer (UC-5 A3) server ไม่มีค่า default
- deadline เก็บเป็นคอลัมน์ `deadline_at` ในตาราง `current` (เพิ่มด้วย `addColumnIfMissing`) → server restart แล้วตั้ง timer ใหม่จากค่าเดิม ถ้าเลยเวลาแล้วปิดทันที
- server มี timer ตัวเดียว `clearTimeout` ทุกครั้งก่อน publish (ทั้งข้อใหม่และข้อเดิมซ้ำ) → timer เก่าไม่ไปปิดข้อใหม่
- `answer` ตัดสินด้วยเวลาเองด้วย (`now >= deadlineAt` → ปฏิเสธ `closed`) ไม่พึ่ง timer อย่างเดียว

ต้องมีเทสต์ฝั่ง server: ใช้ `startServer()` แบบใน `test/server.test.ts` (helper `connect()` อยู่ใน `test/helpers.ts`) กับ `vi.useFakeTimers()` พิสูจน์ว่า server ปิดเองและปฏิเสธคำตอบที่มาช้า — แค่ disable ปุ่มฝั่ง browser ไม่นับ นักศึกษายังส่งผ่าน devtools ได้
fake เฉพาะ `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })` แล้วเดินเวลาด้วย `await vi.advanceTimersByTimeAsync(ms)` — fake ทั้งหมดแล้ว socket ค้าง

agent ชอบทำเกิน: Timer class / map ของ timer หลายตัว (ต้องการแค่ตัวเดียว), grace period, clock sync, ปุ่มปิดก่อนเวลา, ตารางใหม่สำหรับเวลา

#### A1 · Requirement → Design

```text
ช่วยร่าง docs/features/timer.md สำหรับ feature: อาจารย์เลือกเวลาต่อข้อ 10–120 วินาที (slider เริ่มที่ 30) นักศึกษาเห็นนับถอยหลัง และ server ปิดรับคำตอบเองเมื่อหมดเวลา
อ่าน AGENTS.md, docs/01-prd.md (FR-6, FR-7), docs/02-use-cases.md (UC-5), docs/04-adr/ADR-003-server-authoritative-timer.md และ docs/05-lld.md ส่วน Iteration 2 ก่อน สเปกเดิมมีอยู่แล้ว ให้อ้างอิง ไม่ต้องออกแบบใหม่ แล้วร่างหัวข้อ:
- User story 1 ประโยค
- Acceptance criteria 5 ข้อ ทุกข้อต้องทดสอบได้ (ระบุ input และผลที่ต้องได้): publish พร้อมเวลาได้ deadlineAt / เวลานอกช่วง 10–120 ถูกปฏิเสธ / หมดเวลาแล้ว server ส่ง question:closed และ answer ที่มาช้าได้ answer:rejected reason closed / publish ข้อใหม่ก่อนหมดเวลา timer เก่าไม่ปิดข้อใหม่ / server restart ระหว่างนับ deadline เดิมยังอยู่และปิดตรงเวลา
- Edge cases แยก "เก็บ" กับ "ตัด" — ตัด: grace period, clock sync, ปุ่มปิดก่อนเวลา, ต่อเวลา/pause, Timer class
- ไฟล์ที่ต้องแตะ และ field / message ใหม่ (additive ทั้งหมด)
- เทสต์ที่จะเขียน: unit ใน quiz.ts และ server test ด้วย startServer() + vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
- Mini-ADR: deadline เก็บในคอลัมน์ current.deadline_at เพื่อรอด restart และ server มี timer ตัวเดียว — ทางเลือกที่ไม่เอา: เก็บใน memory อย่างเดียว, เริ่มนับใหม่หลัง restart, ตาราง timers แยก พร้อมเหตุผล
ค่าเริ่มต้น 30 วินาทีอยู่ที่ slider เท่านั้น publish ไม่ส่งเวลา = ไม่มี timer
ยาวไม่เกิน 60 บรรทัด ยังไม่ต้องแก้ไฟล์อื่น
```

#### A2 · Explore

```text
อ่าน docs/features/timer.md แล้วอ่าน src/quiz.ts (publish, answer), src/db.ts (ตาราง current, setCurrent), src/server.ts และ test/server.test.ts สรุปกลับมาว่า
(1) ตอนนี้ publish และ answer ทำงานยังไง ตรงไหนต้องเปลี่ยน
(2) ตาราง current เก็บอะไร ต้องเพิ่มคอลัมน์ยังไงให้ data/live-quiz.db เดิมใช้ต่อได้
(3) เทสต์ที่เปิด server จริงเขียนยังไง
ยังไม่ต้องแก้ไฟล์
```

#### A3 · Plan

```text
เสนอแผนทำ feature ตั้งเวลาก่อน publish

Goal: อาจารย์ตั้งเวลา 10–120 วินาทีต่อข้อ นักศึกษาเห็นนับถอยหลัง และ server ปิดรับคำตอบเองเมื่อหมดเวลา แม้ server จะ restart ระหว่างนับ

Context: docs/features/timer.md (AC, Mini-ADR), src/quiz.ts, src/db.ts, src/messages.ts, src/server.ts, public/teacher.html, public/student.html, test/server.test.ts, test/helpers.ts

Constraints:
- ไม่เพิ่ม library (ตาราง "ใช้ของที่มีอยู่แล้ว" ใน AGENTS.md)
- ห้ามเปลี่ยน event เดิม เพิ่ม message / field optional ได้
- ห้ามแก้เทสต์เดิม เพิ่มไฟล์เทสต์ใหม่ได้
- quiz.ts ต้องยัง pure ไม่ import ws/express
- deadline เก็บใน current.deadline_at เพิ่มด้วย addColumnIfMissing ใน openDb ไม่มีตารางใหม่
- setTimeout ตัวเดียวใน server.ts clearTimeout ทุกครั้งก่อน publish
- ค่าเริ่มต้น 30 อยู่ที่ slider เท่านั้น
- ไม่ทำเกิน doc

Done when:
- AC ทุกข้อใน docs/features/timer.md มีเทสต์ (server test ใช้ startServer() + fake timers)
- npm test และ npm run typecheck ผ่าน
- git diff --stat มีเฉพาะไฟล์ที่ระบุใน doc

ยังไม่ต้องแก้ไฟล์ เสนอแผนเป็นข้อ ๆ แล้วรอผมอนุมัติ
```

#### A4 · Implement

```text
แผนโอเค ลงมือได้
เทสต์ server ใช้ vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }) และ await vi.advanceTimersByTimeAsync(ms) / ห้ามแก้เทสต์เดิม / publish ข้อเดิมซ้ำก็ต้อง clearTimeout / ตอน server เริ่ม ถ้ามี deadline ค้างให้ตั้ง timer ใหม่ เลยแล้วปิดทันที
ทำทีละขั้น commit เมื่อขั้นย่อยผ่าน แล้วรัน npm test และ npm run typecheck แสดง output จริง
```

#### A5 · Verify

```bash
npm test
npm run typecheck
git diff main --stat
git diff main -- test       # ต้องไม่มีบรรทัด - ในเทสต์เดิม
```

- [ ] มีเทสต์ที่เปิด server จริงแล้วพิสูจน์ว่า answer ที่มาหลังหมดเวลาได้ `closed`
- [ ] ลองจริง (instance แยก): publish 10 วินาที → นักศึกษาเห็นนับถอยหลัง → หมดเวลาแล้วกดตอบไม่ได้
- [ ] publish 60 วินาที → แก้โค้ดอะไรก็ได้ให้ server restart → นับต่อจากเดิม ไม่เริ่มใหม่
- [ ] publish ข้อ 1 (30 วิ) แล้วรีบ publish ข้อ 2 (60 วิ) → ข้อ 2 ไม่ถูกปิดตอนครบ 30 วิ
- [ ] refresh หน้าอาจารย์ระหว่างนับ / หลังปิด → ยังเห็นเวลาและสถานะปิด

### B. อาจารย์เพิ่ม / ลบโจทย์

อาจารย์เพิ่มและลบโจทย์จากหน้าเว็บ โจทย์เก็บในตาราง `questions` และอยู่รอดหลัง restart

ตัดสินใจไว้แล้ว:
- validate เองใน `quiz.ts` (ไม่ใช้ zod): ข้อความว่างหรือยาวเกิน 200 ตัว, ตัวเลือกน้อยกว่า 2 หรือเกิน 6, ตัวเลือกว่างหรือยาวเกิน 100 ตัว → `error invalid_question` และตารางไม่เปลี่ยน
- **ลบข้อที่กำลังเปิดอยู่ → ปฏิเสธ** `error question_in_use` อาจารย์ต้อง publish ข้ออื่นก่อนแล้วค่อยลบ (ลบได้เลยแล้ว server พังตอนมีคนตอบ)
- id ของโจทย์ใหม่ = `crypto.randomUUID()` ไม่ใช่ max+1 (ลบข้อท้ายแล้วเพิ่มใหม่ id จะชนของเดิม)
- ส่งคำสั่งเพิ่ม/ลบได้เฉพาะ socket ที่เป็นอาจารย์ (เช็คแบบเดียวกับ `publish` ใน `server.ts`)
- อาจารย์ทุกแท็บได้รายการโจทย์ใหม่ทุกครั้งที่เพิ่ม/ลบ และตอน `teacher:join` (หลุดแล้วต่อใหม่โดยไม่ reload ก็ได้รายการล่าสุด)

agent ชอบทำเกิน: REST API แยก, แก้ไข/เรียงลำดับโจทย์, migration framework, ตัวนับ id max+1, modal แทน `confirm()`

#### B1 · Requirement → Design

```text
ช่วยร่าง docs/features/questions.md สำหรับ feature: อาจารย์เพิ่มและลบโจทย์จากหน้าเว็บ โจทย์เก็บในตาราง questions และอยู่รอดหลัง restart
อ่าน AGENTS.md, src/db.ts, src/quiz.ts, src/server.ts, public/teacher.html และ docs/05-lld.md ก่อน แล้วร่างหัวข้อ:
- User story 1 ประโยค
- Acceptance criteria 5 ข้อ ทุกข้อต้องทดสอบได้ (ระบุ input และผลที่ต้องได้): เพิ่มโจทย์แล้วอาจารย์ทุกแท็บเห็นและ publish ได้ทันที / input ไม่ถูกต้องได้ error invalid_question และตารางไม่เปลี่ยน / ลบข้อที่ไม่ได้เปิดอยู่แล้วหายจากรายการ / ลบข้อที่กำลังเปิดได้ error question_in_use และนักศึกษายังตอบได้ / restart แล้วรายการเหมือนเดิม และ socket ที่ไม่ใช่อาจารย์สั่งเพิ่ม/ลบไม่ได้
- กฎ validate: ข้อความว่างหรือเกิน 200 ตัว, ตัวเลือกน้อยกว่า 2 หรือเกิน 6, ตัวเลือกว่างหรือเกิน 100 ตัว เขียนเงื่อนไขเองใน quiz.ts
- Edge cases แยก "เก็บ" กับ "ตัด" — เก็บ: id ใหม่ใช้ crypto.randomUUID ไม่ใช่ max+1, อาจารย์หลุดแล้วต่อใหม่ได้รายการล่าสุดตอน teacher:join — ตัด: แก้ไข/เรียงลำดับโจทย์, REST API, modal แทน confirm()
- ไฟล์ที่ต้องแตะ และ message ใหม่ (additive ทั้งหมด)
- Mini-ADR: ลบข้อที่กำลังเปิดอยู่ → ปฏิเสธด้วย question_in_use — ทางเลือกที่ไม่เอา: ลบได้แล้วเคลียร์ข้อปัจจุบัน, soft delete, ลบได้เลยไม่ตรวจ พร้อมเหตุผล
ยาวไม่เกิน 60 บรรทัด ยังไม่ต้องแก้ไฟล์อื่น
```

#### B2 · Explore

```text
อ่าน docs/features/questions.md แล้วอ่าน src/db.ts (ตาราง questions), src/quiz.ts, src/server.ts (ตรงที่เช็คว่า socket ไหนเป็นอาจารย์) และ public/teacher.html สรุปกลับมาว่า
(1) โจทย์ถูกโหลดและเก็บยังไงตอนนี้
(2) ถ้าแถวของข้อที่กำลังเปิดอยู่หายไป จุดไหนใน quiz.ts จะพัง
(3) หน้าอาจารย์ได้รายการโจทย์มาจากไหน
ยังไม่ต้องแก้ไฟล์
```

#### B3 · Plan

```text
เสนอแผนทำ feature อาจารย์เพิ่ม / ลบโจทย์

Goal: อาจารย์เพิ่มและลบโจทย์จากหน้าเว็บได้ ข้อมูลอยู่รอดหลัง restart และลบข้อที่กำลังเปิดอยู่ไม่ได้

Context: docs/features/questions.md (AC, Mini-ADR), src/db.ts, src/quiz.ts, src/messages.ts, src/server.ts, public/teacher.html, test/server.test.ts, test/helpers.ts

Constraints:
- ไม่เพิ่ม library validate เองใน quiz.ts ไม่ใช้ zod
- ห้ามเปลี่ยน event เดิม เพิ่ม message / field / ErrorReason ได้
- ห้ามแก้เทสต์เดิม เพิ่มไฟล์เทสต์ใหม่ได้
- quiz.ts ต้องยัง pure ไม่ import ws/express
- id ใหม่ใช้ crypto.randomUUID ไม่เปลี่ยน schema ของตาราง questions
- คำสั่งเพิ่ม/ลบรับเฉพาะ socket ที่เป็นอาจารย์
- ลบข้อที่กำลังเปิดอยู่ → error question_in_use
- ไม่ทำเกิน doc

Done when:
- AC ทุกข้อใน docs/features/questions.md มีเทสต์ (เรื่องสิทธิ์ทดสอบผ่าน startServer() + connect())
- npm test และ npm run typecheck ผ่าน
- git diff --stat มีเฉพาะไฟล์ที่ระบุใน doc

ยังไม่ต้องแก้ไฟล์ เสนอแผนเป็นข้อ ๆ แล้วรอผมอนุมัติ
```

#### B4 · Implement

```text
แผนโอเค ลงมือได้
ห้ามแก้เทสต์เดิม / ปุ่มลบใช้ confirm() ของ browser พอ / ปุ่มลบของข้อที่กำลังเปิดให้ disable ไว้ แต่ server ต้องตรวจเองเสมอ / error ให้แสดงเป็นข้อความที่อ่านรู้เรื่อง ไม่ใช่ alert โค้ด error ดิบ
ทำทีละขั้น commit เมื่อขั้นย่อยผ่าน แล้วรัน npm test และ npm run typecheck แสดง output จริง
```

#### B5 · Verify

```bash
npm test
npm run typecheck
git diff main --stat
git diff main -- test       # ต้องไม่มีบรรทัด - ในเทสต์เดิม
```

- [ ] ลองจริง (instance แยก): เพิ่มโจทย์ → publish ได้ → restart → โจทย์ยังอยู่
- [ ] publish ข้อหนึ่งแล้วลองลบข้อนั้น → ถูกปฏิเสธ นักศึกษายังตอบได้ server ไม่พัง
- [ ] ลบข้อท้ายแล้วเพิ่มใหม่ → id ไม่ซ้ำของเดิม
- [ ] เปิดหน้าอาจารย์ 2 แท็บ เพิ่มที่แท็บหนึ่ง → อีกแท็บเห็นด้วย
- [ ] ส่ง input ว่าง / ตัวเลือกตัวเดียว → เห็นข้อความ error อ่านรู้เรื่อง

### C. หน้ารวมคะแนน

แต่ละโจทย์มีเฉลย อาจารย์กดเฉลยเมื่อพร้อม และเห็นคะแนนรวมต่อคนข้ามหลายข้อ **เฉลยต้องไม่ไปถึง browser ของนักศึกษาก่อนอาจารย์กดเฉลย** — เปิด devtools ก็ต้องไม่เห็น

ตัดสินใจไว้แล้ว:
- เฉลยเก็บเป็นคอลัมน์ `correct` ในตาราง `questions` แต่ **ไม่ใส่ใน type `Question`** → `/questions.json` และ message ทุกตัวไม่มีทางหยิบไปได้ ออกจาก server ได้ทางเดียวคือตอนอาจารย์กดเฉลย และไม่ส่งให้หน้าอาจารย์ก่อนเฉลยด้วย (ใครก็ส่ง `teacher:join` ได้)
- คำตอบข้อก่อน ๆ ถูกลบทุกครั้งที่ publish (ตาราง `answers` เก็บแค่ข้อปัจจุบัน) → เพิ่มตารางใหม่ `answer_log` เก็บประวัติ คะแนนคำนวณด้วย SQL ตอนขอ ไม่มีตาราง cache
- หลังเฉลย ตอบข้อนั้นไม่ได้แล้ว (`answer:rejected` reason `revealed`) คนที่ join ทีหลังเห็นเฉลยของข้อปัจจุบัน
- server ส่ง choice ของนักศึกษาคนนั้นกลับใน `joined` (เฉพาะของตัวเอง) → refresh ก่อนเฉลยแล้วยังรู้ว่าตัวเองถูกหรือผิด
- schema: `addColumnIfMissing` + `CREATE TABLE IF NOT EXISTS` / เฉลยของโจทย์เดิม q1–q5 = `1, 1, 1, 0, 1` (index เริ่มที่ 0) ใส่ใน `data/live-quiz.db` เป็น commit แยก
- `docs/01-prd.md` §3 เขียนว่าไม่ทำคะแนน — จดไว้ที่หัว `docs/features/scoreboard.md` ว่า feature นี้ทับข้อนั้น ไม่ต้องแก้ PRD

ต้องมีเทสต์ที่พิสูจน์ว่าเฉลย **ไม่อยู่ใน message ใดที่ถึงนักศึกษา และไม่อยู่ใน `/questions.json`** ก่อนเฉลย

agent ชอบทำเกิน: หน้าใหม่พร้อม route, ตาราง cache คะแนน, ระบบ login อาจารย์, chart library

#### C1 · Requirement → Design

```text
ช่วยร่าง docs/features/scoreboard.md สำหรับ feature: แต่ละโจทย์มีเฉลย อาจารย์กดเฉลยเมื่อพร้อม และเห็นคะแนนรวมต่อคนข้ามหลายข้อ เฉลยต้องไม่ไปถึง browser ของนักศึกษาก่อนอาจารย์กดเฉลย
อ่าน AGENTS.md, src/db.ts, src/quiz.ts, src/server.ts (ดูว่า GET /questions.json ส่งอะไรออกไป), docs/01-prd.md §3 และ docs/05-lld.md ก่อน แล้วร่างหัวข้อ:
- หัวไฟล์: feature นี้ทับ non-goal "ไม่ทำคะแนน" ใน PRD §3 (ไม่ต้องแก้ PRD)
- User story 1 ประโยค
- Acceptance criteria 5 ข้อ ทุกข้อต้องทดสอบได้ (ระบุ input และผลที่ต้องได้): ก่อนเฉลย ไม่มีค่าเฉลยใน message ใดที่ถึงนักศึกษาหรืออาจารย์ และไม่อยู่ใน /questions.json / อาจารย์กดเฉลยแล้วนักศึกษาได้เฉลยและอาจารย์ได้ scoreboard / คะแนนรวมข้ามหลายข้อถูกต้อง รวมคนที่ไม่ได้ตอบ / หลังเฉลยตอบไม่ได้ (reason revealed) และคนที่ join ทีหลังเห็นเฉลย / refresh หน้าอาจารย์หรือ restart server แล้ว scoreboard เท่าเดิม
- Edge cases แยก "เก็บ" กับ "ตัด" — เก็บ: นักศึกษา refresh ก่อนเฉลยแล้วยังรู้ว่าตัวเองถูกหรือผิด (server ส่ง choice ของตัวเองใน joined), โจทย์ที่ยังไม่มีเฉลย — ตัด: หน้าใหม่/route, ตาราง cache คะแนน, login อาจารย์, chart library
- schema: คอลัมน์ questions.correct (addColumnIfMissing) + ตารางใหม่ answer_log (CREATE TABLE IF NOT EXISTS) และใส่เฉลยโจทย์เดิม q1–q5 = 1, 1, 1, 0, 1 เป็น commit แยก
- ไฟล์ที่ต้องแตะ และ message ใหม่ (additive ทั้งหมด)
- Mini-ADR: เฉลยอยู่นอก type Question และออกจาก server ทางเดียวคือตอนกดเฉลย ไม่ส่งให้หน้าอาจารย์ก่อนด้วย — ทางเลือกที่ไม่เอา: ใส่ใน Question แล้วตัดออกตอนส่ง, ส่งไป browser แล้วซ่อนด้วย UI, เก็บใน public/ พร้อมเหตุผล
ยาวไม่เกิน 60 บรรทัด ยังไม่ต้องแก้ไฟล์อื่น
```

#### C2 · Explore

```text
อ่าน docs/features/scoreboard.md แล้วอ่าน src/db.ts, src/quiz.ts, src/messages.ts และ src/server.ts สรุปกลับมาว่า
(1) GET /questions.json และ message question ส่ง field อะไรออกไปบ้าง ถ้าใส่ correct ใน type Question จะรั่วทางไหน
(2) ตาราง answers เก็บอะไร และเกิดอะไรกับมันตอน publish ข้อใหม่
(3) ต้องเพิ่มอะไรใน openDb ให้ data/live-quiz.db เดิมใช้ต่อได้
ยังไม่ต้องแก้ไฟล์
```

#### C3 · Plan

```text
เสนอแผนทำ feature หน้ารวมคะแนน

Goal: อาจารย์กดเฉลยข้อปัจจุบันเมื่อพร้อมและเห็นคะแนนรวมต่อคนข้ามหลายข้อ โดยเฉลยไม่ไปถึง browser ใด ๆ ก่อนกดเฉลย

Context: docs/features/scoreboard.md (AC, Mini-ADR), src/db.ts, src/quiz.ts, src/messages.ts, src/server.ts, public/teacher.html, public/student.html, scripts/reset.ts, test/server.test.ts, test/helpers.ts

Constraints:
- ไม่เพิ่ม library ไม่มีหน้าใหม่ ไม่มี route ใหม่ ไม่มี chart library
- ห้ามเปลี่ยน event เดิม เพิ่ม message / field / reason ได้
- ห้ามแก้เทสต์เดิม เพิ่มไฟล์เทสต์ใหม่ได้
- quiz.ts ต้องยัง pure ไม่ import ws/express
- เฉลยไม่อยู่ใน type Question ไม่ส่งให้ใครจนกว่าอาจารย์กดเฉลย
- ประวัติคำตอบอยู่ในตารางใหม่ answer_log คะแนนคำนวณด้วย SQL ตอนขอ ไม่มีตาราง cache
- schema เพิ่มด้วย addColumnIfMissing / CREATE TABLE IF NOT EXISTS ใน openDb
- ใส่เฉลยโจทย์เดิม q1–q5 = 1, 1, 1, 0, 1 ใน data/live-quiz.db เป็น commit แยก
- npm run reset ต้องล้างประวัติคำตอบและสถานะเฉลยด้วย
- ไม่ทำเกิน doc

Done when:
- AC ทุกข้อใน docs/features/scoreboard.md มีเทสต์ รวมเทสต์ที่ตรวจ raw message ทุกตัวที่นักศึกษาได้รับ และ body ของ /questions.json ว่าไม่มีเฉลยก่อนกดเฉลย
- npm test และ npm run typecheck ผ่าน
- git diff --stat มีเฉพาะไฟล์ที่ระบุใน doc

ยังไม่ต้องแก้ไฟล์ เสนอแผนเป็นข้อ ๆ แล้วรอผมอนุมัติ
```

#### C4 · Implement

```text
แผนโอเค ลงมือได้
ห้ามแก้เทสต์เดิม / เฉลยข้อที่ไม่ใช่ข้อปัจจุบันไม่ได้ / publish ข้อเดิมซ้ำ = เริ่มข้อนั้นใหม่ (ลบคำตอบของข้อนั้นและสถานะเฉลย) / ไม่ส่งคะแนนรายคนให้นักศึกษา / ใส่เฉลยใน data/live-quiz.db เป็น commit แยกจากโค้ด
ทำทีละขั้น commit เมื่อขั้นย่อยผ่าน แล้วรัน npm test และ npm run typecheck แสดง output จริง
```

#### C5 · Verify

```bash
npm test
npm run typecheck
git diff main --stat
git diff main -- test       # ต้องไม่มีบรรทัด - ในเทสต์เดิม
git log --oneline main..    # เฉลยใน data/live-quiz.db ต้องเป็น commit แยก
```

- [ ] ลองจริง (instance แยก): publish → devtools → Network → WS ของนักศึกษา และเปิด `/questions.json` → ไม่มีเฉลย
- [ ] นักศึกษาตอบ → refresh ก่อนเฉลย → อาจารย์กดเฉลย → นักศึกษาเห็นว่าตัวเองถูกหรือผิด
- [ ] หลังเฉลย กดตอบไม่ได้ / เปิดหน้านักศึกษาใหม่ (incognito) join ทีหลัง → เห็นเฉลย
- [ ] เฉลย 2 ข้อขึ้นไป → คะแนนรวมถูก คนที่ไม่ได้ตอบได้ 0
- [ ] refresh หน้าอาจารย์ → scoreboard ยังอยู่

### D. เลือก Theme

ผู้ใช้เลือก theme ได้ทั้งหน้าอาจารย์และหน้านักศึกษา: Minimal (ปัจจุบัน, default), Liquid Glass, Glassmorphism, Claymorphism, Neumorphism และระบบจำที่เลือกไว้

ตัดสินใจไว้แล้ว:
- theme = attribute `data-theme` บน `<html>` + override CSS variable ใน `public/style.css` (Minimal = ค่า `:root` เดิม)
- โค้ดเลือก theme อยู่ใน `public/theme.js` ไฟล์เดียว ใช้ร่วมสองหน้า
- โหลด `theme.js` ใน `<head>` ต่อจาก `style.css` แบบไม่มี `defer` → ตั้ง theme ก่อนหน้าแสดง reload แล้วไม่กะพริบ
- ค่าใน localStorage เสีย หรืออ่านไม่ได้ (throw) → ใช้ Minimal เงียบ ๆ
- AC ตรวจด้วยมือ ไม่เขียนเทสต์

กับดัก: บนพื้นกระจก ตัวอักษรจางจนอ่านไม่ออก โดยเฉพาะปุ่มที่ถูก disable — ต้อง **ดูทุก theme ด้วยตา** ทั้งจอมือถือ (devtools → toggle device) และจอใหญ่ และเลื่อนลงจนสุดหน้า (พื้นหลัง gradient มักไม่เต็มหน้า) ก่อนบอกว่าเสร็จ

agent ชอบทำเกิน: ThemeManager class, ไฟล์ CSS แยกต่อ theme, dark mode, เก็บ theme ที่ server, เขียนเทสต์ให้ CSS

#### D1 · Requirement → Design

```text
ช่วยร่าง docs/features/theme.md สำหรับ feature: ผู้ใช้เลือก theme ได้ทั้งหน้าอาจารย์และหน้านักศึกษา — Minimal (ปัจจุบัน, default), Liquid Glass, Glassmorphism, Claymorphism, Neumorphism และ browser จำที่เลือกไว้
อ่าน AGENTS.md, public/style.css, public/teacher.html และ public/student.html ก่อน แล้วร่างหัวข้อ:
- User story 1 ประโยค
- Acceptance criteria 5 ข้อ ตรวจด้วยมือได้ (ทำอะไร แล้วต้องเห็นอะไร): ไม่เคยเลือก = Minimal / เลือกแล้วเปลี่ยนทันที refresh แล้วยังอยู่ และอีกหน้าก็ได้ theme เดียวกัน / reload แล้วไม่กะพริบเป็น Minimal ก่อน / ค่าใน localStorage เสียแล้วได้ Minimal ไม่มี error / ทุก theme อ่านตัวอักษรและปุ่มที่ disable ออก ทั้งจอ 375px และ ≥1280px เลื่อนจนสุดหน้า
- Edge cases แยก "เก็บ" กับ "ตัด" — ตัด: dark mode, เก็บ theme ที่ server, ThemeManager class, ไฟล์ CSS แยกต่อ theme, เทสต์อัตโนมัติ
- ไฟล์ที่ต้องแตะ: public/style.css, public/theme.js (ใหม่), public/teacher.html, public/student.html — ไม่มี message ใหม่
- Mini-ADR: theme = data-theme บน <html> + override CSS variable ใน style.css โดย theme.js โหลดใน <head> ไม่มี defer — ทางเลือกที่ไม่เอา: ไฟล์ CSS แยกต่อ theme, ตั้ง class ตอน DOMContentLoaded, เก็บ theme ที่ server พร้อมเหตุผล
ยาวไม่เกิน 60 บรรทัด ยังไม่ต้องแก้ไฟล์อื่น
```

#### D2 · Explore

```text
อ่าน docs/features/theme.md แล้วอ่าน public/style.css, public/teacher.html และ public/student.html สรุปกลับมาว่า
(1) CSS variable ตัวไหนที่ theme ต้อง override และต้องเพิ่มตัวไหน
(2) ตรงไหนยังใช้สีตายตัว ไม่ผ่าน variable
(3) ปุ่มที่ disable และพื้นหลังหน้า ตั้งค่าไว้ยังไง
ยังไม่ต้องแก้ไฟล์
```

#### D3 · Plan

```text
เสนอแผนทำ feature เลือก Theme

Goal: ผู้ใช้เลือก theme ได้ 5 แบบทั้งหน้าอาจารย์และหน้านักศึกษา browser จำไว้ และ reload แล้วไม่กะพริบ

Context: docs/features/theme.md (AC, Mini-ADR), public/style.css, public/teacher.html, public/student.html

Constraints:
- แก้เฉพาะ public/* ไม่แตะ server, WebSocket, DB
- ไม่เพิ่ม library ไม่มี class ไม่มีไฟล์ CSS แยกต่อ theme
- public/theme.js ไฟล์เดียวใช้ร่วมสองหน้า โหลดใน <head> ต่อจาก style.css ไม่มี defer
- ค่าใน localStorage เสียหรือ throw → Minimal
- ไม่ทำเกิน doc

Done when:
- AC ทุกข้อใน docs/features/theme.md ผ่านเมื่อตรวจด้วยมือ
- npm test และ npm run typecheck ยังผ่าน
- git diff --stat มีเฉพาะไฟล์ใน public/ และ docs/features/theme.md

ยังไม่ต้องแก้ไฟล์ เสนอแผนเป็นข้อ ๆ แล้วรอผมอนุมัติ
```

#### D4 · Implement

```text
แผนโอเค ลงมือได้ ไม่ต้องเขียนเทสต์ AC ตรวจด้วยมือ ทำทีละขั้น commit เมื่อขั้นย่อยผ่าน แล้วรัน npm test และ npm run typecheck แสดง output จริง
```

#### D5 · Verify

```bash
npm test
npm run typecheck
git diff main --stat
```

- [ ] diff มีเฉพาะ `public/*` และ `docs/features/theme.md`
- [ ] เปิดด้วย instance แยก (ดู "ลองหน้าเว็บโดยไม่ยุ่งกับ server หลัก" ท้ายขั้นนี้) เลือก Claymorphism → refresh → ยังอยู่ และเปิดอีกหน้าก็เป็น Claymorphism
- [ ] devtools → Application → Local Storage แก้ค่า theme เป็น `xxx` → refresh → ได้ Minimal ไม่มี error ใน Console
- [ ] วนครบ 5 theme × 2 หน้า × จอ 375px และจอใหญ่ เลื่อนจนสุดหน้า: ตัวอักษร ปุ่มที่ disable (ตอบแล้ว) และแถบ tally อ่านออก พื้นหลังเต็มหน้า

<!-- tabs:end -->

### ลองหน้าเว็บโดยไม่ยุ่งกับ server หลัก

agent ส่วนใหญ่ทดสอบผ่าน WebSocket แต่ไม่ได้เปิด browser — สิ่งที่การซ้อมเจอบ่อยคือ:
- **refresh หน้าอาจารย์ระหว่างใช้งาน** สถานะบนจอหายไหม (ข้อที่ปิดแล้ว, เฉลยที่กดไปแล้ว)
- **เปิดหน้าอาจารย์ 2 แท็บ** แท็บหนึ่งทำอะไรแล้วอีกแท็บพังไหม
- **ข้อความ error** อ่านรู้เรื่องไหม หรือขึ้นเป็นโค้ดอย่าง `invalid_question`

server หลัก (`npm start`) ใช้ port 3000 และ `data/live-quiz.db` ถ้าอยากลองแยก หรือให้ agent ลองรันจริง ให้ใช้ port และ db ชั่วคราว:

```bash
# macOS / Linux
PORT=3001 DB_PATH=/tmp/live-quiz-try.db npm start
# Windows PowerShell
$env:PORT=3001; $env:DB_PATH="$env:TEMP\live-quiz-try.db"; npm start
```

หยุดด้วย Ctrl+C (หรือ kill ด้วย PID) — อย่าใช้ `pkill` / `killall` เพราะจะฆ่า server หลักไปด้วย
ถ้าใช้ kill: kill PID แล้วเช็คว่า port ว่างจริง (`lsof -i :3001` บน macOS/Linux) ถ้ายังมี process ฟังอยู่ kill PID นั้นด้วย

---

## 4. ทบทวน

**Checklist: agent พลาดแบบไหนบ่อย** — ไล่กับ `git diff main` ของตัวเอง

- [ ] **Hallucinated API** — method หรือ option ที่ไม่มีจริง (compile, รันจริง, เปิด docs เทียบ)
- [ ] **แก้เกิน scope** — diff มีไฟล์ที่ไม่อยู่ใน doc
- [ ] **Over-engineering** — class / layer / ตาราง / หน้าใหม่ ที่งานไม่ต้องการ
- [ ] **เพิ่ม dependency** — `package.json` เปลี่ยน
- [ ] **เทสต์ผ่าน แต่ requirement ผิด** — ลองจริงทุก AC ไม่ใช่แค่ดูเทสต์เขียว
- [ ] **แก้เทสต์เดิมให้ผ่าน** — มีบรรทัด `-` ในเทสต์เดิมไหม มีเหตุผลจาก requirement ไหม
- [ ] **บอกว่าเสร็จ แต่ไม่ได้รัน** — เห็น output จริงหรือยัง
- [ ] **อธิบายได้ทุกไฟล์** — ไฟล์ไหนอธิบายไม่ได้ อย่าเพิ่ง merge

แล้วถามตัวเอง:
1. agent ทำอะไรผิด และเราจับได้ตอนขั้นไหน — **จับได้ = lab สำเร็จ**
2. เพิ่ม rule 1 ข้อใน `AGENTS.md` จากสิ่งที่เจอ ครั้งหน้ามันจะไม่ทำอีก

**ทำต่อที่บ้าน:** ทำ feature ที่เลือกให้จบ หรือเลือก feature ถัดไปจากเมนู แล้วลองใช้ workflow เดียวกันกับ senior project ของตัวเอง

---

## ยังขาดอะไรถึงจะเป็น production grade

แอปนี้ตั้งใจให้เล็กพอสำหรับห้องเรียน 1 ห้องใน LAN ถ้าจะใช้จริงกับคนจำนวนมากบน internet ยังขาด — ลองเลือกสักข้อเป็นโจทย์ต่อด้วย workflow เดียวกัน

| ด้าน | ตอนนี้ | ที่ต้องมีเพิ่ม |
|---|---|---|
| ยืนยันตัวตน | ใครส่ง `teacher:join` ก็เป็นอาจารย์ได้ / นักศึกษายืนยันด้วย token สุ่มอย่างเดียว | login อาจารย์ (หรือ PIN ต่อห้อง), session หมดอายุ, ผูกนักศึกษากับบัญชีมหาวิทยาลัย (SSO) |
| การเชื่อมต่อ | HTTP / WS ธรรมดาใน LAN | HTTPS / WSS, reverse proxy, ตรวจ Origin ของ WebSocket |
| ป้องกันการใช้ผิด | ไม่จำกัดอะไร | rate limit ต่อ IP/ต่อ socket, จำกัดขนาด message, จำนวน connection สูงสุด |
| หลายห้อง | ห้องเดียวต่อ server | room/session id, หลายอาจารย์พร้อมกัน, ปิดห้องเมื่อจบคาบ |
| ข้อมูล | SQLite ไฟล์เดียว commit ใน repo, ไม่มี backup | ฐานข้อมูลแยกจากโค้ด, backup + restore ที่ซ้อมแล้ว, migration แบบมี version |
| ขยายระบบ | process เดียว state อยู่ใน memory คู่กับ db | หลาย instance ต้องมี shared state / pub-sub, health check, graceful shutdown |
| คุณภาพ | unit + integration test | e2e test ใน browser จริง (Playwright), load test (~ห้องละ 200 คน), CI รันเทสต์ทุก PR |
| ส่งขึ้นใช้งาน | `npm start` บนเครื่องอาจารย์ | build เป็น Docker image, config ผ่าน env, deploy pipeline, rollback ได้ |
| สังเกตการณ์ | `console.log` | log แบบมีโครงสร้าง, metrics (จำนวน connection, latency), alert เมื่อ error พุ่ง |
| ความปลอดภัยหน้าเว็บ | ไม่มี header พิเศษ | Content-Security-Policy, escape ข้อความทุกจุดที่แสดงโจทย์/ชื่อ, dependency audit |
| ข้อมูลส่วนบุคคล | เก็บชื่อและคำตอบไม่มีกำหนดลบ | แจ้งวัตถุประสงค์ตาม PDPA, กำหนดระยะเวลาเก็บแล้วลบ, export/ลบข้อมูลเมื่อขอ |
| การเข้าถึง | ธีม minimal อ่านง่ายระดับหนึ่ง | ตรวจ WCAG 2.2 AA, ใช้ keyboard/screen reader ได้, รองรับหลายภาษา |

ข้อสังเกต: เกือบทุกข้อในตารางนี้ agent ช่วยเขียนโค้ดได้ แต่ **การตัดสินใจ** ว่าจะเอาระดับไหน (เช่น ต้องรองรับกี่คน เก็บข้อมูลนานแค่ไหน) ยังเป็นงานของคน

---

## แหล่งเรียนรู้ต่อ

- [AGENTS.md](https://agents.md) — รูปแบบไฟล์กฎโปรเจกต์สำหรับ coding agent
- [Model Context Protocol](https://modelcontextprotocol.io) — ต่อ agent กับระบบอื่น
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) — ความเสี่ยงของระบบที่ใช้ LLM
- docs ทางการของ coding agent ที่ตัวเองใช้ — เรื่องไฟล์กฎ, permission และ plan mode

ติดต่อผู้บรรยาย: i.am@shode.dev
