// OnePersonCEO Knowledge Broadcaster — Dashboard Controller

const STORAGE_KEYS = {
  PRESETS: 'onepersonceo_presets_v1',
  SENT_HISTORY: 'onepersonceo_sent_history_v1',
};

const GREETINGS = [
  'สวัสดีครับ',
  'ทักทายครับ',
  'หวัดดีครับ',
  'สวัสดีครับผม',
];

const DEFAULT_PRESETS = [
  {
    id: 'ai-workforce-3steps',
    title: '🧠 ความรู้: สร้าง AI Workforce 3 ขั้น',
    desc: 'ปลุกเพจ + ชวนตอบ 1/2/3 เรื่องการใช้ AI ลดเวลางาน',
    message: `{greeting}คุณ {name} ครับ 👋 เสวิญ (OnePersonCEO) เองครับ

{แวะเอาความรู้สั้นๆ มาฝากครับ|วันนี้มีแนวคิดที่ใช้ได้จริงมาฝากครับ} สำหรับคนที่กำลังสร้างธุรกิจคนเดียวครับ

คนส่วนใหญ่ใช้ AI แค่ "ถาม-ตอบทีละครั้ง" เลยยังรู้สึกว่าต้องทำทุกอย่างเองเหมือนเดิม
แต่ถ้าอยากสร้าง "AI Workforce" แทนการจ้างทีม ให้ลองเริ่มจาก 3 ขั้นนี้ครับ:
1. เลือกงานที่ทำซ้ำทุกสัปดาห์ออกมา 1 อย่าง
2. เขียนขั้นตอนการทำงานให้ชัดเหมือนสอนลูกน้องใหม่ (SOP)
3. เอาขั้นตอนนั้นไปตั้งค่าเป็น AI Agent / Prompt ประจำตำแหน่ง

แค่เริ่มจาก 1 งานแรก ก็ลดเวลาทำงานลงได้หลายชั่วโมงต่อสัปดาห์แล้วครับ

ตอนนี้คุณ {name} อยากให้ AI ช่วยลดเวลางานเรื่องไหนมากที่สุดครับ?
{พิมพ์เลขมาคุยกันได้เลยนะครับ|ลองตอบสั้นๆ ไว้ได้เลยครับ}:
1 = ทำคอนเทนต์ / เขียน E-book
2 = สร้าง Digital Product / คอร์สออนไลน์
3 = จัดระบบงานและวางแผนธุรกิจ

Ref: #{code}`,
  },
  {
    id: 'digital-product-ai',
    title: '💡 ความรู้: 3 Digital Product ยุค AI',
    desc: 'เปิดไอเดียสินค้าดิจิทัลที่คนทำคนเดียวสร้างได้ไว',
    message: `{greeting}คุณ {name} ครับ 🙌 จากเพจ OnePersonCEO (เสวิญ) ครับ

{ขอแชร์ไอเดียสั้นๆ ไว้เป็นแนวทางครับ|แวะเอาไอเดีย Digital Product มาฝากครับ}

หลายคนคิดว่า Digital Product มีแค่ E-book กับคอร์สออนไลน์ แต่ยุคนี้มีอีก 3 อย่างที่{ทำได้ไวกว่า|ลูกค้าตัดสินใจซื้อง่ายมาก} และสร้างได้ด้วยตัวคนเดียว:

1. AI Prompt & Agent Kit — ชุดผู้ช่วย AI สำเร็จรูปที่ลูกค้าเอาไปรันใช้งานได้ทันที
2. Template & Second Brain — ระบบจัดระเบียบงาน/ชีวิต ที่ช่วยประหยัดเวลาคิด
3. Interactive Mini-Tool — เครื่องมือคำนวณหรือแบบประเมินเฉพาะทาง

หัวใจคือ "แก้ปัญหา 1 อย่างให้จบไวที่สุด" ไม่จำเป็นต้องทำใหญ่ตั้งแต่แรกครับ

คุณ {name} สนใจอยากลองสร้างแบบไหนเป็นชิ้นแรกครับ? {ตอบสั้นๆ มาคุยกันได้เลย|พิมพ์บอกไว้ได้เลยนะครับ} เดี๋ยวรอบหน้าเสวิญสรุปวิธีทำส่งให้ครับ 😊

Ref: #{code}`,
  },
  {
    id: 'second-brain-para',
    title: '🗂️ ความรู้: จัดสมอง CEO ด้วย P.A.R.A.',
    desc: 'แก้ปัญหาคิดเยอะ ล้นหัว ไม่รู้จะโฟกัสอะไรก่อน',
    message: `{greeting}คุณ {name} ครับ 👋 เสวิญ (OnePersonCEO) ครับ

ปัญหาอันดับ 1 ของคนที่ทำธุรกิจคนเดียวไม่ใช่ "ไม่มีไอเดีย" แต่คือ "คิดเยอะเกินไปจนไม่รู้จะทำอะไรก่อน" ครับ

วิธีแก้ง่ายที่สุดคือแบ่งทุกอย่างในหัวลงแค่ 4 กล่อง (ระบบ P.A.R.A.):
- Projects: งานที่มีเส้นตายชัดเจน (เลือกทำแค่ 1-3 อย่าง/สัปดาห์)
- Areas: งานประจำที่ต้องดูแลต่อเนื่อง
- Resources: คลังความรู้ / ไอเดีย / Prompt ที่เก็บไว้ใช้
- Archives: งานที่จบแล้ว เก็บออกจากสายตา

ลองแยกแค่นี้ สมองจะโล่งขึ้นและโฟกัสงานที่ทำเงินได้ชัดเจนขึ้นเยอะเลยครับ

ตอนนี้คุณ {name} ใช้แอปไหนจดงานและจัดระเบียบไอเดียอยู่ครับ? {แชร์กันได้นะครับ|ตอบมาคุยกันได้เลยครับ}

Ref: #{code}`,
  },
  {
    id: 'ceo-2-update',
    title: '🚀 อัปเดต: ฉันนี่แหล่ะประธานบริษัท 2.0',
    desc: 'คัดลูกเพจที่สนใจรับคู่มือ AI ฟรีแบบนุ่มนวล',
    message: `{greeting}คุณ {name} ครับ ✨ เสวิญ (OnePersonCEO) แวะมาทักทายครับ

ช่วงนี้เสวิญกำลังอัปเดตเนื้อหาและระบบ AI Workforce เวอร์ชันใหม่ สำหรับคนทำงานและเจ้าของธุรกิจคนเดียว ที่อยากใช้ AI ช่วยผลิตงาน สร้าง Digital Product และวางระบบธุรกิจให้เบาแรงลง

ถ้าคุณ {name} อยากรับสรุปคู่มือและไอเดีย AI สำหรับ OnePersonCEO ฟรีเวลาเสวิญอัปเดตรอบใหม่
{พิมพ์คำว่า "สนใจ" ตอบกลับมาไว้ได้เลยนะครับ|ตอบว่า "สนใจ" ไว้ได้เลยครับ} เดี๋ยวเสวิญจัดคิวส่งสรุปให้เป็นกลุ่มแรกครับ 😊

Ref: #{code}`,
  },
];

