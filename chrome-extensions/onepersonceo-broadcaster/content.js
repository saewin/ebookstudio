// OnePersonCEO Knowledge Broadcaster — Content Script for Meta Business Suite Inbox

if (!window.__ONEPERSONCEO_BROADCASTER_LOADED__) {
  window.__ONEPERSONCEO_BROADCASTER_LOADED__ = true;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function normalizeText(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  }

  function detectPageName() {
    // Try common Meta Business Suite page switcher selectors in left sidebar
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

    // Fallback: scan left-side clickable items near top for "One Person" or page-like label
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
    if (rect.width < 140 || rect.width > 620 || rect.height < 42 || rect.height > 190) return false;
    // Thread list sits in the left half of the viewport
    if (rect.left > window.innerWidth * 0.55) return false;
    // Must contain some text (at least a name)
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

    // Filter out pure icon/badge noise lines
    const lines = rawLines.filter((l) => !/^(ad_id|Intake|ความสำคัญ|และอื่นๆ|ยังไม่ได้อ่าน|•)$/i.test(l));
    if (lines.length === 0) return null;

    const name = lines[0];
    if (
      !name ||
      name.length > 80 ||
      /^(จัดการ|ค้นหา|เรียงตาม|ตัวกรอง|Messenger|Instagram|WhatsApp|ข้อความ|ทั้งหมด|ยังไม่ได้อ่าน|หน้าหลัก|การแจ้งเตือน|กล่องข้อความ|ศูนย์ข้อมูลลูกค้า|เนื้อหา|แพลนเนอร์|โฆษณา|ข้อมูลเชิงลึก|การสร้างรายได้|เครื่องมือทั้งหมด|การตั้งค่า|ความช่วยเหลือ|ตัวจัดการโฆษณา|ความคิดเห็นบน|การตอบกลับโฆษณา|ระดับความสำคัญ)$/i.test(
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

  function findRowFromAvatar(avatarEl) {
    let cur = avatarEl.parentElement;
    let best = null;
    for (let depth = 0; depth < 8 && cur && cur !== document.body; depth++) {
      const rect = cur.getBoundingClientRect();
      if (rect.width >= 170 && rect.width <= 580 && rect.height >= 48 && rect.height <= 185) {
        best = cur;
        if (
          cur.getAttribute('role') === 'button' ||
          cur.getAttribute('role') === 'listitem' ||
          cur.getAttribute('role') === 'row' ||
          cur.getAttribute('tabindex') === '0' ||
          cur.tagName === 'A'
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

    // Strategy 1: Standard ARIA / link selectors used by Meta Business Suite
    const selectorList = [
      'a[href*="selected_item_id"]',
      'div[role="grid"] div[role="row"]',
      'div[role="list"] div[role="listitem"]',
      'div[role="presentation"] div[tabindex="0"]',
      'div[role="button"][tabindex="0"]',
      'div[data-testid*="thread"]',
      'div[data-testid*="conversation"]',
    ];

    for (const sel of selectorList) {
      try {
        root.querySelectorAll(sel).forEach((el) => {
          if (looksLikeThreadRow(el)) candidateEls.add(el);
        });
      } catch {
        // ignore invalid selector
      }
    }

    // Strategy 2: Detect rows via circular profile avatars (img / svg image) in the left thread list pane
    const avatars = Array.from(root.querySelectorAll('img, svg image')).filter((img) => {
      const r = img.getBoundingClientRect();
      // Thread list avatars sit roughly between x=60..460, y>90, size 24..64px
      return r.left >= 40 && r.left <= window.innerWidth * 0.45 && r.top >= 85 && r.width >= 24 && r.width <= 68 && r.height >= 24 && r.height <= 68;
    });

    for (const av of avatars) {
      const row = findRowFromAvatar(av);
      if (row && looksLikeThreadRow(row)) {
        candidateEls.add(row);
      }
    }

    // Deduplicate nested elements (keep the most specific clickable row)
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
    // First find actual thread rows, then walk up to their scrollable container
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
      // Even if list is short and doesn't overflow yet, return common parent
      return rows[0].element.parentElement || document.body;
    }

    // Fallback: any scrollable container in the left half of the page
    const scrollables = Array.from(document.querySelectorAll('div')).filter((el) => {
      if (!isScrollableEl(el)) return false;
      const rect = el.getBoundingClientRect();
      return rect.left >= 40 && rect.left <= window.innerWidth * 0.45 && rect.width >= 180 && rect.width <= 540 && rect.height >= 200;
    });
    return scrollables[0] || null;
  }

  async function scanInbox({ maxScrolls = 6, maxContacts = 200 } = {}) {
    const container = findThreadListContainer();
    const initialRows = extractThreadElements(container || document);

    if (!container && initialRows.length === 0) {
      return {
        ok: false,
        error: 'ไม่พบรายการแชทในหน้านี้ กรุณาเปิดแท็บ "กล่องข้อความ > Messenger" ของเพจ One Person Ceo ให้อยู่บนหน้าจอแล้วลองกดดึงรายชื่ออีกครั้งครับ',
        contacts: [],
      };
    }

    const collected = new Map();
    if (container && container !== document.body) {
      container.scrollTop = 0;
      await sleep(300);
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
      await sleep(650);
      if (container.scrollTop === prevScrollTop) break;
    }

    if (container && container !== document.body) {
      container.scrollTop = 0;
    }

    if (collected.size === 0) {
      return {
        ok: false,
        error: 'พบแท็บ Inbox แล้วแต่ยังไม่เห็นรายการแชท (ลองคลิกเปิดแท็บ Meta Business Suite ให้หน้าแชทโหลดขึ้นมา แล้วกลับมากดดึงรายชื่ออีกครั้งครับ)',
        contacts: [],
      };
    }

    return {
      ok: true,
      pageName: detectPageName(),
      contacts: Array.from(collected.values()),
    };
  }

  async function findAndClickContact(targetName, targetKey) {
    const container = findThreadListContainer();
    if (!container) return { ok: false, error: 'ไม่พบแถบรายการแชทฝั่งซ้าย' };

    container.scrollTop = 0;
    await sleep(250);

    for (let attempt = 0; attempt < 25; attempt++) {
      const items = extractThreadElements(container);
      const exactMatch = items.find((i) => i.key === targetKey) || items.find((i) => i.name === targetName);
      if (exactMatch && exactMatch.element) {
        exactMatch.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(200);
        exactMatch.element.click();
        await sleep(700);
        return { ok: true };
      }

      const prevTop = container.scrollTop;
      container.scrollTop += Math.max(400, container.clientHeight * 0.8);
      await sleep(450);
      if (container.scrollTop === prevTop) break;
    }

    return { ok: false, error: `ไม่พบแชทของ "${targetName}" ในรายการปัจจุบัน` };
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
        nativeSetter.call(composer, text);
      } else {
        composer.value = text;
      }
      composer.dispatchEvent(new Event('input', { bubbles: true }));
      composer.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // contenteditable div (Lexical / Draft.js)
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

    // Fallback: press Enter on the composer
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

    // Wait up to 4 seconds for composer to render
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
      clickSendButton(composer);
      await sleep(500);
      return { ok: true, mode: 'sent' };
    }

    return { ok: true, mode: 'draft' };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return false;

    if (message.type === 'PING') {
      sendResponse({ ok: true });
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
  });
}
