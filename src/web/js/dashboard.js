/**
 * NeosTech · Access Control Dashboard
 * dashboard.js — Modular, Firebase-ready (stub hooks included)
 *
 * Architecture:
 *   State ──► Data Layer (stubs / Firestore) ──► Render Layer ──► DOM
 *
 * How to wire Firebase (see bottom of file for instructions).
 */

'use strict';

/* ============================================================
   SECTION 1 — APP STATE
   Single source of truth. Never mutate directly — use setState().
============================================================ */

/** @type {AppState} */
const state = {
  // Auth
  user:       null,       // Firebase User object
  clientId:   null,       // Multi-tenant isolator

  // Data
  events:     [],         // Recent access events (rfid_events)
  users:      [],         // Users list
  tags:       [],         // RFID tags
  alerts:     [],         // Active alerts
  readers:    [],         // Connected readers / access points

  // UI
  currentView:  'dashboard',
  theme:        'dark',
  sidebarOpen:  true,
  filterActive: 'all',    // 'all' | 'allowed' | 'denied' | 'rfid' | 'qr'

  // Firestore unsubscribe handles (call to stop real-time listeners)
  _unsubs: [],
};

/**
 * Shallow-merge updates into state and re-render affected components.
 * @param {Partial<AppState>} patch
 */
function setState(patch) {
  Object.assign(state, patch);
}


/* ============================================================
   SECTION 2 — FIREBASE INTEGRATION HOOKS
   All Firestore calls are isolated here.
   Swap the stub bodies for real SDK calls without touching UI code.
============================================================ */

/**
 * Initialize Firebase app.
 * Called once on DOMContentLoaded, before auth check.
 *
 * Firestore integration:
 *   import { initializeApp } from 'firebase/app';
 *   const app = initializeApp(firebaseConfig);
 *   window.__db   = getFirestore(app);
 *   window.__auth = getAuth(app);
 */
function initFirebase() {
  // Stub: no-op until Firebase SDK is loaded
  // In production remove this stub and call real init in layout.html <script type="module">
  console.info('[NeosTech] Firebase init stub. Wire SDK in layout.html.');
}

/**
 * Subscribe to auth state changes.
 * When authenticated, calls onUser(user). When signed out, calls onSignOut().
 *
 * Firestore integration:
 *   import { onAuthStateChanged } from 'firebase/auth';
 *   return onAuthStateChanged(window.__auth, user => user ? onUser(user) : onSignOut());
 *
 * @param {(user: object) => void} onUser
 * @param {() => void} onSignOut
 * @returns {() => void} unsubscribe
 */
function subscribeAuth(onUser, onSignOut) {
  // Stub: simulate logged-in admin after 600ms
  const t = setTimeout(() => {
    onUser({
      uid:         'stub-uid-001',
      email:       'admin@neos.tech',
      displayName: 'Admin Demo',
    });
  }, 600);
  return () => clearTimeout(t);
}

/**
 * Load KPI counters for today.
 * Resolves with { accessCount, activeUsers, activeAlerts, readersOnline, accessDeltaPct }
 *
 * Firestore integration:
 *   const today = new Date(); today.setHours(0,0,0,0);
 *   const snap = await getDocs(query(
 *     collection(db, 'rfid_events'),
 *     where('clientId', '==', state.clientId),
 *     where('timestamp', '>=', Timestamp.fromDate(today))
 *   ));
 *   return { accessCount: snap.size, ... };
 *
 * @returns {Promise<KpiData>}
 */
async function loadKPIs() {
  await delay(400);
  return {
    accessCount:    Math.floor(Math.random() * 140) + 20,
    activeUsers:    Math.floor(Math.random() * 60)  + 10,
    activeAlerts:   Math.floor(Math.random() * 3),
    readersOnline:  3,
    totalReaders:   4,
    accessDeltaPct: +(Math.random() * 30 - 5).toFixed(1),
  };
}

/**
 * Load recent access events (one-shot fetch).
 * For real-time, use subscribeToLiveEvents().
 *
 * Firestore integration:
 *   const snap = await getDocs(query(
 *     collection(db, 'rfid_events'),
 *     where('clientId', '==', state.clientId),
 *     orderBy('timestamp', 'desc'),
 *     limit(50)
 *   ));
 *   return snap.docs.map(d => ({ id: d.id, ...d.data() }));
 *
 * @param {number} [limit=50]
 * @returns {Promise<AccessEvent[]>}
 */
async function loadRecentEvents(limit = 50) {
  await delay(300);
  return generateMockEvents(limit);
}

/**
 * Subscribe to live access events (Firestore onSnapshot).
 * Calls callback(newEvent) every time a new event is written.
 *
 * Firestore integration:
 *   return onSnapshot(
 *     query(collection(db,'rfid_events'), where('clientId','==',clientId),
 *           orderBy('timestamp','desc'), limitF(1)),
 *     snap => snap.docChanges()
 *       .filter(c => c.type === 'added')
 *       .forEach(c => callback({ id: c.doc.id, ...c.doc.data() }))
 *   );
 *
 * @param {string} clientId
 * @param {(event: AccessEvent) => void} callback
 * @returns {() => void} unsubscribe
 */
function subscribeToLiveEvents(clientId, callback) {
  // Stub: push a random event every 4-8 seconds
  let t;
  const tick = () => {
    callback(generateMockEvents(1)[0]);
    t = setTimeout(tick, 4000 + Math.random() * 4000);
  };
  t = setTimeout(tick, 2000);
  return () => clearTimeout(t);
}

