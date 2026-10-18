# ADR-002: State ใน memory ห้องเดียว ไม่มี database ไม่มี auth

**Status**: Superseded by ADR-004 (state ย้ายไป SQLite; ส่วน "ไม่มี auth" ยังใช้อยู่)   **Date**: 2026-10-13   **Owner**: `plan` (architecture mode)
**Supports**: NFR Simplicity, NFR Environment (`01-prd.md` §5); ทุก FR ใช้ state เดียวนี้

## Context
ใช้ 1 คาบ 1 ห้อง บนเครื่องอาจารย์ใน LAN · ข้อมูลคือชื่อนักศึกษา + คำตอบ (ไม่ใช่คะแนนที่ต้องเก็บ) · เป้าหมายหลักคือโค้ดอ่านง่ายสำหรับการสอน (brief บรรทัด 19–21)

## Options
| Option | ข้อดี | ข้อเสีย |
|---|---|---|
| A. **In-memory object ใน process** | ไม่มี dependency, ไม่มี setup, `quiz.ts` test ได้ตรง ๆ | restart แล้วหาย; scale เกิน 1 process ไม่ได้ |
| B. SQLite file | เก็บข้ามการรันได้ | เพิ่ม dependency + schema + async I/O ให้ต้องสอน, ไม่ตอบโจทย์จริง |
| C. Redis | รองรับหลาย process | over-engineering ชัดเจนสำหรับ 50 คน 1 เครื่อง |

## Decision
เลือก **A** · state เป็น object เดียวใน `src/quiz.ts` · ไม่มี login/room code · identity ของ student = ชื่อที่พิมพ์

## Accepted risks (บันทึกชัด ไม่ซ่อน)
| Risk | ผลกระทบ | เหตุผลที่ยอมรับ |
|---|---|---|
| **State หายเมื่อ restart server** | รายชื่อ + tally ของข้อปัจจุบันหาย; นักศึกษาต้อง join ใหม่ | 1 คาบใช้แล้วทิ้ง; ถ้าต้องการบันทึก ให้ teacher จดจากหน้าจอ |
| **ไม่มี auth / ใครก็เปิด `teacher.html` ได้** | นักศึกษาที่รู้ URL สั่ง publish ได้ | ใช้ใน LAN ห้องเรียน มีอาจารย์อยู่หน้าห้อง; ไม่มีข้อมูลอ่อนไหว |
| **ชื่อปลอม / สวมชื่อคนอื่นตอน reconnect** | ตอบแทนกันได้ | ไม่มีคะแนน ไม่มีผลต่อเกรด |

## Consequences
- (+) `npm start` คำสั่งเดียว, ไม่มี infra
- (+) `quiz.ts` เป็น pure function → vitest ไม่ต้อง mock อะไร
- (−) ห้ามนำไปใช้บน internet หรือกับข้อมูลที่มีผลต่อคะแนนโดยไม่เขียน ADR ใหม่มา supersede ฉบับนี้
