/**
 * dashboard-pro.js — NeosTech RFID System Pro
 * SOC Dashboard controller
 *
 * Entry point:  DashboardPro.init()   (called on DOMContentLoaded)
 * Public API:   renderKPIs(), renderLiveRFIDTable(), renderAlerts()
 *
 * Dependencies (globals injected by HTML):
 *   firebase, db, auth   — Firebase 8.10.1
 *   window.currentUserClientId — set after auth bootstrap
 *
 * Architecture:
 *   state        — single source of truth
 *   loaders      — stub functions that will later call Firestore
 *   renderers    — pure DOM-mutation functions
 *   VirtualScroller — lightweight virtual-scroll implementation
 *   ui helpers   — sidebar, navigation, status indicators
 */

'use strict';

/* ================================================================
   STATE
   ================================================================ */

const _state = {
  /* Auth */
  user:         null,
  userRole:     'resident',
  tenantName:   'NeosTech Pro',

  /* Active view */
  currentView:  'overview',

  /* Live RFID */
  liveRows:     [],     // all rows (filtered view rendered by VirtualScroller)
  liveFilter:   'all',  // 'all' | 'allowed' | 'denied'
  liveQuery:    '',
  livePaused:   false,
  liveListener: null,   // Firestore unsubscribe fn

  /* KPI data */
  kpi: {
    liveTags:  null,
    accesses:  null,
    alerts:    null,
    devOnline: null,
    devTotal:  null,
  },

  /* Trend sparkline data (arrays of numbers, last 24 points) */
  trends: {
    liveTags: [],
    accesses: [],
  },

  /* Alerts */
  alerts:         [],
  alertsResolved: [],

  /* Access logs */
  logs:     [],
  logsPage: 0,

  /* Users */
  users: [],

  /* Devices */
  devices: [],

  /* Firestore listeners (to unsubscribe on sign-out) */
  _unsubs: [],
};


/* ================================================================
   VIRTUAL SCROLLER
   A minimal, dependency-free virtual list renderer.
   Renders only the rows visible in the viewport + a buffer.
   ================================================================ */

class VirtualScroller {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.container   — scrollable element (.dp-vscroll)
   * @param {HTMLElement} opts.rowsEl      — inner container for rendered rows
   * @param {HTMLElement} opts.spacerTop   — top spacer div
   * @param {HTMLElement} opts.spacerBot   — bottom spacer div
   * @param {number}      opts.rowHeight   — fixed height per row (px)
   * @param {number}      [opts.buffer=4]  — extra rows to render above/below viewport
   * @param {Function}    opts.renderRow   — (rowData, index) → HTMLElement
   */
  constructor(opts) {
    this.container  = opts.container;
    this.rowsEl     = opts.rowsEl;
    this.spacerTop  = opts.spacerTop;
    this.spacerBot  = opts.spacerBot;
    this.rowHeight  = opts.rowHeight || 48;
    this.buffer     = opts.buffer    || 4;
    this.renderRow  = opts.renderRow;
    this._rows      = [];
    this._raf       = null;

    this.container.addEventListener('scroll', () => {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(() => this._render());
    });
  }

  /** Replace the full dataset and re-render. */
  setRows(rows) {
    this._rows = rows;
    this._render();
  }

  /** Append rows and re-render (useful for streaming updates). */
  appendRows(newRows) {
    this._rows = this._rows.concat(newRows);
    this._render();
  }

  /** Return current row count. */
  get length() { return this._rows.length; }

  _render() {
    const total      = this._rows.length;
    const scrollTop  = this.container.scrollTop;
    const viewH      = this.container.clientHeight;

    const startIdx = Math.max(0,
      Math.floor(scrollTop / this.rowHeight) - this.buffer);
    const endIdx   = Math.min(total,
      Math.ceil((scrollTop + viewH) / this.rowHeight) + this.buffer);

    this.spacerTop.style.height = `${startIdx * this.rowHeight}px`;
    this.spacerBot.style.height = `${(total - endIdx) * this.rowHeight}px`;

    const frag = document.createDocumentFragment();
    for (let i = startIdx; i < endIdx; i++) {
      frag.appendChild(this.renderRow(this._rows[i], i));
    }
    this.rowsEl.innerHTML = '';
    this.rowsEl.appendChild(frag);
  }
}

/* VirtualScroller instance for Live RFID view */
let _liveScroller = null;


/* ================================================================
   INIT
   ================================================================ */

/**
 * initDashboardPro()
 * Main entry point. Call once after DOM is ready.
 * Sets up auth listener, wires UI events, initialises sub-systems.
 */
function initDashboardPro() {
  _initAuth();
  _initLoginForm();
  _initSidebar();
  _initNavigation();
  _initLiveVirtualScroller();
  _initLiveFilters();
  _initDateDisplay();
  _initSignOut();
  _initMobileMenu();
  _initPushButton();
  _initRefreshButtons();
  _initAlertButtons();
  _initReaderSettings();
  _initQRScanner();
}


/* ================================================================
   AUTH
   ================================================================ */

function _initAuth() {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      await _onUserAuthenticated(user);
    } else {
      _onUserSignedOut();
    }
  });
}

async function _onUserAuthenticated(user) {
  _state.user = user;

  try {
    /* Bootstrap: get clientId from JWT claim first (avoids bare .doc() read) */
    const tokenResult = await user.getIdTokenResult();
    const tenantClientId = tokenResult.claims.clientId || null;

    if (!tenantClientId) {
      _showAuthError('Error de configuración: clientId no encontrado en el perfil.');
      auth.signOut();
      return;
    }

    window.currentUserClientId = tenantClientId;

    /* Confirm profile with tenant-safe query */
    const snap = await db.collection('users')
      .where('clientId', '==', tenantClientId)
      .where(firebase.firestore.FieldPath.documentId(), '==', user.uid)
      .limit(1)
      .get();

    let displayName = user.displayName || user.email;
    let role = 'resident';

    if (!snap.empty) {
      const data = snap.docs[0].data();
      role        = data.role        || 'resident';
      displayName = data.name        || displayName;
      _state.tenantName = data.tenantName || _state.tenantName;
    }

    _state.userRole = role;

    /* Update all user-facing UI */
    _updateUserUI(displayName, role);
    _setStatusDot('statusFirestore', 'online');

    /* Show app, hide login */
    document.getElementById('dpAuthOverlay').style.display = 'none';
    const app = document.getElementById('dpApp');
    app.classList.remove('dp-app--hidden');
    app.removeAttribute('aria-hidden');

    /* Load initial data for active view */
    _loadViewData(_state.currentView);

  } catch (err) {
    _setStatusDot('statusFirestore', 'offline');
    _showAuthError('Error de conexión: ' + err.message);
    auth.signOut();
  }
}

