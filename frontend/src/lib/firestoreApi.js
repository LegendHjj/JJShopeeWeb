/**
 * firestoreApi.js
 * Optimized Firestore helper functions with localStorage caching,
 * partial write support, and INCREMENTAL SYNC.
 *
 * Instead of re-fetching every document on sync, we:
 *   1. Stamp every saved doc with `_updatedAt` (Firestore server timestamp)
 *   2. On sync, query only docs where `_updatedAt > lastSyncTimestamp`
 *   3. Track deletions in a tiny `_syncDeleteLog` collection
 */

import {
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch,
  deleteDoc,
  query,
  where,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Collection name constants ───────────────────────────────────────────────
export const COLLECTIONS = {
  shopee: {
    orgProductInfo:   'shopeeOrgProductInfo',
    prodActPriceCalc: 'shopeeProdActPriceCalc',
    prodStockCalc:    'shopeeProdStockCalc',
  },
  tiktok: {
    orgProductInfo:   'tiktokOrgProductInfoTikTok',
    prodActPriceCalc: 'tiktokProdActPriceCalcTikTok',
    prodStockCalc:    'tiktokProdStockCalcTikTok',
  },
  notes: 'ShopeeWebNotes',
  supportFAQ: 'shopeeSupportFAQ',
  _syncDeleteLog: '_syncDeleteLog',
};

// ─── All syncable collection names (flat list) ──────────────────────────────
const ALL_SYNCABLE = [
  COLLECTIONS.shopee.orgProductInfo,
  COLLECTIONS.shopee.prodActPriceCalc,
  COLLECTIONS.shopee.prodStockCalc,
  COLLECTIONS.tiktok.orgProductInfo,
  COLLECTIONS.tiktok.prodActPriceCalc,
  COLLECTIONS.tiktok.prodStockCalc,
  COLLECTIONS.notes,
  COLLECTIONS.supportFAQ,
];

// ─── Cache Helpers ───────────────────────────────────────────────────────────
const getCacheKey = (name) => `shopee_cache_${name}`;
const getTsKey = (name) => `shopee_cache_ts_${name}`;
const LAST_SYNC_KEY = 'shopee_last_sync_timestamp';

function getLocalCache(collectionName) {
  try {
    const data = localStorage.getItem(getCacheKey(collectionName));
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
}

function setLocalCache(collectionName, data) {
  try {
    localStorage.setItem(getCacheKey(collectionName), JSON.stringify(data));
    localStorage.setItem(getTsKey(collectionName), Date.now().toString());
  } catch (e) {
    console.error(`[Cache] Failed to save ${collectionName} to localStorage`, e);
  }
}

function getLastSyncTimestamp() {
  const val = localStorage.getItem(LAST_SYNC_KEY);
  return val ? parseInt(val, 10) : null;
}

function setLastSyncTimestamp(ts) {
  localStorage.setItem(LAST_SYNC_KEY, ts.toString());
}

// ─── Read: Fetch with Cache ────────────────────────────────────────
export async function fetchCollection(collectionName, forceRefresh = false) {
  if (!forceRefresh) {
    const cached = getLocalCache(collectionName);
    if (cached) {
      console.log(`[Cache] Loaded ${collectionName} from localStorage`);
      return cached;
    }
  }

  try {
    console.log(`[Firestore] Fetching ${collectionName} from Cloud...`);
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const data = snapshot.docs.map((d) => ({ _docId: d.id, ...d.data() }));
    setLocalCache(collectionName, data);
    return data;
  } catch (error) {
    console.error(`[Firestore] fetchCollection(${collectionName}) failed:`, error);
    return getLocalCache(collectionName) || [];
  }
}

// ─── Fetch only docs changed since a timestamp ──────────────────────────────
async function fetchChangedSince(collectionName, sinceTimestamp) {
  try {
    const colRef = collection(db, collectionName);
    const sinceDate = Timestamp.fromMillis(sinceTimestamp);
    const q = query(colRef, where('_updatedAt', '>', sinceDate));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ _docId: d.id, ...d.data() }));
    console.log(`[Sync] ${collectionName}: ${data.length} changed doc(s) since last sync`);
    return data;
  } catch (error) {
    console.error(`[Sync] fetchChangedSince(${collectionName}) failed:`, error);
    return [];
  }
}

// ─── PARTIAL Write: Only save what is passed in, then MERGE into cache ───
/**
 * Saves a SUBSET of items to Firestore and merges them into the local cache.
 * This saves "Write" tokens because you only send modified/new items.
 * Now also stamps every doc with `_updatedAt` for incremental sync.
 */
