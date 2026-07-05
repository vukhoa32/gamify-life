const STORAGE_KEY = 'gamify-life-logs';

const ACTIVITIES = [
  { id: 'walking-elliptical', name: 'Walking, Elliptical', icon: '🚶' },
  { id: 'running', name: 'Running', icon: '🏃' },
  { id: 'swimming', name: 'Swimming', icon: '🏊' },
  { id: 'main-job', name: 'Main job', icon: '💼' },
  { id: 'sleep-early', name: 'Sleep early', icon: '🌙' },
  { id: 'cooking-cleaning', name: 'Cooking, cleaning', icon: '🍳' },
  { id: 'tech-learning', name: 'Tech learning', icon: '💻' },
  { id: 'it-blog', name: 'IT blog reading', icon: '📰' },
  { id: 'journaling', name: 'Journaling', icon: '📓' },
  { id: 'job-seeking', name: 'Job seeking', icon: '🔍' },
  { id: 'singing', name: 'Singing', icon: '🎤' },
  { id: 'lying-bed', name: 'Lying in bed', icon: '🛏️' },
  { id: 'talk-friend', name: 'Talk to a friend', icon: '💬' },
  { id: 'hiking', name: 'Hiking', icon: '🥾' },
];

const activityById = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a]));

const els = {
  activityGrid: document.getElementById('activity-grid'),
  logList: document.getElementById('log-list'),
  dateIconsView: document.getElementById('date-icons-view'),
  activitiesScreen: document.getElementById('screen-activities'),
  dialog: document.getElementById('log-dialog'),
  dialogTitle: document.getElementById('dialog-title'),
  highIntensity: document.getElementById('high-intensity'),
  description: document.getElementById('description'),
  dialogCancel: document.getElementById('dialog-cancel'),
  logForm: document.getElementById('log-form'),
  toast: document.getElementById('toast'),
  viewButtons: document.querySelectorAll('.view-btn'),
};

let pendingActivity = null;
let editingLogId = null;
let deleteConfirmId = null;
let deleteConfirmTimer = null;
let toastTimer = null;
let activeView = null;

