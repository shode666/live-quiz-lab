# Lab: AI-Assisted Software Development

อ่านแบบสวย ๆ: เปิด http://localhost:3000/lab.html หลัง `npm start`

ใช้ coding agent เพิ่ม feature จริงให้แอป Live Quiz ตั้งแต่ requirement จนถึง verify

- ไม่มีคะแนน ไม่ต้องส่ง ทำไม่เสร็จในห้องก็เอาไปทำต่อที่บ้านได้ ทุกอย่างอยู่ในไฟล์นี้
- สิ่งที่ฝึกคือ **วิธีทำงานกับ agent** ไม่ใช่ปริมาณโค้ด
- **ส่ง prompt ทีละขั้นเอง** อย่าสั่ง "ทำ lab ให้เสร็จ" เพราะ agent ถูกตั้งไว้ให้ปฏิเสธ (ดู AGENTS.md หัวข้อ Workshop) และเราจะไม่ได้ฝึกอะไรเลย

| ขั้น | ทำอะไร | เวลาโดยประมาณ |
|---|---|---|
| 1 | Setup | 5 นาที |
| 2 | Warm-up: ทำ demo ซ้ำเอง (จำนักศึกษาด้วย token) | 15–20 นาที |
| 3 | เลือก feature จากเมนู | 2 นาที |
| 4 | Requirement → Design | 10 นาที |
| 5 | Explore → Plan → Implement → Verify | 20–60 นาที ตามความยาก |
| 6 | ทบทวน | 5 นาที |

ในห้องส่วนใหญ่จะทำได้ถึงขั้น 4 หรือต้นขั้น 5 — ไม่เป็นไร ที่เหลือทำต่อที่บ้านได้

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

## 2. Warm-up: จำนักศึกษาคนเดิมด้วย token

ทำ feature เดียวกับที่ดูใน demo ด้วยมือตัวเอง prompt ให้ copy ทุกขั้น รอบนี้โฟกัสที่ **การอ่านแผน** กับ **การ verify**

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

| Feature | ระดับ | เวลา* | แตะส่วนไหน |
|---|---|---|---|
| A. เลือก Theme | ง่าย | 25–35 นาที | `public/*` เท่านั้น |
| B. ตั้งเวลาก่อน publish | กลาง | 45–70 นาที | teacher.html, student.html, quiz.ts, db.ts, messages.ts, server.ts |
| C. อาจารย์เพิ่ม / ลบโจทย์ | กลาง | 45–60 นาที | teacher.html, quiz.ts, db.ts, messages.ts, server.ts |
| D. หน้ารวมคะแนน | ยาก | 60–90 นาที | ทุกชั้น รวม schema |

\*เวลาจริงจากการซ้อมสำหรับคนที่ใช้ agent ครั้งแรก ไม่แน่ใจ → เริ่มจาก A

### A. เลือก Theme

ผู้ใช้เลือก theme ได้ทั้งหน้าอาจารย์และหน้านักศึกษา: Minimal (ปัจจุบัน, default), Liquid Glass, Glassmorphism, Claymorphism, Neumorphism และระบบจำที่เลือกไว้

จุดที่ต้องตัดสินใจเอง:
- theme ทำด้วยอะไร — `public/style.css` เก็บทุกค่าเป็น CSS variable อยู่แล้ว ลองดูก่อนว่าต้องเพิ่มตัวไหน
- โค้ดเลือก theme ใช้ร่วมสองหน้ายังไงโดยไม่ copy ซ้ำ
- ทำไง reload แล้วไม่กะพริบเป็น Minimal ก่อน (โหลดสคริปต์ตรงไหน)
- ค่าใน localStorage เสียหรือใช้ไม่ได้ → ทำอะไร

