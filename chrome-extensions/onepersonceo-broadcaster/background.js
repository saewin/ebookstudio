// OnePersonCEO Smart Broadcaster v2.2 — Background Service Worker (Manifest V3)
// Stateless across wakeups: persists all queue & campaign state in IndexedDB + chrome.storage
// BroadTurbo v4.8.9 Parity Transport: DNR header rules + SW-originated GraphQL / Mercury fetch

importScripts('db.js', 'cdp-engine.js', 'graph-api.js', 'turbo-direct.js');

const ALARM_NAME = 'smart-dispatch-tick';
const EXPECTED_CONTENT_VERSION = '2.2.0';
const STORAGE_KEYS = {
  GRAPH_CONFIG: 'onepersonceo_graph_config_v2',
  SCHEDULER_ENABLED: 'onepersonceo_scheduler_enabled_v2',
  NOTIFY_ENABLED: 'onepersonceo_notify_enabled_v2',
  SENT_HISTORY: 'onepersonceo_sent_history_v1',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==================== BROADTURBO DNR HEADER RULES ====================
let headerRulesPromise = null;

async function ensureFacebookHeaderRules() {
  if (typeof chrome === 'undefined' || !chrome.declarativeNetRequest?.updateDynamicRules) {
    return { ok: false, ruleCount: 0 };
  }
  if (!headerRulesPromise) {
    headerRulesPromise = (async () => {
      try {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [1, 2, 201, 202],
          addRules: [
            {
              id: 1,
              action: {
                type: 'modifyHeaders',
                requestHeaders: [
                  { header: 'origin', operation: 'set', value: 'https://business.facebook.com' },
                  { header: 'referer', operation: 'set', value: 'https://business.facebook.com/' },
                ],
              },
              condition: {
                resourceTypes: ['xmlhttprequest', 'other'],
                urlFilter: '||business.facebook.com',
              },
            },
            {
              id: 2,
              action: {
                type: 'modifyHeaders',
                requestHeaders: [
                  { header: 'origin', operation: 'set', value: 'https://www.facebook.com' },
                  { header: 'referer', operation: 'set', value: 'https://www.facebook.com/' },
                ],
              },
              condition: {
                resourceTypes: ['xmlhttprequest', 'other'],
                urlFilter: '||upload.facebook.com',
              },
            },
          ],
        });
        const rules = await chrome.declarativeNetRequest.getDynamicRules().catch(() => []);
        return { ok: true, ruleCount: rules.length };
      } catch (err) {
        return { ok: false, ruleCount: 0, error: err?.message || String(err) };
      } finally {
        headerRulesPromise = null;
      }
    })();
  }
  return headerRulesPromise;
}

// Install DNR rules immediately on Service Worker startup (BroadTurbo parity)
ensureFacebookHeaderRules().catch(() => {});

// ==================== SERVICE WORKER FACEBOOK TRANSPORT ====================

function decodeJsonEscapedName(raw) {
  if (!raw) return '';
  try {
    return decodeURIComponent(JSON.parse(`"${raw}"`));
  } catch {
    try {
      return JSON.parse(`"${raw}"`);
    } catch {
      return String(raw);
    }
  }
}