function _onUserSignedOut() {
  /* Cancel all active Firestore listeners */
  _state._unsubs.forEach(fn => { try { fn(); } catch (_) {} });
  _state._unsubs = [];
  if (_state.liveListener) { _state.liveListener(); _state.liveListener = null; }

  /* Reset state */
  _state.user     = null;
  window.currentUserClientId = null;
  _setStatusDot('statusFirestore', 'offline');

  /* Redirect to login page — session was invalidated */
  window.location.replace('/index.html');
}


/* ================================================================
   LOGIN FORM
   ================================================================ */

function _initLoginForm() {
  const form = document.getElementById('dpLoginForm');
  const btn  = document.getElementById('dpLoginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    _clearAuthError();

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      _showAuthError('Ingresa tu correo y contraseña.');
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Ingresando…';

    try {
      await auth.signInWithEmailAndPassword(email, password);
      /* onAuthStateChanged handles the rest */
    } catch (err) {
      const msg = err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
        ? 'Correo o contraseña incorrectos.'
        : 'Error al iniciar sesión: ' + err.message;
      _showAuthError(msg);
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Iniciar sesión';
    }
  });
}

function _showAuthError(msg) {
  const el = document.getElementById('dpAuthError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function _clearAuthError() {
  const el = document.getElementById('dpAuthError');
  el.textContent = '';
  el.classList.add('hidden');
}


/* ================================================================
   USER UI
   ================================================================ */

function _updateUserUI(name, role) {
  const initials = (name || '?').trim().charAt(0).toUpperCase();

  /* Topbar */
  _setText('dpTopbarName', name);
  _setText('dpTopbarRole', _roleLabel(role));
  _setText('dpTopbarAvatar', initials);

  /* Sidebar */
  _setText('dpSidebarName', name);
  _setText('dpSidebarRole', _roleLabel(role));
  _setText('dpSidebarAvatar', initials);
  _setText('dpSidebarTenant', window.currentUserClientId || 'Pro');

  /* Settings view */
  const cidInput = document.getElementById('settingsClientId');
  if (cidInput) cidInput.value = window.currentUserClientId || '';
}

function _roleLabel(role) {
  const map = { admin: 'Administrador', guard: 'Guardia', resident: 'Residente' };
  return map[role] || role;
}


/* ================================================================
   SIDEBAR — COLLAPSE TOGGLE
   ================================================================ */

function _initSidebar() {
  const btn = document.getElementById('dpSidebarCollapseBtn');
  const app = document.getElementById('dpApp');

  /* Restore persisted collapse state */
  const saved = localStorage.getItem('dp-sidebar-state');
  if (saved === 'collapsed' || saved === 'expanded') {
    app.dataset.sidebar = saved;
    btn.setAttribute('aria-label', saved === 'collapsed' ? 'Expandir menú' : 'Colapsar menú');
  }

  btn.addEventListener('click', () => {
    const collapsed = app.dataset.sidebar === 'collapsed';
    const next = collapsed ? 'expanded' : 'collapsed';
    app.dataset.sidebar = next;
    btn.setAttribute('aria-label', collapsed ? 'Colapsar menú' : 'Expandir menú');
    localStorage.setItem('dp-sidebar-state', next);
  });
}

function _initMobileMenu() {
  const btn = document.getElementById('dpMobileMenuBtn');
  const app = document.getElementById('dpApp');

  btn.addEventListener('click', () => {
    const open = app.dataset.sidebar === 'mobile-open';
    app.dataset.sidebar = open ? 'none' : 'mobile-open';
    btn.setAttribute('aria-expanded', String(!open));
  });
}


/* ================================================================
   NAVIGATION — hash-based SPA router
   ================================================================ */

function _initNavigation() {
  /* Wire nav links */
  document.querySelectorAll('.dp-nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      _navigateTo(link.dataset.view);
    });
  });

  /* Panel "Ver todos" links */
  document.querySelectorAll('[data-view]').forEach(el => {
    if (!el.classList.contains('dp-nav-link') && el.tagName !== 'BUTTON') {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        _navigateTo(el.dataset.view);
      });
    }
  });

  /* QR Registration shortcut from Alerts view */
  const qrBtn = document.getElementById('btnQRRegisterFromAlerts');
  if (qrBtn) {
    qrBtn.addEventListener('click', () => _navigateTo('qr-register'));
  }

  /* Handle browser back/forward */
  window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'overview';
    _activateView(view, false); /* don't push hash again */
  });

  /* Restore view from URL hash on load */
  const hash = window.location.hash.replace('#', '');
  if (hash) _activateView(hash, false);
}

function _navigateTo(view) {
  _activateView(view, true);
  _loadViewData(view);
}

function _activateView(view, pushHash) {
  if (pushHash) window.location.hash = view;

  _state.currentView = view;

  /* Hide all views */
  document.querySelectorAll('.dp-view').forEach(el => {
    el.classList.remove('dp-view--active');
  });

  /* Show target view */
  const target = document.getElementById(`view-${view}`);
  if (target) {
    target.classList.add('dp-view--active');
    /* Scroll content area back to top */
    document.getElementById('dpContent').scrollTop = 0;
  }

  /* Update nav links */
  document.querySelectorAll('.dp-nav-link[data-view]').forEach(link => {
    const active = link.dataset.view === view;
    link.classList.toggle('dp-nav-link--active', active);
    link.setAttribute('aria-current', active ? 'page' : 'false');
  });

  /* Update topbar page title */
  const titles = {
    'overview':    'Resumen',
    'live-rfid':   'RFID en vivo',
    'qr-register': 'Registro QR',
    'access-logs': 'Bitácora',
    'alerts':      'Alertas',
    'users':       'Usuarios',
    'devices':     'Dispositivos',
    'settings':    'Configuración',
  };
  _setText('dpPageTitle', titles[view] || view);
}


/* ================================================================
   DATA LOADERS
   Stubs — replace with real Firestore queries using:
     db.collection('X')
       .where('clientId', '==', window.currentUserClientId)
       .where(...)
   ================================================================ */

/**
 * Dispatch data load for the given view panel.
 * Called automatically on navigation + on auth success.
 */
function _loadViewData(view) {
  if (!window.currentUserClientId) return;

  switch (view) {
    case 'overview':
      loadKPIs();
      loadRecentEvents();
      loadTrendData();
      break;
    case 'live-rfid':
      startLiveRFIDStream();
      break;
    case 'access-logs':
      loadAccessLogs();
      break;
    case 'alerts':
      loadAlerts();
      break;
    case 'users':
      loadUsers();
      break;
    case 'devices':
      loadDevices();
      break;
    case 'settings':
      /* Pre-fill clientId (already set in _updateUserUI) */
      break;
    default:
      break;
  }
}