กับดัก: บนพื้นกระจก ตัวอักษรจางจนอ่านไม่ออก โดยเฉพาะปุ่มที่ถูก disable — ต้อง **ดูทุก theme ด้วยตา** ทั้งจอมือถือ (devtools → toggle device) และจอใหญ่ และเลื่อนลงจนสุดหน้า (พื้นหลัง gradient มักไม่เต็มหน้า) ก่อนบอกว่าเสร็จ

feature นี้แตะแค่ CSS/JS ฝั่ง browser — AC ตรวจด้วยมือได้ ไม่ต้องเขียนเทสต์ (agent จะถาม ตอบว่า "ตรวจมือ")

agent ชอบทำเกิน: ThemeManager class, ไฟล์ CSS แยกต่อ theme, dark mode, เก็บ theme ที่ server, เขียนเทสต์ให้ CSS

### B. ตั้งเวลาก่อน publish

อาจารย์เลือกเวลาต่อข้อ 10–120 วินาที (ค่าเริ่มต้นบน slider = 30) นักศึกษาเห็นนับถอยหลัง และ **server ปิดรับคำตอบเองเมื่อหมดเวลา**

มีสเปกเดิมให้แล้ว: `docs/01-prd.md` FR-6/FR-7, `docs/02-use-cases.md` UC-5, `docs/04-adr/ADR-003-server-authoritative-timer.md`, `docs/05-lld.md` ส่วน Iteration 2

จุดที่ต้องตัดสินใจเอง:
- ค่าเริ่มต้น 30 วินาที อยู่ที่ UI หรือที่ server (สเปก UC-5 A3: publish ที่ไม่ส่งเวลา = ไม่มี timer)
- server restart ระหว่างนับ (แก้โค้ดแล้ว restart เอง!) → deadline ต้องอยู่ต่อไหม เก็บที่ไหน
- publish ข้อใหม่ก่อนหมดเวลา → timer เก่าต้องไม่ไปปิดข้อใหม่

ต้องมีเทสต์ฝั่ง server: ใช้ `startServer()` แบบใน `test/server.test.ts` (helper `connect()` อยู่ใน `test/helpers.ts`) กับ `vi.useFakeTimers()` พิสูจน์ว่า server ปิดเองและปฏิเสธคำตอบที่มาช้า — แค่ disable ปุ่มฝั่ง browser ไม่นับ นักศึกษายังส่งผ่าน devtools ได้
fake เฉพาะ `vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })` แล้วเดินเวลาด้วย `await vi.advanceTimersByTimeAsync(ms)` — fake ทั้งหมดแล้ว socket ค้าง

agent ชอบทำเกิน: Timer class / map ของ timer หลายตัว (ต้องการแค่ตัวเดียว), grace period, clock sync, ปุ่มปิดก่อนเวลา, ตารางใหม่สำหรับเวลา

### C. อาจารย์เพิ่ม / ลบโจทย์

อาจารย์เพิ่มและลบโจทย์จากหน้าเว็บ โจทย์เก็บในตาราง `questions` และอยู่รอดหลัง restart

จุดที่ต้องตัดสินใจเอง:
- validate อะไรบ้าง (ข้อความว่าง, ตัวเลือกน้อยกว่า 2, ยาวเกิน) — เขียนเงื่อนไขเอง ไม่ใช้ zod
- **ลบข้อที่กำลังเปิดอยู่ได้ไหม** ถ้าได้ ต้องเกิดอะไรกับนักศึกษาที่กำลังตอบ — ถ้าข้ามเรื่องนี้ server จะพัง
- id ของโจทย์ใหม่สร้างยังไงให้ไม่ชนหลังมีการลบ
- ใครส่งคำสั่งเพิ่ม/ลบได้ (`server.ts` รู้อยู่แล้วว่า socket ไหนเป็นอาจารย์)
- หน้าอาจารย์หลุดแล้วต่อใหม่ (ไม่ได้ reload) รายการโจทย์บนจอยังเป็นของเก่าไหม

agent ชอบทำเกิน: REST API แยก, แก้ไข/เรียงลำดับโจทย์, migration framework, ตัวนับ id max+1, modal แทน `confirm()`

