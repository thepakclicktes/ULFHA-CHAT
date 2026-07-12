import { 
  getDoc, 
  getDocs, 
  getDocFromCache, 
  getDocsFromCache, 
  DocumentReference, 
  Query, 
  DocumentSnapshot, 
  QuerySnapshot
} from 'firebase/firestore';

/**
 * Executes a getDoc with automated retry on network/offline errors.
 * If all retries fail, it falls back to the local Firestore cache.
 */
export async function getDocWithRetry(
  docRef: DocumentReference, 
  maxRetries = 3, 
  delayMs = 800
): Promise<DocumentSnapshot> {
  let lastError: any = null;
  let delay = delayMs;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getDoc(docRef);
    } catch (err: any) {
      lastError = err;
      const isOfflineErr = 
        err?.message?.toLowerCase().includes('offline') || 
        err?.message?.toLowerCase().includes('network') ||
        err?.code === 'unavailable' ||
        err?.code === 'failed-precondition';
        
      if (isOfflineErr) {
        console.warn(`[Firestore Retry] getDoc failed (offline/unavailable) - Attempt ${i + 1}/${maxRetries}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw err; // Re-throw other errors (e.g. permission-denied) immediately
    }
  }

  // Fallback to cache
  try {
    console.log('[Firestore Retry] Retrying with local cache fallback for getDoc...');
    const cachedSnap = await getDocFromCache(docRef);
    return cachedSnap;
  } catch (cacheErr) {
    console.error('[Firestore Retry] Local cache lookup failed:', cacheErr);
    throw lastError;
  }
}

/**
 * Executes a getDocs query with automated retry on network/offline errors.
 * If all retries fail, it falls back to the local Firestore cache.
 */
export async function getDocsWithRetry(
  q: Query, 
  maxRetries = 3, 
  delayMs = 800
): Promise<QuerySnapshot> {
  let lastError: any = null;
  let delay = delayMs;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await getDocs(q);
    } catch (err: any) {
      lastError = err;
      const isOfflineErr = 
        err?.message?.toLowerCase().includes('offline') || 
        err?.message?.toLowerCase().includes('network') ||
        err?.code === 'unavailable' ||
        err?.code === 'failed-precondition';
        
      if (isOfflineErr) {
        console.warn(`[Firestore Retry] getDocs failed (offline/unavailable) - Attempt ${i + 1}/${maxRetries}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }
      throw err; // Re-throw other errors immediately
    }
  }

  // Fallback to cache
  try {
    console.log('[Firestore Retry] Retrying with local cache fallback for getDocs...');
    const cachedSnap = await getDocsFromCache(q);
    return cachedSnap;
  } catch (cacheErr) {
    console.error('[Firestore Retry] Local cache lookup failed for query:', cacheErr);
    throw lastError;
  }
}
