# ADR-001: ใช้ WebSocket แทน HTTP polling

**Status**: Accepted   **Date**: 2026-10-13   **Owner**: `plan` (architecture mode)
**Supports**: FR-2 (publish ถึง student ทันที), FR-4 (tally สด), FR-7 (question:closed ถึงทุกคนพร้อมกัน)

## Context
Student ต้องรู้ทันทีเมื่อ teacher publish; teacher ต้องเห็น tally ทันทีเมื่อมีคำตอบ ทั้งสองทิศทางเป็น "server push" และ connection อยู่ตลอดคาบ (brief บรรทัด 8) · ~50 clients บน LAN

## Options
| Option | ข้อดี | ข้อเสีย |
|---|---|---|
| A. HTTP short polling ทุก 1–2 s | ง่ายสุด เข้าใจง่าย | 50 clients × 1 req/s ตลอดคาบ, delay ถึง 2 s, ไม่ตรงกับ brief ("stay connected") |
| B. Server-Sent Events + POST สำหรับ answer | push ทิศทางเดียวง่าย | ต้องมี 2 ช่องทาง (SSE ลง + HTTP ขึ้น) ทำให้ reconnect/identity ซับซ้อนขึ้น |
| C. **WebSocket (`ws`)** | 2 ทิศทางช่องเดียว, รู้ว่าใครหลุดจาก `close` event, แสดง concept real-time ให้นักศึกษาชัด | ต้องจัดการ reconnect เอง (ง่ายในกรณีนี้: join ชื่อเดิม) |

## Decision
เลือก **C — WebSocket ด้วย library `ws`** · message เป็น JSON `{type, ...}` ทุกตัว

## Consequences
- (+) latency ต่ำ, code ฝั่ง client เป็น `onmessage` switch เดียว
- (+) `close` event ใช้ update students list ได้ตรง ๆ (FR-5)
- (−) ต้องกำหนด message contract ชัด (→ `05-lld.md`) และ reconnect = join ใหม่ด้วยชื่อเดิม (UC-1 A3)
- (−) ไม่มี HTTP cache/retry ให้ใช้ — ยอมรับได้บน LAN
