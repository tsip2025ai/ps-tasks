// Simple IndexedDB outbox + Firestore sync logic (no external lib)
// ΠΡΟΣΟΧΗ: Αυτό είναι ένα απλό παράδειγμα. Για παραγωγή, εξετάστε βιβλιοθήκες όπως idb ή dexie.

const dbName = 'sportclub-pwa-db';
const dbVersion = 1;
let db;

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, dbVersion);
    req.onupgradeneeded = (e) => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains('outbox')) {
        idb.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
      }
      if (!idb.objectStoreNames.contains('items')) {
        idb.createObjectStore('items', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

function addToOutbox(doc) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox', 'readwrite');
    tx.objectStore('outbox').add({ ...doc, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getOutbox() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox','readonly');
    const req = tx.objectStore('outbox').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function clearOutbox() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('outbox','readwrite');
    tx.objectStore('outbox').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function cacheItemsLocal(items) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items','readwrite');
    const store = tx.objectStore('items');
    store.clear();
    items.forEach(it => store.put(it));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function readLocalItems() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items','readonly');
    const req = tx.objectStore('items').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// UI helpers
const statusEl = document.getElementById('status');
const itemsList = document.getElementById('items-list');
const syncInfo = document.getElementById('sync-info');
const input = document.getElementById('item-input');
const addBtn = document.getElementById('add-btn');

function renderItems(items) {
  itemsList.innerHTML = '';
  items.sort((a,b)=> (a.createdAt||0)-(b.createdAt||0)).forEach(it=>{
    const li = document.createElement('li');
    li.textContent = it.text + (it._local ? ' (local)' : '');
    itemsList.appendChild(li);
  });
}

function setStatus() {
  const online = navigator.onLine;
  statusEl.innerHTML = online ? 'Σύνδεση: Online' : '<span class="offline">Σύνδεση: Offline</span>';
}

// Firestore references
let firestore;
let unsubscribeRealtime = null;

async function startApp() {
  await openDB();
  setStatus();
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', setStatus);

  // init firestore
  if (typeof firebase !== 'undefined' && firebase.firestore) {
    firestore = firebase.firestore();
  } else {
    console.warn('Firestore not available');
  }

  // Try to subscribe realtime if online
  if (navigator.onLine && firestore) {
    startRealtime();
  } else {
    // load cached local items
    const local = await readLocalItems();
    renderItems(local);
    syncInfo.textContent = 'Εργασία σε offline: εμφανίζονται τα τοπικά αποθηκευμένα αντικείμενα.';
  }
}

function startRealtime() {
  if (!firestore) return;
  // Listen to collection 'items'
  unsubscribeRealtime = firestore.collection('items')
    .orderBy('createdAt')
    .onSnapshot(async (snap) => {
      const items = [];
      snap.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      renderItems(items);
      await openDB();
      await cacheItemsLocal(items);
      syncInfo.textContent = 'Συγχρονισμένα δεδομένα από Firestore.';
    }, err => {
      console.error('Realtime snapshot error', err);
      syncInfo.textContent = 'Σφάλμα realtime.';
    });
}

async function handleOnline() {
  setStatus();
  syncInfo.textContent = 'Είστε online — συγχρονισμός...';
  // First flush outbox
  try {
    await openDB();
    const outbox = await getOutbox();
    if (outbox.length && firestore) {
      for (const item of outbox) {
        // push to Firestore
        await firestore.collection('items').add({
          text: item.text,
          createdAt: item.createdAt || Date.now()
        });
      }
      await clearOutbox();
      syncInfo.textContent = 'Outbox συγχρονίστηκε.';
    }
  } catch (err) {
    console.warn('Sync failed', err);
    syncInfo.textContent = 'Σφάλμα συγχρονισμού outbox.';
  }

  // Start realtime listener if not active
  if (!unsubscribeRealtime && firestore) startRealtime();
}

addBtn.addEventListener('click', async () => {
  const text = input.value && input.value.trim();
  if (!text) return;
  input.value = '';

  const doc = { text, createdAt: Date.now() };

  if (navigator.onLine && firestore) {
    // attempt immediate write
    try {
      await firestore.collection('items').add(doc);
      syncInfo.textContent = 'Αποστολή στο Firestore...';
    } catch (err) {
      // If it fails, fallback to outbox
      await openDB();
      await addToOutbox(doc);
      syncInfo.textContent = 'Απέτυχε αποστολή — αποθηκεύτηκε τοπικά (outbox).';
    }
  } else {
    // save locally to outbox
    await openDB();
    await addToOutbox(doc);
    // also show locally in items list
    const localItems = await readLocalItems();
    localItems.push({ id: 'local-'+Date.now(), text: text, createdAt: doc.createdAt, _local: true });
    renderItems(localItems);
    syncInfo.textContent = 'Offline — αποθηκεύτηκε στο outbox.';
  }
});

// Start
startApp();
