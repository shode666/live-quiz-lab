// helper สำหรับเทสต์ที่เปิด server จริง (ดูตัวอย่างใน server.test.ts)
import WebSocket from 'ws';

// ต่อ ws แล้วเก็บทุกข้อความที่ได้รับไว้ เพื่อให้ next(type) ไม่พลาดข้อความที่มาก่อน
// clients = array ที่เทสต์ใช้ terminate ใน afterEach
export async function connect(server: { port: number }, clients: WebSocket[]) {
  const ws = new WebSocket(`ws://localhost:${server.port}`);
  const inbox: any[] = [];
  const waiting: { type: string; where: (m: any) => boolean; resolve: (m: any) => void }[] = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    const i = waiting.findIndex((w) => w.type === msg.type && w.where(msg));
    if (i >= 0) waiting.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });
  await new Promise((resolve, reject) => ws.once('open', resolve).once('error', reject));
  clients.push(ws);
  return {
    send: (msg: object) => ws.send(JSON.stringify(msg)),
    // รอข้อความชนิด type (และเข้าเงื่อนไข where ถ้าระบุ); ถ้ามาถึงแล้วก็คืนทันที
    next(type: string, where: (m: any) => boolean = () => true): Promise<any> {
      const i = inbox.findIndex((m) => m.type === type && where(m));
      if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
      return new Promise((resolve) => waiting.push({ type, where, resolve }));
    },
  };
}
