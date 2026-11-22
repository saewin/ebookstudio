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

  function findThreadListContainer() {
    // Look for the scrollable conversation list on the left side of Meta Business Suite Inbox
    const scrollables = Array.from(document.querySelectorAll('div')).filter((el) => {
      const style = window.getComputedStyle(el);
      const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll';
      if (!isScrollable) return false;
      const rect = el.getBoundingClientRect();
      return rect.left >= 120 && rect.left <= 520 && rect.width >= 200 && rect.width <= 480 && rect.height >= 250;
    });

    // Prefer the scrollable container that contains the most thread-like items
    let best = null;
    let bestScore = 0;
    for (const container of scrollables) {
      const items = container.querySelectorAll('[role="presentation"], [role="listitem"], div[tabindex="0"]');
      if (items.length > bestScore) {
        bestScore = items.length;
        best = container;
      }
    }
    return best;
  }

  function extractThreadElements(container) {
    if (!container) return [];

    // Try standard Meta Inbox thread row patterns
    const rawItems = Array.from(
      container.querySelectorAll('[role="presentation"] [tabindex="0"], [role="listitem"], div[role="button"][tabindex="0"]')
    );

    const results = [];
    const seenKeys = new Set();

    for (const el of rawItems) {
      const rect = el.getBoundingClientRect();
      if (rect.height < 42 || rect.height > 180 || rect.width < 150) continue;

      const lines = (el.innerText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) continue;

      const name = lines[0];
      // Skip UI header / filter buttons
      if (
        !name ||
        name.length > 80 ||
        /^(จัดการ|ค้นหา|เรียงตาม|ตัวกรอง|Messenger|Instagram|WhatsApp|ข้อความ|ทั้งหมด|ยังไม่ได้อ่าน)$/i.test(name)
      ) {
        continue;
      }

      const timeLine = lines.find((l) => /\d+\/\d+\/\d+|\d+:\d+|เมื่อวาน|วันนี้|นาที|ชม\.|วัน/i.test(l)) || '';
      const snippet = lines.slice(1).find((l) => l !== timeLine && l.length > 1) || '';
      const key = `${name}__${timeLine || snippet.slice(0, 24)}`;

      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      results.push({
        key,
        name,
        snippet: snippet.slice(0, 90),
        timeText: timeLine,
        element: el,
      });
    }

    return results;
  }

  async function scanInbox({ maxScrolls = 6, maxContacts = 200 } = {}) {
    const container = findThreadListContainer();
    if (!container) {
      return {
        ok: false,
        error: 'ไม่พบรายการแชทในหน้านี้ กรุณาตรวจสอบว่าเปิดหน้า "กล่องข้อความ > Messenger" ของเพจ One Person Ceo อยู่ครับ',
        contacts: [],
      };
    }

    const collected = new Map();
    container.scrollTop = 0;
    await sleep(300);

    for (let i = 0; i <= maxScrolls; i++) {
      const items = extractThreadElements(container);
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

      const prevScrollTop = container.scrollTop;
      container.scrollTop += Math.max(450, container.clientHeight * 0.85);
      await sleep(650);
      if (container.scrollTop === prevScrollTop) break;
    }

    // Reset scroll back to top
    container.scrollTop = 0;

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
