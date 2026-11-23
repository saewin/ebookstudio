// OnePersonCEO Smart Broadcaster v2.0 — Dashboard Controller
// Clean CSP-safe implementation: no inline handlers, strict escaping, IndexedDB + MV3 Alarms

(() => {
  'use strict';

  const STORAGE_KEYS = {
    PRESETS: 'onepersonceo_presets_v1',
    SENT_HISTORY: 'onepersonceo_sent_history_v1',
    GRAPH_CONFIG: 'onepersonceo_graph_config_v2',
    SCHEDULER_ENABLED: 'onepersonceo_scheduler_enabled_v2',
    NOTIFY_ENABLED: 'onepersonceo_notify_enabled_v2',
    SEGMENT_OVERRIDES: 'onepersonceo_segment_overrides_v2',
    SELECTION_BY_PAGE: 'onepersonceo_selection_v2',
    LAST_TAB: 'onepersonceo_last_tab_v2',
    DRAFT_IMAGES: 'onepersonceo_draft_images_v2',
    ACTIVE_PRESET_ID: 'onepersonceo_active_preset_v2',
    SERVER_SYNC_CONFIG: 'onepersonceo_server_sync_v1',
  };

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
    {
      id: 'rsv-repurchase-cdp',
      title: '🔥 RSV: ทักดูแลรอบใช้งาน ({last_product})',
      desc: 'เหมาะสำหรับกลุ่ม Due Now / Overdue ตามรอบซื้อซ้ำ',
      message: `{greeting}คุณ {name} ครับ 👋 เสวิญ (OnePersonCEO) แวะมาติดตามผลครับ

เห็นว่าคุณ {name} เคยรับชุด {last_product} ไปดูแลช่วง {preferred_time} น่าจะใช้งานใกล้ครบรอบแล้ว
{ช่วงนี้ใช้งานเป็นอย่างไรบ้างครับ|มีจุดไหนอยากให้เสวิญช่วยต่อยอดเพิ่มไหมครับ}

สำหรับสมาชิกรอบเดิมในกลุ่ม {segment} เสวิญเตรียมชุดอัปเดตและโบนัสต่อรอบไว้ให้พิเศษครับ
ถ้าอยากให้ส่งรายละเอียดให้ดู พิมพ์คำว่า "ขอรายละเอียด" ได้เลยครับ 😊

Ref: #{code}`,
    },
    {
      id: 'vip-champions-cdp',
      title: '👑 VIP Champions: สิทธิ์พิเศษวงใน',
      desc: 'ดูแลลูกค้า VIP ยอดสะสมสูง / ซื้อซ้ำสม่ำเสมอ',
      message: `{greeting}คุณ {name} ครับ 🌟 เสวิญ (OnePersonCEO) ขอบคุณที่สนับสนุนกันมาตลอดครับ

คุณ {name} อยู่ในกลุ่ม {segment} ของเพจเราเลย (ยอดสะสม {ltv}) — เสวิญเลยอยากส่งสรุปคู่มือและสิทธิ์เข้าถึงชุด AI Prompt / Workflow ล่าสุดให้ก่อนใครครับ

{สะดวกดูช่วงนี้ไหมครับ|ตอบกลับสั้นๆ ว่า "รับสิทธิ์" เดี๋ยวเสวิญส่งลิงก์ให้ทันทีครับ} 🙏

Ref: #{code}`,
    },
  ];

  // State
  let graphConfig = {
    accessToken: '',
    pageId: '',
    pageName: '⚠️ ยังไม่ได้เชื่อมต่อ Token',
    pages: [],
    lastUsagePct: 0,
  };

  let allContacts = [];
  let filteredContacts = [];
  let selectedContactIds = new Set();
  let currentPageNum = 1;
  const PAGE_SIZE = 100;

  let activeRfmFilter = 'ALL';
  let activeRsvFilter = 'ALL';
  let activeHourFilter = null;

  let presets = [];
  let activePresetId = null;
  let sentHistory = {};
  let segmentOverrides = {
    'Due Now': '',
    Champions: '',
    'At Risk': '',
    'Warm Lead': '',
  };

  let syncRunning = false;
  let syncStopRequested = false;
  let attachedImages = []; // [{ id, file, name, previewUrl, attachmentId, uploadedForPageId }]

  let activeCampaign = null;
  let activeQueueItems = [];
  let batchRunning = false;
  let batchPaused = false;
  let batchStopRequested = false;
  let schedulerEnabled = true;

  // Legacy DOM mode state
  let legacyContacts = [];
  let legacySelectedKeys = new Set();
  let legacySending = false;
  let legacyPaused = false;
  let legacyStopRequested = false;

  const el = {
    apiStatusPill: document.getElementById('apiStatusPill'),
    cdpCountPill: document.getElementById('cdpCountPill'),
    schedulerPill: document.getElementById('schedulerPill'),
    btnOpenInboxTop: document.getElementById('btnOpenInboxTop'),
    cooldownGlobalPill: document.getElementById('cooldownGlobalPill'),
    globalToast: document.getElementById('globalToast'),

    // Tab 1
    tokenInput: document.getElementById('tokenInput'),
    btnToggleToken: document.getElementById('btnToggleToken'),
    btnVerifyToken: document.getElementById('btnVerifyToken'),
    tokenStatusMsg: document.getElementById('tokenStatusMsg'),
    btnOpenGraphExplorer: document.getElementById('btnOpenGraphExplorer'),
    pageSelectRow: document.getElementById('pageSelectRow'),
    pageSelect: document.getElementById('pageSelect'),
    turboPageIdInput: document.getElementById('turboPageIdInput'),
    btnUseOnePersonPage: document.getElementById('btnUseOnePersonPage'),
    btnDetectPageFromTab: document.getElementById('btnDetectPageFromTab'),
    btnDiagnoseTurbo: document.getElementById('btnDiagnoseTurbo'),
    turboDiagBox: document.getElementById('turboDiagBox'),
    kpiPageName: document.getElementById('kpiPageName'),
    kpiPageId: document.getElementById('kpiPageId'),
    kpiDbContacts: document.getElementById('kpiDbContacts'),
    kpiApiUsage: document.getElementById('kpiApiUsage'),

    syncTargetSelect: document.getElementById('syncTargetSelect'),
    syncBatchLimit: document.getElementById('syncBatchLimit'),
    syncAlertBox: document.getElementById('syncAlertBox'),
    btnStartTurboSync: document.getElementById('btnStartTurboSync'),
    btnStartSync: document.getElementById('btnStartSync'),
    btnResumeSync: document.getElementById('btnResumeSync'),
    btnPauseSync: document.getElementById('btnPauseSync'),
    btnResetSync: document.getElementById('btnResetSync'),
    syncProgressBar: document.getElementById('syncProgressBar'),
    syncStatusText: document.getElementById('syncStatusText'),
    syncSpeedInfo: document.getElementById('syncSpeedInfo'),
    syncCursorInfo: document.getElementById('syncCursorInfo'),
    btnSyncFromInboxToCdp: document.getElementById('btnSyncFromInboxToCdp'),

    c360FileInput: document.getElementById('c360FileInput'),
    btnImportC360: document.getElementById('btnImportC360'),
    btnDownloadSampleCsv: document.getElementById('btnDownloadSampleCsv'),
    btnLoadDemoCdp: document.getElementById('btnLoadDemoCdp'),
    btnClearPageDb: document.getElementById('btnClearPageDb'),
    c360SummaryBox: document.getElementById('c360SummaryBox'),

    // Tab 2
    segKpiTotal: document.getElementById('segKpiTotal'),
    segKpi24h: document.getElementById('segKpi24h'),
    segKpiChampions: document.getElementById('segKpiChampions'),
    segKpiRsvDue: document.getElementById('segKpiRsvDue'),
    segKpiLtv: document.getElementById('segKpiLtv'),
    btnResetFilters: document.getElementById('btnResetFilters'),
    rfmFilterPills: document.getElementById('rfmFilterPills'),
    rsvFilterPills: document.getElementById('rsvFilterPills'),
    fltWithin24h: document.getElementById('fltWithin24h'),
    fltHasOrders: document.getElementById('fltHasOrders'),
    fltHasMktToken: document.getElementById('fltHasMktToken'),
    fltHideCooldown: document.getElementById('fltHideCooldown'),
    fltContactSearch: document.getElementById('fltContactSearch'),
    hourChart: document.getElementById('hourChart'),
    hourFilterBadge: document.getElementById('hourFilterBadge'),
    btnClearHourFilter: document.getElementById('btnClearHourFilter'),
    filteredCountLabel: document.getElementById('filteredCountLabel'),
    selectedCountBadge: document.getElementById('selectedCountBadge'),
    btnSelectAllFiltered: document.getElementById('btnSelectAllFiltered'),
    btnClearSelected: document.getElementById('btnClearSelected'),
    btnGoToCopy: document.getElementById('btnGoToCopy'),
    cdpContactList: document.getElementById('cdpContactList'),
    pageInfo: document.getElementById('pageInfo'),
    btnPrevPage: document.getElementById('btnPrevPage'),
    btnNextPage: document.getElementById('btnNextPage'),

    // Tab 3
    presetGrid: document.getElementById('presetGrid'),
    btnSavePreset: document.getElementById('btnSavePreset'),
    btnAddPreset: document.getElementById('btnAddPreset'),
    btnDeletePreset: document.getElementById('btnDeletePreset'),
    btnResetPresets: document.getElementById('btnResetPresets'),
    presetTitleInput: document.getElementById('presetTitleInput'),
    imageDropzone: document.getElementById('imageDropzone'),
    imageFileInput: document.getElementById('imageFileInput'),
    btnPickImages: document.getElementById('btnPickImages'),
    sendOrderSelect: document.getElementById('sendOrderSelect'),
    btnClearImages: document.getElementById('btnClearImages'),
    attachedImagesGrid: document.getElementById('attachedImagesGrid'),
    imageUrlInput: document.getElementById('imageUrlInput'),
    messageInput: document.getElementById('messageInput'),
    charCount: document.getElementById('charCount'),
    chkSegmentOverrides: document.getElementById('chkSegmentOverrides'),
    segmentOverridesPanel: document.getElementById('segmentOverridesPanel'),
    ovrDueNow: document.getElementById('ovrDueNow'),
    ovrChampions: document.getElementById('ovrChampions'),
    ovrAtRisk: document.getElementById('ovrAtRisk'),
    ovrWarmLead: document.getElementById('ovrWarmLead'),
    btnRandomizePreview: document.getElementById('btnRandomizePreview'),
    previewContactSelect: document.getElementById('previewContactSelect'),
    previewSampleMeta: document.getElementById('previewSampleMeta'),
    previewChatStack: document.getElementById('previewChatStack'),
    previewImagesWrap: document.getElementById('previewImagesWrap'),
    previewBubble: document.getElementById('previewBubble'),
    previewFooter: document.getElementById('previewFooter'),
    btnGoToLaunch: document.getElementById('btnGoToLaunch'),
    btnTestSendOne: document.getElementById('btnTestSendOne'),
    testSendResult: document.getElementById('testSendResult'),

    // Tab 4
    launchSelectedPill: document.getElementById('launchSelectedPill'),
    launchWindowHint: document.getElementById('launchWindowHint'),
    launchWindowHintText: document.getElementById('launchWindowHintText'),
    btnSwitchToInboxDom: document.getElementById('btnSwitchToInboxDom'),
    modeCardBatch: document.getElementById('modeCardBatch'),
    modeCardSmartTime: document.getElementById('modeCardSmartTime'),
    campaignTitleInput: document.getElementById('campaignTitleInput'),
    messagingModeSelect: document.getElementById('messagingModeSelect'),
    messageTagWrap: document.getElementById('messageTagWrap'),
    messageTagSelect: document.getElementById('messageTagSelect'),
    batchSizeSelect: document.getElementById('batchSizeSelect'),
    sortPrioritySelect: document.getElementById('sortPrioritySelect'),
    apiDelayMs: document.getElementById('apiDelayMs'),
    cooldownDaysInput: document.getElementById('cooldownDaysInput'),
    quietHoursPanel: document.getElementById('quietHoursPanel'),
    quietStartHour: document.getElementById('quietStartHour'),
    quietEndHour: document.getElementById('quietEndHour'),
    quietShiftTarget: document.getElementById('quietShiftTarget'),
    jitterMinutes: document.getElementById('jitterMinutes'),
    chkNotifyDesktop: document.getElementById('chkNotifyDesktop'),
    chkAutoContinueBatch: document.getElementById('chkAutoContinueBatch'),
    chkDryRun: document.getElementById('chkDryRun'),
    btnCreateCampaign: document.getElementById('btnCreateCampaign'),

    batchQueuePanel: document.getElementById('batchQueuePanel'),
    activeCampaignTitle: document.getElementById('activeCampaignTitle'),
    activeCampaignMeta: document.getElementById('activeCampaignMeta'),
    btnPauseCampaign: document.getElementById('btnPauseCampaign'),
    btnStopCampaign: document.getElementById('btnStopCampaign'),
    btnRetryRateLimited: document.getElementById('btnRetryRateLimited'),
    btnExportFailedCsv: document.getElementById('btnExportFailedCsv'),
    batchCardsContainer: document.getElementById('batchCardsContainer'),

    smartSchedulePanel: document.getElementById('smartSchedulePanel'),
    scheduleSummaryBar: document.getElementById('scheduleSummaryBar'),
    scheduleHourBreakdown: document.getElementById('scheduleHourBreakdown'),
    btnTriggerSchedulerNow: document.getElementById('btnTriggerSchedulerNow'),
    btnToggleScheduler: document.getElementById('btnToggleScheduler'),
    btnCancelScheduledCampaign: document.getElementById('btnCancelScheduledCampaign'),

    apiLogBox: document.getElementById('apiLogBox'),
    pastCampaignsList: document.getElementById('pastCampaignsList'),

    // Tab 5 (Legacy DOM)
    legacyConnectionPill: document.getElementById('legacyConnectionPill'),
    btnLegacyCheckConn: document.getElementById('btnLegacyCheckConn'),
    btnLegacyOpenInbox: document.getElementById('btnLegacyOpenInbox'),
    legacyStatusTab: document.getElementById('legacyStatusTab'),
    legacyStatusPage: document.getElementById('legacyStatusPage'),
    legacyStatusContacts: document.getElementById('legacyStatusContacts'),
    legacyScanDepth: document.getElementById('legacyScanDepth'),
    btnLegacyScanInbox: document.getElementById('btnLegacyScanInbox'),
    legacyContactSearch: document.getElementById('legacyContactSearch'),
    chkLegacySelectAll: document.getElementById('chkLegacySelectAll'),
    btnLegacyPushToCdp: document.getElementById('btnLegacyPushToCdp'),
    btnLegacyClearHistory: document.getElementById('btnLegacyClearHistory'),
    legacyContactsList: document.getElementById('legacyContactsList'),
    legacyMinDelay: document.getElementById('legacyMinDelay'),
    legacyMaxDelay: document.getElementById('legacyMaxDelay'),
    legacyCooldownDays: document.getElementById('legacyCooldownDays'),
    chkLegacyAutoSend: document.getElementById('chkLegacyAutoSend'),
    btnLegacyStartSend: document.getElementById('btnLegacyStartSend'),
    btnLegacyPauseSend: document.getElementById('btnLegacyPauseSend'),
    btnLegacyStopSend: document.getElementById('btnLegacyStopSend'),
    legacyProgressLabel: document.getElementById('legacyProgressLabel'),
    legacyProgressCount: document.getElementById('legacyProgressCount'),
    legacyProgressBar: document.getElementById('legacyProgressBar'),
    legacyLogBox: document.getElementById('legacyLogBox'),

    // Tab 5 (Workflows RFM/RSV)
    wfActiveEnrollPill: document.getElementById('wfActiveEnrollPill'),
    wfSelect: document.getElementById('wfSelect'),
    btnWfResetDefaults: document.getElementById('btnWfResetDefaults'),
    btnWfSave: document.getElementById('btnWfSave'),
    btnWfAddStep: document.getElementById('btnWfAddStep'),
    chkWfActive: document.getElementById('chkWfActive'),
    chkWfStopConvert: document.getElementById('chkWfStopConvert'),
    chkWfQuietHours: document.getElementById('chkWfQuietHours'),
    wfStepsContainer: document.getElementById('wfStepsContainer'),
    btnWfRunDueNow: document.getElementById('btnWfRunDueNow'),
    wfSelectedCountLabel: document.getElementById('wfSelectedCountLabel'),
    chkWfDryRun: document.getElementById('chkWfDryRun'),
    wfDeliveryModeSelect: document.getElementById('wfDeliveryModeSelect'),
    btnWfEnrollSelected: document.getElementById('btnWfEnrollSelected'),
    wfEnrollmentsCount: document.getElementById('wfEnrollmentsCount'),
    btnWfClearCompleted: document.getElementById('btnWfClearCompleted'),
    wfEnrollmentsList: document.getElementById('wfEnrollmentsList'),
    wfServerUrlInput: document.getElementById('wfServerUrlInput'),
    wfServerSecretInput: document.getElementById('wfServerSecretInput'),
    btnWfPullServer: document.getElementById('btnWfPullServer'),
    btnWfPushServer: document.getElementById('btnWfPushServer'),
    wfServerSyncStatus: document.getElementById('wfServerSyncStatus'),
  };

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let toastTimer = null;

  function showToast(text, level = 'info', durationMs = 4500) {
    if (!el.globalToast) return;
    el.globalToast.textContent = text;
    el.globalToast.className = `toast toast-${level}`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.globalToast.classList.add('hidden');
    }, durationMs);
  }

  function showInlineAlert(boxEl, text, level = 'warn') {
    if (!boxEl) return;
    boxEl.textContent = text;
    boxEl.className = `inline-alert ${level}`;
  }

  function hideInlineAlert(boxEl) {
    if (!boxEl) return;
    boxEl.textContent = '';
    boxEl.className = 'inline-alert hidden';
  }

  function addLog(text, level = 'info', targetBox = el.apiLogBox) {
    if (!targetBox) return;
    const time = new Date().toLocaleTimeString('th-TH', { hour12: false });
    const div = document.createElement('div');
    div.className = `log-${level}`;
    div.textContent = `[${time}] ${text}`;
    targetBox.appendChild(div);
    targetBox.scrollTop = targetBox.scrollHeight;
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

  function switchTab(tabName, { persist = true } = {}) {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      const active = btn.dataset.tab === tabName;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
    if (persist) {
      chrome.storage.local.set({ [STORAGE_KEYS.LAST_TAB]: tabName }).catch(() => { });
    }
  }

  function normalizeNameKey(name) {
    return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function getContactLastSentAt(contact) {
    if (!contact) return 0;
    const key1 = contact.psid || contact.id;
    const key2 = contact.id;
    const key3 = normalizeNameKey(contact.name);
    const key4 = String(contact.normalizedName || '').trim().toLowerCase();
    return Math.max(
      Number(sentHistory[key1]) || 0,
      Number(sentHistory[key2]) || 0,
      key3 ? Number(sentHistory[key3]) || 0 : 0,
      key4 ? Number(sentHistory[key4]) || 0 : 0,
      Number(contact.lastSentAt) || 0
    );
  }

  function getCooldownRemainingDays(contact, daysOverride = null) {
    const rawVal = el.cooldownDaysInput ? el.cooldownDaysInput.value : '14';
    const days = daysOverride !== null
      ? Math.max(0, Number(daysOverride) || 0)
      : Math.max(0, rawVal === '' ? 14 : Number(rawVal) || 0);
    if (days === 0) return 0;
    const lastSent = getContactLastSentAt(contact);
    if (!lastSent) return 0;
    const elapsedDays = (Date.now() - lastSent) / (1000 * 60 * 60 * 24);
    if (elapsedDays >= days) return 0;
    return Math.max(1, Math.ceil(days - elapsedDays));
  }

  function isInCooldown(contact, daysOverride = null) {
    return getCooldownRemainingDays(contact, daysOverride) > 0;
  }

  function updateGlobalBadges() {
    const hasToken = Boolean(graphConfig.accessToken);
    el.apiStatusPill.className = `pill ${hasToken ? 'ok' : 'warn'}`;
    el.apiStatusPill.textContent = hasToken
      ? `Meta API: ${graphConfig.pageName || 'เชื่อมต่อแล้ว'}`
      : 'Meta API: ยังไม่ต่อ Token (ใช้ Demo/CSV ได้)';
    el.cdpCountPill.textContent = `CDP: ${allContacts.length.toLocaleString('th-TH')} คน`;
    el.kpiDbContacts.textContent = `${allContacts.length.toLocaleString('th-TH')} คน`;
    el.cooldownGlobalPill.textContent = `ประวัติส่งแล้ว: ${Object.keys(sentHistory).length.toLocaleString('th-TH')} คน`;

    el.schedulerPill.className = `pill ${schedulerEnabled ? 'ok' : 'warn'}`;
    el.schedulerPill.textContent = schedulerEnabled ? 'Scheduler: เปิด' : 'Scheduler: พัก';

    const selCount = selectedContactIds.size;
    el.selectedCountBadge.textContent = `เลือกสำหรับแคมเปญ: ${selCount.toLocaleString('th-TH')} คน`;
    el.launchSelectedPill.textContent = `กลุ่มเป้าหมายที่เลือก: ${selCount.toLocaleString('th-TH')} คน`;
    if (el.wfSelectedCountLabel) {
      el.wfSelectedCountLabel.textContent = selCount.toLocaleString('th-TH');
    }
    if (el.btnGoToLaunch) {
      el.btnGoToLaunch.textContent = `🚀 ไปหน้ายิงจริงให้กลุ่มที่เลือก (${selCount.toLocaleString('th-TH')} คน) — แท็บ 4 →`;
    }

    const mode = getSelectedDeliveryMode();
    el.btnCreateCampaign.textContent =
      mode === 'smart_time'
        ? `🕒 สร้างตารางเวลาทองรายบุคคล & เริ่ม Scheduler (${selCount.toLocaleString('th-TH')} คน)`
        : `⚡ สร้างคิว & เริ่มยิงทันที (${selCount.toLocaleString('th-TH')} คน)`;
    updateLaunchWindowHint();
  }

  function updateLaunchWindowHint() {
    if (!el.launchWindowHint) return;
    const modeVal = el.messagingModeSelect.value;
    if (selectedContactIds.size === 0 || modeVal === 'INBOX_DOM' || modeVal === 'TURBO_DIRECT') {
      hideInlineAlert(el.launchWindowHint);
      if (el.btnSwitchToInboxDom) el.btnSwitchToInboxDom.classList.add('hidden');
      return;
    }

    const outside24h = allContacts.filter((c) => selectedContactIds.has(c.id) && !c.within24h).length;
    if (outside24h > 0 && modeVal === 'RESPONSE') {
      const msg = `⚠️ กลุ่มที่เลือกมี ${outside24h.toLocaleString('th-TH')} คนที่ทักแชทเกิน 24 ชม. แล้ว — หากส่งด้วย Meta API (RESPONSE) จะไม่ผ่าน (#10) และถ้า App ยังไม่ผ่าน App Review แนะนำกดเปลี่ยนเป็นส่งผ่านแท็บ Inbox ของเพจแทนครับ`;
      if (el.launchWindowHintText) el.launchWindowHintText.textContent = msg;
      else el.launchWindowHint.textContent = msg;
      el.launchWindowHint.className = 'inline-alert warn row-between';
      if (el.btnSwitchToInboxDom) el.btnSwitchToInboxDom.classList.remove('hidden');
    } else {
      hideInlineAlert(el.launchWindowHint);
      if (el.btnSwitchToInboxDom) el.btnSwitchToInboxDom.classList.add('hidden');
    }
  }

  // ==================== TAB 1: META API & CURSOR SYNC & CUSTOMER 360 ====================

  async function persistGraphConfig() {
    await chrome.storage.local.set({ [STORAGE_KEYS.GRAPH_CONFIG]: graphConfig });
  }

  function renderGraphConnectionState() {
    el.kpiPageName.textContent = graphConfig.pageName || '⚠️ ยังไม่ได้เชื่อมต่อ Token';
    el.kpiPageId.textContent = graphConfig.pageId || '-';
    if (el.turboPageIdInput && graphConfig.pageId && /^\d+$/.test(graphConfig.pageId)) {
      el.turboPageIdInput.value = graphConfig.pageId;
    }
    const pct = graphConfig.lastUsagePct || 0;
    el.kpiApiUsage.textContent = `${pct}% ${pct >= 75 ? '(สูง — ชะลออัตโนมัติ)' : '(ปกติ)'}`;
    el.kpiApiUsage.style.color = pct >= 75 ? '#fca5a5' : '#6ee7b7';
    updateGlobalBadges();
  }

  async function setActivePageIdForTurbo(pageId, pageName = '') {
    const cleanId = String(pageId || '').trim();
    if (!/^\d{4,}$/.test(cleanId)) return false;
    graphConfig.pageId = cleanId;
    if (pageName) {
      graphConfig.pageName = pageName;
    } else if (cleanId === '561475983873000') {
      graphConfig.pageName = 'One Person Ceo คุณก็เป็นประธานบริษัทได้ด้วย AI Agent';
    } else if (!graphConfig.pageName || graphConfig.pageName.includes('ยังไม่ได้เชื่อมต่อ')) {
      graphConfig.pageName = `เพจ Facebook (${cleanId})`;
    }
    if (el.turboPageIdInput) el.turboPageIdInput.value = cleanId;
    if (el.messagingModeSelect?.value === 'TURBO_DIRECT') {
      el.chkDryRun.checked = false;
    }
    await persistGraphConfig();
    renderGraphConnectionState();
    await refreshSyncStateUi();
    await loadContactsFromDb();
    return true;
  }

  async function handleDiagnoseTurbo() {
    const typedId = (el.turboPageIdInput?.value || '').trim();
    const candidateId = /^\d{4,}$/.test(typedId)
      ? typedId
      : /^\d{4,}$/.test(graphConfig.pageId || '')
        ? graphConfig.pageId
        : '561475983873000';

    if (candidateId !== graphConfig.pageId) {
      await setActivePageIdForTurbo(candidateId);
    }

    el.btnDiagnoseTurbo.disabled = true;
    el.btnDiagnoseTurbo.textContent = '⏳ กำลังตรวจสด...';
    showInlineAlert(el.turboDiagBox, 'กำลังตรวจสอบเซสชัน Facebook, DNR Rules และทดลองอ่าน GraphQL Inbox...', 'info');

    try {
      const diag = await OnePersonTurboDirect.diagnoseTurboEngine({
        pageId: candidateId,
        pageAccessToken: graphConfig.accessToken || '',
      });

      const sampleNames = (diag.graphqlSampleContacts || [])
        .map((c) => `${c.name} (FBID: ${c.fbid})`)
        .join(' | ');

      if (diag.ok) {
        const msg =
          `✅ BroadTurbo Engine พร้อมใช้งาน 100%! • Session User: ${diag.sessionName} (${diag.sessionFacebookId}) • ` +
          `DNR Header Rules: ${diag.dnrRuleCount} กฎ • c_user Cookie: ${diag.hasCUserCookie ? 'มี' : 'ตรวจไม่พบ'} • ` +
          `GraphQL Inbox: ดึงได้ ${diag.graphqlSampleCount} แชทตัวอย่าง` +
          (sampleNames ? ` [${sampleNames}]` : '') +
          (diag.tokenCheck ? ` • Page Token: ${diag.tokenCheck.ok ? 'ใช้งานได้' : `มีปัญหา (${diag.tokenCheck.error})`}` : '');
        showInlineAlert(el.turboDiagBox, msg, 'ok');
        addLog(msg, 'ok');
        showToast('ตรวจระบบ BroadTurbo ผ่าน 100% พร้อมยิงจริง!', 'ok', 4000);
      } else {
        const problems = [];
        if (!diag.sessionValid) problems.push(`Session: ${diag.sessionError}`);
        if (diag.sessionValid && !diag.graphqlOk) problems.push(`GraphQL Inbox: ${diag.graphqlError || 'อ่านไม่สำเร็จ'}`);
        const msg =
          `⚠️ ระบบ BroadTurbo ยังไม่พร้อม: ${problems.join(' • ')} | ` +
          `DNR Rules: ${diag.dnrRuleCount} • c_user Cookie: ${diag.hasCUserCookie ? 'มี' : 'ไม่มี (กรุณาล็อกอิน facebook.com / business.facebook.com ใน Chrome)'}`;
        showInlineAlert(el.turboDiagBox, msg, 'err');
        addLog(msg, 'err');
        showToast('พบปัญหาการเชื่อมต่อ Facebook Session — ดูรายละเอียดในกล่องสีแดง', 'err', 6000);
      }
    } catch (err) {
      const msg = `ตรวจระบบ BroadTurbo ล้มเหลว: ${err?.message || String(err)}`;
      showInlineAlert(el.turboDiagBox, msg, 'err');
      addLog(msg, 'err');
    } finally {
      el.btnDiagnoseTurbo.disabled = false;
      el.btnDiagnoseTurbo.textContent = '🩺 ตรวจระบบ BroadTurbo สด';
    }
  }

  async function handleVerifyToken() {
    const token = (el.tokenInput.value || '').trim();
    if (!token) {
      const msg = 'กรุณาวาง Page Access Token ในช่องด้านบนก่อนกดตรวจสอบครับ';
      el.tokenInput.classList.add('input-error');
      el.tokenInput.focus();
      showInlineAlert(el.tokenStatusMsg, msg, 'warn');
      showToast(msg, 'warn');
      addLog(msg, 'warn');
      return;
    }

    el.tokenInput.classList.remove('input-error');
    hideInlineAlert(el.tokenStatusMsg);
    el.btnVerifyToken.disabled = true;
    el.btnVerifyToken.textContent = '⏳ กำลังตรวจสอบ...';
    const res = await OnePersonGraphAPI.verifyToken(token);
    el.btnVerifyToken.disabled = false;
    el.btnVerifyToken.textContent = '🔍 ตรวจสอบและเชื่อมต่อ Token';

    if (!res.ok) {
      const errMsg = `ตรวจสอบ Token ไม่สำเร็จ: ${res.error?.label || 'ไม่ทราบสาเหตุ'}`;
      showInlineAlert(el.tokenStatusMsg, errMsg, 'err');
      showToast(errMsg, 'err', 6000);
      addLog(errMsg, 'err');
      return;
    }

    graphConfig.pages = res.pages || [];
    graphConfig.lastUsagePct = res.usagePct || 0;

    if (graphConfig.pages.length > 1) {
      el.pageSelectRow.classList.remove('hidden');
      el.pageSelect.innerHTML = '';
      graphConfig.pages.forEach((pg) => {
        const opt = document.createElement('option');
        opt.value = pg.id;
        opt.textContent = `${pg.name} (ID: ${pg.id})`;
        el.pageSelect.appendChild(opt);
      });
      const preferred =
        graphConfig.pages.find((p) => /one\s*person\s*ceo/i.test(p.name)) || graphConfig.pages[0];
      el.pageSelect.value = preferred.id;
      await selectActiveGraphPage(preferred);
    } else if (graphConfig.pages.length === 1) {
      el.pageSelectRow.classList.add('hidden');
      await selectActiveGraphPage(graphConfig.pages[0]);
    }

    hideInlineAlert(el.syncAlertBox);
    await probeAndShowPageAccess();
  }

  async function probeAndShowPageAccess() {
    if (!graphConfig.pageId || !graphConfig.accessToken) return;
    showInlineAlert(el.tokenStatusMsg, `เชื่อมต่อเพจ ${graphConfig.pageName} แล้ว — กำลังทดสอบสิทธิ์ดึงแชท /conversations...`, 'info');
    const probe = await OnePersonGraphAPI.probeConversationsAccess({
      pageId: graphConfig.pageId,
      accessToken: graphConfig.accessToken,
    });
    graphConfig.lastUsagePct = probe.usagePct || graphConfig.lastUsagePct || 0;
    renderGraphConnectionState();

    if (probe.ok) {
      hideInlineAlert(el.syncAlertBox);
      const okMsg = `✅ เชื่อมต่อเพจ "${graphConfig.pageName}" สำเร็จ และทดสอบดึงแชทผ่าน 100%! พร้อมกดปุ่ม "⚡ เริ่มซิงค์จากล่าสุด" ด้านล่างได้เลยครับ`;
      showInlineAlert(el.tokenStatusMsg, okMsg, 'ok');
      showToast(`เชื่อมต่อเพจ ${graphConfig.pageName} และทดสอบสิทธิ์ผ่าน!`, 'ok');
      addLog(okMsg, 'ok');
    } else {
      const errDetail = probe.error?.label || 'ไม่สามารถอ่านรายการแชทได้';
      const warnMsg = `⚠️ เชื่อมต่อเพจ "${graphConfig.pageName}" ได้แล้ว แต่ทดสอบดึงแชทยังไม่ผ่าน: ${errDetail}`;
      showInlineAlert(el.tokenStatusMsg, warnMsg, 'err');
      showInlineAlert(el.syncAlertBox, errDetail, 'err');
      showToast('Token ยังขาดสิทธิ์ดึงแชท ดูข้อความสีแดงจาก Meta ในหน้าจอได้เลยครับ', 'err', 6500);
      addLog(warnMsg, 'err');
    }
  }

  async function selectActiveGraphPage(pageObj) {
    if (!pageObj) return;
    graphConfig.pageId = String(pageObj.id);
    graphConfig.pageName = pageObj.name || pageObj.id;
    graphConfig.accessToken = pageObj.access_token || (el.tokenInput.value || '').trim();
    el.chkDryRun.checked =
      !Boolean(graphConfig.accessToken) &&
      el.messagingModeSelect?.value !== 'TURBO_DIRECT' &&
      el.messagingModeSelect?.value !== 'INBOX_DOM';
    await persistGraphConfig();
    renderGraphConnectionState();
    await refreshSyncStateUi();
    await loadContactsFromDb();
  }

  async function refreshSyncStateUi() {
    const state = await OnePersonDB.getSyncState(graphConfig.pageId);
    if (state && state.afterCursor) {
      el.btnResumeSync.disabled = false;
      el.syncCursorInfo.textContent = `Cursor ที่บันทึกไว้: ...${state.afterCursor.slice(-28)} (ดึงไปแล้ว ${Number(state.totalFetched || 0).toLocaleString('th-TH')} คน)`;
    } else {
      el.btnResumeSync.disabled = true;
      el.syncCursorInfo.textContent = 'Cursor: ยังไม่มีจุดพัก';
    }
  }

  async function runTurboGraphQLSync() {
    if (syncRunning) return;

    let pageId = (el.turboPageIdInput?.value || '').trim();
    if (!/^\d{4,}$/.test(pageId)) {
      pageId = /^\d{4,}$/.test(graphConfig.pageId || '') ? graphConfig.pageId : '';
    }
    if (!pageId) {
      const tabRes = await sendToBackground('DETECT_PAGE_FROM_INBOX_TAB').catch(() => null);
      if (tabRes && tabRes.ok && tabRes.pageId) {
        pageId = tabRes.pageId;
      } else {
        pageId = '561475983873000';
      }
    }

    await setActivePageIdForTurbo(pageId);
    hideInlineAlert(el.syncAlertBox);

    const maxTarget = Number(el.syncTargetSelect.value) || 20000;
    const existingList = await OnePersonDB.getContacts(graphConfig.pageId);
    const existingByFbid = new Map();
    const existingByNormName = new Map();
    for (const c of existingList) {
      if (c.fbid) existingByFbid.set(String(c.fbid), c);
      const norm = c.normalizedName || OnePersonCDP.normalizeName(c.name);
      if (norm && !existingByNormName.has(norm)) existingByNormName.set(norm, c);
    }

    syncRunning = true;
    syncStopRequested = false;
    if (el.btnStartTurboSync) el.btnStartTurboSync.disabled = true;
    el.btnStartSync.disabled = true;
    el.btnResumeSync.disabled = true;
    el.btnPauseSync.disabled = false;
    el.syncProgressBar.style.width = '0%';
    el.syncStatusText.textContent = '🚀 กำลังซิงค์รายชื่อแชท + FBID จริงผ่าน BroadTurbo GraphQL...';

    const startMs = Date.now();
    let totalSaved = 0;

    try {
      const result = await OnePersonTurboDirect.syncAllTurboAudiences({
        pageId: graphConfig.pageId,
        maxTarget,
        inboxes: ['INBOX', 'ARCHIVED'],
        paceMs: 400,
        shouldStop: () => syncStopRequested,
        onProgress: async ({ folder, batchNum, totalCollected, batchContacts, nextCursor }) => {
          if (batchContacts && batchContacts.length > 0) {
            const batchScored = batchContacts.map((raw) => {
              const norm = OnePersonCDP.normalizeName(raw.name);
              const prev = existingByFbid.get(raw.fbid) || (norm ? existingByNormName.get(norm) : null);
              const mergedTags = Array.from(
                new Set([...(prev?.tags || []), ...(raw.tags || [])].filter(Boolean))
              );
              const merged = prev
                ? {
                  ...prev,
                  fbid: raw.fbid,
                  name: raw.name || prev.name,
                  gender: raw.gender || prev.gender || '',
                  lastInteractionAt: Math.max(Number(prev.lastInteractionAt) || 0, Number(raw.lastInteractionAt) || 0),
                  labels: raw.labels?.length ? raw.labels : prev.labels || [],
                  tags: mergedTags,
                  source: prev.source === 'graph_api' ? 'graph_api+broadturbo' : 'broadturbo_graphql',
                }
                : {
                  id: `${graphConfig.pageId}:fbid:${raw.fbid}`,
                  pageId: graphConfig.pageId,
                  fbid: raw.fbid,
                  psid: '',
                  threadId: '',
                  name: raw.name,
                  gender: raw.gender || '',
                  lastInteractionAt: raw.lastInteractionAt,
                  lastSnippet: '',
                  messageCount: 1,
                  unreadCount: 0,
                  labels: raw.labels || [],
                  tags: mergedTags,
                  source: 'broadturbo_graphql',
                };
              return OnePersonCDP.scoreContact(merged);
            });

            await OnePersonDB.bulkUpsertContacts(batchScored);
            for (const c of batchScored) {
              if (c.fbid) existingByFbid.set(String(c.fbid), c);
              if (c.normalizedName) existingByNormName.set(c.normalizedName, c);
            }
            totalSaved = totalCollected;
          }

          const elapsedSec = Math.max(0.1, (Date.now() - startMs) / 1000);
          const speed = Math.round(totalCollected / elapsedSec);
          const pct = Math.min(100, Math.round((totalCollected / maxTarget) * 100));
          el.syncProgressBar.style.width = `${pct}%`;
          el.syncStatusText.textContent = `🚀 [${folder} รอบ ${batchNum}] ดึง FBID จริงแล้ว ${totalCollected.toLocaleString('th-TH')} / ${maxTarget.toLocaleString('th-TH')} คน`;
          el.syncSpeedInfo.textContent = `${speed} คน/วินาที`;
          el.syncCursorInfo.textContent = nextCursor ? `BroadTurbo Cursor: ${nextCursor}` : `BroadTurbo (${folder}): กำลังเสร็จสิ้น`;
        },
      });

      if (!result.ok) {
        const errMsg = result.error?.label || 'ซิงค์แบบ BroadTurbo ไม่สำเร็จ';
        showInlineAlert(el.syncAlertBox, errMsg, 'err');
        el.syncStatusText.textContent = `หยุดซิงค์: ${errMsg}`;
        showToast(errMsg, 'err', 6500);
        addLog(`ซิงค์ BroadTurbo ไม่สำเร็จ: ${errMsg}`, 'err');
        return;
      }

      if (syncStopRequested) {
        const msg = `พักการซิงค์ BroadTurbo ที่ ${totalSaved.toLocaleString('th-TH')} คน (บันทึกลงฐานข้อมูลแล้ว)`;
        showInlineAlert(el.syncAlertBox, msg, 'warn');
        addLog(msg, 'warn');
      } else if (result.partial) {
        const msg = `ซิงค์ BroadTurbo ได้บางส่วน ${result.contacts.length.toLocaleString('th-TH')} คน (${result.warning || 'หยุดกลางคัน'}) — พร้อมยิงจริงทันที!`;
        showInlineAlert(el.syncAlertBox, msg, 'warn');
        showToast(msg, 'warn', 5000);
        addLog(msg, 'warn');
      } else {
        const msg = `✅ ซิงค์แชทสดแบบ BroadTurbo สำเร็จ ${result.contacts.length.toLocaleString('th-TH')} คน (ได้ FBID จริงครบทุกคน — พร้อมยิงโหมด 🚀 Turbo Direct ทันที!)`;
        showInlineAlert(el.syncAlertBox, msg, 'ok');
        showToast(`ซิงค์ BroadTurbo สำเร็จ ${result.contacts.length.toLocaleString('th-TH')} คน!`, 'ok', 4500);
        addLog(msg, 'ok');
      }
      el.syncProgressBar.style.width = '100%';
    } finally {
      syncRunning = false;
      if (el.btnStartTurboSync) el.btnStartTurboSync.disabled = false;
      el.btnStartSync.disabled = false;
      el.btnPauseSync.disabled = true;
      await refreshSyncStateUi();
      await loadContactsFromDb();
    }
  }

  async function runCursorSync({ resume = false } = {}) {
    if (!graphConfig.accessToken || !graphConfig.pageId || graphConfig.pageId === 'demo_onepersonceo') {
      const msg =
        'ยังไม่ได้เชื่อมต่อ Page Access Token ของเพจจริง — กรุณาวาง Token ในส่วน 1.1 แล้วกด "🔍 ตรวจสอบและเชื่อมต่อ Token" ก่อนครับ (หรือกดปุ่ม "🧭 ดึงจากแท็บ Inbox เข้า CDP" / "✨ โหลดข้อมูลจำลอง 240 คน" ได้ทันที)';
      showInlineAlert(el.syncAlertBox, msg, 'err');
      el.syncStatusText.textContent = 'รอเชื่อมต่อ Token ในส่วน 1.1 ก่อนซิงค์';
      el.tokenInput.classList.add('input-error');
      el.tokenInput.focus();
      showToast('ยังไม่ได้เชื่อมต่อ Token ในส่วน 1.1 ครับ', 'err', 5500);
      addLog(msg, 'warn');
      return;
    }

    hideInlineAlert(el.syncAlertBox);
    const maxTarget = Number(el.syncTargetSelect.value) || 20000;
    const limit = Number(el.syncBatchLimit.value) || 100;

    let savedState = resume ? await OnePersonDB.getSyncState(graphConfig.pageId) : null;
    let afterCursor = savedState?.afterCursor || null;
    let totalFetched = savedState?.totalFetched || 0;

    // Load existing contacts to preserve Customer 360 enrichment fields
    const existingList = await OnePersonDB.getContacts(graphConfig.pageId);
    const existingById = new Map(existingList.map((c) => [c.id, c]));

    syncRunning = true;
    syncStopRequested = false;
    el.btnStartSync.disabled = true;
    el.btnResumeSync.disabled = true;
    el.btnPauseSync.disabled = false;
    el.syncStatusText.textContent = 'กำลังดึงรายชื่อแชทผ่าน Meta Graph API...';

    const startMs = Date.now();
    let sessionFetched = 0;
    let syncError = null;
    let useMinimalFields = false;
    let omitPlatform = false;

    try {
      while (!syncStopRequested && totalFetched < maxTarget) {
        const res = await OnePersonGraphAPI.fetchConversationsPage({
          pageId: graphConfig.pageId,
          accessToken: graphConfig.accessToken,
          limit,
          afterCursor,
          minimalFields: useMinimalFields,
          omitPlatform,
        });

        if (res.usedMinimalFields) useMinimalFields = true;
        if (res.usedOmitPlatform) omitPlatform = true;

        graphConfig.lastUsagePct = res.usagePct || 0;
        renderGraphConnectionState();

        if (!res.ok) {
          if (res.error?.retryable) {
            el.syncStatusText.textContent = 'ติด Rate Limit ชั่วคราว — รอ 8 วินาทีแล้วซิงค์ต่อ...';
            addLog(`ติด Rate Limit ชั่วคราว — รอ 8 วินาทีแล้วซิงค์ต่อ...`, 'warn');
            await new Promise((r) => setTimeout(r, 8000));
            continue;
          }
          syncError = res.error?.label || 'เกิดข้อผิดพลาดในการเรียก Meta API';
          showInlineAlert(el.syncAlertBox, `ดึงไม่สำเร็จ: ${syncError}`, 'err');
          el.syncStatusText.textContent = `หยุดซิงค์: ${syncError}`;
          showToast(`ดึงไม่สำเร็จ: ${syncError}`, 'err', 6500);
          addLog(`ซิงค์หยุดชั่วคราว: ${syncError}`, 'err');
          break;
        }

        const batchScored = res.contacts.map((raw) => {
          const prev = existingById.get(raw.id);
          const merged = prev
            ? {
              ...prev,
              ...raw,
              fbid: prev.fbid || '',
              labels: prev.labels || [],
              orderCount: prev.orderCount || 0,
              totalSpent: prev.totalSpent || 0,
              lastOrderAt: prev.lastOrderAt || null,
              orderHours: prev.orderHours || [],
              avgCycleDays: prev.avgCycleDays || 30,
              lastProduct: prev.lastProduct || '',
              tags: prev.tags || [],
              marketingOptInToken: prev.marketingOptInToken || '',
              c360Enriched: prev.c360Enriched || false,
            }
            : raw;
          return OnePersonCDP.scoreContact(merged);
        });

        if (batchScored.length > 0) {
          await OnePersonDB.bulkUpsertContacts(batchScored);
          batchScored.forEach((c) => existingById.set(c.id, c));
        }

        totalFetched += batchScored.length;
        sessionFetched += batchScored.length;
        afterCursor = res.nextCursor;

        await OnePersonDB.saveSyncState({
          pageId: graphConfig.pageId,
          afterCursor: res.hasMore ? afterCursor : null,
          totalFetched,
          completed: !res.hasMore,
        });

        const elapsedSec = Math.max(0.1, (Date.now() - startMs) / 1000);
        const speed = Math.round(sessionFetched / elapsedSec);
        const pct = Math.min(100, Math.round((totalFetched / maxTarget) * 100));
        el.syncProgressBar.style.width = `${pct}%`;
        el.syncStatusText.textContent = `ดึงแล้ว ${totalFetched.toLocaleString('th-TH')} / ${maxTarget.toLocaleString('th-TH')} คน`;
        el.syncSpeedInfo.textContent = `${speed} คน/วินาที`;
        el.syncCursorInfo.textContent = afterCursor ? `Cursor ล่าสุด: ...${afterCursor.slice(-28)}` : 'Cursor: สิ้นสุดรายการ';

        if (!res.hasMore || !afterCursor) {
          if (totalFetched === 0) {
            const zeroMsg =
              'Meta API ตอบกลับมา 0 คน — สาเหตุที่เป็นไปได้: (1) Token ยังไม่มีสิทธิ์ pages_messaging / pages_read_engagement หรือ (2) เพจที่เลือกยังไม่มีประวัติแชท Messenger ครับ';
            showInlineAlert(el.syncAlertBox, zeroMsg, 'warn');
            showToast('Meta API คืนค่า 0 คน — ตรวจสอบสิทธิ์ Token ด้านบน', 'warn', 6000);
          } else {
            const doneMsg = `ซิงค์แชทครบทั้งหมดแล้ว! รวม ${totalFetched.toLocaleString('th-TH')} คน — ไปที่แท็บ 2 เพื่อแบ่ง Segment ได้เลยครับ`;
            showInlineAlert(el.syncAlertBox, doneMsg, 'ok');
            showToast(`ซิงค์สำเร็จ ${totalFetched.toLocaleString('th-TH')} คน!`, 'ok');
          }
          addLog(`ซิงค์แชทครบทั้งหมดแล้ว! รวม ${totalFetched.toLocaleString('th-TH')} คน`, totalFetched > 0 ? 'ok' : 'warn');
          break;
        }

        if ((res.usagePct || 0) >= 75) {
          addLog(`Meta API Usage ${res.usagePct}% — หน่วง 1.5 วินาทีเพื่อความปลอดภัย`, 'warn');
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (syncStopRequested) {
        showInlineAlert(el.syncAlertBox, `พักการซิงค์ที่ ${totalFetched.toLocaleString('th-TH')} คน (กด "▶ ทำต่อจาก Cursor เดิม" ได้ทุกเมื่อ)`, 'warn');
        addLog(`พักการซิงค์ที่ ${totalFetched.toLocaleString('th-TH')} คน (บันทึก Cursor ไว้ทำต่อแล้ว)`, 'warn');
      } else if (!syncError && totalFetched >= maxTarget) {
        showInlineAlert(el.syncAlertBox, `ดึงครบเป้าหมาย ${totalFetched.toLocaleString('th-TH')} คนแล้ว! (ยังมีแชทเก่ากว่านี้ กด "▶ ทำต่อจาก Cursor เดิม" เพื่อดึงเพิ่มได้)`, 'ok');
        showToast(`ดึงสำเร็จ ${totalFetched.toLocaleString('th-TH')} คน!`, 'ok');
      }
    } finally {
      syncRunning = false;
      el.btnStartSync.disabled = false;
      el.btnPauseSync.disabled = true;
      await refreshSyncStateUi();
      await loadContactsFromDb();
    }
  }

  async function importDomContactsIntoCdp(rawContacts, detectedPageName = '') {
    if (!Array.isArray(rawContacts) || rawContacts.length === 0) {
      showToast('ไม่พบรายชื่อแชทให้บันทึกเข้า CDP ครับ', 'warn');
      return 0;
    }

    if (!graphConfig.pageId) {
      graphConfig.pageId = 'inbox_dom_page';
      graphConfig.pageName = detectedPageName || 'One Person Ceo (Inbox DOM)';
      await persistGraphConfig();
      renderGraphConnectionState();
    }

    const existing = await OnePersonDB.getContacts(graphConfig.pageId);
    const existingByNorm = new Map(existing.map((c) => [c.normalizedName || OnePersonCDP.normalizeName(c.name), c]));
    const now = Date.now();

    const toUpsert = rawContacts.map((c) => {
      const norm = OnePersonCDP.normalizeName(c.name);
      const prev = existingByNorm.get(norm);
      const merged = prev
        ? {
          ...prev,
          name: prev.name || c.name,
          lastSnippet: c.snippet || prev.lastSnippet,
          lastInteractionAt: prev.lastInteractionAt || now,
        }
        : {
          id: `${graphConfig.pageId}:dom:${c.key}`,
          pageId: graphConfig.pageId,
          psid: '',
          threadId: '',
          name: c.name,
          lastInteractionAt: now,
          lastSnippet: c.snippet || '',
          messageCount: 1,
          unreadCount: 0,
          source: 'dom_inbox',
        };
      return OnePersonCDP.scoreContact(merged, now);
    });

    await OnePersonDB.bulkUpsertContacts(toUpsert);
    await loadContactsFromDb();
    showToast(`นำเข้ารายชื่อจาก Inbox เข้า CDP สำเร็จ ${toUpsert.length} คน!`, 'ok');
    addLog(`นำเข้ารายชื่อจากหน้า Inbox DOM เข้า CDP สำเร็จ ${toUpsert.length} คน`, 'ok');
    return toUpsert.length;
  }

  async function handleSyncFromInboxToCdp() {
    el.btnSyncFromInboxToCdp.disabled = true;
    el.btnSyncFromInboxToCdp.textContent = '⏳ กำลังสแกนแท็บ Inbox...';
    const res = await sendToBackground('SCAN_INBOX', { maxScrolls: 15, maxContacts: 300 });
    el.btnSyncFromInboxToCdp.disabled = false;
    el.btnSyncFromInboxToCdp.textContent = '🧭 ดึงจากแท็บ Inbox เข้า CDP (ไม่ต้องใช้ Token)';

    if (!res.ok || !res.data || !res.data.ok) {
      const errMsg = res.error || res.data?.error || 'ไม่พบแท็บ Meta Business Suite Inbox กรุณากดปุ่ม "เปิด Meta Business Suite" ด้านบนขวาก่อนครับ';
      showInlineAlert(el.syncAlertBox, errMsg, 'warn');
      showToast(errMsg, 'warn', 6000);
      return;
    }

    const list = res.data.contacts || [];
    const count = await importDomContactsIntoCdp(list, res.data.pageName || '');
    if (count > 0) {
      showInlineAlert(
        el.syncAlertBox,
        `ดึงจากแท็บ Meta Business Suite Inbox เข้า CDP สำเร็จ ${count} คน (หมายเหตุ: โหมดนี้ไม่มี PSID สำหรับยิง API จึงต้องส่งผ่านแท็บ 5 โหมด Inbox เดิมครับ)`,
        'ok'
      );
      switchTab('segment');
    }
  }

  async function handleImportC360() {
    const file = el.c360FileInput.files && el.c360FileInput.files[0];
    if (!file) {
      showToast('กรุณาเลือกไฟล์ CSV หรือ JSON ก่อนกดนำเข้าครับ', 'warn');
      addLog('กรุณาเลือกไฟล์ CSV หรือ JSON ก่อนนำเข้าครับ', 'warn');
      return;
    }

    if (!graphConfig.pageId) {
      graphConfig.pageId = 'c360_imported';
      graphConfig.pageName = 'One Person Ceo (Customer 360)';
      await persistGraphConfig();
      renderGraphConnectionState();
    }

    const rawText = await file.text();
    let parsedRows = [];
    try {
      parsedRows = OnePersonCDP.parseCustomer360File(rawText, file.name);
    } catch (err) {
      showToast(`อ่านไฟล์ไม่สำเร็จ: ${err.message}`, 'err');
      addLog(`อ่านไฟล์ไม่สำเร็จ: ${err.message}`, 'err');
      return;
    }

    if (parsedRows.length === 0) {
      showToast('ไม่พบข้อมูลลูกค้าในไฟล์ กรุณาตรวจสอบหัวตาราง', 'warn');
      addLog('ไม่พบแถวข้อมูลลูกค้าในไฟล์นี้ กรุณาตรวจสอบหัวตาราง (psid, name, order_count, total_spent)', 'warn');
      return;
    }

    const existing = await OnePersonDB.getContacts(graphConfig.pageId);
    const { mergedContacts, matchedCount, createdCount } = OnePersonCDP.mergeCustomer360IntoContacts(
      existing,
      parsedRows,
      graphConfig.pageId
    );
    await OnePersonDB.bulkUpsertContacts(mergedContacts);

    el.c360SummaryBox.textContent = `นำเข้า "${file.name}" สำเร็จ: อ่านได้ ${parsedRows.length} แถว • จับคู่กับแชทเพจ ${matchedCount} คน • สร้างโปรไฟล์ใหม่ ${createdCount} คน`;
    showToast(`นำเข้า Customer 360 สำเร็จ ${parsedRows.length} แถว!`, 'ok');
    addLog(`ผสาน Customer 360 สำเร็จ (จับคู่ ${matchedCount}, เพิ่มใหม่ ${createdCount})`, 'ok');
    await loadContactsFromDb();
  }

  function handleDownloadSampleCsv() {
    const csv = OnePersonCDP.generateSampleCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'onepersonceo-customer360-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดไฟล์ตัวอย่าง CSV แล้ว', 'info');
  }

  async function handleLoadDemoCdp() {
    if (!graphConfig.pageId) {
      graphConfig.pageId = 'demo_onepersonceo';
      graphConfig.pageName = 'One Person Ceo (Demo Mode)';
    }
    const demoContacts = OnePersonCDP.generateDemoContacts(240, graphConfig.pageId);
    await OnePersonDB.bulkUpsertContacts(demoContacts);
    await persistGraphConfig();
    renderGraphConnectionState();
    el.c360SummaryBox.textContent = `โหลดข้อมูลจำลอง 240 คนเรียบร้อย — มีครบทั้ง RFM (Champions, Loyal, At Risk), RSV (Due Now ครบกำหนดซื้อซ้ำ) และเวลาทองรายบุคคล!`;
    showToast('โหลดข้อมูลจำลอง 240 คนเรียบร้อย!', 'ok');
    addLog('โหลดข้อมูลจำลอง 240 คนลง IndexedDB เรียบร้อย — สลับไปแท็บ 2 เพื่อแบ่ง Segment ได้เลยครับ', 'ok');
    await loadContactsFromDb();
    switchTab('segment');
  }

  async function handleClearPageDb() {
    if (!graphConfig.pageId) {
      showToast('ยังไม่มีฐานข้อมูลเพจให้ล้างครับ', 'info');
      return;
    }
    await OnePersonDB.clearContacts(graphConfig.pageId);
    await OnePersonDB.clearSyncState(graphConfig.pageId);
    selectedContactIds.clear();
    const selStore = await chrome.storage.local.get(STORAGE_KEYS.SELECTION_BY_PAGE);
    if (selStore[STORAGE_KEYS.SELECTION_BY_PAGE]) {
      delete selStore[STORAGE_KEYS.SELECTION_BY_PAGE][graphConfig.pageId];
      await chrome.storage.local.set({ [STORAGE_KEYS.SELECTION_BY_PAGE]: selStore[STORAGE_KEYS.SELECTION_BY_PAGE] });
    }
    el.c360SummaryBox.textContent = 'ล้างฐานข้อมูล IndexedDB ของเพจนี้เรียบร้อย';
    showToast('ล้างฐานข้อมูลเพจนี้แล้ว', 'warn');
    addLog(`ล้างฐานข้อมูล CDP ของเพจ ${graphConfig.pageId} แล้ว`, 'warn');
    await refreshSyncStateUi();
    await loadContactsFromDb();
  }

  // ==================== TAB 2: SEGMENTATION (RFM · RSV · GOLDEN HOUR) ====================

  async function persistSelection(explicitMode = null) {
    if (!graphConfig.pageId) return;
    let mode = explicitMode;
    if (!mode) {
      if (allContacts.length > 0 && selectedContactIds.size === allContacts.length) {
        mode = 'all';
      } else if (selectedContactIds.size === 0) {
        mode = 'none';
      } else {
        mode = 'ids';
      }
    }

    const stored = await chrome.storage.local.get(STORAGE_KEYS.SELECTION_BY_PAGE);
    const map = stored[STORAGE_KEYS.SELECTION_BY_PAGE] || {};
    map[graphConfig.pageId] = {
      mode,
      ids: mode === 'ids' ? Array.from(selectedContactIds) : [],
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.SELECTION_BY_PAGE]: map });
  }

  async function restoreSelectionForPage() {
    if (!graphConfig.pageId || allContacts.length === 0) {
      selectedContactIds = new Set();
      return;
    }

    const stored = await chrome.storage.local.get(STORAGE_KEYS.SELECTION_BY_PAGE);
    const map = stored[STORAGE_KEYS.SELECTION_BY_PAGE] || {};
    const saved = map[graphConfig.pageId];

    if (!saved || saved.mode === 'all') {
      const ready = allContacts.filter((c) => !isInCooldown(c));
      selectedContactIds = new Set(ready.map((c) => c.id));
    } else if (saved.mode === 'none') {
      selectedContactIds = new Set();
    } else {
      const readyIds = new Set(allContacts.filter((c) => !isInCooldown(c)).map((c) => c.id));
      selectedContactIds = new Set((saved.ids || []).filter((id) => readyIds.has(id)));
    }
  }

  async function loadContactsFromDb() {
    const raw = await OnePersonDB.getContacts(graphConfig.pageId);
    allContacts = (raw || []).sort((a, b) => (b.rsvPriority || 0) - (a.rsvPriority || 0));
    await restoreSelectionForPage();
    computeSegmentationUi();
    updateGlobalBadges();
    populatePreviewContactSelect();
  }

  function computeSegmentationUi() {
    // 1. Top KPIs
    let within24hCount = 0;
    let champsLoyalCount = 0;
    let rsvDueCount = 0;
    let totalLtv = 0;

    const rfmCounts = { ALL: allContacts.length };
    Object.keys(OnePersonCDP.RFM_SEGMENTS).forEach((k) => (rfmCounts[k] = 0));

    const rsvCounts = { ALL: allContacts.length };
    Object.keys(OnePersonCDP.RSV_STAGES).forEach((k) => (rsvCounts[k] = 0));

    for (const c of allContacts) {
      if (c.within24h) within24hCount += 1;
      if (c.rfmSegment === 'Champions' || c.rfmSegment === 'Loyal') champsLoyalCount += 1;
      if (c.rsvStage === 'Due Now') rsvDueCount += 1;
      totalLtv += Number(c.totalSpent) || 0;

      if (rfmCounts[c.rfmSegment] !== undefined) rfmCounts[c.rfmSegment] += 1;
      if (rsvCounts[c.rsvStage] !== undefined) rsvCounts[c.rsvStage] += 1;
    }

    el.segKpiTotal.textContent = allContacts.length.toLocaleString('th-TH');
    el.segKpi24h.textContent = within24hCount.toLocaleString('th-TH');
    el.segKpiChampions.textContent = champsLoyalCount.toLocaleString('th-TH');
    el.segKpiRsvDue.textContent = rsvDueCount.toLocaleString('th-TH');
    el.segKpiLtv.textContent = `฿${Math.round(totalLtv).toLocaleString('th-TH')}`;

    // 2. Render RFM Filter Pills
    el.rfmFilterPills.innerHTML = '';
    const rfmOptions = [{ key: 'ALL', label: `ทั้งหมด (${rfmCounts.ALL})` }].concat(
      Object.values(OnePersonCDP.RFM_SEGMENTS).map((s) => ({
        key: s.key,
        label: `${s.shortLabel} (${rfmCounts[s.key] || 0})`,
      }))
    );
    rfmOptions.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `filter-pill${activeRfmFilter === opt.key ? ' active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        activeRfmFilter = opt.key;
        currentPageNum = 1;
        computeSegmentationUi();
      });
      el.rfmFilterPills.appendChild(btn);
    });

    // 3. Render RSV Filter Pills
    el.rsvFilterPills.innerHTML = '';
    const rsvOptions = [{ key: 'ALL', label: `ทั้งหมด (${rsvCounts.ALL})` }].concat(
      Object.values(OnePersonCDP.RSV_STAGES).map((s) => ({
        key: s.key,
        label: `${s.shortLabel} (${rsvCounts[s.key] || 0})`,
      }))
    );
    rsvOptions.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `filter-pill${activeRsvFilter === opt.key ? ' active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        activeRsvFilter = opt.key;
        currentPageNum = 1;
        computeSegmentationUi();
      });
      el.rsvFilterPills.appendChild(btn);
    });

    // 4. Filter contacts
    const need24h = el.fltWithin24h.checked;
    const needOrders = el.fltHasOrders.checked;
    const needToken = el.fltHasMktToken.checked;
    const hideCooldown = el.fltHideCooldown.checked;
    const query = (el.fltContactSearch.value || '').trim().toLowerCase();

    const baseFiltered = allContacts.filter((c) => {
      if (activeRfmFilter !== 'ALL' && c.rfmSegment !== activeRfmFilter) return false;
      if (activeRsvFilter !== 'ALL' && c.rsvStage !== activeRsvFilter) return false;
      if (need24h && !c.within24h) return false;
      if (needOrders && !(Number(c.orderCount) > 0)) return false;
      if (needToken && !c.marketingOptInToken) return false;
      if (hideCooldown && isInCooldown(c)) return false;
      if (query) {
        const hay = `${c.name || ''} ${c.fbid || ''} ${c.psid || ''} ${c.lastProduct || ''} ${c.lastSnippet || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    // Render 24h chart from baseFiltered (before hour filter so user can still click other bars!)
    renderHourChart(baseFiltered);

    filteredContacts =
      activeHourFilter !== null
        ? baseFiltered.filter((c) => Number(c.preferredHour) === activeHourFilter)
        : baseFiltered;

    el.filteredCountLabel.textContent = filteredContacts.length.toLocaleString('th-TH');
    el.btnSelectAllFiltered.textContent = `✅ เลือกเฉพาะกลุ่มนี้ (${filteredContacts.length.toLocaleString('th-TH')} คน)`;

    renderPaginatedContacts();
  }

  function renderHourChart(contactsScope) {
    const { counts } = OnePersonCDP.buildHourDistribution(contactsScope);
    const maxVal = Math.max(1, ...counts);
    const qStart = Number(el.quietStartHour?.value ?? 22);
    const qEnd = Number(el.quietEndHour?.value ?? 8);

    el.hourChart.innerHTML = '';
    for (let h = 0; h < 24; h++) {
      const cnt = counts[h];
      const heightPct = cnt > 0 ? Math.max(8, Math.round((cnt / maxVal) * 100)) : 3;
      const isQuiet = OnePersonCDP.isHourInQuietWindow(h, qStart, qEnd);

      const col = document.createElement('div');
      col.className = `hour-bar-col${activeHourFilter === h ? ' active' : ''}${isQuiet ? ' quiet' : ''}`;
      col.title = `${String(h).padStart(2, '0')}:00 น. — ${cnt} คน${isQuiet ? ' (Quiet Hours)' : ''}`;

      const countEl = document.createElement('div');
      countEl.className = 'hour-bar-count';
      countEl.textContent = cnt > 0 ? String(cnt) : '';

      const track = document.createElement('div');
      track.className = 'hour-bar-track';

      const fill = document.createElement('div');
      fill.className = 'hour-bar-fill';
      fill.style.height = `${heightPct}%`;

      const lbl = document.createElement('div');
      lbl.className = 'hour-bar-label';
      lbl.textContent = String(h).padStart(2, '0');

      track.appendChild(fill);
      col.appendChild(countEl);
      col.appendChild(track);
      col.appendChild(lbl);

      col.addEventListener('click', () => {
        activeHourFilter = activeHourFilter === h ? null : h;
        currentPageNum = 1;
        if (activeHourFilter !== null) {
          el.hourFilterBadge.textContent = `กรองชั่วโมงทอง: ${String(activeHourFilter).padStart(2, '0')}:00 น.`;
          el.btnClearHourFilter.classList.remove('hidden');
        } else {
          el.hourFilterBadge.textContent = 'แสดงทุกชั่วโมง (00–23 น.)';
          el.btnClearHourFilter.classList.add('hidden');
        }
        computeSegmentationUi();
      });

      el.hourChart.appendChild(col);
    }
  }

  function renderPaginatedContacts() {
    const totalPages = Math.max(1, Math.ceil(filteredContacts.length / PAGE_SIZE));
    if (currentPageNum > totalPages) currentPageNum = totalPages;
    const startIdx = (currentPageNum - 1) * PAGE_SIZE;
    const slice = filteredContacts.slice(startIdx, startIdx + PAGE_SIZE);

    el.pageInfo.textContent = `หน้า ${currentPageNum} / ${totalPages} (แสดง ${slice.length} จาก ${filteredContacts.length.toLocaleString('th-TH')} คน)`;
    el.btnPrevPage.disabled = currentPageNum <= 1;
    el.btnNextPage.disabled = currentPageNum >= totalPages;

    if (slice.length === 0) {
      el.cdpContactList.innerHTML = `<div style="color: var(--muted); font-size: 13px; padding: 18px; text-align: center;">ไม่พบรายชื่อที่ตรงกับเงื่อนไข — ลองล้างตัวกรอง หรือกลับไปแท็บ 1 เพื่อซิงค์/โหลดข้อมูลจำลองครับ</div>`;
      return;
    }

    el.cdpContactList.innerHTML = '';
    slice.forEach((c, idx) => {
      const remainDays = getCooldownRemainingDays(c);
      const cooldown = remainDays > 0;
      if (cooldown && selectedContactIds.has(c.id)) {
        selectedContactIds.delete(c.id);
      }
      const rfmInfo = OnePersonCDP.RFM_SEGMENTS[c.rfmSegment] || OnePersonCDP.RFM_SEGMENTS['Warm Lead'];
      const rsvInfo = OnePersonCDP.RSV_STAGES[c.rsvStage] || OnePersonCDP.RSV_STAGES.Prospect;

      const row = document.createElement('div');
      row.className = `cdp-row${cooldown ? ' cooldown' : ''}`;
      if (cooldown) {
        row.style.opacity = '0.48';
        row.title = `ส่งไปแล้ว — ปิดใช้งาน (Inactive) กันส่งซ้ำอีก ${remainDays} วัน`;
      }

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !cooldown && selectedContactIds.has(c.id);
      chk.disabled = cooldown;
      chk.style.marginTop = '4px';
      chk.addEventListener('change', () => {
        if (cooldown) {
          chk.checked = false;
          return;
        }
        if (chk.checked) selectedContactIds.add(c.id);
        else selectedContactIds.delete(c.id);
        persistSelection();
        updateGlobalBadges();
        populatePreviewContactSelect();
      });

      const main = document.createElement('div');
      main.className = 'cdp-row-main';

      const top = document.createElement('div');
      top.className = 'cdp-row-top';

      const titleSpan = document.createElement('strong');
      titleSpan.style.fontSize = '13px';
      titleSpan.textContent = `${startIdx + idx + 1}. ${c.name || 'ไม่ระบุชื่อ'}`;
      top.appendChild(titleSpan);

      const rfmBadge = document.createElement('span');
      rfmBadge.className = `badge ${rfmInfo.badgeClass}`;
      rfmBadge.textContent = `${rfmInfo.shortLabel} (${c.rfmScore || '111'})`;
      top.appendChild(rfmBadge);

      const rsvBadge = document.createElement('span');
      rsvBadge.className = `badge ${rsvInfo.badgeClass}`;
      rsvBadge.textContent = c.rsvCyclePct ? `${rsvInfo.shortLabel} ${c.rsvCyclePct}%` : rsvInfo.shortLabel;
      top.appendChild(rsvBadge);

      const hourBadge = document.createElement('span');
      hourBadge.className = 'badge badge-ready';
      hourBadge.textContent = `⏰ ${OnePersonCDP.formatBangkokTimeLabel(c.preferredHour)}`;
      top.appendChild(hourBadge);

      if (c.fbid) {
        const fbidBadge = document.createElement('span');
        fbidBadge.className = 'badge badge-ready';
        fbidBadge.textContent = '⚡ FBID';
        top.appendChild(fbidBadge);
      }

      if (c.within24h) {
        const w24 = document.createElement('span');
        w24.className = 'badge badge-ready';
        w24.textContent = '24h Active';
        top.appendChild(w24);
      }

      if (cooldown) {
        const cd = document.createElement('span');
        cd.className = 'badge badge-cooldown';
        cd.textContent = `⏸️ Inactive (พัก ${remainDays} วัน)`;
        top.appendChild(cd);
      }

      const sub = document.createElement('div');
      sub.className = 'cdp-row-sub';

      const ltvText = `LTV: ฿${Math.round(Number(c.totalSpent) || 0).toLocaleString('th-TH')} (${c.orderCount || 0} ออเดอร์)`;
      const prodText = c.lastProduct ? `สินค้า: ${c.lastProduct}` : c.lastSnippet || '-';
      const idParts = [];
      if (c.fbid) idParts.push(`FBID: ${c.fbid}`);
      if (c.psid) idParts.push(`PSID: ${c.psid}`);
      const idText = idParts.length > 0 ? idParts.join(' • ') : 'ไม่มี ID';
      sub.textContent = `${ltvText} • ${prodText} • ${idText}`;

      main.appendChild(top);
      main.appendChild(sub);
      row.appendChild(chk);
      row.appendChild(main);
      el.cdpContactList.appendChild(row);
    });
  }

  // ==================== TAB 3: COPY, PRESETS & LIVE PREVIEW ====================

  function renderPresets() {
    el.presetGrid.innerHTML = '';
    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-btn${p.id === activePresetId ? ' active' : ''}`;

      const t = document.createElement('div');
      t.className = 'preset-btn-title';
      t.textContent = p.title;

      const d = document.createElement('div');
      d.className = 'preset-btn-desc';
      const imgCount = Array.isArray(p.savedImages) ? p.savedImages.length : 0;
      const hasUrl = Boolean(p.imageUrl && String(p.imageUrl).trim());
      const imgBadge = imgCount > 0 ? ` • 🖼️ ${imgCount} รูป` : hasUrl ? ' • 🔗 มีลิงก์รูป' : '';
      d.textContent = `${p.desc || 'คลิกเพื่อโหลดข้อความ'}${imgBadge}`;

      btn.appendChild(t);
      btn.appendChild(d);
      btn.addEventListener('click', () => selectPreset(p.id));
      el.presetGrid.appendChild(btn);
    });
  }

  async function selectPreset(id, { persist = true } = {}) {
    const found = presets.find((p) => p.id === id);
    if (!found) return;
    activePresetId = found.id;
    el.presetTitleInput.value = found.title;
    el.messageInput.value = found.message;
    if (el.imageUrlInput) {
      el.imageUrlInput.value = typeof found.imageUrl === 'string' ? found.imageUrl : '';
    }
    if (el.sendOrderSelect) {
      el.sendOrderSelect.value = found.sendOrder || 'image_first';
    }
    hydrateAttachedImages(Array.isArray(found.savedImages) ? found.savedImages : []);
    renderAttachedImages();
    renderPresets();
    updatePreview();
    if (persist) {
      await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_PRESET_ID]: activePresetId });
    }
  }

  function getSegmentOverridesObject() {
    return {
      'Due Now': el.ovrDueNow.value || '',
      Champions: el.ovrChampions.value || '',
      'At Risk': el.ovrAtRisk.value || '',
      'Warm Lead': el.ovrWarmLead.value || '',
    };
  }

  function populatePreviewContactSelect() {
    const selectedPool = selectedContactIds.size > 0
      ? allContacts.filter((c) => selectedContactIds.has(c.id))
      : [];
    const basePool = selectedPool.length > 0 ? selectedPool : filteredContacts.length > 0 ? filteredContacts : allContacts;
    const samplePool = basePool.slice(0, 25);
    const prevVal = el.previewContactSelect.value;
    el.previewContactSelect.innerHTML = '';

    if (samplePool.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'ตัวอย่างจำลอง: คุณธนพล (Champions • Due Now)';
      el.previewContactSelect.appendChild(opt);
    } else {
      samplePool.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.rfmSegment} • ${c.rsvStage} • ${OnePersonCDP.formatBangkokTimeLabel(c.preferredHour)})`;
        el.previewContactSelect.appendChild(opt);
      });
      if (prevVal && samplePool.some((c) => c.id === prevVal)) {
        el.previewContactSelect.value = prevVal;
      }
    }
    updatePreview();
  }

  function updatePreview() {
    const selId = el.previewContactSelect.value;
    const contact =
      allContacts.find((c) => c.id === selId) || {
        name: 'ธนพล เจริญสุข',
        rfmSegment: 'Champions',
        rsvStage: 'Due Now',
        lastProduct: 'AI Digital Empire Suite',
        preferredHour: 20,
        totalSpent: 14900,
      };

    el.previewSampleMeta.textContent = `กลุ่ม: ${contact.rfmSegment} | RSV: ${contact.rsvStage} | เวลาทอง: ${OnePersonCDP.formatBangkokTimeLabel(contact.preferredHour)} | LTV: ฿${Math.round(Number(contact.totalSpent) || 0).toLocaleString('th-TH')}`;

    const rendered = OnePersonCDP.renderPersonalizedMessage(el.messageInput.value, contact, {
      segmentOverrides: getSegmentOverridesObject(),
      useSegmentOverrides: el.chkSegmentOverrides.checked,
    });
    el.previewBubble.textContent = rendered;
    el.charCount.textContent = `${el.messageInput.value.length} ตัวอักษร`;
    el.previewFooter.textContent = `เลือกเป้าหมายในแท็บ 2 แล้ว: ${selectedContactIds.size.toLocaleString('th-TH')} คน`;
    if (el.btnTestSendOne) {
      el.btnTestSendOne.textContent = `🧪 ส่งทดสอบให้ "คุณ${contact.name}" (1 คน)`;
    }

    if (el.previewChatStack) {
      el.previewChatStack.classList.toggle('text-first', el.sendOrderSelect?.value === 'text_first');
    }

    if (el.previewImagesWrap) {
      el.previewImagesWrap.innerHTML = '';
      const imgSources = attachedImages.map((img) => ({ src: img.previewUrl, alt: img.name }));
      const imgUrl = (el.imageUrlInput.value || '').trim();
      if (imgUrl && /^https?:\/\//i.test(imgUrl)) {
        imgSources.push({ src: imgUrl, alt: 'ลิงก์รูปแนบ' });
      }
      if (imgSources.length > 0) {
        imgSources.forEach((srcObj) => {
          const imgEl = document.createElement('img');
          imgEl.src = srcObj.src;
          imgEl.alt = srcObj.alt || 'ตัวอย่างรูปแนบ';
          imgEl.className = 'preview-img-bubble';
          el.previewImagesWrap.appendChild(imgEl);
        });
        el.previewImagesWrap.classList.remove('hidden');
      } else {
        el.previewImagesWrap.classList.add('hidden');
      }
    }
  }

  function dataUrlToFile(dataUrl, name = 'image.png', type = 'image/png') {
    try {
      const parts = String(dataUrl || '').split(',');
      const header = parts[0] || '';
      const b64 = parts[1] || '';
      const mimeMatch = header.match(/data:([^;]+);/i);
      const mime = type || (mimeMatch ? mimeMatch[1] : 'image/png');
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      return new File([bytes], name, { type: mime });
    } catch {
      return null;
    }
  }

  async function compressImageToDataUrl(file) {
    const rawDataUrl = await fileToDataUrl(file);
    if (!file || file.size <= 450 * 1024) {
      return rawDataUrl;
    }
    try {
      const img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('โหลดรูปภาพไม่สำเร็จ'));
        image.src = rawDataUrl;
      });
      const maxDim = 1400;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return rawDataUrl;
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', 0.85);
      return compressed && compressed.length < rawDataUrl.length ? compressed : rawDataUrl;
    } catch {
      return rawDataUrl;
    }
  }

  function serializeMinimalImages(list = attachedImages) {
    return (list || [])
      .filter((img) => img && img.dataUrl)
      .map((img) => ({
        name: img.name || 'image.png',
        type: img.type || img.file?.type || 'image/png',
        dataUrl: img.dataUrl,
      }));
  }

  function hydrateAttachedImages(rawList) {
    attachedImages.forEach((img) => {
      if (img.previewUrl && img.previewUrl.startsWith('blob:')) URL.revokeObjectURL(img.previewUrl);
    });
    if (!Array.isArray(rawList)) {
      attachedImages = [];
      return;
    }
    attachedImages = rawList
      .filter((it) => it && it.dataUrl)
      .slice(0, 4)
      .map((it, idx) => {
        const name = it.name || `image-${idx + 1}.png`;
        const type = it.type || 'image/png';
        const file = dataUrlToFile(it.dataUrl, name, type);
        return {
          id: `img_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          file,
          name,
          type: file ? file.type : type,
          dataUrl: it.dataUrl,
          previewUrl: it.dataUrl,
          attachmentId: '',
          uploadedForPageId: '',
        };
      });
  }

  async function saveActivePresetMediaToStorage() {
    const idx = presets.findIndex((p) => p.id === activePresetId);
    if (idx === -1) return;
    presets[idx].imageUrl = (el.imageUrlInput?.value || '').trim();
    presets[idx].sendOrder = el.sendOrderSelect?.value || 'image_first';
    presets[idx].savedImages = serializeMinimalImages();
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.PRESETS]: presets,
        [STORAGE_KEYS.ACTIVE_PRESET_ID]: activePresetId,
      });
      renderPresets();
    } catch (err) {
      console.warn('saveActivePresetMediaToStorage failed:', err);
      showToast('บันทึกรูปลง Preset ไม่สำเร็จ (ไฟล์อาจใหญ่เกินโควต้า 10MB)', 'warn', 4500);
    }
  }

  async function addImageFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.startsWith('image/'));
    if (files.length === 0) {
      showToast('กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP)', 'warn');
      return;
    }

    let added = 0;
    for (const file of files) {
      if (attachedImages.length >= 4) {
        showToast('แนบรูปได้สูงสุด 4 รูปต่อแคมเปญครับ', 'warn');
        break;
      }
      const dataUrl = await compressImageToDataUrl(file);
      const isReencodedJpeg = file.size > 450 * 1024 && dataUrl.startsWith('data:image/jpeg');
      const finalType = isReencodedJpeg ? 'image/jpeg' : file.type || 'image/png';
      const finalFile = isReencodedJpeg ? dataUrlToFile(dataUrl, file.name, finalType) || file : file;
      attachedImages.push({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        file: finalFile,
        name: file.name || `image-${attachedImages.length + 1}.png`,
        type: finalType,
        dataUrl,
        previewUrl: dataUrl,
        attachmentId: '',
        uploadedForPageId: '',
      });
      added += 1;
    }

    if (added > 0) {
      renderAttachedImages();
      updatePreview();
      await saveActivePresetMediaToStorage();
      showToast(`แนบรูปเพิ่มลง Preset นี้แล้ว ${added} รูป`, 'ok', 2800);
    }
  }

  async function clearAttachedImages() {
    attachedImages.forEach((img) => {
      if (img.previewUrl && img.previewUrl.startsWith('blob:')) URL.revokeObjectURL(img.previewUrl);
    });
    attachedImages = [];
    if (el.imageFileInput) el.imageFileInput.value = '';
    renderAttachedImages();
    updatePreview();
    await saveActivePresetMediaToStorage();
  }

  function renderAttachedImages() {
    if (!el.attachedImagesGrid) return;
    el.attachedImagesGrid.innerHTML = '';
    el.btnClearImages.classList.toggle('hidden', attachedImages.length === 0);

    attachedImages.forEach((img) => {
      const card = document.createElement('div');
      card.className = 'attached-thumb';

      const thumbImg = document.createElement('img');
      thumbImg.src = img.previewUrl;
      thumbImg.alt = img.name;

      const nameEl = document.createElement('div');
      nameEl.className = 'attached-thumb-name';
      nameEl.textContent = img.name;

      const rmBtn = document.createElement('button');
      rmBtn.type = 'button';
      rmBtn.className = 'attached-thumb-remove';
      rmBtn.textContent = '✕';
      rmBtn.title = 'ลบรูปนี้';
      rmBtn.addEventListener('click', async () => {
        if (img.previewUrl && img.previewUrl.startsWith('blob:')) URL.revokeObjectURL(img.previewUrl);
        attachedImages = attachedImages.filter((item) => item.id !== img.id);
        renderAttachedImages();
        updatePreview();
        await saveActivePresetMediaToStorage();
      });

      card.appendChild(thumbImg);
      card.appendChild(nameEl);
      card.appendChild(rmBtn);
      el.attachedImagesGrid.appendChild(card);
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('อ่านไฟล์รูปไม่สำเร็จ'));
      reader.readAsDataURL(file);
    });
  }

  async function serializeAttachedImagesForDom() {
    const out = [];
    for (const img of attachedImages) {
      const dataUrl = img.dataUrl || (img.file ? await fileToDataUrl(img.file) : '');
      if (!dataUrl) continue;
      out.push({ name: img.name, type: img.type || img.file?.type || 'image/png', dataUrl });
    }
    return out;
  }

  async function ensureInboxDomReady({ focus = true } = {}) {
    let conn = await sendToBackground('CHECK_STATUS');
    if (conn.ok && conn.data && conn.data.ok && conn.data.isInbox && conn.data.hasList) {
      return true;
    }

    addLog('กำลังเปิดแท็บ Meta Business Suite ของเพจให้อัตโนมัติ (รอโหลดสักครู่)...', 'info');
    showToast('กำลังเปิดแท็บ Meta Business Suite Inbox ให้อัตโนมัติ...', 'info', 4500);
    await sendToBackground('OPEN_INBOX', { pageId: graphConfig.pageId || activeCampaign?.pageId || '', focus });

    for (let attempt = 0; attempt < 8; attempt++) {
      await new Promise((r) => setTimeout(r, 1500));
      conn = await sendToBackground('CHECK_STATUS');
      if (conn.ok && conn.data && conn.data.ok && conn.data.isInbox && conn.data.hasList) {
        return true;
      }
    }

    return false;
  }

  async function ensureUploadedAttachmentIds({ dryRun = false } = {}) {
    if (attachedImages.length === 0) return { ok: true, attachmentIds: [] };

    const ids = [];
    for (let i = 0; i < attachedImages.length; i++) {
      const img = attachedImages[i];
      if (img.attachmentId && (dryRun || img.uploadedForPageId === graphConfig.pageId)) {
        ids.push(img.attachmentId);
        continue;
      }

      const res = await OnePersonGraphAPI.uploadReusableAttachment({
        pageId: graphConfig.pageId,
        accessToken: graphConfig.accessToken,
        file: img.file,
        dryRun,
      });

      if (!res.ok) {
        return {
          ok: false,
          attachmentIds: ids,
          error: res.error,
          failedName: img.name,
        };
      }

      if (!dryRun) {
        img.attachmentId = res.attachmentId;
        img.uploadedForPageId = graphConfig.pageId;
      }
      ids.push(res.attachmentId);
    }

    return { ok: true, attachmentIds: ids };
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

  async function handleTestSendOne() {
    const selId = el.previewContactSelect.value;
    const contact = allContacts.find((c) => c.id === selId) || allContacts.find((c) => selectedContactIds.has(c.id));
    if (!contact) {
      showToast('ยังไม่มีรายชื่อให้ทดสอบ กรุณาดึงรายชื่อในแท็บ 1 ก่อนครับ', 'warn');
      el.testSendResult.textContent = 'ยังไม่มีรายชื่อให้ทดสอบ';
      return;
    }

    const psid = String(contact.psid || '').trim();
    const isDomMode = el.messagingModeSelect.value === 'INBOX_DOM';
    const isTurboMode = el.messagingModeSelect.value === 'TURBO_DIRECT';

    const text = OnePersonCDP.renderPersonalizedMessage(el.messageInput.value, contact, {
      segmentOverrides: getSegmentOverridesObject(),
      useSegmentOverrides: el.chkSegmentOverrides.checked,
    });

    const dryRun = !graphConfig.accessToken && !isDomMode && !isTurboMode;
    el.btnTestSendOne.disabled = true;

    if (isTurboMode) {
      const fbid = String(contact.fbid || '').trim();
      if (!fbid && !psid && !contact.name) {
        el.btnTestSendOne.disabled = false;
        const msg = 'รายชื่อนี้ยังไม่มี FBID/ชื่อ (กรุณากด "🚀 ซิงค์แชทสดแบบ BroadTurbo" ในแท็บ 1)';
        el.testSendResult.textContent = msg;
        showToast(msg, 'warn');
        return;
      }
      const targetPageId = /^\d{4,}$/.test(graphConfig.pageId || '')
        ? graphConfig.pageId
        : (el.turboPageIdInput?.value || '').trim();
      el.testSendResult.textContent = `🚀 กำลังยิงตรงแบบ BroadTurbo ถึง "คุณ${contact.name}"...`;
      const domImages = attachedImages.length > 0 ? await serializeAttachedImagesForDom() : [];
      const res = await OnePersonTurboDirect.sendTurboDirect({
        pageId: targetPageId,
        fbid,
        psid,
        name: contact.name || '',
        text,
        imageUrl: (el.imageUrlInput.value || '').trim(),
        domImages,
        sendOrder: el.sendOrderSelect?.value || 'image_first',
        pageAccessToken: graphConfig.accessToken || '',
        dryRun: false,
      });
      if (res?.resolvedFbid && res.resolvedFbid !== contact.fbid) {
        await OnePersonDB.updateContact(contact.id, { fbid: res.resolvedFbid });
        contact.fbid = res.resolvedFbid;
      }
      el.btnTestSendOne.disabled = false;
      if (res.ok) {
        const okTxt = `✅ ส่งแบบ BroadTurbo ถึง "คุณ${contact.name}" สำเร็จ! (ส่ง ${res.sentItemsCount || 1} รายการ • ID: ${res.audienceId || fbid || psid})`;
        el.testSendResult.textContent = okTxt;
        showToast(okTxt, 'ok');
      } else {
        const errTxt = `❌ ส่งแบบ BroadTurbo ไม่สำเร็จ: ${res.error?.label || 'ไม่ทราบสาเหตุ'}`;
        el.testSendResult.textContent = errTxt;
        showToast(errTxt, 'err', 6500);
      }
      return;
    }

    if (isDomMode) {
      el.testSendResult.textContent = `กำลังตรวจแท็บ Meta Business Suite เพื่อเตรียมส่งถึงคุณ${contact.name}...`;
      const ready = await ensureInboxDomReady({ focus: true });
      if (!ready) {
        el.btnTestSendOne.disabled = false;
        const notReadyMsg = '❌ เปิดแท็บ Meta Business Suite ให้แล้ว — กรุณาตรวจว่าล็อกอิน Facebook และเห็นรายชื่อแชทเพจแล้วลองกดทดสอบอีกครั้ง';
        el.testSendResult.textContent = notReadyMsg;
        showToast(notReadyMsg, 'warn', 6500);
        return;
      }

      el.testSendResult.textContent = `กำลังสลับไปแท็บ Inbox เพื่อส่งให้ "คุณ${contact.name}"...`;
      const domImages = await serializeAttachedImagesForDom();
      const domRes = await sendToBackground('SEND_MESSAGE', {
        name: contact.name,
        key: contact.id,
        psid: psid || '',
        pageId: graphConfig.pageId || '',
        message: text,
        sendOrder: el.sendOrderSelect?.value || 'image_first',
        autoSend: true,
        focusInbox: true,
        imagesDataUrls: domImages,
      });
      el.btnTestSendOne.disabled = false;
      if (domRes.ok && domRes.data && domRes.data.ok) {
        const okTxt = `✅ ส่งผ่านแท็บ Inbox ถึง "คุณ${contact.name}" สำเร็จ!`;
        el.testSendResult.textContent = okTxt;
        showToast(okTxt, 'ok');
      } else {
        const errTxt = `❌ ส่งผ่านแท็บ Inbox ไม่สำเร็จ: ${domRes.error || domRes.data?.error || 'ไม่ทราบสาเหตุ'}`;
        el.testSendResult.textContent = errTxt;
        showToast(errTxt, 'err', 6000);
      }
      return;
    }

    if (!psid) {
      el.btnTestSendOne.disabled = false;
      const msg = 'รายชื่อนี้ยังไม่มี PSID (กรุณาซิงค์ผ่าน Meta API ในแท็บ 1)';
      el.testSendResult.textContent = msg;
      showToast(msg, 'warn');
      return;
    }

    let attachmentIds = [];
    if (attachedImages.length > 0) {
      el.testSendResult.textContent = `กำลังอัปโหลดรูป ${attachedImages.length} รูปไปยัง Meta API...`;
      const up = await ensureUploadedAttachmentIds({ dryRun });
      if (!up.ok) {
        el.btnTestSendOne.disabled = false;
        const upErr = `❌ อัปโหลดรูป "${up.failedName}" ไม่สำเร็จ: ${up.error?.label || 'ไม่ทราบสาเหตุ'}`;
        el.testSendResult.textContent = upErr;
        showToast(upErr, 'err', 6000);
        return;
      }
      attachmentIds = up.attachmentIds;
    }

    el.testSendResult.textContent = dryRun
      ? `กำลังจำลองส่ง (Dry-Run) ถึงคุณ${contact.name}...`
      : `กำลังส่งจริงผ่าน Meta Graph API ถึงคุณ${contact.name}...`;

    const res = await OnePersonGraphAPI.sendDirectMessage({
      pageId: graphConfig.pageId,
      accessToken: graphConfig.accessToken,
      psid,
      text,
      imageUrl: (el.imageUrlInput.value || '').trim(),
      attachmentIds,
      sendOrder: el.sendOrderSelect?.value || 'image_first',
      messagingMode: el.messagingModeSelect.value,
      messageTag: el.messageTagSelect.value,
      notificationToken: contact.marketingOptInToken || '',
      within24h: Boolean(contact.within24h),
      dryRun,
    });

    el.btnTestSendOne.disabled = false;

    if (res.ok) {
      const okTxt = `✅ ส่งถึง "คุณ${contact.name}" สำเร็จ! (${res.dryRun ? 'โหมด Dry-Run' : `Message ID: ${res.messageId}`})`;
      el.testSendResult.textContent = okTxt;
      showToast(okTxt, 'ok');
    } else {
      const errTxt = `❌ ส่งถึง "คุณ${contact.name}" ไม่สำเร็จ: ${res.error?.label || 'ไม่ทราบสาเหตุ'}`;
      el.testSendResult.textContent = errTxt;
      showToast(errTxt, 'err', 6000);
    }
  }

  // ==================== TAB 4: BATCH QUEUE & PER-PERSON GOLDEN HOUR ====================

  function getSelectedDeliveryMode() {
    const checked = document.querySelector('input[name="deliveryMode"]:checked');
    return checked ? checked.value : 'batch';
  }

  function updateDeliveryModeUi() {
    const mode = getSelectedDeliveryMode();
    el.modeCardBatch.classList.toggle('active', mode === 'batch');
    el.modeCardSmartTime.classList.toggle('active', mode === 'smart_time');
    el.quietHoursPanel.classList.toggle('hidden', mode !== 'smart_time');
    updateGlobalBadges();
  }

  function sortContactsByPriority(list, priorityKey) {
    return list.slice().sort((a, b) => {
      if (priorityKey === 'ltv') {
        return (b.totalSpent || 0) - (a.totalSpent || 0);
      }
      if (priorityKey === 'recent') {
        return (b.lastInteractionAt || 0) - (a.lastInteractionAt || 0);
      }
      return (b.rsvPriority || 0) - (a.rsvPriority || 0);
    });
  }

  async function handleCreateCampaign() {
    const template = (el.messageInput.value || '').trim();
    if (!template) {
      showToast('กรุณาพิมพ์ข้อความในแท็บ 3 ก่อนสร้างแคมเปญครับ', 'err');
      addLog('กรุณาพิมพ์ข้อความในแท็บ 3 ก่อนสร้างแคมเปญครับ', 'err');
      switchTab('copy');
      return;
    }

    const messagingMode = el.messagingModeSelect.value;
    const dryRun = el.chkDryRun.checked;
    if (!dryRun && messagingMode !== 'INBOX_DOM' && messagingMode !== 'TURBO_DIRECT' && !graphConfig.accessToken) {
      showToast('ยังไม่ได้ต่อ Token — เลือก "🚀 โหมด Turbo Direct" หรือติ๊ก Dry-Run ครับ', 'warn', 5500);
      addLog('ยังไม่ได้ต่อ Page Access Token', 'warn');
      return;
    }

    const selectedList = allContacts.filter((c) => selectedContactIds.has(c.id) && !isInCooldown(c));
    if (selectedList.length === 0) {
      showToast('ยังไม่ได้เลือกรายชื่อกลุ่มเป้าหมายที่พร้อมส่ง (รายชื่อที่ติด Cooldown 14 วันจะถูกข้ามอัตโนมัติ) กรุณาเลือกในแท็บ 2 ก่อนครับ', 'warn', 5500);
      addLog('ยังไม่ได้เลือกรายชื่อกลุ่มเป้าหมายที่พร้อมส่ง', 'warn');
      switchTab('segment');
      return;
    }

    const mode = getSelectedDeliveryMode();
    const sorted = sortContactsByPriority(selectedList, el.sortPrioritySelect.value);
    const batchSize = Math.max(10, Number(el.batchSizeSelect.value) || 500);
    const campaignId = `camp_${Date.now()}`;

    let attachmentIds = [];
    let domImages = [];
    if (attachedImages.length > 0) {
      if (messagingMode === 'INBOX_DOM' || messagingMode === 'TURBO_DIRECT') {
        domImages = await serializeAttachedImagesForDom();
      } else {
        el.btnCreateCampaign.disabled = true;
        showToast(`กำลังอัปโหลดรูป ${attachedImages.length} รูปขึ้น Meta Reusable Attachment...`, 'info', 4000);
        const up = await ensureUploadedAttachmentIds({ dryRun });
        el.btnCreateCampaign.disabled = false;
        if (!up.ok) {
          const upErr = `อัปโหลดรูป "${up.failedName}" ไม่สำเร็จ: ${up.error?.label || 'ไม่ทราบสาเหตุ'}`;
          showToast(upErr, 'err', 6500);
          addLog(upErr, 'err');
          return;
        }
        attachmentIds = up.attachmentIds;
      }
    }

    const quietHours = {
      enabled: true,
      start: Number(el.quietStartHour.value) || 22,
      end: Number(el.quietEndHour.value) || 8,
      shiftTarget: el.quietShiftTarget.value || 'morning',
      jitterMinutes: Math.max(0, Number(el.jitterMinutes.value) || 12),
    };

    const campaign = {
      id: campaignId,
      title: (el.campaignTitleInput.value || 'แคมเปญ OnePersonCEO').trim(),
      pageId: graphConfig.pageId,
      pageName: graphConfig.pageName,
      deliveryMode: mode,
      messagingMode,
      messageTag: el.messageTagSelect.value,
      batchSize,
      delayMs: Math.max(40, Number(el.apiDelayMs.value) || 120),
      dryRun,
      template,
      imageUrl: (el.imageUrlInput.value || '').trim(),
      cachedAttachmentId: '',
      attachmentIds,
      domImages,
      sendOrder: el.sendOrderSelect?.value || 'image_first',
      useSegmentOverrides: el.chkSegmentOverrides.checked,
      segmentOverrides: getSegmentOverridesObject(),
      quietHours,
      totalContacts: sorted.length,
      totalBatches: Math.ceil(sorted.length / batchSize),
      sentCount: 0,
      failedCount: 0,
      pendingCount: sorted.length,
      errorBreakdown: {},
      status: mode === 'smart_time' ? 'scheduled' : 'ready',
      createdAt: Date.now(),
    };

    const nowMs = Date.now();
    const queueItems = sorted.map((c, idx) => {
      const batchIndex = Math.floor(idx / batchSize);
      let sched = { scheduledAt: null, effectiveHour: c.preferredHour, shiftedByQuietHours: false };
      if (mode === 'smart_time') {
        sched = OnePersonCDP.computeNextScheduledTime(c.preferredHour, {
          quietStart: quietHours.start,
          quietEnd: quietHours.end,
          shiftTarget: quietHours.shiftTarget,
          nowMs,
          jitterMinutes: quietHours.jitterMinutes,
          seedKey: c.id,
        });
      }

      return {
        id: `${campaignId}:${idx}`,
        campaignId,
        seqIndex: idx,
        batchIndex,
        contactId: c.id,
        psid: c.psid || '',
        contactName: c.name || 'ไม่ระบุชื่อ',
        rfmSegment: c.rfmSegment,
        rsvStage: c.rsvStage,
        preferredHour: c.preferredHour,
        effectiveHour: sched.effectiveHour,
        shiftedByQuietHours: sched.shiftedByQuietHours,
        scheduledAt: sched.scheduledAt,
        status: mode === 'smart_time' ? 'scheduled' : 'pending',
        errorCode: 0,
        errorLabel: '',
        sentAt: null,
      };
    });

    await OnePersonDB.saveCampaign(campaign);
    await OnePersonDB.bulkPutQueueItems(queueItems);

    if (mode === 'smart_time') {
      schedulerEnabled = true;
      await chrome.storage.local.set({
        [STORAGE_KEYS.SCHEDULER_ENABLED]: true,
        [STORAGE_KEYS.NOTIFY_ENABLED]: el.chkNotifyDesktop.checked,
      });
      await sendToBackground('SET_SCHEDULER_ALARM', { enabled: true });
      addLog(`สร้างตารางส่งอัจฉริยะรายบุคคลสำเร็จ ${sorted.length.toLocaleString('th-TH')} คน (Background Scheduler ทำงานอัตโนมัติทุกนาที)`, 'ok');
    } else {
      addLog(`สร้างคิว Batch สำเร็จ ${sorted.length.toLocaleString('th-TH')} คน แบ่งเป็น ${campaign.totalBatches} ชุด — กด "▶ ส่งชุดนี้" ที่ชุดแรกเพื่อเริ่มยิง`, 'ok');
    }

    await openCampaign(campaignId);
    await refreshPastCampaigns();

    if (mode === 'batch') {
      el.batchQueuePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      await runBatch(0);
    } else {
      el.smartSchedulePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast(`สร้างตารางส่งรายบุคคล ${sorted.length} คนเรียบร้อย!`, 'ok');
    }
  }

  async function openCampaign(campaignId) {
    activeCampaign = await OnePersonDB.getCampaign(campaignId);
    activeQueueItems = await OnePersonDB.getQueueItemsByCampaign(campaignId);
    renderActiveCampaign();
  }

  function renderActiveCampaign() {
    if (!activeCampaign) {
      el.batchQueuePanel.classList.remove('hidden');
      el.smartSchedulePanel.classList.add('hidden');
      el.batchCardsContainer.innerHTML = `<div style="color: var(--muted); font-size: 13px; text-align: center; padding: 18px;">ยังไม่มี Batch คิวในแคมเปญนี้</div>`;
      return;
    }

    if (activeCampaign.deliveryMode === 'smart_time') {
      el.batchQueuePanel.classList.add('hidden');
      el.smartSchedulePanel.classList.remove('hidden');
      renderSmartSchedulePanel();
    } else {
      el.batchQueuePanel.classList.remove('hidden');
      el.smartSchedulePanel.classList.add('hidden');
      renderBatchCards();
    }
  }

  function renderBatchCards() {
    if (!activeCampaign) return;
    const items = activeQueueItems;
    const total = items.length;
    const sent = items.filter((i) => i.status === 'sent').length;
    const failed = items.filter((i) => i.status === 'failed').length;
    const pending = total - sent - failed;

    el.activeCampaignTitle.textContent = `📦 ${activeCampaign.title}${activeCampaign.dryRun ? ' [DRY-RUN]' : ''}`;
    el.activeCampaignMeta.textContent = `ทั้งหมด ${total.toLocaleString('th-TH')} คน • แบ่ง ${activeCampaign.totalBatches} ชุด (ชุดละ ${activeCampaign.batchSize.toLocaleString('th-TH')} คน) • สำเร็จ ${sent.toLocaleString('th-TH')} • ไม่สำเร็จ ${failed.toLocaleString('th-TH')} • รอส่ง ${pending.toLocaleString('th-TH')}`;

    el.btnPauseCampaign.disabled = !batchRunning;
    el.btnStopCampaign.disabled = !batchRunning;
    el.btnRetryRateLimited.disabled = failed === 0 || batchRunning;
    el.btnExportFailedCsv.disabled = failed === 0;

    // Group into batches
    const byBatch = new Map();
    for (const item of items) {
      const b = item.batchIndex || 0;
      if (!byBatch.has(b)) byBatch.set(b, []);
      byBatch.get(b).push(item);
    }

    el.batchCardsContainer.innerHTML = '';
    const batchIndices = Array.from(byBatch.keys()).sort((a, b) => a - b);

    for (const bIdx of batchIndices) {
      const group = byBatch.get(bIdx);
      const startNum = bIdx * activeCampaign.batchSize + 1;
      const endNum = startNum + group.length - 1;
      const bSent = group.filter((i) => i.status === 'sent').length;
      const bFailed = group.filter((i) => i.status === 'failed').length;
      const bPending = group.length - bSent - bFailed;

      const sentPct = (bSent / group.length) * 100;
      const failedPct = (bFailed / group.length) * 100;
      const pendingPct = Math.max(0, 100 - sentPct - failedPct);

      const card = document.createElement('div');
      card.className = 'batch-card';

      const header = document.createElement('div');
      header.className = 'row-between';

      const title = document.createElement('strong');
      title.style.fontSize = '13.5px';
      title.textContent = `ชุดที่ ${bIdx + 1}: ลูกค้าคนที่ ${startNum.toLocaleString('th-TH')} – ${endNum.toLocaleString('th-TH')}`;

      const rightCtrl = document.createElement('div');
      rightCtrl.className = 'row';

      if (bPending === 0) {
        const donePill = document.createElement('span');
        donePill.className = 'pill ok';
        donePill.textContent = '✓ ส่งครบ';
        rightCtrl.appendChild(donePill);
      } else {
        const sendBtn = document.createElement('button');
        sendBtn.type = 'button';
        sendBtn.className = 'btn btn-primary btn-sm';
        sendBtn.textContent = batchRunning ? '⏳ กำลังส่ง...' : '▶ ส่งชุดนี้';
        sendBtn.disabled = batchRunning;
        sendBtn.addEventListener('click', () => runBatch(bIdx));
        rightCtrl.appendChild(sendBtn);
      }

      header.appendChild(title);
      header.appendChild(rightCtrl);
      card.appendChild(header);

      // 3-color stacked progress bar (green / red / gray)
      const track = document.createElement('div');
      track.className = 'batch-bar-track';

      const barS = document.createElement('div');
      barS.className = 'bar-sent';
      barS.style.width = `${sentPct}%`;

      const barF = document.createElement('div');
      barF.className = 'bar-failed';
      barF.style.width = `${failedPct}%`;

      const barP = document.createElement('div');
      barP.className = 'bar-pending';
      barP.style.width = `${pendingPct}%`;

      track.appendChild(barS);
      track.appendChild(barF);
      track.appendChild(barP);
      card.appendChild(track);

      // Stats row
      const stats = document.createElement('div');
      stats.className = 'batch-stats';
      stats.innerHTML = `<span class="dot-green">● ส่งสำเร็จ ${bSent.toLocaleString('th-TH')}</span><span class="dot-red">● ส่งไม่สำเร็จ ${bFailed.toLocaleString('th-TH')}</span><span class="dot-gray">● รอส่ง ${bPending.toLocaleString('th-TH')}</span>`;
      card.appendChild(stats);

      // Error breakdown details
      if (bFailed > 0) {
        const errMap = new Map();
        group
          .filter((i) => i.status === 'failed')
          .forEach((i) => {
            const key = `${i.errorCode || 0}:${i.errorLabel || 'ไม่สำเร็จ'}`;
            errMap.set(key, {
              code: i.errorCode || 0,
              label: i.errorLabel || 'ส่งไม่สำเร็จ',
              count: (errMap.get(key)?.count || 0) + 1,
            });
          });

        const details = document.createElement('details');
        details.className = 'batch-errors-details';
        details.open = true;
        const summary = document.createElement('summary');
        summary.textContent = `สาเหตุที่ส่งไม่สำเร็จ (${bFailed} คน)`;
        details.appendChild(summary);

        const ul = document.createElement('ul');
        ul.style.paddingLeft = '18px';
        ul.style.marginTop = '6px';
        for (const info of errMap.values()) {
          const li = document.createElement('li');
          li.textContent = `#${info.code} — ${info.label}: ${info.count} คน`;
          ul.appendChild(li);
        }
        details.appendChild(ul);

        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'btn btn-primary btn-sm';
        retryBtn.style.marginTop = '8px';
        retryBtn.textContent = `🚀 ยิงรายชื่อที่พลาด ${bFailed} คนนี้ใหม่ด้วยโหมด Turbo Direct (ไม่ต้องเปิด Inbox)`;
        retryBtn.addEventListener('click', async () => {
          if (batchRunning) return;
          activeCampaign.messagingMode = 'TURBO_DIRECT';
          if (attachedImages.length > 0 && (!activeCampaign.domImages || activeCampaign.domImages.length === 0)) {
            activeCampaign.domImages = await serializeAttachedImagesForDom();
          }
          for (const item of group) {
            if (item.status === 'failed') {
              item.status = 'pending';
              item.errorCode = 0;
              item.errorLabel = '';
              await OnePersonDB.updateQueueItem(item.id, { status: 'pending', errorCode: 0, errorLabel: '' });
            }
          }
          await OnePersonDB.saveCampaign(activeCampaign);
          el.messagingModeSelect.value = 'TURBO_DIRECT';
          updateLaunchWindowHint();
          await runBatch(bIdx);
        });
        details.appendChild(retryBtn);

        card.appendChild(details);
      }

      el.batchCardsContainer.appendChild(card);
    }
  }

  function renderSmartSchedulePanel() {
    if (!activeCampaign) return;
    const items = activeQueueItems;
    const sent = items.filter((i) => i.status === 'sent').length;
    const failed = items.filter((i) => i.status === 'failed').length;
    const scheduled = items.filter((i) => i.status === 'scheduled').length;
    const shifted = items.filter((i) => i.shiftedByQuietHours).length;

    el.scheduleSummaryBar.textContent = `${activeCampaign.title}${activeCampaign.dryRun ? ' [DRY-RUN]' : ''} • ทั้งหมด ${items.length.toLocaleString('th-TH')} คน | รอถึงเวลา ${scheduled.toLocaleString('th-TH')} | ส่งแล้ว ${sent.toLocaleString('th-TH')} | ไม่สำเร็จ ${failed.toLocaleString('th-TH')} | เลี่ยงช่วงดึก (Quiet Hours) ${shifted} คน`;

    const hourBuckets = new Map();
    for (const item of items) {
      const h = Number(item.effectiveHour ?? item.preferredHour ?? 20);
      if (!hourBuckets.has(h)) {
        hourBuckets.set(h, { hour: h, total: 0, sent: 0, failed: 0, scheduled: 0, shifted: 0 });
      }
      const b = hourBuckets.get(h);
      b.total += 1;
      if (item.status === 'sent') b.sent += 1;
      else if (item.status === 'failed') b.failed += 1;
      else b.scheduled += 1;
      if (item.shiftedByQuietHours) b.shifted += 1;
    }

    el.scheduleHourBreakdown.innerHTML = '';
    const sortedHours = Array.from(hourBuckets.values()).sort((a, b) => a.hour - b.hour);
    for (const b of sortedHours) {
      const card = document.createElement('div');
      card.className = 'schedule-hour-card';

      const head = document.createElement('div');
      head.style.fontWeight = '700';
      head.style.marginBottom = '4px';
      head.textContent = `⏰ ${String(b.hour).padStart(2, '0')}:00 น. → ${b.total} คน`;

      const detail = document.createElement('div');
      detail.style.color = 'var(--muted)';
      detail.textContent = `รอส่ง ${b.scheduled} • สำเร็จ ${b.sent} • พลาด ${b.failed}${b.shifted ? ` • ย้ายมาจากช่วงดึก ${b.shifted}` : ''}`;

      card.appendChild(head);
      card.appendChild(detail);
      el.scheduleHourBreakdown.appendChild(card);
    }

    el.btnToggleScheduler.textContent = schedulerEnabled ? '⏸ พัก Scheduler' : '▶ เปิด Scheduler';
  }

  async function runBatch(batchIndex) {
    if (!activeCampaign || batchRunning) return;

    // Auto-upgrade any legacy INBOX_DOM campaign to TURBO_DIRECT whenever the UI selector is TURBO_DIRECT
    if (
      activeCampaign.messagingMode === 'INBOX_DOM' &&
      el.messagingModeSelect &&
      el.messagingModeSelect.value === 'TURBO_DIRECT'
    ) {
      activeCampaign.messagingMode = 'TURBO_DIRECT';
      await OnePersonDB.saveCampaign(activeCampaign);
      addLog('🔄 อัปเกรดแคมเปญเดิมเป็นโหมด 🚀 Turbo Direct (ยิงตรงด้วย PSID ไม่ต้องเปิด Business Suite) อัตโนมัติ', 'info');
    }

    const isDomMode = activeCampaign.messagingMode === 'INBOX_DOM';
    const isTurboMode = activeCampaign.messagingMode === 'TURBO_DIRECT';

    if (isTurboMode && !activeCampaign.dryRun && typeof OnePersonTurboDirect !== 'undefined') {
      await OnePersonTurboDirect.ensureFacebookHeaderRules();
    }

    if (isDomMode && !activeCampaign.dryRun) {
      const ready = await ensureInboxDomReady({ focus: true });
      if (!ready) {
        const msg = 'เปิดแท็บ Meta Business Suite ให้แล้ว — กรุณาตรวจว่าล็อกอิน Facebook และเห็นรายชื่อแชทเพจ One Person Ceo แล้วกด "▶ ส่งชุดนี้" อีกครั้งครับ';
        showToast(msg, 'warn', 6500);
        addLog(msg, 'warn');
        return;
      }
    }

    batchRunning = true;
    batchPaused = false;
    batchStopRequested = false;
    el.btnPauseCampaign.textContent = '⏸ พักการส่ง';
    renderBatchCards();

    const batchItems = activeQueueItems.filter(
      (i) => (i.batchIndex || 0) === batchIndex && i.status === 'pending'
    );
    const delayMs = isDomMode
      ? Math.max(3500, Number(activeCampaign.delayMs) || 3500)
      : isTurboMode
        ? Math.max(350, Number(activeCampaign.delayMs) || 450)
        : Math.max(40, Number(activeCampaign.delayMs) || 120);
    const contactMap = new Map(allContacts.map((c) => [c.id, c]));

    addLog(
      `เริ่มส่งชุดที่ ${batchIndex + 1} (${batchItems.length.toLocaleString('th-TH')} คน • โหมด: ${isTurboMode ? '🚀 Turbo Direct API (แบบ BroadTurbo)' : isDomMode ? 'แท็บ Inbox DOM' : activeCampaign.messagingMode})...`,
      'info'
    );

    let processedInBatch = 0;
    let loggedErrors = 0;

    for (const item of batchItems) {
      if (batchStopRequested) break;
      while (batchPaused && !batchStopRequested) {
        await new Promise((r) => setTimeout(r, 350));
      }
      if (batchStopRequested) break;

      const contact = contactMap.get(item.contactId) || (await OnePersonDB.getContactById(item.contactId));
      const missingTurboId = !contact || (!contact.fbid && !contact.psid && !contact.name);
      const missingGraphId = !contact || !contact.psid;
      if (!activeCampaign.dryRun && ((isTurboMode && missingTurboId) || (!isDomMode && !isTurboMode && missingGraphId))) {
        item.status = 'failed';
        item.errorCode = 100;
        item.errorLabel = isTurboMode ? 'ไม่มี FBID/PSID/ชื่อ สำหรับส่งแบบ BroadTurbo' : 'ไม่มี PSID สำหรับส่งตรงผ่าน Meta API';
        item.sentAt = Date.now();
        await OnePersonDB.updateQueueItem(item.id, item);
        if (loggedErrors < 10) {
          addLog(`ข้าม ${item.contactName}: #100 — ${item.errorLabel}`, 'err');
          loggedErrors += 1;
        }
        processedInBatch += 1;
        continue;
      }

      const renderedText = OnePersonCDP.renderPersonalizedMessage(activeCampaign.template, contact, {
        segmentOverrides: activeCampaign.segmentOverrides || {},
        useSegmentOverrides: Boolean(activeCampaign.useSegmentOverrides),
      });

      let res;
      if (isTurboMode) {
        const targetPageId = /^\d{4,}$/.test(activeCampaign.pageId || '')
          ? activeCampaign.pageId
          : /^\d{4,}$/.test(graphConfig.pageId || '')
            ? graphConfig.pageId
            : (el.turboPageIdInput?.value || '').trim();
        res = await OnePersonTurboDirect.sendTurboDirect({
          pageId: targetPageId,
          fbid: contact.fbid || '',
          psid: contact.psid || '',
          name: contact.name || '',
          text: renderedText,
          imageUrl: activeCampaign.imageUrl || '',
          domImages: activeCampaign.domImages || [],
          sendOrder: activeCampaign.sendOrder || 'image_first',
          pageAccessToken: graphConfig.accessToken || '',
          dryRun: Boolean(activeCampaign.dryRun),
        });
        if (res?.resolvedFbid && res.resolvedFbid !== contact.fbid) {
          await OnePersonDB.updateContact(contact.id, { fbid: res.resolvedFbid });
          contact.fbid = res.resolvedFbid;
        }
      } else if (isDomMode) {
        if (activeCampaign.dryRun) {
          await new Promise((r) => setTimeout(r, 40));
          res = { ok: true, dryRun: true, messageId: `dry_dom_${Date.now()}` };
        } else {
          const domRes = await sendToBackground('SEND_MESSAGE', {
            name: contact.name,
            key: contact.id,
            psid: contact.psid || '',
            pageId: activeCampaign.pageId || graphConfig.pageId || '',
            message: renderedText,
            sendOrder: activeCampaign.sendOrder || 'image_first',
            autoSend: true,
            focusInbox: true,
            imagesDataUrls: activeCampaign.domImages || [],
          });
          res = domRes.ok && domRes.data && domRes.data.ok
            ? { ok: true, messageId: 'dom_sent' }
            : { ok: false, error: { code: 901, label: domRes.error || domRes.data?.error || 'ส่งผ่านหน้า Inbox ไม่สำเร็จ' } };
        }
      } else {
        res = await OnePersonGraphAPI.sendDirectMessage({
          pageId: activeCampaign.pageId,
          accessToken: graphConfig.accessToken,
          psid: contact.psid,
          text: renderedText,
          imageUrl: activeCampaign.imageUrl || '',
          cachedAttachmentId: activeCampaign.cachedAttachmentId || '',
          attachmentIds: activeCampaign.attachmentIds || [],
          sendOrder: activeCampaign.sendOrder || 'image_first',
          messagingMode: activeCampaign.messagingMode || 'RESPONSE',
          messageTag: activeCampaign.messageTag || 'ACCOUNT_UPDATE',
          notificationToken: contact.marketingOptInToken || '',
          within24h: Boolean(contact.within24h),
          dryRun: Boolean(activeCampaign.dryRun),
        });
      }

      if (res.attachmentId && !activeCampaign.cachedAttachmentId) {
        activeCampaign.cachedAttachmentId = res.attachmentId;
      }
      if (res.usagePct !== undefined) {
        graphConfig.lastUsagePct = res.usagePct;
      }

      if (res.ok) {
        const ts = Date.now();
        item.status = 'sent';
        item.sentAt = ts;
        await OnePersonDB.updateQueueItem(item.id, {
          status: 'sent',
          sentAt: ts,
          messageId: res.messageId || '',
        });
        await OnePersonDB.updateContact(contact.id, { lastSentAt: ts });
        const normName = normalizeNameKey(contact.name);
        if (contact.fbid) sentHistory[contact.fbid] = ts;
        if (contact.psid) sentHistory[contact.psid] = ts;
        sentHistory[contact.id] = ts;
        if (normName) sentHistory[normName] = ts;
        selectedContactIds.delete(contact.id);
        addLog(`ส่งสำเร็จ → ${contact.name}`, 'ok');
      } else {
        const errInfo = res.error || { code: 0, label: 'ส่งไม่สำเร็จ' };
        item.status = 'failed';
        item.errorCode = errInfo.code || 0;
        item.errorLabel = errInfo.label || 'ส่งไม่สำเร็จ';
        item.sentAt = Date.now();
        await OnePersonDB.updateQueueItem(item.id, {
          status: 'failed',
          errorCode: item.errorCode,
          errorLabel: item.errorLabel,
          sentAt: item.sentAt,
        });
        if (loggedErrors < 10) {
          addLog(`ข้าม ${contact.name}: #${item.errorCode} — ${item.errorLabel}`, 'err');
          loggedErrors += 1;
        }

        if (errInfo.fatalAuth) {
          addLog(`หยุดส่งทันที: ${errInfo.label}`, 'err');
          batchStopRequested = true;
          break;
        }
      }

      processedInBatch += 1;
      if (processedInBatch % 5 === 0 || processedInBatch === batchItems.length) {
        renderBatchCards();
        renderGraphConnectionState();
      }

      const adaptiveWait = (res.usagePct || 0) >= 75 ? Math.max(delayMs, 1500) : delayMs;
      await new Promise((r) => setTimeout(r, adaptiveWait));
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.SENT_HISTORY]: sentHistory });
    activeCampaign.sentCount = activeQueueItems.filter((i) => i.status === 'sent').length;
    activeCampaign.failedCount = activeQueueItems.filter((i) => i.status === 'failed').length;
    activeCampaign.pendingCount = activeQueueItems.length - activeCampaign.sentCount - activeCampaign.failedCount;
    activeCampaign.status = activeCampaign.pendingCount === 0 ? 'completed' : 'paused';
    await OnePersonDB.saveCampaign(activeCampaign);

    batchRunning = false;
    batchPaused = false;
    renderBatchCards();
    updateGlobalBadges();
    await refreshPastCampaigns();

    addLog(`จบชุดที่ ${batchIndex + 1} — ประมวลผล ${processedInBatch} คน`, batchStopRequested ? 'warn' : 'ok');

    if (el.chkNotifyDesktop.checked) {
      await sendToBackground('NOTIFY', {
        title: `ชุดที่ ${batchIndex + 1} เสร็จสิ้น`,
        message: `${activeCampaign.title} • สำเร็จรวม ${activeCampaign.sentCount} คน`,
      });
    }

    if (!batchStopRequested && el.chkAutoContinueBatch.checked) {
      const nextItem = activeQueueItems.find((i) => i.status === 'pending');
      if (nextItem) {
        addLog(`ส่งต่อชุดที่ ${(nextItem.batchIndex || 0) + 1} อัตโนมัติ...`, 'info');
        await runBatch(nextItem.batchIndex || 0);
      }
    }
  }

  async function handleRetryRateLimited() {
    if (!activeCampaign || batchRunning) return;
    const retryCodes = new Set([613, 4, 32, 17]);
    let resetCount = 0;
    for (const item of activeQueueItems) {
      if (item.status === 'failed' && retryCodes.has(Number(item.errorCode))) {
        item.status = 'pending';
        item.errorCode = 0;
        item.errorLabel = '';
        await OnePersonDB.updateQueueItem(item.id, { status: 'pending', errorCode: 0, errorLabel: '' });
        resetCount += 1;
      }
    }
    if (resetCount === 0) {
      addLog('ไม่พบรายการที่ติด Rate Limit สำหรับส่งซ้ำครับ', 'info');
      return;
    }
    addLog(`รีเซ็ตรายการ Rate Limit ${resetCount} คน กลับเป็น "รอส่ง" เรียบร้อย`, 'ok');
    renderBatchCards();
  }

  function handleExportFailedCsv() {
    if (!activeCampaign) return;
    const failed = activeQueueItems.filter((i) => i.status === 'failed');
    if (failed.length === 0) return;

    const escapeCsv = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
    const lines = ['psid,name,rfm_segment,rsv_stage,error_code,error_label'];
    failed.forEach((f) => {
      lines.push(
        [f.psid, f.contactName, f.rfmSegment, f.rsvStage, f.errorCode, f.errorLabel].map(escapeCsv).join(',')
      );
    });

    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-${activeCampaign.id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function refreshPastCampaigns() {
    const camps = await OnePersonDB.listCampaigns();
    el.pastCampaignsList.innerHTML = '';
    if (!camps || camps.length === 0) {
      el.pastCampaignsList.innerHTML = `<div style="color: var(--muted); font-size: 12px;">ยังไม่มีประวัติแคมเปญ</div>`;
      return;
    }

    camps.slice(0, 15).forEach((c) => {
      const item = document.createElement('div');
      item.className = 'past-camp-item';

      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = `${c.title}${c.dryRun ? ' [DRY-RUN]' : ''}`;
      const sub = document.createElement('div');
      sub.style.color = 'var(--muted)';
      sub.textContent = `${c.deliveryMode === 'smart_time' ? '🕒 รายบุคคล' : '⚡ Batch'} • สำเร็จ ${c.sentCount || 0}/${c.totalContacts || 0} • ${c.status}`;
      info.appendChild(title);
      info.appendChild(sub);

      const btns = document.createElement('div');
      btns.className = 'row';

      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'btn btn-sm';
      openBtn.textContent = 'เปิดดู';
      openBtn.addEventListener('click', () => openCampaign(c.id));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger btn-sm';
      delBtn.textContent = 'ลบ';
      delBtn.addEventListener('click', async () => {
        await OnePersonDB.deleteCampaign(c.id);
        if (activeCampaign && activeCampaign.id === c.id) {
          activeCampaign = null;
          activeQueueItems = [];
          renderActiveCampaign();
        }
        await refreshPastCampaigns();
      });

      btns.appendChild(openBtn);
      btns.appendChild(delBtn);
      item.appendChild(info);
      item.appendChild(btns);
      el.pastCampaignsList.appendChild(item);
    });
  }

  // ==================== TAB 5: LEGACY INBOX DOM MODE (v1.0.2 PRESERVED) ====================

  function isLegacyInCooldown(key) {
    const days = Math.max(0, Number(el.legacyCooldownDays.value) || 0);
    if (days === 0) return false;
    const lastSent = sentHistory[key];
    if (!lastSent) return false;
    return (Date.now() - lastSent) / (1000 * 60 * 60 * 24) < days;
  }

  function renderLegacyContacts() {
    const query = (el.legacyContactSearch.value || '').trim().toLowerCase();
    const filtered = legacyContacts.filter(
      (c) => !query || c.name.toLowerCase().includes(query) || (c.snippet || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      el.legacyContactsList.innerHTML = `<div style="color: var(--muted); font-size: 13px; padding: 14px; text-align: center;">${legacyContacts.length === 0 ? 'ยังไม่มีรายชื่อ — กด "⚡ ดึงรายชื่อแชทสด"' : 'ไม่พบรายชื่อที่ค้นหา'}</div>`;
      return;
    }

    el.legacyContactsList.innerHTML = '';
    filtered.forEach((c, idx) => {
      const cooldown = isLegacyInCooldown(c.key);
      const item = document.createElement('div');
      item.className = `contact-item${cooldown ? ' cooldown' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !cooldown && legacySelectedKeys.has(c.key);
      checkbox.disabled = cooldown;
      checkbox.style.marginTop = '3px';
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) legacySelectedKeys.add(c.key);
        else legacySelectedKeys.delete(c.key);
      });

      const meta = document.createElement('div');
      meta.className = 'contact-meta';

      const nameRow = document.createElement('div');
      nameRow.className = 'contact-name';
      nameRow.textContent = `${idx + 1}. ${c.name}`;

      const badge = document.createElement('span');
      badge.className = `badge ${cooldown ? 'badge-cooldown' : 'badge-ready'}`;
      badge.textContent = cooldown ? 'ติด Cooldown' : 'พร้อมส่ง';
      nameRow.appendChild(badge);

      const snippet = document.createElement('div');
      snippet.className = 'contact-snippet';
      snippet.textContent = c.snippet || 'แชทใน Inbox เพจ One Person Ceo';

      meta.appendChild(nameRow);
      meta.appendChild(snippet);
      item.appendChild(checkbox);
      item.appendChild(meta);
      el.legacyContactsList.appendChild(item);
    });

    const readyCount = legacyContacts.filter((c) => !isLegacyInCooldown(c.key)).length;
    el.legacyStatusContacts.textContent = `ดึงได้ ${legacyContacts.length} คน (พร้อมส่ง ${readyCount} คน)`;
  }

  async function checkLegacyConnection() {
    el.legacyConnectionPill.className = 'pill warn';
    el.legacyConnectionPill.textContent = 'กำลังตรวจสอบ...';

    const res = await sendToBackground('CHECK_STATUS');
    if (!res.ok || !res.data || !res.data.ok) {
      el.legacyConnectionPill.className = 'pill warn';
      el.legacyConnectionPill.textContent = 'ยังไม่พบแท็บ Inbox';
      el.legacyStatusTab.textContent = 'ไม่พบแท็บ Meta Business Suite';
      el.legacyStatusPage.textContent = '-';
      return;
    }

    const info = res.data;
    el.legacyConnectionPill.className = 'pill ok';
    el.legacyConnectionPill.textContent = 'เชื่อมต่อแล้ว';
    el.legacyStatusTab.textContent = info.isInbox ? 'พบแท็บ Inbox กำลังเปิดอยู่' : 'พบ Meta Business Suite';
    el.legacyStatusPage.textContent = info.pageName || 'ตรวจพบแท็บแล้ว';
    addLog(`เชื่อมต่อแท็บ Inbox สำเร็จ: ${info.pageName || '-'}`, 'ok', el.legacyLogBox);
  }

  async function scanLegacyInbox() {
    el.btnLegacyScanInbox.disabled = true;
    el.btnLegacyScanInbox.textContent = '⏳ กำลังดึง...';
    const maxScrolls = Number(el.legacyScanDepth.value) || 10;
    addLog(`เริ่มสแกนแชท DOM (${maxScrolls} รอบ)...`, 'info', el.legacyLogBox);

    const res = await sendToBackground('SCAN_INBOX', { maxScrolls, maxContacts: 300 });
    el.btnLegacyScanInbox.disabled = false;
    el.btnLegacyScanInbox.textContent = '⚡ ดึงรายชื่อแชทสด';

    if (!res.ok || !res.data || !res.data.ok) {
      addLog(res.error || res.data?.error || 'ดึงรายชื่อไม่สำเร็จ', 'err', el.legacyLogBox);
      return;
    }

    legacyContacts = res.data.contacts || [];
    if (res.data.pageName) el.legacyStatusPage.textContent = res.data.pageName;
    legacySelectedKeys = new Set(legacyContacts.filter((c) => !isLegacyInCooldown(c.key)).map((c) => c.key));
    el.chkLegacySelectAll.checked = true;
    renderLegacyContacts();
    addLog(`ดึงรายชื่อ DOM สำเร็จ ${legacyContacts.length} คน`, 'ok', el.legacyLogBox);
  }

  async function startLegacyBroadcast() {
    const template = (el.messageInput.value || '').trim();
    if (!template) {
      addLog('กรุณาพิมพ์ข้อความในแท็บ 3 ก่อนส่งครับ', 'err', el.legacyLogBox);
      return;
    }
    const queue = legacyContacts.filter((c) => legacySelectedKeys.has(c.key) && !isLegacyInCooldown(c.key));
    if (queue.length === 0) {
      addLog('ไม่มีรายชื่อที่เลือกไว้สำหรับส่งครับ', 'warn', el.legacyLogBox);
      return;
    }

    const minSec = Math.max(5, Number(el.legacyMinDelay.value) || 15);
    const maxSec = Math.max(minSec, Number(el.legacyMaxDelay.value) || 35);
    const autoSend = el.chkLegacyAutoSend.checked;

    legacySending = true;
    legacyPaused = false;
    legacyStopRequested = false;
    el.btnLegacyStartSend.disabled = true;
    el.btnLegacyPauseSend.disabled = false;
    el.btnLegacyStopSend.disabled = false;

    let done = 0;
    let success = 0;

    for (let i = 0; i < queue.length; i++) {
      if (legacyStopRequested) break;
      while (legacyPaused && !legacyStopRequested) {
        await new Promise((r) => setTimeout(r, 400));
      }
      if (legacyStopRequested) break;

      const person = queue[i];
      el.legacyProgressLabel.textContent = `กำลังส่งถึง ${person.name} (${i + 1}/${queue.length})...`;
      const rendered = OnePersonCDP.renderPersonalizedMessage(template, { name: person.name });

      const res = await sendToBackground('SEND_MESSAGE', {
        name: person.name,
        key: person.key,
        message: rendered,
        autoSend,
      });

      done += 1;
      el.legacyProgressCount.textContent = `${done} / ${queue.length}`;
      el.legacyProgressBar.style.width = `${Math.round((done / queue.length) * 100)}%`;

      if (res.ok && res.data && res.data.ok) {
        success += 1;
        if (autoSend) {
          sentHistory[person.key] = Date.now();
          await chrome.storage.local.set({ [STORAGE_KEYS.SENT_HISTORY]: sentHistory });
          addLog(`ส่งสำเร็จ → ${person.name}`, 'ok', el.legacyLogBox);
        } else {
          addLog(`วาง Safe Draft → ${person.name}`, 'ok', el.legacyLogBox);
        }
      } else {
        addLog(`ข้าม ${person.name}: ${res.error || res.data?.error || 'ส่งไม่สำเร็จ'}`, 'err', el.legacyLogBox);
      }

      if (i < queue.length - 1 && !legacyStopRequested) {
        const waitSec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
        for (let s = waitSec; s > 0 && !legacyStopRequested; s--) {
          while (legacyPaused && !legacyStopRequested) {
            await new Promise((r) => setTimeout(r, 400));
          }
          el.legacyProgressLabel.textContent = `หน่วงเวลาปลอดภัย (${s} วินาที)...`;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    legacySending = false;
    el.btnLegacyStartSend.disabled = false;
    el.btnLegacyPauseSend.disabled = true;
    el.btnLegacyStopSend.disabled = true;
    el.legacyProgressLabel.textContent = legacyStopRequested ? 'หยุดแล้ว' : `เสร็จสิ้น ${success}/${queue.length} คน`;
    renderLegacyContacts();
    updateGlobalBadges();
  }

  // ==================== INITIALIZATION & EVENT BINDING ====================

  async function init() {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.PRESETS,
      STORAGE_KEYS.SENT_HISTORY,
      STORAGE_KEYS.GRAPH_CONFIG,
      STORAGE_KEYS.SCHEDULER_ENABLED,
      STORAGE_KEYS.NOTIFY_ENABLED,
      STORAGE_KEYS.SEGMENT_OVERRIDES,
      STORAGE_KEYS.LAST_TAB,
      STORAGE_KEYS.DRAFT_IMAGES,
      STORAGE_KEYS.ACTIVE_PRESET_ID,
    ]);

    // Preserve user presets while appending new v2.0 CDP presets if missing
    if (Array.isArray(stored[STORAGE_KEYS.PRESETS]) && stored[STORAGE_KEYS.PRESETS].length > 0) {
      presets = stored[STORAGE_KEYS.PRESETS];
      const existingIds = new Set(presets.map((p) => p.id));
      DEFAULT_PRESETS.forEach((dp) => {
        if (!existingIds.has(dp.id)) presets.push(dp);
      });
    } else {
      presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
    }

    sentHistory = stored[STORAGE_KEYS.SENT_HISTORY] || {};
    if (stored[STORAGE_KEYS.GRAPH_CONFIG]) {
      graphConfig = { ...graphConfig, ...stored[STORAGE_KEYS.GRAPH_CONFIG] };
      if (!graphConfig.accessToken && graphConfig.pageId === 'demo_onepersonceo') {
        const demoCount = await OnePersonDB.countContacts('demo_onepersonceo');
        if (demoCount === 0) {
          graphConfig.pageId = '';
          graphConfig.pageName = '⚠️ ยังไม่ได้เชื่อมต่อ Token';
        }
      }
      if (graphConfig.accessToken) el.tokenInput.value = graphConfig.accessToken;
    }

    el.chkDryRun.checked =
      !Boolean(graphConfig.accessToken) &&
      el.messagingModeSelect?.value !== 'TURBO_DIRECT' &&
      el.messagingModeSelect?.value !== 'INBOX_DOM';

    schedulerEnabled = stored[STORAGE_KEYS.SCHEDULER_ENABLED] !== false;
    el.chkNotifyDesktop.checked = stored[STORAGE_KEYS.NOTIFY_ENABLED] !== false;

    if (stored[STORAGE_KEYS.SEGMENT_OVERRIDES]) {
      segmentOverrides = { ...segmentOverrides, ...stored[STORAGE_KEYS.SEGMENT_OVERRIDES] };
    }
    el.ovrDueNow.value = segmentOverrides['Due Now'] || '';
    el.ovrChampions.value = segmentOverrides.Champions || '';
    el.ovrAtRisk.value = segmentOverrides['At Risk'] || '';
    el.ovrWarmLead.value = segmentOverrides['Warm Lead'] || '';

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    el.btnOpenInboxTop.addEventListener('click', () => sendToBackground('OPEN_INBOX', { pageId: graphConfig.pageId }));

    // Tab 1 events
    el.tokenInput.addEventListener('input', () => {
      el.tokenInput.classList.remove('input-error');
    });
    el.btnOpenGraphExplorer.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://developers.facebook.com/tools/explorer/' });
    });
    el.btnToggleToken.addEventListener('click', () => {
      const isPass = el.tokenInput.type === 'password';
      el.tokenInput.type = isPass ? 'text' : 'password';
      el.btnToggleToken.textContent = isPass ? '🙈 ซ่อน' : '👁 แสดง';
    });
    el.btnVerifyToken.addEventListener('click', handleVerifyToken);
    el.pageSelect.addEventListener('change', async () => {
      const found = (graphConfig.pages || []).find((p) => p.id === el.pageSelect.value);
      if (found) {
        await selectActiveGraphPage(found);
        await probeAndShowPageAccess();
      }
    });
    if (el.btnUseOnePersonPage) {
      el.btnUseOnePersonPage.addEventListener('click', async () => {
        await setActivePageIdForTurbo('561475983873000', 'One Person Ceo คุณก็เป็นประธานบริษัทได้ด้วย AI Agent');
        showToast('ตั้งค่าเพจ OnePersonCEO (561475983873000) แล้ว!', 'ok');
      });
    }
    if (el.btnDetectPageFromTab) {
      el.btnDetectPageFromTab.addEventListener('click', async () => {
        const res = await sendToBackground('DETECT_PAGE_FROM_INBOX_TAB');
        if (res && res.ok && res.pageId) {
          await setActivePageIdForTurbo(res.pageId);
          showToast(`ดึง Page ID จากแท็บ Inbox สำเร็จ: ${res.pageId}`, 'ok');
        } else {
          showToast(res?.error || 'ไม่พบแท็บ Meta Business Suite Inbox ที่มี asset_id', 'warn', 4500);
        }
      });
    }
    if (el.btnDiagnoseTurbo) {
      el.btnDiagnoseTurbo.addEventListener('click', handleDiagnoseTurbo);
    }
    if (el.turboPageIdInput) {
      el.turboPageIdInput.addEventListener('change', async () => {
        const val = el.turboPageIdInput.value.trim();
        if (/^\d{4,}$/.test(val)) {
          await setActivePageIdForTurbo(val);
        }
      });
    }
    if (el.btnStartTurboSync) {
      el.btnStartTurboSync.addEventListener('click', runTurboGraphQLSync);
    }
    el.btnStartSync.addEventListener('click', () => runCursorSync({ resume: false }));
    el.btnResumeSync.addEventListener('click', () => runCursorSync({ resume: true }));
    el.btnPauseSync.addEventListener('click', () => {
      if (syncRunning) syncStopRequested = true;
    });
    el.btnResetSync.addEventListener('click', async () => {
      await OnePersonDB.clearSyncState(graphConfig.pageId);
      await refreshSyncStateUi();
      showToast('ล้าง Cursor เรียบร้อย', 'info');
      addLog('ล้าง Cursor เรียบร้อย', 'warn');
    });
    el.btnSyncFromInboxToCdp.addEventListener('click', handleSyncFromInboxToCdp);
    el.btnImportC360.addEventListener('click', handleImportC360);
    el.btnDownloadSampleCsv.addEventListener('click', handleDownloadSampleCsv);
    el.btnLoadDemoCdp.addEventListener('click', handleLoadDemoCdp);
    el.btnClearPageDb.addEventListener('click', handleClearPageDb);

    // Tab 2 events
    el.btnResetFilters.addEventListener('click', () => {
      activeRfmFilter = 'ALL';
      activeRsvFilter = 'ALL';
      activeHourFilter = null;
      el.fltWithin24h.checked = false;
      el.fltHasOrders.checked = false;
      el.fltHasMktToken.checked = false;
      el.fltHideCooldown.checked = true;
      el.fltContactSearch.value = '';
      el.hourFilterBadge.textContent = 'แสดงทุกชั่วโมง (00–23 น.)';
      el.btnClearHourFilter.classList.add('hidden');
      currentPageNum = 1;
      computeSegmentationUi();
    });
    el.btnClearHourFilter.addEventListener('click', () => {
      activeHourFilter = null;
      el.hourFilterBadge.textContent = 'แสดงทุกชั่วโมง (00–23 น.)';
      el.btnClearHourFilter.classList.add('hidden');
      currentPageNum = 1;
      computeSegmentationUi();
    });
    [el.fltWithin24h, el.fltHasOrders, el.fltHasMktToken, el.fltHideCooldown].forEach((chk) => {
      chk.addEventListener('change', () => {
        currentPageNum = 1;
        computeSegmentationUi();
      });
    });
    el.fltContactSearch.addEventListener('input', () => {
      currentPageNum = 1;
      computeSegmentationUi();
    });
    el.btnSelectAllFiltered.addEventListener('click', async () => {
      const readyFiltered = filteredContacts.filter((c) => !isInCooldown(c));
      const skippedCount = filteredContacts.length - readyFiltered.length;
      selectedContactIds = new Set(readyFiltered.map((c) => c.id));
      await persistSelection();
      renderPaginatedContacts();
      updateGlobalBadges();
      populatePreviewContactSelect();
      showToast(
        skippedCount > 0
          ? `เลือกเฉพาะที่พร้อมส่ง ${selectedContactIds.size.toLocaleString('th-TH')} คน (ข้าม Cooldown ${skippedCount} คน)`
          : `เลือกเฉพาะกลุ่มนี้ ${selectedContactIds.size.toLocaleString('th-TH')} คนแล้ว`,
        'ok',
        3200
      );
    });
    el.btnClearSelected.addEventListener('click', async () => {
      selectedContactIds.clear();
      await persistSelection('none');
      renderPaginatedContacts();
      updateGlobalBadges();
      populatePreviewContactSelect();
      showToast('ล้างรายชื่อที่เลือกแล้ว', 'info', 2500);
    });
    el.btnGoToCopy.addEventListener('click', async () => {
      if (selectedContactIds.size === 0 && filteredContacts.length > 0) {
        const readyFiltered = filteredContacts.filter((c) => !isInCooldown(c));
        selectedContactIds = new Set(readyFiltered.map((c) => c.id));
        await persistSelection();
        renderPaginatedContacts();
        updateGlobalBadges();
        showToast(`เลือกให้อัตโนมัติ ${selectedContactIds.size.toLocaleString('th-TH')} คนตามตัวกรอง (ข้ามคนติด Cooldown)`, 'info', 3000);
      }
      populatePreviewContactSelect();
      switchTab('copy');
    });
    if (el.btnGoToLaunch) {
      el.btnGoToLaunch.addEventListener('click', () => switchTab('launch'));
    }
    el.btnPrevPage.addEventListener('click', () => {
      if (currentPageNum > 1) {
        currentPageNum -= 1;
        renderPaginatedContacts();
      }
    });
    el.btnNextPage.addEventListener('click', () => {
      currentPageNum += 1;
      renderPaginatedContacts();
    });

    // Tab 3 events (Per-Preset isolated images: clear legacy global draft key)
    chrome.storage.local.remove(STORAGE_KEYS.DRAFT_IMAGES).catch(() => {});
    const savedPresetId = stored[STORAGE_KEYS.ACTIVE_PRESET_ID];
    const initialPresetId =
      savedPresetId && presets.some((p) => p.id === savedPresetId) ? savedPresetId : presets[0].id;
    await selectPreset(initialPresetId, { persist: false });

    el.messageInput.addEventListener('input', updatePreview);
    el.imageUrlInput.addEventListener('input', updatePreview);
    el.imageUrlInput.addEventListener('change', saveActivePresetMediaToStorage);
    el.sendOrderSelect.addEventListener('change', () => {
      updatePreview();
      saveActivePresetMediaToStorage();
    });
    el.btnPickImages.addEventListener('click', () => el.imageFileInput.click());
    el.imageFileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        await addImageFiles(e.target.files);
        e.target.value = '';
      }
    });
    el.btnClearImages.addEventListener('click', clearAttachedImages);
    if (el.imageDropzone) {
      el.imageDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.imageDropzone.classList.add('drag-over');
      });
      el.imageDropzone.addEventListener('dragleave', () => {
        el.imageDropzone.classList.remove('drag-over');
      });
      el.imageDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        el.imageDropzone.classList.remove('drag-over');
        if (e.dataTransfer?.files?.length) {
          await addImageFiles(e.dataTransfer.files);
        }
      });
    }
    document.addEventListener('paste', async (e) => {
      const copyTabActive = document.getElementById('tab-copy')?.classList.contains('active');
      if (!copyTabActive) return;
      const items = Array.from(e.clipboardData?.items || []);
      const imgFiles = items.filter((it) => it.type.startsWith('image/')).map((it) => it.getAsFile()).filter(Boolean);
      if (imgFiles.length > 0) {
        e.preventDefault();
        await addImageFiles(imgFiles);
      }
    });
    el.previewContactSelect.addEventListener('change', updatePreview);
    el.btnRandomizePreview.addEventListener('click', updatePreview);
    el.chkSegmentOverrides.addEventListener('change', () => {
      el.segmentOverridesPanel.classList.toggle('hidden', !el.chkSegmentOverrides.checked);
      updatePreview();
    });
    [el.ovrDueNow, el.ovrChampions, el.ovrAtRisk, el.ovrWarmLead].forEach((ta) => {
      ta.addEventListener('input', async () => {
        segmentOverrides = getSegmentOverridesObject();
        await chrome.storage.local.set({ [STORAGE_KEYS.SEGMENT_OVERRIDES]: segmentOverrides });
        updatePreview();
      });
    });
    document.querySelectorAll('.tag-chip').forEach((chip) => {
      chip.addEventListener('click', () => insertAtCursor(el.messageInput, chip.dataset.tag || ''));
    });
    el.btnSavePreset.addEventListener('click', async () => {
      const idx = presets.findIndex((p) => p.id === activePresetId);
      if (idx === -1) return;
      presets[idx].title = el.presetTitleInput.value.trim() || presets[idx].title;
      presets[idx].message = el.messageInput.value;
      presets[idx].imageUrl = (el.imageUrlInput?.value || '').trim();
      presets[idx].sendOrder = el.sendOrderSelect?.value || 'image_first';
      presets[idx].savedImages = serializeMinimalImages();
      try {
        await chrome.storage.local.set({
          [STORAGE_KEYS.PRESETS]: presets,
          [STORAGE_KEYS.ACTIVE_PRESET_ID]: activePresetId,
        });
        renderPresets();
        showToast(
          `บันทึก Preset "${presets[idx].title}" และรูปแนบเฉพาะหัวข้อนี้ (${presets[idx].savedImages.length} รูป) เรียบร้อย`,
          'ok',
          3500
        );
      } catch (err) {
        console.warn('savePreset failed:', err);
        showToast('บันทึก Preset ไม่สำเร็จ (ข้อมูลรูปอาจใหญ่เกินพื้นที่จัดเก็บ)', 'err', 5000);
      }
    });
    el.btnAddPreset.addEventListener('click', async () => {
      const newId = `custom-${Date.now()}`;
      presets.push({
        id: newId,
        title: `✨ Preset ใหม่ #${presets.length + 1}`,
        desc: 'ข้อความกำหนดเอง',
        message: `{greeting}คุณ {name} ครับ 👋 เสวิญ (OnePersonCEO) เองครับ\n\n(พิมพ์ข้อความตรงนี้)\n\nRef: #{code}`,
      });
      await chrome.storage.local.set({ [STORAGE_KEYS.PRESETS]: presets });
      selectPreset(newId);
    });
    el.btnDeletePreset.addEventListener('click', async () => {
      if (presets.length <= 1) return;
      presets = presets.filter((p) => p.id !== activePresetId);
      await chrome.storage.local.set({ [STORAGE_KEYS.PRESETS]: presets });
      selectPreset(presets[0].id);
    });
    el.btnResetPresets.addEventListener('click', async () => {
      presets = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
      await chrome.storage.local.set({ [STORAGE_KEYS.PRESETS]: presets });
      selectPreset(presets[0].id);
    });
    el.btnTestSendOne.addEventListener('click', handleTestSendOne);

    // Tab 4 events
    document.querySelectorAll('input[name="deliveryMode"]').forEach((radio) => {
      radio.addEventListener('change', updateDeliveryModeUi);
    });
    el.messagingModeSelect.addEventListener('change', () => {
      const modeVal = el.messagingModeSelect.value;
      el.messageTagWrap.classList.toggle('hidden', modeVal !== 'MESSAGE_TAG');
      if (modeVal === 'TURBO_DIRECT' || modeVal === 'INBOX_DOM') {
        el.chkDryRun.checked = false;
      } else if (!graphConfig.accessToken) {
        el.chkDryRun.checked = true;
      }
      updateLaunchWindowHint();
    });
    if (el.btnSwitchToInboxDom) {
      el.btnSwitchToInboxDom.addEventListener('click', () => {
        el.messagingModeSelect.value = 'TURBO_DIRECT';
        el.messageTagWrap.classList.add('hidden');
        updateLaunchWindowHint();
        showToast('เปลี่ยนเป็นโหมด "🚀 Turbo Direct (แบบ BroadTurbo)" แล้ว — กดปุ่มยิงสีม่วงได้เลยครับ!', 'ok', 4000);
      });
    }
    el.chkNotifyDesktop.addEventListener('change', async () => {
      await chrome.storage.local.set({ [STORAGE_KEYS.NOTIFY_ENABLED]: el.chkNotifyDesktop.checked });
    });
    el.btnCreateCampaign.addEventListener('click', handleCreateCampaign);
    el.btnPauseCampaign.addEventListener('click', () => {
      if (!batchRunning) return;
      batchPaused = !batchPaused;
      el.btnPauseCampaign.textContent = batchPaused ? '▶ ส่งต่อ' : '⏸ พักการส่ง';
    });
    el.btnStopCampaign.addEventListener('click', () => {
      if (!batchRunning) return;
      batchStopRequested = true;
      batchPaused = false;
    });
    el.btnRetryRateLimited.addEventListener('click', handleRetryRateLimited);
    el.btnExportFailedCsv.addEventListener('click', handleExportFailedCsv);

    el.btnTriggerSchedulerNow.addEventListener('click', async () => {
      addLog('กำลังสั่ง Background Scheduler ตรวจสอบและยิงรายการที่ถึงเวลา...', 'info');
      const res = await sendToBackground('RUN_SCHEDULER_TICK', { force: true });
      addLog(`Scheduler ทำงานเสร็จ: ประมวลผล ${res.processed || 0} (สำเร็จ ${res.sent || 0}, พลาด ${res.failed || 0})`, 'ok');
      if (activeCampaign) await openCampaign(activeCampaign.id);
      await refreshPastCampaigns();
    });
    el.btnToggleScheduler.addEventListener('click', async () => {
      schedulerEnabled = !schedulerEnabled;
      await sendToBackground('SET_SCHEDULER_ALARM', { enabled: schedulerEnabled });
      updateGlobalBadges();
      if (activeCampaign) renderSmartSchedulePanel();
    });
    el.btnCancelScheduledCampaign.addEventListener('click', async () => {
      if (!activeCampaign) return;
      activeCampaign.status = 'cancelled';
      await OnePersonDB.saveCampaign(activeCampaign);
      addLog(`ยกเลิกตารางส่ง "${activeCampaign.title}" เรียบร้อย`, 'warn');
      renderSmartSchedulePanel();
      await refreshPastCampaigns();
    });

    // Tab 5 (Legacy DOM) events
    el.btnLegacyCheckConn.addEventListener('click', checkLegacyConnection);
    el.btnLegacyOpenInbox.addEventListener('click', async () => {
      await sendToBackground('OPEN_INBOX', { pageId: graphConfig.pageId });
      setTimeout(checkLegacyConnection, 1500);
    });
    el.btnLegacyScanInbox.addEventListener('click', scanLegacyInbox);
    el.btnLegacyPushToCdp.addEventListener('click', async () => {
      const count = await importDomContactsIntoCdp(legacyContacts, el.legacyStatusPage.textContent || '');
      if (count > 0) switchTab('segment');
    });
    el.legacyContactSearch.addEventListener('input', renderLegacyContacts);
    el.legacyCooldownDays.addEventListener('change', renderLegacyContacts);
    el.chkLegacySelectAll.addEventListener('change', () => {
      if (el.chkLegacySelectAll.checked) {
        legacySelectedKeys = new Set(legacyContacts.filter((c) => !isLegacyInCooldown(c.key)).map((c) => c.key));
      } else {
        legacySelectedKeys.clear();
      }
      renderLegacyContacts();
    });
    el.btnLegacyClearHistory.addEventListener('click', async () => {
      sentHistory = {};
      await chrome.storage.local.set({ [STORAGE_KEYS.SENT_HISTORY]: sentHistory });
      renderLegacyContacts();
      computeSegmentationUi();
      updateGlobalBadges();
    });
    el.btnLegacyStartSend.addEventListener('click', startLegacyBroadcast);
    el.btnLegacyPauseSend.addEventListener('click', () => {
      if (!legacySending) return;
      legacyPaused = !legacyPaused;
      el.btnLegacyPauseSend.textContent = legacyPaused ? '▶ ทำต่อ' : '⏸ พัก';
    });
    el.btnLegacyStopSend.addEventListener('click', () => {
      if (!legacySending) return;
      legacyStopRequested = true;
      legacyPaused = false;
    });

    // Listen for background scheduler updates
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'SCHEDULER_TICK_DONE') {
        if (activeCampaign) openCampaign(activeCampaign.id);
        refreshPastCampaigns();
        refreshWorkflowEnrollments();
      }
    });

    await initWorkflowsTab();

    renderGraphConnectionState();
    updateDeliveryModeUi();
    await refreshSyncStateUi();
    await loadContactsFromDb();
    await refreshPastCampaigns();

    // Auto-open most recent campaign if any
    const camps = await OnePersonDB.listCampaigns();
    if (camps && camps.length > 0) {
      await openCampaign(camps[0].id);
    }

    const lastTab = stored[STORAGE_KEYS.LAST_TAB];
    if (lastTab && ['connect', 'segment', 'copy', 'launch', 'workflows', 'legacy'].includes(lastTab)) {
      switchTab(lastTab, { persist: false });
    }
  }

  // ==================== TAB 5: WORKFLOW FOLLOW-UP (RFM / RSV) ====================

  let wfList = [];
  let activeWfId = null;

  async function ensureDefaultWorkflowsSeeded(force = false) {
    const existing = await OnePersonDB.listWorkflows();
    if (!force && existing && existing.length > 0) {
      wfList = existing;
      return;
    }
    const defaults = JSON.parse(JSON.stringify(OnePersonCDP.DEFAULT_FOLLOWUP_WORKFLOWS || []));
    for (const wf of defaults) {
      await OnePersonDB.saveWorkflow(wf);
    }
    wfList = await OnePersonDB.listWorkflows();
  }

  function getActiveWorkflow() {
    return wfList.find((w) => w.id === activeWfId) || wfList[0] || null;
  }

  function renderWorkflowSelectorAndSteps() {
    if (!el.wfSelect || !el.wfStepsContainer) return;
    el.wfSelect.innerHTML = wfList
      .map((w) => `<option value="${escapeHtml(w.id)}">${escapeHtml(w.name)}</option>`)
      .join('');
    const wf = getActiveWorkflow();
    if (!wf) return;
    activeWfId = wf.id;
    el.wfSelect.value = wf.id;

    el.chkWfActive.checked = wf.isActive !== false;
    el.chkWfStopConvert.checked = wf.stopOnConvert !== false;
    el.chkWfQuietHours.checked = wf.respectQuietHours !== false;

    const steps = Array.isArray(wf.steps) ? wf.steps : [];
    el.wfStepsContainer.innerHTML = steps
      .map(
        (s, idx) => `
      <div class="contact-item" style="flex-direction: column; gap: 8px;">
        <div class="row-between" style="width: 100%;">
          <input type="text" class="wf-step-title" data-idx="${idx}" value="${escapeHtml(s.title || `Step ${idx + 1}`)}" style="flex: 1; font-weight: 700;" />
          <button type="button" class="btn btn-danger btn-sm btn-wf-del-step" data-idx="${idx}">ลบ</button>
        </div>
        <div class="settings-grid" style="width: 100%;">
          <div>
            <label class="field-label">วันที่ส่ง (Day)</label>
            <input type="number" min="0" class="wf-step-days" data-idx="${idx}" value="${Number(s.delayDays || 0)}" />
          </div>
          <div>
            <label class="field-label">กรอง RSV Stage</label>
            <select class="wf-step-rsv" data-idx="${idx}">
              ${['ANY', 'Prospect', 'Fresh', 'Upcoming', 'Due Now', 'Overdue']
                .map((opt) => `<option value="${opt}" ${s.rsvFilter === opt ? 'selected' : ''}>${opt}</option>`)
                .join('')}
            </select>
          </div>
          <div>
            <label class="field-label">กรอง RFM</label>
            <select class="wf-step-rfm" data-idx="${idx}">
              ${['ANY', 'Warm Lead', 'Cold Lead', 'Potential Loyalist', 'Loyal', 'Champions', 'At Risk']
                .map((opt) => `<option value="${opt}" ${s.rfmFilter === opt ? 'selected' : ''}>${opt}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <textarea class="mini-textarea wf-step-msg" data-idx="${idx}">${escapeHtml(s.message || '')}</textarea>
      </div>`
      )
      .join('');

    el.wfStepsContainer.querySelectorAll('.wf-step-title').forEach((inp) => {
      inp.addEventListener('input', () => {
        wf.steps[Number(inp.dataset.idx)].title = inp.value;
      });
    });
    el.wfStepsContainer.querySelectorAll('.wf-step-days').forEach((inp) => {
      inp.addEventListener('change', () => {
        wf.steps[Number(inp.dataset.idx)].delayDays = Math.max(0, Number(inp.value) || 0);
      });
    });
    el.wfStepsContainer.querySelectorAll('.wf-step-rsv').forEach((sel) => {
      sel.addEventListener('change', () => {
        wf.steps[Number(sel.dataset.idx)].rsvFilter = sel.value;
      });
    });
    el.wfStepsContainer.querySelectorAll('.wf-step-rfm').forEach((sel) => {
      sel.addEventListener('change', () => {
        wf.steps[Number(sel.dataset.idx)].rfmFilter = sel.value;
      });
    });
    el.wfStepsContainer.querySelectorAll('.wf-step-msg').forEach((ta) => {
      ta.addEventListener('input', () => {
        wf.steps[Number(ta.dataset.idx)].message = ta.value;
      });
    });
    el.wfStepsContainer.querySelectorAll('.btn-wf-del-step').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        wf.steps = wf.steps.filter((_, i) => i !== idx).map((st, i) => ({ ...st, stepOrder: i }));
        renderWorkflowSelectorAndSteps();
      });
    });
  }

  async function refreshWorkflowEnrollments() {
    if (!el.wfEnrollmentsList) return;
    const rows = await OnePersonDB.listEnrollments();
    const activeCount = rows.filter((r) => r.status === 'active').length;
    if (el.wfActiveEnrollPill) el.wfActiveEnrollPill.textContent = `คิว Workflow: ${activeCount} คน`;
    if (el.wfEnrollmentsCount) el.wfEnrollmentsCount.textContent = String(rows.length);

    if (rows.length === 0) {
      el.wfEnrollmentsList.innerHTML =
        '<div style="color: var(--muted); font-size: 12px; padding: 14px; text-align: center;">ยังไม่มีรายชื่อใน Workflow — เลือกกลุ่มลูกค้าในแท็บ 2 แล้วกด "➕ นำเข้า Workflow ทันที" ด้านบนครับ</div>';
      return;
    }

    const wfById = new Map(wfList.map((w) => [w.id, w.name]));
    el.wfEnrollmentsList.innerHTML = rows
      .slice(0, 80)
      .map((r) => {
        const nextStr = r.nextRunAt
          ? new Date(r.nextRunAt).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '-';
        return `
        <div class="contact-item" style="justify-content: space-between; align-items: center;">
          <div class="contact-meta">
            <div class="contact-name">
              <span>${escapeHtml(r.customerName || r.contactId)}</span>
              <span class="pill ${r.status === 'active' ? 'ok' : r.status === 'converted' ? 'warn' : ''}" style="font-size: 10px;">${escapeHtml(r.status)}</span>
              <span class="pill" style="font-size: 10px;">${escapeHtml(r.rsvStage || 'Prospect')}</span>
            </div>
            <div class="contact-snippet">
              ${escapeHtml(wfById.get(r.workflowId) || r.workflowId)} · Step ถัดไป: ${r.nextStepOrder ?? 'จบแล้ว'} (${nextStr})
            </div>
          </div>
          ${
            r.status === 'active'
              ? `<button type="button" class="btn btn-sm btn-wf-fast-one" data-id="${escapeHtml(r.id)}">⚡ รันทันที</button>`
              : ''
          }
        </div>`;
      })
      .join('');

    el.wfEnrollmentsList.querySelectorAll('.btn-wf-fast-one').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await OnePersonDB.updateEnrollment(btn.dataset.id, { nextRunAt: Date.now() - 1000 });
        const res = await sendToBackground('RUN_SCHEDULER_TICK', { force: true });
        showToast(`รัน Workflow แล้ว: ส่ง ${res.sent || 0} (พลาด ${res.failed || 0})`, 'ok');
        await refreshWorkflowEnrollments();
      });
    });
  }

  async function initWorkflowsTab() {
    if (!el.wfSelect) return;
    await ensureDefaultWorkflowsSeeded(false);
    renderWorkflowSelectorAndSteps();
    await refreshWorkflowEnrollments();

    const syncStored = await chrome.storage.local.get([STORAGE_KEYS.SERVER_SYNC_CONFIG]);
    if (syncStored[STORAGE_KEYS.SERVER_SYNC_CONFIG]) {
      const cfg = syncStored[STORAGE_KEYS.SERVER_SYNC_CONFIG];
      if (el.wfServerUrlInput && cfg.serverUrl) el.wfServerUrlInput.value = cfg.serverUrl;
      if (el.wfServerSecretInput && cfg.secretKey) el.wfServerSecretInput.value = cfg.secretKey;
    }

    el.wfSelect.addEventListener('change', () => {
      activeWfId = el.wfSelect.value;
      renderWorkflowSelectorAndSteps();
    });
    el.chkWfActive.addEventListener('change', () => {
      const wf = getActiveWorkflow();
      if (wf) wf.isActive = el.chkWfActive.checked;
    });
    el.chkWfStopConvert.addEventListener('change', () => {
      const wf = getActiveWorkflow();
      if (wf) wf.stopOnConvert = el.chkWfStopConvert.checked;
    });
    el.chkWfQuietHours.addEventListener('change', () => {
      const wf = getActiveWorkflow();
      if (wf) wf.respectQuietHours = el.chkWfQuietHours.checked;
    });
    el.btnWfAddStep.addEventListener('click', () => {
      const wf = getActiveWorkflow();
      if (!wf) return;
      const nextOrder = wf.steps.length;
      wf.steps.push({
        stepOrder: nextOrder,
        title: `Step ${nextOrder}: ข้อความติดตามผล`,
        delayDays: (wf.steps[wf.steps.length - 1]?.delayDays || 0) + 3,
        delayHours: 0,
        rsvFilter: 'ANY',
        rfmFilter: 'ANY',
        message: `{greeting}คุณ {name} ครับ 👋 เสวิญแวะมาแชร์เพิ่มเติมครับ\n\nดูรายละเอียดได้ที่ https://onepersonceo.com/go/articles\n\nRef: #{code}`,
      });
      renderWorkflowSelectorAndSteps();
    });
    el.btnWfSave.addEventListener('click', async () => {
      const wf = getActiveWorkflow();
      if (!wf) return;
      await OnePersonDB.saveWorkflow(wf);
      showToast(`บันทึก Workflow "${wf.name}" แล้ว`, 'ok');
    });
    el.btnWfResetDefaults.addEventListener('click', async () => {
      await ensureDefaultWorkflowsSeeded(true);
      activeWfId = wfList[0]?.id || null;
      renderWorkflowSelectorAndSteps();
      showToast('คืนค่าเริ่มต้น Workflow RFM/RSV เรียบร้อย', 'info');
    });

    el.btnWfEnrollSelected.addEventListener('click', async () => {
      const wf = getActiveWorkflow();
      if (!wf) return;
      const targets = allContacts.filter((c) => selectedContactIds.has(c.id));
      if (targets.length === 0) {
        showToast('กรุณาเลือกรายชื่อลูกค้าในแท็บ 2 ก่อนครับ', 'warn');
        return;
      }
      const deliveryMode = el.wfDeliveryModeSelect?.value || 'TURBO_DIRECT';
      const dryRun = Boolean(el.chkWfDryRun?.checked);
      const firstStep = (wf.steps || []).sort((a, b) => a.stepOrder - b.stepOrder)[0];
      if (!firstStep) return;

      const records = targets.map((c) => {
        const sched = OnePersonCDP.computeNextScheduledTime(c.preferredHour ?? 20, {
          quietStart: 22,
          quietEnd: 8,
          shiftTarget: 'morning',
          nowMs: Date.now(),
          jitterMinutes: 12,
          seedKey: c.id,
        });
        const delayMs = Number(firstStep.delayDays || 0) * 86400000;
        const firstRun = delayMs === 0 && !wf.respectQuietHours ? Date.now() : Math.max(Date.now(), sched.scheduledAt + delayMs);
        return {
          id: `${wf.id}:${c.id}`,
          workflowId: wf.id,
          contactId: c.id,
          pageId: graphConfig.pageId || c.pageId || '561475983873000',
          customerName: c.name,
          rsvStage: c.rsvStage || 'Prospect',
          rfmSegment: c.rfmSegment || 'Warm Lead',
          sourceBook: c.sourceBook || c.lastProduct || '',
          deliveryMode,
          dryRun,
          status: 'active',
          currentStepOrder: 0,
          nextStepOrder: firstStep.stepOrder,
          nextRunAt: firstRun,
          sentSteps: [],
          enrolledAt: Date.now(),
        };
      });

      await OnePersonDB.bulkPutEnrollments(records);
      await sendToBackground('SET_SCHEDULER_ALARM', { enabled: true });
      await refreshWorkflowEnrollments();
      showToast(`นำเข้า "${wf.name}" แล้ว ${records.length} คน`, 'ok', 4000);
    });

    el.btnWfRunDueNow.addEventListener('click', async () => {
      const res = await sendToBackground('RUN_SCHEDULER_TICK', { force: true });
      await refreshWorkflowEnrollments();
      showToast(`Scheduler ทำงานเสร็จ: ประมวลผล ${res.processed || 0} (สำเร็จ ${res.sent || 0})`, 'ok');
    });

    el.btnWfClearCompleted.addEventListener('click', async () => {
      const rows = await OnePersonDB.listEnrollments();
      for (const r of rows) {
        if (r.status !== 'active') await OnePersonDB.deleteEnrollment(r.id);
      }
      await refreshWorkflowEnrollments();
      showToast('ล้างคิวที่จบ/หยุดแล้วเรียบร้อย', 'info');
    });

    const saveSyncCfg = async () => {
      await chrome.storage.local.set({
        [STORAGE_KEYS.SERVER_SYNC_CONFIG]: {
          serverUrl: (el.wfServerUrlInput?.value || '').trim(),
          secretKey: (el.wfServerSecretInput?.value || '').trim(),
        },
      });
    };

    el.btnWfPullServer.addEventListener('click', async () => {
      await saveSyncCfg();
      const baseUrl = (el.wfServerUrlInput?.value || 'https://dashboard.aimar.cloud').trim().replace(/\/$/, '');
      const secret = (el.wfServerSecretInput?.value || '').trim();
      try {
        const res = await fetch(`${baseUrl}/api/messenger/funnel/enrollments?format=broadcaster&company=DgtProduct`, {
          headers: secret ? { 'x-secret-key': secret } : {},
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        const incoming = Array.isArray(json.contacts) ? json.contacts : [];
        if (incoming.length > 0) {
          const { mergedContacts, matchedCount, createdCount } = OnePersonCDP.mergeCustomer360IntoContacts(
            allContacts,
            incoming,
            graphConfig.pageId || '561475983873000'
          );
          await OnePersonDB.bulkUpsertContacts(mergedContacts);
          await loadContactsFromDb();
          showInlineAlert(
            el.wfServerSyncStatus,
            `✅ ดึงจาก Server สำเร็จ ${incoming.length} คน (อัปเดต ${matchedCount} · เพิ่มใหม่ ${createdCount})`,
            'ok'
          );
        } else {
          showInlineAlert(el.wfServerSyncStatus, 'ℹ️ เชื่อมต่อ Server สำเร็จ (ยังไม่มี Lead ใหม่ในคิว Ebook Funnel)', 'info');
        }
      } catch (err) {
        showInlineAlert(
          el.wfServerSyncStatus,
          `❌ ซิงก์ไม่สำเร็จ: ${err.message} (ต้องล็อกอิน dashboard.aimar.cloud หรือใส่ ORCHESTRATOR_SECRET)`,
          'err'
        );
      }
    });

    el.btnWfPushServer.addEventListener('click', async () => {
      await saveSyncCfg();
      const targets = allContacts.filter((c) => selectedContactIds.has(c.id));
      if (targets.length === 0) {
        showToast('กรุณาเลือกรายชื่อในแท็บ 2 ก่อนส่งขึ้น Server', 'warn');
        return;
      }
      const baseUrl = (el.wfServerUrlInput?.value || 'https://dashboard.aimar.cloud').trim().replace(/\/$/, '');
      const secret = (el.wfServerSecretInput?.value || '').trim();
      const wf = getActiveWorkflow();
      try {
        const res = await fetch(`${baseUrl}/api/messenger/funnel/enrollments?company=DgtProduct`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(secret ? { 'x-secret-key': secret } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            action: 'import_contacts',
            workflow_slug: wf?.slug || '',
            contacts: targets.slice(0, 500),
            dry_run: Boolean(el.chkWfDryRun?.checked),
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || `HTTP ${res.status}`);
        }
        showInlineAlert(
          el.wfServerSyncStatus,
          `✅ ส่งรายชื่อขึ้น HealthScale Server สำเร็จ: Synced ${json.synced || 0} คน · เข้า Workflow ${json.enrolled || 0} คน`,
          'ok'
        );
      } catch (err) {
        showInlineAlert(el.wfServerSyncStatus, `❌ ส่งขึ้น Server ไม่สำเร็จ: ${err.message}`, 'err');
      }
    });
  }

  init();
})();
