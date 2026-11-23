# OnePersonCEO Smart Broadcaster v2.0 (Chrome Extension)

Chrome Extension (Manifest V3) เฉพาะเพจ **OnePersonCEO (เสวิญ)** ที่ยกระดับการบรอดแคสต์ให้เหนือกว่าเครื่องมือเลื่อนหน้าจอ DOM ทั่วไป ด้วย **Official Meta Graph API v21.0 + IndexedDB CDP + Segment (RFM · RSV · Customer 360) + ตั้งเวลาทองรายบุคคล**

## จุดเด่นที่เหนือกว่า Broadcaster ทั่วไป
1. **Cursor Pagination API (`GET /{page-id}/conversations`):** ดึงรายชื่อแชทเก่าพร้อม **PSID ตรงตัว** ได้หลักหมื่นถึงแสนคนในไม่กี่นาทีโดยไม่ต้องเลื่อน Scroll หน้าจอ DOM และสามารถกดพัก/ทำต่อจาก Cursor เดิมได้ตลอด
2. **High-Scale IndexedDB CDP (`OnePersonCEO_CDP_v2`):** จัดเก็บข้อมูลลูกค้าและคิวส่งนับแสนรายการในเครื่องได้ลื่นไหล ไม่มีปัญหา Quota 10MB เต็ม
3. **ผสาน Customer 360 + RFM + RSV อัตโนมัติ:** นำเข้าไฟล์ CSV/JSON ยอดซื้อย้อนหลังเพื่อจับคู่กับลูกเพจ แบ่งกลุ่ม:
   - **RFM:** `Champions`, `Loyal`, `Potential Loyalist`, `At Risk`, `Hibernating`, `Warm Lead`, `Cold Lead`
   - **RSV (รอบซื้อซ้ำ):** `Due Now` (ครบกำหนดซื้อซ้ำ), `Upcoming`, `Overdue`, `Fresh`, `Prospect`
   - **กราฟชั่วโมงทอง 24 ชั่วโมง (Asia/Bangkok):** คลิกดูและกรองลูกค้าตามช่วงเวลาที่แต่ละคนมักสั่งซื้อหรือทักแชท
4. **Dynamic Copy แยกข้อความตาม Segment:** ส่งแคมเปญเดียวแต่ปรับบทพูดอัตโนมัติตาม `{segment}`, `{rsv_stage}`, `{last_product}`, `{preferred_time}`, `{ltv}` พร้อม Spintax กันแบน
5. **2 โหมดการยิงอัจฉริยะ:**
   - **⚡ Batch Queue:** แบ่งส่งเป็นชุดละ 500–5,000 คน พร้อมแถบสี เขียว/แดง/เทา และสรุปสาเหตุที่ส่งไม่สำเร็จ (เช่น `#10` เกินหน้าต่าง 24 ชม., `#551` บล็อกเพจ, `#613` Rate Limit) + Export รายชื่อที่พลาดเป็น CSV
   - **🕒 Per-Person Send-Time Optimization:** ส่งหาลูกค้าแต่ละคนตาม **เวลาทองเฉพาะรายบุคคล** ผ่าน Background Scheduler (`chrome.alarms`) พร้อม **Quiet Hours Guardrail** (เช่น ห้ามส่ง 22:00–08:00 น. ตามเวลาไทย)
6. **โหมด Inbox เดิม (v1.0.2 DOM Mode):** ยังคงใช้งานสแกนหน้า `business.facebook.com` และ Safe Draft ได้ครบถ้วนในแท็บ 5

## คอลัมน์ที่รองรับในไฟล์ Customer 360 (CSV / JSON)
รองรับหัวตารางทั้งภาษาอังกฤษและภาษาไทย:
- `psid` (หรือ `fb_psid`, `facebook_id`)
- `name` (หรือ `customer_name`, `ชื่อ`, `ชื่อลูกค้า`)
- `order_count` (หรือ `orders`, `จำนวนออเดอร์`)
- `total_spent` (หรือ `ltv`, `ยอดซื้อ`, `ยอดซื้อสะสม`)
- `last_order_date` (หรือ `วันที่สั่งล่าสุด` รูปแบบ `YYYY-MM-DD`)
- `order_time` (หรือ `เวลาที่สั่ง` เช่น `20:15` หรือ `19,20`)
- `cycle_days` (หรือ `รอบซื้อซ้ำ` ค่าเริ่มต้น `30` วัน)
- `last_product` (หรือ `สินค้าล่าสุด`)
- `marketing_token` (สำหรับโหมด `MARKETING_MESSAGES`)

> **หมายเหตุ:** สามารถกดปุ่ม **"📄 ดาวน์โหลดตัวอย่าง CSV"** หรือ **"✨ โหลดข้อมูลจำลอง 240 คน (Demo CDP)"** ในแท็บ 1 เพื่อทดสอบระบบทั้งหมดได้ทันทีโดยไม่ต้องใช้ Token จริง

## วิธีติดตั้ง / อัปเดตใน Google Chrome
1. เปิด Chrome แล้วไปที่ `chrome://extensions/`
2. เปิดสวิตช์ **Developer mode** มุมขวาบน
3. หากติดตั้งใหม่ ให้กด **Load unpacked** แล้วเลือกโฟลเดอร์ `chrome-extensions/onepersonceo-broadcaster` (หากติดตั้ง v1.0.2 ไว้อยู่แล้ว ให้กดปุ่ม **Reload (ลูกศรหมุน)** ที่การ์ดของ Extension ได้เลย)
4. คลิกไอคอน **OnePersonCEO Smart Broadcaster** เพื่อเปิดหน้า Dashboard v2.0.0