function dataUrlToBlobInSw(dataUrl, fallbackType = 'image/jpeg') {
  const str = String(dataUrl || '');
  const commaIdx = str.indexOf(',');
  if (commaIdx === -1) return null;
  const header = str.slice(0, commaIdx);
  const b64 = str.slice(commaIdx + 1);
  const mimeMatch = header.match(/data:([^;]+);/i);
  const mime = mimeMatch ? mimeMatch[1] : fallbackType;
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bytes[i] = binStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

async function swGetFacebookSession() {
  const dnrStatus = await ensureFacebookHeaderRules();
  const cUserCookie = await chrome.cookies
    ?.get({ url: 'https://www.facebook.com', name: 'c_user' })
    .catch(() => null);
  const dnrRules = await chrome.declarativeNetRequest?.getDynamicRules().catch(() => []);

  const urls = [
    'https://business.facebook.com/latest/inbox',
    'https://www.facebook.com/profile',
    'https://business.facebook.com/creatorstudio/home',
  ];

  let reachable = false;
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      reachable = true;
      if (!res.ok) continue;
      const html = await res.text();
      const id =
        html.match(/"USER_ID":"(\d+)"/)?.[1] ||
        html.match(/"ACCOUNT_ID":"(\d+)"/)?.[1] ||
        html.match(/"actorID":"(\d+)"/)?.[1] ||
        html.match(/"c_user"\s*:\s*"(\d+)"/)?.[1];
      const fbDTSG =
        html.match(/"DTSGInitialData"[^}]*"token":"([^"]+)"/)?.[1] ||
        html.match(/DTSGInitData[^}]*"token":"([^"]+)"/)?.[1] ||
        html.match(/"dtsg":\{"token":"([^"]+)"/)?.[1] ||
        html.match(/name="fb_dtsg"\s+value="([^"]+)"/)?.[1];

      // Strictly reject USER_ID "0" (logged-out Facebook guest shell)
      if (id && id !== '0' && fbDTSG) {
        const jazoest =
          html.match(/jazoest=(\d+)/)?.[1] ||
          `2${[...fbDTSG].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)}`;
        const rawName = html.match(/"NAME":"((?:\\.|[^"])*)"/)?.[1];
        return {
          ok: true,
          sessionFacebookId: String(id),
          fbDTSG,
          jazoest,
          name: rawName ? decodeJsonEscapedName(rawName) : 'Facebook User',
          sourceUrl: url,
          hasCUserCookie: Boolean(cUserCookie?.value),
          cUserId: cUserCookie?.value || '',
          dnrRuleCount: Array.isArray(dnrRules) ? dnrRules.length : dnrStatus.ruleCount || 0,
        };
      }
    } catch {
      // try next url
    }
  }

  return {
    ok: false,
    errorCode: reachable ? 'FB-SESSION' : 'FB-NETWORK',
    error: reachable
      ? 'ยังไม่ได้ล็อกอิน Facebook หรือเซสชันหมดอายุ (กรุณาเปิด business.facebook.com ใน Chrome แล้วล็อกอินให้เรียบร้อย)'
      : 'ไม่สามารถเชื่อมต่อ facebook.com ได้ในขณะนี้',
    hasCUserCookie: Boolean(cUserCookie?.value),
    cUserId: cUserCookie?.value || '',
    dnrRuleCount: Array.isArray(dnrRules) ? dnrRules.length : dnrStatus.ruleCount || 0,
  };
}

async function swGraphqlBatch({ body } = {}) {
  await ensureFacebookHeaderRules();
  try {
    const res = await fetch('https://business.facebook.com/api/graphqlbatch/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: '*/*',
        'accept-language': 'en,th;q=0.9,ja;q=0.8',
        'cache-control': 'no-cache',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: String(body || ''),
      signal: AbortSignal.timeout(45000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    return { ok: false, status: 0, body: err?.message || String(err) };
  }
}

async function swMercurySend({ body } = {}) {
  await ensureFacebookHeaderRules();
  try {
    const res = await fetch('https://business.facebook.com/messaging/send/', {
      method: 'POST',
      credentials: 'include',
      headers: {
        accept: '*/*',
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: String(body || ''),
      signal: AbortSignal.timeout(60000),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (err) {
    return { ok: false, status: 0, body: err?.message || String(err) };
  }
}

async function swMercuryUploadImage({
  pageId,
  sessionFacebookId,
  fbDTSG,
  jazoest,
  dataUrl,
  fileName = 'promo.jpg',
} = {}) {
  await ensureFacebookHeaderRules();
  try {
    let blob = null;
    if (String(dataUrl || '').startsWith('data:')) {
      blob = dataUrlToBlobInSw(dataUrl);
    } else if (dataUrl) {
      const imgRes = await fetch(dataUrl);
      if (imgRes.ok) blob = await imgRes.blob();
    }
    if (!blob) {
      return { ok: false, status: 0, error: 'ไม่สามารถแปลงรูปภาพเพื่ออัปโหลดได้' };
    }

    const fd = new FormData();
    fd.append('upload_1024', blob, fileName || 'promo.jpg');

    const url =
      `https://upload.facebook.com/ajax/mercury/upload.php` +
      `?__user=${encodeURIComponent(String(sessionFacebookId || ''))}` +
      `&__a=1` +
      `&fb_dtsg=${encodeURIComponent(String(fbDTSG || ''))}` +
      `&jazoest=${encodeURIComponent(String(jazoest || ''))}` +
      `&request_user_id=${encodeURIComponent(String(pageId || ''))}`;

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: fd,
      signal: AbortSignal.timeout(60000),
    });
    const rawText = await res.text().catch(() => '');
    const clean = rawText.replace(/^for\s*\(;;\);\s*/, '');
    let parsed = null;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = null;
    }

    const meta = parsed?.payload?.metadata?.[0] || null;
    const attachmentId = meta?.image_id || meta?.fbid || meta?.attachment_id || '';
    if (res.ok && attachmentId) {
      return { ok: true, status: res.status, attachmentId: String(attachmentId), raw: parsed };
    }
    return {
      ok: false,
      status: res.status,
      error: parsed?.errorSummary || parsed?.errorDescription || `Mercury upload failed (${res.status})`,
      raw: parsed,
    };
  } catch (err) {
    return { ok: false, status: 0, error: err?.message || String(err) };
  }
}

