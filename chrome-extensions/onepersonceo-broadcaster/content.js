// OnePersonCEO Knowledge Broadcaster — Content Script v1.1.0 (Unlimited Sync + RFM Labels + Strict Verify)

(() => {
  const SCRIPT_VERSION = '1.1.0';
  if (window.__ONEPERSONCEO_BROADCASTER_VER__ === SCRIPT_VERSION) {
    return;
  }
  window.__ONEPERSONCEO_BROADCASTER_VER__ = SCRIPT_VERSION;

  let stopScanRequested = false;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  function looksLikeThreadRow(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 140 || rect.width > 620 || rect.height < 42 || rect.height > 210) return false;
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

    // Extract Meta Inbox badge/label tags for RFM/Lead classification
    const labelRegex = /^(ad_id.*|Intake|ลำดับความสำคัญ|ความสำคัญ|การรับข้อมูล|ลูกค้าใหม่|โอนแล้ว|ซื้อแล้ว|VIP|Workshop|สนใจ)$/i;
    const labels = rawLines.filter((l) => labelRegex.test(l));

    const lines = rawLines.filter((l) => !labelRegex.test(l) && !/^(และอื่นๆ|ยังไม่ได้อ่าน|•)$/i.test(l));
    if (lines.length === 0) return null;

    const name = lines[0];
    if (
      !name ||
      name.length > 80 ||
      /^(จัดการ|ค้นหา|เรียงตาม|ตัวกรอง|Messenger|Instagram|WhatsApp|ข้อความ|ข้อความทั้งหมด|ทั้งหมด|ยังไม่ได้อ่าน|หน้าหลัก|การแจ้งเตือน|กล่องข้อความ|ศูนย์ข้อมูลลูกค้า|เนื้อหา|แพลนเนอร์|โฆษณา|ข้อมูลเชิงลึก|การสร้างรายได้|เครื่องมือทั้งหมด|การตั้งค่า|ความช่วยเหลือ|ตัวจัดการโฆษณา|ความคิดเห็นบน|การตอบกลับโฆษณา|ระดับความสำคัญ|ลำดับความสำคัญ)$/i.test(
        name
      )
    ) {
      return null;
    }

    const timeLine =
      lines.find((l) => /\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}:\d{2}|เมื่อวาน|วันนี้|นาที|ชม\.|วัน|Yesterday|Today|\d+[mhdw]\b/i.test(l)) || '';
    const snippet = lines.slice(1).find((l) => l !== timeLine && l.length > 1) || '';
    const key = `${name.toLowerCase()}__${timeLine || snippet.slice(0, 24)}`;

    return {
      key,
      name,
      snippet: snippet.slice(0, 90),
      timeText: timeLine,
      labels,
      element: el,
    };
  }

  function findRowFromAnchor(anchorEl) {
    let cur = anchorEl.parentElement;
    let best = null;
    for (let depth = 0; depth < 9 && cur && cur !== document.body; depth++) {
      const rect = cur.getBoundingClientRect();
      if (rect.width >= 160 && rect.width <= 580 && rect.height >= 48 && rect.height <= 200) {
        best = cur;
        if (
          cur.tagName === 'A' ||
          cur.getAttribute('role') === 'button' ||
          cur.getAttribute('role') === 'listitem' ||
          cur.getAttribute('role') === 'row' ||
          cur.getAttribute('tabindex') === '0'
        ) {
          return cur;
        }
      }
      cur = cur.parentElement;
    }
    return best;
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
          if (looksLikeThreadRow(el)) candidateEls.add(el);
        });
      } catch {
        // ignore
      }
    }

    // Strategy 2: Detect rows via circular profile avatars (img / svg image) in left thread pane
    const avatars = Array.from(root.querySelectorAll('img, svg image')).filter((img) => {
      const r = img.getBoundingClientRect();
      return r.left >= 35 && r.left <= window.innerWidth * 0.45 && r.top >= 80 && r.width >= 24 && r.width <= 68 && r.height >= 24 && r.height <= 68;
    });

    for (const av of avatars) {
      const row = findRowFromAnchor(av);
      if (row && looksLikeThreadRow(row)) {
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
      if (!parent) continue;
      const r = parent.getBoundingClientRect();
      if (r.left < 50 || r.left > window.innerWidth * 0.45 || r.top < 80) continue;
      const row = findRowFromAnchor(parent);
      if (row && looksLikeThreadRow(row)) {
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

  function normalizeForCompare(str) {
    return (str || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function getActiveChatHeaderTexts() {
    const texts = [];
    const vw = window.innerWidth;
    // Center chat header (above conversation messages) and right profile panel top
    const nodes = document.querySelectorAll('h1, h2, h3, h4, span, div, a');
    for (const el of nodes) {
      if (el.children.length > 2) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10 || rect.height > 60) continue;
      // Center pane header or right profile card header
      const inCenterHeader = rect.left >= vw * 0.24 && rect.left <= vw * 0.72 && rect.top >= 110 && rect.top <= 340;
      const inRightHeader = rect.left >= vw * 0.72 && rect.top >= 110 && rect.top <= 320;
      if (!inCenterHeader && !inRightHeader) continue;

      const t = normalizeText(el.innerText || el.textContent);
      if (t && t.length >= 2 && t.length <= 90) {
        texts.push(t);
      }
    }
    return texts;
  }

  function isActiveChatMatching(targetName) {
    const want = normalizeForCompare(targetName);
    if (!want) return false;
    const headerTexts = getActiveChatHeaderTexts();
    return headerTexts.some((t) => {
      const got = normalizeForCompare(t);
      return got === want || (got.length >= 3 && (got.includes(want) || want.includes(got)));
    });
  }

  function triggerRealClick(rowEl) {
    const clickable =
      rowEl.querySelector('a[href], [role="button"], [tabindex="0"]') ||
      rowEl;

    const rect = clickable.getBoundingClientRect();
    const clientX = rect.left + Math.min(rect.width / 2, 80);
    const clientY = rect.top + rect.height / 2;

    const opts = { bubbles: true, cancelable: true, view: window, clientX, clientY };
    clickable.dispatchEvent(new MouseEvent('mouseover', opts));
    clickable.dispatchEvent(new MouseEvent('mousedown', opts));
    clickable.dispatchEvent(new MouseEvent('mouseup', opts));
    clickable.dispatchEvent(new MouseEvent('click', opts));
    if (typeof clickable.click === 'function') {
      clickable.click();
    }
  }

  async function findAndClickContact(targetName, targetKey) {
    // If already open on the exact target chat, verify and proceed
    if (isActiveChatMatching(targetName)) {
      return { ok: true, verified: true };
    }

    const container = findThreadListContainer();
    if (!container) return { ok: false, error: 'ไม่พบแถบรายการแชทฝั่งซ้าย' };

    if (container !== document.body) {
      container.scrollTop = 0;
      await sleep(250);
    }

    for (let attempt = 0; attempt < 25; attempt++) {
      const items = extractThreadElements(container);
      const exactMatch =
        items.find((i) => i.key === targetKey) ||
        items.find((i) => normalizeForCompare(i.name) === normalizeForCompare(targetName));

      if (exactMatch && exactMatch.element) {
        exactMatch.element.scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(250);
        triggerRealClick(exactMatch.element);

        // STRICT VERIFICATION: wait up to 4.5s for the center chat header to actually switch to targetName
        for (let check = 0; check < 15; check++) {
          await sleep(300);
          if (isActiveChatMatching(targetName)) {
            await sleep(250);
            return { ok: true, verified: true };
          }
        }

        // Retry click once on the outer row element itself
        triggerRealClick(exactMatch.element.parentElement || exactMatch.element);
        for (let check = 0; check < 10; check++) {
          await sleep(300);
          if (isActiveChatMatching(targetName)) {
            await sleep(250);
            return { ok: true, verified: true };
          }
        }

        return {
          ok: false,
          error: `ป้องกันการส่งผิดคน: คลิกแชท "${targetName}" แล้วแต่หน้าแชทตรงกลางไม่เปลี่ยนตาม (ข้ามคนนี้เพื่อความปลอดภัย)`,
        };
      }

      if (container === document.body) break;
      const prevTop = container.scrollTop;
      container.scrollTop += Math.max(400, container.clientHeight * 0.8);
      await sleep(450);
      if (container.scrollTop === prevTop) break;
    }

    return { ok: false, error: `ไม่พบแชทของ "${targetName}" ในรายการปัจจุบัน` };
  }

  function findMessageComposer() {
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
        if (rect.width > 180 && rect.height >= 18 && rect.bottom > window.innerHeight * 0.5) {
          return node;
        }
      }
    }
    return null;
  }

  function setComposerText(composer, text) {
    composer.focus();

    if (composer.tagName === 'TEXTAREA' || composer.tagName === 'INPUT') {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(composer, '');
        nativeSetter.call(composer, text);
      } else {
        composer.value = text;
      }
      composer.dispatchEvent(new Event('input', { bubbles: true }));
      composer.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(composer);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('delete', false);
      document.execCommand('insertText', false, text);
      composer.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
  }

  function clickSendButton(composer) {
    const sendSelectors = [
      'div[aria-label="ส่ง"][role="button"]',
      'div[aria-label="Send"][role="button"]',
      'button[aria-label="ส่ง"]',
      'button[aria-label="Send"]',
      '[data-testid="send-button"]',
    ];

    for (const sel of sendSelectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          btn.click();
          return true;
        }
      }
    }

    composer.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      })
    );
    return true;
  }

  async function sendMessageToContact({ name, key, message, autoSend = false }) {
    const opened = await findAndClickContact(name, key);
    if (!opened.ok) return opened;

    // Double-check active chat header RIGHT before typing
    if (!isActiveChatMatching(name)) {
      return {
        ok: false,
        error: `ป้องกันการส่งผิดคน: ชื่อหัวแชทไม่ตรงกับ "${name}" — ยกเลิกการส่งทันที`,
      };
    }

    let composer = null;
    for (let i = 0; i < 8; i++) {
      composer = findMessageComposer();
      if (composer) break;
      await sleep(500);
    }

    if (!composer) {
      return { ok: false, error: 'ไม่พบช่องพิมพ์ข้อความตอบกลับในแชทนี้ (อาจหมดเวลาหน้าต่างตอบกลับหรือแชทถูกปิด)' };
    }

    setComposerText(composer, message);
    await sleep(450);

    if (autoSend) {
      // Final verification right before clicking Send
      if (!isActiveChatMatching(name)) {
        return {
          ok: false,
          error: `ป้องกันการส่งผิดคน: ชื่อแชทเปลี่ยนก่อนกดส่ง ("${name}") — หยุดการส่งทันที`,
        };
      }
      clickSendButton(composer);
      await sleep(500);
      return { ok: true, mode: 'sent' };
    }

    return { ok: true, mode: 'draft' };
  }

  // Remove any previous listener from an earlier version to prevent duplicate messages
  if (window.__ONEPERSONCEO_MSG_LISTENER__) {
    try {
      chrome.runtime.onMessage.removeListener(window.__ONEPERSONCEO_MSG_LISTENER__);
    } catch {
      // ignore
    }
  }

  const messageHandler = (message, _sender, sendResponse) => {
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
          const hasList = Boolean(findThreadListContainer());
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

        if (message.type === 'STOP_SCAN') {
          stopScanRequested = true;
          sendResponse({ ok: true });
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

  window.__ONEPERSONCEO_MSG_LISTENER__ = messageHandler;
  chrome.runtime.onMessage.addListener(messageHandler);
})();


