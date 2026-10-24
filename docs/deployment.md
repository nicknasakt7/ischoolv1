# Deployment

หนึ่งโรงเรียนมีหนึ่งชุดระบบ (ดู [ADR 0001](./adr/0001-single-tenant-deployment-per-school.md)) ทุกโรงเรียนใช้ Docker image ชุดเดียวกัน ต่างกันแค่ไฟล์ env และการตั้งค่าในฐานข้อมูล

## Environments

แต่ละ environment เป็นระบบแยกกันคนละชุด มี database ของตัวเองหนึ่งตัว ข้อมูลไม่ sync กัน ตัวแปร `APP_ENV` บอกว่าตอนนี้รันอยู่ environment ไหน (`NODE_ENV` ใช้แค่ `development` / `production` / `test` ตามมาตรฐานของ Node)

| `APP_ENV`    | ใช้ทำอะไร                                                   | App รันที่           | Database                                              | ข้อมูล                |
| ------------ | ----------------------------------------------------------- | -------------------- | ----------------------------------------------------- | --------------------- |
| `local`      | เขียนโค้ดบนเครื่อง                                          | `pnpm dev`           | Postgres ใน Docker (พอร์ต 5433)                       | ข้อมูลทดสอบ / seed    |
| `preview`    | ลอง migration หรือ feature ของ PR ก่อน merge                | build ของ PR         | Neon (branch ต่อ PR)                                  | ข้อมูลทดลอง ลบทิ้งได้ |
| `staging`    | โรงเรียนตัวอย่างไว้สาธิต และเป็นวงแรกของการปล่อยเวอร์ชัน    | VPS                  | Supabase Free (ใช้เฉพาะ Postgres, ปิด Data API)       | seed ข้อมูลสาธิต      |
| `production` | โรงเรียนจริง หนึ่งชุดต่อโรงเรียน เช่น `production/school-a` | DigitalOcean Droplet | DigitalOcean Managed Postgres (สิงคโปร์, ต่อผ่าน VPC) | ข้อมูลจริง            |

ใช้หลายผู้ให้บริการในช่วงนี้เพื่อฝึกใช้งาน ก่อนขายให้หลายโรงเรียนจะเลือกเจ้าหลักเจ้าเดียวสำหรับ `production`

## สิ่งที่หนึ่งโรงเรียน (production) มี

| ส่วน                 | ทำหน้าที่                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `frontend` container | Next.js                                                                                     |
| `backend` container  | NestJS API และ worker ของ pg-boss                                                           |
| Managed PostgreSQL   | ข้อมูลทั้งหมดของโรงเรียน และคิวงาน                                                          |
| R2 bucket `files`    | รูปหลักฐาน รูปนักเรียน PDF ไฟล์งาน (private)                                                |
| R2 bucket `backups`  | `pg_dump` ทุกคืน เก็บ 30 วัน (เข้ารหัส) ไม่ผูก backup ไว้กับผู้ให้บริการ database เจ้าเดียว |
| Caddy                | reverse proxy + HTTPS อัตโนมัติ                                                             |
| โดเมน                | `school-a.<domain>` และ `api.school-a.<domain>` หรือโดเมนของโรงเรียนเอง                     |

Prisma ใช้ connection แบบ direct สำหรับ migrate และแบบ pooler สำหรับ app ถ้าผู้ให้บริการมี pooler

## เมื่อมีหลายโรงเรียน

- ย้าย app ไปบริการ container บน cloud ใน region เอเชีย และให้ database อยู่ที่เดียวกับ app
- เขียนโครงสร้างของแต่ละโรงเรียนเป็น Infrastructure as Code (module เดียว เรียกใช้ซ้ำทีละโรงเรียน)
- ย้าย database ข้ามผู้ให้บริการด้วย `pg_dump` → restore แล้วเปลี่ยน `DATABASE_URL` โค้ดไม่ต้องแก้

## การออกเวอร์ชันใหม่

ใช้ trunk-based development ดู [ADR 0006](./adr/0006-trunk-based-development-with-tag-releases.md)

1. Merge เข้า `main` → deploy ขึ้น `staging` อัตโนมัติ
2. ทดสอบบน `staging` จนพร้อม แล้ว push tag เช่น `v1.3.0` → CI build image ของ backend และ frontend → เก็บไว้ที่ container registry → รอผู้มีสิทธิ์กดอนุมัติใน GitHub environment `production`
3. ปล่อยเป็นวงตามลำดับ: โรงเรียนนำร่อง → ทุกโรงเรียน
4. Script deploy วนทีละโรงเรียน: ดึง image ใหม่ → `prisma migrate deploy` → รีสตาร์ท → เช็ค health
5. ถ้าโรงเรียนไหน health check ไม่ผ่าน ให้หยุดและย้อนกลับเฉพาะโรงเรียนนั้น
