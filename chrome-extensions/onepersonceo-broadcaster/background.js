// OnePersonCEO Knowledge Broadcaster — Background Service Worker

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

async function findInboxTab() {
  const tabs = await chrome.tabs.query({ url: 'https://business.facebook.com/*' });
  if (tabs.length === 0) return null;

  // Prefer a tab that is explicitly on /inbox
  const inboxTab = tabs.find((t) => t.url && t.url.includes('/inbox'));
  return inboxTab || tabs[0];
}

async function ensureContentScript(tabId) {
  try {
    const ping = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    if (ping && ping.ok) return true;
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.target || message.target !== 'background') {
    return false;
  }

  (async () => {
    try {
      if (message.action === 'OPEN_INBOX') {
        const existing = await findInboxTab();
        if (existing && existing.id) {
          await chrome.tabs.update(existing.id, { active: true });
          sendResponse({ ok: true, tabId: existing.id, url: existing.url });
        } else {
          const created = await chrome.tabs.create({
            url: 'https://business.facebook.com/latest/inbox/messenger',
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