/**
 * Load all users for the current tenant.
 *
 * Firestore integration:
 *   const snap = await getDocs(query(
 *     collection(db, 'users'),
 *     where('clientId', '==', state.clientId)
 *   ));
 *   return snap.docs.map(d => ({ id: d.id, ...d.data() }));
 *
 * @returns {Promise<User[]>}
 */
async function loadUsers() {
  await delay(300);
  return [
    { id: 'u1', name: 'María García',    email: 'maria@neos.tech',    role: 'resident',  tagsCount: 1, weeklyAccess: 12, status: 'active'   },
    { id: 'u2', name: 'Carlos López',    email: 'carlos@neos.tech',   role: 'admin',     tagsCount: 2, weeklyAccess: 34, status: 'active'   },
    { id: 'u3', name: 'Ana Martínez',    email: 'ana@neos.tech',      role: 'resident',  tagsCount: 1, weeklyAccess:  7, status: 'active'   },
    { id: 'u4', name: 'Pedro Sánchez',   email: 'pedro@neos.tech',    role: 'visitor',   tagsCount: 0, weeklyAccess:  2, status: 'inactive' },
    { id: 'u5', name: 'Laura Rodríguez', email: 'laura@neos.tech',    role: 'staff',     tagsCount: 1, weeklyAccess: 19, status: 'active'   },
  ];
}

/**
 * Load all RFID tags for the current tenant.
 *
 * Firestore integration:
 *   const snap = await getDocs(query(
 *     collection(db, 'rfid_tags'),
 *     where('clientId', '==', state.clientId)
 *   ));
 *
 * @returns {Promise<Tag[]>}
 */
async function loadTags() {
  await delay(250);
  return [
    { id: 't1', uid: 'A3:B4:C5:D6', type: 'rfid', assignedTo: 'María García',  lastAccess: new Date(Date.now() - 3_600_000),   status: 'active'   },
    { id: 't2', uid: 'F1:E2:D3:C4', type: 'rfid', assignedTo: 'Carlos López',  lastAccess: new Date(Date.now() - 7_200_000),   status: 'active'   },
    { id: 't3', uid: 'QR-2024-001',  type: 'qr',   assignedTo: 'Pedro Sánchez', lastAccess: new Date(Date.now() - 86_400_000),  status: 'expired'  },
    { id: 't4', uid: '11:22:33:44',  type: 'rfid', assignedTo: null,            lastAccess: null,                               status: 'inactive' },
  ];
}

/**
 * Load active alerts.
 *
 * Firestore integration:
 *   const snap = await getDocs(query(
 *     collection(db, 'alerts'),
 *     where('clientId', '==', state.clientId),
 *     where('status', '==', 'active')
 *   ));
 *
 * @returns {Promise<Alert[]>}
 */
async function loadAlerts() {
  await delay(200);
  return [];   // Stub: no active alerts
}

/**
 * Load hourly access data for today's chart.
 *
 * Firestore integration:
 *   Aggregate rfid_events grouped by hour using server-side aggregation
 *   or client-side reduce on today's events.
 *
 * @returns {Promise<HourlyData[]>}  Array of 24 items: { hour, allowed, denied }
 */
async function loadHourlyData() {
  await delay(200);
  return Array.from({ length: 24 }, (_, h) => ({
    hour:    h,
    allowed: Math.random() < 0.6 ? Math.floor(Math.random() * 15) : 0,
    denied:  Math.random() < 0.25 ? Math.floor(Math.random() * 3)  : 0,
  }));
}

/**
 * Save a new tag to Firestore.
 *
 * Firestore integration:
 *   await addDoc(collection(db, 'rfid_tags'), {
 *     ...tagData,
 *     clientId: state.clientId,
 *     createdAt: serverTimestamp(),
 *   });
 *
 * @param {{ uid: string, type: string, assignedTo: string }} tagData
 * @returns {Promise<void>}
 */
async function saveTag(tagData) {
  await delay(500);
  console.log('[NeosTech] saveTag stub →', tagData);
  // Stub: push to local state
  state.tags.unshift({ id: `t${Date.now()}`, ...tagData, status: 'active', lastAccess: null });
}

/**
 * Save a new alert to Firestore.
 *
 * Firestore integration:
 *   await addDoc(collection(db, 'alerts'), {
 *     ...alertData,
 *     clientId: state.clientId,
 *     status: 'active',
 *     createdAt: serverTimestamp(),
 *   });
 *
 * @param {{ type: string, message: string, accessPoint: string }} alertData
 * @returns {Promise<void>}
 */
async function saveAlert(alertData) {
  await delay(500);
  console.log('[NeosTech] saveAlert stub →', alertData);
}

/**
 * Sign out the current user.
 *
 * Firestore integration:
 *   await signOut(window.__auth);
 */
async function doSignOut() {
  await delay(200);
  // Clean up all real-time listeners
  state._unsubs.forEach(fn => fn());
  setState({ _unsubs: [], user: null, clientId: null });
  showToast('Sesión cerrada', 'Has cerrado sesión correctamente.', 'info');
  // In production: window.location.href = '/login.html';
}


/* ============================================================
   SECTION 3 — RENDER LAYER
   Pure functions: receive data ──► return / mutate DOM.
   Never call Firestore here.
============================================================ */

