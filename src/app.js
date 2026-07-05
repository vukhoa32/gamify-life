const STORAGE_KEY = 'gamify-life-logs';
const EVENTS_KEY = 'gamify-life-events';

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
  eventList: document.getElementById('event-list'),
  eventAddBtn: document.getElementById('event-add-btn'),
  eventSortBtn: document.getElementById('event-sort-btn'),
  eventDialog: document.getElementById('event-dialog'),
  eventDialogTitle: document.getElementById('event-dialog-title'),
  eventTitle: document.getElementById('event-title'),
  eventDate: document.getElementById('event-date'),
  eventDescription: document.getElementById('event-description'),
  eventForm: document.getElementById('event-form'),
  eventDialogCancel: document.getElementById('event-dialog-cancel'),
};

let pendingActivity = null;
let editingLogId = null;
let deleteConfirmId = null;
let deleteConfirmTimer = null;
let toastTimer = null;
let activeView = null;
let selectedDate = null;
let editingEventId = null;
let eventSortByAdded = false;

async function loadLogs() {
  if (window.__firestoreEnabled && typeof window.loadLogsRemote === 'function') {
    try {
      const remote = await window.loadLogsRemote();
      const safeRemote = Array.isArray(remote) ? remote : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeRemote));
      return safeRemote;
    } catch {
      // fallback to local
    }
  }
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
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