/**
 * loadKPIs()
 * Fetch today's KPI counters and update the KPI cards.
 * TODO: wire to real Firestore aggregations or Cloud Functions.
 */
async function loadKPIs() {
  /* Show skeleton state */
  ['kpiLiveTags', 'kpiAccesses', 'kpiAlerts', 'kpiDevices'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = '—';
      el.classList.add('skeleton-line', 'skeleton-line--lg');
    }
  });

  try {
    const cid   = window.currentUserClientId;
    const today = _todayStart();

    /* ── STUB — replace each Promise.resolve() with a real Firestore query ── */
    const [tagsSnap, accessSnap, alertsSnap, devicesSnap] = await Promise.all([
      /* Tags scanned today */
      db.collection('rfid_events')
        .where('clientId', '==', cid)
        .where('timestamp', '>=', today)
        .get(),

      /* Access logs today */
      db.collection('access_logs')
        .where('clientId', '==', cid)
        .where('timestamp', '>=', today)
        .get(),

      /* Active (unresolved) alerts */
      db.collection('alerts')
        .where('clientId', '==', cid)
        .where('resolved', '==', false)
        .get(),

      /* Devices/access points */
      db.collection('access_points')
        .where('clientId', '==', cid)
        .get(),
    ]);

    const liveTags  = tagsSnap.size;
    const accesses  = accessSnap.size;
    const activeAl  = alertsSnap.size;
    const devTotal  = devicesSnap.size;
    const devOnline = devicesSnap.docs.filter(d => d.data().status === 'online').length;

    _state.kpi = { liveTags, accesses, alerts: activeAl, devOnline, devTotal };

    renderKPIs({ liveTags, accesses, alerts: activeAl, devOnline, devTotal });

  } catch (err) {
    /* On permission-denied or offline, show zeros gracefully */
    renderKPIs({ liveTags: 0, accesses: 0, alerts: 0, devOnline: 0, devTotal: 0 });
  }
}

/**
 * loadTrendData()
 * Fetch per-hour counts for the last 24 h.
 * TODO: replace stub with real aggregation.
 */
async function loadTrendData() {
  /* Stub: generate a realistic-looking random trend */
  _state.trends.liveTags = _stubTrend(24, 0, 18);
  _state.trends.accesses = _stubTrend(24, 0, 12);

  _drawSparkline('sparklineLiveTags', _state.trends.liveTags);
  _drawSparkline('sparklineAccesses', _state.trends.accesses);
  _drawChart24h(_state.trends.liveTags, _state.trends.accesses);
}

/**
 * loadRecentEvents()
 * Load the last 10 access events for the Recent Events mini-list.
 */
async function loadRecentEvents() {
  const list = document.getElementById('dpRecentList');
  if (!list) return;

  /* Show skeletons */
  list.innerHTML = Array(5).fill(
    '<div class="dp-recent-row dp-skeleton-row"></div>'
  ).join('');

  try {
    const snap = await db.collection('access_logs')
      .where('clientId', '==', window.currentUserClientId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _renderRecentEvents(rows);

  } catch (_) {
    _renderRecentEvents([]);
  }
}

/**
 * startLiveRFIDStream()
 * Attach a Firestore real-time listener to rfid_events.
 * Populates the virtual-scroll table and live badge counter.
 */
function startLiveRFIDStream() {
  /* Detach existing listener to avoid duplicates */
  if (_state.liveListener) {
    _state.liveListener();
    _state.liveListener = null;
  }

  const today = _todayStart();

  const query = db.collection('rfid_events')
    .where('clientId', '==', window.currentUserClientId)
    .where('timestamp', '>=', today)
    .orderBy('timestamp', 'desc')
    .limit(500);

  _state.liveListener = query.onSnapshot(snap => {
    if (_state.livePaused) return;

    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _state.liveRows = rows;

    renderLiveRFIDTable(rows);

    /* Update live badge in sidebar nav */
    const badge = document.getElementById('navBadgeLive');
    if (badge) badge.textContent = rows.length;
    _setText('liveCount', rows.length);

  }, _err => {
    /* On error, show empty state */
    renderLiveRFIDTable([]);
  });

  _state._unsubs.push(() => {
    if (_state.liveListener) _state.liveListener();
  });
}

/**
 * loadAlerts()
 * Fetch active and resolved-today alerts.
 */
async function loadAlerts() {
  const list = document.getElementById('dpAlertsList');
  if (list) {
    list.innerHTML = '<div class="dp-skeleton-alert"></div>'
                   + '<div class="dp-skeleton-alert"></div>';
  }

  try {
    const cid   = window.currentUserClientId;
    const today = _todayStart();

    const [activeSnap, resolvedSnap] = await Promise.all([
      db.collection('alerts')
        .where('clientId', '==', cid)
        .where('resolved', '==', false)
        .orderBy('createdAt', 'desc')
        .get(),

      db.collection('alerts')
        .where('clientId', '==', cid)
        .where('resolved', '==', true)
        .where('resolvedAt', '>=', today)
        .orderBy('resolvedAt', 'desc')
        .limit(20)
        .get(),
    ]);

    _state.alerts         = activeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    _state.alertsResolved = resolvedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderAlerts(_state.alerts, _state.alertsResolved);

    /* Update nav + topbar badge */
    _updateAlertBadge(_state.alerts.length);

  } catch (_) {
    renderAlerts([], []);
  }
}

/**
 * loadAccessLogs()
 * Load paginated access log entries respecting the date filter.
 */
async function loadAccessLogs() {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;

  /* Show skeleton */
  tbody.innerHTML = Array(6).fill(
    `<tr class="dp-skeleton-row"><td colspan="5"></td></tr>`
  ).join('');

  try {
    const from = document.getElementById('logsDateFrom').value;
    const to   = document.getElementById('logsDateTo').value;

    let q = db.collection('access_logs')
      .where('clientId', '==', window.currentUserClientId)
      .orderBy('timestamp', 'desc')
      .limit(100);

    if (from) q = q.where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(new Date(from)));
    if (to)   q = q.where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(new Date(to + 'T23:59:59')));

    const snap = await q.get();
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _state.logs = logs;

    renderAccessLogs(logs);

  } catch (_) {
    renderAccessLogs([]);
  }
}

