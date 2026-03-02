/**
 * NeosTech RFID System Pro — Dashboard v3
 *
 * Arquitectura:
 *  - STATE          — fuente única de verdad
 *  - _log/_warn     — logger con flag DEBUG
 *  - VirtualList    — virtual-scroll para eventos en vivo
 *  - FirebaseStubs  — capa de datos (Firebase real + stubs de demostración)
 *  - Módulos UI     — sidebar, topbar, router, modals, toast, confirm
 *  - Vistas         — resumen, tags, bitácora, alertas, usuarios, dispositivos, listas, config
 *
 * Convenciones:
 *  - Funciones privadas: prefijo _
 *  - Estado global: STATE
 *  - Sin console.log en producción (usa _log)
 */

'use strict';

/* ============================================================
   DEBUG LOGGER
============================================================ */
const DEBUG = false; // poner true solo en desarrollo local
function _log(...args)   { if (DEBUG) console.log('[NT]',   ...args); }
function _warn(...args)  { console.warn('[NT]',  ...args); }  // siempre visible (errores Firestore/red)
function _error(...args) { console.error('[NT]', ...args); }  // siempre visible (errores críticos)


/* ============================================================
   ESTADO GLOBAL
============================================================ */
const STATE = {
  user:        null,
  clientId:    null,
  userRole:    null,
  email:       null,

  currentView: 'resumen',

  // Tags en vivo
  liveRows:    [],
  liveFilter:  'todos',
  liveQuery:   '',
  livePaused:  false,
  liveUnsub:   null,

  // Alertas en vivo
  alertsUnsub: null,

  // Datos de vistas
  logs:           [],
  users:          [],
  devices:        [],
  alerts:         [],
  alertsResolved: [],
  whitelist:      [],
  blacklist:      [],

  // Tags pendientes en modal de usuario
  pendingTags: [],

  // Confirm callback
  _confirmCb: null,

  // Listeners activos
  _unsubs: [],
};


/* ============================================================
   VIRTUAL LIST — scroll eficiente para eventos en vivo
============================================================ */
class VirtualList {
  #container; #rows = []; #rowH; #buf; #phantom; #inner; #rafId = null;

  constructor(containerId, rowHeight = 46, bufferSize = 8) {
    this.#container = document.getElementById(containerId);
    this.#rowH = rowHeight;
    this.#buf  = bufferSize;
    if (!this.#container) return;

    this.#phantom = document.createElement('div');
    this.#phantom.style.cssText = 'position:relative;pointer-events:none;';

    this.#inner = document.createElement('div');
    this.#inner.style.cssText = 'position:absolute;top:0;left:0;width:100%;';

    this.#phantom.appendChild(this.#inner);
    this.#container.appendChild(this.#phantom);

    this.#container.addEventListener('scroll', () => {
      if (this.#rafId) cancelAnimationFrame(this.#rafId);
      this.#rafId = requestAnimationFrame(() => this.#render());
    });
  }

