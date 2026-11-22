// OnePersonCEO Knowledge Broadcaster v1.1.0 — Dashboard Controller (CDP + RFM + Unlimited Sync)

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

const SEGMENT_DEFS = [
  { id: 'all', label: '📋 ทั้งหมดในฐานข้อมูล (All Contacts)' },
  { id: 'hot_leads', label: '🔥 Hot Leads (ทักมา ≤ 7 วัน — สดใหม่พร้อมคุย)' },
  { id: 'warm_leads', label: '☀️ Warm Leads (ทักมา 8–30 วัน — อุ่นเครื่องให้ความรู้)' },
  { id: 'cold_inquirers', label: '❄️ Cold Inquirers (> 30 วัน — ปลุกความสนใจด้วย AI)' },
  { id: 'ads_inquirers', label: '🏷️ Ads & Intake (ทักจากโฆษณา / ติดป้าย Intake)' },
  { id: 'buyers', label: '🎓 Buyers / Alumni (เคยซื้อ E-book / Workshop)' },
  { id: 'vip', label: '👑 VIP / Repeat Buyers (ซื้อซ้ำ ≥ 2 ครั้ง หรือยอด ≥ 5,000฿)' },
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
let allContacts = []; // Loaded from IndexedDB CDP
let activeSegment = 'all';
let selectedKeys = new Set();
let sentHistory = {};
let isSending = false;
let isPaused = false;
let shouldStop = false;
let isScanning = false;

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
  scanTargetCount: document.getElementById('scanTargetCount'),
  btnScanInbox: document.getElementById('btnScanInbox'),
  btnStopScan: document.getElementById('btnStopScan'),
  segmentSelect: document.getElementById('segmentSelect'),
  contactSearch: document.getElementById('contactSearch'),
  chkSelectAll: document.getElementById('chkSelectAll'),
  btnImportCsv: document.getElementById('btnImportCsv'),
  csvFileInput: document.getElementById('csvFileInput'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  btnClearHistory: document.getElementById('btnClearHistory'),
  btnClearDb: document.getElementById('btnClearDb'),
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
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function renderSpintax(template, contactName = 'ธนพล') {
  const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  let text = (template || '')
    .replace(/\{greeting\}/g, greeting)
    .replace(/\{name\}/g, contactName)
    .replace(/#\{code\}/g, `#${randomCode()}`)
    .replace(/\{code\}/g, randomCode());

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

function getFilteredContacts() {
  const query = (el.contactSearch.value || '').trim().toLowerCase();
  return allContacts.filter((c) => {
    if (activeSegment !== 'all' && c.segment !== activeSegment) return false;
    if (!query) return true;
    const labelStr = (c.labels || []).join(' ').toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(query) ||
      (c.snippet || '').toLowerCase().includes(query) ||
      labelStr.includes(query)
    );
  });
}

function updateSummaryCounters() {
  const sentCount = Object.keys(sentHistory).length;
  el.cooldownSummary.textContent = `ฐานข้อมูล: ${allContacts.length.toLocaleString()} คน • ส่งแล้ว: ${sentCount.toLocaleString()} คน`;
  const readyInView = getFilteredContacts().filter((c) => !isContactInCooldown(c.key)).length;
  el.statusContacts.textContent = `ทั้งหมด ${allContacts.length.toLocaleString()} คน (กลุ่มนี้พร้อมส่ง ${readyInView.toLocaleString()} คน)`;
}

function renderSegmentOptions() {
  const counts = { all: allContacts.length };
  for (const c of allContacts) {
    counts[c.segment] = (counts[c.segment] || 0) + 1;
  }

  el.segmentSelect.innerHTML = '';
  for (const seg of SEGMENT_DEFS) {
    const opt = document.createElement('option');
    opt.value = seg.id;
    const cnt = counts[seg.id] || 0;
    opt.textContent = `${seg.label} — (${cnt.toLocaleString()} คน)`;
    if (seg.id === activeSegment) opt.selected = true;
    el.segmentSelect.appendChild(opt);
  }
}

function updatePreview() {
  const filtered = getFilteredContacts();
  const sampleContact = filtered.find((c) => selectedKeys.has(c.key) && !isContactInCooldown(c.key)) || filtered[0];
  const sampleName = sampleContact ? sampleContact.name : 'ธนพล';
  el.previewSampleName.textContent = sampleName;
  el.previewBubble.textContent = renderSpintax(el.messageInput.value, sampleName);
  el.charCount.textContent = `${el.messageInput.value.length} ตัวอักษร`;

  const readySelectedCount = filtered.filter((c) => selectedKeys.has(c.key) && !isContactInCooldown(c.key)).length;
  el.previewFooter.textContent = `พร้อมส่งในกลุ่มนี้ ${readySelectedCount.toLocaleString()} คน`;
}

function renderPresets() {
  el.presetGrid.innerHTML = '';
  presets.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `preset-btn${p.id === activePresetId ? ' active' : ''}`;
    btn.innerHTML = `<div class="preset-btn-title"></div><div class="preset-btn-desc"></div>`;
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
  updateSummaryCounters();
}

const SEGMENT_BADGE_MAP = {
  hot_leads: '🔥 Hot',
  warm_leads: '☀️ Warm',
  cold_inquirers: '❄️ Cold',
  ads_inquirers: '🏷️ Ads/Intake',
  buyers: '🎓 Buyer',
  vip: '👑 VIP',
};

function renderContacts() {
  const filtered = getFilteredContacts();
  updateSummaryCounters();

  if (filtered.length === 0) {
    el.contactsList.innerHTML = `
      <div style="color: var(--muted); font-size: 13px; padding: 14px; text-align: center;">
        ${allContacts.length === 0 ? 'ยังไม่มีรายชื่อในฐานข้อมูล CDP — กดปุ่ม "⚡ ดึงรายชื่อเข้าฐานข้อมูล" หรือ "📥 Import CSV"' : 'ไม่พบรายชื่อในกลุ่มหรือคำค้นหานี้'}
      </div>
    `;
    updatePreview();
    return;
  }

  el.contactsList.innerHTML = '';
  // Render up to 200 items in DOM for smooth performance even with 50,000+ contacts in IndexedDB
  const displayLimit = 200;
  const slice = filtered.slice(0, displayLimit);

  slice.forEach((c, idx) => {
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

    const segBadge = document.createElement('span');
    segBadge.className = 'badge';
    segBadge.style.background = 'rgba(99, 102, 241, 0.22)';
    segBadge.style.color = '#c7d2fe';
    segBadge.textContent = `${SEGMENT_BADGE_MAP[c.segment] || c.segment} (R${c.rScore || 1}·F${c.fScore || 1}·M${c.mScore || 1})`;
    nameRow.appendChild(segBadge);

    const statusBadge = document.createElement('span');
    statusBadge.className = `badge ${cooldown ? 'badge-cooldown' : 'badge-ready'}`;
    statusBadge.textContent = cooldown ? 'Cooldown' : 'พร้อมส่ง';
    nameRow.appendChild(statusBadge);

    if (c.timeText) {
      const timeSpan = document.createElement('span');
      timeSpan.style.fontSize = '11px';
      timeSpan.style.color = 'var(--muted)';
      timeSpan.textContent = `• ${c.timeText}`;
      nameRow.appendChild(timeSpan);
    }

    const snippet = document.createElement('div');
    snippet.className = 'contact-snippet';
    const labelPreview = c.labels && c.labels.length > 0 ? `[${c.labels.join(', ')}] ` : '';
    const spendPreview = c.totalSpend > 0 ? `ยอดซื้อ ${Number(c.totalSpend).toLocaleString()}฿ (${c.ordersCount} ออเดอร์) • ` : '';
    snippet.textContent = `${spendPreview}${labelPreview}${c.snippet || 'แชทเพจ One Person Ceo'}`;

    meta.appendChild(nameRow);
    meta.appendChild(snippet);

    item.appendChild(checkbox);
    item.appendChild(meta);
    el.contactsList.appendChild(item);
  });

  if (filtered.length > displayLimit) {
    const more = document.createElement('div');
    more.style.cssText = 'text-align:center;font-size:12px;color:var(--muted);padding:10px;';
    more.textContent = `แสดง ${displayLimit} คนแรกจากทั้งหมด ${filtered.length.toLocaleString()} คนในกลุ่มนี้ (เมื่อกด "เลือกทั้งกลุ่มนี้" ระบบจะส่งให้ครบทั้ง ${filtered.length.toLocaleString()} คน)`;
    el.contactsList.appendChild(more);
  }

  updatePreview();
}

function selectAllInActiveSegment() {
  const filtered = getFilteredContacts();
  selectedKeys = new Set(filtered.filter((c) => !isContactInCooldown(c.key)).map((c) => c.key));
  el.chkSelectAll.checked = true;
}

async function loadFromCdpDb() {
  const rows = await window.OnePersonCdpDb.getAll();
  // Recompute RFM scores cleanly on load
  allContacts = rows.map((r) => {
    const daysAgo = window.OnePersonCdpDb.parseDaysAgo(r.timeText);
    const rfm = window.OnePersonCdpDb.computeRfmSegment({ ...r, daysAgo });
    return { ...r, daysAgo, ...rfm };
  });
  // Sort newest / highest value first
  allContacts.sort((a, b) => (a.daysAgo ?? 999) - (b.daysAgo ?? 999));
  renderSegmentOptions();
  selectAllInActiveSegment();
  renderContacts();
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
  el.connectionPill.textContent = `เชื่อมต่อแล้ว (v${info.version || '1.1.0'})`;
  el.statusTab.textContent = info.isInbox ? 'พบแท็บ Inbox กำลังเปิดอยู่ (พร้อมใช้งาน)' : 'พบ Meta Business Suite (กรุณาเปิดหน้า กล่องข้อความ)';
  el.statusPage.textContent = info.pageName || 'ตรวจพบแท็บแล้ว';
  addLog(`เชื่อมต่อสำเร็จ — เพจ: ${info.pageName || 'ไม่ทราบชื่อ'}`, 'ok');
}

async function scanInboxContacts() {
  if (isScanning) return;
  isScanning = true;
  el.btnScanInbox.disabled = true;
  el.btnScanInbox.textContent = '⏳ กำลังดึงรายชื่อ...';
  el.btnStopScan.style.display = 'inline-flex';

  const maxContacts = Number(el.scanTargetCount.value) || 0;
  const maxScrolls = maxContacts === 0 ? 0 : Math.ceil(maxContacts / 5);

  addLog(`เริ่มดึงรายชื่อแชทสดเข้าฐานข้อมูล CDP (${maxContacts === 0 ? 'ไม่จำกัดจนสุด Inbox' : `สูงสุด ${maxContacts.toLocaleString()} คน`})...`, 'info');
  const res = await sendToBackground('SCAN_INBOX', { maxScrolls, maxContacts });

  isScanning = false;
  el.btnScanInbox.disabled = false;
  el.btnScanInbox.textContent = '⚡ ดึงรายชื่อเข้าฐานข้อมูล';
  el.btnStopScan.style.display = 'none';

  if (!res.ok || !res.data || !res.data.ok) {
    addLog(res.error || res.data?.error || 'ดึงรายชื่อไม่สำเร็จ', 'err');
    return;
  }

  const scanned = res.data.contacts || [];
  if (res.data.pageName) el.statusPage.textContent = res.data.pageName;

  // Merge with existing CDP records to preserve ordersCount / totalSpend from CSV imports
  const existingMap = new Map(allContacts.map((c) => [c.key, c]));
  const now = Date.now();
  const toSave = scanned.map((c) => {
    const prev = existingMap.get(c.key) || {};
    const mergedLabels = Array.from(new Set([...(prev.labels || []), ...(c.labels || [])]));
    const daysAgo = window.OnePersonCdpDb.parseDaysAgo(c.timeText || prev.timeText);
    const merged = {
      ...prev,
      ...c,
      labels: mergedLabels,
      ordersCount: prev.ordersCount || 0,
      totalSpend: prev.totalSpend || 0,
      daysAgo,
      updatedAt: now,
    };
    const rfm = window.OnePersonCdpDb.computeRfmSegment(merged);
    return { ...merged, ...rfm };
  });

  await window.OnePersonCdpDb.upsert(toSave);
  await loadFromCdpDb();
  addLog(`บันทึกเข้าฐานข้อมูล CDP สำเร็จ +${toSave.length.toLocaleString()} รายชื่อ (รวมในฐานข้อมูล ${allContacts.length.toLocaleString()} คน)`, 'ok');
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

async function handleCsvImport(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    addLog('ไฟล์ CSV ไม่มีข้อมูล (ต้องมีแถวหัวตารางและข้อมูลอย่างน้อย 1 แถว)', 'err');
    return;
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idxName = headers.findIndex((h) => /^(name|ชื่อ|customer|ลูกค้า|fullname)/.test(h));
  const idxOrders = headers.findIndex((h) => /^(orders|orderscount|จำนวนครั้ง|ออเดอร์|frequency)/.test(h));
  const idxSpend = headers.findIndex((h) => /^(spend|totalspend|ยอดซื้อ|monetary|amount)/.test(h));
  const idxTags = headers.findIndex((h) => /^(tags|labels|ป้ายกำกับ|segment)/.test(h));
  const idxTime = headers.findIndex((h) => /^(last_active|timetext|วันที่|recency|date)/.test(h));

  if (idxName === -1) {
    addLog('ไม่พบคอลัมน์ชื่อในไฟล์ CSV (กรุณาตั้งชื่อคอลัมน์ว่า name หรือ ชื่อ)', 'err');
    return;
  }

  const existingByName = new Map(allContacts.map((c) => [(c.name || '').toLowerCase(), c]));
  const toSave = [];
  const now = Date.now();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = (cols[idxName] || '').trim();
    if (!name) continue;

    const prev = existingByName.get(name.toLowerCase()) || {};
    const ordersCount = idxOrders >= 0 ? Number(cols[idxOrders]) || prev.ordersCount || 0 : prev.ordersCount || 0;
    const totalSpend = idxSpend >= 0 ? Number((cols[idxSpend] || '').replace(/[^\d.]/g, '')) || prev.totalSpend || 0 : prev.totalSpend || 0;
    const newTags = idxTags >= 0 && cols[idxTags] ? cols[idxTags].split(/[;|]/).map((t) => t.trim()).filter(Boolean) : [];
    const timeText = idxTime >= 0 && cols[idxTime] ? cols[idxTime] : prev.timeText || '';
    const labels = Array.from(new Set([...(prev.labels || []), ...newTags]));
    const daysAgo = window.OnePersonCdpDb.parseDaysAgo(timeText);

    const record = {
      key: prev.key || `${name.toLowerCase()}__csv`,
      name,
      snippet: prev.snippet || 'นำเข้าจาก CSV',
      timeText,
      labels,
      ordersCount,
      totalSpend,
      daysAgo,
      updatedAt: now,
    };
    const rfm = window.OnePersonCdpDb.computeRfmSegment(record);
    toSave.push({ ...record, ...rfm });
  }

  await window.OnePersonCdpDb.upsert(toSave);
  await loadFromCdpDb();
  addLog(`นำเข้า CSV และคำนวณ RFM สำเร็จ ${toSave.length.toLocaleString()} รายชื่อ`, 'ok');
}

function exportCsv() {
  if (allContacts.length === 0) {
    addLog('ยังไม่มีข้อมูลในฐานข้อมูล CDP สำหรับส่งออก', 'warn');
    return;
  }
  const header = ['name', 'segment', 'r_score', 'f_score', 'm_score', 'orders', 'spend', 'tags', 'last_active', 'snippet'];
  const rows = allContacts.map((c) => [
    c.name || '',
    c.segment || '',
    c.rScore || 1,
    c.fScore || 1,
    c.mScore || 1,
    c.ordersCount || 0,
    c.totalSpend || 0,
    (c.labels || []).join('|'),
    c.timeText || '',
    c.snippet || '',
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = '\uFEFF' + [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onepersonceo_cdp_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  addLog(`ส่งออก CSV เรียบร้อย (${allContacts.length.toLocaleString()} รายชื่อ)`, 'ok');
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

  const queue = getFilteredContacts().filter((c) => selectedKeys.has(c.key) && !isContactInCooldown(c.key));
  if (queue.length === 0) {
    addLog('ไม่มีรายชื่อที่เลือกไว้สำหรับส่งในกลุ่มนี้', 'warn');
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

  addLog(`เริ่มบรอดแคสต์ให้กลุ่ม "${activeSegment}" จำนวน ${queue.length.toLocaleString()} คน (โหมด: ${autoSend ? 'ส่งอัตโนมัติ' : 'Safe Draft วางข้อความรอตรวจ'})`, 'info');

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

// Listen for real-time scan progress from content.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'SCAN_PROGRESS' && isScanning) {
    el.btnScanInbox.textContent = `⏳ ดึงได้แล้ว ${msg.count.toLocaleString()} คน...`;
    el.progressLabel.textContent = `กำลังสแกน Inbox รอบที่ ${msg.round} — พบแล้ว ${msg.count.toLocaleString()} คน`;
  }
});

async function init() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.PRESETS, STORAGE_KEYS.SENT_HISTORY]);
  presets = Array.isArray(stored[STORAGE_KEYS.PRESETS]) && stored[STORAGE_KEYS.PRESETS].length > 0
    ? stored[STORAGE_KEYS.PRESETS]
    : JSON.parse(JSON.stringify(DEFAULT_PRESETS));
  sentHistory = stored[STORAGE_KEYS.SENT_HISTORY] || {};

  selectPreset(presets[0].id);
  await loadFromCdpDb();

  // Events
  el.btnCheckConn.addEventListener('click', checkConnection);
  el.btnOpenInbox.addEventListener('click', async () => {
    await sendToBackground('OPEN_INBOX');
    setTimeout(checkConnection, 1500);
  });

  el.btnScanInbox.addEventListener('click', scanInboxContacts);
  el.btnStopScan.addEventListener('click', async () => {
    addLog('ส่งคำสั่งหยุดสแกน — กำลังบันทึกรายชื่อที่ดึงมาได้...', 'warn');
    await sendToBackground('STOP_SCAN');
  });

  el.segmentSelect.addEventListener('change', () => {
    activeSegment = el.segmentSelect.value;
    selectAllInActiveSegment();
    renderContacts();
  });

  el.messageInput.addEventListener('input', updatePreview);
  el.btnRandomizePreview.addEventListener('click', updatePreview);
  el.cooldownDays.addEventListener('change', renderContacts);
  el.contactSearch.addEventListener('input', renderContacts);

  el.chkSelectAll.addEventListener('change', () => {
    if (el.chkSelectAll.checked) {
      selectAllInActiveSegment();
    } else {
      selectedKeys = new Set();
    }
    renderContacts();
  });

  el.btnImportCsv.addEventListener('click', () => el.csvFileInput.click());
  el.csvFileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) await handleCsvImport(file);
    el.csvFileInput.value = '';
  });
  el.btnExportCsv.addEventListener('click', exportCsv);

  document.querySelectorAll('.tag-chip').forEach((chip) => {
    chip.addEventListener('click', () => insertAtCursor(el.messageInput, chip.dataset.tag || ''));
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
    presets.push({
      id: newId,
      title: `✨ Preset ใหม่ #${presets.length + 1}`,
      desc: 'ข้อความให้ความรู้กำหนดเอง',
      message: `{greeting}คุณ {name} ครับ 👋 เสวิญ (OnePersonCEO) เองครับ\n\n(พิมพ์ข้อความให้ความรู้ตรงนี้)\n\nRef: #{code}`,
    });
    await persistPresets();
    selectPreset(newId);
    addLog('เพิ่ม Preset ใหม่เรียบร้อย', 'ok');
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

  el.btnClearDb.addEventListener('click', async () => {
    if (!confirm('ต้องการล้างรายชื่อทั้งหมดในฐานข้อมูล CDP ของเพจ OnePersonCEO ใช่หรือไม่?')) return;
    await window.OnePersonCdpDb.clearAll();
    allContacts = [];
    selectedKeys = new Set();
    renderSegmentOptions();
    renderContacts();
    addLog('ล้างฐานข้อมูล CDP เรียบร้อย', 'warn');
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