/**
 * loadUsers()
 * Fetch all users belonging to this tenant.
 */
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  tbody.innerHTML = Array(5).fill(
    `<tr class="dp-skeleton-row"><td colspan="5"></td></tr>`
  ).join('');

  try {
    const snap = await db.collection('users')
      .where('clientId', '==', window.currentUserClientId)
      .orderBy('name')
      .get();

    _state.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    _setText('usersCount', _state.users.length);
    renderUsers(_state.users);

  } catch (_) {
    renderUsers([]);
  }
}

/**
 * loadDevices()
 * Fetch configured access points / readers.
 */
async function loadDevices() {
  try {
    const snap = await db.collection('access_points')
      .where('clientId', '==', window.currentUserClientId)
      .get();

    _state.devices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDevices(_state.devices);

  } catch (_) {
    renderDevices([]);
  }
}


/* ================================================================
   RENDERERS — PUBLIC API
   ================================================================ */

/**
 * renderKPIs(data)
 * Update the 4 KPI cards with live data.
 *
 * @param {Object} data
 * @param {number} data.liveTags   — RFID tags scanned today
 * @param {number} data.accesses   — access events today
 * @param {number} data.alerts     — active unresolved alerts
 * @param {number} data.devOnline  — readers currently online
 * @param {number} data.devTotal   — total readers
 */
function renderKPIs({ liveTags = 0, accesses = 0, alerts = 0, devOnline = 0, devTotal = 0 } = {}) {
  /* Remove skeleton class and set values */
  function setKpi(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('skeleton-line', 'skeleton-line--lg');
    el.textContent = _fmtNum(val);
  }

  setKpi('kpiLiveTags', liveTags);
  setKpi('kpiAccesses', accesses);
  setKpi('kpiAlerts',   alerts);
  setKpi('kpiDevices',  `${devOnline} / ${devTotal}`);

  /* Colour the KPI cards based on state */
  _tintKpiCard('[data-kpi="alerts"]', alerts > 0 ? 'red' : null);

  /* Update parent aria-busy */
  document.querySelectorAll('.dp-kpi-card').forEach(c => c.removeAttribute('aria-busy'));
}

/**
 * renderLiveRFIDTable(rows)
 * Feed data into the virtual scroller for the Live RFID view.
 * Applies the current filter and search query before rendering.
 *
 * @param {Array} rows  — raw rfid_event documents
 */