  setRows(rows) { this.#rows = rows; this.#render(); }
  get length()  { return this.#rows.length; }

  #render() {
    if (!this.#container || !this.#phantom) return;
    const total     = this.#rows.length;
    const scrollTop = this.#container.scrollTop;
    const viewH     = this.#container.clientHeight;

    const start = Math.max(0, Math.floor(scrollTop / this.#rowH) - this.#buf);
    const end   = Math.min(total, Math.ceil((scrollTop + viewH) / this.#rowH) + this.#buf);

    this.#phantom.style.height = `${total * this.#rowH}px`;
    this.#inner.style.top      = `${start * this.#rowH}px`;

    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      frag.appendChild(_buildLiveRow(this.#rows[i]));
    }
    this.#inner.innerHTML = '';
    this.#inner.appendChild(frag);
  }
}

let _vlist = null;


/* ============================================================
   UTILIDADES
============================================================ */

function _esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = (val == null) ? '–' : String(val);
}

function _fmtNum(n) {
  if (n == null) return '–';
  return Number(n).toLocaleString('es-MX');
}

function _fmtTs(ts, short = false) {
  if (!ts) return '–';
  let d;
  if (typeof ts.toDate === 'function') d = ts.toDate();
  else if (ts instanceof Date)         d = ts;
  else if (typeof ts === 'number')     d = new Date(ts);
  else return '–';

  if (short) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function _debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function _roleLabel(role) {
  return { admin: 'Administrador', guard: 'Guardia', resident: 'Residente' }[role] ?? role;
}

function _statusBadge(status, dotOnly = false) {
  const map = {
    allowed:   ['success', 'Permitido'],
    permitido: ['success', 'Permitido'],
    denied:    ['danger',  'Denegado'],
    denegado:  ['danger',  'Denegado'],
    login:     ['info',    'Ingreso'],
    logout:    ['neutral', 'Salida'],
    manual:    ['warning', 'Manual'],
  };
  const [cls, label] = map[String(status || '').toLowerCase()] ?? ['neutral', status ?? '–'];
  if (dotOnly) return `<span class="badge badge--${cls} badge--dot" aria-hidden="true"></span>`;
  return `<span class="badge badge--${cls}">${_esc(label)}</span>`;
}

function _severityBadge(sev) {
  const map = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };
  const cls = map[String(sev).toLowerCase()] ?? 'neutral';
  return `<span class="badge badge--${cls}">${_esc(String(sev).toUpperCase())}</span>`;
}

function _exportCSV(rows, filename = 'export.csv') {
  if (!rows.length) { _toast('Sin datos para exportar.', 'warning'); return; }
  const header = ['Usuario', 'Email', 'Tag', 'Punto de acceso', 'Estado', 'Fecha'];
  const lines  = rows.map(l => [
    l.user || l.userName || '',
    l.email || '',
    l.tagId || '',
    l.reader || l.accessPoint || l.readerName || '',
    l.status || l.action || '',
    _fmtTs(l.timestamp),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv  = [header.join(','), ...lines].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function _todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

function _stubTrend(n, min, max) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}


/* ============================================================
   TOAST SYSTEM
============================================================ */
function _toast(msg, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    danger:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] ?? icons.info}</span>
    <span class="toast-msg">${_esc(msg)}</span>
    <button class="toast-close" aria-label="Cerrar">×</button>
  `;
  const close = () => {
    toast.classList.add('toast--out');
    setTimeout(() => toast.remove(), 300);
  };
  toast.querySelector('.toast-close').addEventListener('click', close);
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--in'));
  setTimeout(close, duration);
}


/* ============================================================
   CONFIRM DIALOG
============================================================ */
function _confirm(msg, cb) {
  document.getElementById('modalConfirmMsg').textContent = msg;
  STATE._confirmCb = cb;
  _openModal('modalConfirm');
}

function _initConfirm() {
  document.getElementById('btnConfirmOk')?.addEventListener('click', () => {
    _closeModal('modalConfirm');
    if (typeof STATE._confirmCb === 'function') STATE._confirmCb();
    STATE._confirmCb = null;
  });
  document.getElementById('btnConfirmCancel')?.addEventListener('click', () => {
    _closeModal('modalConfirm');
    STATE._confirmCb = null;
  });
}


/* ============================================================
   MODAL HELPERS
============================================================ */
function _openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.removeAttribute('hidden');
  el.style.display = '';
  requestAnimationFrame(() => el.classList.add('modal-backdrop--open'));
  document.body.style.overflow = 'hidden';
}

function _closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('modal-backdrop--open');
  setTimeout(() => { el.hidden = true; el.style.display = 'none'; }, 200);
  document.body.style.overflow = '';
}

function _initModals() {
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => _closeModal(btn.dataset.modalClose));
  });
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) _closeModal(backdrop.id);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-backdrop--open').forEach(m => _closeModal(m.id));
  });
}


/* ============================================================
   INDICADORES
============================================================ */
function _setIndicator(id, state) {
  const el = document.getElementById(id);
  if (el) el.dataset.state = state;
}


/* ============================================================
   SIDEBAR
============================================================ */
function _initSidebar() {
  const toggle    = document.getElementById('sidebarToggle');
  const shell     = document.getElementById('appShell');
  const backdrop  = document.getElementById('sidebarBackdrop');
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (!shell) return;

  const collapsed = localStorage.getItem('nt_sidebar_collapsed') === 'true';
  shell.dataset.collapsed = collapsed;
  if (toggle) toggle.setAttribute('aria-expanded', String(!collapsed));

  toggle?.addEventListener('click', () => {
    const isCol = shell.dataset.collapsed === 'true';
    shell.dataset.collapsed = String(!isCol);
    toggle.setAttribute('aria-expanded', String(isCol));
    localStorage.setItem('nt_sidebar_collapsed', String(!isCol));
  });

  mobileBtn?.addEventListener('click', () => {
    const open = shell.dataset.mobileOpen === 'true';
    shell.dataset.mobileOpen = String(!open);
    mobileBtn.setAttribute('aria-expanded', String(!open));
  });

  backdrop?.addEventListener('click', () => {
    shell.dataset.mobileOpen = 'false';
    if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
  });
}


/* ============================================================
   TOPBAR — fecha
============================================================ */
function _initTopbar() {
  const fecha = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const el = document.getElementById('topbarDate');
  if (el) el.textContent = fecha;
  const ov = document.getElementById('overviewDate');
  if (ov) ov.textContent = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}


/* ============================================================
   ROUTER — hash-based SPA
============================================================ */
const VIEW_TITLES = {
  resumen:      'Resumen',
  tags:         'RFID en vivo',
  bitacora:     'Bitácora',
  alertas:      'Alertas',
  usuarios:     'Usuarios',
  dispositivos: 'Dispositivos',
  listas:       'Listas de acceso',
  config:       'Configuración',
};

let _routerInitialized = false;

function _initRouter() {
  if (_routerInitialized) return;
  _routerInitialized = true;

  document.querySelectorAll('[data-view]').forEach(el => {
    if (el.tagName === 'A') {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        _navigateTo(el.dataset.view);
      });
    }
  });

  document.querySelectorAll('.panel-link[data-view]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      _navigateTo(el.dataset.view);
    });
  });

  window.addEventListener('hashchange', () => {
    const view = location.hash.replace('#', '') || 'resumen';
    _activateView(view, false);
  });

  const hash = location.hash.replace('#', '');
  if (hash && VIEW_TITLES[hash]) {
    _activateView(hash, false);
    _loadViewData(hash);
  }
}

function _navigateTo(view) {
  if (!VIEW_TITLES[view]) return;
  _activateView(view, true);
  _loadViewData(view);
}

function _activateView(view, pushHash) {
  if (pushHash) location.hash = view;
  STATE.currentView = view;

  document.querySelectorAll('.view').forEach(el => {
    const active = el.dataset.view === view;
    el.classList.toggle('view--active', active);
    el.hidden = !active;
  });

  document.querySelectorAll('[data-view]').forEach(el => {
    if (el.tagName === 'A') {
      el.setAttribute('aria-current', el.dataset.view === view ? 'page' : 'false');
      el.classList.toggle('nav-link--active', el.dataset.view === view);
    }
  });

  _set('topbarTitle', VIEW_TITLES[view] ?? view);

  const shell = document.getElementById('appShell');
  if (shell) shell.dataset.mobileOpen = 'false';
  const main = document.getElementById('mainContent');
  if (main) main.scrollTop = 0;
}


/* ============================================================
   AUTH
============================================================ */
function _showApp(userData) {
  _log('_showApp —', userData?.email);
  const ls    = document.getElementById('loadingScreen');
  const as    = document.getElementById('authScreen');
  const shell = document.getElementById('appShell');

  if (ls)    { ls.hidden = true; ls.style.display = 'none'; }
  if (as)    { as.hidden = true; as.style.display = 'none'; }
  if (shell) { shell.removeAttribute('hidden'); shell.style.display = 'grid'; }

  const name     = userData?.displayName ?? userData?.email ?? 'Usuario';
  const role     = userData?.role ?? 'guard';
  const initials = name.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  _set('userName',       name);
  _set('userRole',       _roleLabel(role));
  _set('topbarUserName', name);
  _set('userAvatar',     initials);
  _set('configClientId', userData?.clientId ?? '–');
  _set('configRole',     _roleLabel(role));
  _set('configEmail',    userData?.email ?? '–');

  STATE.user     = userData;
  STATE.userRole = role;
  STATE.clientId = userData?.clientId ?? null;
  STATE.email    = userData?.email ?? null;

  // Exponer clientId globalmente para consultas Firestore post-auth.
  // Se asigna UNA sola vez aquí, después de validar onAuthStateChanged.
  window.currentUserClientId = STATE.clientId;

  _log('_showApp DONE — appShell visible');
}

function _showAuth() {
  _log('_showAuth');
  const ls    = document.getElementById('loadingScreen');
  const as    = document.getElementById('authScreen');
  const shell = document.getElementById('appShell');

  if (ls)    { ls.hidden = true; ls.style.display = 'none'; }
  if (as)    { as.removeAttribute('hidden'); as.style.display = ''; }
  if (shell) { shell.hidden = true; shell.style.display = 'none'; }

  window.currentUserClientId = null;
  _cleanupListeners();
}

function _cleanupListeners() {
  STATE._unsubs.forEach(fn => { try { fn(); } catch (_) {} });
  STATE._unsubs = [];
  if (STATE.liveUnsub)   { try { STATE.liveUnsub();   } catch (_) {} }
  STATE.liveUnsub = null;
  if (STATE.alertsUnsub) { try { STATE.alertsUnsub(); } catch (_) {} }
  STATE.alertsUnsub = null;
}

function _initAuth() {
  const form = document.getElementById('authForm');
  if (!form || form.dataset.listenerAttached) return;
  form.dataset.listenerAttached = 'true';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = (document.getElementById('authEmail')?.value ?? '').trim();
    const password = document.getElementById('authPassword')?.value ?? '';
    const errEl    = document.getElementById('authError');
    const btn      = document.getElementById('authSubmit');

    if (errEl) { errEl.hidden = true; errEl.textContent = ''; }

    if (!email || !email.includes('@')) {
      if (errEl) { errEl.textContent = 'Ingresa un correo válido.'; errEl.hidden = false; }
      return;
    }
    if (password.length < 6) {
      if (errEl) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres.'; errEl.hidden = false; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Ingresando…'; }

    try {
      await FirebaseStubs.signIn(email, password);
    } catch (err) {
      const msgs = {
        'auth/user-not-found':         'No existe cuenta con ese correo.',
        'auth/wrong-password':         'Contraseña incorrecta.',
        'auth/invalid-credential':     'Correo o contraseña incorrectos.',
        'auth/invalid-email':          'El correo no tiene un formato válido.',
        'auth/too-many-requests':      'Demasiados intentos. Espera unos minutos.',
        'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
        'auth/user-disabled':          'Esta cuenta está deshabilitada.',
      };
      const msg = msgs[err.code] ?? `Error al iniciar sesión (${err.code ?? 'desconocido'}).`;
      if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
      _log('signIn FAILED:', err.code);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
    }
  });

  document.getElementById('signOutBtn')?.addEventListener('click', () => FirebaseStubs.signOut());
}


/* ============================================================
   DATA LOADERS
============================================================ */
function _loadViewData(view) {
  // Todas las queries Firestore requieren clientId del token autenticado.
  // Si window.currentUserClientId no está definido, onAuthStateChanged aún
  // no ha completado — abortar para evitar queries sin autenticación.
  if (!window.currentUserClientId) {
    _warn('_loadViewData: currentUserClientId no disponible, abortando');
    return;
  }
  switch (view) {
    case 'resumen':      _loadResumen();      break;
    case 'tags':         _startLiveTags();    break;
    case 'bitacora':     _loadBitacora();     break;
    case 'alertas':      _startAlertas();     break;
    case 'usuarios':     _loadUsuarios();     break;
    case 'dispositivos': _loadDispositivos(); break;
    case 'listas':       _loadListas();       break;
    case 'config':       _initConfigView();   break;
  }
}


/* ============================================================
   VIEW: RESUMEN
============================================================ */
async function _loadResumen() {
  _log('loadResumen');
  const clientId = window.currentUserClientId;
  if (!clientId) { _warn('_loadResumen: currentUserClientId no disponible, abortando'); return; }
  ['kpiLecturas', 'kpiPermitidos', 'kpiDenegados', 'kpiAlertas'].forEach(id => _set(id, '–'));

  try {
    const [kpi, events, devices] = await Promise.all([
      FirebaseStubs.getKPIs(clientId),
      FirebaseStubs.getRecentEvents(clientId),
      FirebaseStubs.getDevices(clientId),
    ]);

    _set('kpiLecturas',   _fmtNum(kpi.lecturas));
    _set('kpiPermitidos', _fmtNum(kpi.permitidos));
    _set('kpiDenegados',  _fmtNum(kpi.denegados));
    _set('kpiAlertas',    _fmtNum(kpi.alertas));

    _renderRecentEvents(events);
    _renderDeviceStatus(devices);
    _drawSparkline('sparklineTags',    _stubTrend(12, 5, 80));
    _drawSparkline('sparklineAccesos', _stubTrend(12, 3, 70));
    _drawChart24h(_stubTrend(24, 5, 90), _stubTrend(24, 3, 70));
    _setIndicator('indicatorDB', 'online');
  } catch (err) {
    _warn('loadResumen error:', err);
    _setIndicator('indicatorDB', 'offline');
  }
}

function _renderRecentEvents(events = []) {
  const tbody = document.getElementById('resumenEventsBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!events.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="td-empty">Sin eventos recientes.</td></tr>';
    return;
  }
  const frag = document.createDocumentFragment();
  events.slice(0, 8).forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td">
        <div class="td-main">${_esc(e.userName || e.user || e.email || '–')}</div>
        <div class="td-sub mono">${_esc(e.tagId || '')}</div>
      </td>
      <td class="td col-hide-sm">${_esc(e.readerName || e.reader || '–')}</td>
      <td class="td">${_statusBadge(e.status)}</td>
      <td class="td col-time">${_fmtTs(e.timestamp, true)}</td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function _renderDeviceStatus(devices = []) {
  const container = document.getElementById('deviceStatusList');
  if (!container) return;
  container.innerHTML = '';
  const online = devices.filter(d => d.status === 'online').length;
  _set('devicesStatusMeta', `${online}/${devices.length} en línea`);
  if (!devices.length) {
    container.innerHTML = '<p class="td-empty">Sin dispositivos registrados.</p>';
    return;
  }
  const frag = document.createDocumentFragment();
  devices.forEach(d => {
    const state = d.status === 'online' ? 'online' : d.status === 'offline' ? 'offline' : 'unknown';
    const row = document.createElement('div');
    row.className = 'device-status-row';
    row.innerHTML = `
      <span class="indicator-dot" data-state="${state}" aria-hidden="true"></span>
      <span class="device-status-name">${_esc(d.name || d.id)}</span>
      <span class="device-status-loc">${_esc(d.location || '–')}</span>
      <span class="device-status-ping">${_fmtTs(d.lastPing, true)}</span>
    `;
    frag.appendChild(row);
  });
  container.appendChild(frag);
}

function _drawSparkline(svgId, values) {
  const svg = document.getElementById(svgId);
  if (!svg || !values || values.length < 2) return;
  const W = 72, H = 28, pad = 2;
  const min = Math.min(...values), max = Math.max(...values) || 1;
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + ((W - pad * 2) / (values.length - 1)) * i;
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const poly = svg.querySelector('.sparkline-line');
  if (poly) poly.setAttribute('points', pts);
}

function _drawChart24h(tagsData, accessData) {
  const canvas = document.getElementById('chart24hCanvas');
  if (!canvas) return;
  const parent  = document.getElementById('chartArea24h') || canvas.parentElement;
  canvas.width  = parent.offsetWidth  || 600;
  canvas.height = parent.offsetHeight || 180;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 16, right: 16, bottom: 28, left: 28 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;
  const bars = tagsData.length;
  const bW   = (cW / bars) * 0.68;
  const gap  = (cW / bars) * 0.32;
  const maxV = Math.max(...tagsData, ...accessData, 1);

  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const y = pad.top + (cH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
  }

  const clrTags   = 'rgba(99,102,241,0.72)';
  const clrAccess = 'rgba(34,197,94,0.5)';
  tagsData.forEach((v, i) => {
    const bh = (v / maxV) * cH;
    const x  = pad.left + i * (cW / bars) + gap / 2;
    ctx.fillStyle = clrTags;
    ctx.fillRect(x, pad.top + cH - bh, bW, bh);
    const bh2 = ((accessData[i] || 0) / maxV) * cH;
    ctx.fillStyle = clrAccess;
    ctx.fillRect(x, pad.top + cH - bh2, bW, bh2);
  });

  ctx.fillStyle = 'rgba(148,175,200,0.5)';
  ctx.font = '9px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  const nowH = new Date().getHours();
  for (let i = 0; i < bars; i += 4) {
    const h = (nowH - bars + 1 + i + 24) % 24;
    const x = pad.left + i * (cW / bars) + bW / 2;
    ctx.fillText(`${String(h).padStart(2, '0')}h`, x, H - 6);
  }
}


/* ============================================================
   VIEW: RFID EN VIVO
============================================================ */
function _startLiveTags() {
  _log('startLiveTags');
  const clientId = window.currentUserClientId;
  if (!clientId) { _warn('_startLiveTags: currentUserClientId no disponible, abortando'); return; }
  if (!_vlist) _vlist = new VirtualList('tagsVScroll', 46, 6);
  if (STATE.liveUnsub) return;

  STATE.liveUnsub = FirebaseStubs.subscribeToLiveTags(clientId, (event) => {
    if (STATE.livePaused) return;
    STATE.liveRows.unshift(event);
    if (STATE.liveRows.length > 500) STATE.liveRows.length = 500;
    _renderLiveTags();
    _set('liveCount',    STATE.liveRows.length);
    _set('navBadgeTags', STATE.liveRows.length);
  });
}

function _renderLiveTags() {
  const q = STATE.liveQuery.toLowerCase();
  const f = STATE.liveFilter;
  let rows = STATE.liveRows;

  if (f !== 'todos') {
    rows = rows.filter(r => {
      const s = String(r.status ?? '').toLowerCase();
      return f === 'permitido'
        ? (s === 'allowed' || s === 'permitido')
        : (s === 'denied'  || s === 'denegado');
    });
  }
  if (q) {
    rows = rows.filter(r =>
      [r.tagId, r.userName, r.user, r.readerName, r.reader]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }

  const empty = document.getElementById('tagsEmpty');
  if (empty) empty.hidden = rows.length > 0;
  _vlist?.setRows(rows);
}

function _buildLiveRow(row) {
  const div = document.createElement('div');
  div.className  = 'vrow';
  div.dataset.status = row.status ?? '';
  div.innerHTML = `
    <span class="vrow-mono">${_esc(row.tagId ?? '–')}</span>
    <span class="vrow-user">${_esc(row.userName || row.user || '–')}</span>
    <span class="vrow-point">${_esc(row.readerName || row.reader || '–')}</span>
    <span>${_statusBadge(row.status)}</span>
    <span class="vrow-time">${_fmtTs(row.timestamp, true)}</span>
  `;
  return div;
}

function _initLiveTags() {
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      STATE.liveFilter = btn.dataset.filter;
      _renderLiveTags();
    });
  });

  document.getElementById('tagsSearch')?.addEventListener('input', _debounce(() => {
    STATE.liveQuery = document.getElementById('tagsSearch').value;
    _renderLiveTags();
  }, 200));

  const pauseBtn = document.getElementById('tagsPauseBtn');
  pauseBtn?.addEventListener('click', () => {
    STATE.livePaused = !STATE.livePaused;
    const paused = STATE.livePaused;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.innerHTML = paused
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Reanudar`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar`;
  });
}


/* ============================================================
   VIEW: BITÁCORA
============================================================ */
async function _loadBitacora(from, to) {
  _log('loadBitacora', from, to);
  const clientId = window.currentUserClientId;
  if (!clientId) { _warn('_loadBitacora: currentUserClientId no disponible, abortando'); return; }
  const tbody = document.getElementById('logsTableBody');
  const empty = document.getElementById('logsEmpty');
  if (tbody) tbody.innerHTML = '<tr class="row-skeleton"><td colspan="5"><span class="skeleton"></span></td></tr>';
  if (empty) empty.hidden = true;

  try {
    const logs = await FirebaseStubs.getAccessLogs(clientId, { from, to });
    STATE.logs = logs;
    _renderBitacora(logs);
    _setIndicator('indicatorDB', 'online');
  } catch (err) {
    _warn('loadBitacora error:', err);
    _toast('Error al cargar bitácora.', 'danger');
  }
}

function _renderBitacora(logs = []) {
  const tbody = document.getElementById('logsTableBody');
  const empty = document.getElementById('logsEmpty');
  const count = document.getElementById('logsCount');
  if (!tbody) return;

  const q = (document.getElementById('logsSearch')?.value ?? '').toLowerCase();
  const filtered = q
    ? logs.filter(l => [l.user, l.userName, l.email, l.tagId, l.reader, l.accessPoint]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
    : logs;

  if (count) count.textContent = `${filtered.length} registros`;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  filtered.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td">
        <div class="td-main">${_esc(l.user || l.userName || l.email || '–')}</div>
        <div class="td-sub">${_esc(l.email || '')}</div>
      </td>
      <td class="td col-mono col-hide-sm">${_esc(l.tagId || '–')}</td>
      <td class="td col-hide-sm">${_esc(l.reader || l.accessPoint || l.readerName || '–')}</td>
      <td class="td">${_statusBadge(l.status || l.action)}</td>
      <td class="td col-time">${_fmtTs(l.timestamp)}</td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function _initBitacora() {
  document.getElementById('logsSearch')?.addEventListener('input',
    _debounce(() => _renderBitacora(STATE.logs), 250));

  document.getElementById('btnFilterLogs')?.addEventListener('click', () => {
    const from = document.getElementById('logsDateFrom')?.value;
    const to   = document.getElementById('logsDateTo')?.value;
    _loadBitacora(
      from ? new Date(from) : null,
      to   ? new Date(to + 'T23:59:59') : null,
    );
  });

  document.getElementById('btnExportLogs')?.addEventListener('click', () =>
    _exportCSV(STATE.logs, `bitacora_${new Date().toISOString().slice(0, 10)}.csv`));
}


/* ============================================================
   VIEW: ALERTAS
============================================================ */

// Sonido de alerta según tipo (usa los .wav disponibles en /sounds/)
const SOUND_BY_TYPE = {
  FIRE:        '/sounds/emergency_alarm_fire.wav',
  EVACUATION:  '/sounds/emergency_alarm_evacuation.wav',
  FLOOD:       '/sounds/emergency_alarm_flood.wav',
  TSUNAMI:     '/sounds/emergency_alarm_flood.wav',
  EARTHQUAKE:  '/sounds/emergency_alarm_general.wav',
  ROBBERY:     '/sounds/emergency_alarm_general.wav',
  FIGHT:       '/sounds/emergency_alarm_general.wav',
  POWER_OUTAGE:'/sounds/emergency_alarm_general.wav',
  CANCEL:      '/sounds/emergency_alarm_cancel.wav',
  GENERAL:     '/sounds/emergency_alarm_general.wav',
};

function _playAlertSound(alertType, severity) {
  if (severity === 'low') return;
  const src = SOUND_BY_TYPE[String(alertType || '').toUpperCase()]
    ?? '/sounds/emergency_alarm_general.wav';
  try { new Audio(src).play().catch(() => {}); } catch (_) {}
}

// Botón "Actualizar" → recarga manual una vez
async function _loadAlertas() {
  _log('loadAlertas');
  const activeList = document.getElementById('alertasActiveList');
  if (activeList) activeList.innerHTML = '<div class="skeleton-alert" aria-busy="true"></div>';

  try {
    const { active, resolved } = await FirebaseStubs.getAlerts(STATE.clientId);
    STATE.alerts         = active;
    STATE.alertsResolved = resolved;
    _renderAlertas(active, resolved);
    _updateAlertBadge(active.length);
  } catch (err) {
    _warn('loadAlertas error:', err);
    _toast('Error al cargar alertas.', 'danger');
  }
}

// Suscripción en tiempo real — se llama al entrar a la vista
function _startAlertas() {
  if (STATE.alertsUnsub) return; // ya activa
  const clientId = window.currentUserClientId;
  if (!clientId) { _warn('_startAlertas: currentUserClientId no disponible, abortando'); return; }
  _log('startAlertas');

  if (typeof db !== 'undefined') {
    try {
      const today    = _todayStart();
      let   firstSnap = true;

      // Alertas activas (onSnapshot, ordenadas desc)
      const unsubActive = db.collection('alerts')
        .where('clientId', '==', clientId)
        .where('resolved', '==', false)
        .orderBy('createdAt', 'desc').limit(50)
        .onSnapshot({ includeMetadataChanges: false }, snap => {
          STATE.alerts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          _renderAlertas(STATE.alerts, STATE.alertsResolved);
          _updateAlertBadge(STATE.alerts.length);
          // Tocar sonido solo en alertas nuevas (no en la carga inicial)
          if (!firstSnap) {
            snap.docChanges().forEach(c => {
              if (c.type === 'added') _playAlertSound(c.doc.data().alertType, c.doc.data().severity ?? 'medium');
            });
          }
          firstSnap = false;
        }, err => {
          _warn('alerts onSnapshot error:', err);
          // Índice faltante — no reintentar en loop.
          // STATE.alertsUnsub permanece asignado para bloquear llamadas futuras a _startAlertas.
          if (err.code === 'failed-precondition') {
            _error('[NT] alerts: índice compuesto faltante. Ejecuta: firebase deploy --only firestore:indexes');
          }
        });

      // Alertas resueltas hoy
      const unsubResolved = db.collection('alerts')
        .where('clientId', '==', clientId)
        .where('resolved', '==', true)
        .where('resolvedAt', '>=', firebase.firestore.Timestamp.fromDate(today))
        .orderBy('resolvedAt', 'asc')
        .limit(20)
        .onSnapshot({ includeMetadataChanges: false }, snap => {
          STATE.alertsResolved = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          _renderAlertas(STATE.alerts, STATE.alertsResolved);
        }, err => {
          _warn('alerts resolved onSnapshot error:', err);
          if (err.code === 'failed-precondition') {
            _error('[NT] alerts(resolved): índice compuesto faltante. Ejecuta: firebase deploy --only firestore:indexes');
          }
        });

      STATE.alertsUnsub = () => { unsubActive(); unsubResolved(); };
      return;
    } catch (e) { _warn('startAlertas error:', e); }
  }

  // Sin Firebase: carga demo
  _loadAlertas();
}

function _renderAlertas(active = [], resolved = []) {
  const activeList    = document.getElementById('alertasActiveList');
  const resolvedList  = document.getElementById('alertasResolvedList');
  const count         = document.getElementById('alertasCount');
  const resolvedCount = document.getElementById('resolvedCount');

  if (count)         count.textContent         = active.length;
  if (resolvedCount) resolvedCount.textContent  = resolved.length;

  if (activeList) {
    activeList.innerHTML = '';
    if (!active.length) {
      activeList.innerHTML = '<div class="empty-state"><p class="empty-title">Sin alertas activas</p><p class="empty-text">El sistema está operando con normalidad.</p></div>';
    } else {
      const frag = document.createDocumentFragment();
      active.forEach(a => frag.appendChild(_buildAlertCard(a, false)));
      activeList.appendChild(frag);
    }
  }

  if (resolvedList) {
    resolvedList.innerHTML = '';
    const frag = document.createDocumentFragment();
    resolved.forEach(a => frag.appendChild(_buildAlertCard(a, true)));
    resolvedList.appendChild(frag);
  }
}

function _buildAlertCard(alert, resolved = false) {
  const sev  = String(alert.severity || 'low').toLowerCase();
  const card = document.createElement('article');
  card.className = `alert-card alert-card--${sev}`;
  card.setAttribute('role', 'listitem');
  card.innerHTML = `
    <div class="alert-card-main">
      <div class="alert-card-head">
        ${_severityBadge(sev)}
        <span class="alert-card-title">${_esc(alert.title || 'Alerta sin título')}</span>
      </div>
      <p class="alert-card-desc">${_esc(alert.description || '')}</p>
      <div class="alert-card-meta">
        <span>🕐 ${_fmtTs(alert.createdAt)}</span>
        ${alert.zone ? `<span>📍 ${_esc(alert.zone)}</span>` : ''}
        ${alert.acknowledged ? '<span>✅ Reconocida</span>' : ''}
      </div>
    </div>
    ${!resolved ? `
    <div class="alert-card-actions">
      <button class="btn btn--ghost btn--sm btn-ack" data-id="${_esc(alert.id)}"
              ${alert.acknowledged ? 'disabled' : ''}>Reconocer</button>
      <button class="btn btn--primary btn--sm btn-resolve" data-id="${_esc(alert.id)}">Resolver</button>
    </div>` : ''}
  `;
  card.querySelector('.btn-ack')?.addEventListener('click', () => _acknowledgeAlert(alert.id));
  card.querySelector('.btn-resolve')?.addEventListener('click', () => _resolveAlert(alert.id));
  return card;
}

async function _acknowledgeAlert(id) {
  if (!id) return;
  try {
    if (typeof db !== 'undefined') {
      await db.collection('alerts').doc(id).update({
        acknowledged: true,
        acknowledgedAt: firebase.firestore.FieldValue.serverTimestamp(),
        acknowledgedBy: STATE.user?.uid ?? null,
      });
    }
    _toast('Alerta reconocida.', 'success');
    // onSnapshot actualiza la vista automáticamente
  } catch (e) { _warn('acknowledgeAlert error:', e); }
}

async function _resolveAlert(id) {
  _confirm('¿Marcar esta alerta como resuelta?', async () => {
    try {
      if (typeof db !== 'undefined') {
        await db.collection('alerts').doc(id).update({
          resolved: true,
          resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
          resolvedBy: STATE.user?.uid ?? null,
        });
        // Cancelar en emergency_alerts (para la app móvil)
        try {
          const clientId = window.currentUserClientId;
          const emSnap = await db.collection('emergency_alerts')
            .where('clientId', '==', clientId)
            .where('status', '==', 'ACTIVE').get();
          if (!emSnap.empty) {
            const batch = db.batch();
            emSnap.docs.forEach(d => batch.update(d.ref, {status: 'CANCELLED'}));
            await batch.commit();
          }
        } catch (emErr) { _warn('emergency_alerts cancel error:', emErr); }
        // Enviar CANCEL push para silenciar alarma en celulares
        try {
          await fetch('https://sendemergencypush-6psjv5t2ka-uc.a.run.app', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type:     'CANCEL',
              message:  'Alerta resuelta. Situación bajo control.',
              severity: 'low',
            }),
          });
        } catch (pushErr) { _warn('cancel push error:', pushErr); }
      }
      _toast('Alerta resuelta.', 'success');
      // onSnapshot actualiza la vista automáticamente
    } catch (e) { _warn('resolveAlert error:', e); }
  });
}

function _updateAlertBadge(count) {
  const badge = document.getElementById('navBadgeAlertas');
  if (!badge) return;
  if (count > 0) { badge.textContent = count; badge.hidden = false; }
  else           { badge.hidden = true; }
}

function _initAlertas() {
  document.getElementById('btnRefreshAlertas')?.addEventListener('click', _loadAlertas);

  document.getElementById('newAlertBtn')?.addEventListener('click', () => {
    document.getElementById('formNuevaAlerta')?.reset();
    _openModal('modalNuevaAlerta');
  });

  document.getElementById('formNuevaAlerta')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitAlerta');
    if (btn) { btn.disabled = true; btn.textContent = 'Creando…'; }
    const severity    = document.getElementById('alertSeverity')?.value ?? 'medium';
    const alertType   = document.getElementById('alertType')?.value || 'GENERAL';
    const zone        = document.getElementById('alertZona')?.value.trim() ?? '';
    const AUTO_TITLES = {
      FIRE:'🔥 Alerta de Incendio', EVACUATION:'🚨 Evacuación Inmediata',
      FLOOD:'💧 Alerta de Inundación', TSUNAMI:'🌊 Alerta de Tsunami',
      EARTHQUAKE:'🏚️ Alerta de Terremoto', ROBBERY:'🔴 Alerta de Robo',
      FIGHT:'🥊 Alerta de Agresión', POWER_OUTAGE:'⚡ Corte de Energía',
      SYSTEM_FAILURE:'⚙️ Falla de Sistemas', GENERAL:'📢 Emergencia General',
    };
    const title = AUTO_TITLES[alertType] ?? '📢 Emergencia General';
    try {
      await FirebaseStubs.createAlert({ severity, alertType, title, zone,
        clientId: window.currentUserClientId, createdBy: STATE.user?.uid ?? null });
      _closeModal('modalNuevaAlerta');
      _toast('Alerta creada y notificación enviada.', 'success');
      // onSnapshot actualiza la vista automáticamente
    } catch (err) {
      _toast('Error al crear la alerta.', 'danger');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Crear alerta'; }
    }
  });
}


/* ============================================================
   VIEW: USUARIOS
============================================================ */
async function _loadUsuarios() {
  _log('loadUsuarios');
  const clientId = window.currentUserClientId;
  if (!clientId) { _warn('_loadUsuarios: currentUserClientId no disponible, abortando'); return; }
  const tbody = document.getElementById('usuariosTableBody');
  if (tbody) tbody.innerHTML = '<tr class="row-skeleton"><td colspan="5"><span class="skeleton"></span></td></tr>';
  try {
    const users = await FirebaseStubs.getUsers(clientId);
    STATE.users = users;
    _set('usuariosCount', users.length);
    _renderUsuarios(users);
    _populateUserSelect('qrUserId', users);
  } catch (err) {
    _warn('loadUsuarios error:', err);
    _toast('Error al cargar usuarios.', 'danger');
  }
}

function _renderUsuarios(users = []) {
  const tbody  = document.getElementById('usuariosTableBody');
  const empty  = document.getElementById('usuariosEmpty');
  if (!tbody) return;

  const q = (document.getElementById('usuariosSearch')?.value ?? '').toLowerCase();
  const f = document.querySelector('[data-ufilter].filter-btn--active')?.dataset.ufilter ?? 'todos';

  let filtered = users;
  if (q) {
    filtered = filtered.filter(u =>
      [u.name, u.email, u.block, u.unit, u.departamento]
        .filter(Boolean).join(' ').toLowerCase().includes(q));
  }
  if (f === 'activo')   filtered = filtered.filter(u => u.active !== false);
  if (f === 'inactivo') filtered = filtered.filter(u => u.active === false);

  if (!filtered.length) {
    tbody.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  filtered.forEach(u => {
    const tags = Array.isArray(u.tags) ? u.tags.length : 0;
    const unit = u.departamento || u.unit || '–';
    const blk  = u.block ? `${u.block} · ` : '';
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td class="td">
        <div class="td-main">${_esc(u.name || '–')}</div>
        <div class="td-sub">${_esc(u.email || '')}</div>
      </td>
      <td class="td col-hide-sm">${_esc(blk + unit)}</td>
      <td class="td col-hide-sm">
        <span class="badge badge--neutral">${tags} tag${tags !== 1 ? 's' : ''}</span>
      </td>
      <td class="td">${u.active !== false
        ? '<span class="badge badge--success">Activo</span>'
        : '<span class="badge badge--danger">Inactivo</span>'}</td>
      <td class="td col-actions">
        <button class="btn-icon btn-icon--ghost" title="Editar" data-edit-user="${_esc(u.id)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-icon--ghost btn-icon--danger" title="Eliminar" data-delete-user="${_esc(u.id)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      </td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);

  tbody.querySelectorAll('[data-edit-user]').forEach(btn =>
    btn.addEventListener('click', () => _openEditUser(btn.dataset.editUser)));
  tbody.querySelectorAll('[data-delete-user]').forEach(btn =>
    btn.addEventListener('click', () => _deleteUser(btn.dataset.deleteUser)));
}

function _populateUserSelect(selectId, users = []) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const placeholder = sel.options[0] || new Option('Seleccione un residente…', '');
  sel.innerHTML = '';
  sel.appendChild(placeholder);
  users.forEach(u => sel.appendChild(new Option(u.name || u.email || u.id, u.id)));
}

function _openNewUser() {
  STATE.pendingTags = [];
  document.getElementById('formUsuario')?.reset();
  document.getElementById('usuarioId').value = '';
  document.getElementById('modalUsuarioTitle').textContent = 'Nuevo usuario';
  document.getElementById('tagsDisplay').innerHTML = '';
  _openModal('modalUsuario');
}

function _openEditUser(userId) {
  const u = STATE.users.find(u => u.id === userId);
  if (!u) return;
  STATE.pendingTags = Array.isArray(u.tags) ? [...u.tags] : [];
  document.getElementById('usuarioId').value       = u.id;
  document.getElementById('usuarioNombre').value   = u.name || '';
  document.getElementById('usuarioEmail').value    = u.email || '';
  document.getElementById('usuarioTelefono').value = u.phone || '';
  document.getElementById('usuarioVehiculo').value = u.vehicle || '';
  document.getElementById('usuarioBloque').value   = u.block || '';
  document.getElementById('usuarioUnidad').value   = u.unit || u.departamento || '';
  const av = u.active !== false ? 'true' : 'false';
  const radioEl = document.querySelector(`[name="active"][value="${av}"]`);
  if (radioEl) radioEl.checked = true;
  document.getElementById('modalUsuarioTitle').textContent = 'Editar usuario';
  _renderTagsDisplay();
  _openModal('modalUsuario');
}

function _renderTagsDisplay() {
  const container = document.getElementById('tagsDisplay');
  if (!container) return;
  container.innerHTML = '';
  STATE.pendingTags.forEach(tagId => {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.innerHTML = `<span class="mono">${_esc(tagId)}</span>
      <button type="button" class="tag-chip-remove" aria-label="Quitar tag">×</button>`;
    chip.querySelector('.tag-chip-remove').addEventListener('click', () => {
      STATE.pendingTags = STATE.pendingTags.filter(t => t !== tagId);
      _renderTagsDisplay();
    });
    container.appendChild(chip);
  });
}

async function _saveUser(e) {
  e.preventDefault();
  const btn     = document.getElementById('btnSubmitUsuario');
  const id      = document.getElementById('usuarioId').value.trim();
  const name    = document.getElementById('usuarioNombre').value.trim();
  const email   = document.getElementById('usuarioEmail').value.trim();
  const phone   = document.getElementById('usuarioTelefono').value.trim();
  const vehicle = document.getElementById('usuarioVehiculo').value.trim().toUpperCase();
  const block   = document.getElementById('usuarioBloque').value.trim();
  const unit    = document.getElementById('usuarioUnidad').value.trim();
  const active  = document.querySelector('[name="active"]:checked')?.value !== 'false';

  if (!name) { _toast('El nombre es obligatorio.', 'warning'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }

  try {
    await FirebaseStubs.saveUser(id, {
      name, email, phone, vehicle, block, unit, active,
      tags: [...STATE.pendingTags], clientId: window.currentUserClientId,
    });
    _closeModal('modalUsuario');
    _toast(id ? 'Usuario actualizado.' : 'Usuario creado.', 'success');
    _loadUsuarios();
  } catch (err) {
    _warn('saveUser error:', err);
    _toast('Error al guardar el usuario.', 'danger');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  }
}

async function _deleteUser(userId) {
  _confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.', async () => {
    try {
      await FirebaseStubs.deleteUser(userId);
      _toast('Usuario eliminado.', 'success');
      _loadUsuarios();
    } catch (err) {
      _toast('Error al eliminar el usuario.', 'danger');
    }
  });
}

function _initUsuarios() {
  document.getElementById('btnNuevoUsuario')?.addEventListener('click', _openNewUser);
  document.getElementById('formUsuario')?.addEventListener('submit', _saveUser);

  document.getElementById('btnAddTag')?.addEventListener('click', () => {
    const input = document.getElementById('nuevoTagInput');
    const tagId = (input?.value ?? '').trim().toUpperCase();
    if (!tagId) return;
    if (STATE.pendingTags.includes(tagId)) { _toast('Ese tag ya está asignado.', 'warning'); return; }
    STATE.pendingTags.push(tagId);
    _renderTagsDisplay();
    if (input) input.value = '';
  });

  document.getElementById('nuevoTagInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnAddTag')?.click(); }
  });

  document.getElementById('usuariosSearch')?.addEventListener('input',
    _debounce(() => _renderUsuarios(STATE.users), 250));

  document.querySelectorAll('[data-ufilter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-ufilter]').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      _renderUsuarios(STATE.users);
    });
  });
}


/* ============================================================
   VIEW: DISPOSITIVOS
============================================================ */
async function _loadDispositivos() {
  _log('loadDispositivos');
  const clientId = window.currentUserClientId;
  if (!clientId) { _warn('_loadDispositivos: currentUserClientId no disponible, abortando'); return; }
  const grid = document.getElementById('devicesGrid');
  if (grid) grid.innerHTML = '<div class="device-card device-card--skeleton" aria-busy="true"></div>'.repeat(3);
  try {
    const [devices, history] = await Promise.all([
      FirebaseStubs.getDevices(clientId),
      FirebaseStubs.getManualOpenHistory(clientId),
    ]);
    STATE.devices = devices;
    _renderDeviceCards(devices);
    _renderManualHistory(history);
    const online = devices.filter(d => d.status === 'online').length;
    _set('devOnlineCount', online);
    _set('devTotalCount',  devices.length);
  } catch (err) {
    _warn('loadDispositivos error:', err);
    _toast('Error al cargar dispositivos.', 'danger');
  }
}

function _renderDeviceCards(devices = []) {
  const grid  = document.getElementById('devicesGrid');
  const empty = document.getElementById('devicesEmpty');
  if (!grid) return;
  if (!devices.length) {
    grid.innerHTML = '';
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  devices.forEach(d => {
    const state = d.status === 'online' ? 'online' : d.status === 'offline' ? 'offline' : 'unknown';
    const card  = document.createElement('article');
    card.className = 'device-card';
    card.innerHTML = `
      <div class="device-card-header">
        <span class="indicator-dot" data-state="${state}" aria-hidden="true"></span>
        <span class="device-card-name">${_esc(d.name || d.id)}</span>
        <span class="badge badge--${state === 'online' ? 'success' : state === 'offline' ? 'danger' : 'neutral'}" style="margin-left:auto">
          ${state === 'online' ? 'En línea' : state === 'offline' ? 'Sin conexión' : 'Desconocido'}
        </span>
      </div>
      <div class="device-card-body">
        <div class="device-card-row"><span class="device-card-label">IP</span><span class="mono">${_esc(d.ip || '–')}</span></div>
        <div class="device-card-row"><span class="device-card-label">Ubicación</span><span>${_esc(d.location || '–')}</span></div>
        <div class="device-card-row"><span class="device-card-label">Último ping</span><span>${_fmtTs(d.lastPing, true)}</span></div>
      </div>
      <div class="device-card-footer">
        <button class="btn btn--primary btn--sm btn-open-gate"
                data-device="${_esc(d.id)}" data-name="${_esc(d.name || d.id)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Abrir
        </button>
      </div>
    `;
    card.querySelector('.btn-open-gate').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      _confirm(`¿Abrir "${btn.dataset.name}" manualmente?`,
        () => _openGate(btn.dataset.device, btn.dataset.name));
    });
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

async function _openGate(deviceId, deviceName) {
  try {
    await FirebaseStubs.openGate(deviceId, {
      clientId: window.currentUserClientId,
      openedBy: STATE.user?.email ?? STATE.email ?? 'dashboard',
      deviceName,
    });
    _toast(`Apertura enviada a "${deviceName}".`, 'success');
    _loadDispositivos();
  } catch (err) {
    _warn('openGate error:', err);
    _toast('Error al enviar la apertura.', 'danger');
  }
}

function _renderManualHistory(history = []) {
  const tbody = document.getElementById('manualOpenHistory');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="td-empty">Sin aperturas manuales recientes.</td></tr>';
    return;
  }
  const frag = document.createDocumentFragment();
  history.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td">${_esc(h.deviceName || h.accessPointId || '–')}</td>
      <td class="td">${_esc(h.openedBy || h.user || '–')}</td>
      <td class="td col-time">${_fmtTs(h.timestamp)}</td>
    `;
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function _initDispositivos() {
  document.getElementById('btnPingDevices')?.addEventListener('click', _loadDispositivos);
}


/* ============================================================
   VIEW: LISTAS
============================================================ */
async function _loadListas() {
  _log('loadListas');
  const clientId = window.currentUserClientId;
  if (!clientId) { _warn('_loadListas: currentUserClientId no disponible, abortando'); return; }
  try {
    const [wl, bl] = await Promise.all([
      FirebaseStubs.getWhitelist(clientId),
      FirebaseStubs.getBlacklist(clientId),
    ]);
    STATE.whitelist = wl;
    STATE.blacklist = bl;
    _renderLista('whitelist', wl);
    _renderLista('blacklist', bl);
    _set('whitelistCount', wl.length);
    _set('blacklistCount', bl.length);
  } catch (err) {
    _warn('loadListas error:', err);
    _toast('Error al cargar listas.', 'danger');
  }
}

function _renderLista(type, items = []) {
  const bodyId = type === 'whitelist' ? 'whitelistBody' : 'blacklistBody';
  const tbody  = document.getElementById(bodyId);
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="td-empty">Sin registros en ${type}.</td></tr>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td col-mono">${_esc(item.tag_id || item.tagId || '–')}</td>
      <td class="td">${_esc(item.user_name || item.userName || item.motivo || '–')}</td>
      <td class="td col-actions">
        <button class="btn-icon btn-icon--ghost btn-icon--danger" title="Eliminar"
                data-remove-from="${type}" data-doc="${_esc(item.id)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </button>
      </td>
    `;
    tr.querySelector('[data-remove-from]').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      _confirm(`¿Eliminar este tag de ${btn.dataset.removeFrom}?`, async () => {
        try {
          await FirebaseStubs.removeFromList(btn.dataset.removeFrom, btn.dataset.doc);
          _toast('Tag eliminado.', 'success');
          _loadListas();
        } catch (err) { _toast('Error al eliminar.', 'danger'); }
      });
    });
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function _initListas() {
  document.getElementById('btnAddWhitelist')?.addEventListener('click', () => {
    document.getElementById('formAddLista')?.reset();
    _openModal('modalAddLista');
  });

  document.getElementById('formAddLista')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn    = document.getElementById('btnSubmitLista');
    const tagId  = (document.getElementById('listaTagId')?.value ?? '').trim().toUpperCase();
    const lista  = document.getElementById('listaLista')?.value ?? 'whitelist';
    const motivo = (document.getElementById('listaMotivo')?.value ?? '').trim();
    if (!tagId) { _toast('El tag ID es obligatorio.', 'warning'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Agregando…'; }
    try {
      await FirebaseStubs.addToList(lista, { tagId, motivo, clientId: window.currentUserClientId });
      _closeModal('modalAddLista');
      _toast(`Tag agregado a ${lista}.`, 'success');
      _loadListas();
    } catch (err) {
      _toast('Error al agregar el tag.', 'danger');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Agregar'; }
    }
  });
}


/* ============================================================
   VIEW: CONFIGURACIÓN
============================================================ */
const _READER_KEY = 'nt_reader_settings';
let _readerPingInterval = null;

function _initConfigView() {
  try {
    const saved = JSON.parse(localStorage.getItem(_READER_KEY) || 'null');
    if (saved?.ip) {
      document.getElementById('readerIp').value   = saved.ip;
      document.getElementById('readerPort').value = saved.port || '8080';
      _startReaderPing(saved.ip, saved.port || '8080');
    }
  } catch (_) {}
}

/* Genera el QR de instalación PWA en la vista Config */
function _initInstallQr() {
  const container  = document.getElementById('installQrCode');
  const urlLabel   = document.getElementById('installQrUrl');
  const installBtn = document.getElementById('btnInstallPwa');
  if (!container) return;

  // QR apunta al SAE público — los residentes NO necesitan autenticarse.
  // currentUserClientId puede ser null al momento del init (auth aún no completó),
  // por eso se lee dentro de generate() con retry hasta que esté disponible.
  const generate = () => {
    if (typeof QRCode === 'undefined') { setTimeout(generate, 300); return; }
    const clientId = window.currentUserClientId || '';
    if (!clientId) { setTimeout(generate, 400); return; } // esperar auth
    const url = window.location.origin + '/sae?c=' + encodeURIComponent(clientId);
    if (urlLabel) urlLabel.textContent = url;
    container.innerHTML = '';
    new QRCode(container, {
      text:         url,
      width:        120,
      height:       120,
      colorDark:    '#0f172a',
      colorLight:   '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  };
  generate();

  // Botón "Imprimir Póster QR"
  document.getElementById('btnPrintPoster')?.addEventListener('click', () => {
    const clientId = window.currentUserClientId || '';
    if (!clientId) { _toast('ID de edificio no disponible aún.', 'warning'); return; }
    window.open('/qr-poster.html?c=' + encodeURIComponent(clientId), '_blank');
  });

  // Botón "Instalar en este dispositivo" (solo aparece si el browser lo soporta)
  let _deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredInstall = e;
    if (installBtn) installBtn.hidden = false;
  });
  installBtn?.addEventListener('click', async () => {
    if (!_deferredInstall) return;
    try {
      _deferredInstall.prompt();
      const { outcome } = await _deferredInstall.userChoice;
      if (outcome === 'accepted') { installBtn.hidden = true; _toast('App instalada.', 'success'); }
    } catch (err) {
      _warn('PWA install prompt error:', err);
    } finally {
      _deferredInstall = null;
    }
  });
}

function _initConfig() {
  document.getElementById('btnSaveReader')?.addEventListener('click', () => {
    const ip   = (document.getElementById('readerIp')?.value ?? '').trim();
    const port = (document.getElementById('readerPort')?.value ?? '').trim() || '8080';
    if (!ip) { _toast('Ingresa una IP válida.', 'warning'); return; }
    localStorage.setItem(_READER_KEY, JSON.stringify({ ip, port }));
    _startReaderPing(ip, port);
    _toast('Configuración del lector guardada.', 'success');
  });

  document.getElementById('btnTestReader')?.addEventListener('click', async () => {
    const ip   = (document.getElementById('readerIp')?.value ?? '').trim();
    const port = (document.getElementById('readerPort')?.value ?? '').trim() || '8080';
    if (!ip) return;
    const btn = document.getElementById('btnTestReader');
    btn.disabled = true; btn.textContent = 'Probando…';
    const ok = await _pingReader(ip, port);
    btn.disabled = false; btn.textContent = ok ? '✅ Conectado' : '❌ Sin respuesta';
    setTimeout(() => { btn.textContent = 'Probar conexión'; }, 3000);
  });

  _initPush();
  _initQR();
}

async function _pingReader(ip, port) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 4000);
  try {
    await fetch(`http://${ip}:${port}/health`, { signal: ctrl.signal, mode: 'no-cors' });
    clearTimeout(tid);
    _setIndicator('indicatorReader', 'online');
    _setIndicator('readerStatusBadge', 'online');
    _set('readerStatusLabel', 'Conectado');
    return true;
  } catch (_) {
    clearTimeout(tid);
    _setIndicator('indicatorReader', 'offline');
    _setIndicator('readerStatusBadge', 'offline');
    _set('readerStatusLabel', 'Sin respuesta');
    return false;
  }
}

function _startReaderPing(ip, port) {
  if (_readerPingInterval) clearInterval(_readerPingInterval);
  _setIndicator('indicatorReader', 'loading');
  _pingReader(ip, port);
  _readerPingInterval = setInterval(() => _pingReader(ip, port), 30_000);
}

function _initPush() {
  const btn = document.getElementById('btnActivatePush');
  if (!btn) return;

  if (!('Notification' in window)) {
    _set('pushStatusText', '⚠️ Este navegador no soporta notificaciones.');
    btn.disabled = true;
    return;
  }
  if (Notification.permission === 'granted') {
    _set('pushStatusText', '✅ Notificaciones activadas');
    _setIndicator('indicatorPush', 'online');
    btn.disabled = true; btn.textContent = 'Activadas';
    return;
  }
  if (Notification.permission === 'denied') {
    _set('pushStatusText', '⛔ Bloqueadas en el navegador');
    _setIndicator('indicatorPush', 'offline');
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true; btn.textContent = 'Solicitando…';
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        _set('pushStatusText', '✅ Notificaciones activadas');
        _setIndicator('indicatorPush', 'online');
        btn.textContent = 'Activadas';
      } else {
        _set('pushStatusText', '⚠️ Permiso denegado');
        _setIndicator('indicatorPush', 'offline');
        btn.disabled = false; btn.textContent = 'Activar notificaciones';
      }
    } catch (_) {
      btn.disabled = false; btn.textContent = 'Activar notificaciones';
    }
  });
}

/* QR Scanner */
let _qrStream = null, _qrRaf = null;

function _initQR() {
  const startBtn = document.getElementById('btnStartQR');
  const linkBtn  = document.getElementById('btnLinkQR');
  if (!startBtn) return;

  document.getElementById('qrTagId')?.addEventListener('input', () => {
    if (linkBtn) linkBtn.disabled = !(document.getElementById('qrTagId').value.trim());
  });

  startBtn.addEventListener('click', async () => {
    if (_qrStream) { _stopQR(); startBtn.textContent = 'Activar cámara'; return; }
    if (!navigator.mediaDevices?.getUserMedia) {
      _toast('Cámara no disponible (requiere HTTPS).', 'warning'); return;
    }
    try {
      _qrStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const area = document.getElementById('qrScannerArea');
      let video  = document.getElementById('dpQrVideo');
      let canvas = document.getElementById('dpQrCanvas');
      if (!video) {
        video  = Object.assign(document.createElement('video'),
          { id: 'dpQrVideo', autoplay: true, playsInline: true });
        video.style.cssText = 'width:100%;border-radius:8px;display:block;';
        canvas = Object.assign(document.createElement('canvas'), { id: 'dpQrCanvas' });
        canvas.style.display = 'none';
        area.prepend(canvas); area.prepend(video);
      }
      video.srcObject = _qrStream;
      startBtn.textContent = 'Detener cámara';
      const ctx = canvas.getContext('2d');
      const scan = () => {
        if (!_qrStream) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          if (typeof jsQR === 'function') {
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code    = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              document.getElementById('qrTagId').value = code.data;
              if (linkBtn) linkBtn.disabled = false;
              _stopQR();
              startBtn.textContent = '✅ QR leído';
              _toast(`QR leído: ${code.data}`, 'success');
              return;
            }
          }
        }
        _qrRaf = requestAnimationFrame(scan);
      };
      _qrRaf = requestAnimationFrame(scan);
    } catch (err) { _qrStream = null; _toast('Acceso a cámara denegado.', 'warning'); }
  });

  linkBtn?.addEventListener('click', async () => {
    const tagId  = (document.getElementById('qrTagId')?.value ?? '').trim();
    const userId = document.getElementById('qrUserId')?.value ?? '';
    if (!tagId || !userId) { _toast('Selecciona un residente y escanea un QR.', 'warning'); return; }
    try {
      await FirebaseStubs.linkTagToUser(userId, tagId, STATE.clientId);
      _toast('Tag vinculado correctamente.', 'success');
      document.getElementById('qrTagId').value = '';
      if (linkBtn) linkBtn.disabled = true;
    } catch (err) { _toast('Error al vincular el tag.', 'danger'); }
  });
}

function _stopQR() {
  if (_qrRaf)    { cancelAnimationFrame(_qrRaf); _qrRaf = null; }
  if (_qrStream) { _qrStream.getTracks().forEach(t => t.stop()); _qrStream = null; }
  const v = document.getElementById('dpQrVideo');
  if (v) v.srcObject = null;
}


/* ============================================================
   FIREBASE STUBS
   Usa Firebase real si está disponible, o datos de demo.
============================================================ */
const FirebaseStubs = {

  initAuth(onLogin, onLogout) {
    _log('initAuth — Firebase real');
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged(async (user) => {
        _log('onAuthStateChanged —', user ? user.email : 'null');
        if (user) {
          try {
            const token = await user.getIdTokenResult(false);
            onLogin({
              uid:         user.uid,
              email:       user.email,
              displayName: user.displayName ?? user.email,
              role:        token.claims.role     ?? 'guard',
              clientId:    token.claims.clientId ?? null,
            });
          } catch (err) {
            _error('getIdTokenResult error:', err);
            onLogin({ uid: user.uid, email: user.email, displayName: user.email, role: 'guard', clientId: null });
          }
        } else {
          onLogout();
        }
      });
    } else {
      _warn('Firebase no disponible — modo demo');
      setTimeout(() => onLogin({
        uid: 'demo', email: 'admin@neostech.mx',
        displayName: 'Admin Demo', role: 'admin', clientId: 'demo',
      }), 800);
    }
  },

