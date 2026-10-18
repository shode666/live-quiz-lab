# live-quiz-lab

> **ทำ workshop:** เปิด [LAB.md](LAB.md) แล้วทำตามทีละขั้นบน branch ของตัวเอง (เช่น `git checkout -b my-lab`)

อ่านแบบสวย ๆ: เปิด http://localhost:3000/lab.html หลัง `npm start`

เว็บ quiz ในห้องเรียน: อาจารย์ publish โจทย์ multiple choice ทีละข้อ นักศึกษาตอบผ่าน browser (WebSocket) และอาจารย์เห็นผลรวมคำตอบสด ตัวอย่างประกอบการบรรยาย "AI-Assisted Software Development: Using AI Agents in Practice"

Stack: Node.js 22.13+, Express, TypeScript, ws, vitest · state อยู่ใน SQLite (`node:sqlite` ในตัว Node ไม่ต้องลง library) ห้องเดียว

## วิธีรัน

```bash
npm install
npm start          # auto-reload, เปิดที่ port 3000 (เปลี่ยนด้วย PORT=4000 npm start)
```

คำสั่งอื่น: `npm test` · `npm run typecheck` · `npm run reset` (ลบ DB = เริ่มคาบใหม่)

ข้อมูลเก็บที่ `data/live-quiz.db` (เปลี่ยนด้วย `DB_PATH=...`) · ตอน Node ใช้ `node:sqlite` อาจพิมพ์ `ExperimentalWarning` ซึ่งไม่เป็นอะไร

## URL

| ใคร | URL |
|---|---|
| อาจารย์ | `http://<ip เครื่องอาจารย์>:3000/teacher.html` |
| นักศึกษา | `http://<ip เครื่องอาจารย์>:3000/student.html` |

ทดสอบบนเครื่องเดียว: ใช้ `localhost` แทน `<ip>`

ตอนเริ่ม server จะพิมพ์ LAN URL (`LAN:`) ของเครื่องอาจารย์ให้ นำไปแจกนักศึกษาได้เลย

โจทย์อยู่ในตาราง `questions` (`id`, `text`, `choices` = JSON array, ไม่มีเฉลย) ของไฟล์ `data/live-quiz.db` ซึ่งถูก commit ไว้ใน repo พร้อมโจทย์ 5 ข้อ ดู/แก้ได้ด้วย `sqlite3 data/live-quiz.db` (ถ้ามี) หรือ `node:sqlite`:

```
node -e "const {DatabaseSync}=require('node:sqlite');console.table(new DatabaseSync('data/live-quiz.db').prepare('SELECT id,text FROM questions').all())"
```

## ข้อควรรู้ (LAN / ไม่มี auth)

- ออกแบบให้ใช้ใน LAN ห้องเรียนเท่านั้น **ไม่มี login** — ใครเปิด `teacher.html` ก็ publish ได้ ห้ามเปิดสู่ internet
- restart server (รวมถึง `npm start` ที่ reload ทุกครั้งที่แก้โค้ด) ไม่ทำให้ state หาย: รายชื่อ นักศึกษา ข้อปัจจุบัน และคำตอบอยู่ใน DB; นักศึกษาที่เปิดหน้าค้างไว้ต้อง reconnect/join ชื่อเดิม
- เริ่มคาบใหม่ = `npm run reset` (ลบ students/answers/current เก็บโจทย์) หรือ `git checkout data/live-quiz.db` เพื่อกลับสู่สถานะตั้งต้น แล้วรัน server ใหม่
- รายละเอียดและเหตุผลอยู่ใน `docs/04-adr/ADR-004-sqlite-state.md`

เอกสาร design ทั้งหมดอยู่ใน `docs/` (เริ่มที่ `01-prd.md` และ `05-lld.md`)