function renderLiveRFIDTable(rows = []) {
  const query  = _state.liveQuery.toLowerCase();
  const filter = _state.liveFilter;

  const filtered = rows.filter(r => {
    /* Status filter */
    if (filter === 'allowed' && r.status !== 'allowed') return false;
    if (filter === 'denied'  && r.status !== 'denied')  return false;

    /* Text search */
    if (query) {
      const haystack = [r.tagId, r.userName, r.readerName, r.userId]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  /* Show/hide empty state */
  const emptyEl = document.getElementById('liveEmpty');
  if (emptyEl) emptyEl.classList.toggle('hidden', filtered.length > 0);

  if (_liveScroller) {
    _liveScroller.setRows(filtered);
  }
}

/**
 * renderAlerts(active, resolved)
 * Render active alerts list and resolved-today list.
 *
 * @param {Array} active   — active alert doc objects
 * @param {Array} resolved — resolved alert doc objects (today)
 */
function renderAlerts(active = [], resolved = []) {
  const listEl     = document.getElementById('dpAlertsList');
  const resolvedEl = document.getElementById('dpAlertsListResolved');
  const emptyEl    = document.getElementById('alertsEmpty');

  /* Active alerts */
  if (listEl) {
    if (active.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
    } else {
      if (emptyEl) emptyEl.classList.add('hidden');
      listEl.innerHTML = '';
      active.forEach(a => listEl.appendChild(_buildAlertCard(a)));
    }
  }

  /* Resolved */
  if (resolvedEl) {
    if (resolved.length === 0) {
      resolvedEl.innerHTML =
        '<div class="dp-empty-state"><p class="dp-empty-state__text">Ninguna alerta resuelta hoy.</p></div>';
    } else {
      resolvedEl.innerHTML = '';
      resolved.forEach(a => resolvedEl.appendChild(_buildAlertCard(a, true)));
    }
  }

  /* Counters */
  _setText('alertsActiveCount',        active.length);
  _setText('alertsResolvedCount',      resolved.length);
  _setText('alertsResolvedCountDetail', resolved.length);
}

/**
 * renderAccessLogs(logs)
 * Build log rows into the static access-logs table.
 *
 * @param {Array} logs — access_log doc objects
 */
function renderAccessLogs(logs = []) {
  const tbody   = document.getElementById('logsTableBody');
  const emptyEl = document.getElementById('logsEmpty');
  if (!tbody) return;

  if (logs.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  const query = (document.getElementById('logsSearch').value || '').toLowerCase();

  const filtered = query
    ? logs.filter(l => [l.user, l.email, l.tagId, l.reader]
        .filter(Boolean).join(' ').toLowerCase().includes(query))
    : logs;

  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();

  filtered.forEach(l => {
    const tr  = document.createElement('tr');
    tr.dataset.status = l.status || '';

    tr.innerHTML = `
      <td class="dp-td">
        <div>${_esc(l.user || l.email || '—')}</div>
        <div style="font-size:11px;color:var(--text-muted)">${_esc(l.email || '')}</div>
      </td>
      <td class="dp-td dp-td--mono dp-td--hide-sm">${_esc(l.tagId || '—')}</td>
      <td class="dp-td dp-td--muted dp-td--hide-sm">${_esc(l.reader || l.accessPoint || '—')}</td>
      <td class="dp-td">${_statusBadge(l.status || l.action)}</td>
      <td class="dp-td dp-td--muted">${_fmtTs(l.timestamp)}</td>
    `;
    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

/**
 * renderUsers(users)
 * Build user rows into the users table.
 *
 * @param {Array} users — user doc objects
 */
function renderUsers(users = []) {
  const tbody   = document.getElementById('usersTableBody');
  const emptyEl = document.getElementById('usersEmpty');
  if (!tbody) return;

  const query = (document.getElementById('usersSearch').value || '').toLowerCase();
  const filtered = query
    ? users.filter(u => [u.name, u.email, u.unit, u.block]
        .filter(Boolean).join(' ').toLowerCase().includes(query))
    : users;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();

  filtered.forEach(u => {
    const tr = document.createElement('tr');
    const tags = Array.isArray(u.tags) ? u.tags.length : 0;
    const dept = u.departamento || u.unit || '—';
    const blk  = u.block ? `Bloque ${u.block}` : '';

    tr.innerHTML = `
      <td class="dp-td">
        <div style="font-weight:500">${_esc(u.name || '—')}</div>
        <div style="font-size:11px;color:var(--text-muted)">${_esc(u.email || '')}</div>
      </td>
      <td class="dp-td dp-td--muted dp-td--hide-sm">${_esc(blk ? `${blk} · ${dept}` : dept)}</td>
      <td class="dp-td dp-td--hide-sm">
        <span class="dp-badge dp-badge--neutral">${tags} tag${tags !== 1 ? 's' : ''}</span>
      </td>
      <td class="dp-td">
        ${u.active !== false
          ? '<span class="dp-badge dp-badge--success">Activo</span>'
          : '<span class="dp-badge dp-badge--danger">Inactivo</span>'}
      </td>
      <td class="dp-td dp-td--actions">
        <button class="dp-icon-btn dp-icon-btn--ghost" title="Editar usuario"
                onclick="window._dpEditUser('${u.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
               stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </td>
    `;
    frag.appendChild(tr);
  });

  tbody.appendChild(frag);
}

/**
 * renderDevices(devices)
 * Build device cards in the devices grid.
 *
 * @param {Array} devices — access_point doc objects
 */
function renderDevices(devices = []) {
  const grid    = document.getElementById('dpDevicesGrid');
  const emptyEl = document.getElementById('devicesEmpty');
  if (!grid) return;

  const online = devices.filter(d => d.status === 'online').length;
  _setText('devicesOnline', online);
  _setText('devicesTotal',  devices.length);

  if (devices.length === 0) {
    grid.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();

  devices.forEach(d => {
    const card = document.createElement('div');
    card.className = 'dp-device-card';
    const dotState = d.status === 'online'  ? 'online'
                   : d.status === 'offline' ? 'offline'
                   : 'unknown';

    card.innerHTML = `
      <div class="dp-device-card__header">
        <div class="dp-device-card__status-dot" data-state="${dotState}"></div>
        <span class="dp-device-card__name">${_esc(d.name || d.id)}</span>
      </div>
      <div class="dp-device-card__body">
        <div class="dp-device-card__row">
          <span class="dp-device-card__row-label">IP</span>
          <span class="dp-device-card__row-value">${_esc(d.ip || '—')}</span>
        </div>
        <div class="dp-device-card__row">
          <span class="dp-device-card__row-label">Ubicación</span>
          <span class="dp-device-card__row-value">${_esc(d.location || d.name || '—')}</span>
        </div>
        <div class="dp-device-card__row">
          <span class="dp-device-card__row-label">Último ping</span>
          <span class="dp-device-card__row-value">${_fmtTs(d.lastPing)}</span>
        </div>
      </div>
    `;
    frag.appendChild(card);
  });

  grid.appendChild(frag);
}


/* ================================================================
   RECENT EVENTS (mini list)
   ================================================================ */

function _renderRecentEvents(events = []) {
  const list = document.getElementById('dpRecentList');
  if (!list) return;
  list.innerHTML = '';

  if (events.length === 0) {
    list.innerHTML =
      '<div class="dp-empty-state"><p class="dp-empty-state__text">Sin eventos recientes.</p></div>';
    return;
  }

  const frag = document.createDocumentFragment();
  events.forEach(e => {
    const row = document.createElement('div');
    row.className = 'dp-recent-row';
    row.innerHTML = `
      <span class="dp-recent-row__status">${_statusBadge(e.status || e.action, true)}</span>
      <span class="dp-recent-row__name">${_esc(e.user || e.email || '—')}</span>
      <span class="dp-recent-row__tag">${_esc(e.tagId || '')}</span>
      <span class="dp-recent-row__time">${_fmtTs(e.timestamp, true)}</span>
    `;
    frag.appendChild(row);
  });
  list.appendChild(frag);
}


/* ================================================================
   VIRTUAL SCROLLER — INIT for Live RFID
   ================================================================ */

function _initLiveVirtualScroller() {
  const container = document.getElementById('dpLiveVScroll');
  const rowsEl    = document.getElementById('liveRows');
  const spacerTop = document.getElementById('liveSpacerTop');
  const spacerBot = document.getElementById('liveSpacerBottom');

  if (!container || !rowsEl) return;

  _liveScroller = new VirtualScroller({
    container,
    rowsEl,
    spacerTop,
    spacerBot,
    rowHeight: parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--dp-table-row-h') || '48',
      10
    ),
    buffer: 4,
    renderRow: _buildLiveRow,
  });
}

/** Build a single div-based table row for the virtual scroller. */
function _buildLiveRow(row, _idx) {
  const div = document.createElement('div');
  div.className  = 'dp-vrow';
  div.dataset.status = row.status || '';

  const tagId    = _esc(row.tagId    || '—');
  const userName = _esc(row.userName || row.userId || '—');
  const reader   = _esc(row.readerName || row.reader || '—');
  const time     = _fmtTs(row.timestamp, true);

  div.innerHTML = `
    <span style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)">${tagId}</span>
    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${userName}</span>
    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary);font-size:12px">${reader}</span>
    <span>${_statusBadge(row.status)}</span>
    <span style="font-size:11px;color:var(--text-muted)">${time}</span>
  `;

  return div;
}


/* ================================================================
   LIVE RFID FILTERS + SEARCH
   ================================================================ */

function _initLiveFilters() {
  /* Filter buttons */
  document.querySelectorAll('.dp-filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dp-filter-btn[data-filter]').forEach(b =>
        b.classList.remove('dp-filter-btn--active'));
      btn.classList.add('dp-filter-btn--active');
      _state.liveFilter = btn.dataset.filter;
      renderLiveRFIDTable(_state.liveRows);
    });
  });

  /* Search */
  const search = document.getElementById('liveSearch');
  if (search) {
    search.addEventListener('input', _debounce(() => {
      _state.liveQuery = search.value;
      renderLiveRFIDTable(_state.liveRows);
    }, 200));
  }

  /* Pause/resume */
  const pauseBtn = document.getElementById('btnPauseLive');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      _state.livePaused = !_state.livePaused;
      const isPaused = _state.livePaused;
      pauseBtn.setAttribute('aria-pressed', String(isPaused));
      pauseBtn.querySelector('svg + span, svg ~ span') /* text child */;
      pauseBtn.innerHTML = isPaused
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
               stroke-linejoin="round">
             <polygon points="5 3 19 12 5 21 5 3"/>
           </svg> Reanudar`
        : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
               stroke-linejoin="round">
             <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
           </svg> Pausar`;
    });
  }

  /* Access logs search + date filters */
  const logsSearch = document.getElementById('logsSearch');
  if (logsSearch) {
    logsSearch.addEventListener('input', _debounce(() => renderAccessLogs(_state.logs), 250));
  }
  ['logsDateFrom', 'logsDateTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', loadAccessLogs);
  });

  /* Users search */
  const usersSearch = document.getElementById('usersSearch');
  if (usersSearch) {
    usersSearch.addEventListener('input', _debounce(() => renderUsers(_state.users), 250));
  }
}


