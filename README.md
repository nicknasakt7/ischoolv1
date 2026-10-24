# iSchool v1

ระบบบริหารโรงเรียนครบวงจร

| โฟลเดอร์              | คืออะไร                                        |
| --------------------- | ---------------------------------------------- |
| `ischoolv1-backend/`  | API: NestJS 12 + Prisma + PostgreSQL           |
| `ischoolv1-frontend/` | เว็บ: Next.js (ยังไม่เริ่ม)                    |
| `packages/contracts/` | Zod schema ที่ backend และ frontend ใช้ร่วมกัน |
| `GLOSSARY.md`         | คำศัพท์ของระบบ ต้องอ่านก่อนตั้งชื่ออะไรก็ตาม   |
| `docs/`               | ADR, แผน backend, การ deploy                   |

## เริ่มใช้งานบนเครื่อง

ต้องมี Node 24 ขึ้นไป, pnpm และ Docker Desktop

```bash
pnpm install
pnpm db:up                                          # Postgres, storage, mail
cp ischoolv1-backend/.env.example ischoolv1-backend/.env
pnpm --filter @ischool/backend db:migrate           # สร้างตาราง
pnpm dev                                            # API ที่ http://localhost:3001
```

| ที่อยู่                            | คืออะไร                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| http://localhost:3001/docs         | เอกสาร API (Swagger)                                        |
| http://localhost:3001/health/ready | เช็คว่า API ต่อ database ได้                                |
| http://localhost:8025              | Mailpit: อีเมลทุกฉบับที่ระบบส่งในเครื่องจะมาอยู่ที่นี่      |
| http://localhost:9001              | หน้าจัดการ storage (user `ischool` / pass `ischool-secret`) |

## เช็คก่อน push

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm test:int
```

`test:int` จะเปิด PostgreSQL ชั่วคราวใน Docker ขึ้นมาเอง ไม่แตะ database ที่ใช้พัฒนา

## ดู database ด้วย DBeaver

1. `pnpm db:up` แล้วรอสักครู่ให้ Postgres พร้อม
2. DBeaver → **Database → New Database Connection → PostgreSQL**
3. กรอก:
   - Host: `localhost`
   - Port: **`5433`** (ไม่ใช่ 5432 เพราะเครื่องมี PostgreSQL ติดตั้งแยกไว้ ใช้พอร์ตคนละตัวจะได้ไม่ต่อผิดตัว)
   - Database: `ischool`
   - Username: `ischool` / Password: `ischool`
4. **Test Connection** (ครั้งแรก DBeaver จะขอโหลด driver ให้กด Download) → **Finish**
5. ตารางอยู่ที่ `ischool → Schemas → public → Tables` ส่วน schema `pgboss` คือคิวงานเบื้องหลัง