/** Render KPI cards */
function renderKPIs(data) {
  setText('kpiAccessCount',  fmtNumber(data.accessCount));
  setText('kpiUsersCount',   fmtNumber(data.activeUsers));
  setText('kpiAlertsCount',  fmtNumber(data.activeAlerts));
  setText('kpiReadersCount', `${data.readersOnline}/${data.totalReaders}`);
  setText('kpiReadersSub',   data.readersOnline === data.totalReaders ? 'Todos online' : `${data.totalReaders - data.readersOnline} offline`);

  const delta = data.accessDeltaPct;
  const deltaEl = document.getElementById('kpiAccessDelta');
  const deltaValEl = document.getElementById('kpiAccessDeltaValue');
  if (deltaEl && deltaValEl) {
    deltaValEl.textContent = `${Math.abs(delta)}%`;
    deltaEl.className = `kpi-card__delta ${delta >= 0 ? 'kpi-card__delta--up' : 'kpi-card__delta--down'}`;
  }

  const alertCard = document.getElementById('kpiAlertCard');
  if (alertCard) {
    alertCard.classList.toggle('kpi-card--alert', data.activeAlerts > 0);
  }
  setText('kpiAlertsSub', data.activeAlerts > 0 ? `${data.activeAlerts} requieren atención` : 'Sin alertas');
  setText('kpiUsersSub', `${data.activeUsers} habilitados`);
  setText('lastUpdateLabel', `Actualizado: ${fmtTime(new Date())}`);
}

/**
 * Render the events table body.
 * @param {AccessEvent[]} events
 * @param {string} tbodyId
 */
function renderEventsTable(events, tbodyId = 'eventsTableBody') {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  const filtered = filterEvents(events, state.filterActive);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr class="events-table__empty-row">
        <td colspan="6">
          <div class="empty-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p>Sin eventos para el filtro seleccionado.</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(ev => buildEventRow(ev)).join('');
  updateEventsBadge(filtered.length);
}

/** Build a single table row HTML string for an access event. */
function buildEventRow(ev, isNew = false) {
  const statusTag = ev.status === 'allowed'
    ? `<span class="status-tag status-tag--allowed">✓ Permitido</span>`
    : `<span class="status-tag status-tag--denied">✗ Denegado</span>`;

  const typeBadge = ev.type === 'qr'
    ? `<span class="badge badge--blue">QR</span>`
    : `<span class="badge badge--brand">RFID</span>`;

  return `
    <tr data-status="${ev.status}" data-id="${ev.id}" class="${isNew ? 'row--new' : ''}">
      <td>${statusTag}</td>
      <td><span class="tag-uid">${escapeHtml(ev.uid)}</span></td>
      <td>${escapeHtml(ev.userName ?? '—')}</td>
      <td>${escapeHtml(ev.accessPoint)}</td>
      <td>${typeBadge}</td>
      <td style="color:var(--text-muted);font-size:var(--text-xs)">${fmtDateTime(ev.timestamp)}</td>
    </tr>`;
}

/**
 * Prepend a single new event row to the live table (with animation).
 * @param {AccessEvent} ev
 */
function prependEventRow(ev) {
  const tbody = document.getElementById('eventsTableBody');
  if (!tbody) return;

  // Remove empty-state row if present
  const emptyRow = tbody.querySelector('.events-table__empty-row');
  if (emptyRow) emptyRow.remove();

  const tr = document.createElement('tbody');
  tr.innerHTML = buildEventRow(ev, true);
  const newTr = tr.firstElementChild;

  tbody.insertAdjacentElement('afterbegin', newTr);

  // Keep DOM lean: remove rows beyond 50
  const rows = tbody.querySelectorAll('tr:not(.events-table__empty-row)');
  if (rows.length > 50) rows[rows.length - 1].remove();

  // Maintain state array
  state.events.unshift(ev);
  if (state.events.length > 200) state.events.pop();

  updateEventsBadge(tbody.querySelectorAll('tr').length);
  setText('lastUpdateLabel', `Actualizado: ${fmtTime(new Date())}`);

  // Notify if denied
  if (ev.status === 'denied') {
    showToast('⚠ Acceso denegado', `${ev.uid} — ${ev.accessPoint}`, 'error');
  }
}

/** Render users table */
function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML = `
      <tr class="events-table__empty-row">
        <td colspan="6"><div class="empty-state"><p>Sin usuarios encontrados.</p></div></td>
      </tr>`;
    return;
  }

  const roleLabels = { admin: 'Admin', resident: 'Residente', staff: 'Personal', visitor: 'Visitante' };

  tbody.innerHTML = users.map(u => `
    <tr data-id="${u.id}">
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar avatar--sm">${(u.name[0] ?? '?').toUpperCase()}</div>
          <div>
            <div style="font-weight:var(--font-medium)">${escapeHtml(u.name)}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">${escapeHtml(u.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${roleBadgeClass(u.role)}">${roleLabels[u.role] ?? u.role}</span></td>
      <td style="color:var(--text-secondary)">${u.tagsCount}</td>
      <td style="color:var(--text-secondary)">${u.weeklyAccess}</td>
      <td>
        <span class="status-tag ${u.status === 'active' ? 'status-tag--allowed' : 'status-tag--denied'}">
          ${u.status === 'active' ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn--ghost btn--sm" onclick="handleEditUser('${u.id}')"
                  aria-label="Editar ${escapeHtml(u.name)}">Editar</button>
        </div>
      </td>
    </tr>`).join('');

  setText('usersCountLabel', `${users.length} usuario${users.length !== 1 ? 's' : ''}`);
}

