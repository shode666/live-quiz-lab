# ADR-004: State เก็บใน SQLite (`node:sqlite`)

**Status**: Accepted   **Date**: 2026-10-18   **Supersedes**: ADR-002 (ส่วน state; ส่วน "ไม่มี auth" ยังมีผล)
**Supports**: NFR Durability, NFR Simplicity (`01-prd.md` §5)

## Context
`npm start` (tsx watch) restart server ทุกครั้งที่แก้โค้ด ทำให้รายชื่อ ข้อปัจจุบัน และคำตอบหายระหว่างสอน/ทดลอง · ยังเป็น 1 ห้อง ~50 คน 1 process

## Options
| Option | ข้อดี | ข้อเสีย |
|---|---|---|
| A. In-memory (ADR-002) | ง่ายสุด | restart แล้วหาย |
| B. **`node:sqlite`** (ในตัว Node 22.13+) | ไม่มี dependency เพิ่ม, ไฟล์เดียว, sync API เรียบง่าย | ยัง experimental (มี warning), ต้อง Node 22.13+ |
| C. `better-sqlite3` | เสถียร, API ใกล้เคียง | native dependency ต้อง build/ดาวน์โหลด binary, ผิดกฎ "ห้ามเพิ่ม dependency" |

## Decision
เลือก **B** · `src/db.ts` เป็นที่เดียวที่มี SQL (`CREATE TABLE IF NOT EXISTS`, ไม่มี ORM/migration) · `quiz.ts` รับ db handle, ถือ working copy ใน memory และ write-through ลง DB; โหลดกลับตอนสร้าง · ไฟล์ `data/live-quiz.db` (`DB_PATH` override) **commit อยู่ใน repo** พร้อมโจทย์ในตาราง `questions` (ไม่มี `questions.json`/seed; `journal_mode=DELETE` เป็นไฟล์เดียว) · `connected` รีเซ็ตเป็น false ตอน startup · เริ่มคาบใหม่ = `npm run reset` (ลบ students/answers/current เก็บโจทย์) หรือ `git checkout data/live-quiz.db`

## Accepted risks
| Risk | ผลกระทบ | เหตุผลที่ยอมรับ |
|---|---|---|
| ยังไม่มี auth | ใครรู้ URL ก็ publish ได้ | LAN ห้องเรียน (เหมือน ADR-002) |
| 1 process เท่านั้น | เปิดหลาย process บนไฟล์เดียวกัน state จะไม่ตรงกัน | ใช้ 1 ห้อง 1 เครื่อง |
| `node:sqlite` experimental | API เปลี่ยนได้, พิมพ์ ExperimentalWarning | ใช้ผิว API น้อย (`exec/prepare/run/get/all`) |
| db เป็นไฟล์ binary ใน git | git status แสดง modified หลังรัน | นักศึกษา push ไม่ได้ จึงไม่กระทบ |

## Consequences
- (+) restart/reload ไม่ทำให้ state หาย, test ใช้ `:memory:` ไม่ต้องมีไฟล์
- (−) ต้อง Node 22.13+ · state มี 2 ที่ (memory + DB) ต้องเขียนผ่าน handler เท่านั้น
- ห้ามเพิ่ม ORM/library DB อื่นโดยไม่เขียน ADR ใหม่