async function loadLogs() {
  if (window.__firestoreEnabled && typeof window.loadLogsRemote === 'function') {
    try {
      const remote = await window.loadLogsRemote();
      // keep a local cache for performance
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      return remote;
    } catch {
      // fallback to local
    }
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

async function saveLogs(logs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  if (window.__firestoreEnabled && typeof window.saveLogsRemote === 'function') {
    try {
      await window.saveLogsRemote(logs);
    } catch (e) {
      console.error('Failed to save logs to Firestore', e);
    }
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateKey) {
  if (dateKey === todayKey()) return 'Today';
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 1800);
}

function renderActivityButtons() {
  els.activityGrid.innerHTML = ACTIVITIES.map(
    (a) =>
      `<div class="activity-item" data-id="${a.id}">
        <button class="activity-btn" type="button">
          <span class="icon">${a.icon}</span>${a.name}
        </button>
        <button class="activity-add-btn" type="button" aria-label="Log ${escapeAttr(a.name)}">+</button>
      </div>`
  ).join('');

  els.activityGrid.addEventListener('click', (e) => {
    const addBtn = e.target.closest('.activity-add-btn');
    if (addBtn) {
      quickAddActivity(addBtn.closest('.activity-item').dataset.id);
      return;
    }
    const btn = e.target.closest('.activity-btn');
    if (btn) openDialog(btn.closest('.activity-item').dataset.id);
  });
}

function quickAddActivity(activityId) {
  const activity = activityById[activityId];
  if (!activity) return;
  addLog({
    id: crypto.randomUUID(),
    activityId: activity.id,
    activityName: activity.name,
    icon: activity.icon,
    highIntensity: false,
    description: '',
    timestamp: new Date().toISOString(),
    date: todayKey(),
  });
}

function openDialog(activityId, log = null) {
  pendingActivity = activityById[activityId];
  editingLogId = log?.id ?? null;
  els.dialogTitle.textContent = `${log ? 'Edit' : 'Log'}: ${pendingActivity.name}`;
  els.highIntensity.checked = log?.highIntensity ?? false;
  els.description.value = log?.description ?? '';
  els.dialog.showModal();
}

function openEditDialog(logId) {
  const log = loadLogs().find((l) => l.id === logId);
  if (log) openDialog(log.activityId, log);
}

function closeDialog() {
  pendingActivity = null;
  editingLogId = null;
  els.dialog.close();
}

async function addLog(entry) {
  const logs = await loadLogs();
  logs.unshift(entry);
  await saveLogs(logs);
  renderLogs();
  showToast(`+10 XP · ${entry.activityName}`);
}

async function updateLog(id, updates) {
  const logs = await loadLogs();
  const idx = logs.findIndex((l) => l.id === id);
  if (idx === -1) return;
  logs[idx] = { ...logs[idx], ...updates };
  await saveLogs(logs);
  renderLogs();
  showToast('Updated');
}

async function deleteLog(id) {
  const logs = (await loadLogs()).filter((l) => l.id !== id);
  await saveLogs(logs);
  renderLogs();
  showToast('Deleted');
}

function handleDeleteClick(id) {
  if (deleteConfirmId === id) {
    deleteConfirmId = null;
    clearTimeout(deleteConfirmTimer);
    deleteLog(id);
    return;
  }
  deleteConfirmId = id;
  clearTimeout(deleteConfirmTimer);
  renderLogs();
  deleteConfirmTimer = setTimeout(() => {
    deleteConfirmId = null;
    renderLogs();
  }, 3000);
}

function renderLogList(logs) {
  const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const today = todayKey();
  const todayLogs = sorted.filter((l) => l.date === today);
  const older = sorted.filter((l) => l.date !== today);

  const sections = [];

  if (todayLogs.length) {
    sections.push({ label: 'Today', items: todayLogs });
  }

  const olderByDate = {};
  older.forEach((log) => {
    (olderByDate[log.date] ||= []).push(log);
  });
  Object.keys(olderByDate)
    .sort((a, b) => b.localeCompare(a))
    .forEach((date) => sections.push({ label: formatDateLabel(date), items: olderByDate[date] }));

  if (!sections.length) {
    els.logList.innerHTML = '<p class="empty-state">No activities logged yet. Tap one above!</p>';
    return;
  }

  els.logList.innerHTML = sections
    .map(
      (section) => `
      <div class="date-group">
        <div class="date-group-label">${section.label}</div>
        ${section.items.map(renderLogEntry).join('')}
      </div>`
    )
    .join('');
}

function renderLogEntry(log) {
  const hi = log.highIntensity ? '<span title="High intensity">⚡</span>' : '';
  const desc = log.description
    ? `<p class="log-entry-desc">${escapeHtml(log.description)}</p>`
    : '';
  const deleteConfirm = deleteConfirmId === log.id ? ' confirm' : '';
  return `
    <article class="log-entry${log.highIntensity ? ' high-intensity' : ''}" data-log-id="${log.id}">
      <button type="button" class="log-entry-body">
        <div class="log-entry-header">
          <span>${log.icon}</span>
          <span>${escapeHtml(log.activityName)}</span>
          ${hi}
        </div>
        <div class="log-entry-meta">${formatTime(log.timestamp)}</div>
        ${desc}
      </button>
      <button type="button" class="log-delete-btn${deleteConfirm}" data-log-id="${log.id}" aria-label="Delete">${deleteConfirm ? '✓' : '✕'}</button>
    </article>`;
}

function renderDateIcons(logs) {
  if (!logs.length) {
    els.dateIconsView.innerHTML = '<p class="empty-state">No logs yet</p>';
    return;
  }

  const byDate = {};
  logs.forEach((log) => {
    (byDate[log.date] ||= []).push(log);
  });

  els.dateIconsView.innerHTML = Object.keys(byDate)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const items = byDate[date]
        .map(
          (log) =>
            `<span class="date-icon-chip${log.highIntensity ? ' high' : ''}" title="${escapeAttr(log.activityName)}">${log.icon}</span>`
        )
        .join('');
      return `
        <div class="date-group">
          <div class="date-group-label">${formatDateLabel(date)}</div>
          <div class="date-icons-row">${items}</div>
        </div>`;
    })
    .join('');
}

function renderLogs() {
  const logs = loadLogs();
  renderLogList(logs);
  renderDateIcons(logs);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function setViewMode(mode) {
  activeView = mode;
  els.activitiesScreen.classList.remove('view-expanded', 'view-icons');
  if (mode === 'expanded') els.activitiesScreen.classList.add('view-expanded');
  if (mode === 'icons') els.activitiesScreen.classList.add('view-icons');
  els.viewButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });
}

function initViewButtons() {
  els.viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.view;
      setViewMode(activeView === mode ? null : mode);
    });
  });
}
function initTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
      });
      document.querySelectorAll('.screen').forEach((screen) => {
        screen.classList.toggle('active', screen.id === `screen-${tab.dataset.tab}`);
      });
    });
  });
}

function initLogList() {
  els.logList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.log-delete-btn');
    if (deleteBtn) {
      e.stopPropagation();
      handleDeleteClick(deleteBtn.dataset.logId);
      return;
    }
    const entry = e.target.closest('.log-entry-body');
    if (entry) openEditDialog(entry.closest('.log-entry').dataset.logId);
  });
}

els.dialogCancel.addEventListener('click', closeDialog);

els.logForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!pendingActivity) return;

  const fields = {
    highIntensity: els.highIntensity.checked,
    description: els.description.value.trim(),
  };

  if (editingLogId) {
    await updateLog(editingLogId, fields);
  } else {
    await addLog({
      id: crypto.randomUUID(),
      activityId: pendingActivity.id,
      activityName: pendingActivity.name,
      icon: pendingActivity.icon,
      ...fields,
      timestamp: new Date().toISOString(),
      date: todayKey(),
    });
  }

  closeDialog();
});

async function startApp() {
  renderActivityButtons();
  renderLogs();
  initLogList();
  initTabs();
  initViewButtons();
}

startApp();