/** Render RFID tags table */
function renderTags(tags) {
  const tbody = document.getElementById('tagsTableBody');
  if (!tbody) return;

  if (!tags.length) {
    tbody.innerHTML = `
      <tr class="events-table__empty-row">
        <td colspan="6"><div class="empty-state"><p>Sin tags registrados.</p></div></td>
      </tr>`;
    return;
  }

  const typeLabels = { rfid: 'RFID', qr: 'QR', nfc: 'NFC' };

  tbody.innerHTML = tags.map(t => `
    <tr data-id="${t.id}" data-status="${t.status}">
      <td><span class="tag-uid">${escapeHtml(t.uid)}</span></td>
      <td><span class="badge badge--brand">${typeLabels[t.type] ?? t.type}</span></td>
      <td style="color:var(--text-secondary)">${escapeHtml(t.assignedTo ?? '—')}</td>
      <td style="color:var(--text-muted);font-size:var(--text-xs)">${t.lastAccess ? fmtDateTime(t.lastAccess) : '—'}</td>
      <td>
        <span class="status-tag ${tagStatusClass(t.status)}">
          ${{ active: 'Activo', inactive: 'Inactivo', expired: 'Expirado' }[t.status] ?? t.status}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn--ghost btn--sm" onclick="handleEditTag('${t.id}')"
                  aria-label="Editar tag ${escapeHtml(t.uid)}">Editar</button>
          <button class="btn btn--ghost btn--sm" style="color:var(--clr-danger)"
                  onclick="handleDeleteTag('${t.id}')"
                  aria-label="Eliminar tag ${escapeHtml(t.uid)}">Eliminar</button>
        </div>
      </td>
    </tr>`).join('');

  setText('tagsCountLabel', `${tags.length} tag${tags.length !== 1 ? 's' : ''}`);
}

/** Render alerts table */
function renderAlerts(alerts) {
  const tbody = document.getElementById('alertsTableBody');
  if (!tbody) return;

  if (!alerts.length) {
    tbody.innerHTML = `
      <tr class="events-table__empty-row">
        <td colspan="6"><div class="empty-state"><p>Sin alertas activas.</p></div></td>
      </tr>`;
    renderAlertsMini([]);
    return;
  }

  const typeLabels = { intruder: 'Intrusión', emergency: 'Emergencia', maintenance: 'Mantenimiento', info: 'Informativa' };

  tbody.innerHTML = alerts.map(a => `
    <tr data-id="${a.id}">
      <td><span class="badge ${alertTypeBadgeClass(a.type)}">${typeLabels[a.type] ?? a.type}</span></td>
      <td style="max-width:300px;white-space:normal">${escapeHtml(a.message)}</td>
      <td style="color:var(--text-secondary)">${escapeHtml(a.accessPoint ?? 'Todos')}</td>
      <td><span class="status-tag status-tag--${a.status === 'active' ? 'denied' : 'allowed'}">${a.status === 'active' ? 'Activa' : 'Resuelta'}</span></td>
      <td style="color:var(--text-muted);font-size:var(--text-xs)">${fmtDateTime(a.createdAt)}</td>
      <td>
        <button class="btn btn--ghost btn--sm" onclick="handleDismissAlert('${a.id}')">Resolver</button>
      </td>
    </tr>`).join('');

  renderAlertsMini(alerts.slice(0, 4));
  updateAlertsBadge(alerts.filter(a => a.status === 'active').length);
}

/** Render mini alerts list in dashboard side panel */
function renderAlertsMini(alerts) {
  const list = document.getElementById('alertsMiniList');
  if (!list) return;

  if (!alerts.length) {
    list.innerHTML = `<li class="alerts-mini-list__empty">Sin alertas activas</li>`;
    return;
  }

  const typeColors = {
    intruder: 'var(--clr-danger)',
    emergency: 'var(--clr-danger)',
    maintenance: 'var(--clr-warning)',
    info: 'var(--clr-info)',
  };

  list.innerHTML = alerts.map(a => `
    <li class="alerts-mini-list__item">
      <span class="alerts-mini-list__dot"
            style="background:${typeColors[a.type] ?? 'var(--text-muted)'}"></span>
      <div class="alerts-mini-list__body">
        <div class="alerts-mini-list__msg">${escapeHtml(a.message)}</div>
        <div class="alerts-mini-list__meta">${fmtDateTime(a.createdAt)}</div>
      </div>
    </li>`).join('');
}

/**
 * Render a simple canvas bar chart for hourly access data.
 * Zero dependencies — pure Canvas 2D API.
 * @param {HourlyData[]} data
 */
