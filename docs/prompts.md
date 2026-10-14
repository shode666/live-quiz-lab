# Prompts — ใช้ AI เป็นคู่คิดในแต่ละขั้น SDLC

> หลักการเดียว: **AI เสนอ, คนตัดสิน** · ทุก prompt อ้างเอกสารด้วย path ไม่ paste สรุปเอง

## Part A — หนึ่ง prompt ต่อหนึ่งขั้น

**A1 — PRD: หา gap**
```
อ่าน docs/01-prd.md แล้วหา requirement ที่ขาด ขัดกันเอง หรือ AC ที่ยังทดสอบไม่ได้
ตอบเป็นตาราง: FR | ปัญหา | คำถามที่ควรถามอาจารย์ · ห้ามเสนอ feature ใหม่
```

**A2 — Use cases: หา edge case**
```
จาก docs/02-use-cases.md UC-3 (ตอบคำถาม) ให้ list edge case ที่ยังไม่มีในเอกสาร
เน้น network/timing/duplicate/ลำดับเหตุการณ์สลับกัน · แต่ละข้อบอกว่าควรเป็น reject reason ไหนตาม docs/05-lld.md §3
```

**A3 — HLD: เปรียบเทียบทางเลือก**
```
บริบท: docs/01-prd.md §5 NFR (LAN, ~50 students, เรียบง่ายที่สุด)
ให้ 3 ทางเลือกสำหรับการส่งโจทย์และรับคำตอบแบบ real-time (เช่น polling / SSE / WebSocket)
ตารางเดียว: option | ข้อดี | ข้อเสีย | ความซับซ้อนที่นักศึกษาต้องเข้าใจ · แล้วแนะนำ 1 ข้อพร้อมเหตุผล 2 บรรทัด
```

**A4 — ADR: ร่างหลังตัดสินใจแล้ว**
```
เราตัดสินใจแล้วว่า: state อยู่ใน memory ไม่มี DB ไม่มี auth (ใช้ใน LAN)
ร่าง ADR ตาม template Context / Options / Decision / Consequences
ต้องมีหัวข้อ "Accepted risks" ระบุ state หายเมื่อ restart และไม่มี auth ให้ชัด · ยาวไม่เกิน 1 หน้า
```

**A5 — LLD: ตรวจความสอดคล้อง**
```
ตรวจ docs/05-lld.md เทียบกับ docs/03-hld.md และ docs/04-adr/*.md
หาจุดที่ LLD ขัดกับ HLD/ADR (เช่น quiz.ts import ws, client ตัดสิน deadline เอง)
ตอบเป็นรายการ: ไฟล์:หัวข้อ | ขัดกับอะไร | แก้อย่างไร · ถ้าไม่พบให้บอกว่าไม่พบ ห้ามแต่งเพิ่ม
```

**A6 — Test: ตรวจ coverage ของ AC**
```
เทียบ test plan ใน docs/05-lld.md §6 กับ AC ทั้งหมดใน docs/01-prd.md
AC ไหนยังไม่มี test รองรับ? เสนอชื่อ test case และ input/expected แบบสั้น
```

**A7 — Review: อ่าน diff เทียบ spec**
```
อ่าน diff นี้เทียบ docs/01-prd.md FR-3 และ docs/05-lld.md §4 กฎใน answer
ลำดับการตรวจ reject reason ตรงกับ LLD ไหม? มี behavior ที่ spec ไม่ได้ขอไหม? ตอบสั้น ชี้บรรทัด
```

---

## Part B — Live Demo: Iteration 2 (4 prompts)

template: **Goal · Context · Constraints · Done when**

### B1 — Explore
```
Goal: เข้าใจโค้ด Iteration 1 ก่อนเพิ่มระบบเวลา — ยังไม่แก้อะไร
Context: อ่าน src/quiz.ts, src/server.ts, src/messages.ts, public/student.html, public/teacher.html
  และ docs/03-hld.md, docs/05-lld.md §3–§4
Constraints: ห้ามแก้ไฟล์ · ตอบไม่เกิน 15 บรรทัด
Done when: บอกได้ว่า (1) publish ไหลผ่านฟังก์ชันไหนบ้างจาก socket ถึง student,
  (2) จุดที่ answer ถูกปฏิเสธอยู่ตรงไหน, (3) ที่ไหนเหมาะจะวาง timer โดยไม่ทำให้ quiz.ts รู้จัก socket
```