/* ================================================================
   ALERT BUTTONS
   ================================================================ */

function _initAlertButtons() {
  /* New alert (stub) */
  const newAlertBtn = document.getElementById('btnNewAlert');
  if (newAlertBtn) {
    newAlertBtn.addEventListener('click', () => {
      /* TODO: open a modal to create a new alert */
      alert('Funcionalidad "Nueva alerta" — próximamente.');
    });
  }

  /* Devices ping */
  const pingBtn = document.getElementById('btnPingDevices');
  if (pingBtn) {
    pingBtn.addEventListener('click', () => loadDevices());
  }

  /* Export logs CSV */
  const exportBtn = document.getElementById('btnExportLogs');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => _exportLogsCSV(_state.logs));
  }
}

/** Stub: acknowledge an alert by its Firestore doc ID. */
async function acknowledgeAlert(alertId) {
  if (!alertId) return;
  try {
    await db.collection('alerts').doc(alertId).update({
      acknowledged:   true,
      acknowledgedAt: firebase.firestore.FieldValue.serverTimestamp(),
      acknowledgedBy: _state.user ? _state.user.uid : null,
      clientId:       window.currentUserClientId,
    });
    loadAlerts();
  } catch (err) {
    /* surface error without console noise */
  }
}

/** Stub: resolve an alert by its Firestore doc ID. */
async function resolveAlert(alertId) {
  if (!alertId) return;
  try {
    await db.collection('alerts').doc(alertId).update({
      resolved:   true,
      resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
      resolvedBy: _state.user ? _state.user.uid : null,
      clientId:   window.currentUserClientId,
    });
    loadAlerts();
  } catch (err) { /* silent */ }
}

/* Expose to renderUsers() onclick handlers */
window._dpEditUser = function(userId) {
  /* TODO: open user edit modal in existing code */
  /* eslint-disable-next-line no-console */
};


/* ================================================================
   PUSH NOTIFICATIONS BUTTON
   (must only be called from a user gesture)
   ================================================================ */

function _initPushButton() {
  const btn = document.getElementById('btnActivatePush');
  if (!btn) return;

  /* Check current permission status */
  if (Notification.permission === 'granted') {
    _setPushStatus('✅ Activadas');
    btn.disabled = true;
    return;
  }
  if (Notification.permission === 'denied') {
    _setPushStatus('⛔ Bloqueadas en el navegador');
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', async () => {
    btn.disabled    = true;
    btn.textContent = 'Solicitando permiso…';
    _setStatusDot('statusPush', 'loading');

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        _setStatusDot('statusPush', 'online');
        _setPushStatus('✅ Activando token FCM…');
        btn.textContent = 'Activando…';
        try {
          const messaging = firebase.messaging();
          const token = await messaging.getToken({
            vapidKey: 'BEd-BNhI_7rq5_sjALjNVA7UKpXhvrsfDX23vSVHr7GPsvAZ654qFAN7LkKudcLLF_Ot8EPZ03ebzHcKZO8WgtM'
          });
          if (token && window.currentUserClientId && _state.user) {
            await db.collection('push_tokens').doc(_state.user.uid).set({
              token,
              uid: _state.user.uid,
              clientId: window.currentUserClientId,
              platform: 'web',
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          }
          _setPushStatus('✅ Notificaciones activadas');
          btn.textContent = 'Activadas';

          /* Listen for foreground messages */
          messaging.onMessage((payload) => {
            const n = payload.notification || {};
            if (Notification.permission === 'granted') {
              new Notification(n.title || 'NeosTech', { body: n.body || '', icon: '/favicon.ico' });
            }
          });
        } catch (fcmErr) {
          _setPushStatus('⚠️ Token FCM no disponible (HTTPS requerido)');
          btn.disabled = false;
          btn.textContent = 'Activar notificaciones';
        }
      } else {
        _setStatusDot('statusPush', 'offline');
        _setPushStatus('⚠️ Permiso denegado');
        btn.disabled    = false;
        btn.textContent = 'Activar notificaciones';
      }
    } catch (_) {
      btn.disabled    = false;
      btn.textContent = 'Activar notificaciones';
    }
  });
}

function _setPushStatus(msg) {
  _setText('dpPushStatus', msg);
}


/* ================================================================
   READER SETTINGS + STATUS CHECK
   ================================================================ */

const _READER_SETTINGS_KEY = 'dp-reader-settings';
let _readerPingInterval = null;

function _initReaderSettings() {
  /* Restore saved values */
  try {
    const saved = JSON.parse(localStorage.getItem(_READER_SETTINGS_KEY) || 'null');
    if (saved) {
      const ipEl   = document.getElementById('settingsReaderIp');
      const portEl = document.getElementById('settingsReaderPort');
      if (ipEl   && saved.ip)   ipEl.value   = saved.ip;
      if (portEl && saved.port) portEl.value = saved.port;
    }
  } catch (_) {/* ignore */}

  /* Save button */
  const saveBtn = document.getElementById('btnSaveReaderSettings');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const ip   = (document.getElementById('settingsReaderIp')?.value  || '').trim();
      const port = (document.getElementById('settingsReaderPort')?.value || '').trim();
      if (!ip) { return; }
      localStorage.setItem(_READER_SETTINGS_KEY, JSON.stringify({ ip, port: port || '8080' }));
      _startReaderPing(ip, port || '8080');
    });
  }

  /* Test button */
  const testBtn = document.getElementById('btnTestReader');
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      const ip   = (document.getElementById('settingsReaderIp')?.value  || '').trim();
      const port = (document.getElementById('settingsReaderPort')?.value || '8080').trim();
      if (!ip) return;
      testBtn.disabled = true;
      testBtn.textContent = 'Probando…';
      const ok = await _pingReader(ip, port);
      testBtn.disabled = false;
      testBtn.textContent = ok ? '✅ Conectado' : '❌ Sin respuesta';
      setTimeout(() => { testBtn.textContent = 'Probar conexión'; }, 3000);
    });
  }

  /* Auto-start ping if settings already saved */
  try {
    const saved = JSON.parse(localStorage.getItem(_READER_SETTINGS_KEY) || 'null');
    if (saved?.ip) _startReaderPing(saved.ip, saved.port || '8080');
  } catch (_) {/* ignore */}
}

async function _pingReader(ip, port) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 4000);
  try {
    const r = await fetch(`http://${ip}:${port}/health`, { signal: controller.signal, mode: 'no-cors' });
    clearTimeout(tid);
    /* no-cors → opaque response, status 0; any response = reachable */
    _setStatusDot('statusReader', 'online');
    return true;
  } catch (_) {
    clearTimeout(tid);
    _setStatusDot('statusReader', 'offline');
    return false;
  }
}