function renderHourlyChart(data) {
  const placeholder = document.getElementById('chartPlaceholder');
  const canvas      = document.getElementById('hourlyChart');
  if (!canvas) return;

  placeholder?.classList.add('hidden');
  canvas.classList.remove('hidden');

  const ctx  = canvas.getContext('2d');
  const dpr  = window.devicePixelRatio || 1;
  const W    = canvas.parentElement.clientWidth;
  const H    = 140;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.scale(dpr, dpr);

  // Theme-aware colors
  const isDark   = document.documentElement.getAttribute('data-theme') !== 'light';
  const colorAllowed = '#3b82f6';
  const colorDenied  = '#ef4444';
  const colorGrid    = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const colorText    = isDark ? '#64748b' : '#94a3b8';

  const maxVal = Math.max(...data.map(d => d.allowed + d.denied), 1);
  const barW   = (W - 24) / data.length;
  const chartH = H - 24;

  ctx.clearRect(0, 0, W, H);

  // Grid lines
  [0.25, 0.5, 0.75, 1].forEach(ratio => {
    const y = chartH * (1 - ratio);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.strokeStyle = colorGrid;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Bars (only show every 3rd hour label)
  data.forEach((d, i) => {
    const x        = i * barW + 12;
    const allowedH = (d.allowed / maxVal) * chartH;
    const deniedH  = (d.denied  / maxVal) * chartH;
    const bw       = Math.max(barW - 4, 2);
    const rx       = 2; // corner radius

    // Allowed bar
    if (allowedH > 0) {
      roundRect(ctx, x, chartH - allowedH, bw, allowedH, rx, colorAllowed);
    }

    // Denied stacked on top
    if (deniedH > 0) {
      roundRect(ctx, x, chartH - allowedH - deniedH, bw, deniedH, rx, colorDenied);
    }

    // Hour label (every 3 hours)
    if (i % 3 === 0) {
      ctx.fillStyle = colorText;
      ctx.font = `${10 * dpr / dpr}px var(--font-sans, sans-serif)`;
      ctx.textAlign = 'center';
      ctx.fillText(`${String(d.hour).padStart(2, '0')}h`, x + bw / 2, H - 6);
    }
  });
}

/** Helper: draw rounded rectangle on canvas. */
function roundRect(ctx, x, y, w, h, r, color) {
  if (h < 1) return;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Update header/sidebar user info */
function renderUserInfo(user) {
  const initial = (user.displayName ?? user.email ?? '?')[0].toUpperCase();
  setText('sidebarUserName', user.displayName ?? user.email);
  setText('sidebarUserRole', 'Admin');
  setText('headerUserName',  user.displayName ?? user.email ?? '');
  setText('headerUserRole',  'Admin');
  setText('dropdownUserEmail', user.email ?? '');
  setTextAll('.avatar', initial);
  document.getElementById('sidebarAvatar')?.setAttribute('aria-label', user.displayName ?? '');
}

/** Update connection status pill */
function setConnectionStatus(status) {
  // status: 'online' | 'offline' | 'connecting'
  const el = document.getElementById('connectionStatus');
  const label = { online: 'En línea', offline: 'Sin conexión', connecting: 'Conectando…' };
  if (el) {
    el.setAttribute('data-status', status);
    setText('connectionLabel', label[status] ?? status);
  }
}


/* ============================================================
   SECTION 4 — VIEW ROUTER
   SPA-style hash navigation — no page reloads.
============================================================ */

const VIEW_TITLES = {
  dashboard: 'Dashboard',
  live:      'Accesos en vivo',
  users:     'Usuarios',
  tags:      'Tags RFID',
  alerts:    'Alertas',
  settings:  'Configuración',
};

/**
 * Navigate to a named view.
 * @param {string} view
 */
function navigateTo(view) {
  if (!VIEW_TITLES[view]) view = 'dashboard';

  // Deactivate all views
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.remove('nav-link--active');
    el.removeAttribute('aria-current');
  });

  // Activate target
  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) viewEl.classList.remove('hidden');

  const navLink = document.querySelector(`.nav-link[data-view="${view}"]`);
  if (navLink) {
    navLink.classList.add('nav-link--active');
    navLink.setAttribute('aria-current', 'page');
  }

  setText('pageTitle', VIEW_TITLES[view]);
  setState({ currentView: view });

  // Lazy-load data for the just-activated view
  loadViewData(view);
}

/** Load data specific to the activated view (avoids loading everything upfront). */
async function loadViewData(view) {
  switch (view) {
    case 'dashboard':
      // KPIs + events + chart are already loaded at startup; refresh chart on resize
      break;
    case 'live':
      if (!state.events.length) {
        const events = await loadRecentEvents(100);
        setState({ events });
        renderEventsTable(events, 'liveTableBody');
      } else {
        renderEventsTable(state.events, 'liveTableBody');
      }
      break;
    case 'users':
      if (!state.users.length) {
        const users = await loadUsers();
        setState({ users });
        renderUsers(users);
      }
      break;
    case 'tags':
      if (!state.tags.length) {
        const tags = await loadTags();
        setState({ tags });
        renderTags(tags);
      }
      break;
    case 'alerts':
      {
        const alerts = await loadAlerts();
        setState({ alerts });
        renderAlerts(alerts);
      }
      break;
  }
}


/* ============================================================
   SECTION 5 — MODAL MANAGER
============================================================ */

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  // Trap focus on first focusable element
  const first = el.querySelector('button, input, select, textarea');
  first?.focus();
}

