// Firebase init (optional). Create `firebase-config.js` (module) next to this file
// by copying `firebase-config.example.js` and filling your values. If no config
// present, this module leaves the app untouched and localStorage remains primary.

try {
  const { firebaseConfig } = await import('./firebase-config.js');
  // load modular SDK via ESM CDN
  const [{ initializeApp }, { getFirestore, doc, getDoc, setDoc }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js'),
  ]);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const docRef = doc(db, 'gamify-life', 'logs');

  window.loadLogsRemote = async () => {
    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return [];
      const data = snap.data();
      return Array.isArray(data.items) ? data.items : [];
    } catch (e) {
      console.error('loadLogsRemote error', e);
      return [];
    }
  };

  window.saveLogsRemote = async (logs) => {
    try {
      await setDoc(docRef, { items: logs });
      return true;
    } catch (e) {
      console.error('saveLogsRemote error', e);
      return false;
    }
  };

  window.__firestoreEnabled = true;
  console.info('Firestore sync enabled (gamify-life).');
} catch (err) {
  // No config provided or import failed — silently ignore to keep localStorage fallback
  // console.info('No firebase-config.js found or failed to init Firestore.');
}