### D. หน้ารวมคะแนน

แต่ละโจทย์มีเฉลย อาจารย์กดเฉลยเมื่อพร้อม และเห็นคะแนนรวมต่อคนข้ามหลายข้อ **เฉลยต้องไม่ไปถึง browser ของนักศึกษาก่อนอาจารย์กดเฉลย** — เปิด devtools ก็ต้องไม่เห็น

จุดที่ต้องตัดสินใจเอง:
- เก็บเฉลยไว้ที่ไหนไม่ให้รั่ว — ลองดูว่า `GET /questions.json` ส่งอะไรออกไปบ้าง
- คำตอบของข้อก่อน ๆ ยังอยู่ไหมตอน publish ข้อใหม่ (อ่าน `src/db.ts` ให้ดี) — scoreboard ต้องมีประวัติ
- หลังเฉลยแล้ว ยังตอบได้ไหม / คนที่ join ทีหลังเห็นเฉลยไหม
- นักศึกษารู้ไหมว่าตัวเองตอบถูกหรือผิด (ไม่ใช่แค่เห็นว่าข้อไหนถูก) — แล้วถ้า refresh ก่อนอาจารย์กดเฉลยล่ะ (browser ลืมว่าเลือกข้อไหน server ต้องบอก)
- เปลี่ยน schema แล้ว `data/live-quiz.db` ที่ commit ไว้ต้องทำยังไง
- `docs/01-prd.md` §3 เขียนว่าไม่ทำคะแนน — feature นี้ทับข้อนั้น ให้ agent จดไว้ที่หัว docs/features/scoreboard.md ไม่ต้องแก้ PRD
- โจทย์ใน `data/live-quiz.db` ยังไม่มีเฉลย — ใส่เฉลยเป็น commit แยก (กฎใน AGENTS.md)

ต้องมีเทสต์ที่พิสูจน์ว่าเฉลย **ไม่อยู่ใน message ใดที่ถึงนักศึกษา และไม่อยู่ใน `/questions.json`** ก่อนเฉลย

agent ชอบทำเกิน: หน้าใหม่พร้อม route, ตาราง cache คะแนน, ระบบ login อาจารย์, chart library

---

## 4. Requirement → Design (ก่อนแตะโค้ด)

เขียนไฟล์เดียว `docs/features/<ชื่อ feature>.md` ให้ agent ช่วยร่าง แต่ **เราเป็นคนตัดสิน**:

```text
ช่วยร่าง docs/features/<ชื่อ>.md สำหรับ feature: <ยกคำอธิบาย feature จากด้านบน>
อ่าน AGENTS.md และ docs/ ที่เกี่ยวข้องก่อน แล้วร่างหัวข้อ:
- User story 1 ประโยค
- Acceptance criteria 3–5 ข้อ ทุกข้อต้องทดสอบได้ (ระบุ input และผลที่ต้องได้)
- Edge cases แยก "เก็บ" กับ "ตัด"
- ไฟล์ที่ต้องแตะ และ message ใหม่ (ถ้ามี)
- Mini-ADR 1 เรื่อง: การตัดสินใจที่สำคัญที่สุด พร้อมทางเลือกที่ไม่เอาและเหตุผล
ยาวไม่เกิน 60 บรรทัด ยังไม่ต้องแก้ไฟล์อื่น
```

อ่านแล้วแก้เอง:
- AC ที่ทดสอบไม่ได้ ("ใช้งานง่าย", "สวย") → เขียนใหม่ให้วัดได้
- edge case ที่ไม่ได้ขอ → ย้ายไป "ตัด"
- จุดที่ต้องตัดสินใจในหัวข้อ feature ด้านบน → ต้องอยู่ใน Mini-ADR หรือ edge case ทุกข้อ

commit ไฟล์นี้ก่อนไปขั้นถัดไป

---