function closeModal(id) {
  const el = document.getElementById(id);
  el?.classList.add('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
}


/* ============================================================
   SECTION 6 — TOAST NOTIFICATION SYSTEM
============================================================ */

/**
 * Show a toast notification.
 * @param {string} title
 * @param {string} [message]
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [duration=4000]
 */
function showToast(title, message = '', type = 'info', duration = 4000) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const icons = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="toast__icon" aria-hidden="true">${icons[type] ?? 'ℹ'}</span>
    <div class="toast__body">
      <div class="toast__title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast__msg">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="toast__close btn-icon btn-icon--ghost" aria-label="Cerrar notificación">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  toast.querySelector('.toast__close').addEventListener('click', () => dismissToast(toast));
  stack.appendChild(toast);

  if (duration > 0) setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(el) {
  if (!el.isConnected) return;
  el.classList.add('toast--out');
  setTimeout(() => el.remove(), 350);
}


/* ============================================================
   SECTION 7 — EVENT HANDLERS
   User interactions. Keep thin — delegate to data/render layers.
============================================================ */

function handleNewTagClick() { openModal('modalNewTag'); }
function handleNewAlertClick() { openModal('modalNewAlert'); }
function handleOpenQRClick()  { openModal('modalQR'); }

async function handleSaveTag() {
  const uid  = document.getElementById('newTagUid')?.value?.trim();
  const type = document.getElementById('newTagType')?.value;
  const user = document.getElementById('newTagUser')?.value?.trim();

  if (!uid) { showToast('Campo requerido', 'El UID del tag es obligatorio.', 'warning'); return; }

  const btn = document.getElementById('saveNewTagBtn');
  setLoadingBtn(btn, true);

  try {
    await saveTag({ uid, type, assignedTo: user || null });
    closeModal('modalNewTag');
    showToast('Tag registrado', `UID ${uid} añadido correctamente.`, 'success');
    // Refresh tags if view is active
    if (state.currentView === 'tags') renderTags(state.tags);
  } catch (err) {
    showToast('Error', 'No se pudo registrar el tag.', 'error');
    console.error(err);
  } finally {
    setLoadingBtn(btn, false);
  }
}

async function handleSaveAlert() {
  const type        = document.getElementById('alertType')?.value;
  const message     = document.getElementById('alertMessage')?.value?.trim();
  const accessPoint = document.getElementById('alertAccessPoint')?.value;

  if (!message) { showToast('Campo requerido', 'El mensaje de alerta es obligatorio.', 'warning'); return; }

  const btn = document.getElementById('saveNewAlertBtn');
  setLoadingBtn(btn, true);

  try {
    await saveAlert({ type, message, accessPoint });
    closeModal('modalNewAlert');
    showToast('Alerta emitida', 'La alerta fue registrada.', 'success');
  } catch (err) {
    showToast('Error', 'No se pudo emitir la alerta.', 'error');
    console.error(err);
  } finally {
    setLoadingBtn(btn, false);
  }
}

function handleGenerateQR() {
  const userId = document.getElementById('qrUserId')?.value?.trim();
  if (!userId) { showToast('Campo requerido', 'Ingresa el ID del usuario.', 'warning'); return; }
  showToast('QR generado', `Código para: ${userId}`, 'success');
  // TODO: Integrate QR library (e.g. qrcode.js) and render to #qrCanvas
}

function handleFilterChange(filter, groupEl) {
  setState({ filterActive: filter });
  groupEl.querySelectorAll('.filter-pill').forEach(b => {
    b.classList.toggle('filter-pill--active', b.dataset.filter === filter);
  });
  renderEventsTable(state.events);
}

function handleThemeToggle() {
  const next = state.theme === 'dark' ? 'light' : 'dark';
  setState({ theme: next });
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('nt_theme', next);
  // Re-render chart with new theme colors
  loadHourlyData().then(renderHourlyChart);
}

function handleSidebarCollapse() {
  const next = !state.sidebarOpen;
  setState({ sidebarOpen: next });
  document.getElementById('app')?.setAttribute('data-sidebar-open', String(next));
  localStorage.setItem('nt_sidebar', String(next));
}

async function handleSignOut() {
  await doSignOut();
}

// Stub handlers for table row actions
function handleEditUser(userId)  { showToast('Próximamente', `Editar usuario ${userId}`, 'info'); }
function handleEditTag(tagId)    { showToast('Próximamente', `Editar tag ${tagId}`, 'info'); }
function handleDeleteTag(tagId)  { showToast('Próximamente', `Eliminar tag ${tagId}`, 'info'); }
function handleDismissAlert(id)  { showToast('Alerta resuelta', `ID: ${id}`, 'success'); }


/* ============================================================
   SECTION 8 — INITIALIZATION SEQUENCE
============================================================ */

/**
 * Bootstrap the application.
 * Called once on DOMContentLoaded.
 */
async function init() {
  // 1. Restore persisted preferences
  restorePreferences();

  // 2. Wire all static event listeners
  bindGlobalListeners();

  // 3. Set today's date label
  setText('todayLabel', formatDateLabel(new Date()));

  // 4. Init Firebase (stub / real)
  initFirebase();

  // 5. Subscribe to auth state
  const unsubAuth = subscribeAuth(
    async (user) => {
      setState({ user, clientId: user.uid });  // In production: read clientId from Firestore user doc
      setConnectionStatus('online');
      renderUserInfo(user);
      await bootstrapDashboard();
    },
    () => {
      setConnectionStatus('offline');
      // In production: redirect to /login.html
      showToast('Sesión expirada', 'Por favor, inicia sesión.', 'warning');
    }
  );
  state._unsubs.push(unsubAuth);

  // 6. Navigate to hash or default view
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);
}

/**
 * Load initial data after auth succeeds.
 * All promises run concurrently for fast first render.
 */
async function bootstrapDashboard() {
  try {
    const [kpis, events, hourly, alerts] = await Promise.all([
      loadKPIs(),
      loadRecentEvents(50),
      loadHourlyData(),
      loadAlerts(),
    ]);

    setState({ events, alerts });
    renderKPIs(kpis);
    renderEventsTable(events, 'eventsTableBody');
    renderHourlyChart(hourly);
    renderAlerts(alerts);
    renderAlertsMini(alerts.slice(0, 4));

    // Start live event subscription
    const unsubEvents = subscribeToLiveEvents(state.clientId, (newEvent) => {
      prependEventRow(newEvent);
    });
    state._unsubs.push(unsubEvents);

    setText('chartDateLabel', formatDateLabel(new Date()));

  } catch (err) {
    console.error('[NeosTech] Bootstrap error:', err);
    showToast('Error de carga', 'No se pudieron cargar los datos iniciales.', 'error');
    setConnectionStatus('offline');
  }
}

