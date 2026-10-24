# Backend Roadmap

แผนลำดับงานของ `ischoolv1-backend` คำศัพท์ทั้งหมดอ้างอิงตาม [GLOSSARY.md](../GLOSSARY.md) ส่วนเหตุผลของการตัดสินใจใหญ่อยู่ใน [docs/adr/](./adr/)

แต่ละเฟสส่งมอบได้จริงและมี test ของตัวเองครบ เฟสถัดไปจึงต่อยอดได้โดยไม่ต้องย้อนกลับมาแก้

## MVP

### เฟส 0: ฐานราก ✅ เสร็จแล้ว (24 ต.ค. 2026)

- [x] pnpm workspace + Turborepo: `ischoolv1-backend`, `ischoolv1-frontend`, `packages/contracts`
- [x] NestJS 12 (ESM), Prisma 7.10 (Prisma 8 ยังเป็น RC, ดู ADR 0003), PostgreSQL 18, TypeScript strict
- [x] Docker Compose สำหรับ dev: Postgres (พอร์ต 5433), RustFS (S3 จำลองแทน R2 เพราะ image ของ MinIO ไม่มีให้ใช้แล้ว), Mailpit
- [x] Config: ตรวจ env ด้วย Zod ตอนเริ่ม app ถ้าไม่ครบจะหยุดทันทีและบอกชื่อตัวแปรที่ขาด
- [x] Error ทุกตัวเป็น RFC 9457 Problem Details พร้อม `code` ที่ frontend เอาไปแปลภาษา, validation ผ่าน Zod schema ที่ NestJS 12 รองรับในตัว
- [x] Logging (pino) พร้อม request id, health check (`/health/live`, `/health/ready`), Swagger ที่ `/docs` (ปิดใน production), helmet, CORS
- [x] Vitest: unit test + integration test กับ Postgres และ S3 จริงผ่าน Testcontainers
- [x] `FileStorage` (S3-compatible, signed URL), `JobQueue` (pg-boss), `AuditLogService` + ตาราง `audit_logs`
- [x] Dockerfile ของ backend (ทดสอบ migrate + health ใน container แล้ว)
- [x] CI: format, lint, typecheck, unit test, integration test, build image
- [ ] Seed ข้อมูลตัวอย่าง: มีไฟล์รอไว้แล้ว จะเติมข้อมูลไปทีละเฟส

ข้อตกลงที่ใช้ตั้งแต่เฟส 2: ข้อมูลที่แสดงผล (ชื่อนักเรียน ชื่อวิชา ชื่อโรงเรียน) เก็บทั้งภาษาไทยและอังกฤษ

### เฟส 1: ตัวตนและสิทธิ์ ✅ เสร็จแล้ว (24 ต.ค. 2026)

- [x] Better Auth ที่ `/auth/*`: รหัสผ่าน, session ในฐานข้อมูลส่งผ่าน httpOnly cookie, ปิดการสมัครเอง, rate limit, plugin username (ไว้ให้นักเรียนในเฟส 3)
- [x] Google sign-in เปิดได้ด้วย env (`GOOGLE_CLIENT_ID/SECRET`) และใช้ได้เฉพาะบัญชีที่ถูกเชิญแล้ว (ยังไม่ได้ทดสอบกับ Google จริง)
- [x] คำเชิญ: ลิงก์ตั้งรหัสผ่านอายุ 7 วัน ใช้ได้ครั้งเดียว, ส่งอีเมลผ่านคิว (pg-boss → SMTP) ถ้าส่งไม่ได้จะลองใหม่เอง
- [x] User หนึ่งคนผูกได้หลาย Profile (ตอนนี้มี Staff, Guardian และ Student มาในเฟส 3)
- [x] Staff + Employment Period + Employment Status: พ้นสภาพแล้ว session ทุกเครื่องหลุดทันทีและล็อกอินไม่ได้, รับกลับเข้าทำงานได้โดยประวัติไม่หาย, เปลี่ยนรูปแล้วรูปเก่าถูกลบ
- [x] Role ที่โรงเรียนตั้งเอง + Permission ที่ระบบกำหนด + Role Assignment 3 ขอบเขต (ทั้งโรงเรียน / Learning Area / Grade Level)
- [x] School Owner: มีทุกสิทธิ์รวมถึงสิทธิ์ที่จะเพิ่มในอนาคต, แก้ไขไม่ได้, ต้องเหลืออย่างน้อย 1 คนเสมอ
- [x] Session: staff ไม่ใช้งาน 7 วันต้องล็อกอินใหม่, ผู้ใช้อื่น 30 วัน
- [x] `school:init` สร้างโรงเรียนและเชิญ School Owner คนแรก
- [x] Audit Log ทุกการเปลี่ยนแปลงของ Staff, Role และ Role Assignment
- [ ] `scopeId` ของ Role Assignment ยังไม่ได้ตรวจว่ามีอยู่จริง เพราะตาราง Learning Area และ Grade Level จะมาในเฟส 2
- [ ] บีบอัดรูปตอนอัปโหลด (ตอนนี้จำกัดแค่ JPEG/PNG/WebP ขนาดไม่เกิน 5 MB)

