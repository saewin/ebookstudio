// OnePersonCEO Smart Broadcaster v2.2 — BroadTurbo v4.8.9 Protocol Parity Engine
// Implements exact BroadTurbo wire protocol via MV3 Service Worker transport:
// 1. Session extraction (rejects USER_ID "0")
// 2. GraphQL Batch Threadlist Fetcher (`doc_id: 5682686628443962`) returning real `messaging_actor.id` (fbid)
// 3. Auto-resolution of legacy Graph-API PSID / name-only contacts to real `fbid`
// 4. Separate sequential Mercury POSTs per image and per text block (`business.facebook.com/messaging/send/`)
// 5. Image attachment upload via Graph API (`is_reusable: false`) or Mercury cookie fallback

(function (global) {
  'use strict';

  const GRAPHQL_DOC_ID = '5682686628443962';
  const GRAPHQL_BATCH_NAME = 'MessengerGraphQLThreadlistFetcher';
  const GRAPH_API_BASE = 'https://graph.facebook.com/v25.0';
  const SESSION_TTL_MS = 10 * 60 * 1000;
  const LOOKUP_TTL_MS = 10 * 60 * 1000;
  const SW_SEND_TIMEOUT_MS = 70000;

  let cachedSession = null;
  let cachedSessionAt = 0;
  let testTransportHook = null;
  const pageLookupCache = new Map(); // pageId -> { fetchedAt, byFbid: Map, byNormName: Map }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalizeCompareName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/^(คุณ|khun)\s*/i, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isValidNumericId(val) {
    return typeof val === 'string' || typeof val === 'number'
      ? /^\d{4,}$/.test(String(val).trim())
      : false;
  }

  function _setTransportForTest(fn) {
    testTransportHook = typeof fn === 'function' ? fn : null;
  }

  function invalidateSessionCache() {
    cachedSession = null;
    cachedSessionAt = 0;
  }

  async function callSw(action, payload = {}) {
    if (testTransportHook) {
      return testTransportHook(action, payload);
    }

    if (typeof self !== 'undefined' && self.__OnePersonSwTransport && typeof self.__OnePersonSwTransport[action] === 'function') {
      return self.__OnePersonSwTransport[action](payload);
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      let timer;
      try {
        return await Promise.race([
          new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ target: 'background', action, payload }, (res) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(res);
              }
            });
          }),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Service Worker transport timed out (70s)')), SW_SEND_TIMEOUT_MS);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error(`No Service Worker transport available for ${action}`);
  }

  async function ensureFacebookHeaderRules() {
    return callSw('TURBO_ENSURE_RULES', {});
  }

  async function getFacebookBrowserSession(forceRefresh = false) {
    if (!forceRefresh && cachedSession && cachedSession.fbDTSG && cachedSession.sessionFacebookId && cachedSession.sessionFacebookId !== '0') {
      if (Date.now() - cachedSessionAt < SESSION_TTL_MS) {
        return cachedSession;
      }
    }

    const res = await callSw('TURBO_GET_SESSION', { forceRefresh });
    if (res && res.ok && res.sessionFacebookId && res.sessionFacebookId !== '0' && res.fbDTSG) {
      cachedSession = {
        sessionFacebookId: String(res.sessionFacebookId),
        fbDTSG: String(res.fbDTSG),
        jazoest: String(res.jazoest || ''),
        name: res.name || 'Facebook User',
        hasCUserCookie: Boolean(res.hasCUserCookie),
        cUserId: res.cUserId || '',
        dnrRuleCount: Number(res.dnrRuleCount || 0),
        sourceUrl: res.sourceUrl || '',
      };
      cachedSessionAt = Date.now();
      return cachedSession;
    }

    invalidateSessionCache();
    return null;
  }

  // ==================== GRAPHQL THREADLIST PARSER & FETCHER ====================

  function buildGraphqlBatchBody({ fbDTSG, pageId, inbox = 'INBOX', before = Date.now(), limit = 100 }) {
    const queryObj = {
      o0: {
        doc_id: GRAPHQL_DOC_ID,
        query_params: {
          limit: Number(limit) || 100,
          before: Number(before) || Date.now(),
          tags: [inbox],
          isWorkUser: false,
          includeDeliveryReceipts: true,
          includeSeqID: false,
          is_work_teamwork_not_putting_muted_in_unreads: false,
          threadlistViewFieldsOnly: false,
          source: 'mercury',
        },
      },
    };
    return new URLSearchParams({
      batch_name: GRAPHQL_BATCH_NAME,
      fb_dtsg: String(fbDTSG || ''),
      av: String(pageId || ''),
      queries: JSON.stringify(queryObj),
    }).toString();
  }

  function parseGraphqlBatchResponse(rawText, limit = 100) {
    const text = String(rawText || '');
    if (!text.trim()) {
      return { ok: false, errorCode: 'FB-AUDIENCE-EMPTY', error: 'Facebook คืนค่าว่างจาก GraphQL Inbox' };
    }

    let parsed = null;
    try {
      const clean = text.replace(/\{"successful.*/s, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      return {
        ok: false,
        errorCode: 'FB-AUDIENCE-PARSE',
        error: 'Facebook คืนรูปแบบข้อมูลที่ไม่ใช่ JSON จาก Inbox (อาจยังไม่ล็อกอินหรือไม่มีสิทธิ์เพจนี้)',
      };
    }

    const viewer = parsed?.o0?.data?.viewer;
    const nodes = viewer?.message_threads?.nodes;
    if (!Array.isArray(nodes)) {
      const gqlErr = parsed?.o0?.errors?.[0]?.message || parsed?.errorSummary || '';
      return {
        ok: false,
        errorCode: 'FB-AUDIENCE-PARSE',
        error: gqlErr ? `Facebook GraphQL error: ${gqlErr}` : 'ไม่พบข้อมูล message_threads จาก Facebook Inbox',
      };
    }

    const contacts = [];
    for (const n of nodes) {
      const edges = n?.all_participants?.edges || [];
      const userEdge = edges.find((e) => e?.node?.messaging_actor?.__typename === 'User');
      const actor = userEdge?.node?.messaging_actor;
      if (!actor || !actor.id) continue;

      const customLabels =
        n.related_page_thread?.custom_thread_labels?.nodes?.map((l) => ({
          id: l.id,
          name: l.name,
          color: l.label_color ? String(l.label_color).slice(2) : '',
          source: l.label_source || '',
        })) || [];
      const corpLabels =
        n.related_page_thread?.corp_thread_labels?.nodes?.map((l) => ({
          id: l.id,
          name: l.name,
          color: l.label_color ? String(l.label_color).slice(2) : '',
          source: l.label_source || '',
        })) || [];

      const dedupLabels = [...new Map([...corpLabels, ...customLabels].map((l) => [l.id, l])).values()].filter(
        (l) => !['ad_id', 'messenger_ads'].some((kw) => String(l.name || '').toLowerCase().includes(kw))
      );

      const ts = Number(n.updated_time_precise);
      contacts.push({
        fbid: String(actor.id),
        name: actor.name || `ลูกค้า ${String(actor.id).slice(-4)}`,
        gender: actor.gender || '',
        lastInteractionAt: Number.isFinite(ts) && ts > 0 ? ts : Date.now(),
        labels: dedupLabels,
        tags: dedupLabels.map((l) => l.name).filter(Boolean),
        source: 'broadturbo_graphql',
      });
    }

    const lastNode = nodes[nodes.length - 1];
    const nextCursor =
      nodes.length >= (Number(limit) || 100) && lastNode?.updated_time_precise
        ? Number(lastNode.updated_time_precise) - 100
        : null;

    return {
      ok: true,
      contacts,
      rawNodeCount: nodes.length,
      nextCursor: Number.isFinite(nextCursor) ? nextCursor : null,
    };
  }

  async function fetchTurboAudiencePage({ pageId, inbox = 'INBOX', before = Date.now(), limit = 100, fbDTSG }) {
    const retryDelays = [1200, 3000];
    let currentDtsg = fbDTSG;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      const body = buildGraphqlBatchBody({ fbDTSG: currentDtsg, pageId, inbox, before, limit });
      const swRes = await callSw('TURBO_GRAPHQL_BATCH', { body });

      if (swRes && swRes.ok) {
        const parsed = parseGraphqlBatchResponse(swRes.body, limit);
        if (parsed.ok) {
          return parsed;
        }
        // If response couldn't parse (e.g. stale fb_dtsg), refresh session ONCE and retry
        if (attempt === 0) {
          const fresh = await getFacebookBrowserSession(true);
          if (fresh && fresh.fbDTSG && fresh.fbDTSG !== currentDtsg) {
            currentDtsg = fresh.fbDTSG;
            continue;
          }
        }
        return parsed;
      }

      if (attempt < retryDelays.length) {
        await sleep(retryDelays[attempt]);
        continue;
      }

      return {
        ok: false,
        errorCode: 'FB-AUDIENCE-NET',
        error: `ดึงรายชื่อจาก Facebook Inbox ไม่สำเร็จ (HTTP ${swRes?.status || 0}: ${String(swRes?.body || '').slice(0, 120)})`,
      };
    }

    return { ok: false, errorCode: 'FB-AUDIENCE-NET', error: 'ดึงรายชื่อจาก Facebook Inbox ไม่สำเร็จ' };
  }

  function updateLookupCacheFromContacts(pageId, contacts) {
    const pid = String(pageId);
    let entry = pageLookupCache.get(pid);
    if (!entry) {
      entry = { fetchedAt: Date.now(), byFbid: new Map(), byNormName: new Map() };
      pageLookupCache.set(pid, entry);
    }
    entry.fetchedAt = Date.now();
    for (const c of contacts) {
      if (!c || !c.fbid) continue;
      entry.byFbid.set(String(c.fbid), c);
      const norm = normalizeCompareName(c.name);
      if (norm && !entry.byNormName.has(norm)) {
        entry.byNormName.set(norm, c);
      }
    }
  }

  async function syncAllTurboAudiences({
    pageId,
    maxTarget = 20000,
    inboxes = ['INBOX', 'ARCHIVED'],
    paceMs = 450,
    onProgress = null,
    shouldStop = null,
  }) {
    if (!isValidNumericId(pageId)) {
      return {
        ok: false,
        error: { code: 400, label: 'กรุณาระบุ Page ID ที่ถูกต้อง (ตัวเลขเท่านั้น เช่น 561475983873000)' },
      };
    }

    const session = await getFacebookBrowserSession(false);
    if (!session || !session.fbDTSG) {
      return {
        ok: false,
        error: {
          code: 401,
          fatalAuth: true,
          label: 'ยังไม่ได้ล็อกอิน Facebook ใน Chrome หรือเซสชันหมดอายุ (กรุณาเปิด business.facebook.com แล้วรีเฟรช 1 ครั้ง)',
        },
      };
    }

    const byFbid = new Map();
    const batchLimit = 100;
    let batchNum = 0;

    for (const folder of inboxes) {
      let beforeCursor = Date.now();
      while (beforeCursor !== null && byFbid.size < maxTarget) {
        if (shouldStop && shouldStop()) {
          break;
        }
        batchNum += 1;
        const pageRes = await fetchTurboAudiencePage({
          pageId: String(pageId),
          inbox: folder,
          before: beforeCursor,
          limit: batchLimit,
          fbDTSG: session.fbDTSG,
        });

        if (!pageRes.ok) {
          if (byFbid.size > 0) {
            // Return partial contacts cleanly so user never loses already-collected audience
            const partialList = Array.from(byFbid.values());
            updateLookupCacheFromContacts(pageId, partialList);
            return {
              ok: true,
              partial: true,
              warning: pageRes.error,
              contacts: partialList,
              session,
            };
          }
          return {
            ok: false,
            error: { code: pageRes.errorCode || 500, label: pageRes.error || 'ดึงรายชื่อจาก Inbox ไม่สำเร็จ' },
          };
        }

        const freshBatch = [];
        for (const c of pageRes.contacts) {
          if (!c.fbid || byFbid.has(c.fbid)) continue;
          byFbid.set(c.fbid, c);
          freshBatch.push(c);
          if (byFbid.size >= maxTarget) break;
        }

        if (typeof onProgress === 'function') {
          await onProgress({
            folder,
            batchNum,
            totalCollected: byFbid.size,
            batchContacts: freshBatch,
            nextCursor: pageRes.nextCursor,
          });
        }

        if (byFbid.size >= maxTarget || (shouldStop && shouldStop())) {
          break;
        }

        beforeCursor = pageRes.nextCursor;
        if (beforeCursor !== null && paceMs > 0) {
          await sleep(paceMs);
        }
      }
      if (byFbid.size >= maxTarget || (shouldStop && shouldStop())) {
        break;
      }
    }

    const contacts = Array.from(byFbid.values());
    updateLookupCacheFromContacts(pageId, contacts);
    return { ok: true, contacts, session };
  }

  async function resolveAudienceId({ pageId, fbid = '', psid = '', name = '' }) {
    if (isValidNumericId(fbid)) {
      return { ok: true, audienceId: String(fbid).trim(), resolvedFromGraphQL: false };
    }

    const pid = String(pageId || '');
    let cache = pageLookupCache.get(pid);
    if (!cache || Date.now() - cache.fetchedAt > LOOKUP_TTL_MS || cache.byFbid.size === 0) {
      const syncRes = await syncAllTurboAudiences({
        pageId: pid,
        maxTarget: 3000,
        inboxes: ['INBOX', 'ARCHIVED'],
        paceMs: 200,
      });
      if (!syncRes.ok) {
        return { ok: false, error: syncRes.error };
      }
      cache = pageLookupCache.get(pid);
    }

    if (cache) {
      if (psid && cache.byFbid.has(String(psid).trim())) {
        return { ok: true, audienceId: String(psid).trim(), resolvedFromGraphQL: true };
      }
      const norm = normalizeCompareName(name);
      if (norm && cache.byNormName.has(norm)) {
        return { ok: true, audienceId: String(cache.byNormName.get(norm).fbid), resolvedFromGraphQL: true };
      }
    }

    return {
      ok: false,
      error: {
        code: 404,
        label: 'ไม่พบ FBID ของลูกเพจนี้ในกล่องข้อความเพจ (กรุณากด "🚀 ซิงค์แชทสดแบบ BroadTurbo" ในแท็บ 1 เพื่ออัปเดตฐานข้อมูล)',
      },
    };
  }

  // ==================== MERCURY FORM BUILDER & PARSER ====================

  function generateMercuryMessageId() {
    const rand = Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, '0');
    return `${Date.now()}${rand}`;
  }

  function buildMercuryFormBody({
    audienceId,
    sessionFacebookId,
    pageId,
    message = null,
    attachmentId = null,
    fbDTSG,
    jazoest,
    msgId = generateMercuryMessageId(),
  }) {
    const params = new URLSearchParams();
    params.append('client', 'mercury');
    params.append('action_type', 'ma-type:user-generated-message');
    params.append('ephemeral_ttl_mode', '0');
    params.append('has_attachment', attachmentId ? 'true' : 'false');
    if (attachmentId) {
      params.append('image_ids[0]', String(attachmentId));
    }
    params.append('message_id', String(msgId));
    params.append('offline_threading_id', String(msgId));
    params.append('other_user_fbid', String(audienceId));
    params.append('source', 'source:page_unified_inbox');
    params.append('specific_to_list[0]', `fbid:${audienceId}`);
    params.append('specific_to_list[1]', `fbid:${pageId}`);
    params.append('timestamp', Date.now().toString());
    params.append('request_user_id', String(pageId));
    params.append('__a', '1');
    params.append('__user', String(sessionFacebookId));
    params.append('fb_dtsg', String(fbDTSG));
    params.append('jazoest', String(jazoest || ''));
    // BroadTurbo sends image and text in SEPARATE sequential POSTs (never body together with image_ids[0])
    if (message && !attachmentId) {
      params.append('body', String(message));
    }
    return { params, msgId };
  }

  function stripHtmlTags(html) {
    return String(html || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractMercuryErrorDesc(json) {
    if (!json || !json.errorDescription) return null;
    if (typeof json.errorDescription === 'string') {
      return json.errorSummary ? `${json.errorDescription} | ${json.errorSummary}` : json.errorDescription;
    }
    if (typeof json.errorDescription === 'object' && json.errorDescription.__html) {
      return stripHtmlTags(json.errorDescription.__html) || 'Facebook rejected request';
    }
    return json.errorSummary || 'Facebook rejected request';
  }

  function mapMercuryError(errCode, detailText) {
    const code = Number(errCode) || 0;
    const shortDetail = String(detailText || '').slice(0, 200);

    if (code === 1357001) {
      return {
        code,
        fatalAuth: true,
        retryableSession: false,
        label: `เซสชัน Facebook หมดอายุ กรุณาเข้าสู่ระบบ facebook.com ใหม่ (${shortDetail})`,
      };
    }
    if (code === 1357004 || code === 1357032) {
      return {
        code,
        fatalAuth: false,
        retryableSession: true,
        label: `โทเคนเซสชัน Facebook (fb_dtsg) หมดอายุ (${shortDetail})`,
      };
    }
    if (code === 1404078 || code === 1404132) {
      return {
        code,
        fatalAuth: true,
        retryableSession: false,
        label: `Facebook จำกัดการส่งข้อความของบัญชีนี้ชั่วคราว — กรุณาพักการส่ง (${shortDetail})`,
      };
    }
    if (code === 1545041 || code === 551) {
      return {
        code,
        fatalAuth: false,
        retryableSession: false,
        label: `ลูกค้าปิดบัญชี Facebook หรือบล็อกการรับข้อความจากเพจ (Error ${code})`,
      };
    }
    return {
      code: code || 903,
      fatalAuth: false,
      retryableSession: false,
      label: shortDetail || `Facebook ปฏิเสธการส่ง (Error ${code || 'UNKNOWN'})`,
    };
  }

  function parseMercuryResponse(httpOk, httpStatus, rawBody) {
    if (!httpOk) {
      return {
        json: null,
        delivered: false,
        sent: false,
        error: `Facebook message request failed (HTTP ${httpStatus})`,
        mappedError: { code: httpStatus || 904, fatalAuth: false, retryableSession: false, label: `HTTP ${httpStatus}: ${String(rawBody || '').slice(0, 120)}` },
      };
    }

    let json = null;
    try {
      json = JSON.parse(String(rawBody || '').replace(/^for\s*\(;;\);\s*/, ''));
    } catch {
      json = null;
    }

    if (!json) {
      return {
        json: null,
        delivered: false,
        sent: false,
        error: 'Facebook returned an unparseable response (กรุณาเช็กว่าล็อกอิน Facebook ใน Chrome แล้ว)',
        mappedError: { code: 906, fatalAuth: true, retryableSession: false, label: 'Facebook คืนค่าที่ไม่ใช่ JSON (อาจยังไม่ล็อกอิน หรือเซสชันหมดอายุ)' },
      };
    }

    const errDesc = extractMercuryErrorDesc(json);
    const delivered = Boolean(json.payload?.actions?.length);
    const sent = errDesc == null && json.error == null && delivered;

    if (sent) {
      return { json, delivered: true, sent: true, error: null, mappedError: null };
    }

    const fallbackMsg =
      errDesc ??
      `Facebook rejected the send (${json.error ?? 'no delivery action'}${json.errorSummary ? `: ${json.errorSummary}` : ''})`;

    return {
      json,
      delivered,
      sent: false,
      error: fallbackMsg,
      mappedError: mapMercuryError(json.error, fallbackMsg),
    };
  }

  // ==================== IMAGE ATTACHMENT UPLOAD ====================

  async function resolveImageSrcToBlobAndDataUrl(imageSrc) {
    const src = String(imageSrc || '').trim();
    if (!src) return { blob: null, dataUrl: '' };

    if (src.startsWith('data:')) {
      const commaIdx = src.indexOf(',');
      if (commaIdx === -1) return { blob: null, dataUrl: '' };
      const header = src.slice(0, commaIdx);
      const b64 = src.slice(commaIdx + 1);
      const mimeMatch = header.match(/data:([^;]+);/i);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      return { blob: new Blob([bytes], { type: mime }), dataUrl: src };
    }

    const res = await fetch(src);
    if (!res.ok) return { blob: null, dataUrl: '' };
    const blob = await res.blob();
    let dataUrl = '';
    if (typeof FileReader !== 'undefined') {
      dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } else {
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = '';
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      dataUrl = `data:${blob.type || 'image/jpeg'};base64,${btoa(bin)}`;
    }
    return { blob, dataUrl };
  }

  async function uploadImageForMercury({ pageId, pageAccessToken = '', session, imageSrc, fileName = 'promo.jpg' }) {
    const { blob, dataUrl } = await resolveImageSrcToBlobAndDataUrl(imageSrc).catch(() => ({ blob: null, dataUrl: '' }));
    if (!blob && !dataUrl) {
      return { ok: false, error: { code: 400, label: `ไม่สามารถอ่านไฟล์รูปภาพ "${fileName}" ได้` } };
    }

    // 1. Primary: Exact BroadTurbo OY upload (`/{pageId}/message_attachments` with `is_reusable: false`)
    if (pageAccessToken && blob) {
      try {
        const fd = new FormData();
        fd.append('message', JSON.stringify({ attachment: { type: 'image', payload: { is_reusable: false } } }));
        fd.append('filedata', blob, fileName || 'promo.jpg');

        const url = `${GRAPH_API_BASE}/${encodeURIComponent(pageId)}/message_attachments?access_token=${encodeURIComponent(pageAccessToken)}`;
        const gRes = await fetch(url, { method: 'POST', body: fd, signal: AbortSignal.timeout(60000) });
        const gJson = await gRes.json().catch(() => ({}));
        if (gRes.ok && gJson.attachment_id) {
          return { ok: true, attachmentId: String(gJson.attachment_id), via: 'graph_attachment' };
        }
      } catch {
        // Fall through to cookie-authenticated Mercury upload
      }
    }

    // 2. Fallback: Cookie-authenticated Mercury upload (`upload.facebook.com/ajax/mercury/upload.php`)
    if (dataUrl && session?.fbDTSG) {
      const swUp = await callSw('TURBO_MERCURY_UPLOAD', {
        pageId,
        sessionFacebookId: session.sessionFacebookId,
        fbDTSG: session.fbDTSG,
        jazoest: session.jazoest,
        dataUrl,
        fileName: fileName || 'promo.jpg',
      });
      if (swUp && swUp.ok && swUp.attachmentId) {
        return { ok: true, attachmentId: String(swUp.attachmentId), via: 'mercury_upload' };
      }
      return {
        ok: false,
        error: {
          code: 907,
          label: `อัปโหลดรูป "${fileName}" ไม่สำเร็จ: ${swUp?.error || 'กรุณาเชื่อมต่อ Page Token หรือรีเฟรชหน้า business.facebook.com'}`,
        },
      };
    }

    return {
      ok: false,
      error: { code: 907, label: `อัปโหลดรูป "${fileName}" ไม่สำเร็จ` },
    };
  }

  // ==================== SEQUENTIAL BROADTURBO SENDER ====================

  async function sendSingleMercuryItem({ audienceId, pageId, session, message = null, attachmentId = null }) {
    const { params, msgId } = buildMercuryFormBody({
      audienceId,
      sessionFacebookId: session.sessionFacebookId,
      pageId,
      message,
      attachmentId,
      fbDTSG: session.fbDTSG,
      jazoest: session.jazoest,
    });
    const swRes = await callSw('TURBO_MERCURY_SEND', { body: params.toString() });
    if (!swRes || typeof swRes.body !== 'string') {
      return {
        ok: false,
        msgId,
        parsed: {
          sent: false,
          mappedError: { code: 908, fatalAuth: false, retryableSession: false, label: 'Background worker ไม่ตอบกลับการส่งข้อความ' },
        },
      };
    }
    const parsed = parseMercuryResponse(swRes.ok, swRes.status, swRes.body);
    return { ok: parsed.sent, msgId, parsed };
  }

  async function sendTurboDirect({
    pageId,
    fbid = '',
    psid = '',
    name = '',
    text = '',
    imageUrl = '',
    domImages = [],
    sendOrder = 'image_first',
    pageAccessToken = '',
    dryRun = false,
  }) {
    if (!isValidNumericId(pageId)) {
      return { ok: false, error: { code: 400, label: 'ไม่พบ Page ID ที่ถูกต้อง (กรุณาเลือกเพจหรือกรอก Page ID ในแท็บ 1)' } };
    }

    const imageItems = [];
    if (Array.isArray(domImages) && domImages.length > 0) {
      for (const img of domImages) {
        if (img && img.dataUrl) {
          imageItems.push({ type: 'image', src: img.dataUrl, name: img.name || 'promo.jpg' });
        }
      }
    } else if (typeof imageUrl === 'string' && imageUrl.trim()) {
      imageItems.push({ type: 'image', src: imageUrl.trim(), name: 'promo.jpg' });
    }

    const textItems = text && String(text).trim() ? [{ type: 'text', text: String(text) }] : [];
    const items = sendOrder === 'text_first' ? [...textItems, ...imageItems] : [...imageItems, ...textItems];

    if (items.length === 0) {
      return { ok: false, error: { code: 400, label: 'ไม่มีข้อความหรือรูปภาพสำหรับส่ง' } };
    }

    if (dryRun) {
      return {
        ok: true,
        dryRun: true,
        method: 'mercury_broadturbo_dry',
        audienceId: fbid || psid || 'dry_fbid',
        resolvedFbid: fbid || '',
        messageId: `dry_mercury_${Date.now()}`,
        sentItemsCount: items.length,
      };
    }

    await ensureFacebookHeaderRules();

    let session = await getFacebookBrowserSession(false);
    if (!session || !session.fbDTSG || !session.sessionFacebookId || session.sessionFacebookId === '0') {
      return {
        ok: false,
        error: {
          code: 401,
          fatalAuth: true,
          label: 'ยังไม่ได้ล็อกอิน Facebook ใน Chrome (กรุณาเปิด business.facebook.com แล้วล็อกอินก่อนส่ง)',
        },
      };
    }

    const resolved = await resolveAudienceId({ pageId, fbid, psid, name });
    if (!resolved.ok) {
      return { ok: false, error: resolved.error };
    }
    const audienceId = resolved.audienceId;
    const resolvedFbid = resolved.resolvedFromGraphQL ? audienceId : '';

    let sentItemsCount = 0;
    let lastMessageId = '';

    for (const item of items) {
      let attachmentId = null;
      if (item.type === 'image') {
        const up = await uploadImageForMercury({
          pageId: String(pageId),
          pageAccessToken,
          session,
          imageSrc: item.src,
          fileName: item.name,
        });
        if (!up.ok) {
          return { ok: false, error: up.error, resolvedFbid, sentItemsCount };
        }
        attachmentId = up.attachmentId;
      }

      let attemptRes = await sendSingleMercuryItem({
        audienceId,
        pageId: String(pageId),
        session,
        message: item.type === 'text' ? item.text : null,
        attachmentId,
      });

      // Retry ONCE if fb_dtsg/session expired (`1357004` / `1357032`)
      if (!attemptRes.ok && attemptRes.parsed?.mappedError?.retryableSession) {
        invalidateSessionCache();
        const refreshed = await getFacebookBrowserSession(true);
        if (refreshed && refreshed.fbDTSG) {
          session = refreshed;
          attemptRes = await sendSingleMercuryItem({
            audienceId,
            pageId: String(pageId),
            session,
            message: item.type === 'text' ? item.text : null,
            attachmentId,
          });
        }
      }

      if (!attemptRes.ok) {
        return {
          ok: false,
          error: attemptRes.parsed?.mappedError || { code: 903, label: attemptRes.parsed?.error || 'ส่งไม่สำเร็จ' },
          resolvedFbid,
          sentItemsCount,
        };
      }

      sentItemsCount += 1;
      lastMessageId = attemptRes.msgId;
    }

    return {
      ok: true,
      method: 'mercury_broadturbo',
      audienceId,
      resolvedFbid,
      messageId: lastMessageId,
      sentItemsCount,
    };
  }

  async function diagnoseTurboEngine({ pageId, pageAccessToken = '' } = {}) {
    const dnr = await ensureFacebookHeaderRules().catch((e) => ({ ok: false, error: e.message }));
    const rawSession = await callSw('TURBO_GET_SESSION', { forceRefresh: true }).catch((e) => ({
      ok: false,
      error: e?.message || String(e),
    }));

    const sessionValid = Boolean(rawSession?.ok && rawSession.sessionFacebookId && rawSession.sessionFacebookId !== '0' && rawSession.fbDTSG);
    if (sessionValid) {
      cachedSession = {
        sessionFacebookId: String(rawSession.sessionFacebookId),
        fbDTSG: String(rawSession.fbDTSG),
        jazoest: String(rawSession.jazoest || ''),
        name: rawSession.name || 'Facebook User',
      };
      cachedSessionAt = Date.now();
    }

    let graphqlSample = null;
    if (sessionValid && isValidNumericId(pageId)) {
      graphqlSample = await fetchTurboAudiencePage({
        pageId: String(pageId),
        inbox: 'INBOX',
        before: Date.now(),
        limit: 3,
        fbDTSG: rawSession.fbDTSG,
      });
    }

    let tokenCheck = null;
    if (pageAccessToken && isValidNumericId(pageId)) {
      try {
        const r = await fetch(`${GRAPH_API_BASE}/${encodeURIComponent(pageId)}?fields=id,name&access_token=${encodeURIComponent(pageAccessToken)}`);
        const j = await r.json().catch(() => ({}));
        tokenCheck = { ok: r.ok && !j.error, name: j.name || '', error: j.error?.message || '' };
      } catch (e) {
        tokenCheck = { ok: false, error: e.message };
      }
    }

    return {
      ok: Boolean(sessionValid && (!isValidNumericId(pageId) || graphqlSample?.ok)),
      dnrRuleCount: Number(rawSession?.dnrRuleCount ?? dnr?.ruleCount ?? 0),
      hasCUserCookie: Boolean(rawSession?.hasCUserCookie),
      cUserId: rawSession?.cUserId || '',
      sessionValid,
      sessionFacebookId: sessionValid ? String(rawSession.sessionFacebookId) : '',
      sessionName: rawSession?.name || '',
      sessionError: sessionValid ? '' : rawSession?.error || 'ไม่พบเซสชัน Facebook',
      graphqlOk: Boolean(graphqlSample?.ok),
      graphqlSampleCount: graphqlSample?.contacts?.length || 0,
      graphqlSampleContacts: (graphqlSample?.contacts || []).slice(0, 3).map((c) => ({ fbid: c.fbid, name: c.name })),
      graphqlError: graphqlSample && !graphqlSample.ok ? graphqlSample.error : '',
      tokenCheck,
    };
  }

  const api = {
    GRAPHQL_DOC_ID,
    GRAPHQL_BATCH_NAME,
    normalizeCompareName,
    ensureFacebookHeaderRules,
    invalidateSessionCache,
    getFacebookBrowserSession,
    buildGraphqlBatchBody,
    parseGraphqlBatchResponse,
    fetchTurboAudiencePage,
    syncAllTurboAudiences,
    resolveAudienceId,
    generateMercuryMessageId,
    buildMercuryFormBody,
    parseMercuryResponse,
    uploadImageForMercury,
    sendTurboDirect,
    diagnoseTurboEngine,
    _setTransportForTest,
  };

  global.OnePersonTurboDirect = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : window);