/** Restore theme + sidebar state from localStorage. */
function restorePreferences() {
  const theme   = localStorage.getItem('nt_theme')   || 'dark';
  const sidebar = localStorage.getItem('nt_sidebar') !== 'false';

  setState({ theme, sidebarOpen: sidebar });
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('app')?.setAttribute('data-sidebar-open', String(sidebar));
}

/** Wire all event listeners that live for the entire session. */
function bindGlobalListeners() {
  // Sidebar collapse
  document.getElementById('sidebarCollapseBtn')?.addEventListener('click', handleSidebarCollapse);

  // Mobile sidebar toggle
  document.getElementById('sidebarMobileBtn')?.addEventListener('click', () => {
    const next = !state.sidebarOpen;
    setState({ sidebarOpen: next });
    document.getElementById('app')?.setAttribute('data-sidebar-open', String(next));
  });

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', handleThemeToggle);

  // Nav links (SPA routing)
  document.querySelectorAll('.nav-link[data-view], .dropdown-item[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.view);
      window.location.hash = el.dataset.view;
      // Close mobile sidebar after navigation
      if (window.innerWidth < 768) {
        setState({ sidebarOpen: false });
        document.getElementById('app')?.setAttribute('data-sidebar-open', 'false');
      }
    });
  });

  // Link-muted navigation links inside panels
  document.querySelectorAll('a[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.view);
    });
  });

  // Quick actions
  document.getElementById('btnNewTag')?.addEventListener('click', handleNewTagClick);
  document.getElementById('btnNewAlert')?.addEventListener('click', handleNewAlertClick);
  document.getElementById('btnOpenQR')?.addEventListener('click', handleOpenQRClick);
  document.getElementById('btnCreateAlert')?.addEventListener('click', handleNewAlertClick);

  // Modal close buttons
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modalClose));
  });

  // Modal backdrop click to close
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeAllModals();
    });
  });

  // Modal save buttons
  document.getElementById('saveNewTagBtn')?.addEventListener('click', handleSaveTag);
  document.getElementById('saveNewAlertBtn')?.addEventListener('click', handleSaveAlert);
  document.getElementById('generateQRBtn')?.addEventListener('click', handleGenerateQR);

  // Sign out
  document.getElementById('signOutBtn')?.addEventListener('click', handleSignOut);
  document.getElementById('dropdownSignOut')?.addEventListener('click', handleSignOut);

  // User menu dropdown
  const userMenuBtn      = document.getElementById('userMenuBtn');
  const userMenuDropdown = document.getElementById('userMenuDropdown');
  userMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = userMenuDropdown?.classList.toggle('open');
    userMenuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', () => {
    userMenuDropdown?.classList.remove('open');
    userMenuBtn?.setAttribute('aria-expanded', 'false');
  });

  // Escape key closes modals + dropdown
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAllModals(); userMenuDropdown?.classList.remove('open'); }
  });

  // Filter pills — delegate from all .filter-group elements
  document.querySelectorAll('.filter-group').forEach(group => {
    group.addEventListener('click', (e) => {
      const pill = e.target.closest('.filter-pill');
      if (!pill || !pill.dataset.filter) return;
      handleFilterChange(pill.dataset.filter, group);
    });
  });

  // Refresh events button
  document.getElementById('refreshEventsBtn')?.addEventListener('click', async () => {
    const events = await loadRecentEvents(50);
    setState({ events });
    renderEventsTable(events, 'eventsTableBody');
    showToast('Actualizado', 'Eventos recargados.', 'success', 2000);
  });

  // Search users
  document.getElementById('usersSearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
    renderUsers(filtered);
  });

  // Search tags
  document.getElementById('tagsSearchInput')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.tags.filter(t =>
      t.uid.toLowerCase().includes(q) || (t.assignedTo ?? '').toLowerCase().includes(q)
    );
    renderTags(filtered);
  });

  // Create user button stub
  document.getElementById('btnCreateUser')?.addEventListener('click', () => {
    showToast('Próximamente', 'Creación de usuarios vía panel.', 'info');
  });

  // Register tag quick-link
  document.getElementById('btnRegisterTag')?.addEventListener('click', handleNewTagClick);

  // Hash change (browser back/forward)
  window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(view);
  });

  // Chart resize (debounced)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      loadHourlyData().then(renderHourlyChart);
    }, 200);
  });
}


/* ============================================================
   SECTION 9 — UTILITIES
============================================================ */

/** @param {number} ms */
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/** Safely set element text content. */
function setText(id, text) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (el) el.textContent = String(text);
}

/** Set text on all matching elements. */
function setTextAll(selector, text) {
  document.querySelectorAll(selector).forEach(el => { el.textContent = text; });
}

/** Format integer with locale separator. */
const fmtNumber = (n) => Number(n).toLocaleString('es');

/** Format Date as HH:MM. */
const fmtTime = (d) => d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

