import type { ManualIndex } from './manual-search.js';
export interface StoredManual extends ManualIndex { file: Blob; filename: string; bytes: number; createdAt: string }
async function db(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const req = indexedDB.open('spektra-manuals-v1',1);
    req.onupgradeneeded = () => req.result.createObjectStore('manuals',{keyPath:'id'});
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('Úložisko návodov sa nepodarilo otvoriť.'));
    req.onblocked = () => reject(new Error('Zatvorte ostatné karty aplikácie a skúste znova.'));
  });
}
export async function listManuals(): Promise<StoredManual[]> {
  const database = await db();
  return new Promise((resolve,reject) => {
    const tx = database.transaction('manuals');
    const req = tx.objectStore('manuals').getAll();
    tx.oncomplete = () => { database.close(); resolve(req.result); };
    tx.onerror = () => { database.close(); reject(new Error('Návody sa nepodarilo načítať.')); };
  });
}
export async function writeManual(manual: StoredManual | string): Promise<void> {
  const database = await db();
  return new Promise((resolve,reject) => {
    const tx = database.transaction('manuals','readwrite'), store = tx.objectStore('manuals');
    if (typeof manual === 'string') store.delete(manual); else store.put(manual);
    tx.oncomplete = () => { database.close(); resolve(); };
    tx.onabort = tx.onerror = () => { database.close(); reject(new Error('Návod sa neuložil. Skontrolujte voľné miesto v zariadení.')); };
  });
}
