# Use Cases — live-quiz

> อ้างอิง FR ใน `01-prd.md`. Actors: **Teacher**, **Student**, **Server**

---

## UC-1 Join ห้อง (FR-1, I1)

**Main flow**
1. Student เปิด `http://<ip>:3000/student.html`
2. ใส่ชื่อ กด Join → browser เปิด WebSocket แล้วส่ง `join {name}`
3. Server บันทึก student, ตอบ `joined`, broadcast `students` ให้ Teacher
4. ถ้ามี current question อยู่ → Server ส่ง `question` ให้ student คนนี้ทันที

**Alternate / edge**
- A1 ชื่อว่างหรือยาวเกิน → `error invalid_name`, ยังไม่ถือว่า join
- A2 ชื่อซ้ำกับคนที่ *ต่ออยู่* → `error name_taken`
- A3 **Reconnect**: ชื่อซ้ำกับคนที่ *หลุดไปแล้ว* → ถือว่าเป็นคนเดิม ผูก socket ใหม่ คำตอบเดิมยังอยู่ (ไม่ตอบซ้ำได้)
- A4 Socket ปิดก่อน join เสร็จ → ไม่มี side effect

## UC-2 Publish โจทย์ (FR-2, I1)

**Main flow**
1. Teacher เปิด `teacher.html` → socket ส่ง `teacher:join` → ได้ `students` + `tally` ปัจจุบัน
2. Teacher เลือก question id จากรายการ (โหลดจาก `GET /questions.json` ซึ่งอ่านจากตาราง `questions`) กด Publish → `publish {questionId}`
3. Server ตั้ง current = question นั้น, เคลียร์คำตอบ, broadcast `question` ให้ทุก student, ส่ง `tally` (ศูนย์) ให้ Teacher

**Alternate / edge**
- A1 id ไม่มี → `error unknown_question`
- A2 publish ข้อเดิมซ้ำ → ถือเป็น re-publish: เคลียร์คำตอบและเริ่มใหม่ (ง่ายที่สุด; บันทึกไว้ให้ชัด)
- A3 Teacher หลุดระหว่างคาบ → students ยังตอบได้; Teacher ต่อใหม่ได้ state เดิม (FR-4 AC-4.2)
- A4 มี Teacher ต่อมากกว่า 1 socket → ทุก socket ที่เป็น teacher ได้ข้อมูลเดียวกัน (ไม่ห้าม, ไม่มี auth)

## UC-3 ตอบคำถาม (FR-3, FR-4, I1)

**Main flow**
1. Student เห็นโจทย์ กดเลือก choice → `answer {questionId, choice}`
2. Server ตรวจ: joined? · questionId == current? · ยังไม่ตอบ? · choice ในช่วง?
3. ผ่าน → บันทึก, ตอบ `answer:accepted`, ส่ง `tally` ใหม่ให้ Teacher; หน้า student ล็อกปุ่ม

**Alternate / edge**
- A1 **Duplicate answer** (กดซ้ำ/เปิด 2 tab ชื่อเดียว) → `answer:rejected already_answered`
- A2 **Answer for non-current question** (Teacher เปลี่ยนข้อไปแล้ว แต่ student ยังเห็นข้อเก่า) → `answer:rejected not_current_question`; browser ควรแสดงโจทย์ใหม่อยู่แล้วเพราะได้ `question` event
- A3 choice นอกช่วง (client ถูกแก้) → `invalid_choice`
- A4 ยังไม่ join → `not_joined`
- A5 Student หลุดหลังตอบแล้ว → คำตอบยังนับใน tally; เมื่อกลับมาด้วยชื่อเดิมจะเห็นว่าตอบแล้ว

## UC-4 ดู tally สด (FR-4, FR-5, I1)

**Main flow**
1. ทุกครั้งที่มี answer ถูกรับ หรือ publish ใหม่ → Server ส่ง `tally {questionId, counts[], answered, total}` ให้ Teacher
2. ทุกครั้งที่ student join/หลุด → Server ส่ง `students [{name, connected}]`

**Edge**
- `total` = จำนวน student ที่เคย join ในคาบ (รวม offline) เพื่อให้ Teacher เห็นว่าใครยังไม่ตอบ

---

## UC-5 (I2) ตั้งเวลาและปิดรับคำตอบอัตโนมัติ (FR-6, FR-7)

**Main flow**
1. Teacher เลื่อน slider 10–120 s แล้ว Publish → `publish {questionId, timeLimitSec}`
2. Server คำนวณ `deadlineAt = now + timeLimitSec*1000`, ตั้ง timer ฝั่ง server, ส่ง `question {..., deadlineAt}` ให้ student
3. หน้า student นับถอยหลังจาก `deadlineAt` (**display only**)
4. เมื่อ timer ยิง → Server mark question closed, broadcast `question:closed {questionId}`; หน้า student ล็อกปุ่ม

**Alternate / edge**
- A1 **Late answer**: answer ของข้อนั้นมาถึงหลัง deadline (แม้ client จะยังเห็นเวลาเหลือ เพราะนาฬิกา/network ต่างกัน) → `answer:rejected closed`
- A2 **Publish ก่อนหมดเวลา**: Teacher publish ข้อถัดไป → Server `clearTimeout` ของข้อเดิมก่อนตั้งใหม่; ไม่มี `question:closed` ของข้อเดิมหลุดออกมาทีหลัง
- A3 `timeLimitSec` ไม่ส่งมา (client เก่า) → publish แบบไม่มีเวลา (พฤติกรรม I1 เดิม) — เพื่อไม่ทำลาย event เดิม
- A4 `timeLimitSec` นอกช่วง → `error invalid_time_limit`
- A5 Student reconnect ระหว่างโจทย์ที่มีเวลา → ได้ `question` พร้อม `deadlineAt` เดิม (ไม่ reset)
- A6 Teacher หลุดระหว่างนับ → timer อยู่ที่ server จึงยังปิดตรงเวลา