  async signIn(email, password) {
    _log('signIn', email, password.length, 'chars');
    if (!email || !email.includes('@')) throw { code: 'auth/invalid-email' };
    if (!password || password.length < 6) throw { code: 'auth/wrong-password' };
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        const r = await firebase.auth().signInWithEmailAndPassword(email, password);
        _log('signIn OK — uid:', r.user?.uid);
        return r;
      } catch (err) {
        _log('signIn FAILED:', err.code);
        throw { code: err.code, message: err.message };
      }
    }
    await _delay(600);
    return { user: { email } };
  },

  signOut() {
    _log('signOut');
    if (typeof firebase !== 'undefined' && firebase.auth) return firebase.auth().signOut();
    _showAuth();
  },

  async getKPIs(clientId) {
    if (typeof db !== 'undefined') {
      try {
        const today    = _todayStart();
        const evSnap   = await db.collection('rfid_events')
          .where('clientId', '==', clientId)
          .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(today))
          .get();
        let lecturas = 0, permitidos = 0, denegados = 0;
        evSnap.forEach(d => {
          lecturas++;
          const s = String(d.data().status ?? '').toLowerCase();
          if (s === 'allowed' || s === 'permitido') permitidos++;
          else if (s === 'denied' || s === 'denegado') denegados++;
        });
        const alSnap = await db.collection('alerts')
          .where('clientId', '==', clientId).where('resolved', '==', false).get();
        return { lecturas, permitidos, denegados, alertas: alSnap.size };
      } catch (e) { _warn('getKPIs error:', e); }
    }
    await _delay(400);
    const l = Math.floor(Math.random() * 800) + 100;
    const p = Math.floor(l * 0.85);
    return { lecturas: l, permitidos: p, denegados: l - p, alertas: Math.floor(Math.random() * 5) };
  },

  async getRecentEvents(clientId) {
    if (typeof db !== 'undefined') {
      try {
        const snap = await db.collection('rfid_events')
          .where('clientId', '==', clientId)
          .orderBy('timestamp', 'desc').limit(10).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { _warn('getRecentEvents error:', e); }
    }
    await _delay(300);
    return _demoEvents(8);
  },

  subscribeToLiveTags(clientId, callback) {
    _log('subscribeToLiveTags', clientId);
    if (typeof db !== 'undefined') {
      try {
        // Cursor: solo documentos escritos desde que el dashboard abrió.
        // Escuchamos DOS colecciones en paralelo:
        //   1. rfid_events  — escritos por el gateway vía Cloud Function "rfid-gateway"
        //   2. rfid_tags    — escritos por el gateway vía Cloud Function legacy "process_tag"
        // Normalizamos los campos al esquema del dashboard:
        //   tagId, userName, readerName, status, timestamp, clientId
        const startAt = firebase.firestore.Timestamp.now();
        const normalize = (doc) => {
          const d = doc.data();
          return {
            id:         doc.id,
            tagId:      d.tagId      || d.tag_id   || d.epc        || d.id    || '–',
            userName:   d.userName   || d.user_name || d.name       || '',
            readerName: d.readerName || d.reader_name || d.reader_sn || d.accessPointId || '',
            status:     d.status     || (d.access_granted === true  ? 'allowed'
                                      : d.access_granted === false ? 'denied' : 'unknown'),
            timestamp:  d.timestamp,
            clientId:   d.clientId   || d.client_id || clientId,
          };
        };

        const handler = snap => {
          snap.docChanges().forEach(change => {
            if (change.type === 'added' && !change.doc.metadata.hasPendingWrites) {
              callback(normalize(change.doc));
            }
          });
        };
        const errHandler = err => _warn('subscribeToLiveTags snapshot error:', err);

        // Colección principal (rfid_events)
        const unsub1 = db.collection('rfid_events')
          .where('clientId', '==', clientId)
          .where('timestamp', '>=', startAt)
          .orderBy('timestamp', 'asc')
          .onSnapshot({ includeMetadataChanges: false }, handler, errHandler);

        // Colección legacy (rfid_tags con client_id)
        const unsub2 = db.collection('rfid_tags')
          .where('client_id', '==', clientId)
          .where('timestamp', '>=', startAt)
          .orderBy('timestamp', 'asc')
          .onSnapshot({ includeMetadataChanges: false }, handler, errHandler);

        // Retorna una función que cancela ambas suscripciones
        return () => { unsub1(); unsub2(); };
      } catch (e) { _warn('subscribeToLiveTags error:', e); }
    }
    const names  = ['Ana García', 'Carlos López', 'María Pérez', 'Juan Martínez', 'Laura Jiménez'];
    const points = ['Portón principal', 'Puerta trasera', 'Acceso garaje', 'Recepción'];
    const timer  = setInterval(() => {
      callback({
        id:         Math.random().toString(36).slice(2),
        tagId:      Math.random().toString(16).slice(2, 14).toUpperCase(),
        userName:   names[Math.floor(Math.random() * names.length)],
        readerName: points[Math.floor(Math.random() * points.length)],
        status:     Math.random() > 0.15 ? 'allowed' : 'denied',
        timestamp:  { toDate: () => new Date() },
      });
    }, Math.random() * 4000 + 4000);
    return () => clearInterval(timer);
  },

  async getAccessLogs(clientId, { from, to } = {}) {
    if (typeof db !== 'undefined') {
      try {
        let q = db.collection('access_logs')
          .where('clientId', '==', clientId)
          .orderBy('timestamp', 'desc');
        if (from) q = q.where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(from));
        if (to)   q = q.where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(to));
        const snap = await q.limit(500).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { _warn('getAccessLogs error:', e); }
    }
    await _delay(400);
    return _demoEvents(40);
  },

  async getAlerts(clientId) {
    if (typeof db !== 'undefined') {
      try {
        const today = _todayStart();
        const [aSnap, rSnap] = await Promise.all([
          db.collection('alerts').where('clientId', '==', clientId)
            .where('resolved', '==', false).orderBy('createdAt', 'desc').limit(50).get(),
          db.collection('alerts').where('clientId', '==', clientId)
            .where('resolved', '==', true)
            .where('resolvedAt', '>=', firebase.firestore.Timestamp.fromDate(today))
            .orderBy('resolvedAt', 'asc')
            .limit(20).get(),
        ]);
        return {
          active:   aSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          resolved: rSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        };
      } catch (e) { _warn('getAlerts error:', e); }
    }
    await _delay(300);
    return {
      active: [
        { id: 'a1', severity: 'high',   title: 'Tag no autorizado detectado', description: 'Lector Portón principal detectó tag desconocido', zone: 'Portón principal', createdAt: { toDate: () => new Date() },               acknowledged: false, resolved: false },
        { id: 'a2', severity: 'medium', title: 'Lector sin respuesta',        description: 'El lector de recepción no responde desde hace 10 min', zone: 'Recepción',  createdAt: { toDate: () => new Date(Date.now() - 600_000) }, acknowledged: true, resolved: false },
      ],
      resolved: [],
    };
  },

  async createAlert(data) {
    if (typeof db !== 'undefined') {
      const docRef = await db.collection('alerts').add({
        ...data, resolved: false, acknowledged: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      // Sincronizar a emergency_alerts para la app móvil
      try {
        const alertType = (data.alertType || 'GENERAL').toUpperCase();
        // Cancelar duplicados activos del mismo tipo antes de insertar
        const dupSnap = await db.collection('emergency_alerts')
          .where('clientId', '==', data.clientId)
          .where('type',     '==', alertType)
          .where('status',   '==', 'ACTIVE')
          .get();
        if (!dupSnap.empty) {
          const batch = db.batch();
          dupSnap.docs.forEach(d => batch.update(d.ref, {status: 'CANCELLED'}));
          await batch.commit();
        }
        await db.collection('emergency_alerts').add({
          type:       alertType,
          message:    data.description || data.title || '',
          severity:   (data.severity  || 'MEDIUM').toUpperCase(),
          status:     'ACTIVE',
          clientId:   data.clientId,
          zone:       data.zone || null,
          title:      data.title,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          alertsRef:  docRef.id,
        });
      } catch (e) { _warn('emergency_alerts write error:', e); }
      // Enviar push notification a todos los dispositivos suscritos
      try {
        await fetch('https://sendemergencypush-6psjv5t2ka-uc.a.run.app', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:     data.alertType || 'GENERAL',
            message:  data.description || data.title,
            severity: data.severity,
            alert_id: docRef.id,
            title:    data.title,
          }),
        });
      } catch (e) { _warn('push notification error:', e); }
      return docRef;
    }
    _log('[stub] createAlert', data); await _delay(300);
  },

  async getUsers(clientId) {
    if (typeof db !== 'undefined') {
      try {
        const snap = await db.collection('users')
          .where('clientId', '==', clientId).limit(200).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { _warn('getUsers error:', e); }
    }
    await _delay(400);
    return [
      { id: 'u1', name: 'Ana García',   email: 'ana@ejemplo.com',    block: 'Bloque A', unit: 'Depto 101', active: true,  tags: ['A1B2C3D4E5F6'] },
      { id: 'u2', name: 'Carlos López', email: 'carlos@ejemplo.com', block: 'Bloque B', unit: 'Depto 204', active: true,  tags: [] },
      { id: 'u3', name: 'María Pérez',  email: 'maria@ejemplo.com',  block: 'Bloque A', unit: 'Depto 302', active: false, tags: ['AABBCCDD1122'] },
    ];
  },

  async saveUser(id, data) {
    if (typeof db !== 'undefined') {
      if (id) return db.collection('users').doc(id).update(data);
      return db.collection('users').add({
        ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    _log('[stub] saveUser', id, data); await _delay(400);
  },

  async deleteUser(id) {
    if (typeof db !== 'undefined') return db.collection('users').doc(id).delete();
    _log('[stub] deleteUser', id); await _delay(300);
  },

  async getDevices(clientId) {
    if (typeof db !== 'undefined') {
      try {
        const snap = await db.collection('access_points')
          .where('clientId', '==', clientId).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { _warn('getDevices error:', e); }
    }
    await _delay(300);
    return [
      { id: 'd1', name: 'Portón principal', location: 'Entrada vehicular', ip: '192.168.1.101', status: 'online',  lastPing: { toDate: () => new Date() } },
      { id: 'd2', name: 'Puerta peatonal',  location: 'Entrada peatonal',  ip: '192.168.1.102', status: 'online',  lastPing: { toDate: () => new Date() } },
      { id: 'd3', name: 'Acceso garaje',    location: 'Subsuelo',          ip: '192.168.1.103', status: 'offline', lastPing: { toDate: () => new Date(Date.now() - 900_000) } },
    ];
  },

  async openGate(deviceId, { clientId, openedBy, deviceName }) {
    if (typeof db !== 'undefined') {
      const batch  = db.batch();
      const evRef  = db.collection('rfid_events').doc();
      batch.set(evRef, {
        clientId, event_type: 'manual_open', accessPointId: deviceId,
        deviceName, openedBy, source: 'dashboard', status: 'manual',
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      const cmdRef = db.collection('gate_commands').doc();
      batch.set(cmdRef, {
        clientId, deviceId, deviceName, command: 'OPEN',
        openedBy, executed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return batch.commit();
    }
    _log('[stub] openGate', deviceId, { clientId, openedBy, deviceName }); await _delay(300);
  },

  async getManualOpenHistory(clientId) {
    if (typeof db !== 'undefined') {
      try {
        const snap = await db.collection('rfid_events')
          .where('clientId', '==', clientId)
          .where('event_type', '==', 'manual_open')
          .orderBy('timestamp', 'desc').limit(10).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { _warn('getManualOpenHistory error:', e); }
    }
    await _delay(200); return [];
  },

  async getWhitelist(clientId) {
    if (typeof db !== 'undefined') {
      try {
        const snap = await db.collection('whitelist')
          .where('clientId', '==', clientId).limit(200).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { _warn('getWhitelist error:', e); }
    }
    await _delay(200);
    return [{ id: 'w1', tag_id: 'A1B2C3D4E5F6', user_name: 'Ana García' }];
  },

  async getBlacklist(clientId) {
    if (typeof db !== 'undefined') {
      try {
        const snap = await db.collection('blacklist')
          .where('clientId', '==', clientId).limit(200).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { _warn('getBlacklist error:', e); }
    }
    await _delay(200); return [];
  },

  async addToList(lista, { tagId, motivo, clientId }) {
    if (typeof db !== 'undefined') {
      return db.collection(lista).add({
        tag_id: tagId, user_name: motivo || '', clientId,
        added_at: firebase.firestore.FieldValue.serverTimestamp(),
        added_by: STATE.user?.email ?? null,
      });
    }
    _log('[stub] addToList', lista, { tagId, motivo }); await _delay(300);
  },

  async removeFromList(lista, docId) {
    if (typeof db !== 'undefined') return db.collection(lista).doc(docId).delete();
    _log('[stub] removeFromList', lista, docId); await _delay(200);
  },

  async linkTagToUser(userId, tagId, clientId) {
    if (typeof db !== 'undefined') {
      return db.collection('users').doc(userId).update({
        tags: firebase.firestore.FieldValue.arrayUnion(tagId),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    _log('[stub] linkTagToUser', userId, tagId); await _delay(300);
  },
};


/* ============================================================
   DATOS DE DEMOSTRACIÓN
============================================================ */
function _demoEvents(n = 10) {
  const names  = ['Ana García', 'Carlos López', 'María Pérez', 'Juan Martínez', 'Laura Jiménez', 'Pedro Soto'];
  const points = ['Portón principal', 'Puerta trasera', 'Acceso garaje', 'Recepción', 'Escalera B'];
  return Array.from({ length: n }, (_, i) => ({
    id:         `demo-${i}`,
    tagId:      Math.random().toString(16).slice(2, 14).toUpperCase(),
    userName:   names[i % names.length],
    user:       names[i % names.length],
    readerName: points[i % points.length],
    reader:     points[i % points.length],
    status:     Math.random() > 0.15 ? 'allowed' : 'denied',
    timestamp:  { toDate: () => new Date(Date.now() - i * 180_000) },
  }));
}


/* ============================================================
   PUNTO DE ENTRADA
============================================================ */
let _initialized = false;

function init() {
  if (_initialized) return;
  _initialized = true;
  _log('init v3');

  _initTopbar();
  _initSidebar();
  _initModals();
  _initConfirm();
  _initAuth();
  _initLiveTags();
  _initBitacora();
  _initAlertas();
  _initUsuarios();
  _initDispositivos();
  _initListas();
  _initConfig();
  _initInstallQr();

  document.getElementById('btnRefreshResumen')?.addEventListener('click', _loadResumen);

  FirebaseStubs.initAuth(
    (userData) => {
      STATE.clientId = userData.clientId ?? null;
      _showApp(userData);
      _initRouter();
      _loadViewData('resumen');
      _setIndicator('indicatorDB', 'loading');
    },
    () => {
      // Guard: /sae es ruta pública — no redirigir a login desde esa ruta
      if (!location.pathname.startsWith('/sae')) {
        _showAuth();
      }
    }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Registro del Service Worker para PWA + push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => _log('SW registrado:', reg.scope))
      .catch(err => _warn('SW no registrado:', err));
  });
}