// State
let presets = [];
let activePresetId = null;
let contacts = [];
let selectedKeys = new Set();
let sentHistory = {}; // { [contactKey]: timestampMs }
let isSending = false;
let isPaused = false;
let shouldStop = false;

// DOM refs
const el = {
  connectionPill: document.getElementById('connectionPill'),
  btnCheckConn: document.getElementById('btnCheckConn'),
  btnOpenInbox: document.getElementById('btnOpenInbox'),
  cooldownSummary: document.getElementById('cooldownSummary'),
  statusTab: document.getElementById('statusTab'),
  statusPage: document.getElementById('statusPage'),
  statusContacts: document.getElementById('statusContacts'),
  presetGrid: document.getElementById('presetGrid'),
  presetTitleInput: document.getElementById('presetTitleInput'),
  messageInput: document.getElementById('messageInput'),
  charCount: document.getElementById('charCount'),
  btnSavePreset: document.getElementById('btnSavePreset'),
  btnAddPreset: document.getElementById('btnAddPreset'),
  btnDeletePreset: document.getElementById('btnDeletePreset'),
  btnResetPresets: document.getElementById('btnResetPresets'),
  scanDepth: document.getElementById('scanDepth'),
  btnScanInbox: document.getElementById('btnScanInbox'),
  contactSearch: document.getElementById('contactSearch'),
  chkSelectAll: document.getElementById('chkSelectAll'),
  btnClearHistory: document.getElementById('btnClearHistory'),
  contactsList: document.getElementById('contactsList'),
  btnRandomizePreview: document.getElementById('btnRandomizePreview'),
  previewSampleName: document.getElementById('previewSampleName'),
  previewBubble: document.getElementById('previewBubble'),
  previewFooter: document.getElementById('previewFooter'),
  minDelay: document.getElementById('minDelay'),
  maxDelay: document.getElementById('maxDelay'),
  cooldownDays: document.getElementById('cooldownDays'),
  chkAutoSend: document.getElementById('chkAutoSend'),
  btnStartSend: document.getElementById('btnStartSend'),
  btnPauseSend: document.getElementById('btnPauseSend'),
  btnStopSend: document.getElementById('btnStopSend'),
  progressLabel: document.getElementById('progressLabel'),
  progressCount: document.getElementById('progressCount'),
  progressBar: document.getElementById('progressBar'),
  logBox: document.getElementById('logBox'),
};