export async function saveCollection(collectionName, itemsToSave) {
  if (!itemsToSave || itemsToSave.length === 0) return;

  const colRef = collection(db, collectionName);
  const BATCH_SIZE = 450;
  const now = Timestamp.now();

  console.log(`[Firestore] Saving ${itemsToSave.length} modified/new items to ${collectionName}...`);

  for (let i = 0; i < itemsToSave.length; i += BATCH_SIZE) {
    const chunk = itemsToSave.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const { _docId, _localId, ...data } = item;
      // Stamp with _updatedAt for incremental sync
      data._updatedAt = now;

      if (_docId) {
        // Update existing
        const docRef = doc(db, collectionName, _docId);
        batch.set(docRef, data, { merge: true });
      } else {
        // Create new
        const newDocRef = doc(colRef);
        batch.set(newDocRef, data);
        // CRITICAL: Capture the new ID so it can be merged into cache below
        item._docId = newDocRef.id;
      }
    }
    await batch.commit();
  }

  // ─── Merge into local cache (NO re-fetch from cloud) ─────────────────────
  const existingCache = getLocalCache(collectionName) || [];
  const updatedCache = [...existingCache];

  for (const item of itemsToSave) {
    const idx = updatedCache.findIndex(c => c._docId && c._docId === item._docId);
    if (idx >= 0) {
      // Update existing entry in cache
      updatedCache[idx] = { ...item, _updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } };
    } else {
      // Add new entry to cache
      updatedCache.push({ ...item, _updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } });
    }
  }

  setLocalCache(collectionName, updatedCache);
  console.log(`[Cache] Merged ${itemsToSave.length} items into local cache for ${collectionName}`);

  // Return the saved items (with _docId populated) so callers can update their state
  return itemsToSave;
}

/**
 * Deletes a document from Firestore, removes it from local cache,
 * and logs the deletion to _syncDeleteLog for cross-device sync.
 */
export async function deleteDocument(collectionName, docId) {
  if (!docId) return;
  console.log(`[Firestore] Deleting ${docId} from ${collectionName}...`);
  
  try {
    await deleteDoc(doc(db, collectionName, docId));
    
    // Log deletion for cross-device sync
    await logDeletion(collectionName, docId);
    
    // Update Cache
    const fullCachedList = getLocalCache(collectionName) || [];
    const updatedFullList = fullCachedList.filter(item => item._docId !== docId);
    setLocalCache(collectionName, updatedFullList);
    
    console.log(`[Cache] Removed ${docId} from local cache`);
  } catch (error) {
    console.error(`[Firestore] deleteDocument(${collectionName}, ${docId}) failed:`, error);
    throw error;
  }
}

// ─── Deletion Log ────────────────────────────────────────────────────────────
async function logDeletion(collectionName, docId) {
  try {
    const logRef = collection(db, COLLECTIONS._syncDeleteLog);
    await addDoc(logRef, {
      collection: collectionName,
      docId: docId,
      deletedAt: Timestamp.now(),
    });
    console.log(`[Sync] Logged deletion: ${collectionName}/${docId}`);
  } catch (error) {
    console.error(`[Sync] Failed to log deletion:`, error);
    // Non-critical — don't throw, sync will still mostly work
  }
}

async function fetchDeletionsSince(sinceTimestamp) {
  try {
    const logRef = collection(db, COLLECTIONS._syncDeleteLog);
    const sinceDate = Timestamp.fromMillis(sinceTimestamp);
    const q = query(logRef, where('deletedAt', '>', sinceDate));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data());
  } catch (error) {
    console.error(`[Sync] fetchDeletionsSince failed:`, error);
    return [];
  }
}

// ─── Incremental Sync ────────────────────────────────────────────────────────
/**
 * Smart sync that handles 3 scenarios:
 *   1. Brand new laptop (no cache)       → full fetch everything
 *   2. Existing laptop, no lastSync      → trust cache, set timestamp, skip fetch
 *   3. Existing laptop, has lastSync     → incremental fetch (only changed docs)
 *
 * Returns a summary object: { totalChanges, totalDeletions, fullSync }
 */
