/**
 * firestoreApi.js
 * Optimized Firestore helper functions with localStorage caching and partial write support.
 */

import {
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch,
  deleteDoc,
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
};

// ─── Cache Helpers ───────────────────────────────────────────────────────────
const getCacheKey = (name) => `shopee_cache_${name}`;
const getTsKey = (name) => `shopee_cache_ts_${name}`;

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

// ─── PARTIAL Write: Only save what is passed in, then MERGE into cache ───
/**
 * Saves a SUBSET of items to Firestore and merges them into the local cache.
 * This saves "Write" tokens because you only send modified/new items.
 */
export async function saveCollection(collectionName, itemsToSave) {
  if (!itemsToSave || itemsToSave.length === 0) return;

  const colRef = collection(db, collectionName);
  const BATCH_SIZE = 450;

  console.log(`[Firestore] Saving ${itemsToSave.length} modified/new items to ${collectionName}...`);

  for (let i = 0; i < itemsToSave.length; i += BATCH_SIZE) {
    const chunk = itemsToSave.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      const { _docId, ...data } = item;
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

  // ─── Force Fetch after save ─────────────────────────────────────────────
  // Instead of complex merging, just re-fetch the whole thing to be 100% safe
  const colRef2 = collection(db, collectionName);
  const snapshot = await getDocs(colRef2);
  const data2 = snapshot.docs.map((d) => ({ _docId: d.id, ...d.data() }));
  setLocalCache(collectionName, data2);
  console.log(`[Cache] Clean re-fetch completed for ${collectionName}`);
  return data2;
}

/**
 * Deletes a document from Firestore and removes it from local cache.
 */
export async function deleteDocument(collectionName, docId) {
  if (!docId) return;
  console.log(`[Firestore] Deleting ${docId} from ${collectionName}...`);
  
  try {
    await deleteDoc(doc(db, collectionName, docId));
    
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

// ─── Sync Helper ─────────────────────────────────────────────────────────────
export function clearAllCaches() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('shopee_cache_')) {
      localStorage.removeItem(key);
    }
  });
}