### เฟส 2: ตั้งค่าโรงเรียน

- School settings, Academic Year, Term
- Education Stage, Grade Level, Program, Section
- Learning Area, Course (รหัสวิชา, หน่วยกิต, ประเภท, ช่วงตัดเกรดรายภาคหรือรายปี)
- Grading Scheme + Grade Band + Special Result พร้อมแม่แบบ ลำดับการเลือกใช้: โรงเรียน → Program → ประเภท Course

### เฟส 3: คนและการลงทะเบียน

- Student, Student Status
- Guardian + ความสัมพันธ์ + Payer, เชิญ Guardian
- Enrollment
- Course Offering, Teaching Assignment, Homeroom Assignment

### เฟส 4: อนุมัติและเวลาเรียน

- Approval Request + Approval Chain ที่ตั้งค่าได้ พร้อมแม่แบบสำหรับโรงเรียนเอกชนไทย
- Daily Attendance (ครูประจำชั้น)
- Period Attendance (ครูผู้สอน) + แจ้งเตือนกรณีมาโรงเรียนแต่ไม่เข้าคาบ
- Leave Request ของนักเรียน (Guardian เป็นผู้ยื่น)
- แจ้งเตือนเวลาเรียนใกล้ต่ำกว่า 80%

### เฟส 5: การวัดผล

- Assessment Group + Assessment (ครูตั้งเอง, รวมกันไม่เกิน 100), คัดลอกโครงสร้างคะแนนข้าม Offering
- คะแนนแบบร่างและเผยแพร่ ผู้ปกครองเห็นคะแนนที่เผยแพร่แล้วทันที
- ตัวคำนวณว่า "ต้องได้อีกเท่าไหร่ถึงเกรด X"
- Grade Submission (คะแนนเต็มต้องรวมได้ 100 พอดี) → อนุมัติ → ล็อค, Grade Change Request
- Remediation (ตั้งค่าเกรดสูงสุดหลังแก้และจำนวนครั้งได้)
- GPA (ถ่วงหน่วยกิต, ทศนิยม 2 ตำแหน่ง, แสดง "รอดำเนินการ" ถ้ายังมี Remediation ค้าง)

### เฟส 6: พฤติกรรม

- Conduct Record (ต้องแนบรูปหลักฐานทุกครั้ง ทั้งบวกและลบ) + รายการเหตุผลสำเร็จรูป
- Conduct Score เริ่มที่ 100 และรีเซ็ตทุกปีการศึกษา, แจ้งเตือนเมื่อต่ำกว่าเกณฑ์

### เฟส 7: สิ้นปีและขึ้นปีใหม่

- Year-End Outcome: ระบบเสนอผลจากเกรดและ Remediation แล้วผู้มีสิทธิ์ยืนยัน
- Provisional Enrollment
- Section Placement: คงห้องเดิม, คละตามผลการเรียน, จัดตามผลการเรียน, สุ่ม, จัดเอง
- Year Rollover: ใช้ Teaching Assignment และ Homeroom Assignment ของปีเดิมเป็นค่าเริ่มต้น
- Contact Attempt → ขอจำหน่ายชื่อ → อนุมัติ → Struck Off

### เฟส 8: การเงิน

- Fee Schedule, Invoice (ออกแล้วห้ามแก้), Discount, Scholarship, Waiver
- ออกบิลทั้งโรงเรียนผ่าน job queue
- รับชำระผ่าน PromptPay QR แบบระบุยอด (ผ่าน `PaymentGateway`, จ่ายแล้วระบบรู้ทันที) + โอนเองแนบสลิปแล้วการเงินยืนยัน

### เฟส 9: สื่อสารและเอกสาร

- แจ้งเตือนในเว็บ + อีเมล ผู้ใช้เลือกเองว่าจะรับเรื่องไหน
- ประกาศ, ปฏิทินกิจกรรม
- Document Request (เช่น ปพ.) → แจ้งให้มารับที่ธุรการ
- PDF ใบรายงานผล: แสดงลายเซ็นเมื่อผ่านการอนุมัติแล้ว + QR ตรวจสอบความแท้

## หลัง MVP

| เฟส | เนื้อหา                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------- |
| 10  | AI insights 3 กลุ่ม (ผู้ปกครอง ครู นักเรียน) ผ่าน `InsightGenerator`, ตัดข้อมูลระบุตัวตนก่อนส่ง, เปิดปิดได้ |
| 11  | ตารางเรียน, การบ้านและการส่งงานของนักเรียน                                                                  |
| 12  | Staff Attendance (QR + GPS), ใบลาบุคลากร, Substitute Teaching                                               |
| 13  | รับสมัครนักเรียน (ฟอร์มผู้สนใจ → นักเรียน), ประเมินคุณลักษณะอันพึงประสงค์                                   |
