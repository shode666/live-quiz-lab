# PRD — live-quiz (ตัวอย่างสอน)

> task: live-quiz · phase 1a · model requested: fable · model served: Fable 5.1 (claude-fable-5-1)
> source: `/home/claude/outputs/live-quiz/00-brief.md`

## 1. Problem

อาจารย์อยากถามคำถามแบบ multiple choice ระหว่างคาบ แล้วเห็นว่าห้องตอบอะไรบ้าง **ทันที** โดยไม่ต้องใช้บริการภายนอก (ห้องเรียนใช้ LAN) และไม่ต้องให้นักศึกษาติดตั้งอะไร

## 2. Users

| Persona | Job to be done |
|---|---|
| อาจารย์ (teacher) | เตรียมโจทย์ล่วงหน้า → ระหว่างคาบกด publish ทีละข้อ → เห็นผลรวมสด → เห็นว่าใครอยู่ในห้อง |
| นักศึกษา (student) | เปิด browser ใส่ชื่อ → รอโจทย์ → ตอบข้อละครั้ง → รู้ว่าคำตอบถูกรับแล้ว |

## 3. Goals / Non-goals

**Goals**
- G1 นักศึกษา join ได้ภายใน 10 วินาที (เปิด URL + ใส่ชื่อ)
- G2 อาจารย์เห็น tally เปลี่ยนภายใน ~1 วินาทีหลังนักศึกษาตอบ
- G3 โค้ดทั้งระบบอ่านจบในชั่วโมงเดียว (ใช้สอนได้)

**Non-goals** (ไม่ทำ ทั้งสอง iteration)
- ไม่มี login / รหัสห้อง / หลายห้อง
- ไม่มี database, ไม่เก็บประวัติข้ามการรัน server
- ไม่มี leaderboard / คะแนน / ตรวจถูกผิด
- ไม่ deploy บน internet (LAN เท่านั้น)

## 4. Functional Requirements

Legend: **I1** = Iteration 1 (base app) · **I2** = Iteration 2 (ทำสดใน demo)

### FR-1 (I1) Student join ด้วยชื่อ
- AC-1.1 **Given** student เปิด `student.html` **When** ส่งชื่อที่ไม่ว่าง **Then** ได้ `joined` และชื่อปรากฏใน students list ของ teacher
- AC-1.2 **Given** ชื่อว่าง/เกิน 30 ตัวอักษร **When** join **Then** ถูกปฏิเสธด้วย reason `invalid_name`
- AC-1.3 **Given** มี student ชื่อเดียวกัน *ที่ยังต่ออยู่* **When** join ชื่อซ้ำ **Then** ปฏิเสธด้วย `name_taken`
- AC-1.4 **Given** student ชื่อ A หลุด (socket ปิด) **When** A join ใหม่ด้วยชื่อเดิม **Then** ได้สถานะเดิมกลับ (คำตอบที่ส่งไว้ยังอยู่) และได้โจทย์ปัจจุบันถ้ามี

### FR-2 (I1) Teacher publish โจทย์ตาม question id
- AC-2.1 **Given** ตาราง `questions` ใน DB มี id `q3` **When** teacher ส่ง `publish q3` **Then** student ทุกคนที่ต่ออยู่ได้ `question` (text + choices, ไม่มีคำตอบ) และ teacher ได้ `tally` เริ่มต้น (ทุกช่อง 0)
- AC-2.2 **Given** id ไม่มีในไฟล์ **When** publish **Then** teacher ได้ `error` reason `unknown_question`
- AC-2.3 **Given** กำลังมีโจทย์ q3 **When** publish q4 **Then** q4 กลายเป็น current; คำตอบ q3 ที่มาหลังจากนี้ถูกปฏิเสธ (ดู FR-3)

### FR-3 (I1) Student ตอบได้ข้อละ 1 ครั้ง
- AC-3.1 **Given** current = q3 และ student ยังไม่ตอบ **When** ส่ง `answer q3 choice=1` **Then** ได้ `answer:accepted`
- AC-3.2 **Given** student ตอบ q3 แล้ว **When** ส่งอีกครั้ง **Then** `answer:rejected` reason `already_answered` และ tally ไม่เปลี่ยน
- AC-3.3 **Given** current = q4 **When** ส่ง answer ของ q3 **Then** `answer:rejected` reason `not_current_question`
- AC-3.4 **Given** choice index นอกช่วง **When** answer **Then** `answer:rejected` reason `invalid_choice`
- AC-3.5 **Given** ยังไม่ join **When** answer **Then** `answer:rejected` reason `not_joined`