async function swDetectPageFromInboxTab() {
  const tabs = await chrome.tabs.query({ url: 'https://business.facebook.com/*' }).catch(() => []);
  for (const tab of tabs) {
    if (!tab.url) continue;
    try {
      const u = new URL(tab.url);
      const aid = u.searchParams.get('asset_id') || u.searchParams.get('mailbox_id');
      if (aid && /^\d+$/.test(aid)) {
        return { ok: true, pageId: aid, tabId: tab.id, tabUrl: tab.url };
      }
    } catch {
      // ignore invalid URL
    }
  }
  return { ok: false, error: 'ไม่พบแท็บ Meta Business Suite ที่มี asset_id หรือ mailbox_id เปิดอยู่' };
}

// Expose transport directly inside the Service Worker so imported TurboDirect runs without loopback IPC
self.__OnePersonSwTransport = {
  TURBO_ENSURE_RULES: () => ensureFacebookHeaderRules(),
  TURBO_GET_SESSION: () => swGetFacebookSession(),
  TURBO_GRAPHQL_BATCH: (payload) => swGraphqlBatch(payload),
  TURBO_MERCURY_SEND: (payload) => swMercurySend(payload),
  TURBO_MERCURY_UPLOAD: (payload) => swMercuryUploadImage(payload),
  DETECT_PAGE_FROM_INBOX_TAB: () => swDetectPageFromInboxTab(),
};

// ==================== EXTENSION ACTION & LIFECYCLE ====================

chrome.action.onClicked.addListener(async () => {
  const dashboardUrl = chrome.runtime.getURL('dashboard.html');
  const existingTabs = await chrome.tabs.query({ url: dashboardUrl });

  if (existingTabs.length > 0 && existingTabs[0].id) {
    await chrome.tabs.update(existingTabs[0].id, { active: true });
    if (existingTabs[0].windowId) {
      await chrome.windows.update(existingTabs[0].windowId, { focused: true });
    }
  } else {
    await chrome.tabs.create({ url: dashboardUrl });
  }
});

async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureFacebookHeaderRules();
  await ensureAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureFacebookHeaderRules();
  await ensureAlarm();
});

async function notifyUser(title, message) {
  try {
    const iconUrl = chrome.runtime.getURL('icons/icon128.png');
    await chrome.notifications.create(`opceo_${Date.now()}`, {
      type: 'basic',
      iconUrl,
      title: String(title || 'OnePersonCEO Broadcaster'),
      message: String(message || ''),
    });
  } catch (err) {
    console.warn('Notification error:', err);
  }
}

async function acquireTickLock() {
  try {
    const { schedulerTickLock } = await chrome.storage.session.get('schedulerTickLock');
    const now = Date.now();
    if (schedulerTickLock && schedulerTickLock.running && now - schedulerTickLock.startedAt < 90000) {
      return false;
    }
    await chrome.storage.session.set({
      schedulerTickLock: { running: true, startedAt: now },
    });
    return true;
  } catch {
    return true;
  }
}

async function releaseTickLock() {
  try {
    await chrome.storage.session.set({
      schedulerTickLock: { running: false, startedAt: 0 },
    });
  } catch {
    // ignore
  }
}

function addErrorToBreakdown(campaign, errObj) {
  const code = String(errObj?.code || 'ERR');
  const label = errObj?.label || 'ส่งไม่สำเร็จ';
  if (!campaign.errorBreakdown) campaign.errorBreakdown = {};
  if (!campaign.errorBreakdown[code]) {
    campaign.errorBreakdown[code] = { code, label, count: 0 };
  }
  campaign.errorBreakdown[code].count += 1;
}

