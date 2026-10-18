// เริ่มคาบใหม่: ลบ students / answers / current (เก็บ questions) ใน DB_PATH หรือ data/live-quiz.db
import { DEFAULT_DB_PATH, openDb } from '../src/db';

const file = process.env.DB_PATH || DEFAULT_DB_PATH;
const db = openDb(file);
db.exec('DELETE FROM answers; DELETE FROM current; DELETE FROM students;');
db.close();
console.log(`reset: ${file}`);
