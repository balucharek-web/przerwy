/**
 * Persistent Storage & Auto-Backup Service for PrzerwaPro
 * 
 * Protects user settings and break history against Android Chrome storage eviction,
 * browser cache clearing, and crashes using dual-layer storage (LocalStorage + IndexedDB).
 */

const DB_NAME = 'przerwapro_persistence_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_backups';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Saves a backup of critical data into IndexedDB (durable storage, survives LocalStorage clearing)
 */
export async function backupToIndexedDB(key: string, data: any): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putRequest = store.put(data, key);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (err) {
    console.warn(`[Persistence] Failed to backup ${key} to IndexedDB:`, err);
  }
}

/**
 * Recovers data from IndexedDB backup if LocalStorage was cleared or corrupted
 */
export async function restoreFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        resolve(getRequest.result ?? null);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (err) {
    console.warn(`[Persistence] Failed to restore ${key} from IndexedDB:`, err);
    return null;
  }
}

/**
 * Requests Android OS to grant persistent storage quota so it NEVER evicts data
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