/** Format Date as DD/MM HH:MM. */
function fmtDateTime(d) {
  if (!d) return '—';
  const dt = d instanceof Date ? d : (d.toDate ? d.toDate() : new Date(d));
  if (isNaN(dt)) return '—';
  const now  = new Date();
  const diff = now - dt;
  if (diff < 60_000)        return 'ahora';
  if (diff < 3_600_000)     return `hace ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000)    return `${fmtTime(dt)}`;
  return dt.toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
         + ' ' + fmtTime(dt);
}

/** Format a date as a readable label ("Hoy, 20 Feb 2026"). */
function formatDateLabel(d) {
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Prevent XSS in dynamic content. */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Filter events array by status. */
function filterEvents(events, filter) {
  if (filter === 'all') return events;
  if (filter === 'allowed' || filter === 'denied') return events.filter(e => e.status === filter);
  if (filter === 'qr' || filter === 'rfid')        return events.filter(e => e.type === filter);
  return events;
}

/** Update the events count badge. */
function updateEventsBadge(count) {
  setText('eventsCountBadge', `${count} evento${count !== 1 ? 's' : ''}`);
  setText('liveBadge', String(count));
}

/** Update the alerts badge in sidebar. */
function updateAlertsBadge(count) {
  const badge = document.getElementById('alertsBadge');
  if (!badge) return;
  badge.textContent = String(count);
  badge.classList.toggle('hidden', count === 0);
}

/** Show loading spinner on a button, restore or clear after. */
function setLoadingBtn(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span> Guardando…`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText ?? 'Guardar';
    btn.disabled = false;
  }
}

// Badge class helpers
const roleBadgeClass = (role) => ({
  admin: 'badge--blue', resident: 'badge--green',
  staff: 'badge--brand', visitor: 'badge--yellow',
})[role] ?? 'badge--ghost';

const tagStatusClass = (s) => ({
  active: 'status-tag--allowed', inactive: 'status-tag--denied', expired: 'status-tag--denied',
})[s] ?? '';

const alertTypeBadgeClass = (t) => ({
  intruder: 'badge--red', emergency: 'badge--red',
  maintenance: 'badge--yellow', info: 'badge--blue',
})[t] ?? 'badge--ghost';


/* ============================================================
   SECTION 10 — MOCK DATA GENERATORS  (remove after Firestore)
============================================================ */

const MOCK_NAMES  = ['María García', 'Carlos López', 'Ana Martínez', 'Pedro Sánchez', 'Laura Rodríguez', 'Diego Torres'];
const MOCK_POINTS = ['Portón Principal', 'Portón Trasero', 'Recepción', 'Estacionamiento', 'Servidor'];
const MOCK_UIDS   = ['A3:B4:C5:D6', 'F1:E2:D3:C4', '11:22:33:44', 'CC:BB:AA:99', 'QR-2024-078'];

/** Generate n random mock access events. */
function generateMockEvents(n = 10) {
  return Array.from({ length: n }, (_, i) => ({
    id:          `evt-${Date.now()}-${i}`,
    uid:         MOCK_UIDS[Math.floor(Math.random() * MOCK_UIDS.length)],
    userName:    MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)],
    accessPoint: MOCK_POINTS[Math.floor(Math.random() * MOCK_POINTS.length)],
    type:        Math.random() > 0.25 ? 'rfid' : 'qr',
    status:      Math.random() > 0.15 ? 'allowed' : 'denied',
    timestamp:   new Date(Date.now() - Math.random() * 7_200_000),
  }));
}

// Expose action handlers to HTML onclick attributes (required if not using module bundler)
// These allow inline onclick= in HTML to call these functions.
Object.assign(window, {
  handleEditUser,
  handleEditTag,
  handleDeleteTag,
  handleDismissAlert,
});


/* ============================================================
   SECTION 11 — ENTRY POINT
============================================================ */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}


/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  HOW TO WIRE FIREBASE FIRESTORE (production integration)    ║
 * ╠══════════════════════════════════════════════════════════════╣
 * ║                                                              ║
 * ║ 1. Add Firebase SDK to layout.html (type="module"):          ║
 * ║                                                              ║
 * ║   import { initializeApp } from 'firebase/app';              ║
 * ║   import { getFirestore, collection, query, where,           ║
 * ║            orderBy, limit, onSnapshot, addDoc,               ║
 * ║            serverTimestamp, Timestamp } from 'firebase/      ║
 * ║            firestore';                                        ║
 * ║   import { getAuth, onAuthStateChanged, signOut }            ║
 * ║            from 'firebase/auth';                             ║
 * ║                                                              ║
 * ║   const app  = initializeApp({ ...firebaseConfig });         ║
 * ║   window.__db   = getFirestore(app);                         ║
 * ║   window.__auth = getAuth(app);                              ║
 * ║                                                              ║
 * ║ 2. Replace each stub function body in Section 2 with the    ║
 * ║   actual Firestore/Auth SDK call shown in its JSDoc comment. ║
 * ║                                                              ║
 * ║ 3. Multi-tenant: read `clientId` from the user's Firestore   ║
 * ║   profile doc (`users/{uid}`), not from `user.uid` directly. ║
 * ║                                                              ║
 * ║ 4. All Firestore reads already include                       ║
 * ║   `where('clientId', '==', state.clientId)` guards.         ║
 * ║                                                              ║
 * ║ 5. Collections expected:                                     ║
 * ║   • rfid_events  — access log (clientId, uid, status, ...)  ║
 * ║   • users        — user profiles (clientId, name, role, …)  ║
 * ║   • rfid_tags    — registered tags (clientId, uid, …)       ║
 * ║   • alerts       — active alerts (clientId, type, …)        ║
 * ║                                                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
