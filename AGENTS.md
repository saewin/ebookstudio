# AGENTS.md — Ebook Studio (`ebookStudio`)

> คู่มือมาตรฐานเปิด (Linux Foundation / AAIF) สำหรับ AI Agents ที่ทำงานในโปรเจกต์ `ebookStudio` — เน้นกระชับ ชัดเจน และระบุเฉพาะกฎที่ไม่สามารถเดาได้จากโค้ดโดยตรง

## 1. Identity & Context
- **Project:** Ebook Studio — ระบบครบวงจรสำหรับผู้ประกอบการคนเดียว ประกอบด้วย **Ebook Creator Studio**, **BrainStudio 2.0** (Inbox + P.A.R.A.), และ **Course Studio** (Flagship Workshop: *ฉันนี่แหล่ะประธานบริษัท 2.0 — Unleash Your Mind, Build Your AI Workforce*)
- **Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4

## 2. Workspace Map & Boundaries
- `app/course-studio/` — UI ของ Course Studio (`OutlineTab.tsx`, `SlideDeckTab.tsx`, `SalesLaunchTab.tsx`, `StarterKitTab.tsx`, `TeachingKitTab.tsx`)
- `lib/courseStudioTypes.ts`, `lib/courseStudioSeed.ts`, `lib/courseStudioSlidesSeed.ts`, `lib/courseStudioDb.ts` — Schema, ข้อมูลตั้งต้น, สไลด์, และระบบจัดเก็บคอร์สแบบ JSON
- `lib/brainStudioDb.ts` — สถานะของ BrainStudio 2.0 (Notes ใน P.A.R.A., Focus Tasks, Life Pulse, Decisions)
- **ห้ามแก้หรือ Commit ไฟล์ Runtime / Local-only เหล่านี้เข้า Git เด็ดขาด:**
  - `public/uploads/db/*` (ไฟล์ฐานข้อมูล JSON จริงบนเครื่อง/Production)
  - `bin/`, `public/designcraft/`

## 3. Workflows & Tools
- **Commands:**
  - `npm run dev` — รันเซิร์ฟเวอร์พัฒนา
  - `npm run build` — Build สำหรับ Production
  - `npm run lint` — ตรวจ Lint
  - `npx tsc --noEmit` — ตรวจ TypeScript ทั้งโปรเจกต์ (อนุญาตเฉพาะ error ค้างของ `.next/dev/types/validator.ts` ที่อ้าง route `designcraft` ที่ลบออกไปแล้ว; ไฟล์ใน `app/` และ `lib/` ต้องมี **0 error**)
- **AI Architecture Standard:** ทุกฟีเจอร์ AI ใหม่ในแอปให้ยึด **Universal 4+1 Agent Blueprint** (*Brain · Memory/Context · Tools · Instructions · +1 Guardrails/HITL*) และเริ่มจาก **Anthropic Simplicity First / 5 Workflow Patterns** (*Prompt Chaining · Routing · Parallelization · Orchestrator-Workers · Evaluator-Optimizer*) ก่อนขยายสู่ Agent อิสระเต็มรูปแบบ

## 4. Quality Gates (Production Data Migration Rule)
- **กฎเหล็ก Production State:** บน Production (`ebookstudio.aimar.cloud`) แอปจะอ่านสถานะจริงจาก `public/uploads/db/courses.json` และ `public/uploads/db/brain_studio_state.json` ถ้าไฟล์มีอยู่แล้วจะ **ไม่โหลดค่าใหม่จาก Seed มาทับ**
- ดังนั้นทุกครั้งที่มีการอัปเดตข้อมูล Seed ใน `lib/courseStudioSeed.ts`, `lib/courseStudioSlidesSeed.ts` หรือ `lib/brainStudioDb.ts` **ต้องเขียน Idempotent One-Time Migration** เพิ่มใน `lib/courseStudioDb.ts` หรือ `lib/brainStudioDb.ts` เสมอ เพื่อให้ Production อัปเกรดอัตโนมัติโดยไม่เขียนทับงานที่ผู้ใช้แก้ไขไว้เอง

## 5. Guardrails (Do's & Don'ts)
- **Do:** สื่อสารเป็นภาษาไทยเสมอ ยกเว้นคำสั่งหรือรหัสทางเทคนิคที่กำหนดเป็นภาษาอังกฤษ
- **Do:** รัน `git status -s` ทุกครั้งก่อน Commit และ `git add` เฉพาะไฟล์ที่ตั้งใจแก้ไขจริงเท่านั้น
- **Don't:** ห้ามลบหรือเขียนทับงานที่ผู้ใช้แก้ไขเองใน `courses.json` / `brain_studio_state.json` ห้าม Commit ไฟล์ Secret/`.env` หรือไฟล์ Runtime ใน `public/uploads/db/*`
- **Brand Pen-Name Guardrail (OnePersonCEO / เสวิญ):** ทุกการอ้างอิง เขียนคอนเทนต์ โค้ด หน้าเว็บ E-book คอร์ส หรือสื่อทุกชนิดของ OnePersonCEO **ห้ามระบุชื่อจริง-นามสกุลจริงของผู้ก่อตั้งเด็ดขาด** ให้ใช้นามแฝง **“เสวิญ” (`เสวิญ` / `Saewin`)** เท่านั้น เพราะเป็นสัญลักษณ์แห่งเสรีภาพทางจิตวิญญาณที่ใช้ OnePersonCEO บุกเบิกเสรีภาพ
- **Editorial & Chapter Naming Rule (กฎการตั้งชื่อบทหนังสือและการเชื่อมเนื้อหา):**
  - ชื่อบทต้อง **สั้น กระชับ คม** ทำหน้าที่เป็น **“ร่มใหญ่” (Umbrella Theme)** บอกแก่นหลักของบทในประโยคเดียว (เป้าหมายไม่เกิน ~50–65 ตัวอักษร เช่น `บทที่ 3: สมการกำไรและโครงสร้างธุรกิจในสมอง CEO` หรือ `บทที่ 6: ให้ “สมอง CEO” เฝ้างบยิงแอด 24 ชม. ด้วยมาตรฐานใหม่`)
  - **ห้าม**นำหัวข้อย่อยมาเรียงต่อกันเป็นรายการ หรือใส่วงเล็บคำอธิบายยืดยาวลงในชื่อบท
  - การทำให้บท “ครอบคลุม” ต้องเกิดจากการ **ร้อยเนื้อเรื่องและเขียนประโยคเชื่อมระหว่างหัวข้อข้างในบทให้ผสานกลมกลืนเป็นเรื่องเดียวกัน** ภายใต้ร่มชื่อบทนั้น (ไม่ใช่นำทุกหัวข้อมาแปะไว้บนชื่อบท)