function addLog(text, level = 'info') {
  const time = new Date().toLocaleTimeString('th-TH', { hour12: false });
  const div = document.createElement('div');
  div.className = `log-${level}`;
  div.textContent = `[${time}] ${text}`;
  el.logBox.appendChild(div);
  el.logBox.scrollTop = el.logBox.scrollHeight;
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function renderSpintax(template, contactName = 'คุณธนพล') {
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  let text = (template || '')
    .replace(/\{greeting\}/g, greeting)
    .replace(/\{name\}/g, contactName)
    .replace(/#\{code\}/g, `#${randomCode()}`)
    .replace(/\{code\}/g, randomCode());

  // Resolve {option1|option2|option3} spintax blocks
  text = text.replace(/\{([^{}|]+\|[^{}]+)\}/g, (_match, group) => {
    const parts = group.split('|');
    return parts[Math.floor(Math.random() * parts.length)];
  });

  return text;
}

function isContactInCooldown(key) {
  const days = Math.max(0, Number(el.cooldownDays.value) || 0);
  if (days === 0) return false;
  const lastSent = sentHistory[key];
  if (!lastSent) return false;
  const diffDays = (Date.now() - lastSent) / (1000 * 60 * 60 * 24);
  return diffDays < days;
}

function updatePreview() {
  const sampleContact = contacts.find((c) => selectedKeys.has(c.key));
  const sampleName = sampleContact ? sampleContact.name : 'ธนพล';
  el.previewSampleName.textContent = sampleName;
  el.previewBubble.textContent = renderSpintax(el.messageInput.value, sampleName);
  el.charCount.textContent = `${el.messageInput.value.length} ตัวอักษร`;

  const readySelectedCount = contacts.filter((c) => selectedKeys.has(c.key) && !isContactInCooldown(c.key)).length;
  el.previewFooter.textContent = `พร้อมส่งให้ ${readySelectedCount} คน`;
}

function renderPresets() {
  el.presetGrid.innerHTML = '';
  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `preset-btn${p.id === activePresetId ? ' active' : ''}`;
    btn.innerHTML = `
      <div class="preset-btn-title"></div>
      <div class="preset-btn-desc"></div>
    `;
    btn.querySelector('.preset-btn-title').textContent = p.title;
    btn.querySelector('.preset-btn-desc').textContent = p.desc || 'คลิกเพื่อโหลดข้อความนี้';
    btn.addEventListener('click', () => selectPreset(p.id));
    el.presetGrid.appendChild(btn);
  });
}

function selectPreset(id) {
  const found = presets.find((p) => p.id === id);
  if (!found) return;
  activePresetId = found.id;
  el.presetTitleInput.value = found.title;
  el.messageInput.value = found.message;
  renderPresets();
  updatePreview();
}

async function persistPresets() {
  await chrome.storage.local.set({ [STORAGE_KEYS.PRESETS]: presets });
}

async function persistHistory() {
  await chrome.storage.local.set({ [STORAGE_KEYS.SENT_HISTORY]: sentHistory });
  el.cooldownSummary.textContent = `ประวัติส่งแล้ว: ${Object.keys(sentHistory).length} คน`;
}