async function runScheduledDispatchTick({ force = false } = {}) {
  const gotLock = await acquireTickLock();
  if (!gotLock) {
    return { ok: true, skipped: 'locked' };
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.GRAPH_CONFIG,
      STORAGE_KEYS.SCHEDULER_ENABLED,
      STORAGE_KEYS.NOTIFY_ENABLED,
      STORAGE_KEYS.SENT_HISTORY,
    ]);

    const schedulerEnabled = stored[STORAGE_KEYS.SCHEDULER_ENABLED] !== false;
    const notifyEnabled = stored[STORAGE_KEYS.NOTIFY_ENABLED] !== false;
    const graphConfig = stored[STORAGE_KEYS.GRAPH_CONFIG] || {};
    const sentHistory = stored[STORAGE_KEYS.SENT_HISTORY] || {};

    if (!force && !schedulerEnabled) {
      return { ok: true, skipped: 'disabled' };
    }

    const nowMs = Date.now();
    const dueItems = await OnePersonDB.getDueScheduledItems(nowMs, 25);

    const campaignCache = new Map();
    const touchedCampaignIds = new Set();
    let historyDirty = false;

    for (const item of dueItems || []) {
      let campaign = campaignCache.get(item.campaignId);
      if (!campaign) {
        campaign = await OnePersonDB.getCampaign(item.campaignId);
        if (campaign) campaignCache.set(item.campaignId, campaign);
      }

      if (!campaign || campaign.status !== 'scheduled') {
        continue;
      }

      touchedCampaignIds.add(campaign.id);

      // Quiet Hours Guardrail in Asia/Bangkok
      const quiet = campaign.quietHours || { enabled: true, start: 22, end: 8, shiftTarget: 'morning', jitterMinutes: 12 };
      const currentBkkHour = OnePersonCDP.getBangkokHour(Date.now());
      if (quiet.enabled && OnePersonCDP.isHourInQuietWindow(currentBkkHour, quiet.start, quiet.end)) {
        const nextWin = OnePersonCDP.computeNextScheduledTime(currentBkkHour, {
          quietStart: quiet.start,
          quietEnd: quiet.end,
          shiftTarget: quiet.shiftTarget || 'morning',
          nowMs: Date.now(),
          jitterMinutes: quiet.jitterMinutes ?? 12,
          seedKey: item.contactId,
        });
        await OnePersonDB.updateQueueItem(item.id, {
          scheduledAt: nextWin.scheduledAt,
          effectiveHour: nextWin.effectiveHour,
          shiftedByQuietHours: true,
        });
        continue;
      }

      const isDomMode = campaign.messagingMode === 'INBOX_DOM';
      const isTurboMode = campaign.messagingMode === 'TURBO_DIRECT';
      const contact = await OnePersonDB.getContactById(item.contactId);

      const missingDirectId = isTurboMode
        ? !contact || (!contact.fbid && !contact.psid && !contact.name)
        : !isDomMode && (!contact || !contact.psid);

      if (!contact || (missingDirectId && !campaign.dryRun)) {
        await OnePersonDB.updateQueueItem(item.id, {
          status: 'failed',
          errorCode: 100,
          errorLabel: isTurboMode ? 'ไม่มี FBID/PSID/ชื่อ สำหรับส่งตรงแบบ BroadTurbo' : 'ไม่มี PSID สำหรับส่งผ่าน Meta Graph API',
          sentAt: Date.now(),
        });
        campaign.failedCount = (campaign.failedCount || 0) + 1;
        campaign.pendingCount = Math.max(0, (campaign.pendingCount || 0) - 1);
        addErrorToBreakdown(campaign, { code: 100, label: 'ไม่มี ID ผู้รับสำหรับส่งข้อความ' });
        failed += 1;
        processed += 1;
        continue;
      }

      const accessToken = graphConfig.accessToken || '';
      if (!isDomMode && !isTurboMode && !campaign.dryRun && !accessToken) {
        campaign.status = 'paused';
        await OnePersonDB.saveCampaign(campaign);
        if (notifyEnabled) {
          await notifyUser('พักตารางส่งอัตโนมัติ', 'ไม่พบ Page Access Token สำหรับส่งข้อความ กรุณาเชื่อมต่อ Token ใน Dashboard');
        }
        break;
      }

      const renderedText = OnePersonCDP.renderPersonalizedMessage(campaign.template, contact, {
        segmentOverrides: campaign.segmentOverrides || {},
        useSegmentOverrides: Boolean(campaign.useSegmentOverrides),
      });

      let res;
      if (isTurboMode) {
        res = await OnePersonTurboDirect.sendTurboDirect({
          pageId: campaign.pageId,
          fbid: contact.fbid || '',
          psid: contact.psid || '',
          name: contact.name || '',
          text: renderedText,
          imageUrl: campaign.imageUrl || '',
          domImages: campaign.domImages || [],
          sendOrder: campaign.sendOrder || 'image_first',
          pageAccessToken: accessToken,
          dryRun: Boolean(campaign.dryRun),
        });
        if (res?.resolvedFbid && res.resolvedFbid !== contact.fbid) {
          await OnePersonDB.updateContact(contact.id, { fbid: res.resolvedFbid });
          contact.fbid = res.resolvedFbid;
        }
      } else if (isDomMode) {
        if (campaign.dryRun) {
          res = { ok: true, messageId: `dry_dom_${Date.now()}` };
        } else {
          const inboxTab = await findInboxTab();
          if (!inboxTab || !inboxTab.id) {
            continue;
          }
          if (campaign.focusInbox && !inboxTab.active) {
            await chrome.tabs.update(inboxTab.id, { active: true });
            await sleep(200);
          }
          if (!(await ensureContentScript(inboxTab.id))) {
            continue;
          }
          try {
            const domRes = await chrome.tabs.sendMessage(inboxTab.id, {
              type: 'SEND_MESSAGE',
              payload: {
                name: contact.name,
                key: contact.id,
                psid: contact.psid || '',
                pageId: campaign.pageId || '',
                message: renderedText,
                sendOrder: campaign.sendOrder || 'image_first',
                autoSend: true,
                imagesDataUrls: campaign.domImages || [],
              },
            });
            res = domRes && domRes.ok
              ? { ok: true, messageId: 'dom_sent' }
              : { ok: false, error: { code: 901, label: domRes?.error || 'ส่งผ่านแท็บ Inbox ไม่สำเร็จ' } };
          } catch (err) {
            res = { ok: false, error: { code: 901, label: err instanceof Error ? err.message : String(err) } };
          }
        }
      } else {
        res = await OnePersonGraphAPI.sendDirectMessage({
          pageId: campaign.pageId,
          accessToken,
          psid: contact.psid,
          text: renderedText,
          imageUrl: campaign.imageUrl || '',
          cachedAttachmentId: campaign.cachedAttachmentId || '',
          attachmentIds: campaign.attachmentIds || [],
          sendOrder: campaign.sendOrder || 'image_first',
          messagingMode: campaign.messagingMode || 'RESPONSE',
          messageTag: campaign.messageTag || 'ACCOUNT_UPDATE',
          notificationToken: contact.marketingOptInToken || '',
          within24h: Boolean(contact.within24h),
          dryRun: Boolean(campaign.dryRun),
        });
      }

      if (res.attachmentId && !campaign.cachedAttachmentId) {
        campaign.cachedAttachmentId = res.attachmentId;
      }

      processed += 1;

      if (res.ok) {
        sent += 1;
        const ts = Date.now();
        await OnePersonDB.updateQueueItem(item.id, {
          status: 'sent',
          sentAt: ts,
          messageId: res.messageId || '',
          renderedPreview: renderedText.slice(0, 140),
        });
        await OnePersonDB.updateContact(contact.id, { lastSentAt: ts });
        const normName = String(contact.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
        if (contact.fbid) sentHistory[contact.fbid] = ts;
        if (contact.psid) sentHistory[contact.psid] = ts;
        sentHistory[contact.id] = ts;
        if (normName) sentHistory[normName] = ts;
        historyDirty = true;

        campaign.sentCount = (campaign.sentCount || 0) + 1;
        campaign.pendingCount = Math.max(0, (campaign.pendingCount || 0) - 1);
      } else {
        failed += 1;
        const errInfo = res.error || { code: 0, label: 'ส่งไม่สำเร็จ' };
        await OnePersonDB.updateQueueItem(item.id, {
          status: 'failed',
          errorCode: errInfo.code || 0,
          errorLabel: errInfo.label || 'ส่งไม่สำเร็จ',
          sentAt: Date.now(),
        });
        campaign.failedCount = (campaign.failedCount || 0) + 1;
        campaign.pendingCount = Math.max(0, (campaign.pendingCount || 0) - 1);
        addErrorToBreakdown(campaign, errInfo);

        if (errInfo.fatalAuth) {
          campaign.status = 'paused';
          await OnePersonDB.saveCampaign(campaign);
          if (notifyEnabled) {
            await notifyUser('หยุดตารางส่งชั่วคราว', errInfo.label);
          }
          break;
        }
      }

      await OnePersonDB.saveCampaign(campaign);

      if ((res.usagePct || 0) >= 80) {
        break;
      }

      const delayMs = isTurboMode
        ? Math.max(300, Math.min(2000, Number(campaign.delayMs) || 350))
        : Math.max(50, Math.min(1500, Number(campaign.delayMs) || 120));
      await sleep(delayMs);
    }

    // Process due RFM/RSV Multi-Step Workflow Enrollments
    const dueEnrollments = await OnePersonDB.getDueWorkflowEnrollments(Date.now(), 20).catch(() => []);
    if (dueEnrollments.length > 0) {
      const workflowsList = await OnePersonDB.listWorkflows().catch(() => []);
      const wfMap = new Map(workflowsList.map((w) => [w.id, w]));

      for (const enr of dueEnrollments) {
        const wf = wfMap.get(enr.workflowId);
        if (!wf || !wf.isActive) continue;

        const contact = await OnePersonDB.getContactById(enr.contactId);
        if (!contact) {
          await OnePersonDB.updateEnrollment(enr.id, { status: 'failed', lastError: 'ไม่พบรายชื่อใน CDP' });
          continue;
        }

        // Stop-on-Convert guardrail
        if (wf.stopOnConvert && wf.trackType === 'lead_magnet' && Number(contact.orderCount || 0) > 0) {
          await OnePersonDB.updateEnrollment(enr.id, {
            status: 'converted',
            nextRunAt: null,
            nextStepOrder: null,
          });
          continue;
        }

        // Quiet Hours guardrail (22:00 - 07:59 Asia/Bangkok)
        const bkkHour = OnePersonCDP.getBangkokHour(Date.now());
        if (!force && wf.respectQuietHours !== false && OnePersonCDP.isHourInQuietWindow(bkkHour, 22, 8)) {
          const shifted = OnePersonCDP.computeNextScheduledTime(bkkHour, {
            quietStart: 22,
            quietEnd: 8,
            shiftTarget: 'morning',
            nowMs: Date.now(),
            jitterMinutes: 12,
            seedKey: enr.id,
          });
          await OnePersonDB.updateEnrollment(enr.id, { nextRunAt: shifted.scheduledAt });
          continue;
        }

        const steps = Array.isArray(wf.steps) ? [...wf.steps].sort((a, b) => a.stepOrder - b.stepOrder) : [];
        const step = steps.find((s) => Number(s.stepOrder) === Number(enr.nextStepOrder));
        if (!step) {
          await OnePersonDB.updateEnrollment(enr.id, {
            status: 'completed',
            nextRunAt: null,
            nextStepOrder: null,
          });
          continue;
        }

        // Zero-duplicate check per enrollment step
        const sentSteps = Array.isArray(enr.sentSteps) ? [...enr.sentSteps] : [];
        if (!sentSteps.includes(step.stepOrder)) {
          const filterMismatch =
            (step.rsvFilter && step.rsvFilter !== 'ANY' && step.rsvFilter !== contact.rsvStage) ||
            (step.rfmFilter && step.rfmFilter !== 'ANY' && step.rfmFilter !== contact.rfmSegment);

          if (!filterMismatch) {
            const rendered = OnePersonCDP.renderWorkflowMessage(step.message, contact, {
              sourceBook: enr.sourceBook || contact.sourceBook,
            });
            let wfRes;
            if (enr.deliveryMode === 'RESPONSE') {
              wfRes = await OnePersonGraphAPI.sendDirectMessage({
                pageId: enr.pageId || graphConfig.pageId,
                accessToken: graphConfig.accessToken || '',
                psid: contact.psid,
                text: rendered,
                messagingMode: 'RESPONSE',
                within24h: Boolean(contact.within24h),
                dryRun: Boolean(enr.dryRun),
              });
            } else {
              wfRes = await OnePersonTurboDirect.sendTurboDirect({
                pageId: enr.pageId || graphConfig.pageId,
                fbid: contact.fbid || '',
                psid: contact.psid || '',
                name: contact.name || '',
                text: rendered,
                pageAccessToken: graphConfig.accessToken || '',
                dryRun: Boolean(enr.dryRun),
              });
            }

            processed += 1;
            if (wfRes?.ok) {
              sent += 1;
              sentSteps.push(step.stepOrder);
              await OnePersonDB.updateContact(contact.id, { lastSentAt: Date.now() });
            } else {
              failed += 1;
              await OnePersonDB.updateEnrollment(enr.id, {
                lastError: wfRes?.error?.label || 'ส่งไม่สำเร็จ',
              });
            }
          }
        }

        const nextStep = steps.find((s) => Number(s.stepOrder) > Number(step.stepOrder));
        if (nextStep) {
          const deltaDays = Math.max(0, (Number(nextStep.delayDays) || 0) - (Number(step.delayDays) || 0));
          const deltaHours = Math.max(0, Number(nextStep.delayHours) || 0);
          const baseFutureMs = Date.now() + (deltaDays * 24 + deltaHours) * 3600 * 1000;
          const nextSched = OnePersonCDP.computeNextScheduledTime(contact.preferredHour ?? 20, {
            quietStart: 22,
            quietEnd: 8,
            shiftTarget: 'morning',
            nowMs: Math.max(Date.now() + 60000, baseFutureMs - 12 * 3600 * 1000),
            jitterMinutes: 12,
            seedKey: `${enr.id}_${nextStep.stepOrder}`,
          });
          await OnePersonDB.updateEnrollment(enr.id, {
            currentStepOrder: step.stepOrder,
            nextStepOrder: nextStep.stepOrder,
            nextRunAt: Math.max(baseFutureMs, nextSched.scheduledAt),
            sentSteps,
          });
        } else {
          await OnePersonDB.updateEnrollment(enr.id, {
            currentStepOrder: step.stepOrder,
            nextStepOrder: null,
            nextRunAt: null,
            status: 'completed',
            sentSteps,
          });
        }
      }
    }

    if (historyDirty) {
      await chrome.storage.local.set({ [STORAGE_KEYS.SENT_HISTORY]: sentHistory });
    }

    for (const cid of touchedCampaignIds) {
      const camp = campaignCache.get(cid);
      if (!camp || camp.status !== 'scheduled') continue;
      const items = await OnePersonDB.getQueueItemsByCampaign(cid);
      const remaining = items.filter((it) => it.status === 'scheduled' || it.status === 'pending').length;
      camp.pendingCount = remaining;
      if (remaining === 0) {
        camp.status = 'completed';
        camp.completedAt = Date.now();
        await OnePersonDB.saveCampaign(camp);
        if (notifyEnabled) {
          await notifyUser(
            `ส่งแคมเปญ "${camp.title}" ครบแล้ว!`,
            `ส่งสำเร็จ ${camp.sentCount || 0} คน • ไม่สำเร็จ ${camp.failedCount || 0} คน`
          );
        }
      } else {
        await OnePersonDB.saveCampaign(camp);
      }
    }

    try {
      await chrome.runtime.sendMessage({
        type: 'SCHEDULER_TICK_DONE',
        processed,
        sent,
        failed,
      });
    } catch {
      // Dashboard tab may be closed — safe to ignore
    }

    return { ok: true, processed, sent, failed };
  } finally {
    await releaseTickLock();
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm && alarm.name === ALARM_NAME) {
    await runScheduledDispatchTick();
  }
});