### FR-4 (I1) Teacher เห็น tally สด
- AC-4.1 **Given** current = q3 **When** มี answer ถูกรับ **Then** teacher ได้ `tally` ใหม่ (counts ต่อ choice, answered, total students)
- AC-4.2 **Given** teacher หลุดแล้วต่อใหม่ **When** teacher join **Then** ได้ students list + tally ของ current question ทันที

### FR-5 (I1) Teacher เห็นรายชื่อนักศึกษา
- AC-5.1 **Given** student join/หลุด **When** เหตุการณ์เกิด **Then** teacher ได้ `students` ใหม่ (ชื่อ + สถานะ connected)

### FR-6 (I2) Teacher ตั้งเวลาต่อข้อก่อน publish
- AC-6.1 **Given** teacher เลือก slider 10–120 วินาที **When** publish **Then** student ได้ `question` ที่มี `deadlineAt` (epoch ms จาก server) และหน้า student แสดงนับถอยหลัง
- AC-6.2 **Given** `timeLimitSec` นอกช่วง 10–120 หรือไม่ใช่จำนวนเต็ม **When** publish **Then** teacher ได้ `error` reason `invalid_time_limit`

### FR-7 (I2) Server ปิดรับคำตอบเมื่อหมดเวลา (server-authoritative)
- AC-7.1 **Given** publish q3 limit 30s **When** เวลา server ถึง deadline **Then** ทุก client ได้ `question:closed q3` และคำตอบ q3 หลังจากนั้นถูกปฏิเสธ `closed`
- AC-7.2 **Given** browser ของ student แสดงเวลาเหลือ 2s แต่ server ถึง deadline แล้ว **When** answer มาถึง **Then** ปฏิเสธ `closed` (ไม่เชื่อนาฬิกา client)
- AC-7.3 **Given** q3 ยังไม่หมดเวลา **When** teacher publish q4 **Then** timer ของ q3 ถูกยกเลิก (ไม่มี `question:closed q3` ตามมา) และ q4 เริ่ม timer ของตัวเอง

## 5. NFR

| ด้าน | เป้าหมาย | วิธีวัด |
|---|---|---|
| Simplicity | ≤ ~400 บรรทัด TS ฝั่ง server; ไม่มี framework ฝั่ง frontend | นับบรรทัด, review |
| Concurrency | รองรับ ~50 students ต่อพร้อมกันบน 1 process | ทดสอบเปิด 50 tab/ws client |
| Latency | answer → tally ที่ teacher ≤ 1 s บน LAN | ดูด้วยตา/timestamp ใน log |
| Environment | Node.js 22.13+, รันด้วยคำสั่งเดียว `npm start`, เข้าผ่าน `http://<teacher-ip>:3000` | README |
| Durability | state อยู่ใน SQLite (`data/live-quiz.db`); restart ไม่ทำให้ state หาย, เริ่มคาบใหม่ = `npm run reset` (ADR-004) | — |
| Security | ไม่มี auth; ใช้ใน LAN ห้องเรียนเท่านั้น (**accepted risk**, ADR-002) | — |

## 6. Glossary

| Term | ความหมาย |
|---|---|
| current question | โจทย์ข้อเดียวที่เปิดรับคำตอบอยู่ (มีได้ 0 หรือ 1) |
| tally | จำนวนคำตอบต่อ choice ของ current question |
| publish | teacher สั่งให้โจทย์ข้อหนึ่งเป็น current และส่งให้ทุก student |
| deadlineAt (I2) | เวลา epoch ms ฝั่ง server ที่หยุดรับคำตอบ |

## 7. Open questions

- OQ-1 โจทย์ (ตาราง `questions`) ควรมี field `correct` เพื่อให้ teacher เห็นว่าช่องไหนถูกไหม? (ตอนนี้ไม่ใส่ — ไม่อยู่ใน brief) → ผู้ตัดสิน: อาจารย์เจ้าของคาบ
- OQ-2 เมื่อ student หลุดระหว่างคาบ ควรลบชื่อออกจากรายชื่อ หรือแสดงเป็น "offline"? (ตอนนี้: แสดง offline, ไม่ลบ) → ผู้ตัดสิน: อาจารย์