function _startReaderPing(ip, port) {
  if (_readerPingInterval) clearInterval(_readerPingInterval);
  _setStatusDot('statusReader', 'loading');
  _pingReader(ip, port);
  _readerPingInterval = setInterval(() => _pingReader(ip, port), 30_000);
}


/* ================================================================
   REFRESH / MISC BUTTONS
   ================================================================ */

function _initRefreshButtons() {
  const refreshBtn = document.getElementById('btnRefreshOverview');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadKPIs();
      loadRecentEvents();
      loadTrendData();
    });
  }
}


/* ================================================================
   SIGN OUT
   ================================================================ */

function _initSignOut() {
  const btn = document.getElementById('dpSignOutBtn');
  if (btn) {
    btn.addEventListener('click', () => auth.signOut());
  }
}


/* ================================================================
   QR SCANNER  (uses jsQR loaded from CDN)
   ================================================================ */

let _qrStream = null;
let _qrAnimFrame = null;

function _initQRScanner() {
  const startBtn = document.getElementById('btnStartQR');
  if (!startBtn) return;

  startBtn.addEventListener('click', async () => {
    if (_qrStream) {
      /* Stop camera */
      _stopQRScanner();
      startBtn.textContent = 'Activar cámara';
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      _setText('qrTagId', 'Cámara no disponible (HTTPS requerido)');
      return;
    }

    try {
      _qrStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      /* Build or reuse video + canvas inside the placeholder */
      let video  = document.getElementById('dpQrVideo');
      let canvas = document.getElementById('dpQrCanvas');
      const placeholder = startBtn.closest('.dp-qr-placeholder') ||
                          startBtn.closest('.dp-panel__body')     ||
                          startBtn.parentElement;

      if (!video) {
        video  = Object.assign(document.createElement('video'),
          { id: 'dpQrVideo', autoplay: true, playsInline: true,
            style: 'width:100%;border-radius:8px;display:block;margin-bottom:8px;' });
        canvas = Object.assign(document.createElement('canvas'),
          { id: 'dpQrCanvas', style: 'display:none;' });
        placeholder.insertBefore(canvas, startBtn);
        placeholder.insertBefore(video,  startBtn);
      }

      video.srcObject = _qrStream;
      startBtn.textContent = 'Detener cámara';

      /* Scan loop */
      const ctx = canvas.getContext('2d');
      const scan = () => {
        if (!_qrStream) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.height = video.videoHeight;
          canvas.width  = video.videoWidth;
          ctx.drawImage(video, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          /* jsQR is loaded from CDN */
          if (typeof jsQR === 'function') {
            const code = jsQR(imgData.data, imgData.width, imgData.height,
                              { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              const tagIdEl = document.getElementById('qrTagId');
              if (tagIdEl) tagIdEl.value = code.data;
              /* Auto-stop after successful scan */
              _stopQRScanner();
              startBtn.textContent = '✅ QR leído — Activar cámara';
              return;
            }
          }
        }
        _qrAnimFrame = requestAnimationFrame(scan);
      };
      _qrAnimFrame = requestAnimationFrame(scan);

    } catch (err) {
      _qrStream = null;
      startBtn.textContent = 'Activar cámara';
      _setText('qrTagId', 'Acceso a cámara denegado');
    }
  });
}

function _stopQRScanner() {
  if (_qrAnimFrame) { cancelAnimationFrame(_qrAnimFrame); _qrAnimFrame = null; }
  if (_qrStream)    { _qrStream.getTracks().forEach(t => t.stop()); _qrStream = null; }
  const v = document.getElementById('dpQrVideo');
  if (v) { v.srcObject = null; v.style.display = 'none'; }
}


/* ================================================================
   STATUS INDICATORS
   ================================================================ */

function _setStatusDot(containerId, state) {
  const el = document.querySelector(`#${containerId} .dp-status-dot`);
  if (el) el.dataset.state = state;
}


/* ================================================================
   SPARKLINE RENDERER (SVG)
   ================================================================ */

/**
 * _drawSparkline(canvasId, values)
 * Plots a polyline sparkline inside an existing <svg> element.
 *
 * @param {string}   svgId   — id of the <svg> element
 * @param {number[]} values  — array of numeric data points
 */
function _drawSparkline(svgId, values) {
  const svg = document.getElementById(svgId);
  if (!svg || !values || values.length < 2) return;

  const W = 80, H = 28, pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const range = max - min || 1;

  const pts = values.map((v, i) => {
    const x = pad + ((W - pad * 2) / (values.length - 1)) * i;
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const poly = svg.querySelector('.dp-sparkline__line');
  if (poly) poly.setAttribute('points', pts);
}


/* ================================================================
   24h ACTIVITY CHART (Canvas bar chart)
   ================================================================ */

/**
 * _drawChart24h(tagsData, accessData)
 * Simple dual-series bar chart using Canvas API.
 * No library dependency.
 *
 * @param {number[]} tagsData    — 24 hourly tag counts
 * @param {number[]} accessData  — 24 hourly access counts
 */
function _drawChart24h(tagsData, accessData) {
  const canvas = document.getElementById('c24hCanvas');
  if (!canvas) return;

  const parent = canvas.parentElement;
  canvas.width  = parent.offsetWidth  || 600;
  canvas.height = parent.offsetHeight || 200;

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 12, right: 16, bottom: 32, left: 32 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;
  const bars   = Math.max(tagsData.length, 1);
  const barW   = (chartW / bars) * 0.7;
  const gap    = (chartW / bars) * 0.3;
  const maxVal = Math.max(...tagsData, ...accessData, 1);

  /* Background clear */
  ctx.clearRect(0, 0, W, H);

  /* Grid lines */
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 1;
  for (let i = 1; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  /* Bars */
  const clrTags   = 'rgba(99,102,241,0.7)';
  const clrAccess = 'rgba(34,197,94,0.5)';

  tagsData.forEach((v, i) => {
    const bh = (v / maxVal) * chartH;
    const x  = pad.left + i * (chartW / bars) + gap / 2;
    const y  = pad.top + chartH - bh;

    /* Tags bar */
    ctx.fillStyle = clrTags;
    ctx.fillRect(x, y, barW, bh);

    /* Accesses overlay */
    const bh2 = ((accessData[i] || 0) / maxVal) * chartH;
    ctx.fillStyle = clrAccess;
    ctx.fillRect(x, pad.top + chartH - bh2, barW, bh2);
  });

  /* Hour labels (every 4h) */
  ctx.fillStyle  = 'rgba(148,175,200,0.6)';
  ctx.font       = '10px Inter, system-ui, sans-serif';
  ctx.textAlign  = 'center';
  const nowH = new Date().getHours();
  for (let i = 0; i < bars; i += 4) {
    const h = (nowH - bars + 1 + i + 24) % 24;
    const x = pad.left + i * (chartW / bars) + barW / 2;
    ctx.fillText(`${String(h).padStart(2,'0')}h`, x, H - 8);
  }

  /* Legend */
  const lx = pad.left;
  const ly = pad.top - 2;
  ctx.fillStyle = clrTags;
  ctx.fillRect(lx, ly, 10, 8);
  ctx.fillStyle = 'rgba(148,175,200,0.7)';
  ctx.font = '10px Inter, system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('Tags', lx + 13, ly + 8);

  ctx.fillStyle = clrAccess;
  ctx.fillRect(lx + 60, ly, 10, 8);
  ctx.fillStyle = 'rgba(148,175,200,0.7)';
  ctx.fillText('Accesos', lx + 73, ly + 8);
}


/* ================================================================
   ALERT CARD BUILDER
   ================================================================ */

function _buildAlertCard(alert, resolved = false) {
  const sev = (alert.severity || 'low').toLowerCase();
  const card = document.createElement('div');
  card.className = `dp-alert-card dp-alert-card--${sev}`;
  card.setAttribute('role', 'listitem');

  const ts = _fmtTs(alert.createdAt);

  card.innerHTML = `
    <div class="dp-alert-card__main">
      <div class="dp-alert-card__title">
        <span class="dp-severity dp-severity--${sev}">${_esc(sev.toUpperCase())}</span>
        ${_esc(alert.title || 'Alerta sin título')}
      </div>
      <p class="dp-alert-card__desc">${_esc(alert.description || '')}</p>
      <div class="dp-alert-card__meta">
        <span>🕐 ${ts}</span>
        ${alert.zone ? `<span>📍 ${_esc(alert.zone)}</span>` : ''}
        ${alert.acknowledgedBy ? '<span>✅ Reconocida</span>' : ''}
      </div>
    </div>
    ${!resolved ? `
    <div class="dp-alert-card__actions">
      <button class="btn btn-ghost dp-btn-sm dp-btn--ack"
              data-id="${_esc(alert.id)}"
              ${alert.acknowledged ? 'disabled' : ''}>Reconocer</button>
      <button class="btn btn-primary dp-btn-sm dp-btn--resolve"
              data-id="${_esc(alert.id)}">Resolver</button>
    </div>` : ''}
  `;

  /* Wire action buttons */
  const ackBtn = card.querySelector('.dp-btn--ack');
  if (ackBtn) ackBtn.addEventListener('click', () => acknowledgeAlert(alert.id));

  const resBtn = card.querySelector('.dp-btn--resolve');
  if (resBtn) resBtn.addEventListener('click', () => resolveAlert(alert.id));

  return card;
}


/* ================================================================
   UTILITIES
   ================================================================ */

function _initDateDisplay() {
  const el = document.getElementById('overviewDate');
  if (!el) return;
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = new Date().toLocaleDateString('es-MX', opts);
}

function _updateAlertBadge(count) {
  const badge = document.getElementById('navBadgeAlerts');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function _tintKpiCard(selector, colour) {
  const card = document.querySelector(selector);
  if (!card) return;
  const icon = card.querySelector('.dp-kpi-card__icon');
  if (!icon) return;
  /* Clear existing colour modifiers */
  ['blue','green','red','purple'].forEach(c =>
    icon.classList.remove(`dp-kpi-card__icon--${c}`));
  if (colour) icon.classList.add(`dp-kpi-card__icon--${colour}`);
}

/** Return a Firestore Timestamp for today at 00:00:00 local time. */
function _todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return firebase.firestore.Timestamp.fromDate(d);
}

/** Generate a stub trend array (for development / before Firestore is wired). */
function _stubTrend(points, min, max) {
  return Array.from({ length: points }, () =>
    Math.floor(Math.random() * (max - min + 1)) + min);
}

/** Format a Firestore Timestamp or Date object. */
function _fmtTs(ts, short = false) {
  if (!ts) return '—';
  let date;
  if (ts && typeof ts.toDate === 'function') date = ts.toDate();
  else if (ts instanceof Date) date = ts;
  else if (typeof ts === 'number') date = new Date(ts);
  else return '—';

  if (short) {
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Format a number with locale thousands separator. */
function _fmtNum(n) {
  if (n === null || n === undefined) return '—';
  if (typeof n === 'string') return n;
  return Number(n).toLocaleString('es-MX');
}

/** Build an HTML status badge element string. */
function _statusBadge(status, dotOnly = false) {
  const map = {
    allowed:  ['success', 'Permitido'],
    denied:   ['danger',  'Denegado'],
    login:    ['info',    'Ingreso'],
    logout:   ['neutral', 'Salida'],
    unknown:  ['neutral', '—'],
  };
  const [cls, label] = map[status] || ['neutral', status || '—'];
  if (dotOnly) return `<span class="dp-badge dp-badge--dot dp-badge--${cls}"></span>`;
  return `<span class="dp-badge dp-badge--${cls}">${_esc(label)}</span>`;
}

/** HTML-escape a string to prevent XSS. */
function _esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Set the textContent of an element by ID. */
function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = (val === null || val === undefined) ? '—' : String(val);
}

/** Debounce a function. */
function _debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Basic CSV export for access logs. */
function _exportLogsCSV(logs = []) {
  if (!logs.length) return;
  const header = ['Usuario', 'Email', 'Tag', 'Punto de acceso', 'Estado', 'Fecha'];
  const rows = logs.map(l => [
    l.user || '', l.email || '', l.tagId || '',
    l.reader || l.accessPoint || '', l.status || l.action || '',
    _fmtTs(l.timestamp),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv  = [header.join(','), ...rows].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `bitacora_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}


/* ================================================================
   BOOTSTRAP — auto-start on DOM ready
   ================================================================ */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardPro);
} else {
  initDashboardPro();
}

/* ================================================================
   PUBLIC EXPORTS  (usable from browser console or integration code)
   ================================================================ */

window.DashboardPro = {
  init:                 initDashboardPro,
  renderKPIs,
  renderLiveRFIDTable,
  renderAlerts,
  renderAccessLogs,
  renderUsers,
  renderDevices,
  loadKPIs,
  loadAlerts,
  loadUsers,
  loadDevices,
  startLiveRFIDStream,
  acknowledgeAlert,
  resolveAlert,
};