export async function incrementalSync() {
  const lastSync = getLastSyncTimestamp();
  const hasAnyCache = ALL_SYNCABLE.some(name => getLocalCache(name) !== null);

  // ── Scenario 1: Brand new laptop — no cache at all ───────────────────────
  if (!hasAnyCache) {
    console.log('[Sync] No local cache found — performing full initial sync...');
    let totalDocs = 0;
    for (const name of ALL_SYNCABLE) {
      const data = await fetchCollection(name, true); // force fetch from cloud
      totalDocs += (data || []).length;
    }
    setLastSyncTimestamp(Date.now());
    return { totalChanges: totalDocs, totalDeletions: 0, fullSync: true };
  }

  // ── Scenario 2: Has cache but no lastSync (first time after update) ──────
  //    Use the oldest cache timestamp as the starting point so we catch
  //    any changes made on other devices since the cache was last populated.
  let effectiveLastSync = lastSync;
  if (!lastSync) {
    // Find the oldest cache timestamp across all collections
    let oldestCacheTs = Date.now();
    for (const name of ALL_SYNCABLE) {
      const ts = localStorage.getItem(getTsKey(name));
      if (ts) {
        const parsed = parseInt(ts, 10);
        if (parsed < oldestCacheTs) oldestCacheTs = parsed;
      }
    }
    console.log(`[Sync] No sync timestamp — using oldest cache time: ${new Date(oldestCacheTs).toLocaleString()}`);
    effectiveLastSync = oldestCacheTs;
  }

  // ── Scenario 3: Normal incremental sync ──────────────────────────────────
  console.log(`[Sync] Incremental sync — fetching changes since ${new Date(effectiveLastSync).toLocaleString()}...`);
  let totalChanges = 0;
  let totalDeletions = 0;

  // 3a. Fetch changed docs for each collection
  for (const name of ALL_SYNCABLE) {
    const changedDocs = await fetchChangedSince(name, effectiveLastSync);
    if (changedDocs.length > 0) {
      // Merge changed docs into local cache
      const existingCache = getLocalCache(name) || [];
      const updatedCache = [...existingCache];

      for (const changedDoc of changedDocs) {
        const idx = updatedCache.findIndex(c => c._docId === changedDoc._docId);
        if (idx >= 0) {
          updatedCache[idx] = changedDoc; // Update existing
        } else {
          updatedCache.push(changedDoc); // Add new
        }
      }

      setLocalCache(name, updatedCache);
      totalChanges += changedDocs.length;
    }
  }

  // 3b. Process deletions
  const deletions = await fetchDeletionsSince(effectiveLastSync);
  for (const del of deletions) {
    const cache = getLocalCache(del.collection);
    if (cache) {
      const filtered = cache.filter(item => item._docId !== del.docId);
      if (filtered.length !== cache.length) {
        setLocalCache(del.collection, filtered);
        totalDeletions++;
        console.log(`[Sync] Removed deleted doc ${del.docId} from ${del.collection}`);
      }
    }
  }

  // 3c. Update sync timestamp
  setLastSyncTimestamp(Date.now());

  console.log(`[Sync] Incremental sync complete: ${totalChanges} changes, ${totalDeletions} deletions`);
  return { totalChanges, totalDeletions, fullSync: false };
}

// ─── Force Full Sync (for Shift+Click or troubleshooting) ───────────────────
export async function forceFullSync() {
  console.log('[Sync] Force full sync — clearing all caches and re-fetching...');
  clearAllCaches();
  let totalDocs = 0;
  for (const name of ALL_SYNCABLE) {
    const data = await fetchCollection(name, true);
    totalDocs += (data || []).length;
  }
  setLastSyncTimestamp(Date.now());
  return { totalChanges: totalDocs, totalDeletions: 0, fullSync: true };
}

// ─── Sync Helper ─────────────────────────────────────────────────────────────
export function clearAllCaches() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('shopee_cache_')) {
      localStorage.removeItem(key);
    }
  });
  localStorage.removeItem(LAST_SYNC_KEY);
}

// ─── One-Time Migration: Stamp all existing docs with _updatedAt ─────────────
/**
 * Goes through ALL syncable collections and stamps any document missing
 * `_updatedAt` with the current timestamp. This is needed once so that
 * incremental sync can "see" old records created before the feature existed.
 *
 * Only writes to docs that DON'T already have _updatedAt (minimizes writes).
 * Returns { totalStamped, totalSkipped }
 */
export async function migrateStampAllDocs() {
  const BATCH_SIZE = 450;
  let totalStamped = 0;
  let totalSkipped = 0;
  const now = Timestamp.now();

  for (const collectionName of ALL_SYNCABLE) {
    console.log(`[Migration] Checking ${collectionName}...`);
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);

    // Filter docs missing _updatedAt
    const docsToStamp = snapshot.docs.filter(d => !d.data()._updatedAt);

    if (docsToStamp.length === 0) {
      console.log(`[Migration] ${collectionName}: all docs already stamped ✓`);
      totalSkipped += snapshot.docs.length;
      continue;
    }

    console.log(`[Migration] ${collectionName}: stamping ${docsToStamp.length} / ${snapshot.docs.length} docs...`);

    // Batch update in chunks
    for (let i = 0; i < docsToStamp.length; i += BATCH_SIZE) {
      const chunk = docsToStamp.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const docSnap of chunk) {
        const docRef = doc(db, collectionName, docSnap.id);
        batch.update(docRef, { _updatedAt: now });
      }

      await batch.commit();
    }

    totalStamped += docsToStamp.length;
    totalSkipped += (snapshot.docs.length - docsToStamp.length);

    // Also update local cache with the stamped data
    const updatedData = snapshot.docs.map(d => ({
      _docId: d.id,
      ...d.data(),
      _updatedAt: d.data()._updatedAt || { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    }));
    setLocalCache(collectionName, updatedData);
  }

  setLastSyncTimestamp(Date.now());
  console.log(`[Migration] Complete: ${totalStamped} stamped, ${totalSkipped} already had timestamp`);
  return { totalStamped, totalSkipped };
}
