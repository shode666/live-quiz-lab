# Lab Sheet: AI-Assisted Software Development

Workshop 21 ต.ค. 2569 · 11:00–11:40 (40 นาที)

## ก่อนเริ่ม

ทำตามชีตนี้ทีละขั้นได้เองจนจบ ไม่ต้องส่งงาน ทุกคนใช้ repo นี้ (เว็บ quiz ในห้องเรียน: Node.js + TypeScript + WebSocket) แล้วแก้ 1 จุดด้วย workflow 4 ขั้น

ต้องมี:

- laptop ที่มี coding agent (login แล้ว), Node.js 20 ขึ้นไป และ git

ติดตรงไหน ถามเพื่อนข้าง ๆ หรือ copy ข้อความ error ไปถาม agent ของตัวเองก่อน

สั่ง agent ว่า "ทำตาม LAB.md" ไม่ได้นะ — AGENTS.md สั่งให้มันปฏิเสธไว้แล้ว เพราะสิ่งที่ฝึกในวันนี้คือการตัดสินใจของเราระหว่างแต่ละขั้น ให้ส่ง prompt ทีละขั้นเอง

## ทฤษฎีย่อ 1: AI ในแต่ละขั้นของ SDLC

AI ช่วยได้ทุกขั้น แต่บทบาทต่างกัน: ต้นน้ำ AI เป็นคู่คิด ปลายน้ำ AI เป็นคนลงมือ การตัดสินใจทุกขั้นยังเป็นของคน

| ขั้น | AI ช่วยอะไร | คนต้องทำเอง |
| --- | --- | --- |
| PRD | ร่างจากโน้ตประชุม, หาช่องโหว่ของ requirement | ตัดสินใจว่าทำอะไร เพื่อใคร |
| Use cases | แตก flow, หา edge case และ alternate flow | ยืนยันกับผู้ใช้จริง |
| HLD | เสนอทางเลือก architecture 2–3 แบบพร้อม trade-off | เลือกตามข้อจำกัดจริงของทีม |
| ADR | ร่างเหตุผล ข้อดีข้อเสียของทางที่เลือก | ตัดสินใจ และรับผิดชอบผล |
| LLD | ร่าง API contract, schema, sequence | review ความถูกต้องและความเรียบง่าย |
| Implement | เขียนโค้ดและเทสต์ตามแผน | คุม scope, review diff |
| Verify | รันเทสต์, review รอบแรก, สรุปผล | ตัดสินว่าผ่านหรือไม่ |

เอกสารจากฝั่ง Design คือ prompt ที่ดีที่สุดของ agent: PRD และ Use cases → Goal และ Done when, HLD และ ADR → Constraints, LLD → Context ตัวอย่างเอกสารจริงของ repo นี้อยู่ใน [`docs/`](docs/)

## ทฤษฎีย่อ 2: Workflow 4 ขั้น

ทำตามลำดับทุกครั้ง ข้อผิดพลาดที่พบบ่อยที่สุดคือข้ามขั้น 1–2 แล้วสั่ง "ทำเลย" ตั้งแต่ประโยคแรก

1. **Explore** — ให้ agent อ่านโค้ดที่เกี่ยวข้องแล้วสรุปกลับมา ยังไม่ต้องแก้อะไร ถ้าสรุปผิด แก้ความเข้าใจตรงนี้
2. **Plan** — ให้เสนอแผนเป็นข้อ ๆ: ไฟล์ที่จะแก้, เทสต์ที่จะเพิ่ม แล้วรอเราอนุมัติ ตัดส่วนที่เกินจำเป็นออก
3. **Implement** — ลงมือทีละชิ้นเล็ก บน branch แยก commit ทุกครั้งที่ขั้นย่อยผ่าน ถ้าออกทะเลให้ reset แล้วสั่งใหม่
4. **Verify** — รันเทสต์ให้เห็น output จริง แล้วอ่าน diff เองทุกไฟล์ รวมถึงไฟล์เทสต์

กฎข้อเดียวที่ต้องจำ: ถ้าอธิบายไม่ได้ว่าโค้ดทำงานยังไง อย่า merge

## ทฤษฎีย่อ 3: Prompt 4 ส่วน

Prompt ที่ดีมีครบ 4 ส่วน ส่วนที่คนลืมบ่อยที่สุดคือ Done when ถ้าไม่บอก agent จะหยุดเมื่อมันรู้สึกว่าเสร็จ