function loadEvents() {
  try {
    const stored = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
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

function formatShortDate(dateKey) {
  if (!dateKey) return '';
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
    activityDate: selectedDate || todayKey(),
    updatedAt: new Date().toISOString(),
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

async function openEditDialog(logId) {
  const logs = await loadLogs();
  const log = logs.find((l) => l.id === logId);
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
  await renderLogs();
  showToast(`+10 XP · ${entry.activityName}`);
}

async function updateLog(id, updates) {
  const logs = await loadLogs();
  const idx = logs.findIndex((l) => l.id === id);
  if (idx === -1) return;
  logs[idx] = { ...logs[idx], ...updates, updatedAt: new Date().toISOString() };
  await saveLogs(logs);
  await renderLogs();
  showToast('Updated');
}

async function deleteLog(id) {
  const logs = (await loadLogs()).filter((l) => l.id !== id);
  await saveLogs(logs);
  await renderLogs();
  showToast('Deleted');
}

function setDeleteConfirmState(id, isConfirming) {
  document.querySelectorAll('.log-delete-btn').forEach((btn) => {
    const shouldConfirm = btn.dataset.logId === id && isConfirming;
    btn.classList.toggle('confirm', shouldConfirm);
    btn.textContent = shouldConfirm ? '✓' : '✕';
  });
}

async function handleDeleteClick(id) {
  if (deleteConfirmId === id) {
    deleteConfirmId = null;
    clearTimeout(deleteConfirmTimer);
    setDeleteConfirmState(null, false);
    await deleteLog(id);
    return;
  }
  deleteConfirmId = id;
  clearTimeout(deleteConfirmTimer);
  setDeleteConfirmState(id, true);
  deleteConfirmTimer = setTimeout(() => {
    deleteConfirmId = null;
    setDeleteConfirmState(null, false);
  }, 3000);
}

function getVisibleLogs(logs) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  if (!selectedDate) {
    return safeLogs;
  }
  return safeLogs.filter((log) => (log.activityDate || log.date || todayKey()) === selectedDate);
}

function renderLogList(logs) {
  const visibleLogs = getVisibleLogs(logs);
  const sorted = [...visibleLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const groups = {};

  sorted.forEach((log) => {
    const key = log.date || todayKey();
    (groups[key] ||= []).push(log);
  });

  const dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a)).slice(0, 7);
  const sections = dateKeys.map((date) => ({ label: formatDateLabel(date), items: groups[date] }));

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
  const meta = log.activityDate && log.activityDate !== log.date
    ? `<div class="log-entry-meta">${formatTime(log.timestamp)} · ${formatDateLabel(log.activityDate)}</div>`
    : `<div class="log-entry-meta">${formatTime(log.timestamp)}</div>`;
  const deleteConfirm = deleteConfirmId === log.id ? ' confirm' : '';
  return `
    <article class="log-entry${log.highIntensity ? ' high-intensity' : ''}" data-log-id="${log.id}">
      <button type="button" class="log-entry-body">
        <div class="log-entry-header">
          <span>${log.icon}</span>
          <span>${escapeHtml(log.activityName)}</span>
          ${hi}
        </div>
        ${meta}
        ${desc}
      </button>
      <button type="button" class="log-delete-btn${deleteConfirm}" data-log-id="${log.id}" aria-label="Delete">${deleteConfirm ? '✓' : '✕'}</button>
    </article>`;
}

function renderDateIcons(logs) {
  const visibleLogs = getVisibleLogs(logs);
  const dates = [...new Set(visibleLogs.map((log) => (log.activityDate || log.date || todayKey())).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const recentDates = dates.slice(0, 50);

  if (!recentDates.length) {
    els.dateIconsView.innerHTML = '<p class="empty-state">No logs yet</p>';
    return;
  }

  els.dateIconsView.innerHTML = recentDates
    .map((date) => {
      const items = visibleLogs.filter((log) => (log.activityDate || log.date || todayKey()) === date);
      const chips = items
        .map((log) => `<span class="date-icon-chip${log.highIntensity ? ' high' : ''}" title="${escapeAttr(log.activityName)}">${log.icon}</span>`)
        .join('');
      return `
        <button type="button" class="date-button" data-date="${date}">
          <div class="date-group-label">${formatDateLabel(date)}</div>
          <div class="date-icons-row">${chips}</div>
        </button>`;
    })
    .join('');
}

async function renderLogs() {
  const logs = await loadLogs();
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
    if (entry) {
      const logId = entry.closest('.log-entry').dataset.logId;
      openEditDialog(logId);
    }
  });
}

function initDatePickerView() {
  els.dateIconsView.addEventListener('click', (e) => {
    const btn = e.target.closest('.date-button');
    if (!btn) return;
    selectedDate = btn.dataset.date;
    setViewMode(null);
    renderLogs();
  });
}

function renderEvents() {
  const events = loadEvents().sort((a, b) => {
    if (eventSortByAdded) {
      return new Date(b.createdAt || b.eventDate) - new Date(a.createdAt || a.eventDate);
    }
    return a.eventDate.localeCompare(b.eventDate);
  });
  if (!events.length) {
    els.eventList.innerHTML = '<p class="empty-state">No events yet. Tap add to create one.</p>';
    return;
  }
  els.eventList.innerHTML = events
    .map((event) => `
      <button type="button" class="event-item" data-event-id="${event.id}">
        <div class="event-item-title">${escapeHtml(event.title)}</div>
        <div class="event-item-meta">${formatShortDate(event.eventDate)}</div>
        ${event.description ? `<div class="event-item-desc">${escapeHtml(event.description)}</div>` : ''}
      </button>`)
    .join('');
}

function openEventDialog(event = null) {
  editingEventId = event?.id ?? null;
  els.eventDialogTitle.textContent = event ? 'Edit event' : 'Add event';
  els.eventTitle.value = event?.title ?? '';
  els.eventDate.value = event?.eventDate ?? todayKey();
  els.eventDescription.value = event?.description ?? '';
  els.eventDialog.showModal();
}

function closeEventDialog() {
  editingEventId = null;
  els.eventDialog.close();
}

function saveEventFromForm() {
  const title = els.eventTitle.value.trim();
  const eventDate = els.eventDate.value;
  const description = els.eventDescription.value.trim();
  if (!title || !eventDate) return;
  const events = loadEvents();
  if (editingEventId) {
    const idx = events.findIndex((event) => event.id === editingEventId);
    if (idx >= 0) {
      events[idx] = { ...events[idx], title, eventDate, description, updatedAt: new Date().toISOString() };
    }
  } else {
    events.unshift({
      id: crypto.randomUUID(),
      title,
      eventDate,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  saveEvents(events);
  renderEvents();
  closeEventDialog();
  showToast(editingEventId ? 'Event updated' : 'Event added');
}

function initEvents() {
  els.eventAddBtn.addEventListener('click', () => openEventDialog());
  els.eventSortBtn.addEventListener('click', () => {
    eventSortByAdded = !eventSortByAdded;
    els.eventSortBtn.classList.toggle('active', eventSortByAdded);
    els.eventSortBtn.textContent = eventSortByAdded ? 'Sort by added date ✓' : 'Sort by event date';
    renderEvents();
  });
  els.eventList.addEventListener('click', (e) => {
    const item = e.target.closest('.event-item');
    if (!item) return;
    const event = loadEvents().find((entry) => entry.id === item.dataset.eventId);
    if (event) openEventDialog(event);
  });
  els.eventDialogCancel.addEventListener('click', closeEventDialog);
  els.eventForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEventFromForm();
  });
  renderEvents();
}

window.addEventListener('firestore-logs-updated', async () => {
  await renderLogs();
});

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
      activityDate: selectedDate || todayKey(),
      updatedAt: new Date().toISOString(),
    });
  }

  closeDialog();
});

async function startApp() {
  renderActivityButtons();
  await renderLogs();
  initLogList();
  initDatePickerView();
  initTabs();
  initViewButtons();
  initEvents();
}

startApp();