### B2 — Plan
```
Goal: วางแผนเพิ่ม FR-6, FR-7 (docs/01-prd.md) ตาม docs/04-adr/ADR-003-server-authoritative-timer.md
Context: ใช้ contract ส่วนที่ mark I2 ใน docs/05-lld.md §3 และกฎใน §4 · test ที่ต้องเพิ่มอยู่ใน §6 Iteration 2
Constraints:
  - ห้ามเพิ่ม library ใหม่ (ใช้ setTimeout/clearTimeout ของ Node เท่านั้น)
  - ห้ามเปลี่ยนหรือลบ event ฝั่ง student ที่มีอยู่ (join, answer, joined, question, answer:accepted, answer:rejected, error)
    เพิ่มได้เฉพาะ field optional (deadlineAt) และ event ใหม่ (question:closed) ตาม LLD
  - quiz.ts ต้องยังเป็น pure: รับ now เป็น parameter, timer อยู่ที่ server.ts
  - เพิ่มได้เฉพาะ parameter ใหม่แบบ optional (publish(questionId, opts?), answer(..., now = Date.now()))
    ห้ามเปลี่ยน signature/return type เดิม · test เดิมใน test/quiz.test.ts ต้องผ่านโดยไม่แก้ (docs/05-lld.md §4 กฎ additive)
  - ยังไม่เขียนโค้ด
Done when: ได้แผนเป็นรายการไฟล์ที่จะแก้ + สิ่งที่เปลี่ยนในแต่ละไฟล์ (1–3 บรรทัดต่อไฟล์) + ลำดับการทำ
  โดยเริ่มจาก test ก่อน และระบุว่า test เดิมใน test/quiz.test.ts ต้องผ่านทั้งหมดโดยไม่แก้
```

### B3 — Implement
```
Goal: ทำตามแผนจาก B2 ให้ครบ FR-6, FR-7
Context: แผนจาก B2 · docs/05-lld.md §3 (types I2), §4 (ลำดับกฎ answer: ... -> closed -> already_answered ...), §6 Iteration 2
Constraints: ข้อห้ามเดิมจาก B2 ทั้งหมด (parameter ใหม่ optional เท่านั้น, ไม่แก้ signature เดิม, test เดิมผ่านโดยไม่แก้) ·
  เขียน test ใหม่ใน test/quiz.test.ts ก่อนแล้วค่อยแก้ src ·
  slider ใน teacher.html เป็น <input type="range" min=10 max=120 step=1> ธรรมดา ·
  student.html นับถอยหลังจาก deadlineAt - Date.now() และล็อกปุ่มเมื่อได้ question:closed
Done when: npx vitest run ผ่านทั้งหมด (เดิม + ใหม่) · แสดง output จริง · สรุปไฟล์ที่แก้
```

### B4 — Verify
```
Goal: พิสูจน์ว่า Iteration 2 ตรง AC-6.1, AC-6.2, AC-7.1, AC-7.2, AC-7.3 ใน docs/01-prd.md
Context: โค้ดหลัง B3 · docs/05-lld.md §6 Iteration 2
Constraints: ห้ามแก้ src ในขั้นนี้ ถ้าพบ bug ให้รายงานพร้อมบรรทัด · ห้ามอ้างว่าผ่านโดยไม่มี output
Done when: ตาราง AC | test ที่คุ้ม | ผล (PASS/FAIL พร้อม output จาก vitest) ·
  และตอบคำถามเดียว: ถ้า browser ของ student แสดงเหลือ 2 วินาที แต่ server หมดเวลาแล้ว คำตอบจะเป็นอย่างไร และโค้ดบรรทัดไหนตัดสิน
```
