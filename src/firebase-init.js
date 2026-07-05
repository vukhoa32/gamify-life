(function () {
  async function initFirebase() {
    const firebaseConfig = window.firebaseConfig;
    if (!firebaseConfig) {
      window.__firestoreEnabled = false;
      window.__firestoreDisabledReason = 'missing-config';
      console.info('Firestore disabled: missing config.');
      return;
    }

    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) || window.location.protocol === 'file:';
    const forceRemote = window.location.search.includes('firestore=remote');
    const useEmulator = isLocalHost && !forceRemote;

    try {
      const [{ initializeApp }, { getFirestore, doc, getDoc, setDoc, onSnapshot, connectFirestoreEmulator }] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js'),
      ]);

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const docRef = doc(db, 'gamify-life', 'logs');
      let firestoreEnabled = false;

      if (useEmulator) {
        try {
          connectFirestoreEmulator(db, '127.0.0.1', 8080);
          console.info('Firestore emulator configured for local development.');
        } catch (err) {
          console.warn('Firestore emulator setup failed; using localStorage only.', err);
        }
      }

      try {
        const probe = await getDoc(docRef);
        firestoreEnabled = Boolean(probe);
      } catch (err) {
        console.warn('Firestore backend not reachable; using localStorage only.', err);
        firestoreEnabled = false;
      }

      if (!firestoreEnabled) {
        window.__firestoreEnabled = false;
        window.__firestoreDisabledReason = 'unreachable';
        return;
      }

      const syncRemoteLogs = (items) => {
        const safeItems = Array.isArray(items) ? items : [];
        localStorage.setItem('gamify-life-logs', JSON.stringify(safeItems));
        window.dispatchEvent(new CustomEvent('firestore-logs-updated', { detail: safeItems }));
      };

      window.loadLogsRemote = async () => {
        try {
          const snap = await getDoc(docRef);
          if (!snap.exists()) return [];
          const data = snap.data();
          return Array.isArray(data.items) ? data.items : [];
        } catch (e) {
          console.warn('loadLogsRemote error; falling back to localStorage.', e);
          return [];
        }
      };

      window.saveLogsRemote = async (logs) => {
        try {
          await setDoc(docRef, { items: logs });
          return true;
        } catch (e) {
          console.warn('saveLogsRemote error; falling back to localStorage.', e);
          return false;
        }
      };

      onSnapshot(docRef, (snap) => {
        const items = snap.exists() ? (Array.isArray(snap.data().items) ? snap.data().items : []) : [];
        syncRemoteLogs(items);
      }, (err) => {
        console.warn('Firestore listener unavailable; continuing with localStorage.', err);
        window.__firestoreEnabled = false;
        window.__firestoreDisabledReason = 'listener-failed';
      });

      window.__firestoreEnabled = true;
      console.info('Firestore sync enabled (gamify-life).');
    } catch (err) {
      window.__firestoreEnabled = false;
      window.__firestoreDisabledReason = 'init-failed';
      console.warn('Firestore init failed; using localStorage only.', err);
    }
  }

  initFirebase();
})();
