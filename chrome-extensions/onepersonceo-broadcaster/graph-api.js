// OnePersonCEO Smart Broadcaster v2.0 — Official Meta Graph API Client (v21.0)
// Compatible with Service Worker (importScripts), Dashboard (<script>), and Node.js (require)

(function (global) {
  'use strict';

  const GRAPH_VERSION = 'v21.0';
  const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

  function classifyMetaError(errObj = {}) {
    const code = Number(errObj.code || 0);
    const subcode = Number(errObj.error_subcode || errObj.subcode || 0);
    const rawMsg = errObj.message || errObj.error_user_msg || 'ไม่สามารถส่งข้อความได้';

    if (code === 10 || subcode === 2018278) {
      return {
        code: code || 10,
        subcode,
        rawMessage: rawMsg,
        label: `เกินหน้าต่าง 24 ชม. (ต้องส่งผ่าน Marketing Messages / Recurring Notification หรือ Tag ที่อนุญาต) | Meta #${code || 10}: ${rawMsg}`,
        retryable: false,
        fatalAuth: false,
      };
    }

    if (code === 551 || subcode === 1545041) {
      return {
        code: code || 551,
        subcode,
        rawMessage: rawMsg,
        label: 'ลูกเพจบล็อกเพจ ปิดบัญชี หรือไม่สามารถรับข้อความได้',
        retryable: false,
        fatalAuth: false,
      };
    }

    if (code === 2022) {
      return {
        code: 2022,
        subcode,
        rawMessage: rawMsg,
        label: `เพจถูกจำกัดการส่งข้อความชั่วคราว (หยุดตรวจสอบคุณภาพเพจใน Meta Business Suite) | Meta #2022: ${rawMsg}`,
        retryable: false,
        fatalAuth: true,
      };
    }

    if (code === 613 || code === 4 || code === 32 || code === 17) {
      return {
        code,
        subcode,
        rawMessage: rawMsg,
        label: 'ติด Rate Limit ของ Meta API (ระบบจะชะลอและลองใหม่ให้อัตโนมัติ)',
        retryable: true,
        fatalAuth: false,
      };
    }

    if (code === 190) {
      return {
        code: 190,
        subcode,
        rawMessage: rawMsg,
        label: `Page Access Token หมดอายุหรือไม่ถูกต้อง กรุณาสร้าง Token ใหม่ | Meta #190: ${rawMsg}`,
        retryable: false,
        fatalAuth: true,
      };
    }

    if (
      code === 200 ||
      code === 283 ||
      /pages_messaging|pages_read_engagement|pages_manage_metadata|read_page_mailboxes|permission/i.test(rawMsg)
    ) {
      const matches = rawMsg.match(/\b(pages_[a-z_]+|read_page_mailboxes|business_management|instagram_[a-z_]+)\b/gi) || [];
      const detectedPerms = Array.from(new Set(matches.map((p) => p.toLowerCase()))).join(', ');
      return {
        code: code || 200,
        subcode,
        rawMessage: rawMsg,
        label: `Token ขาดสิทธิ์ดึงแชทเพจ${detectedPerms ? ` (Meta ระบุ: ${detectedPerms})` : ''} — ต้องมีสิทธิ์ pages_messaging + pages_manage_metadata + pages_read_engagement + pages_show_list | ข้อความจาก Meta (#${code || 200}${subcode ? `/${subcode}` : ''}): ${rawMsg}`,
        retryable: false,
        fatalAuth: true,
      };
    }

    if (code === 100 && (subcode === 2018001 || /no matching user/i.test(rawMsg))) {
      return {
        code: 100,
        subcode,
        rawMessage: rawMsg,
        label: 'ไม่พบผู้รับ (PSID ไม่ตรงกับเพจนี้หรือยังไม่มีแชทในเพจ)',
        retryable: false,
        fatalAuth: false,
      };
    }

    return {
      code: code || 0,
      subcode,
      rawMessage: rawMsg,
      label: code ? `[Meta #${code}${subcode ? `/${subcode}` : ''}] ${rawMsg}` : rawMsg,
      retryable: false,
      fatalAuth: false,
    };
  }

  function parseApiUsageHeaders(headers) {
    if (!headers || typeof headers.get !== 'function') return 0;
    let maxPct = 0;

    const appUsageRaw = headers.get('x-app-usage');
    if (appUsageRaw) {
      try {
        const parsed = JSON.parse(appUsageRaw);
        maxPct = Math.max(
          maxPct,
          Number(parsed.call_count) || 0,
          Number(parsed.total_cputime) || 0,
          Number(parsed.total_time) || 0
        );
      } catch {
        // ignore malformed header
      }
    }

    const bucuRaw = headers.get('x-business-use-case-usage');
    if (bucuRaw) {
      try {
        const parsed = JSON.parse(bucuRaw);
        for (const entries of Object.values(parsed)) {
          if (!Array.isArray(entries)) continue;
          for (const entry of entries) {
            maxPct = Math.max(
              maxPct,
              Number(entry.call_count) || 0,
              Number(entry.total_cputime) || 0,
              Number(entry.total_time) || 0
            );
          }
        }
      } catch {
        // ignore malformed header
      }
    }

    return Math.min(100, Math.round(maxPct));
  }

  async function graphRequest(path, { method = 'GET', accessToken, query = {}, body = null } = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    if (accessToken) {
      params.set('access_token', accessToken);
    }

    const qs = params.toString();
    const url = `${GRAPH_BASE}${path.startsWith('/') ? path : `/${path}`}${qs ? `?${qs}` : ''}`;

    const fetchOpts = { method };
    if (body !== null && method !== 'GET') {
      fetchOpts.headers = { 'Content-Type': 'application/json' };
      fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    const usagePct = parseApiUsageHeaders(res.headers);
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.error) {
      const classified = classifyMetaError(json.error || { message: `HTTP ${res.status}` });
      return { ok: false, status: res.status, usagePct, error: classified, raw: json };
    }

    return { ok: true, status: res.status, usagePct, data: json };
  }

  async function verifyToken(accessToken) {
    const token = String(accessToken || '').trim();
    if (!token) {
      return { ok: false, error: classifyMetaError({ message: 'กรุณาวาง Access Token ก่อนตรวจสอบครับ' }) };
    }

    const meRes = await graphRequest('/me', {
      accessToken: token,
      query: { fields: 'id,name,category,fan_count,picture{url}' },
    });

    if (!meRes.ok) {
      return { ok: false, error: meRes.error, usagePct: meRes.usagePct };
    }

    const me = meRes.data;
    // Check if token is a User Access Token with /me/accounts pages list
    const accRes = await graphRequest('/me/accounts', {
      accessToken: token,
      query: { fields: 'id,name,access_token,category,fan_count', limit: 100 },
    });

    if (accRes.ok && Array.isArray(accRes.data?.data) && accRes.data.data.length > 0) {
      return {
        ok: true,
        type: 'user',
        me,
        pages: accRes.data.data,
        usagePct: Math.max(meRes.usagePct || 0, accRes.usagePct || 0),
      };
    }

    return {
      ok: true,
      type: 'page',
      me,
      pages: [
        {
          id: me.id,
          name: me.name || `Page ${me.id}`,
          access_token: token,
          category: me.category || '',
          fan_count: me.fan_count || 0,
        },
      ],
      usagePct: meRes.usagePct || 0,
    };
  }

  function mapConversationToContact(conv, pageId) {
    const participants = conv?.participants?.data || [];
    const recipient = participants.find((p) => String(p.id) !== String(pageId)) || participants[0] || null;
    if (!recipient || !recipient.id) return null;

    const psid = String(recipient.id);
    const updatedMs = conv.updated_time ? Date.parse(conv.updated_time) : Date.now();

    return {
      id: `${pageId}:${psid}`,
      pageId: String(pageId),
      psid,
      threadId: String(conv.id || ''),
      name: recipient.name || `ลูกเพจ ${psid.slice(-4)}`,
      lastInteractionAt: Number.isFinite(updatedMs) ? updatedMs : Date.now(),
      lastSnippet: String(conv.snippet || '').slice(0, 140),
      messageCount: Number(conv.message_count) || 0,
      unreadCount: Number(conv.unread_count) || 0,
      source: 'graph_api',
    };
  }

  async function fetchConversationsPage({
    pageId,
    accessToken,
    limit = 100,
    afterCursor = null,
    minimalFields = false,
    omitPlatform = false,
  }) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 100));
    const fields = minimalFields
      ? 'id,updated_time,participants'
      : 'id,updated_time,message_count,unread_count,snippet,participants';

    let usedMinimalFields = Boolean(minimalFields);
    let usedOmitPlatform = Boolean(omitPlatform);

    let res = await graphRequest(`/${encodeURIComponent(pageId)}/conversations`, {
      accessToken,
      query: {
        platform: omitPlatform ? undefined : 'messenger',
        fields,
        limit: safeLimit,
        after: afterCursor || undefined,
      },
    });

    if (!res.ok && !minimalFields && !afterCursor && res.error?.code !== 190 && !res.error?.retryable) {
      const minimalRes = await graphRequest(`/${encodeURIComponent(pageId)}/conversations`, {
        accessToken,
        query: {
          platform: omitPlatform ? undefined : 'messenger',
          fields: 'id,updated_time,participants',
          limit: safeLimit,
        },
      });
      if (minimalRes.ok) {
        res = minimalRes;
        usedMinimalFields = true;
      } else if (!omitPlatform && minimalRes.error?.code === 100) {
        const noPlatRes = await graphRequest(`/${encodeURIComponent(pageId)}/conversations`, {
          accessToken,
          query: {
            fields: 'id,updated_time,participants',
            limit: safeLimit,
          },
        });
        if (noPlatRes.ok) {
          res = noPlatRes;
          usedMinimalFields = true;
          usedOmitPlatform = true;
        } else {
          res = noPlatRes;
        }
      } else {
        res = minimalRes;
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        contacts: [],
        nextCursor: afterCursor,
        hasMore: false,
        usedMinimalFields,
        usedOmitPlatform,
        usagePct: res.usagePct,
        error: res.error,
      };
    }

    const rawList = Array.isArray(res.data?.data) ? res.data.data : [];
    const contacts = rawList.map((c) => mapConversationToContact(c, pageId)).filter(Boolean);
    const nextCursor = res.data?.paging?.cursors?.after || null;
    const hasMore = Boolean(res.data?.paging?.next && nextCursor);

    return {
      ok: true,
      contacts,
      nextCursor,
      hasMore,
      usedMinimalFields,
      usedOmitPlatform,
      usagePct: res.usagePct || 0,
    };
  }

  async function probeConversationsAccess({ pageId, accessToken }) {
    const res = await fetchConversationsPage({ pageId, accessToken, limit: 1 });
    return {
      ok: res.ok,
      sampleCount: res.contacts.length,
      usedMinimalFields: res.usedMinimalFields,
      usedOmitPlatform: res.usedOmitPlatform,
      usagePct: res.usagePct || 0,
      error: res.error || null,
    };
  }

  async function uploadReusableAttachment({ pageId, accessToken, file, type = 'image', dryRun = false }) {
    if (dryRun) {
      await new Promise((r) => setTimeout(r, 40));
      return {
        ok: true,
        dryRun: true,
        attachmentId: `dry_att_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        usagePct: 5,
      };
    }

    if (!pageId || !accessToken || !file) {
      return {
        ok: false,
        usagePct: 0,
        error: classifyMetaError({ message: 'ข้อมูลไม่ครบสำหรับอัปโหลดไฟล์รูปภาพไปยัง Meta API' }),
      };
    }

    const form = new FormData();
    form.append('message', JSON.stringify({ attachment: { type, payload: { is_reusable: true } } }));
    form.append('filedata', file, file.name || 'image.png');

    const url = `${GRAPH_BASE}/${encodeURIComponent(pageId)}/message_attachments?access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url, { method: 'POST', body: form });
    const usagePct = parseApiUsageHeaders(res.headers);
    const json = await res.json().catch(() => ({}));

    if (!res.ok || json.error || !json.attachment_id) {
      return {
        ok: false,
        usagePct,
        error: classifyMetaError(json.error || { message: `HTTP ${res.status} อัปโหลดรูปไม่สำเร็จ` }),
      };
    }

    return {
      ok: true,
      attachmentId: String(json.attachment_id),
      usagePct,
    };
  }

  async function sendDirectMessage({
    pageId,
    accessToken,
    psid,
    text = '',
    imageUrl = '',
    cachedAttachmentId = '',
    attachmentIds = [],
    sendOrder = 'image_first',
    messagingMode = 'RESPONSE',
    messageTag = 'ACCOUNT_UPDATE',
    notificationToken = '',
    within24h = true,
    dryRun = false,
  }) {
    const resolvedIds = Array.isArray(attachmentIds) ? attachmentIds.filter(Boolean).map(String) : [];
    if (cachedAttachmentId && !resolvedIds.includes(String(cachedAttachmentId))) {
      resolvedIds.push(String(cachedAttachmentId));
    }
    const hasUrlFallback = Boolean(imageUrl && resolvedIds.length === 0);
    const totalImages = resolvedIds.length + (hasUrlFallback ? 1 : 0);

    if (dryRun) {
      await new Promise((r) => setTimeout(r, 35));
      if (messagingMode === 'RESPONSE' && !within24h) {
        return {
          ok: false,
          dryRun: true,
          usagePct: 12,
          error: classifyMetaError({ code: 10, error_subcode: 2018278 }),
        };
      }
      if (messagingMode === 'MARKETING_MESSAGES' && !notificationToken) {
        return {
          ok: false,
          dryRun: true,
          usagePct: 12,
          error: classifyMetaError({
            code: 100,
            message: 'ไม่มี Marketing Notification Token สำหรับลูกเพจรายนี้ (โหมด Dry-Run)',
          }),
        };
      }
      return {
        ok: true,
        dryRun: true,
        sentImagesCount: totalImages,
        messageId: `dry_mid_${Date.now()}`,
        attachmentId: resolvedIds[0] || (imageUrl ? 'dry_att_1' : ''),
        usagePct: 12,
      };
    }

    const recipient =
      messagingMode === 'MARKETING_MESSAGES' && notificationToken
        ? { notification_messages_token: notificationToken }
        : { id: psid };

    const messagingType =
      messagingMode === 'MESSAGE_TAG'
        ? 'MESSAGE_TAG'
        : messagingMode === 'MARKETING_MESSAGES'
        ? 'UPDATE'
        : 'RESPONSE';

    let finalAttachmentId = resolvedIds[0] || '';
    let maxUsagePct = 0;
    let sentImagesCount = 0;
    let lastMessageId = '';

    async function sendImagesStep() {
      if (resolvedIds.length > 0) {
        for (const attId of resolvedIds) {
          const reusePayload = {
            recipient,
            messaging_type: messagingType,
            message: {
              attachment: {
                type: 'image',
                payload: { attachment_id: attId },
              },
            },
          };
          if (messagingType === 'MESSAGE_TAG') reusePayload.tag = messageTag || 'ACCOUNT_UPDATE';

          const reuseRes = await graphRequest(`/${encodeURIComponent(pageId)}/messages`, {
            method: 'POST',
            accessToken,
            body: reusePayload,
          });
          maxUsagePct = Math.max(maxUsagePct, reuseRes.usagePct || 0);
          if (!reuseRes.ok) {
            return { ok: false, error: reuseRes.error };
          }
          sentImagesCount += 1;
          if (reuseRes.data?.message_id) lastMessageId = reuseRes.data.message_id;
        }
        return { ok: true };
      }

      if (imageUrl) {
        const attPayload = {
          recipient,
          messaging_type: messagingType,
          message: {
            attachment: {
              type: 'image',
              payload: { url: imageUrl, is_reusable: true },
            },
          },
        };
        if (messagingType === 'MESSAGE_TAG') attPayload.tag = messageTag || 'ACCOUNT_UPDATE';

        const attRes = await graphRequest(`/${encodeURIComponent(pageId)}/messages`, {
          method: 'POST',
          accessToken,
          body: attPayload,
        });
        maxUsagePct = Math.max(maxUsagePct, attRes.usagePct || 0);
        if (!attRes.ok) {
          return { ok: false, error: attRes.error };
        }
        sentImagesCount += 1;
        if (attRes.data?.attachment_id) {
          finalAttachmentId = attRes.data.attachment_id;
        }
        if (attRes.data?.message_id) lastMessageId = attRes.data.message_id;
      }

      return { ok: true };
    }

    async function sendTextStep() {
      if (!text || !String(text).trim()) return { ok: true };
      const textPayload = {
        recipient,
        messaging_type: messagingType,
        message: { text },
      };
      if (messagingType === 'MESSAGE_TAG') {
        textPayload.tag = messageTag || 'ACCOUNT_UPDATE';
      }

      const txtRes = await graphRequest(`/${encodeURIComponent(pageId)}/messages`, {
        method: 'POST',
        accessToken,
        body: textPayload,
      });
      maxUsagePct = Math.max(maxUsagePct, txtRes.usagePct || 0);
      if (!txtRes.ok) {
        return { ok: false, error: txtRes.error };
      }
      if (txtRes.data?.message_id) lastMessageId = txtRes.data.message_id;
      return { ok: true };
    }

    const steps = sendOrder === 'text_first' ? [sendTextStep, sendImagesStep] : [sendImagesStep, sendTextStep];
    for (const step of steps) {
      const stepRes = await step();
      if (!stepRes.ok) {
        return {
          ok: false,
          sentImagesCount,
          attachmentId: finalAttachmentId,
          usagePct: maxUsagePct,
          error: stepRes.error,
        };
      }
    }

    return {
      ok: true,
      sentImagesCount,
      messageId: lastMessageId,
      attachmentId: finalAttachmentId,
      usagePct: maxUsagePct,
    };
  }

  const api = {
    GRAPH_VERSION,
    GRAPH_BASE,
    classifyMetaError,
    parseApiUsageHeaders,
    verifyToken,
    fetchConversationsPage,
    probeConversationsAccess,
    uploadReusableAttachment,
    sendDirectMessage,
  };

  global.OnePersonGraphAPI = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
