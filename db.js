// db.js
const DB_NAME = 'financeflow_pro_db';
const DB_VERSION = 1;
let db;

function openDB() {
  return new Promise((res, rej) => {
    if (db) return res(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains('transactions')) {
        idb.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!idb.objectStoreNames.contains('meta')) {
        idb.createObjectStore('meta', { keyPath: 'k' });
      }
    };
    req.onsuccess = () => { db = req.result; res(db); };
    req.onerror = () => rej(req.error);
  });
}

async function put(storeName, value) {
  const idb = await openDB();
  return new Promise((res, rej) => {
    const tx = idb.transaction(storeName, 'readwrite');
    const st = tx.objectStore(storeName);
    const r = st.put(value);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function getAll(storeName) {
  const idb = await openDB();
  return new Promise((res, rej) => {
    const tx = idb.transaction(storeName, 'readonly');
    const st = tx.objectStore(storeName);
    const r = st.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function getItem(storeName, key) {
  const idb = await openDB();
  return new Promise((res, rej) => {
    const tx = idb.transaction(storeName, 'readonly');
    const st = tx.objectStore(storeName);
    const r = st.get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function deleteItem(storeName, key) {
  const idb = await openDB();
  return new Promise((res, rej) => {
    const tx = idb.transaction(storeName, 'readwrite');
    const st = tx.objectStore(storeName);
    const r = st.delete(key);
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

async function clearStore(storeName) {
  const idb = await openDB();
  return new Promise((res, rej) => {
    const tx = idb.transaction(storeName, 'readwrite');
    const st = tx.objectStore(storeName);
    const r = st.clear();
    r.onsuccess = () => res();
    r.onerror = () => rej(r.error);
  });
}

// export simple API on window
window.FFDB = { openDB, put, getAll, getItem, deleteItem, clearStore };
