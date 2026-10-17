# live-quiz-lab

> **ทำ workshop:** เปิด [LAB.md บน branch solution](https://github.com/shode666/live-quiz-lab/blob/solution/LAB.md) แล้วทำตามทีละขั้นบน branch `main` — อย่า checkout `solution` จนกว่าจะทำเสร็จ เพราะมีเฉลยอยู่

เว็บ quiz ในห้องเรียน: อาจารย์ publish โจทย์ multiple choice ทีละข้อ นักศึกษาตอบผ่าน browser (WebSocket) และอาจารย์เห็นผลรวมคำตอบสด ตัวอย่างประกอบการบรรยาย "AI-Assisted Software Development: Using AI Agents in Practice"

Stack: Node.js 20+, Express, TypeScript, ws, vitest · state อยู่ใน memory ห้องเดียว ไม่มี database

## วิธีรัน

```bash
npm install
npm start          # เปิดที่ port 3000 (เปลี่ยนด้วย PORT=4000 npm start)
```

คำสั่งอื่น: `npm run dev` (auto-reload) · `npm test` · `npm run typecheck`

## URL

| ใคร | URL |
|---|---|
| อาจารย์ | `http://<ip เครื่องอาจารย์>:3000/teacher.html` |
| นักศึกษา | `http://<ip เครื่องอาจารย์>:3000/student.html` |

ทดสอบบนเครื่องเดียว: ใช้ `localhost` แทน `<ip>`

ตอนเริ่ม server จะพิมพ์ LAN URL (`LAN:`) ของเครื่องอาจารย์ให้ นำไปแจกนักศึกษาได้เลย

แก้โจทย์ที่ `questions.json` (รูปแบบ `{ "id", "text", "choices": [...] }`, ไม่มีเฉลย)

## ข้อควรรู้ (LAN / ไม่มี auth)

- ออกแบบให้ใช้ใน LAN ห้องเรียนเท่านั้น **ไม่มี login** — ใครเปิด `teacher.html` ก็ publish ได้ ห้ามเปิดสู่ internet
- restart server = เริ่มคาบใหม่ (state หายหมด)
- รายละเอียดและเหตุผลอยู่ใน `docs/04-adr/ADR-002-in-memory-state.md`

เอกสาร design ทั้งหมดอยู่ใน `docs/` (เริ่มที่ `01-prd.md` และ `05-lld.md`)