// ==================== LEGACY META BUSINESS SUITE INBOX BRIDGE ====================

async function findInboxTab() {
  const tabs = await chrome.tabs.query({ url: 'https://business.facebook.com/*' });
  if (tabs.length === 0) return null;

  const inboxTab = tabs.find((t) => t.url && t.url.includes('/inbox'));
  return inboxTab || tabs[0];
}

async function ensureContentScript(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    if (ping && ping.ok && ping.version === EXPECTED_CONTENT_VERSION) return true;
  } catch {
    // Inject content script if not yet loaded
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
    });
    return true;
  } catch (err) {
    console.error('Failed to inject content script:', err);
    return false;
  }
}

async function executeMainWorldClick(tabId) {
  if (!tabId) return { ok: false, error: 'Missing tabId' };
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => {
      const target = document.querySelector('[data-opceo-click-target="1"]');
      if (!target) return false;
      target.removeAttribute('data-opceo-click-target');

      const rect = target.getBoundingClientRect();
      const clientX = Math.round(Math.max(48, Math.min(rect.left + Math.max(20, rect.width / 2), 340)));
      const clientY = Math.round(rect.top + rect.height / 2);
      const opts = { bubbles: true, cancelable: true, view: window, clientX, clientY };

      target.focus?.();
      if (typeof window.PointerEvent === 'function') {
        target.dispatchEvent(new PointerEvent('pointerover', opts));
        target.dispatchEvent(new PointerEvent('pointerdown', opts));
        target.dispatchEvent(new PointerEvent('pointerup', opts));
      }
      target.dispatchEvent(new MouseEvent('mouseover', opts));
      target.dispatchEvent(new MouseEvent('mousedown', opts));
      target.dispatchEvent(new MouseEvent('mouseup', opts));
      target.dispatchEvent(new MouseEvent('click', opts));
      if (typeof target.click === 'function') target.click();

      const invokeReactHandlers = (node) => {
        if (!node) return;
        const fiberKey = Object.keys(node).find((k) => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$'));
        if (!fiberKey) return;
        const props = node[fiberKey];
        const synth = { preventDefault: () => {}, stopPropagation: () => {}, target: node, currentTarget: node };
        if (typeof props?.onMouseDown === 'function') props.onMouseDown(synth);
        if (typeof props?.onPointerDown === 'function') props.onPointerDown(synth);
        if (typeof props?.onClick === 'function') props.onClick(synth);
      };

      invokeReactHandlers(target);
      const interactiveParent = target.closest('a, [role="option"], [role="row"], [role="button"], [role="listitem"]');
      if (interactiveParent && interactiveParent !== target) {
        invokeReactHandlers(interactiveParent);
      }
      return true;
    },
  });
  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Direct BroadTurbo-compatible transport event
  if (message && message.type === 'facebook:send-message' && typeof message.body === 'string') {
    swMercurySend({ body: message.body })
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, status: 0, body: err?.message || String(err) }));
    return true;
  }

  if (!message || message.target !== 'background') {
    return false;
  }

  (async () => {
    try {
      // BroadTurbo Service Worker Transport Actions
      if (message.action === 'TURBO_ENSURE_RULES') {
        sendResponse(await ensureFacebookHeaderRules());
        return;
      }
      if (message.action === 'TURBO_GET_SESSION') {
        sendResponse(await swGetFacebookSession());
        return;
      }
      if (message.action === 'TURBO_GRAPHQL_BATCH') {
        sendResponse(await swGraphqlBatch(message.payload || {}));
        return;
      }
      if (message.action === 'TURBO_MERCURY_SEND') {
        sendResponse(await swMercurySend(message.payload || {}));
        return;
      }
      if (message.action === 'TURBO_MERCURY_UPLOAD') {
        sendResponse(await swMercuryUploadImage(message.payload || {}));
        return;
      }
      if (message.action === 'DETECT_PAGE_FROM_INBOX_TAB') {
        sendResponse(await swDetectPageFromInboxTab());
        return;
      }
      if (message.action === 'MAIN_WORLD_CLICK') {
        const tabId = sender?.tab?.id;
        sendResponse(await executeMainWorldClick(tabId));
        return;
      }

      if (message.action === 'NOTIFY') {
        await notifyUser(message.payload?.title, message.payload?.message);
        sendResponse({ ok: true });
        return;
      }

      if (message.action === 'SET_SCHEDULER_ALARM') {
        const enabled = Boolean(message.payload?.enabled);
        await chrome.storage.local.set({ [STORAGE_KEYS.SCHEDULER_ENABLED]: enabled });
        if (enabled) {
          await ensureAlarm();
        }
        sendResponse({ ok: true, enabled });
        return;
      }

      if (message.action === 'RUN_SCHEDULER_TICK') {
        await ensureAlarm();
        const result = await runScheduledDispatchTick({ force: Boolean(message.payload?.force) });
        sendResponse(result);
        return;
      }

      if (message.action === 'OPEN_INBOX') {
        const reqPageId = message.payload?.pageId ? String(message.payload.pageId) : '';
        const focus = message.payload?.focus !== false;
        const targetUrl =
          reqPageId && !reqPageId.startsWith('demo_') && !reqPageId.startsWith('c360_') && !reqPageId.startsWith('inbox_')
            ? `https://business.facebook.com/latest/inbox/all?asset_id=${encodeURIComponent(reqPageId)}`
            : 'https://business.facebook.com/latest/inbox/messenger';

        const existing = await findInboxTab();
        if (existing && existing.id) {
          const needsNavigate =
            !existing.url?.includes('/inbox') ||
            (reqPageId && targetUrl.includes('asset_id=') && !existing.url?.includes(reqPageId));
          const updateProps = needsNavigate ? { url: targetUrl, active: focus } : { active: focus };
          await chrome.tabs.update(existing.id, updateProps);
          sendResponse({ ok: true, tabId: existing.id, url: needsNavigate ? targetUrl : existing.url });
        } else {
          const created = await chrome.tabs.create({
            url: targetUrl,
            active: focus,
          });
          sendResponse({ ok: true, tabId: created.id, url: created.url });
        }
        return;
      }

      const inboxTab = await findInboxTab();
      if (!inboxTab || !inboxTab.id) {
        sendResponse({
          ok: false,
          error: 'ไม่พบแท็บ Meta Business Suite Inbox กรุณากดปุ่ม "เปิด Meta Business Suite" แล้วเลือกเพจ One Person Ceo ก่อนครับ',
        });
        return;
      }

      if (message.action === 'SEND_MESSAGE' && message.payload?.focusInbox) {
        await chrome.tabs.update(inboxTab.id, { active: true });
        if (inboxTab.windowId) {
          await chrome.windows.update(inboxTab.windowId, { focused: true }).catch(() => {});
        }
        await sleep(200);
      }

      const injected = await ensureContentScript(inboxTab.id);
      if (!injected) {
        sendResponse({
          ok: false,
          error: 'ไม่สามารถเชื่อมต่อกับแท็บ Meta Business Suite ได้ กรุณารีเฟรชแท็บ Inbox แล้วลองใหม่ครับ',
        });
        return;
      }

      const response = await chrome.tabs.sendMessage(inboxTab.id, {
        type: message.action,
        payload: message.payload || {},
      });

      sendResponse({
        ok: true,
        tabId: inboxTab.id,
        tabUrl: inboxTab.url,
        data: response,
      });
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();

  return true;
});
