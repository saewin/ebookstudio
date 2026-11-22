# OnePersonCEO Knowledge Broadcaster (Chrome Extension)

Chrome Extension (Manifest V3) สำหรับบรอดแคสต์ข้อความให้ความรู้เฉพาะเพจ **OnePersonCEO (เสวิญ)** ผ่านหน้า Meta Business Suite Inbox

## ฟีเจอร์หลัก
- **4 Presets เฉพาะเพจ OnePersonCEO (เสวิญ):** ปรับแก้ / เพิ่มใหม่ / บันทึกทับ / คืนค่าเริ่มต้นได้ทันที
- **Spintax & Personalization:** รองรับ `{greeting}`, `{name}`, `#{code}` และ `{คำ1|คำ2|คำ3}` พร้อม **Messenger Live Preview**
- **ดึงรายชื่อแชทสดจาก Inbox:** กวาดรายชื่อแชทจากแถบซ้ายของ Meta Business Suite Inbox พร้อมค้นหาและเลือกส่งได้
- **ระบบป้องกันส่งซ้ำ (Cooldown):** เก็บประวัติการส่งในเครื่อง (ตั้งค่าเว้นระยะได้ เช่น 10 วัน)
- **โหมดปลอดภัย (Anti-Ban & HITL):** หน่วงเวลาสุ่มระหว่างคน + เลือกได้ระหว่างส่งอัตโนมัติ (Auto-Send) หรือวางข้อความรอตรวจเอง (Safe Draft) + ปุ่มพัก/หยุดทันที

## วิธีติดตั้งใน Google Chrome
1. เปิด Chrome แล้วไปที่ `chrome://extensions/`
2. เปิดสวิตช์ **Developer mode** (โหมดนักพัฒนาซอฟต์แวร์) มุมขวาบน
3. กดปุ่ม **Load unpacked** (โหลดส่วนขยายที่ไม่ได้แพ็กเกจ) แล้วเลือกโฟลเดอร์นี้ (`chrome-extensions/onepersonceo-broadcaster`)
4. ปักหมุดไอคอน Extension แล้วคลิกเปิดหน้า Dashboard เพื่อใช้งานได้เลย
