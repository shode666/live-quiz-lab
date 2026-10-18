# ADR-003: Server เป็นเจ้าของ deadline — client นับถอยหลังเพื่อแสดงผลเท่านั้น

**Status**: Accepted (design สำหรับ feature timer — Iteration 2 เป็นหนึ่งใน lab features; ยังไม่ implement ใน main)   **Date**: 2026-10-13   **Owner**: `plan` (architecture mode)
**Supports**: FR-6, FR-7 (AC-7.1–7.3)

## Context
Iteration 2 เพิ่มเวลาจำกัดต่อข้อ 10–120 s · นาฬิกาเครื่องนักศึกษาไม่ตรงกัน, network มี delay, และ client แก้ JavaScript ได้ · ต้องการให้ "ปิดรับ" ยุติธรรมและตรวจสอบได้จุดเดียว

## Options
| Option | ข้อดี | ข้อเสีย |
|---|---|---|
| A. Client นับเอง แล้วหยุดส่งเมื่อหมดเวลา | ไม่ต้องแก้ server | เชื่อ client ไม่ได้; late answer หลุดเข้ามาได้; clock skew |
| B. Client ส่ง timestamp ของตัวเองมาด้วย ให้ server เทียบ | ง่าย | ยังเชื่อนาฬิกา client อยู่ดี |
| C. **Server คำนวณ `deadlineAt` และตั้ง timer เอง; ตัดสินทุก answer ด้วยเวลา server** | จุดตัดสินเดียว, ไม่สน clock ของ client, test ได้ด้วย `now` ที่ inject | client ต้องแสดงเวลาที่อาจคลาดจาก server เล็กน้อย (ยอมรับได้) |

## Decision
เลือก **C**
- `publish(questionId, opts?)` รับ `timeLimitSec` (และ `now` สำหรับ test) ผ่าน `opts` ที่เป็น optional → คำนวณ `deadlineAt = now + timeLimitSec*1000` เก็บใน `state.current.deadlineAt` และส่งใน `question` — return type ยังเป็น `Outbound[]` เหมือน Iteration 1; `server.ts` อ่าน `state.current?.deadlineAt` เพื่อตั้ง timer
- client ใช้ `deadlineAt - Date.now()` วาดนับถอยหลัง **เพื่อแสดงผลเท่านั้น** และล็อกปุ่มเมื่อได้ `question:closed`
- server มี `setTimeout` เดียวสำหรับ current question; publish ใหม่ต้อง `clearTimeout` ก่อนเสมอ
- `quiz.answer(name, questionId, choice, now = Date.now())` (`now` optional — call site 3 args ของ Iteration 1 ยังใช้ได้) ปฏิเสธด้วย `closed` ถ้า `now >= deadlineAt` หรือ question ถูก mark closed แล้ว — ไม่พึ่ง timer อย่างเดียว (กัน race ระหว่าง timer ยิงกับ message ที่มาพร้อมกัน)

## Consequences
- (+) late answer ถูกปฏิเสธเสมอแม้ browser จะยังโชว์เวลาเหลือ (AC-7.2)
- (+) ยกเลิก timer ตอน publish ใหม่เป็น logic เดียวจุดเดียว (AC-7.3)
- (+) `quiz.ts` ยังเป็น pure: timer อยู่ที่ `server.ts`, กฎอยู่ที่ `quiz.ts` รับ `now` เป็น parameter
- (+) เปลี่ยนแบบ additive เท่านั้น (parameter ใหม่ optional, return type เดิม) → test เดิมบางตัวเช็ค field แบบ exact (`quiz.test.ts:57` เช็ค `Object.keys`, `quiz.test.ts:46`/`persistence.test.ts:22` ใช้ `toEqual`) → เพิ่ม field ใหม่แบบ optional เฉพาะเมื่อมีค่า เช่น `...(d !== undefined && { deadlineAt: d })` ห้ามใส่ `key: undefined`; ไม่ต้องแก้เทสต์เดิมตาม AGENTS.md
- หมายเหตุ: UI ตั้งค่าเริ่มต้น 30 s แต่ server contract คงเดิม — ไม่ส่ง `timeLimitSec` = ไม่มี timer (UC-5 A3)
- (−) ผู้ที่ network ช้ามากอาจเห็นว่ายังเหลือ 1 s แต่ถูกปฏิเสธ → หน้า student ต้องแสดงข้อความ "หมดเวลา" จาก reason `closed` ให้ชัด
- (−) ไม่ทำ clock sync / grace period — ถือว่าเกิน scope การสอน
