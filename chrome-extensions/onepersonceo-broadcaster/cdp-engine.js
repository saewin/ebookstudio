// OnePersonCEO Smart Broadcaster v2.0 — CDP Engine (RFM, RSV, Customer 360, Send-Time Optimization)
// Compatible with Service Worker (importScripts), Dashboard (<script>), and Node.js (require)

(function (global) {
  'use strict';

  const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;

  const GREETINGS = [
    'สวัสดีครับ',
    'ทักทายครับ',
    'หวัดดีครับ',
    'สวัสดีครับผม',
  ];

  const RFM_SEGMENTS = {
    Champions: {
      key: 'Champions',
      label: '👑 Champions (VIP ซื้อซ้ำ)',
      shortLabel: 'Champions',
      badgeClass: 'badge-champions',
      description: 'เพิ่งซื้อไม่นาน ซื้อถี่ และยอดสะสมสูง',
    },
    Loyal: {
      key: 'Loyal',
      label: '💎 Loyal (ลูกค้าประจำ)',
      shortLabel: 'Loyal',
      badgeClass: 'badge-loyal',
      description: 'ซื้อสม่ำเสมอ ตอบรับดี',
    },
    'Potential Loyalist': {
      key: 'Potential Loyalist',
      label: '🌱 Potential Loyalist (ลูกค้าใหม่มีแวว)',
      shortLabel: 'Potential Loyalist',
      badgeClass: 'badge-potential',
      description: 'เพิ่งซื้อล่าสุด มีโอกาสปั้นเป็นลูกค้าประจำ',
    },
    'At Risk': {
      key: 'At Risk',
      label: '⚠️ At Risk (เริ่มห่างหาย)',
      shortLabel: 'At Risk',
      badgeClass: 'badge-atrisk',
      description: 'เคยซื้อดี แต่เริ่มทิ้งช่วงนาน ควรรีบดึงกลับ',
    },
    Hibernating: {
      key: 'Hibernating',
      label: '💤 Hibernating (หลับลึก)',
      shortLabel: 'Hibernating',
      badgeClass: 'badge-hibernating',
      description: 'ขาดการสั่งซื้อนานมาก ต้องกระตุ้นด้วยข้อเสนอเฉพาะทาง',
    },
    'Warm Lead': {
      key: 'Warm Lead',
      label: '💬 Warm Lead (เพิ่งทัก 7 วัน)',
      shortLabel: 'Warm Lead',
      badgeClass: 'badge-warm',
      description: 'ทักเพจในรอบ 7 วัน ยังไม่มีประวัติสั่งซื้อ',
    },
    'Cold Lead': {
      key: 'Cold Lead',
      label: '🧊 Cold Lead (ทักนานแล้ว)',
      shortLabel: 'Cold Lead',
      badgeClass: 'badge-cold',
      description: 'เคยทักนานกว่า 7 วัน ยังไม่เคยสั่งซื้อ',
    },
  };

  const RSV_STAGES = {
    'Due Now': {
      key: 'Due Now',
      label: '🔥 ครบกำหนดซื้อซ้ำ (Due Now)',
      shortLabel: '🔥 ครบกำหนดซื้อซ้ำ',
      badgeClass: 'badge-rsv-due',
      description: 'ใช้งานมา 90%–135% ของรอบสินค้า โอกาสปิดซ้ำสูงสุด',
    },
    Upcoming: {
      key: 'Upcoming',
      label: '⏰ ใกล้ครบรอบ (Upcoming)',
      shortLabel: '⏰ ใกล้ครบรอบ',
      badgeClass: 'badge-rsv-upcoming',
      description: 'ใช้งานมา 75%–89% ของรอบสินค้า เหมาะส่งเตือนล่วงหน้า',
    },
    Overdue: {
      key: 'Overdue',
      label: '🚨 เกินรอบ/ดึงกลับ (Overdue)',
      shortLabel: '🚨 เกินรอบ/ดึงกลับ',
      badgeClass: 'badge-rsv-overdue',
      description: 'เลยรอบซื้อซ้ำ > 135% ต้องรีบทักทายก่อนหลุด',
    },
    Fresh: {
      key: 'Fresh',
      label: '🌱 เพิ่งซื้อ/ดูแล (Fresh)',
      shortLabel: '🌱 เพิ่งซื้อ/ดูแล',
      badgeClass: 'badge-rsv-fresh',
      description: 'เพิ่งซื้อ < 75% ของรอบ ควรส่งวิธีใช้/ความรู้ ไม่ยัดโปร',
    },
    Prospect: {
      key: 'Prospect',
      label: '💬 ผู้สนใจใหม่ (Prospect)',
      shortLabel: '💬 ผู้สนใจใหม่',
      badgeClass: 'badge-rsv-prospect',
      description: 'ยังไม่มีข้อมูลออเดอร์ เหมาะสำหรับส่งความรู้สร้างความไว้ใจ',
    },
  };

  function normalizeName(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/^(คุณ|khun)\s*/i, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function toMs(val) {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number' && Number.isFinite(val)) {
      return val < 1e12 ? val * 1000 : val;
    }
    const parsed = Date.parse(String(val));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function getBangkokHour(tsOrIso) {
    const ms = toMs(tsOrIso);
    if (ms === null) return null;
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Bangkok',
        hour: 'numeric',
        hour12: false,
      }).formatToParts(new Date(ms));
      const hourPart = parts.find((p) => p.type === 'hour');
      if (hourPart) {
        const h = Number(hourPart.value);
        if (Number.isFinite(h)) return h === 24 ? 0 : h % 24;
      }
    } catch {
      // Fallback to UTC+7 math
    }
    const bkk = new Date(ms + BANGKOK_OFFSET_MS);
    return bkk.getUTCHours();
  }

  function formatBangkokTimeLabel(hour) {
    const h = ((Number(hour) || 0) % 24 + 24) % 24;
    return `${String(h).padStart(2, '0')}:00 น.`;
  }

  function computePreferredHour(orderHours = [], lastInteractionAt = null, defaultHour = 20) {
    const validHours = (Array.isArray(orderHours) ? orderHours : [])
      .map((h) => Number(h))
      .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);

    if (validHours.length > 0) {
      const counts = new Map();
      const lastPos = new Map();
      validHours.forEach((h, idx) => {
        counts.set(h, (counts.get(h) || 0) + 1);
        lastPos.set(h, idx);
      });

      let bestHour = validHours[0];
      let bestCount = -1;
      let bestPos = -1;
      for (const [h, count] of counts.entries()) {
        const pos = lastPos.get(h) || 0;
        if (count > bestCount || (count === bestCount && pos > bestPos)) {
          bestHour = h;
          bestCount = count;
          bestPos = pos;
        }
      }
      return { preferredHour: bestHour, preferredHourSource: 'order_history' };
    }

    const inboxHour = getBangkokHour(lastInteractionAt);
    if (inboxHour !== null) {
      return { preferredHour: inboxHour, preferredHourSource: 'inbox_activity' };
    }

    return { preferredHour: ((Number(defaultHour) || 20) % 24 + 24) % 24, preferredHourSource: 'default' };
  }

  function isHourInQuietWindow(hour, quietStart = 22, quietEnd = 8) {
    const h = ((Number(hour) || 0) % 24 + 24) % 24;
    const qs = ((Number(quietStart) || 22) % 24 + 24) % 24;
    const qe = ((Number(quietEnd) || 8) % 24 + 24) % 24;
    if (qs === qe) return false;
    if (qs > qe) {
      // Wrap-around overnight window e.g. 22 -> 08
      return h >= qs || h < qe;
    }
    return h >= qs && h < qe;
  }

  function adjustForQuietHours(hour, quietStart = 22, quietEnd = 8, shiftTarget = 'morning') {
    const h = ((Number(hour) || 0) % 24 + 24) % 24;
    const qs = ((Number(quietStart) || 22) % 24 + 24) % 24;
    const qe = ((Number(quietEnd) || 8) % 24 + 24) % 24;

    if (!isHourInQuietWindow(h, qs, qe)) {
      return { effectiveHour: h, shiftedByQuietHours: false };
    }

    const effectiveHour = shiftTarget === 'evening' ? (qs + 23) % 24 : qe;
    return { effectiveHour, shiftedByQuietHours: true };
  }

  function stableHash(str) {
    const s = String(str || '');
    let hash = 2166136261;
    for (let i = 0; i < s.length; i++) {
      hash ^= s.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function computeNextScheduledTime(
    preferredHour,
    {
      quietStart = 22,
      quietEnd = 8,
      shiftTarget = 'morning',
      nowMs = Date.now(),
      jitterMinutes = 12,
      seedKey = '',
    } = {}
  ) {
    const { effectiveHour, shiftedByQuietHours } = adjustForQuietHours(
      preferredHour,
      quietStart,
      quietEnd,
      shiftTarget
    );

    const maxJit = Math.max(0, Math.min(55, Number(jitterMinutes) || 0));
    const minute = maxJit > 0 ? stableHash(seedKey || String(effectiveHour)) % (maxJit + 1) : 0;

    // Build target wall-clock time in Asia/Bangkok (UTC+7 fixed, no DST)
    const bkkNow = new Date(nowMs + BANGKOK_OFFSET_MS);
    const y = bkkNow.getUTCFullYear();
    const m = bkkNow.getUTCMonth();
    const d = bkkNow.getUTCDate();

    let targetMs = Date.UTC(y, m, d, effectiveHour, minute, 0, 0) - BANGKOK_OFFSET_MS;
    if (targetMs <= nowMs - 5 * 60 * 1000) {
      targetMs += DAY_MS;
    }

    return {
      scheduledAt: targetMs,
      effectiveHour,
      shiftedByQuietHours,
    };
  }

  function scoreContact(contact, nowMs = Date.now()) {
    const copy = { ...contact };
    const lastInterMs = toMs(copy.lastInteractionAt);
    const lastOrderMs = toMs(copy.lastOrderAt);
    const orderCount = Math.max(0, Number(copy.orderCount) || 0);
    const totalSpent = Math.max(0, Number(copy.totalSpent) || 0);
    const avgCycleDays = Math.max(7, Number(copy.avgCycleDays) || 30);

    const within24h = lastInterMs !== null ? nowMs - lastInterMs <= DAY_MS : false;

    let rScore = 1;
    let fScore = 1;
    let mScore = 1;
    let rfmSegment = 'Cold Lead';
    let rsvCyclePct = 0;
    let rsvStage = 'Prospect';

    if (orderCount > 0 || totalSpent > 0) {
      const refMs = lastOrderMs !== null ? lastOrderMs : lastInterMs || nowMs;
      const daysSinceOrder = Math.max(0, (nowMs - refMs) / DAY_MS);

      if (daysSinceOrder <= 14) rScore = 5;
      else if (daysSinceOrder <= 30) rScore = 4;
      else if (daysSinceOrder <= 60) rScore = 3;
      else if (daysSinceOrder <= 120) rScore = 2;
      else rScore = 1;

      if (orderCount >= 5) fScore = 5;
      else if (orderCount >= 3) fScore = 4;
      else if (orderCount === 2) fScore = 3;
      else fScore = 2;

      if (totalSpent >= 10000) mScore = 5;
      else if (totalSpent >= 5000) mScore = 4;
      else if (totalSpent >= 2000) mScore = 3;
      else if (totalSpent >= 500) mScore = 2;
      else mScore = 1;

      if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
        rfmSegment = 'Champions';
      } else if (rScore >= 3 && fScore >= 3) {
        rfmSegment = 'Loyal';
      } else if (rScore >= 4 && fScore <= 2) {
        rfmSegment = 'Potential Loyalist';
      } else if (rScore === 2 && (fScore >= 2 || mScore >= 2)) {
        rfmSegment = 'At Risk';
      } else if (rScore === 1) {
        rfmSegment = 'Hibernating';
      } else if (rScore >= 3) {
        rfmSegment = 'Potential Loyalist';
      } else {
        rfmSegment = 'At Risk';
      }

      if (lastOrderMs !== null) {
        const orderDays = Math.max(0, (nowMs - lastOrderMs) / DAY_MS);
        rsvCyclePct = Math.round((orderDays / avgCycleDays) * 100);
        if (rsvCyclePct < 75) rsvStage = 'Fresh';
        else if (rsvCyclePct < 90) rsvStage = 'Upcoming';
        else if (rsvCyclePct <= 135) rsvStage = 'Due Now';
        else rsvStage = 'Overdue';
      } else {
        rsvStage = 'Overdue';
        rsvCyclePct = 150;
      }
    } else {
      const daysSinceInter = lastInterMs !== null ? Math.max(0, (nowMs - lastInterMs) / DAY_MS) : 999;
      if (daysSinceInter <= 1) rScore = 5;
      else if (daysSinceInter <= 7) rScore = 4;
      else if (daysSinceInter <= 30) rScore = 3;
      else if (daysSinceInter <= 90) rScore = 2;
      else rScore = 1;

      fScore = 1;
      mScore = 1;
      rfmSegment = daysSinceInter <= 7 ? 'Warm Lead' : 'Cold Lead';
      rsvCyclePct = 0;
      rsvStage = 'Prospect';
    }

    const rsvBase =
      rsvStage === 'Due Now'
        ? 45
        : rsvStage === 'Upcoming'
          ? 30
          : rsvStage === 'Overdue'
            ? 24
            : rsvStage === 'Fresh'
              ? 12
              : 6;
    const ltvBonus = Math.min(30, Math.round((totalSpent / 15000) * 30));
    const windowBonus = within24h ? 18 : 0;
    const freqBonus = Math.min(7, fScore + (mScore > 2 ? 2 : 0));
    const rsvPriority = Math.min(100, rsvBase + ltvBonus + windowBonus + freqBonus);

    const { preferredHour, preferredHourSource } = computePreferredHour(
      copy.orderHours,
      copy.lastInteractionAt,
      20
    );

    const hasPsid = Boolean(copy.psid && !String(copy.psid).startsWith('c360:'));

    return {
      ...copy,
      normalizedName: normalizeName(copy.name),
      within24h,
      rScore,
      fScore,
      mScore,
      rfmScore: `${rScore}${fScore}${mScore}`,
      rfmSegment,
      rsvCyclePct,
      rsvStage,
      rsvPriority,
      preferredHour,
      preferredHourSource,
      canDirectSend: hasPsid,
      updatedAt: nowMs,
    };
  }

  function parseCsvRows(text) {
    const clean = String(text || '').replace(/^\uFEFF/, '');
    const rows = [];
    let current = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      const next = clean[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          field += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          current.push(field.trim());
          field = '';
        } else if (ch === '\r' && next === '\n') {
          current.push(field.trim());
          rows.push(current);
          current = [];
          field = '';
          i += 1;
        } else if (ch === '\n' || ch === '\r') {
          current.push(field.trim());
          rows.push(current);
          current = [];
          field = '';
        } else {
          field += ch;
        }
      }
    }

    if (field.length > 0 || current.length > 0) {
      current.push(field.trim());
      rows.push(current);
    }

    return rows.filter((r) => r.some((cell) => cell !== ''));
  }

  const HEADER_ALIASES = {
    psid: ['psid', 'fb_psid', 'facebook_id', 'fb_id', 'messenger_id', 'sender_id'],
    name: ['name', 'customer_name', 'full_name', 'ชื่อ', 'ชื่อลูกค้า', 'ชื่อเฟส', 'fb_name'],
    phone: ['phone', 'tel', 'mobile', 'เบอร์', 'เบอร์โทร', 'เบอร์โทรศัพท์'],
    email: ['email', 'e-mail', 'customer_email', 'อีเมล', 'เมล'],
    sourceBook: ['source_book', 'book', 'source_ref', 'ebook', 'เล่มที่มา', 'แหล่งที่มา'],
    interestTags: ['interest', 'interest_tag', 'interest_tags', 'ความสนใจ'],
    orderCount: ['order_count', 'orders', 'frequency', 'จำนวนออเดอร์', 'จำนวนครั้ง', 'ออเดอร์'],
    totalSpent: ['total_spent', 'ltv', 'monetary', 'spent', 'ยอดซื้อ', 'ยอดซื้อสะสม', 'ยอดรวม'],
    lastOrderAt: ['last_order_date', 'last_order_at', 'order_date', 'วันที่สั่งล่าสุด', 'วันที่สั่ง', 'last_order'],
    orderTime: ['order_time', 'last_order_time', 'preferred_hour', 'order_hours', 'เวลาที่สั่ง', 'เวลาสั่งซื้อ', 'เวลาสั่ง'],
    avgCycleDays: ['cycle_days', 'avg_cycle_days', 'รอบซื้อซ้ำ', 'รอบวัน'],
    lastProduct: ['last_product', 'product', 'products', 'สินค้า', 'สินค้าล่าสุด', 'สินค้าที่ซื้อ'],
    tags: ['tags', 'tag', 'segment', 'แท็ก'],
    marketingOptInToken: ['marketing_token', 'notification_token', 'optin_token', 'notification_messages_token'],
  };

  function resolveCanonicalKey(header) {
    const norm = String(header || '').toLowerCase().trim().replace(/\s+/g, '_');
    for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) return canonical;
    }
    return norm;
  }

  function parseOrderHoursValue(rawVal, fallbackDateVal) {
    const hours = [];
    const str = String(rawVal || '').trim();
    if (str) {
      const tokens = str.split(/[;,|/]+/).map((s) => s.trim()).filter(Boolean);
      for (const tok of tokens) {
        const hhmm = tok.match(/^(\d{1,2})[:.]\d{2}/);
        if (hhmm) {
          const h = Number(hhmm[1]);
          if (h >= 0 && h <= 23) hours.push(h);
          continue;
        }
        if (/^\d{1,2}$/.test(tok)) {
          const h = Number(tok);
          if (h >= 0 && h <= 23) hours.push(h);
          continue;
        }
        const isoH = getBangkokHour(tok);
        if (isoH !== null) hours.push(isoH);
      }
    }

    if (hours.length === 0 && fallbackDateVal && /[T\s]\d{1,2}:\d{2}/.test(String(fallbackDateVal))) {
      const fallbackH = getBangkokHour(fallbackDateVal);
      if (fallbackH !== null) hours.push(fallbackH);
    }

    return hours;
  }

  function parseNumber(val, fallback = 0) {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    const cleaned = String(val || '').replace(/[฿,\s]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeC360Row(rawObj) {
    const mapped = {};
    for (const [k, v] of Object.entries(rawObj || {})) {
      const canon = resolveCanonicalKey(k);
      mapped[canon] = v;
    }

    const psid = String(mapped.psid || '').trim();
    const name = String(mapped.name || '').trim();
    if (!psid && !name) return null;

    const lastOrderAt = toMs(mapped.lastOrderAt);
    const orderHours = Array.isArray(mapped.orderHours)
      ? mapped.orderHours.map(Number).filter((h) => Number.isInteger(h) && h >= 0 && h <= 23)
      : parseOrderHoursValue(mapped.orderTime, mapped.lastOrderAt);

    const tags = Array.isArray(mapped.tags)
      ? mapped.tags.map((t) => String(t).trim()).filter(Boolean)
      : String(mapped.tags || '')
        .split(/[;|,]/)
        .map((t) => t.trim())
        .filter(Boolean);

    const lastProductStr = String(mapped.lastProduct || '').trim();
    const explicitCycle = parseNumber(mapped.avgCycleDays, 0);
    const inferredCycle = /workshop|คอร์สสด/i.test(lastProductStr)
      ? 60
      : /course|คอร์ส/i.test(lastProductStr)
        ? 30
        : /ebook|e-book|หนังสือ|คู่มือ/i.test(lastProductStr)
          ? 21
          : 30;

    const interestTags = Array.isArray(mapped.interestTags)
      ? mapped.interestTags.map((t) => String(t).trim()).filter(Boolean)
      : String(mapped.interestTags || '')
        .split(/[;|,]/)
        .map((t) => t.trim())
        .filter(Boolean);

    return {
      psid,
      name,
      phone: String(mapped.phone || '').trim(),
      email: String(mapped.email || '').trim().toLowerCase(),
      sourceBook: String(mapped.sourceBook || '').trim(),
      interestTags,
      orderCount: Math.max(0, Math.round(parseNumber(mapped.orderCount, 0))),
      totalSpent: Math.max(0, parseNumber(mapped.totalSpent, 0)),
      lastOrderAt,
      orderHours,
      avgCycleDays: Math.max(7, Math.round(explicitCycle > 0 ? explicitCycle : inferredCycle)),
      lastProduct: lastProductStr,
      tags,
      marketingOptInToken: String(mapped.marketingOptInToken || '').trim(),
    };
  }

  function parseCustomer360File(rawText, filename = '') {
    const trimmed = String(rawText || '').replace(/^\uFEFF/, '').trim();
    if (!trimmed) return [];

    const looksJson = filename.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{');
    if (looksJson) {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.customers) ? parsed.customers : [];
      return arr.map(normalizeC360Row).filter(Boolean);
    }

    const grid = parseCsvRows(trimmed);
    if (grid.length < 2) return [];
    const headers = grid[0];
    const rows = [];

    for (let r = 1; r < grid.length; r++) {
      const row = grid[r];
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] !== undefined ? row[idx] : '';
      });
      const norm = normalizeC360Row(obj);
      if (norm) rows.push(norm);
    }

    return rows;
  }

  function mergeCustomer360IntoContacts(existingContacts, c360Rows, pageId, nowMs = Date.now()) {
    const list = Array.isArray(existingContacts) ? existingContacts.map((c) => ({ ...c })) : [];
    const byPsid = new Map();
    const byNormName = new Map();

    list.forEach((c, idx) => {
      if (c.psid) byPsid.set(String(c.psid), idx);
      const nn = c.normalizedName || normalizeName(c.name);
      if (nn && !byNormName.has(nn)) byNormName.set(nn, idx);
    });

    let matchedCount = 0;
    let createdCount = 0;

    for (const row of c360Rows || []) {
      const normName = normalizeName(row.name);
      let targetIdx = -1;

      if (row.psid && byPsid.has(row.psid)) {
        targetIdx = byPsid.get(row.psid);
      } else if (normName && byNormName.has(normName)) {
        targetIdx = byNormName.get(normName);
      }

      if (targetIdx >= 0) {
        const cur = list[targetIdx];
        const mergedHours = Array.from(
          new Set([...(Array.isArray(cur.orderHours) ? cur.orderHours : []), ...(row.orderHours || [])])
        );
        const mergedTags = Array.from(
          new Set([...(Array.isArray(cur.tags) ? cur.tags : []), ...(row.tags || [])])
        );

        list[targetIdx] = {
          ...cur,
          name: cur.name || row.name,
          psid: cur.psid || row.psid,
          phone: row.phone || cur.phone || '',
          email: row.email || cur.email || '',
          sourceBook: row.sourceBook || cur.sourceBook || '',
          interestTags: Array.from(new Set([...(cur.interestTags || []), ...(row.interestTags || [])])),
          orderCount: Math.max(cur.orderCount || 0, row.orderCount || 0),
          totalSpent: Math.max(cur.totalSpent || 0, row.totalSpent || 0),
          lastOrderAt: row.lastOrderAt || cur.lastOrderAt || null,
          orderHours: mergedHours.length > 0 ? mergedHours : row.orderHours || cur.orderHours || [],
          avgCycleDays: row.avgCycleDays || cur.avgCycleDays || 30,
          lastProduct: row.lastProduct || cur.lastProduct || '',
          tags: mergedTags,
          marketingOptInToken: row.marketingOptInToken || cur.marketingOptInToken || '',
          c360Enriched: true,
        };
        matchedCount += 1;
      } else {
        const syntheticId = row.psid
          ? `${pageId}:${row.psid}`
          : `${pageId}:c360:${normName || createdCount}_${Date.now()}`;
        const newRec = {
          id: syntheticId,
          pageId,
          psid: row.psid || '',
          threadId: '',
          name: row.name || `ลูกค้า ${row.psid}`,
          phone: row.phone || '',
          email: row.email || '',
          sourceBook: row.sourceBook || '',
          interestTags: row.interestTags || [],
          lastInteractionAt: row.lastOrderAt || null,
          lastSnippet: row.lastProduct ? `Customer 360: ${row.lastProduct}` : 'นำเข้าจาก Customer 360',
          messageCount: 0,
          unreadCount: 0,
          orderCount: row.orderCount || 0,
          totalSpent: row.totalSpent || 0,
          lastOrderAt: row.lastOrderAt || null,
          orderHours: row.orderHours || [],
          avgCycleDays: row.avgCycleDays || 30,
          lastProduct: row.lastProduct || '',
          tags: row.tags || [],
          marketingOptInToken: row.marketingOptInToken || '',
          source: 'customer_360',
          c360Enriched: true,
        };
        const newIdx = list.length;
        list.push(newRec);
        if (row.psid) byPsid.set(row.psid, newIdx);
        if (normName && !byNormName.has(normName)) byNormName.set(normName, newIdx);
        createdCount += 1;
      }
    }

    const mergedContacts = list.map((c) => scoreContact(c, nowMs));
    return { mergedContacts, matchedCount, createdCount };
  }

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 4; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function renderPersonalizedMessage(
    template,
    contact = {},
    { segmentOverrides = {}, useSegmentOverrides = false } = {}
  ) {
    let chosenTemplate = template || '';
    if (useSegmentOverrides && segmentOverrides) {
      if (contact.rsvStage && segmentOverrides[contact.rsvStage] && segmentOverrides[contact.rsvStage].trim()) {
        chosenTemplate = segmentOverrides[contact.rsvStage];
      } else if (
        contact.rfmSegment &&
        segmentOverrides[contact.rfmSegment] &&
        segmentOverrides[contact.rfmSegment].trim()
      ) {
        chosenTemplate = segmentOverrides[contact.rfmSegment];
      }
    }

    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    const cleanName = (contact.name || 'คุณธนพล').replace(/^คุณ\s*/, '');
    const rsvInfo = RSV_STAGES[contact.rsvStage] || RSV_STAGES.Prospect;
    const prefTime = formatBangkokTimeLabel(contact.preferredHour !== undefined ? contact.preferredHour : 20);
    const ltvStr = `฿${Math.round(Number(contact.totalSpent) || 0).toLocaleString('th-TH')}`;
    const productStr = contact.lastProduct || 'ชุดความรู้ AI OnePersonCEO';

    let text = String(chosenTemplate)
      .replace(/\{greeting\}/g, greeting)
      .replace(/\{name\}/g, cleanName)
      .replace(/\{segment\}/g, contact.rfmSegment || 'Warm Lead')
      .replace(/\{rsv_stage\}/g, rsvInfo.shortLabel)
      .replace(/\{last_product\}/g, productStr)
      .replace(/\{preferred_time\}/g, prefTime)
      .replace(/\{ltv\}/g, ltvStr)
      .replace(/#\{code\}/g, `#${randomCode()}`)
      .replace(/\{code\}/g, randomCode());

    text = text.replace(/\{([^{}|]+\|[^{}]+)\}/g, (_match, group) => {
      const parts = group.split('|');
      return parts[Math.floor(Math.random() * parts.length)];
    });

    return text;
  }

  function buildHourDistribution(contacts = []) {
    const counts = new Array(24).fill(0);
    for (const c of contacts) {
      const h = Number(c.preferredHour);
      if (Number.isInteger(h) && h >= 0 && h <= 23) {
        counts[h] += 1;
      }
    }
    let peakHour = 20;
    let peakCount = -1;
    counts.forEach((cnt, h) => {
      if (cnt > peakCount) {
        peakCount = cnt;
        peakHour = h;
      }
    });
    return { counts, peakHour, peakCount };
  }

  function generateDemoContacts(count = 240, pageId = 'demo_onepersonceo') {
    const now = Date.now();
    const firstNames = [
      'ธนพล', 'กิตติ', 'ณัฐชา', 'ปรียา', 'วรุตม์', 'ปภาดา', 'ศุภชัย', 'อัญชลี',
      'พิชญ์', 'เมธา', 'กันตภณ', 'วิภาดา', 'จิรายุ', 'ชนิกา', 'ธีรภัทร', 'นฤมล',
      'ภาณุพงศ์', 'สุชาดา', 'อัครพล', 'แพรวา', 'ภควัต', 'รินรดา', 'เอกชัย', 'พิมพ์ชนก',
    ];
    const lastNames = [
      'เจริญสุข', 'วงศ์ไพศาล', 'ศรีสวัสดิ์', 'พงษ์พานิช', 'รัตนโชติ', 'สุวรรณภูมิ',
      'อินทรสมบัติ', 'กิตติคุณ', 'เลิศวิไล', 'มั่นคง', 'ทวีทรัพย์', 'แสงทอง',
    ];
    const products = [
      'AI Digital Empire Suite',
      'คอร์สฉันนี่แหล่ะประธานบริษัท 2.0',
      'E-book คู่มือ OnePersonCEO',
      'ชุด Prompt & Agent Kit 8 แผนก',
      'ระบบ Second Brain (P.A.R.A.)',
    ];
    const hourBuckets = [9, 10, 12, 12, 15, 19, 19, 20, 20, 20, 21, 21, 23, 1];
    const snippets = [
      'สนใจระบบ AI Workforce ครับ ขอรายละเอียดเพิ่ม',
      'โอนเรียบร้อยแล้วครับ รอรับไฟล์คู่มือ',
      'สอบถามคอร์สฉันนี่แหล่ะประธานบริษัท 2.0',
      'ชอบไอเดีย P.A.R.A. มากครับ เอาไปจัดงานได้จริง',
      'อยากได้ Prompt สำหรับวิเคราะห์ลูกค้า eRFM',
      'เคยสั่งชุดแรกไปแล้ว เดือนนี้มีอัปเดตไหมครับ',
    ];

    const results = [];
    for (let i = 0; i < count; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[(i * 3 + Math.floor(i / 8)) % lastNames.length];
      const name = `${fn} ${ln}`;
      const psid = `9900${String(100000 + i).padStart(6, '0')}`;

      const prefHour = hourBuckets[i % hourBuckets.length];
      const mod = i % 10;
      const isWithin24h = mod < 4; // 40% within 24h
      const interHoursAgo = isWithin24h ? (i % 22) + 1 : 30 + (i % 45) * 24;
      const lastInteractionAt = now - interHoursAgo * 3600 * 1000;

      let orderCount = 0;
      let totalSpent = 0;
      let lastOrderAt = null;
      let avgCycleDays = 30;
      let orderHours = [];
      let lastProduct = '';

      if (mod !== 8 && mod !== 9) {
        // 80% have Customer 360 order history
        if (mod === 0 || mod === 1) {
          // Champions / Due Now
          orderCount = 4 + (i % 4);
          totalSpent = 7900 + (i % 6) * 2900;
          lastOrderAt = now - (27 + (i % 8)) * DAY_MS; // ~90-116% of 30d cycle => Due Now!
          avgCycleDays = 30;
        } else if (mod === 2 || mod === 3) {
          // Loyal / Upcoming or Fresh
          orderCount = 3 + (i % 2);
          totalSpent = 4200 + (i % 4) * 1200;
          lastOrderAt = now - (14 + (i % 12)) * DAY_MS;
          avgCycleDays = 30;
        } else if (mod === 4 || mod === 5) {
          // Potential Loyalist
          orderCount = 1 + (i % 2);
          totalSpent = 1290 + (i % 3) * 900;
          lastOrderAt = now - (6 + (i % 10)) * DAY_MS;
          avgCycleDays = 21;
        } else if (mod === 6) {
          // At Risk / Overdue
          orderCount = 2 + (i % 3);
          totalSpent = 3900 + (i % 5) * 1500;
          lastOrderAt = now - (46 + (i % 25)) * DAY_MS;
          avgCycleDays = 30;
        } else {
          // Hibernating
          orderCount = 2;
          totalSpent = 2490;
          lastOrderAt = now - (125 + (i % 40)) * DAY_MS;
          avgCycleDays = 30;
        }
        orderHours = [prefHour, prefHour, (prefHour + 1) % 24];
        lastProduct = products[i % products.length];
      }

      const raw = {
        id: `${pageId}:${psid}`,
        pageId,
        psid,
        threadId: `t_${psid}`,
        name,
        lastInteractionAt,
        lastSnippet: snippets[i % snippets.length],
        messageCount: 3 + (i % 18),
        unreadCount: i % 7 === 0 ? 1 : 0,
        orderCount,
        totalSpent,
        lastOrderAt,
        orderHours,
        avgCycleDays,
        lastProduct,
        marketingOptInToken: i % 5 === 0 ? `mkt_tok_${psid}` : '',
        tags: orderCount >= 4 ? ['VIP', 'AI-CEO'] : orderCount > 0 ? ['Buyer'] : ['Lead'],
        source: 'demo_cdp',
        c360Enriched: orderCount > 0,
      };

      results.push(scoreContact(raw, now));
    }
    return results;
  }

  function generateSampleCsv() {
    const lines = [
      'psid,name,phone,order_count,total_spent,last_order_date,order_time,cycle_days,last_product,tags,marketing_token',
      '9900100001,ธนพล เจริญสุข,0812345678,5,14900,2026-10-23,20:15,30,AI Digital Empire Suite,"VIP,AI-CEO",',
      '9900100002,กิตติ วงศ์ไพศาล,0891112233,3,6800,2026-10-28,12:30,30,คอร์สฉันนี่แหล่ะประธานบริษัท 2.0,Loyal,',
      '9900100003,ณัฐชา ศรีสวัสดิ์,0864445566,1,1590,2026-11-15,09:20,30,E-book คู่มือ OnePersonCEO,NewBuyer,',
      '9900100004,ปรียา พงษ์พานิช,0827778899,4,9500,2026-09-25,21:05,30,ชุด Prompt & Agent Kit 8 แผนก,AtRisk,',
      '9900100005,วรุตม์ รัตนโชติ,0843334455,2,3200,2026-10-24,19:45,30,ระบบ Second Brain (P.A.R.A.),DueSoon,',
      '9900100006,ปภาดา สุวรรณภูมิ,0856667788,6,19800,2026-10-22,23:15,30,AI Digital Empire Suite,VIP,mkt_tok_demo_006',
    ];
    return '\uFEFF' + lines.join('\n');
  }

  const DEFAULT_FOLLOWUP_WORKFLOWS = [
    {
      id: 'wf_ebook_lead_14d',
      slug: 'ebook_lead_magnet_14d',
      sortOrder: 1,
      name: 'Track A: ดูแลผู้อ่าน Ebook ฟรี 14 วัน (Prospect → ลูกค้าชิ้นแรก)',
      trackType: 'lead_magnet',
      stopOnConvert: true,
      respectQuietHours: true,
      isActive: true,
      steps: [
        {
          stepOrder: 0,
          title: 'Day 0: ส่งชุดโบนัสจาก Ebook + ชวนคุยคัดความสนใจ',
          delayDays: 0,
          delayHours: 0,
          rsvFilter: 'ANY',
          rfmFilter: 'ANY',
          message: `{greeting}คุณ {name} ครับ 👋 เสวิญ (OnePersonCEO) เองครับ\n\nขอบคุณที่แวะมารับเนื้อหาจาก {source_book} นะครับ\nอ่านบทความและเครื่องมือเสริมเพิ่มเติมได้ที่: https://onepersonceo.com/go/articles\n\nตอนนี้คุณ {name} สนใจด้านไหนมากที่สุดครับ?\n1 = ทำคอนเทนต์ / เขียน Ebook\n2 = AI Agent & ระบบขายอัตโนมัติ\n3 = Second Brain ตัวเบา\n\nRef: #{code}`,
        },
        {
          stepOrder: 1,
          title: 'Day 1: Quick Win Check-in & ขออีเมลสำรอง',
          delayDays: 1,
          delayHours: 0,
          rsvFilter: 'ANY',
          rfmFilter: 'ANY',
          message: `{greeting}คุณ {name} ครับ ☕ เสวิญแวะมาเช็กความคืบหน้าครับ\n\nลองเลือกงานที่ทำซ้ำทุกสัปดาห์ออกมา 1 อย่าง แล้วเริ่มวางระบบ AI ช่วยก่อนนะครับ\nหากอยากรับไฟล์อัปเดตเก็บไว้อ่านระยะยาว ส่ง "อีเมล" ไว้ในแชทหรือกรอกที่ https://onepersonceo.com/go/free-kit ได้เลยครับ\n\nRef: #{code}`,
        },
        {
          stepOrder: 2,
          title: 'Day 3: War Story + คลัง Ebook ไตรภาค',
          delayDays: 3,
          delayHours: 0,
          rsvFilter: 'ANY',
          rfmFilter: 'ANY',
          message: `{greeting}คุณ {name} ครับ 🙌 เสวิญแวะมาแชร์ประสบการณ์จริงครับ\n\nจากที่เคยบริหารทีมใหญ่ มาสู่บริษัทคนเดียวที่กำไรคล่องตัวกว่าเดิม เสวิญรวมสูตรไว้ในชุด Ebook ไตรภาค (เริ่มต้น ฿190) แล้วครับ\nดูรายละเอียดได้ที่: https://onepersonceo.com/go/ebooks\n\nRef: #{code}`,
        },
        {
          stepOrder: 3,
          title: 'Day 7: Core Bridge → คอร์สฉันนี่แหล่ะประธานบริษัท 2.0',
          delayDays: 7,
          delayHours: 0,
          rsvFilter: 'ANY',
          rfmFilter: 'ANY',
          message: `{greeting}คุณ {name} ครับ 🚀 ครบ 7 วันแล้วครับ!\n\nถ้าอยากลงมือสร้างสมองที่ 2 (P.A.R.A.) และกองทัพ AI Workforce ให้ทำงานแทนจริงใน Workshop "ฉันนี่แหล่ะประธานบริษัท 2.0"\nดูรายละเอียดเพิ่มเติมได้ที่: https://onepersonceo.com/go/ceo2\n\nRef: #{code}`,
        },
        {
          stepOrder: 4,
          title: 'Day 14: คัดแยกทิศทาง & บริการองค์กร',
          delayDays: 14,
          delayHours: 0,
          rsvFilter: 'ANY',
          rfmFilter: 'ANY',
          message: `{greeting}คุณ {name} ครับ 🌟 หากมีองค์กร/ทีมงานและอยากให้เสวิญออกแบบระบบ AI Workforce หรือ OnePerson App ให้โดยเฉพาะ\nดูรายละเอียดได้ที่ https://onepersonceo.com/go/consult หรือตอบแชทมาคุยกันได้เลยครับ\n\nRef: #{code}`,
        },
      ],
    },
    {
      id: 'wf_rsv_post_purchase_21d',
      slug: 'post_purchase_rsv_21d',
      sortOrder: 2,
      name: 'Track B: Post-Purchase RSV Value Ladder (Fresh → Due Now → Overdue)',
      trackType: 'post_purchase_rsv',
      stopOnConvert: false,
      respectQuietHours: true,
      isActive: true,
      steps: [
        {
          stepOrder: 0,
          title: 'Day 0 (Fresh): ดูแลการใช้งานจริงหลังซื้อ',
          delayDays: 0,
          delayHours: 0,
          rsvFilter: 'Fresh',
          rfmFilter: 'ANY',
          message: `{greeting}คุณ {name} ครับ 🙏 ขอบคุณที่รับ {last_product} ไปดูแลครับ\nช่วงแรกเน้นนำไปลองใช้จริงก่อนเลยนะครับ สามารถอ่านบทความเสริมได้ที่ https://onepersonceo.com/go/articles\n\nRef: #{code}`,
        },
        {
          stepOrder: 1,
          title: 'Day 16 (Upcoming): ปูทางต่อยอดระบบอัตโนมัติ',
          delayDays: 16,
          delayHours: 0,
          rsvFilter: 'ANY',
          rfmFilter: 'ANY',
          message: `{greeting}คุณ {name} ครับ 💡 เห็นว่าคุณ {name} อยู่ในกลุ่ม {segment} ({rsv_stage}) — เสวิญมีแนวทางต่อยอดจาก {last_product} สู่ระบบ 4+1 AI Workforce มาฝากครับ: https://onepersonceo.com/go/ceo2\n\nRef: #{code}`,
        },
        {
          stepOrder: 2,
          title: 'Day 21 (Due Now): สิทธิ์ต่อยอดรอบใช้งาน',
          delayDays: 21,
          delayHours: 0,
          rsvFilter: 'ANY',
          rfmFilter: 'ANY',
          message: `{greeting}คุณ {name} ครับ 🔥 ครบรอบการใช้งาน {last_product} แล้วครับ — สำหรับสมาชิกรอบเดิมในกลุ่ม {segment} เสวิญเตรียมสิทธิ์พิเศษคอร์ส ฉันนี่แหล่ะประธานบริษัท 2.0 ไว้ให้ครับ พิมพ์ "ขอสิทธิ์" มาได้เลยครับ!\n\nRef: #{code}`,
        },
      ],
    },
  ];

  function renderWorkflowMessage(template, contact = {}, extra = {}) {
    const base = renderPersonalizedMessage(template, contact);
    const interest =
      extra.interest ||
      (Array.isArray(contact.interestTags) && contact.interestTags[0]) ||
      'AI Workforce & ธุรกิจคนเดียว';
    const sourceBook = extra.sourceBook || contact.sourceBook || contact.lastProduct || 'ชุดความรู้ OnePersonCEO';
    return base
      .replace(/\{source_book\}/g, sourceBook)
      .replace(/\{interest\}/g, interest)
      .replace(/\{email\}/g, contact.email || '')
      .replace(/\{cta_url\}/g, extra.ctaUrl || 'https://onepersonceo.com');
  }

  const api = {
    RFM_SEGMENTS,
    RSV_STAGES,
    GREETINGS,
    DEFAULT_FOLLOWUP_WORKFLOWS,
    normalizeName,
    getBangkokHour,
    formatBangkokTimeLabel,
    computePreferredHour,
    isHourInQuietWindow,
    adjustForQuietHours,
    computeNextScheduledTime,
    scoreContact,
    parseCustomer360File,
    mergeCustomer360IntoContacts,
    renderPersonalizedMessage,
    renderWorkflowMessage,
    buildHourDistribution,
    generateDemoContacts,
    generateSampleCsv,
  };

  global.OnePersonCDP = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
