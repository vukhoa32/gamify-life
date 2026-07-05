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

      const readRemoteState = async () => {
        const snap = await getDoc(docRef);
        const data = snap.exists() ? snap.data() : {};
        return {
          logs: Array.isArray(data.logs) ? data.logs : (Array.isArray(data.items) ? data.items : []),
          events: Array.isArray(data.events) ? data.events : [],
        };
      };

      try {
        const state = await readRemoteState();
        firestoreEnabled = Array.isArray(state.logs) || Array.isArray(state.events);
      } catch (err) {
        console.warn('Firestore backend not reachable; using localStorage only.', err);
        firestoreEnabled = false;
      }

      if (!firestoreEnabled) {
        window.__firestoreEnabled = false;
        window.__firestoreDisabledReason = 'unreachable';
        return;
      }

      const syncRemoteState = (state) => {
        const safeLogs = Array.isArray(state.logs) ? state.logs : [];
        const safeEvents = Array.isArray(state.events) ? state.events : [];
        localStorage.setItem('gamify-life-logs', JSON.stringify(safeLogs));
        localStorage.setItem('gamify-life-events', JSON.stringify(safeEvents));
        window.dispatchEvent(new CustomEvent('firestore-state-updated', {
          detail: { logs: safeLogs, events: safeEvents },
        }));
      };

      window.loadLogsRemote = async () => (await readRemoteState()).logs;
      window.loadEventsRemote = async () => (await readRemoteState()).events;

      window.saveLogsRemote = async (logs) => {
        try {
          const current = await readRemoteState();
          await setDoc(docRef, { items: logs, logs, events: current.events }, { merge: true });
          return true;
        } catch (e) {
          console.warn('saveLogsRemote error; falling back to localStorage.', e);
          return false;
        }
      };

      window.saveEventsRemote = async (events) => {
        try {
          const current = await readRemoteState();
          await setDoc(docRef, { events, logs: current.logs, items: current.logs }, { merge: true });
          return true;
        } catch (e) {
          console.warn('saveEventsRemote error; falling back to localStorage.', e);
          return false;
        }
      };

      onSnapshot(docRef, (snap) => {
        const data = snap.exists() ? snap.data() : {};
        syncRemoteState({
          logs: Array.isArray(data.logs) ? data.logs : (Array.isArray(data.items) ? data.items : []),
          events: Array.isArray(data.events) ? data.events : [],
        });
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