function renderContacts() {
  const query = (el.contactSearch.value || '').trim().toLowerCase();
  const filtered = contacts.filter((c) => !query || c.name.toLowerCase().includes(query) || (c.snippet || '').toLowerCase().includes(query));

  if (filtered.length === 0) {
    el.contactsList.innerHTML = `
      <div style="color: var(--muted); font-size: 13px; padding: 14px; text-align: center;">
        ${contacts.length === 0 ? 'ยังไม่มีรายชื่อ — กดปุ่ม "ดึงรายชื่อแชทสดจาก Inbox" ด้านบน' : 'ไม่พบรายชื่อที่ตรงกับคำค้นหา'}
      </div>
    `;
    updatePreview();
    return;
  }

  el.contactsList.innerHTML = '';
  filtered.forEach((c, idx) => {
    const cooldown = isContactInCooldown(c.key);
    const item = document.createElement('div');
    item.className = `contact-item${cooldown ? ' cooldown' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !cooldown && selectedKeys.has(c.key);
    checkbox.disabled = cooldown;
    checkbox.style.marginTop = '3px';
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedKeys.add(c.key);
      else selectedKeys.delete(c.key);
      updatePreview();
    });

    const meta = document.createElement('div');
    meta.className = 'contact-meta';

    const nameRow = document.createElement('div');
    nameRow.className = 'contact-name';
    nameRow.textContent = `${idx + 1}. ${c.name}`;

    const badge = document.createElement('span');
    badge.className = `badge ${cooldown ? 'badge-cooldown' : 'badge-ready'}`;
    badge.textContent = cooldown ? 'ติด Cooldown (ส่งแล้ว)' : 'พร้อมส่ง';
    nameRow.appendChild(badge);

    if (c.timeText) {
      const timeSpan = document.createElement('span');
      timeSpan.style.fontSize = '11px';
      timeSpan.style.color = 'var(--muted)';
      timeSpan.textContent = `• ${c.timeText}`;
      nameRow.appendChild(timeSpan);
    }

    const snippet = document.createElement('div');
    snippet.className = 'contact-snippet';
    snippet.textContent = c.snippet || 'แชทใน Inbox เพจ One Person Ceo';

    meta.appendChild(nameRow);
    meta.appendChild(snippet);

    item.appendChild(checkbox);
    item.appendChild(meta);
    el.contactsList.appendChild(item);
  });

  const readyCount = contacts.filter((c) => !isContactInCooldown(c.key)).length;
  el.statusContacts.textContent = `ดึงได้ ${contacts.length} คน (พร้อมส่ง ${readyCount} คน)`;
  updatePreview();
}

function sendToBackground(action, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ target: 'background', action, payload }, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(res || { ok: false, error: 'ไม่ได้รับการตอบกลับจาก Background' });
      }
    });
  });
}

async function checkConnection() {
  el.connectionPill.className = 'pill warn';
  el.connectionPill.textContent = 'กำลังตรวจสอบ...';

  const res = await sendToBackground('CHECK_STATUS');
  if (!res.ok || !res.data || !res.data.ok) {
    el.connectionPill.className = 'pill warn';
    el.connectionPill.textContent = 'ยังไม่พบแท็บ Inbox';
    el.statusTab.textContent = 'ไม่พบแท็บ Meta Business Suite';
    el.statusPage.textContent = '-';
    addLog(res.error || 'ยังไม่พบแท็บ Meta Business Suite Inbox', 'warn');
    return;
  }

  const info = res.data;
  el.connectionPill.className = 'pill ok';
  el.connectionPill.textContent = 'เชื่อมต่อแล้ว';
  el.statusTab.textContent = info.isInbox ? 'พบแท็บ Inbox กำลังเปิดอยู่ (พร้อมใช้งาน)' : 'พบ Meta Business Suite (กรุณาเปิดหน้า กล่องข้อความ)';
  el.statusPage.textContent = info.pageName || 'ตรวจพบแท็บแล้ว';
  addLog(`เชื่อมต่อสำเร็จ — เพจที่ตรวจพบ: ${info.pageName || 'ไม่ทราบชื่อ'}`, 'ok');
}

async function scanInboxContacts() {
  el.btnScanInbox.disabled = true;
  el.btnScanInbox.textContent = '⏳ กำลังดึงรายชื่อ...';
  const maxScrolls = Number(el.scanDepth.value) || 10;

  addLog(`เริ่มสแกนรายชื่อแชทสดจาก Inbox (ความลึก ${maxScrolls} รอบ)...`, 'info');
  const res = await sendToBackground('SCAN_INBOX', { maxScrolls, maxContacts: 300 });

  el.btnScanInbox.disabled = false;
  el.btnScanInbox.textContent = '⚡ ดึงรายชื่อแชทสดจาก Inbox';

  if (!res.ok || !res.data || !res.data.ok) {
    addLog(res.error || res.data?.error || 'ดึงรายชื่อไม่สำเร็จ', 'err');
    return;
  }

  contacts = res.data.contacts || [];
  if (res.data.pageName) {
    el.statusPage.textContent = res.data.pageName;
  }

  selectedKeys = new Set(contacts.filter((c) => !isContactInCooldown(c.key)).map((c) => c.key));
  el.chkSelectAll.checked = true;
  renderContacts();
  addLog(`ดึงรายชื่อสำเร็จ ${contacts.length} คน (พร้อมส่ง ${selectedKeys.size} คน)`, 'ok');
}

async function waitWithControls(seconds) {
  for (let i = seconds; i > 0; i--) {
    if (shouldStop) return false;
    while (isPaused && !shouldStop) {
      el.progressLabel.textContent = 'พักการทำงานชั่วคราว...';
      await new Promise((r) => setTimeout(r, 400));
    }
    if (shouldStop) return false;
    el.progressLabel.textContent = `หน่วงเวลาปลอดภัยก่อนส่งคนถัดไป (${i} วินาที)...`;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return true;
}

async function startBroadcast() {
  const template = (el.messageInput.value || '').trim();
  if (!template) {
    addLog('กรุณาพิมพ์ข้อความให้ความรู้ก่อนเริ่มส่งครับ', 'err');
    return;
  }

  const queue = contacts.filter((c) => selectedKeys.has(c.key) && !isContactInCooldown(c.key));
  if (queue.length === 0) {
    addLog('ไม่มีรายชื่อที่เลือกไว้สำหรับส่ง กรุณาดึงรายชื่อก่อนครับ', 'warn');
    return;
  }

  const minSec = Math.max(5, Number(el.minDelay.value) || 15);
  const maxSec = Math.max(minSec, Number(el.maxDelay.value) || 35);
  const autoSend = el.chkAutoSend.checked;

  isSending = true;
  isPaused = false;
  shouldStop = false;
  el.btnStartSend.disabled = true;
  el.btnPauseSend.disabled = false;
  el.btnStopSend.disabled = false;
  el.btnPauseSend.textContent = '⏸ พัก';

  addLog(`เริ่มบรอดแคสต์ให้ ${queue.length} คน (โหมด: ${autoSend ? 'ส่งอัตโนมัติ' : 'Safe Draft วางข้อความรอตรวจ'})`, 'info');

  let done = 0;
  let success = 0;

  for (let i = 0; i < queue.length; i++) {
    if (shouldStop) break;
    while (isPaused && !shouldStop) {
      el.progressLabel.textContent = 'พักการทำงานชั่วคราว...';
      await new Promise((r) => setTimeout(r, 400));
    }
    if (shouldStop) break;

    const person = queue[i];
    el.progressLabel.textContent = `กำลังส่งถึง ${person.name} (${i + 1}/${queue.length})...`;
    const renderedMsg = renderSpintax(template, person.name);

    const res = await sendToBackground('SEND_MESSAGE', {
      name: person.name,
      key: person.key,
      message: renderedMsg,
      autoSend,
    });

    done += 1;
    el.progressCount.textContent = `${done} / ${queue.length}`;
    el.progressBar.style.width = `${Math.round((done / queue.length) * 100)}%`;

    if (res.ok && res.data && res.data.ok) {
      success += 1;
      if (autoSend) {
        sentHistory[person.key] = Date.now();
        await persistHistory();
        addLog(`ส่งสำเร็จ → ${person.name}`, 'ok');
      } else {
        addLog(`วางข้อความ (Safe Draft) สำเร็จ → ${person.name}`, 'ok');
      }
    } else {
      addLog(`ข้าม ${person.name}: ${res.error || res.data?.error || 'ส่งไม่สำเร็จ'}`, 'err');
    }

    if (i < queue.length - 1 && !shouldStop) {
      const waitSec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
      const ok = await waitWithControls(waitSec);
      if (!ok) break;
    }
  }

  isSending = false;
  isPaused = false;
  el.btnStartSend.disabled = false;
  el.btnPauseSend.disabled = true;
  el.btnStopSend.disabled = true;
  el.progressLabel.textContent = shouldStop ? 'หยุดการส่งแล้ว' : `เสร็จสิ้น! สำเร็จ ${success}/${queue.length} คน`;
  addLog(`จบการทำงาน — สำเร็จ ${success} จาก ${queue.length} คน`, shouldStop ? 'warn' : 'ok');
  renderContacts();
}

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const value = textarea.value;
  textarea.value = value.slice(0, start) + text + value.slice(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  updatePreview();
}

async function init() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.PRESETS, STORAGE_KEYS.SENT_HISTORY]);
  presets = Array.isArray(stored[STORAGE_KEYS.PRESETS]) && stored[STORAGE_KEYS.PRESETS].length > 0
    ? stored[STORAGE_KEYS.PRESETS]
    : JSON.parse(JSON.stringify(DEFAULT_PRESETS));
  sentHistory = stored[STORAGE_KEYS.SENT_HISTORY] || {};

  el.cooldownSummary.textContent = `ประวัติส่งแล้ว: ${Object.keys(sentHistory).length} คน`;
  selectPreset(presets[0].id);

  // Events
  el.btnCheckConn.addEventListener('click', checkConnection);
  el.btnOpenInbox.addEventListener('click', async () => {
    await sendToBackground('OPEN_INBOX');
    setTimeout(checkConnection, 1500);
  });
  el.btnScanInbox.addEventListener('click', scanInboxContacts);

  el.messageInput.addEventListener('input', updatePreview);
  el.btnRandomizePreview.addEventListener('click', updatePreview);
  el.cooldownDays.addEventListener('change', renderContacts);
  el.contactSearch.addEventListener('input', renderContacts);

  el.chkSelectAll.addEventListener('change', () => {
    if (el.chkSelectAll.checked) {
      selectedKeys = new Set(contacts.filter((c) => !isContactInCooldown(c.key)).map((c) => c.key));
    } else {
      selectedKeys = new Set();
    }
    renderContacts();
  });

  document.querySelectorAll('.tag-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      insertAtCursor(el.messageInput, chip.dataset.tag || '');
    });
  });

  el.btnSavePreset.addEventListener('click', async () => {
    const idx = presets.findIndex((p) => p.id === activePresetId);
    if (idx === -1) return;
    presets[idx].title = el.presetTitleInput.value.trim() || presets[idx].title;
    presets[idx].message = el.messageInput.value;
    await persistPresets();
    renderPresets();
    addLog(`บันทึก Preset "${presets[idx].title}" เรียบร้อย`, 'ok');
  });

  el.btnAddPreset.addEventListener('click', async () => {
    const newId = `custom-${Date.now()}`;
    const newPreset = {
      id: newId,
      title: `✨ Preset ใหม่ #${presets.length + 1}`,
      desc: 'ข้อความให้ความรู้กำหนดเอง',
      message: `{greeting}คุณ {name} ครับ 👋 เสวิญ (OnePersonCEO) เองครับ\n\n(พิมพ์ข้อความให้ความรู้ตรงนี้)\n\nRef: #{code}`,
    };
    presets.push(newPreset);
    await persistPresets();
    selectPreset(newId);
    addLog(`เพิ่ม Preset ใหม่เรียบร้อย`, 'ok');
  });

  el.btnDeletePreset.addEventListener('click', async () => {
    if (presets.length <= 1) {
      addLog('ต้องมี Preset เหลืออย่างน้อย 1 อันครับ', 'warn');
      return;
    }
    presets = presets.filter((p) => p.id !== activePresetId);
    await persistPresets();
    selectPreset(presets[0].id);
    addLog('ลบ Preset เรียบร้อย', 'warn');
  });

  el.btnResetPresets.addEventListener('click', async () => {
    presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
    await persistPresets();
    selectPreset(presets[0].id);
    addLog('คืนค่า Preset เริ่มต้นทั้ง 4 ชุดของ OnePersonCEO เรียบร้อย', 'info');
  });

  el.btnClearHistory.addEventListener('click', async () => {
    sentHistory = {};
    await persistHistory();
    renderContacts();
    addLog('ล้างประวัติ Cooldown เรียบร้อย', 'warn');
  });

  el.btnStartSend.addEventListener('click', startBroadcast);
  el.btnPauseSend.addEventListener('click', () => {
    if (!isSending) return;
    isPaused = !isPaused;
    el.btnPauseSend.textContent = isPaused ? '▶ ทำต่อ' : '⏸ พัก';
    addLog(isPaused ? 'พักการส่งชั่วคราว' : 'กลับมาส่งต่อแล้ว', 'warn');
  });
  el.btnStopSend.addEventListener('click', () => {
    if (!isSending) return;
    shouldStop = true;
    isPaused = false;
    addLog('กำลังหยุดการส่ง...', 'warn');
  });

  await checkConnection();
}

init();
