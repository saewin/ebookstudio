// OnePersonCEO Knowledge Broadcaster — Local CDP IndexedDB (supports 100,000+ contacts)

const DB_NAME = 'OnePersonCEO_CDP_DB';
const DB_VERSION = 1;
const STORE_CONTACTS = 'contacts';

function openCdpDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
        const store = db.createObjectStore(STORE_CONTACTS, { keyPath: 'key' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('segment', 'segment', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAllContacts() {
  const db = await openCdpDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readonly');
    const store = tx.objectStore(STORE_CONTACTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbUpsertContacts(records) {
  if (!Array.isArray(records) || records.length === 0) return 0;
  const db = await openCdpDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite');
    const store = tx.objectStore(STORE_CONTACTS);
    let count = 0;

    for (const rec of records) {
      if (!rec || !rec.key) continue;
      store.put(rec);
      count += 1;
    }

    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbClearAllContacts() {
  const db = await openCdpDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTACTS, 'readwrite');
    tx.objectStore(STORE_CONTACTS).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Parse Thai/English Inbox date text into approximate daysAgo for Recency (R)
function parseDaysAgo(timeText) {
  const raw = (timeText || '').trim().toLowerCase();
  if (!raw) return 999;

  if (/\d{1,2}:\d{2}|วันนี้|today|นาที|ชม\.|min|hr/.test(raw)) return 0;
  if (/เมื่อวาน|yesterday/.test(raw)) return 1;

  const dayMatch = raw.match(/(\d+)\s*(วัน|d\b)/);
  if (dayMatch) return Number(dayMatch[1]);

  // Match d/m/yy or d/m/yyyy (e.g. 5/5/25 or 16/5/2025 or 16/5/68)
  const dateMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    let year = Number(dateMatch[3]);
    if (year < 100) {
      // Handle Thai Buddhist year (e.g. 68 -> 2568 -> 2025) vs Christian year (25 -> 2025)
      year = year >= 50 ? 2500 + year - 543 : 2000 + year;
    } else if (year > 2400) {
      year -= 543;
    }
    const dt = new Date(year, month, day);
    if (!Number.isNaN(dt.getTime())) {
      const diff = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, diff);
    }
  }

  return 60;
}

// Compute RFM / RSV Segment for OnePersonCEO
function computeRfmSegment(contact) {
  const daysAgo = typeof contact.daysAgo === 'number' ? contact.daysAgo : parseDaysAgo(contact.timeText);
  const orders = Number(contact.ordersCount) || 0;
  const spend = Number(contact.totalSpend) || 0;
  const labels = Array.isArray(contact.labels) ? contact.labels : [];
  const labelJoined = labels.join(' ').toLowerCase();

  // Monetary / Frequency tiers first
  if (orders >= 2 || spend >= 5000 || /vip|inner|repeat/.test(labelJoined)) {
    return {
      segment: 'vip',
      rScore: daysAgo <= 14 ? 5 : daysAgo <= 60 ? 3 : 2,
      fScore: Math.min(5, Math.max(4, orders)),
      mScore: spend >= 10000 ? 5 : 4,
    };
  }

  if (orders >= 1 || spend > 0 || /ซื้อแล้ว|โอนแล้ว|ลูกค้า|buyer|paid|student|workshop/.test(labelJoined)) {
    return {
      segment: 'buyers',
      rScore: daysAgo <= 14 ? 5 : daysAgo <= 60 ? 3 : 2,
      fScore: Math.min(5, Math.max(2, orders || 1)),
      mScore: spend >= 2000 ? 4 : 3,
    };
  }

  // Recency tiers for leads/inquirers
  if (daysAgo <= 7) {
    return { segment: 'hot_leads', rScore: 5, fScore: 1, mScore: 1 };
  }
  if (daysAgo <= 30) {
    return { segment: 'warm_leads', rScore: 3, fScore: 1, mScore: 1 };
  }
  if (/ad_id|intake|โฆษณา/.test(labelJoined)) {
    return { segment: 'ads_inquirers', rScore: 2, fScore: 1, mScore: 1 };
  }
  return { segment: 'cold_inquirers', rScore: 1, fScore: 1, mScore: 1 };
}

window.OnePersonCdpDb = {
  getAll: dbGetAllContacts,
  upsert: dbUpsertContacts,
  clearAll: dbClearAllContacts,
  parseDaysAgo,
  computeRfmSegment,
};