| ส่วน | ตอบคำถาม | ตัวอย่าง |
| --- | --- | --- |
| Goal | อยากได้อะไร เพื่ออะไร | เพิ่ม rate limit กัน brute force ที่ login |
| Context | ไฟล์ที่เกี่ยว และของที่มีอยู่แล้ว | ดู LoginService, ใช้ Redis ที่มีแล้ว |
| Constraints | ข้อห้าม และขอบเขต | ห้ามแก้ schema, ห้ามเพิ่ม library |
| Done when | รู้ได้ยังไงว่าเสร็จจริง | ผิด 5 ครั้งได้ 429, เทสต์ผ่านหมด |

## Checklist ตอน Verify: agent พลาดแบบไหนบ่อย

ไล่ดูทีละข้อทุกครั้งก่อนบอกว่าเสร็จ

- [ ] **Hallucinated API** — มี method หรือ option ที่ไม่มีใน docs ไหม (compile, รันจริง, เปิด docs เทียบ)
- [ ] **แก้เกิน scope** — diff มีไฟล์ที่ไม่ได้สั่งไหม
- [ ] **เพิ่ม dependency ไม่จำเป็น** — package.json เปลี่ยนไหม
- [ ] **เทสต์ผ่าน แต่ requirement ผิด** — เทสต์ตรวจสิ่งที่เราต้องการจริง หรือแค่สิ่งที่ agent เข้าใจ
- [ ] **แก้เทสต์ให้ผ่าน** — ไฟล์เทสต์เดิมถูกแก้ไหม
- [ ] **บอกว่าเสร็จ แต่ไม่ได้รัน** — เห็น output ของเทสต์จริงหรือยัง
- [ ] **อธิบายได้ทุกบรรทัด** — ถ้ามีบรรทัดที่อธิบายไม่ได้ ถาม agent หรืออย่าเพิ่ง merge

## Step 1: Setup + Explore (8 นาที, 11:02–11:10)

1. Clone repo แล้วรัน:

```bash
git clone https://github.com/shode666/live-quiz-lab.git
cd live-quiz-lab
npm install
npm test
git checkout -b my-lab
```

ผลที่ต้องเห็น: `Tests  18 passed (18)`

2. เปิดอ่าน [`AGENTS.md`](AGENTS.md) — กฎที่ agent อ่านทุก session (repo นี้เขียนไว้ให้แล้ว) ถ้า tool ที่ใช้อ่านไฟล์กฎชื่ออื่น ให้เช็ค docs ของ tool นั้นว่าจะให้อ่าน AGENTS.md ได้ยังไง
3. เปิด coding agent ที่ root ของ repo แล้ว copy prompt **Explore** นี้:

```text
อ่าน AGENTS.md, src/quiz.ts และ src/server.ts แล้วอธิบายว่าตอนนักศึกษา join ห้อง ระบบเช็คชื่อยังไง และใครเป็นคนส่งข้อความกลับผ่าน WebSocket ยังไม่ต้องแก้ไฟล์ใด ๆ
```

4. เช็คคำตอบ ต้องบอกครบ 3 เรื่อง:
    - `join()` ใน src/quiz.ts ตัดช่องว่างหน้า-หลังชื่อ และปฏิเสธชื่อว่างหรือยาวเกิน 30 ตัว
    - ชื่อซ้ำกับคนที่ยังต่ออยู่ได้ `name_taken`
    - quiz.ts ไม่ส่งข้อความเอง แต่คืน `Outbound[]` ให้ server.ts เป็นคนส่ง

ถ้าสรุปไม่ตรง บอก agent ให้อ่านใหม่ก่อนไปต่อ — แก้ความเข้าใจตรงนี้ถูกที่สุด

## Step 2: Plan → Implement → Verify (24 นาที, 11:10–11:34)

**โจทย์:** ตอนนี้ Alice กับ alice join พร้อมกันได้ อาจารย์แยกไม่ออกในรายชื่อ แก้ให้ชื่อที่ต่างกันแค่ตัวพิมพ์เล็ก-ใหญ่ถูกปฏิเสธด้วย `name_taken`

**2.1 Plan** — copy prompt 4 ส่วนนี้:

```text
Goal: นักศึกษาสองคน join ด้วยชื่อที่ต่างกันแค่ตัวพิมพ์เล็ก-ใหญ่ไม่ได้ (เช่น Alice กับ alice) คนที่สองต้องได้ name_taken
Context: กฎชื่ออยู่ใน join() ของ src/quiz.ts เทสต์อยู่ใน test/quiz.test.ts
Constraints: แก้เฉพาะ src/quiz.ts และเพิ่มเทสต์ใหม่ / ห้ามเพิ่ม library / ห้ามแก้เทสต์เดิม / ชื่อที่เก็บและแสดงต้องเป็นตามที่นักศึกษาพิมพ์ ไม่แปลงเป็นตัวเล็ก
Done when: join('Alice') แล้ว join('alice') ได้ name_taken / มีเทสต์ใหม่ครอบกรณีนี้ / npm test และ npm run typecheck ผ่าน
ยังไม่ต้องแก้ไฟล์ เสนอแผนเป็นข้อ ๆ ก่อน
```

อ่านแผนแล้วเช็ค: แก้แค่ src/quiz.ts กับ test/quiz.test.ts ไหม มี library ใหม่ไหม ถ้าแผนใหญ่เกิน (เช่นสร้างไฟล์ helper ใหม่ หรือเก็บชื่อเป็นตัวเล็ก) ตอบกลับไปว่า:

```text
ไม่ต้องสร้างไฟล์ใหม่ เช็คซ้ำด้วย toLowerCase() ใน join() จุดเดียว เก็บชื่อตามที่พิมพ์เหมือนเดิม
```

**2.2 Implement** — แผนโอเคแล้ว copy:

```text
แผนโอเค ลงมือได้ แล้วรัน npm test กับ npm run typecheck ให้ผ่าน แสดง output จริงให้ดู
```

**2.3 Verify** — รันเองใน terminal อย่าเชื่อแค่คำว่า "เสร็จแล้ว":

```bash
npm test
npm run typecheck
git diff
```

ผลที่ต้องเห็น:

- [ ] `Tests  19 passed (19)` หรือมากกว่าถ้า agent เพิ่มหลายเทสต์
- [ ] typecheck ไม่มี error
- [ ] diff แก้แค่ src/quiz.ts กับ test/quiz.test.ts
- [ ] ในไฟล์เทสต์มีแต่บรรทัด `+` (เทสต์เดิมไม่ถูกแก้)
- [ ] ลองของจริง: `npm run dev` เปิด http://localhost:3000/student.html 2 แท็บ join เป็น Alice กับ alice — แท็บที่สองต้องขึ้น `name_taken`

ผ่านครบแล้ว commit:

```bash
git add -A
git commit -m "fix: reject names that differ only by case"
```

## Step 3: ตรวจตัวเอง (6 นาที, 11:34–11:40)

ไม่ต้องส่ง ใช้เช็คกับตัวเองว่าคุม agent ได้จริง

1. ไล่ Checklist ตอน Verify ด้านบนกับ `git diff main` ของตัวเองทีละข้อ
2. นึกทวนว่า agent ทำอะไรผิดบ้าง และจับได้ตอนขั้นไหน — จับได้ = ทำ lab นี้สำเร็จ
3. เพิ่ม rule 1 ข้อใน AGENTS.md จากสิ่งที่ agent ทำพลาดวันนี้ (ไม่พลาดเลยก็ข้ามได้)

เสร็จเร็ว ลองต่อ:

- เปิด session ใหม่ ให้ agent review `git diff main` แบบไม่เห็นเหตุผลเดิม แล้วดูว่าเจออะไรเพิ่มไหม
- ใช้ workflow 4 ขั้นเดียวกันกับ repo ของตัวเอง 1 งานเล็ก ๆ

## แหล่งเรียนรู้ต่อ

- [AGENTS.md](https://agents.md) — รูปแบบไฟล์กฎโปรเจกต์สำหรับ coding agent
- [Model Context Protocol](https://modelcontextprotocol.io) — ต่อ agent กับระบบอื่น มีหัวข้อ security best practices
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) — ความเสี่ยงหลักของระบบที่ใช้ LLM (2025)
- docs ทางการของ coding agent ที่ตัวเองใช้ — ดูเรื่องไฟล์กฎ, permission และ plan mode

ติดต่อผู้บรรยาย: i.am@shode.dev
