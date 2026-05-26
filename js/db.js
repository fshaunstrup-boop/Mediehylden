// IndexedDB wrapper — al data gemmes lokalt på enheden

const DB_NAME    = 'mediehylden';
const DB_VERSION = 1;
const STORE      = 'media';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('category',   'category',   { unique: false });
        store.createIndex('dateAdded',  'dateAdded',  { unique: false });
        store.createIndex('rating',     'rating',     { unique: false });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

function tx(mode = 'readonly') {
  return openDB().then((db) => {
    const t = db.transaction(STORE, mode);
    return t.objectStore(STORE);
  });
}

function run(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// Generer et simpelt UUID
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── CRUD ────────────────────────────────────────────────

export async function addItem(data) {
  const store = await tx('readwrite');
  const item  = {
    ...data,
    id:           uuid(),
    dateAdded:    Date.now(),
    dateModified: Date.now(),
  };
  await run(store.add(item));
  return item;
}

export async function updateItem(id, data) {
  const store   = await tx('readwrite');
  const existing = await run(store.get(id));
  if (!existing) throw new Error('Medie ikke fundet');
  const updated = { ...existing, ...data, id, dateModified: Date.now() };
  await run(store.put(updated));
  return updated;
}

export async function deleteItem(id) {
  const store = await tx('readwrite');
  await run(store.delete(id));
}

export async function getItem(id) {
  const store = await tx();
  return run(store.get(id));
}

export async function getAllItems() {
  const store = await tx();
  return run(store.getAll());
}

export async function getItemsByCategory(category) {
  const store = await tx();
  const index = store.index('category');
  return run(index.getAll(category));
}

// Returnerer { total, byCategory: { music: n, film: n, ... }, avgRating }
export async function getStats() {
  const all = await getAllItems();
  const byCategory = {};
  let ratingSum   = 0;
  let ratingCount = 0;

  for (const item of all) {
    byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
    if (item.rating != null) {
      ratingSum += item.rating;
      ratingCount++;
    }
  }

  return {
    total: all.length,
    byCategory,
    avgRating: ratingCount > 0 ? +(ratingSum / ratingCount).toFixed(1) : null,
  };
}