## 5. Explore → Plan → Implement → Verify

ขั้นเดียวกับ warm-up แต่คราวนี้เขียน prompt เอง ใช้ไฟล์จากขั้น 4 เป็น Context และ Done when

**Explore**
```text
อ่าน docs/features/<ชื่อ>.md แล้วอ่านเฉพาะโค้ดที่ feature นี้ต้องแตะ สรุปกลับมาว่าตอนนี้ทำงานยังไง และตรงไหนที่ต้องเปลี่ยน ยังไม่ต้องแก้ไฟล์
```

**Plan** — 4 ส่วน:
```text
Goal: <1–2 ประโยค สิ่งที่อยากได้ และปัญหาที่ต้องกัน>
Context: อ่าน docs/features/<ชื่อ>.md (AC, mini-ADR) และไฟล์: <รายชื่อไฟล์จาก doc>
Constraints:
- ไม่เพิ่ม dependency (ตาราง "ใช้ของที่มีอยู่แล้ว" ใน AGENTS.md)
- ห้ามเปลี่ยน event เดิม เพิ่ม message/field ได้
- ห้ามแก้เทสต์เดิมโดยไม่ถาม เพิ่มได้
- data/live-quiz.db ใช้ต่อได้ (schema เปลี่ยน = CREATE TABLE IF NOT EXISTS / addColumnIfMissing ใน openDb)
- <ข้อห้ามเฉพาะ feature เช่น "แก้เฉพาะ public/*", "เฉลยห้ามอยู่ใน type Question">
- ไม่ทำเกิน doc
Done when:
- AC ทุกข้อใน docs/features/<ชื่อ>.md มีเทสต์หรือหลักฐานการรันจริง
- npm test และ npm run typecheck ผ่าน
- git diff --stat มีเฉพาะไฟล์ที่ระบุใน doc
ยังไม่ต้องแก้ไฟล์ เสนอแผนเป็นข้อ ๆ แล้วรอผมอนุมัติ
```

อ่านแผน: มีอะไรที่ doc ไม่ได้ขอไหม มี library ใหม่ไหม มี "agent ชอบทำเกิน" ของ feature นี้ไหม → ตัดก่อนอนุมัติ

agent มักถามกลับ 1–3 ข้อก่อนลงมือ (เช่น ตัวเลข validate, จะแสดงผลแบบไหน, ตรวจ AC ด้วยเทสต์หรือด้วยมือ) — ตอบสั้น ๆ ในบรรทัดเดียวกับที่อนุมัติแผน แล้วไปต่อ อย่าใช้เวลาตรงนี้นาน

**Implement**
```text
แผนโอเค ลงมือได้ ทำทีละขั้น commit เมื่อขั้นย่อยผ่าน แล้วรัน npm test และ npm run typecheck แสดง output จริง
```

**Verify** — รันเอง ไล่ทีละ AC ใน doc:
```bash
npm test
npm run typecheck
git diff main --stat
git diff main -- test       # บรรทัด - ในเทสต์เดิม = ต้องมีเหตุผล
```

ลองหน้าเว็บจริงด้วย (ดูหัวข้อถัดไป) agent ส่วนใหญ่ทดสอบผ่าน WebSocket แต่ไม่ได้เปิด browser — สิ่งที่การซ้อมเจอบ่อยคือ:
- **refresh หน้าอาจารย์ระหว่างใช้งาน** สถานะบนจอหายไหม (ข้อที่ปิดแล้ว, เฉลยที่กดไปแล้ว)
- **เปิดหน้าอาจารย์ 2 แท็บ** แท็บหนึ่งทำอะไรแล้วอีกแท็บพังไหม
- **ข้อความ error** อ่านรู้เรื่องไหม หรือขึ้นเป็นโค้ดอย่าง `invalid_question`

### ลองหน้าเว็บโดยไม่ยุ่งกับ server หลัก

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

## 6. ทบทวน

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
