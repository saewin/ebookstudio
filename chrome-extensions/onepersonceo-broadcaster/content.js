// OnePersonCEO Knowledge Broadcaster — Content Script v2.2.0 for Meta Business Suite Inbox

(() => {
  const SCRIPT_VERSION = '2.2.0';
  if (window.__ONEPERSONCEO_BROADCASTER_VER__ === SCRIPT_VERSION) {
    return;
  }
  window.__ONEPERSONCEO_BROADCASTER_VER__ = SCRIPT_VERSION;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let isDispatchingInProgress = false;

  function isIgnoredOverlayEl(el) {
    return Boolean(el && typeof el.closest === 'function' && el.closest('#healthscale-ingest-bar'));
  }

  function normalizeText(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  }

  function detectPageName() {
    const candidates = [
      'div[role="navigation"] [aria-haspopup="listbox"]',
      'div[role="navigation"] button[aria-expanded]',
      '[data-testid="page-selector"]',
      'a[href*="business.facebook.com/latest/home"]',
    ];

    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) {
        const text = normalizeText(el.innerText || el.textContent);
        if (text && text.length >= 2 && text.length <= 120) {
          return text;
        }
      }
    }

    const allTopButtons = Array.from(document.querySelectorAll('div[role="button"], button')).filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.left < 280 && rect.top > 40 && rect.top < 240 && rect.height > 24 && rect.height < 70;
    });

    for (const btn of allTopButtons) {
      const text = normalizeText(btn.innerText || btn.textContent);
      if (text && !/^(หน้าหลัก|การแจ้งเตือน|กล่องข้อความ|Home|Notifications|Inbox|Meta Business Suite)$/i.test(text)) {
        return text;
      }
    }

    return document.title || 'Meta Business Suite';
  }

  function isScrollableEl(el) {
    if (!el || el === document.body || el === document.documentElement) return false;
    const style = window.getComputedStyle(el);
    const oy = style.overflowY;
    const canScrollStyle = oy === 'auto' || oy === 'scroll' || oy === 'overlay';
    return (canScrollStyle && el.scrollHeight > el.clientHeight + 20) || el.scrollHeight > el.clientHeight + 120;
  }

  function findScrollableAncestor(el) {
    let cur = el ? el.parentElement : null;
    while (cur && cur !== document.body) {
      if (isScrollableEl(cur)) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  const INTERACTIVE_ROLES = new Set(['option', 'button', 'link', 'listitem', 'row', 'menuitem']);

  function isInteractiveElement(el) {
    if (!el) return false;
    if (el.tagName === 'A' || el.tagName === 'BUTTON') return true;
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (INTERACTIVE_ROLES.has(role)) return true;
    return el.getAttribute('tabindex') === '0';
  }

  function looksLikeThreadRow(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 120 || rect.width > 620 || rect.height < 32 || rect.height > 210) return false;
    if (rect.left > window.innerWidth * 0.55) return false;
    const text = normalizeText(el.innerText || '');
    if (text.length < 2) return false;
    return true;
  }

  function parseThreadRow(el) {
    const rawLines = (el.innerText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) return null;

    const lines = rawLines.filter((l) => !/^(ad_id|ad_id\.\.\.|Intake|ลำดับความสำคัญ|ความสำคัญ|และอื่นๆ|ยังไม่ได้อ่าน|•)$/i.test(l));
    if (lines.length === 0) return null;

    const name = lines[0];
    if (
      !name ||
      name.length > 80 ||
      /^(จัดการ|ค้นหา|เรียงตาม|ตัวกรอง|Messenger|Instagram|WhatsApp|ข้อความ|ข้อความทั้งหมด|ทั้งหมด|ยังไม่ได้อ่าน|หน้าหลัก|การแจ้งเตือน|กล่องข้อความ|ศูนย์ข้อมูลลูกค้า|เนื้อหา|แพลนเนอร์|โฆษณา|ข้อมูลเชิงลึก|การสร้างรายได้|เครื่องมือทั้งหมด|การตั้งค่า|ความช่วยเหลือ|ตัวจัดการโฆษณา|ความคิดเห็นบน|การตอบกลับโฆษณา|ระดับความสำคัญ|ลำดับความสำคัญ|ผู้คน)$/i.test(
        name
      )
    ) {
      return null;
    }

    const timeLine =
      lines.find((l) => /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}:\d{2}|เมื่อวาน|วันนี้|นาที|ชม\.|วัน|Yesterday|Today|\d+[mhdw]\b/i.test(l)) || '';
    const snippet = lines.slice(1).find((l) => l !== timeLine && l.length > 1) || '';
    const key = `${name}__${timeLine || snippet.slice(0, 24)}`;

    return {
      key,
      name,
      snippet: snippet.slice(0, 90),
      timeText: timeLine,
      element: el,
    };
  }

  function findRowFromAnchor(anchorEl) {
    let cur = anchorEl ? anchorEl.parentElement : null;
    let bestPointer = null;
    let best = null;
    for (let depth = 0; depth < 9 && cur && cur !== document.body; depth++) {
      const rect = cur.getBoundingClientRect();
      if (rect.width >= 100 && rect.width <= 580 && rect.height >= 28 && rect.height <= 200) {
        if (isInteractiveElement(cur)) {
          return cur;
        }
        if (!bestPointer && rect.height <= 120 && window.getComputedStyle(cur).cursor === 'pointer') {
          bestPointer = cur;
        }
        if (!best && rect.height <= 120) {
          best = cur;
        }
      }
      cur = cur.parentElement;
    }
    return bestPointer || best;
  }

  function extractThreadElements(scopeRoot) {
    const root = scopeRoot || document;
    const candidateEls = new Set();

    // Strategy 1: Links and standard ARIA / tabindex selectors
    const selectorList = [
      'a[href*="/inbox/messenger"]',
      'a[href*="selected_item_id"]',
      'div[role="grid"] div[role="row"]',
      'div[role="list"] div[role="listitem"]',
      'div[role="presentation"] div[tabindex="0"]',
      'div[role="button"][tabindex="0"]',
    ];

    for (const sel of selectorList) {
      try {
        root.querySelectorAll(sel).forEach((el) => {
          if (!isIgnoredOverlayEl(el) && looksLikeThreadRow(el)) candidateEls.add(el);
        });
      } catch {
        // ignore
      }
    }

    // Strategy 2: Detect rows via circular profile avatars (img / svg image) in left thread pane
    const avatars = Array.from(root.querySelectorAll('img, svg image')).filter((img) => {
      if (isIgnoredOverlayEl(img)) return false;
      const r = img.getBoundingClientRect();
      return r.left >= 35 && r.left <= window.innerWidth * 0.45 && r.top >= 80 && r.width >= 24 && r.width <= 68 && r.height >= 24 && r.height <= 68;
    });

    for (const av of avatars) {
      const row = findRowFromAnchor(av);
      if (row && !isIgnoredOverlayEl(row) && looksLikeThreadRow(row)) {
        candidateEls.add(row);
      }
    }

    // Strategy 3: Detect rows via date/time text nodes (e.g. "5/5/25", "16/5/25", "15:40") in left pane
    const dateRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}:\d{2}|เมื่อวาน|วันนี้|Yesterday|Today)$/;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const txt = (node.nodeValue || '').trim();
      if (!txt || txt.length > 16 || !dateRegex.test(txt)) continue;
      const parent = node.parentElement;
      if (!parent || isIgnoredOverlayEl(parent)) continue;
      const r = parent.getBoundingClientRect();
      if (r.left < 50 || r.left > window.innerWidth * 0.45 || r.top < 80) continue;
      const row = findRowFromAnchor(parent);
      if (row && !isIgnoredOverlayEl(row) && looksLikeThreadRow(row)) {
        candidateEls.add(row);
      }
    }

    // Deduplicate nested elements (keep the innermost valid row)
    const list = Array.from(candidateEls);
    const filteredEls = list.filter((el) => !list.some((other) => other !== el && el.contains(other)));

    const results = [];
    const seenKeys = new Set();

    for (const el of filteredEls) {
      const parsed = parseThreadRow(el);
      if (!parsed) continue;
      if (seenKeys.has(parsed.key)) continue;
      seenKeys.add(parsed.key);
      results.push(parsed);
    }

    return results;
  }

  function findThreadListContainer() {
    const rows = extractThreadElements(document);
    if (rows.length > 0) {
      const counts = new Map();
      for (const r of rows) {
        const scroller = findScrollableAncestor(r.element);
        if (scroller) {
          counts.set(scroller, (counts.get(scroller) || 0) + 1);
        }
      }
      let bestScroller = null;
      let maxCount = 0;
      for (const [scroller, count] of counts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestScroller = scroller;
        }
      }
      if (bestScroller) return bestScroller;
      return rows[0].element.parentElement || document.body;
    }

    const scrollables = Array.from(document.querySelectorAll('div')).filter((el) => {
      if (!isScrollableEl(el)) return false;
      const rect = el.getBoundingClientRect();
      return rect.left >= 35 && rect.left <= window.innerWidth * 0.45 && rect.width >= 180 && rect.width <= 540 && rect.height >= 200;
    });
    return scrollables[0] || null;
  }

  async function scanInbox({ maxScrolls = 10, maxContacts = 300 } = {}) {
    const container = findThreadListContainer();
    const initialRows = extractThreadElements(container || document);

    if (!container && initialRows.length === 0) {
      return {
        ok: false,
        error: `[v${SCRIPT_VERSION}] ไม่พบรายการแชทในหน้านี้ กรุณาคลิกเปิดแท็บ "กล่องข้อความ > Messenger" ของเพจ One Person Ceo แล้วลองกดดึงรายชื่ออีกครั้งครับ`,
        contacts: [],
      };
    }

    const collected = new Map();
    if (container && container !== document.body) {
      container.scrollTop = 0;
      await sleep(350);
    }

    for (let i = 0; i <= maxScrolls; i++) {
      const items = extractThreadElements(container || document);
      for (const item of items) {
        if (!collected.has(item.key)) {
          collected.set(item.key, {
            key: item.key,
            name: item.name,
            snippet: item.snippet,
            timeText: item.timeText,
          });
        }
        if (collected.size >= maxContacts) break;
      }

      if (collected.size >= maxContacts) break;
      if (!container || container === document.body) break;

      const prevScrollTop = container.scrollTop;
      container.scrollTop += Math.max(450, container.clientHeight * 0.85);
      await sleep(750);
      if (container.scrollTop === prevScrollTop) break;
    }

    if (container && container !== document.body) {
      container.scrollTop = 0;
    }

    if (collected.size === 0) {
      return {
        ok: false,
        error: `[v${SCRIPT_VERSION}] พบแท็บ Inbox แล้วแต่ยังไม่เห็นรายการแชท กรุณาคลิกไปที่แท็บ Meta Business Suite 1 ครั้งแล้วกลับมากดดึงใหม่ครับ`,
        contacts: [],
      };
    }

    return {
      ok: true,
      version: SCRIPT_VERSION,
      pageName: detectPageName(),
      contacts: Array.from(collected.values()),
    };
  }

  function findInboxSearchInput() {
    const selectors = [
      'input[placeholder*="ค้นหา"]',
      'input[placeholder*="Search"]',
      'input[aria-label*="ค้นหา"]',
      'input[aria-label*="Search"]',
      'div[role="combobox"] input',
      'input[type="search"]',
    ];
    for (const sel of selectors) {
      const candidates = Array.from(document.querySelectorAll(sel));
      for (const inp of candidates) {
        if (isIgnoredOverlayEl(inp)) continue;
        const rect = inp.getBoundingClientRect();
        if (rect.width >= 100 && rect.height >= 20 && rect.left < window.innerWidth * 0.45 && rect.top < 460) {
          return inp;
        }
      }
    }
    return null;
  }

  async function triggerMainWorldClick(el) {
    if (!el) return;
    try {
      document.querySelectorAll('[data-opceo-click-target]').forEach((n) => n.removeAttribute('data-opceo-click-target'));
      el.setAttribute('data-opceo-click-target', '1');
      await chrome.runtime.sendMessage({ target: 'background', action: 'MAIN_WORLD_CLICK' }).catch(() => {});
    } catch {
      // fallback silently
    }
  }

  function findSearchClearButton() {
    const candidates = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], [aria-label]'));
    for (const el of candidates) {
      if (isIgnoredOverlayEl(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.width > 56 || r.height > 56) continue;
      if (r.left < 90 || r.left > window.innerWidth * 0.42 || r.top < 50 || r.top > 380) continue;
      const txt = (el.innerText || '').trim();
      if (txt.includes('จัดการ') || txt.includes('Manage')) continue;
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      if (
        aria.includes('ล้าง') ||
        aria.includes('clear') ||
        aria.includes('ยกเลิกการค้นหา') ||
        aria === 'close' ||
        aria === 'ปิด' ||
        txt === '✕' ||
        txt === '×'
      ) {
        return el.closest('[role="button"], button') || el;
      }
    }
    return null;
  }

  async function resetSearchFilterToBaseline() {
    const clearBtn = findSearchClearButton();
    if (clearBtn) {
      await triggerMainWorldClick(clearBtn);
      robustClick(clearBtn, { singleClick: true });
      await sleep(300);
    }
    const si = findInboxSearchInput();
    if (si && si.value) {
      setNativeInputValue(si, '', { pressEnter: false });
      si.blur?.();
      await sleep(250);
    }
  }

  function getMessengerSectionMinY() {
    const headers = Array.from(document.querySelectorAll('span, div, h1, h2, h3, h4'));
    for (const el of headers) {
      if (isIgnoredOverlayEl(el)) continue;
      const txt = normalizeText(el.textContent || el.innerText || '');
      if (txt.includes('การสนทนาใน MESSENGER') || txt.includes('Conversations in MESSENGER')) {
        const r = el.getBoundingClientRect();
        if (r.left < window.innerWidth * 0.4 && r.height > 10 && r.height < 60 && r.width > 50) {
          return Math.round(r.bottom + 2);
        }
      }
    }
    const si = findInboxSearchInput();
    if (si) {
      const sr = si.getBoundingClientRect();
      if (sr.bottom > 80) return Math.round(sr.bottom + 60);
    }
    return 260;
  }

  function findRowBelowMessengerHeader(targetName) {
    const minY = getMessengerSectionMinY();
    return findTextMatchTargetInLeftPane(targetName, minY);
  }

  function robustClick(el, { singleClick = false } = {}) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 1,
      view: window,
    };
    try {
      if (typeof window.PointerEvent === 'function') {
        el.dispatchEvent(new PointerEvent('pointerdown', { ...mouseOpts, pointerId: 1, pointerType: 'mouse' }));
      }
      el.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
      if (typeof window.PointerEvent === 'function') {
        el.dispatchEvent(new PointerEvent('pointerup', { ...mouseOpts, buttons: 0, pointerId: 1, pointerType: 'mouse' }));
      }
      el.dispatchEvent(new MouseEvent('mouseup', { ...mouseOpts, buttons: 0 }));
      if (!singleClick) {
        el.dispatchEvent(new MouseEvent('click', { ...mouseOpts, buttons: 0 }));
      }
    } catch {
      // ignore
    }
    try {
      if (typeof el.click === 'function') {
        el.click();
      } else if (singleClick) {
        el.dispatchEvent(new MouseEvent('click', { ...mouseOpts, buttons: 0 }));
      }
    } catch {
      // ignore
    }
  }

  function setNativeInputValue(input, val, { pressEnter = false } = {}) {
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    try {
      input.select?.();
      document.execCommand('selectAll', false, null);
      document.execCommand('delete', false, null);
    } catch {
      // ignore
    }
    if (nativeSetter) {
      nativeSetter.call(input, '');
    } else {
      input.value = '';
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));

    if (val) {
      try {
        document.execCommand('insertText', false, val);
      } catch {
        // ignore
      }
    }
    if (input.value !== val) {
      if (nativeSetter) {
        nativeSetter.call(input, val);
      } else {
        input.value = val;
      }
    }
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: val }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    if (pressEnter) {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
      );
      input.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
      );
    }
  }

  function normalizeCompareName(str) {
    return normalizeText(str).toLowerCase().replace(/^คุณ\s*/i, '');
  }

  function findTextMatchTargetInLeftPane(targetName, minTop = 110) {
    const targetNorm = normalizeCompareName(targetName);
    if (!targetNorm) return null;
    const primaryToken = targetNorm.split(' ').find((w) => w.length >= 3) || targetNorm;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    let includesMatch = null;
    let tokenMatch = null;

    while ((node = walker.nextNode())) {
      const raw = normalizeCompareName(node.nodeValue || '');
      if (!raw || raw.length < 2) continue;
      if (node.parentElement && (node.parentElement.closest('input, textarea') || isIgnoredOverlayEl(node.parentElement))) continue;

      const parent = node.parentElement;
      if (!parent) continue;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.left < 20 || rect.left > window.innerWidth * 0.32 || rect.top < minTop) continue;

      const isExact = raw === targetNorm;
      const isIncludes = raw.includes(targetNorm) || (raw.length >= 3 && targetNorm.includes(raw));
      const isToken = primaryToken.length >= 3 && raw.includes(primaryToken);
      if (!isExact && !isIncludes && !isToken) continue;

      const interactiveClosest = parent.closest(
        'a, button, [role="option"], [role="button"], [role="link"], [role="listitem"], [role="row"], [role="menuitem"], [tabindex="0"]'
      );
      let rowEl = null;
      if (interactiveClosest) {
        const r = interactiveClosest.getBoundingClientRect();
        if (r.width >= 80 && r.width <= 580 && r.height >= 24 && r.height <= 160) {
          rowEl = interactiveClosest;
        }
      }
      if (!rowEl) {
        const anchorRow = findRowFromAnchor(parent);
        if (anchorRow && anchorRow.getBoundingClientRect().height <= 120) {
          rowEl = anchorRow;
        }
      }
      if (!rowEl) {
        rowEl = parent;
      }

      const candidate = { textEl: parent, rowEl };
      if (isExact) return candidate;
      if (isIncludes && !includesMatch) includesMatch = candidate;
      if (isToken && !tokenMatch) tokenMatch = candidate;
    }

    return includesMatch || tokenMatch;
  }

  function detectActiveChatHeaderName() {
    const minX = window.innerWidth * 0.29;
    const maxX = window.innerWidth * 0.65;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    const candidates = [];

    while ((node = walker.nextNode())) {
      const raw = normalizeText(node.nodeValue || '');
      if (!raw || raw.length < 2 || raw.length > 80) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest('input, textarea, button') || isIgnoredOverlayEl(parent)) continue;
      if (
        /^(มอบหมายการสนทนานี้|ดูโปรไฟล์|ข้อมูลลูกค้า|แก้ไข|ตอบกลับใน|เพิ่มหมายเลข|ความคิดเห็นบน Facebook|ความคิดเห็นบน Instagram|Messenger|Instagram|WhatsApp)$/i.test(
          raw
        )
      ) {
        continue;
      }
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.left < minX || rect.left > maxX || rect.top < 120 || rect.top > 360) continue;
      candidates.push({ text: raw, top: rect.top, left: rect.left });
    }

    candidates.sort((a, b) => a.top - b.top || a.left - b.left);
    return candidates.length > 0 ? candidates[0].text : '';
  }

  function verifyActiveChatMatches(targetName) {
    const targetNorm = normalizeCompareName(targetName);
    if (!targetNorm) return true;
    const primaryToken = targetNorm.split(' ').find((w) => w.length >= 3) || targetNorm;

    const minX = window.innerWidth * 0.29;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;

    while ((node = walker.nextNode())) {
      const txt = normalizeCompareName(node.nodeValue || '');
      if (!txt || txt.length < 2) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest('input, textarea') || isIgnoredOverlayEl(parent)) continue;
      const rect = parent.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.left < minX || rect.top < 40 || rect.top > 520) continue;

      if (txt === targetNorm || txt.includes(targetNorm) || (primaryToken.length >= 3 && txt.includes(primaryToken))) {
        return true;
      }
    }

    return false;
  }

  async function waitUntilActiveChatMatches(targetName, maxMs = 2400) {
    const steps = Math.max(1, Math.ceil(maxMs / 250));
    for (let i = 0; i < steps; i++) {
      if (verifyActiveChatMatches(targetName)) return true;
      await sleep(250);
    }
    return verifyActiveChatMatches(targetName);
  }

  async function findAndClickContact(targetName, targetKey) {
    if (verifyActiveChatMatches(targetName)) {
      return { ok: true, alreadyOpen: true };
    }

    // State 1: Reset search filter to baseline ("หน้ากลาง") before every search
    await resetSearchFilterToBaseline();

    const container = findThreadListContainer();
    const targetNorm = normalizeCompareName(targetName);
    const searchInput = findInboxSearchInput();

    // Step A: Check currently rendered rows when search box is empty
    if (!searchInput || !searchInput.value.trim()) {
      const initialItems = extractThreadElements(container || document);
      const immediateMatch =
        initialItems.find((i) => i.key === targetKey) ||
        initialItems.find((i) => normalizeCompareName(i.name) === targetNorm);
      if (immediateMatch && immediateMatch.element) {
        immediateMatch.element.scrollIntoView({ behavior: 'auto', block: 'center' });
        await sleep(150);
        await triggerMainWorldClick(immediateMatch.element);
        robustClick(immediateMatch.element);
        if (await waitUntilActiveChatMatches(targetName, 2000)) {
          return { ok: true };
        }
      }
    }

    let diagnosticReason = '';

    // Step B: Search via Inbox Search Input + 2-Step Selection (Click #1 dropdown -> Click #2 below Messenger header)
    if (searchInput && targetName) {
      setNativeInputValue(searchInput, targetName, { pressEnter: false });

      let foundTextMatch = null;
      let foundThreadMatch = null;
      for (let tick = 0; tick < 20; tick++) {
        await sleep(300);
        const searchRect = searchInput.getBoundingClientRect();
        const minTop = Math.max(110, searchRect.bottom - 5);

        const textMatch = findTextMatchTargetInLeftPane(targetName, minTop);
        const searchedItems = extractThreadElements(document).filter((item) => {
          if (!item.element) return false;
          const r = item.element.getBoundingClientRect();
          return r.top >= minTop && r.left <= window.innerWidth * 0.35;
        });
        const threadMatch =
          searchedItems.find((i) => normalizeCompareName(i.name) === targetNorm) ||
          searchedItems.find((i) => normalizeCompareName(i.name).includes(targetNorm)) ||
          searchedItems.find(
            (i) => targetNorm.includes(normalizeCompareName(i.name)) && normalizeCompareName(i.name).length >= 3
          );

        if (textMatch || threadMatch) {
          await sleep(250);
          const settledRect = searchInput.getBoundingClientRect();
          const settledMinTop = Math.max(110, settledRect.bottom - 5);
          foundTextMatch = findTextMatchTargetInLeftPane(targetName, settledMinTop) || textMatch;
          const settledItems = extractThreadElements(document).filter((item) => {
            if (!item.element) return false;
            const r = item.element.getBoundingClientRect();
            return r.top >= settledMinTop && r.left <= window.innerWidth * 0.35;
          });
          foundThreadMatch =
            settledItems.find((i) => normalizeCompareName(i.name) === targetNorm) ||
            settledItems.find((i) => normalizeCompareName(i.name).includes(targetNorm)) ||
            threadMatch;
          break;
        }
      }

      const click1El =
        (foundTextMatch && (foundTextMatch.rowEl || foundTextMatch.textEl)) ||
        (foundThreadMatch && foundThreadMatch.element) ||
        null;

      if (click1El) {
        click1El.scrollIntoView({ behavior: 'auto', block: 'center' });
        await sleep(150);
        // Click #1: Dropdown popup item via MAIN world React Fiber click
        await triggerMainWorldClick(click1El);
        robustClick(click1El);
        if (await waitUntilActiveChatMatches(targetName, 1400)) {
          return { ok: true, usedSearch: true };
        }

        // Click #2: Conversation row strictly below "การสนทนาใน MESSENGER"
        await sleep(400);
        const belowHeaderMatch = findRowBelowMessengerHeader(targetName);
        const click2El = belowHeaderMatch ? belowHeaderMatch.rowEl || belowHeaderMatch.textEl : null;
        if (click2El) {
          click2El.scrollIntoView({ behavior: 'auto', block: 'center' });
          await sleep(150);
          await triggerMainWorldClick(click2El);
          robustClick(click2El);
          if (await waitUntilActiveChatMatches(targetName, 2400)) {
            return { ok: true, usedSearch: true };
          }
        }
      }

      if (click1El) {
        const actualHeader = detectActiveChatHeaderName();
        diagnosticReason = `พบ "${targetName}" ในผลค้นหาแล้วแต่หน้าแชทยังไม่สลับเปิดแชทนี้${actualHeader ? ` (หน้าแชทยังอยู่ที่ "${actualHeader}")` : ''}`;
      } else {
        diagnosticReason = `ไม่พบรายชื่อ "${targetName}" ในผลค้นหาของ Meta Business Suite`;
      }

      await resetSearchFilterToBaseline();
    }

    // Step C: Fallback to scrolling the thread container
    if (!container) {
      return { ok: false, error: diagnosticReason || `ไม่พบแถบรายการแชทหรือช่องค้นหาสำหรับ "${targetName}"` };
    }

    container.scrollTop = 0;
    await sleep(250);

    for (let attempt = 0; attempt < 60; attempt++) {
      const items = extractThreadElements(container);
      const exactMatch =
        items.find((i) => i.key === targetKey) ||
        items.find((i) => normalizeCompareName(i.name) === targetNorm);
      if (exactMatch && exactMatch.element) {
        exactMatch.element.scrollIntoView({ behavior: 'auto', block: 'center' });
        await sleep(150);
        await triggerMainWorldClick(exactMatch.element);
        robustClick(exactMatch.element);
        if (await waitUntilActiveChatMatches(targetName, 1800)) {
          return { ok: true };
        }
      }

      const prevTop = container.scrollTop;
      container.scrollTop += Math.max(400, container.clientHeight * 0.8);
      await sleep(450);
      if (container.scrollTop === prevTop) break;
    }

    const fallbackHeader = detectActiveChatHeaderName();
    return {
      ok: false,
      error:
        diagnosticReason ||
        `ไม่พบแชทของ "${targetName}" ในกล่องข้อความ Meta Business Suite${fallbackHeader ? ` (หน้าแชทปัจจุบัน: "${fallbackHeader}")` : ''}`,
    };
  }

  function findMessageComposer() {
    // Meta Business Suite Messenger composer is typically a textarea or contenteditable textbox near the bottom-center
    const candidates = [
      'textarea[placeholder*="Messenger"]',
      'textarea[placeholder*="ตอบกลับ"]',
      'textarea[placeholder*="Reply"]',
      'div[role="textbox"][contenteditable="true"]',
      'textarea',
    ];

    for (const sel of candidates) {
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (
          rect.width > 180 &&
          rect.height >= 18 &&
          rect.bottom > window.innerHeight * 0.5 &&
          rect.left >= window.innerWidth * 0.24
        ) {
          return node;
        }
      }
    }
    return null;
  }

  function dispatchPasteEvent(target, dt) {
    let pasteEv;
    try {
      pasteEv = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt });
    } catch {
      pasteEv = new Event('paste', { bubbles: true, cancelable: true });
    }
    if (!pasteEv.clipboardData) {
      try {
        Object.defineProperty(pasteEv, 'clipboardData', { value: dt, configurable: true });
      } catch {
        // ignore
      }
    }
    target.dispatchEvent(pasteEv);
  }

  function dispatchDragEvent(target, type, dt) {
    let ev;
    try {
      if (typeof window.DragEvent === 'function') {
        ev = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
      } else {
        ev = new Event(type, { bubbles: true, cancelable: true });
      }
    } catch {
      ev = new Event(type, { bubbles: true, cancelable: true });
    }
    if (!ev.dataTransfer) {
      try {
        Object.defineProperty(ev, 'dataTransfer', { value: dt, configurable: true });
      } catch {
        // ignore
      }
    }
    target.dispatchEvent(ev);
  }

  async function setComposerText(composer, text) {
    composer.focus();

    if (composer.tagName === 'TEXTAREA' || composer.tagName === 'INPUT') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(composer, text);
      } else {
        composer.value = text;
      }
      composer.dispatchEvent(new Event('input', { bubbles: true }));
      composer.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // contenteditable div (Lexical / Draft.js): clear existing text first
    const selection = window.getSelection ? window.getSelection() : null;
    if (selection && typeof document.createRange === 'function') {
      const range = document.createRange();
      range.selectNodeContents(composer);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (typeof document.execCommand === 'function') {
      try {
        document.execCommand('delete', false);
      } catch {
        // ignore
      }
    }

    let pastedOk = false;
    if (typeof DataTransfer === 'function') {
      try {
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        dispatchPasteEvent(composer, dt);
        await sleep(120);
        pastedOk = normalizeText(composer.textContent).length > 0;
      } catch {
        pastedOk = false;
      }
    }

    // Fallback ONCE only when paste left composer empty (never dispatch duplicate InputEvent with data)
    if (!pastedOk) {
      if (typeof document.execCommand === 'function') {
        try {
          document.execCommand('insertText', false, text);
          if (normalizeText(composer.textContent).length > 0) return;
        } catch {
          // ignore
        }
      }
      composer.textContent = text;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function clickSendButton(composer, { allowEnterFallback = false } = {}) {
    const excludedPattern = /(ส่งโดย|ส่งต่อ|forward|ถูกใจ|like|แนบ|attach|สติกเกอร์|sticker|อิโมจิ|emoji|บันทึก|note|รูปภาพ|image|วิดีโอ|video|ไฟล์|file|สร้างโฆษณา)/i;
    const positivePattern = /^(ส่ง|send|กด\s*enter\s*เพื่อส่ง|press\s*enter\s*to\s*send)$/i;

    const buttons = Array.from(
      document.querySelectorAll('button, div[role="button"], span[role="button"], [data-testid="send-button"]')
    );

    let bestBtn = null;
    for (const btn of buttons) {
      if (isIgnoredOverlayEl(btn)) continue;
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') continue;
      const rect = btn.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      if (rect.bottom <= window.innerHeight * 0.65 || rect.left <= window.innerWidth * 0.28) continue;

      const label = normalizeText(btn.getAttribute('aria-label') || btn.getAttribute('title') || btn.textContent || '');
      const testId = btn.getAttribute('data-testid') || '';
      if (label && excludedPattern.test(label)) continue;

      if (
        testId === 'send-button' ||
        (label && (positivePattern.test(label) || /(^ส่ง$|send|กด\s*enter|press\s*enter)/i.test(label)))
      ) {
        bestBtn = btn;
        break;
      }
    }

    // Zero-Duplicate SOP: Click Send ONCE (never press Enter after clicking Send!)
    if (bestBtn) {
      robustClick(bestBtn, { singleClick: true });
    } else if (allowEnterFallback && composer) {
      composer.focus();
      const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      composer.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
      composer.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
      composer.dispatchEvent(new KeyboardEvent('keyup', enterOpts));
    } else {
      return { ok: false, error: 'ไม่พบปุ่มส่งข้อความในแถบแชท (ยกเลิกเพื่อป้องกันการส่งผิดพลาด)' };
    }

    // Passive Verification Loop (up to 10s = 20 x 500ms) — strictly passive, NEVER re-click Send
    for (let tick = 0; tick < 20; tick++) {
      await sleep(500);
      const currentComposer = findMessageComposer() || composer;
      const remainingText = normalizeText(
        currentComposer
          ? currentComposer.tagName === 'TEXTAREA' || currentComposer.tagName === 'INPUT'
            ? currentComposer.value
            : currentComposer.textContent
          : ''
      );
      const remainingAttachments = countComposerAttachmentPreviews(currentComposer);
      if (remainingText.length === 0 && remainingAttachments === 0) {
        return { ok: true };
      }
    }

    // Timeout after 10s: clear composer so text does not leak to the next contact
    if (composer) {
      await setComposerText(composer, '').catch(() => {});
    }
    return { ok: false, error: 'ส่งไม่สำเร็จภายใน 10 วินาที (ล้างช่องพิมพ์ป้องกันส่งค้าง)' };
  }

  function dataUrlToFileInPage(dataUrl, name = 'image.png', type = 'image/png') {
    const parts = String(dataUrl || '').split(',');
    const header = parts[0] || '';
    const b64 = parts[1] || '';
    const mimeMatch = header.match(/data:([^;]+);/i);
    const mime = type || (mimeMatch ? mimeMatch[1] : 'image/png');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    return new File([blob], name, { type: mime });
  }

  function countComposerAttachmentPreviews(composer) {
    const minY = window.innerHeight * 0.52;
    const minX = window.innerWidth * 0.24;
    const seen = new Set();

    const imgs = Array.from(document.querySelectorAll('img[src^="blob:"], img[src^="data:"]'));
    for (const img of imgs) {
      const r = img.getBoundingClientRect();
      if (r.width >= 20 && r.height >= 20 && r.top > minY && r.left > minX) {
        seen.add(img);
      }
    }

    const removeSelectors = [
      '[aria-label*="ลบ"]',
      '[aria-label*="Remove"]',
      '[aria-label*="เอาออก"]',
      '[aria-label*="นำรูปภาพออก"]',
    ];
    for (const sel of removeSelectors) {
      const els = Array.from(document.querySelectorAll(sel));
      for (const el of els) {
        if (composer && composer.contains(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.top > minY && r.left > minX) {
          seen.add(el);
        }
      }
    }

    return seen.size;
  }

  function findComposerFileInput(composer) {
    let cur = composer ? composer.parentElement : null;
    for (let depth = 0; depth < 8 && cur && cur !== document.body; depth++) {
      const localInputs = Array.from(cur.querySelectorAll('input[type="file"]'));
      const match =
        localInputs.find((inp) => (inp.accept || '').toLowerCase().includes('image')) ||
        localInputs[0];
      if (match) return match;
      cur = cur.parentElement;
    }

    const allInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    const centerOrImage = allInputs.filter((inp) => {
      const accept = (inp.accept || '').toLowerCase();
      if (accept.includes('image')) return true;
      const pRect = inp.parentElement ? inp.parentElement.getBoundingClientRect() : null;
      return pRect && pRect.left >= window.innerWidth * 0.24 && pRect.bottom >= window.innerHeight * 0.5;
    });

    return centerOrImage[centerOrImage.length - 1] || allInputs[allInputs.length - 1] || null;
  }

  async function waitForAttachmentPreviewIncrease(composer, beforeCount, maxMs = 2200) {
    const steps = Math.max(1, Math.ceil(maxMs / 250));
    for (let i = 0; i < steps; i++) {
      if (countComposerAttachmentPreviews(composer) > beforeCount) return true;
      await sleep(250);
    }
    return countComposerAttachmentPreviews(composer) > beforeCount;
  }

  async function attachImagesToComposer(composer, imagesDataUrls) {
    if (!Array.isArray(imagesDataUrls) || imagesDataUrls.length === 0) {
      return { ok: true, method: 'none' };
    }

    const dt = new DataTransfer();
    for (let i = 0; i < imagesDataUrls.length; i++) {
      const item = imagesDataUrls[i];
      if (!item || !item.dataUrl) continue;
      const file = dataUrlToFileInPage(item.dataUrl, item.name || `image-${i + 1}.png`, item.type || 'image/png');
      dt.items.add(file);
    }

    if (dt.files.length === 0) return { ok: true, method: 'none' };

    const beforeCount = countComposerAttachmentPreviews(composer);

    // Method 1: ClipboardEvent('paste') on composer
    if (composer) {
      composer.focus();
      dispatchPasteEvent(composer, dt);
      if (await waitForAttachmentPreviewIncrease(composer, beforeCount, 2200)) {
        await sleep(1200);
        return { ok: true, method: 'paste' };
      }
    }

    // Method 2: input[type="file"] in composer zone
    const fileInput = findComposerFileInput(composer);
    if (fileInput) {
      try {
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        if (await waitForAttachmentPreviewIncrease(composer, beforeCount, 2200)) {
          await sleep(1200);
          return { ok: true, method: 'file_input' };
        }
      } catch {
        // continue to Method 3
      }
    }

    // Method 3: DragEvent drop on composer / parent container
    const dropTargets = [composer, composer ? composer.parentElement : null].filter(Boolean);
    for (const target of dropTargets) {
      dispatchDragEvent(target, 'dragenter', dt);
      dispatchDragEvent(target, 'dragover', dt);
      dispatchDragEvent(target, 'drop', dt);
      if (await waitForAttachmentPreviewIncrease(composer, beforeCount, 2200)) {
        await sleep(1200);
        return { ok: true, method: 'drop' };
      }
    }

    return {
      ok: false,
      error: 'แนบรูปภาพลงช่องแชท Meta Business Suite ไม่สำเร็จ (ไม่พบภาพตัวอย่างก่อนส่ง) — ข้ามเพื่อป้องกันส่งข้อความเปล่าโดยไม่มีรูป',
    };
  }

  async function sendMessageToContact({
    name,
    key,
    message,
    autoSend = false,
    imagesDataUrls = [],
    sendOrder = 'image_first',
  }) {
    if (isDispatchingInProgress) {
      return { ok: false, error: 'กำลังส่งลูกค้ารายก่อนหน้าอยู่ กรุณารอสักครู่' };
    }
    isDispatchingInProgress = true;
    let opened = { ok: false, usedSearch: false };

    try {
      opened = await findAndClickContact(name, key);
      if (!opened.ok) return opened;

      // State 3: Pre-Compose Verification Guard (never touch composer before active chat matches!)
      let composer = null;
      let matchedHeader = false;
      for (let i = 0; i < 8; i++) {
        composer = findMessageComposer();
        matchedHeader = verifyActiveChatMatches(name);
        if (composer && matchedHeader) break;
        await sleep(500);
      }

      if (!matchedHeader) {
        const actualHeader = detectActiveChatHeaderName();
        const headerHint = actualHeader ? ` (หน้าแชทยังอยู่ที่ "${actualHeader}")` : '';
        return { ok: false, error: `เปิดแชทไม่ตรงชื่อ "${name}"${headerHint} — ข้ามเพื่อป้องกันส่งผิดคน` };
      }

      if (!composer) {
        return { ok: false, error: 'ไม่พบช่องพิมพ์ข้อความตอบกลับในแชทนี้ (อาจหมดเวลาหน้าต่างตอบกลับหรือแชทถูกปิด)' };
      }

      const hasImages = Array.isArray(imagesDataUrls) && imagesDataUrls.length > 0;
      const hasText = Boolean(message && String(message).trim());

      if (hasImages && hasText && sendOrder === 'text_first' && autoSend) {
        await setComposerText(composer, message);
        await sleep(450);
        const textSendRes = await clickSendButton(composer, { allowEnterFallback: true });
        if (!textSendRes.ok) return textSendRes;
        await sleep(600);

        composer = findMessageComposer() || composer;
        const att = await attachImagesToComposer(composer, imagesDataUrls);
        if (!att.ok) return att;

        const imgSendRes = await clickSendButton(composer, { allowEnterFallback: false });
        if (!imgSendRes.ok) return imgSendRes;
        return { ok: true, mode: 'sent' };
      }

      if (hasImages) {
        const att = await attachImagesToComposer(composer, imagesDataUrls);
        if (!att.ok) return att;
      }

      if (hasText) {
        await setComposerText(composer, message);
        await sleep(450);
      }

      if (autoSend) {
        const sendRes = await clickSendButton(composer, { allowEnterFallback: !hasImages });
        if (!sendRes.ok) return sendRes;
        return { ok: true, mode: 'sent' };
      }

      return { ok: true, mode: 'draft' };
    } finally {
      isDispatchingInProgress = false;
      // State 5: Post-Send Teardown & Loop Reset
      await resetSearchFilterToBaseline().catch(() => {});
    }
  }

  if (window.__ONEPERSONCEO_MSG_HANDLER__) {
    try {
      chrome.runtime.onMessage.removeListener(window.__ONEPERSONCEO_MSG_HANDLER__);
    } catch {
      // ignore
    }
  }

  window.__ONEPERSONCEO_MSG_HANDLER__ = (message, _sender, sendResponse) => {
    if (!message || !message.type) return false;

    if (message.type === 'PING') {
      sendResponse({ ok: true, version: SCRIPT_VERSION });
      return false;
    }

    (async () => {
      try {
        if (message.type === 'CHECK_STATUS') {
          const isInbox = window.location.href.includes('/inbox');
          const pageName = detectPageName();
          const hasList = Boolean(findThreadListContainer() || findInboxSearchInput());
          sendResponse({
            ok: true,
            version: SCRIPT_VERSION,
            isInbox,
            pageName,
            hasList,
            url: window.location.href,
          });
          return;
        }

        if (message.type === 'SCAN_INBOX') {
          const result = await scanInbox(message.payload || {});
          sendResponse(result);
          return;
        }

        if (message.type === 'SEND_MESSAGE') {
          const result = await sendMessageToContact(message.payload || {});
          sendResponse(result);
          return;
        }

        sendResponse({ ok: false, error: `Unknown action: ${message.type}` });
      } catch (err) {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return true;
  };

  chrome.runtime.onMessage.addListener(window.__ONEPERSONCEO_MSG_HANDLER__);
})();

