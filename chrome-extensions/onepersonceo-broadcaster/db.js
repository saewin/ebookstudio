// OnePersonCEO Smart Broadcaster v2.0 — IndexedDB CDP Store
// Compatible with Service Worker (importScripts), Dashboard (<script>), and Node.js (require)

(function (global) {
  'use strict';

  const DB_NAME = 'OnePersonCEO_CDP_v2';
  const DB_VERSION = 2;
  const CHUNK_SIZE = 500;

  let dbPromise = null;

  function openDB() {
    if (typeof indexedDB === 'undefined') {
      return Promise.reject(new Error('IndexedDB is unavailable in this environment'));
    }
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('contacts')) {
          const contactsStore = db.createObjectStore('contacts', { keyPath: 'id' });
          contactsStore.createIndex('by_pageId', 'pageId', { unique: false });
          contactsStore.createIndex('by_psid', 'psid', { unique: false });
          contactsStore.createIndex('by_rfm', 'rfmSegment', { unique: false });
          contactsStore.createIndex('by_rsv', 'rsvStage', { unique: false });
          contactsStore.createIndex('by_hour', 'preferredHour', { unique: false });
          contactsStore.createIndex('by_normalizedName', 'normalizedName', { unique: false });
          contactsStore.createIndex('by_lastInteraction', 'lastInteractionAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('campaigns')) {
          const campaignsStore = db.createObjectStore('campaigns', { keyPath: 'id' });
          campaignsStore.createIndex('by_createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('queue_items')) {
          const queueStore = db.createObjectStore('queue_items', { keyPath: 'id' });
          queueStore.createIndex('by_campaign', 'campaignId', { unique: false });
          queueStore.createIndex('by_campaign_batch', ['campaignId', 'batchIndex'], { unique: false });
          queueStore.createIndex('by_campaign_status', ['campaignId', 'status'], { unique: false });
          queueStore.createIndex('by_status_scheduled', ['status', 'scheduledAt'], { unique: false });
        }

        if (!db.objectStoreNames.contains('sync_state')) {
          db.createObjectStore('sync_state', { keyPath: 'pageId' });
        }

        if (!db.objectStoreNames.contains('workflows')) {
          db.createObjectStore('workflows', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('workflow_enrollments')) {
          const enrStore = db.createObjectStore('workflow_enrollments', { keyPath: 'id' });
          enrStore.createIndex('by_workflow', 'workflowId', { unique: false });
          enrStore.createIndex('by_contact', 'contactId', { unique: false });
          enrStore.createIndex('by_status_nextRun', ['status', 'nextRunAt'], { unique: false });
        }
      };

      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        db.onclose = () => {
          dbPromise = null;
        };
        resolve(db);
      };

      req.onerror = () => {
        dbPromise = null;
        reject(req.error || new Error('Failed to open IndexedDB'));
      };

      req.onblocked = () => {
        dbPromise = null;
        reject(new Error('IndexedDB open blocked by another connection'));
      };
    });

    return dbPromise;
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  async function bulkPutInChunks(storeName, records) {
    if (!Array.isArray(records) || records.length === 0) return 0;
    const db = await openDB();
    let written = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const slice = records.slice(i, i + CHUNK_SIZE);
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of slice) {
        store.put(item);
      }
      await txDone(tx);
      written += slice.length;
    }

    return written;
  }

  async function bulkUpsertContacts(records) {
    return bulkPutInChunks('contacts', records);
  }

  async function getContacts(pageId = null) {
    const db = await openDB();
    const tx = db.transaction('contacts', 'readonly');
    const store = tx.objectStore('contacts');
    if (pageId) {
      return reqToPromise(store.index('by_pageId').getAll(IDBKeyRange.only(pageId)));
    }
    return reqToPromise(store.getAll());
  }

  async function getContactById(id) {
    const db = await openDB();
    const tx = db.transaction('contacts', 'readonly');
    return reqToPromise(tx.objectStore('contacts').get(id));
  }

  async function updateContact(id, patch) {
    const db = await openDB();
    const tx = db.transaction('contacts', 'readwrite');
    const store = tx.objectStore('contacts');
    const existing = await reqToPromise(store.get(id));
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: Date.now() };
    store.put(updated);
    await txDone(tx);
    return updated;
  }

  async function countContacts(pageId = null) {
    const db = await openDB();
    const tx = db.transaction('contacts', 'readonly');
    const store = tx.objectStore('contacts');
    if (pageId) {
      return reqToPromise(store.index('by_pageId').count(IDBKeyRange.only(pageId)));
    }
    return reqToPromise(store.count());
  }

  async function clearContacts(pageId = null) {
    const db = await openDB();
    if (!pageId) {
      const tx = db.transaction('contacts', 'readwrite');
      tx.objectStore('contacts').clear();
      await txDone(tx);
      return;
    }

    const tx = db.transaction('contacts', 'readwrite');
    const idx = tx.objectStore('contacts').index('by_pageId');
    await new Promise((resolve, reject) => {
      const cursorReq = idx.openCursor(IDBKeyRange.only(pageId));
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve();
          return;
        }
        cursor.delete();
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
    await txDone(tx);
  }

  async function saveCampaign(campaign) {
    const db = await openDB();
    const tx = db.transaction('campaigns', 'readwrite');
    tx.objectStore('campaigns').put(campaign);
    await txDone(tx);
    return campaign;
  }

  async function getCampaign(id) {
    const db = await openDB();
    const tx = db.transaction('campaigns', 'readonly');
    return reqToPromise(tx.objectStore('campaigns').get(id));
  }

  async function listCampaigns() {
    const db = await openDB();
    const tx = db.transaction('campaigns', 'readonly');
    const all = await reqToPromise(tx.objectStore('campaigns').getAll());
    return (all || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function deleteCampaign(id) {
    await deleteQueueItemsByCampaign(id);
    const db = await openDB();
    const tx = db.transaction('campaigns', 'readwrite');
    tx.objectStore('campaigns').delete(id);
    await txDone(tx);
  }

  async function bulkPutQueueItems(items) {
    return bulkPutInChunks('queue_items', items);
  }

  async function getQueueItemsByCampaign(campaignId) {
    const db = await openDB();
    const tx = db.transaction('queue_items', 'readonly');
    const idx = tx.objectStore('queue_items').index('by_campaign');
    const rows = await reqToPromise(idx.getAll(IDBKeyRange.only(campaignId)));
    return (rows || []).sort((a, b) => (a.seqIndex || 0) - (b.seqIndex || 0));
  }

  async function getQueueItemsByBatch(campaignId, batchIndex) {
    const db = await openDB();
    const tx = db.transaction('queue_items', 'readonly');
    const idx = tx.objectStore('queue_items').index('by_campaign_batch');
    const rows = await reqToPromise(idx.getAll(IDBKeyRange.only([campaignId, batchIndex])));
    return (rows || []).sort((a, b) => (a.seqIndex || 0) - (b.seqIndex || 0));
  }

  async function getDueScheduledItems(nowMs = Date.now(), limit = 30) {
    const db = await openDB();
    const tx = db.transaction('queue_items', 'readonly');
    const idx = tx.objectStore('queue_items').index('by_status_scheduled');
    const range = IDBKeyRange.bound(['scheduled', 0], ['scheduled', nowMs]);
    const results = [];

    await new Promise((resolve, reject) => {
      const req = idx.openCursor(range);
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor || results.length >= limit) {
          resolve();
          return;
        }
        results.push(cursor.value);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });

    return results;
  }

  async function updateQueueItem(id, patch) {
    const db = await openDB();
    const tx = db.transaction('queue_items', 'readwrite');
    const store = tx.objectStore('queue_items');
    const existing = await reqToPromise(store.get(id));
    if (!existing) return null;
    const updated = { ...existing, ...patch };
    store.put(updated);
    await txDone(tx);
    return updated;
  }

  async function deleteQueueItemsByCampaign(campaignId) {
    const db = await openDB();
    const tx = db.transaction('queue_items', 'readwrite');
    const idx = tx.objectStore('queue_items').index('by_campaign');
    await new Promise((resolve, reject) => {
      const req = idx.openCursor(IDBKeyRange.only(campaignId));
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve();
          return;
        }
        cursor.delete();
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
    await txDone(tx);
  }

  async function saveSyncState(state) {
    const db = await openDB();
    const tx = db.transaction('sync_state', 'readwrite');
    tx.objectStore('sync_state').put({ ...state, updatedAt: Date.now() });
    await txDone(tx);
    return state;
  }

  async function getSyncState(pageId) {
    if (!pageId) return null;
    const db = await openDB();
    const tx = db.transaction('sync_state', 'readonly');
    return reqToPromise(tx.objectStore('sync_state').get(pageId));
  }

  async function clearSyncState(pageId) {
    if (!pageId) return;
    const db = await openDB();
    const tx = db.transaction('sync_state', 'readwrite');
    tx.objectStore('sync_state').delete(pageId);
    await txDone(tx);
  }

  async function saveWorkflow(wf) {
    const db = await openDB();
    const tx = db.transaction('workflows', 'readwrite');
    tx.objectStore('workflows').put({ ...wf, updatedAt: Date.now() });
    await txDone(tx);
    return wf;
  }

  async function listWorkflows() {
    const db = await openDB();
    const tx = db.transaction('workflows', 'readonly');
    const rows = await reqToPromise(tx.objectStore('workflows').getAll());
    return (rows || []).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async function deleteWorkflow(id) {
    const db = await openDB();
    const tx = db.transaction('workflows', 'readwrite');
    tx.objectStore('workflows').delete(id);
    await txDone(tx);
  }

  async function saveEnrollment(enr) {
    const db = await openDB();
    const tx = db.transaction('workflow_enrollments', 'readwrite');
    tx.objectStore('workflow_enrollments').put({ ...enr, updatedAt: Date.now() });
    await txDone(tx);
    return enr;
  }

  async function bulkPutEnrollments(items) {
    return bulkPutInChunks('workflow_enrollments', items);
  }

  async function listEnrollments(workflowId = null) {
    const db = await openDB();
    const tx = db.transaction('workflow_enrollments', 'readonly');
    const store = tx.objectStore('workflow_enrollments');
    const rows = workflowId
      ? await reqToPromise(store.index('by_workflow').getAll(IDBKeyRange.only(workflowId)))
      : await reqToPromise(store.getAll());
    return (rows || []).sort((a, b) => (b.updatedAt || b.enrolledAt || 0) - (a.updatedAt || a.enrolledAt || 0));
  }

  async function getDueWorkflowEnrollments(nowMs = Date.now(), limit = 20) {
    const db = await openDB();
    const tx = db.transaction('workflow_enrollments', 'readonly');
    const idx = tx.objectStore('workflow_enrollments').index('by_status_nextRun');
    const range = IDBKeyRange.bound(['active', 0], ['active', nowMs]);
    const results = [];

    await new Promise((resolve, reject) => {
      const req = idx.openCursor(range);
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor || results.length >= limit) {
          resolve();
          return;
        }
        results.push(cursor.value);
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });

    return results;
  }

  async function updateEnrollment(id, patch) {
    const db = await openDB();
    const tx = db.transaction('workflow_enrollments', 'readwrite');
    const store = tx.objectStore('workflow_enrollments');
    const existing = await reqToPromise(store.get(id));
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: Date.now() };
    store.put(updated);
    await txDone(tx);
    return updated;
  }

  async function deleteEnrollment(id) {
    const db = await openDB();
    const tx = db.transaction('workflow_enrollments', 'readwrite');
    tx.objectStore('workflow_enrollments').delete(id);
    await txDone(tx);
  }

  const api = {
    DB_NAME,
    DB_VERSION,
    openDB,
    bulkUpsertContacts,
    getContacts,
    getContactById,
    updateContact,
    countContacts,
    clearContacts,
    saveCampaign,
    getCampaign,
    listCampaigns,
    deleteCampaign,
    bulkPutQueueItems,
    getQueueItemsByCampaign,
    getQueueItemsByBatch,
    getDueScheduledItems,
    updateQueueItem,
    deleteQueueItemsByCampaign,
    saveSyncState,
    getSyncState,
    clearSyncState,
    saveWorkflow,
    listWorkflows,
    deleteWorkflow,
    saveEnrollment,
    bulkPutEnrollments,
    listEnrollments,
    getDueWorkflowEnrollments,
    updateEnrollment,
    deleteEnrollment,
  };

  global.OnePersonDB = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
