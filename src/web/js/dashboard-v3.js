/**
 * NeosTech RFID System Pro – Dashboard v3
 * UI-only: router, sidebar, toggles, estado visual.
 * Firebase stubs incluidos pero no conectados.
 *
 * Convenciones:
 *  - Funciones privadas con prefijo _
 *  - Estado centralizado en STATE
 *  - Firebase stubs en sección FIREBASE STUBS
 *  - Sin console.log en producción (usa _log)
 */

'use strict';

/* ============================================================
   DEBUG LOGGER
   Cambiar DEBUG = true para ver logs en desarrollo.
============================================================ */
const DEBUG = true; // ← desactivar en producción (cambiar a false)
function _log(...args) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[NT]', ...args);
  }
}
function _warn(...args) {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.warn('[NT]', ...args);
  }
}


/* ============================================================
   ESTADO GLOBAL
============================================================ */
const STATE = {
  // Autenticación
  user:       null,    // objeto Firebase User (null = no autenticado)
  clientId:   null,    // JWT claim: clientId (multitenancy)
  userRole:   null,    // 'admin' | 'guard' | 'resident'
  tenantName: null,    // nombre del cliente

  // Navegación
  currentView: 'resumen',

  // Tags en vivo
  liveRows:    [],
  liveFilter:  'todos',     // 'todos' | 'permitido' | 'denegado'
  liveQuery:   '',
  livePaused:  false,
  liveUnsub:   null,        // función unsubscribe de Firestore

  // KPIs
  kpi: {
    lecturas:   null,
    permitidos: null,
    denegados:  null,
    alertas:    null,
  },

  // Alertas
  alerts:         [],
  alertsResolved: [],

  // Usuarios / dispositivos
  users:   [],
  devices: [],

  // Listeners activos (para cleanup)
  _unsubs: [],
};


/* ============================================================
   VIRTUAL SCROLLER
   Renderiza únicamente las filas visibles + buffer.
============================================================ */
class VirtualList {
  #container;
  #rows = [];
  #rowH;
  #bufferSize;
  #phantom;
  #inner;
  #rafId = null;

  constructor(containerId, rowHeight = 46, bufferSize = 8) {
    this.#container  = document.getElementById(containerId);
    this.#rowH       = rowHeight;
    this.#bufferSize = bufferSize;

    if (!this.#container) return;

    this.#phantom = document.createElement('div');
    this.#phantom.style.cssText = 'position:relative;pointer-events:none;';

    this.#inner = document.createElement('div');
    this.#inner.style.cssText = 'position:absolute;top:0;left:0;width:100%;';

    this.#phantom.appendChild(this.#inner);
    this.#container.appendChild(this.#phantom);
    this.#container.addEventListener('scroll', () => this._scheduleRender(), { passive: true });
  }

  setRows(rows) {
    this.#rows = rows;
    this.#phantom.style.height = (rows.length * this.#rowH) + 'px';
    this._scheduleRender();
  }

  appendRows(newRows) {
    this.#rows = this.#rows.concat(newRows);
    this.#phantom.style.height = (this.#rows.length * this.#rowH) + 'px';
    this._scheduleRender();
  }

  get length() { return this.#rows.length; }

  clear() { this.setRows([]); }

  _scheduleRender() {
    if (this.#rafId) return;
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = null;
      this._render();
    });
  }

  _render() {
    if (!this.#container) return;
    const scrollTop   = this.#container.scrollTop;
    const viewH       = this.#container.clientHeight;
    const totalRows   = this.#rows.length;
    const firstVis    = Math.floor(scrollTop / this.#rowH);
    const lastVis     = Math.min(totalRows - 1, Math.ceil((scrollTop + viewH) / this.#rowH));
    const renderStart = Math.max(0, firstVis - this.#bufferSize);
    const renderEnd   = Math.min(totalRows - 1, lastVis + this.#bufferSize);

    const frag = document.createDocumentFragment();
    for (let i = renderStart; i <= renderEnd; i++) {
      const el = this._buildRow(this.#rows[i], i);
      el.style.position = 'absolute';
      el.style.top      = (i * this.#rowH) + 'px';
      el.style.left     = '0';
      el.style.right    = '0';
      frag.appendChild(el);
    }

    this.#inner.innerHTML = '';
    this.#inner.appendChild(frag);
  }

  /** Sobrescribir para personalizar el HTML de la fila */
  _buildRow(row, index) {
    const el = document.createElement('div');
    el.className = 'vrow';
    el.setAttribute('role', 'article');
    el.innerHTML = `
      <span class="vrow-uid">${_esc(row.uid ?? '–')}</span>
      <span class="vrow-text">${_esc(row.usuario ?? '–')}</span>
      <span class="vrow-text">${_esc(row.punto ?? '–')}</span>
      <span class="vrow-time">${_fmtTime(row.timestamp)}</span>
      <span>${_statusBadge(row.estado)}</span>
    `;
    return el;
  }
}


/* ============================================================
   UTILIDADES
============================================================ */
function _esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _fmtTime(ts) {
  if (!ts) return '–';
  let d;
  if (ts.toDate) {
    d = ts.toDate(); // Firestore Timestamp
  } else if (typeof ts === 'number') {
    d = new Date(ts);
  } else {
    d = new Date(ts);
  }
  if (isNaN(d)) return '–';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function _fmtDate(d) {
  return d.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function _fmtNum(n) {
  if (n == null) return '–';
  return Number(n).toLocaleString('es-MX');
}

function _statusBadge(estado) {
  const map = {
    permitido:  ['badge-status--permitido',   'Permitido'],
    denegado:   ['badge-status--denegado',    'Denegado'],
    desconocido:['badge-status--desconocido', 'Desconocido'],
  };
  const [cls, label] = map[estado] ?? map.desconocido;
  return `<span class="badge-status ${cls}">${label}</span>`;
}

function _alertPill(tipo) {
  const labels = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };
  return `<span class="alert-pill alert-pill--${tipo}">${labels[tipo] ?? tipo}</span>`;
}

function _debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _show(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

function _hide(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function _todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}


/* ============================================================
   TOAST SYSTEM
============================================================ */
const Toast = (() => {
  const DURATION = 4000;

  function show(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.textContent = msg;

    container.prepend(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 300ms';
      setTimeout(() => el.remove(), 300);
    }, DURATION);
  }

  return {
    success: (msg) => show(msg, 'success'),
    error:   (msg) => show(msg, 'error'),
    warning: (msg) => show(msg, 'warning'),
    info:    (msg) => show(msg, 'info'),
  };
})();


/* ============================================================
   ROUTER (hash-based SPA)
============================================================ */
const VIEWS = ['resumen', 'tags', 'usuarios', 'alertas'];

const VIEW_TITLES = {
  resumen:  'Resumen',
  tags:     'Tags en vivo',
  usuarios: 'Usuarios',
  alertas:  'Alertas',
};

function _initRouter() {
  window.addEventListener('hashchange', _onHashChange);
  _onHashChange();
}

function _onHashChange() {
  const hash = window.location.hash.replace('#', '') || 'resumen';
  const view = VIEWS.includes(hash) ? hash : 'resumen';
  _navigateTo(view, false);
}

function _navigateTo(view, pushHash = true) {
  if (STATE.currentView === view && !pushHash) {
    _activateView(view);
    return;
  }
  STATE.currentView = view;
  if (pushHash) {
    history.pushState(null, '', `#${view}`);
  }
  _activateView(view);
  _loadViewData(view);
}

function _activateView(view) {
  // Views
  document.querySelectorAll('.view').forEach(el => {
    const isActive = el.dataset.view === view;
    el.classList.toggle('view--active', isActive);
    el.hidden = !isActive;
  });

  // Nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    const isActive = link.dataset.view === view;
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Topbar title
  _set('topbarTitle', VIEW_TITLES[view] ?? view);

  // Mobile: close sidebar
  const shell = document.getElementById('appShell');
  if (shell) shell.removeAttribute('data-mobile-open');
}

function _loadViewData(view) {
  _log('loadViewData', view);
  switch (view) {
    case 'resumen':  _loadResumen();  break;
    case 'tags':     _startLiveTags(); break;
    case 'usuarios': _loadUsuarios(); break;
    case 'alertas':  _loadAlertas();  break;
  }
}


/* ============================================================
   SIDEBAR
============================================================ */
function _initSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const shell   = document.getElementById('appShell');
  const backdrop= document.getElementById('sidebarBackdrop');
  const mobileBtn = document.getElementById('mobileMenuBtn');

  if (!shell) return;

  // Restore collapse state from localStorage
  const collapsed = localStorage.getItem('nt_sidebar_collapsed') === 'true';
  shell.dataset.collapsed = collapsed;
  if (toggle) toggle.setAttribute('aria-expanded', String(!collapsed));

  // Desktop collapse toggle
  if (toggle) {
    toggle.addEventListener('click', () => {
      const isCollapsed = shell.dataset.collapsed === 'true';
      shell.dataset.collapsed = String(!isCollapsed);
      toggle.setAttribute('aria-expanded', String(isCollapsed));
      toggle.setAttribute('aria-label', isCollapsed ? 'Colapsar barra lateral' : 'Expandir barra lateral');
      localStorage.setItem('nt_sidebar_collapsed', String(!isCollapsed));
    });
  }

  // Mobile open
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      const isOpen = shell.dataset.mobileOpen === 'true';
      shell.dataset.mobileOpen = String(!isOpen);
      mobileBtn.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  // Backdrop closes sidebar on mobile
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      shell.removeAttribute('data-mobile-open');
      if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
    });
  }

  // Nav link clicks
  document.querySelectorAll('.nav-link[data-view]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      _navigateTo(view);
    });
  });
}


/* ============================================================
   TOPBAR
============================================================ */
function _initTopbar() {
  // Date
  const dateEl = document.getElementById('topbarDate');
  if (dateEl) {
    dateEl.textContent = _fmtDate(new Date());
  }
}


/* ============================================================
   MODALES
============================================================ */
function _initModals() {
  // Cerrar con botón [data-modal-close]
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-close]');
    if (btn) {
      const id = btn.dataset.modalClose;
      _closeModal(id);
    }
  });

  // Cerrar al hacer clic en el backdrop (fuera del .modal)
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        _closeModal(backdrop.id);
      }
    });
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(m => {
        _closeModal(m.id);
      });
    }
  });

  // Botón nueva alerta
  const newAlertBtn = document.getElementById('newAlertBtn');
  if (newAlertBtn) {
    newAlertBtn.addEventListener('click', () => _openModal('modalNuevaAlerta'));
  }

  // Submit nueva alerta
  const formNuevaAlerta = document.getElementById('formNuevaAlerta');
  if (formNuevaAlerta) {
    formNuevaAlerta.addEventListener('submit', async (e) => {
      e.preventDefault();
      await _onCreateAlert(new FormData(formNuevaAlerta));
      _closeModal('modalNuevaAlerta');
      formNuevaAlerta.reset();
    });
  }
}

function _openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  // Focus trap: focus primer input
  const first = el.querySelector('input, select, textarea, button:not(.modal-close)');
  if (first) first.focus();
}

function _closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}


/* ============================================================
   AUTH UI
============================================================ */
function _initAuth() {
  const form    = document.getElementById('authForm');
  const errorEl = document.getElementById('authError');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.hidden = true;

    const email    = form.authEmail.value.trim();
    const password = form.authPassword.value;
    const btn      = document.getElementById('authSubmit');

    if (btn) { btn.disabled = true; btn.textContent = 'Verificando…'; }

    try {
      const result = await FirebaseStubs.signIn(email, password);
      // Con Firebase real, onAuthStateChanged se dispara automáticamente
      // y llama a _showApp(). Si usamos el stub, necesitamos llamarlo manualmente.
      if (result && result.user && typeof firebase === 'undefined') {
        _showApp({ ...result.user, role: 'admin', clientId: null });
        _initRouter();
      }
    } catch (err) {
      _log('auth error', err);
      if (errorEl) {
        errorEl.textContent = _authErrorMsg(err.code ?? err.message);
        errorEl.hidden = false;
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
    }
  });

  // Sign-out
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await FirebaseStubs.signOut();
    });
  }
}

function _authErrorMsg(code) {
  const map = {
    'auth/user-not-found':         'No existe ninguna cuenta con ese correo.',
    'auth/wrong-password':         'Contraseña incorrecta. Verifica e intenta de nuevo.',
    'auth/invalid-credential':     'Correo o contraseña incorrectos.',
    'auth/invalid-email':          'El correo no tiene un formato válido.',
    'auth/too-many-requests':      'Demasiados intentos fallidos. Espera unos minutos.',
    'auth/network-request-failed': 'Error de conexión. Verifica tu red.',
    'auth/user-disabled':          'Esta cuenta ha sido deshabilitada.',
  };
  return map[code] ?? `Error al iniciar sesión (${code}). Intenta de nuevo.`;
}

function _showApp(userData) {
  const loadingScreen = document.getElementById('loadingScreen');
  const authScreen    = document.getElementById('authScreen');
  const appShell      = document.getElementById('appShell');
  if (loadingScreen) loadingScreen.hidden = true;
  if (authScreen)    authScreen.hidden = true;
  if (appShell)      appShell.hidden = false;

  // Update user UI
  const name   = userData?.displayName ?? userData?.email ?? 'Usuario';
  const role   = userData?.role ?? 'guard';
  const initials = name.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  _set('userName', name);
  _set('userRole', _roleLabel(role));
  _set('topbarUserName', name);
  _set('userAvatar', initials);

  STATE.user     = userData;
  STATE.userRole = role;
}

function _showAuth() {
  const loadingScreen = document.getElementById('loadingScreen');
  const authScreen    = document.getElementById('authScreen');
  const appShell      = document.getElementById('appShell');
  if (loadingScreen) loadingScreen.hidden = true;
  if (authScreen)    authScreen.hidden = false;
  if (appShell)      appShell.hidden = true;
  _cleanupListeners();
}

function _roleLabel(role) {
  return { admin: 'Administrador', guard: 'Guardia', resident: 'Residente' }[role] ?? role;
}

function _cleanupListeners() {
  STATE._unsubs.forEach(fn => { try { fn(); } catch (_) { /* noop */ } });
  STATE._unsubs = [];
  if (STATE.liveUnsub) { try { STATE.liveUnsub(); } catch (_) { /* noop */ } }
  STATE.liveUnsub = null;
}


/* ============================================================
   INDICADORES DE ESTADO
============================================================ */
function _setIndicator(id, state) {
  const el = document.getElementById(id);
  if (el) el.dataset.state = state; // 'online' | 'offline' | 'loading' | 'unknown'
}


/* ============================================================
   VIEW: RESUMEN
============================================================ */
let _virtualListTags = null;

async function _loadResumen() {
  _log('loadResumen');

  // Mostrar skeletons en KPIs
  ['kpiLecturas', 'kpiPermitidos', 'kpiDenegados', 'kpiAlertas'].forEach(id => {
    _set(id, '–');
  });

  try {
    const data = await FirebaseStubs.getKPIs(STATE.clientId);
    _set('kpiLecturas',   _fmtNum(data.lecturas));
    _set('kpiPermitidos', _fmtNum(data.permitidos));
    _set('kpiDenegados',  _fmtNum(data.denegados));
    _set('kpiAlertas',    _fmtNum(data.alertas));
    _setIndicator('indicatorDB', 'online');
  } catch (err) {
    _warn('getKPIs error', err);
    _setIndicator('indicatorDB', 'offline');
    Toast.error('No se pudieron cargar las métricas.');
  }

  // Eventos recientes
  try {
    const eventos = await FirebaseStubs.getRecentEvents(STATE.clientId);
    _renderResumenEvents(eventos);
  } catch (err) {
    _warn('getRecentEvents error', err);
  }

  // Dispositivos
  try {
    const devices = await FirebaseStubs.getDevices(STATE.clientId);
    _renderDeviceStatus(devices);
  } catch (err) {
    _warn('getDevices error', err);
  }
}

function _renderResumenEvents(eventos) {
  const tbody = document.getElementById('resumenEventsBody');
  if (!tbody) return;

  if (!eventos || eventos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="td-empty">Sin eventos recientes</td></tr>`;
    return;
  }

  tbody.innerHTML = eventos.map(ev => `
    <tr>
      <td class="col-time">${_fmtTime(ev.timestamp)}</td>
      <td class="col-uid">${_esc(ev.uid)}</td>
      <td class="col-point col-hide-sm">${_esc(ev.punto ?? '–')}</td>
      <td class="col-status">${_statusBadge(ev.estado)}</td>
    </tr>
  `).join('');
}

function _renderDeviceStatus(devices) {
  const container = document.getElementById('deviceStatusList');
  if (!container) return;

  if (!devices || devices.length === 0) {
    container.innerHTML = `<p class="text-muted">Sin dispositivos registrados.</p>`;
    return;
  }

  container.innerHTML = devices.map(d => `
    <div class="device-row">
      <span class="device-dot device-dot--${d.estado ?? 'unknown'}"></span>
      <span class="device-name">${_esc(d.nombre ?? d.id)}</span>
      <span class="device-ip">${_esc(d.ip ?? '')}</span>
    </div>
  `).join('');
}


/* ============================================================
   VIEW: TAGS EN VIVO
============================================================ */
function _startLiveTags() {
  _log('startLiveTags');

  if (!_virtualListTags) {
    _virtualListTags = new VirtualList('tagsVScroll', 46, 8);
  }

  // Detener listener anterior
  if (STATE.liveUnsub) {
    STATE.liveUnsub();
    STATE.liveUnsub = null;
  }

  if (STATE.livePaused) return;

  const emptyEl = document.getElementById('tagsEmpty');
  const scroller = document.getElementById('tagsVScroll');
  if (scroller) scroller.setAttribute('aria-busy', 'true');

  try {
    STATE.liveUnsub = FirebaseStubs.subscribeToLiveTags(
      STATE.clientId,
      (newRows) => {
        if (STATE.livePaused) return;

        STATE.liveRows = [newRows, ...STATE.liveRows].slice(0, 500);
        const filtered = _filterLiveRows(STATE.liveRows);

        _virtualListTags.setRows(filtered);

        if (emptyEl) emptyEl.hidden = filtered.length > 0;
        if (scroller) scroller.setAttribute('aria-busy', 'false');

        // Badge nav
        const badge = document.getElementById('navBadgeTags');
        if (badge) badge.textContent = filtered.length > 99 ? '99+' : String(filtered.length);
      }
    );
    STATE._unsubs.push(() => STATE.liveUnsub?.());
  } catch (err) {
    _warn('subscribeToLiveTags error', err);
    Toast.error('Error al conectar el stream en vivo.');
    if (scroller) scroller.setAttribute('aria-busy', 'false');
  }
}

function _filterLiveRows(rows) {
  let result = rows;

  if (STATE.liveFilter !== 'todos') {
    result = result.filter(r => r.estado === STATE.liveFilter);
  }

  if (STATE.liveQuery) {
    const q = STATE.liveQuery.toLowerCase();
    result = result.filter(r =>
      (r.uid ?? '').toLowerCase().includes(q) ||
      (r.usuario ?? '').toLowerCase().includes(q) ||
      (r.punto ?? '').toLowerCase().includes(q)
    );
  }

  return result;
}

function _initTagsControls() {
  // Filter buttons
  const filterGroup = document.querySelector('#viewTags .filter-group');
  if (filterGroup) {
    filterGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterGroup.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      STATE.liveFilter = btn.dataset.filter ?? 'todos';
      if (_virtualListTags) _virtualListTags.setRows(_filterLiveRows(STATE.liveRows));
    });
  }

  // Search
  const searchInput = document.getElementById('tagsSearch');
  if (searchInput) {
    searchInput.addEventListener('input', _debounce(() => {
      STATE.liveQuery = searchInput.value.trim();
      if (_virtualListTags) _virtualListTags.setRows(_filterLiveRows(STATE.liveRows));
    }, 250));
  }

  // Pause
  const pauseBtn = document.getElementById('tagsPauseBtn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      STATE.livePaused = !STATE.livePaused;
      pauseBtn.setAttribute('aria-pressed', String(STATE.livePaused));
      pauseBtn.textContent = STATE.livePaused ? '▶ Reanudar' : '⏸ Pausar';

      if (!STATE.livePaused) {
        _startLiveTags();
        Toast.info('Stream reanudado.');
      } else {
        if (STATE.liveUnsub) {
          STATE.liveUnsub();
          STATE.liveUnsub = null;
        }
        Toast.info('Stream pausado.');
      }
    });
  }
}


/* ============================================================
   VIEW: USUARIOS
============================================================ */
async function _loadUsuarios() {
  _log('loadUsuarios');
  try {
    const users = await FirebaseStubs.getUsers(STATE.clientId);
    STATE.users = users;
    _renderUsuarios(users);
  } catch (err) {
    _warn('getUsers error', err);
    Toast.error('No se pudo cargar la lista de usuarios.');
  }
}

function _renderUsuarios(users) {
  const tbody = document.getElementById('usuariosTableBody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="td-empty">Sin usuarios registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="user-avatar" style="width:28px;height:28px;font-size:10px;" aria-hidden="true">
            ${_esc((u.nombre ?? u.email ?? 'U').slice(0, 2).toUpperCase())}
          </div>
          <span>${_esc(u.nombre ?? '–')}</span>
        </div>
      </td>
      <td class="col-hide-sm">${_esc(u.email ?? '–')}</td>
      <td><span class="badge-role badge-role--${u.rol ?? 'guard'}">${_roleLabel(u.rol)}</span></td>
      <td class="col-hide-sm">${_fmtNum(u.tagsCount ?? 0)}</td>
      <td>
        <span class="badge-status badge-status--${u.activo ? 'permitido' : 'denegado'}">
          ${u.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>
    </tr>
  `).join('');
}

function _initUsuariosSearch() {
  const input = document.getElementById('usuariosSearch');
  if (!input) return;
  input.addEventListener('input', _debounce(() => {
    const q = input.value.toLowerCase();
    const filtered = STATE.users.filter(u =>
      (u.nombre ?? '').toLowerCase().includes(q) ||
      (u.email  ?? '').toLowerCase().includes(q)
    );
    _renderUsuarios(filtered);
  }, 250));
}


/* ============================================================
   VIEW: ALERTAS
============================================================ */
async function _loadAlertas() {
  _log('loadAlertas');
  try {
    const { activas, resueltas } = await FirebaseStubs.getAlerts(STATE.clientId);
    STATE.alerts = activas;
    STATE.alertsResolved = resueltas;
    _renderAlertas(activas, resueltas);
  } catch (err) {
    _warn('getAlerts error', err);
    Toast.error('No se pudieron cargar las alertas.');
  }
}

function _renderAlertas(activas, resueltas) {
  const activeList   = document.getElementById('alertasActiveList');
  const resolvedList = document.getElementById('alertasResolvedList');

  _set('alertasCount', `${activas.length} alerta${activas.length !== 1 ? 's' : ''} activa${activas.length !== 1 ? 's' : ''}`);
  _set('resolvedCount', String(resueltas.length));

  // Actualizar badge nav
  const badge = document.getElementById('navBadgeAlertas');
  if (badge) {
    badge.hidden = activas.length === 0;
    badge.textContent = activas.length > 99 ? '99+' : String(activas.length);
  }

  if (activeList) {
    if (activas.length === 0) {
      activeList.innerHTML = `
        <div class="empty-state" style="padding:32px 16px;">
          <svg class="empty-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <p class="empty-title">Sin alertas activas</p>
          <p class="empty-text">El sistema opera con normalidad.</p>
        </div>`;
    } else {
      activeList.innerHTML = activas.map(a => _alertCardHTML(a, false)).join('');
    }
  }

  if (resolvedList) {
    resolvedList.innerHTML = resueltas.length
      ? resueltas.map(a => _alertCardHTML(a, true)).join('')
      : '<p style="padding:14px 16px;color:var(--color-text-3);font-size:.8125rem;">Sin alertas resueltas hoy.</p>';
  }
}

function _alertCardHTML(alert, resolved) {
  return `
    <div class="alert-card alert-card--${alert.tipo}${resolved ? ' alert-card--resolved' : ''}">
      ${_alertPill(alert.tipo)}
      <div class="alert-body">
        <p class="alert-msg">${_esc(alert.mensaje)}</p>
        <div class="alert-meta">
          <span>${_fmtTime(alert.createdAt)}</span>
          ${alert.punto ? `<span>📍 ${_esc(alert.punto)}</span>` : ''}
        </div>
      </div>
      ${!resolved ? `
        <div class="alert-actions">
          <button class="btn btn--ghost btn--sm" data-alert-ack="${_esc(alert.id)}" type="button">
            Resolver
          </button>
        </div>
      ` : ''}
    </div>
  `;
}

function _initAlertaActions() {
  // Delegación: resolver alerta
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-alert-ack]');
    if (!btn) return;
    const alertId = btn.dataset.alertAck;
    btn.disabled = true;
    btn.textContent = 'Resolviendo…';
    try {
      await FirebaseStubs.acknowledgeAlert(STATE.clientId, alertId);
      Toast.success('Alerta resuelta.');
      await _loadAlertas();
    } catch (err) {
      _warn('acknowledgeAlert error', err);
      Toast.error('No se pudo resolver la alerta.');
      btn.disabled = false;
      btn.textContent = 'Resolver';
    }
  });
}

async function _onCreateAlert(formData) {
  try {
    await FirebaseStubs.createAlert(STATE.clientId, {
      tipo:    formData.get('tipo'),
      mensaje: formData.get('mensaje'),
      punto:   formData.get('punto'),
    });
    Toast.success('Alerta creada correctamente.');
    if (STATE.currentView === 'alertas') await _loadAlertas();
  } catch (err) {
    _warn('createAlert error', err);
    Toast.error('Error al crear la alerta.');
  }
}


/* ============================================================
   REFRESH BUTTONS
============================================================ */
function _initRefreshButtons() {
  const btnRefresh = document.getElementById('btnRefreshResumen');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      if (STATE.currentView === 'resumen') _loadResumen();
    });
  }
}


/* ============================================================
   FIREBASE STUBS
   Reemplazar cada función con la implementación real
   de Firebase cuando sea el momento de integrarlo.
============================================================ */
const FirebaseStubs = {

  /** Inicializar Firebase Auth listener — REAL */
  initAuth(onLogin, onLogout) {
    _log('initAuth — Firebase real');

    // Usar Firebase Auth real si está disponible
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
          try {
            const token = await user.getIdTokenResult(/* forceRefresh= */ false);
            onLogin({
              uid:         user.uid,
              email:       user.email,
              displayName: user.displayName ?? user.email,
              role:        token.claims.role     ?? 'guard',
              clientId:    token.claims.clientId ?? null,
            });
          } catch (err) {
            _warn('getIdTokenResult error', err);
            // Continuar con datos mínimos si falla el token
            onLogin({
              uid:         user.uid,
              email:       user.email,
              displayName: user.displayName ?? user.email,
              role:        'guard',
              clientId:    null,
            });
          }
        } else {
          onLogout();
        }
      });
    } else {
      // Fallback: modo demo si Firebase no carga (útil para abrir el HTML directo)
      _warn('Firebase no disponible — activando modo demo');
      setTimeout(() => onLogin({
        uid:         'demo-uid-001',
        email:       'admin@neostech.mx',
        displayName: 'Administrador Demo',
        role:        'admin',
        clientId:    'demo-client',
      }), 600);
    }
  },

  async signIn(email, password) {
    _log('signIn', email, password.length, 'chars');

    // Validación básica antes de llamar a Firebase (evita errores Uncaught)
    if (!email || !email.includes('@')) {
      throw { code: 'auth/invalid-email', message: 'El correo no tiene un formato válido.' };
    }
    if (!password || password.length < 6) {
      throw { code: 'auth/wrong-password', message: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        return await firebase.auth().signInWithEmailAndPassword(email, password);
      } catch (err) {
        // Re-lanzar como objeto plano para que el catch externo siempre lo capture
        throw { code: err.code, message: err.message };
      }
    }

    // Fallback demo
    await _delay(800);
    return { user: { email, displayName: email.split('@')[0] } };
  },

  async signOut() {
    _log('signOut');

    if (typeof firebase !== 'undefined' && firebase.auth) {
      return firebase.auth().signOut();
    }

    // Fallback demo
    await _delay(300);
    _showAuth();
  },

  async getKPIs(clientId) {
    _log('[stub] getKPIs', clientId);
    // En producción:
    // const snap = await db.collection('kpis').doc(clientId).get();
    // return snap.data();
    await _delay(600);
    return {
      lecturas:   Math.floor(Math.random() * 800) + 100,
      permitidos: Math.floor(Math.random() * 700) + 80,
      denegados:  Math.floor(Math.random() * 50),
      alertas:    Math.floor(Math.random() * 5),
    };
  },

  async getRecentEvents(clientId) {
    _log('[stub] getRecentEvents', clientId);
    // En producción:
    // const snap = await db.collection('rfid_events')
    //   .where('clientId', '==', clientId)
    //   .orderBy('timestamp', 'desc').limit(10).get();
    // return snap.docs.map(d => d.data());
    await _delay(700);
    return _demoEvents(8);
  },

  subscribeToLiveTags(clientId, callback) {
    _log('[stub] subscribeToLiveTags', clientId);
    // En producción:
    // const unsub = db.collection('rfid_events')
    //   .where('clientId', '==', clientId)
    //   .orderBy('timestamp', 'desc').limit(1)
    //   .onSnapshot(snap => {
    //     snap.docChanges().forEach(change => {
    //       if (change.type === 'added') callback(change.doc.data());
    //     });
    //   });
    // return unsub;

    // STUB: genera un evento aleatorio cada 3 s
    const intervalId = setInterval(() => {
      callback(_demoEvents(1)[0]);
    }, 3000);

    // También enviar datos iniciales
    setTimeout(() => {
      _demoEvents(20).forEach((ev, i) => {
        setTimeout(() => callback(ev), i * 50);
      });
    }, 400);

    return () => clearInterval(intervalId); // función unsub
  },

  async getUsers(clientId) {
    _log('[stub] getUsers', clientId);
    // En producción:
    // const snap = await db.collection('users')
    //   .where('clientId', '==', clientId).get();
    // return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    await _delay(700);
    return [
      { id: '1', nombre: 'Ana García',     email: 'ana@empresa.mx',    rol: 'admin',    tagsCount: 2, activo: true  },
      { id: '2', nombre: 'Luis Mendoza',   email: 'luis@empresa.mx',   rol: 'guard',    tagsCount: 1, activo: true  },
      { id: '3', nombre: 'María Torres',   email: 'maria@empresa.mx',  rol: 'resident', tagsCount: 3, activo: true  },
      { id: '4', nombre: 'Carlos Ruiz',    email: 'carlos@empresa.mx', rol: 'resident', tagsCount: 1, activo: false },
      { id: '5', nombre: 'Sofía Jiménez',  email: 'sofia@empresa.mx',  rol: 'guard',    tagsCount: 2, activo: true  },
    ];
  },

  async getDevices(clientId) {
    _log('[stub] getDevices', clientId);
    // En producción:
    // const snap = await db.collection('access_points')
    //   .where('clientId', '==', clientId).get();
    // return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    await _delay(500);
    return [
      { id: 'AP-01', nombre: 'Entrada Principal', ip: '192.168.1.101', estado: 'online'  },
      { id: 'AP-02', nombre: 'Estacionamiento',   ip: '192.168.1.102', estado: 'online'  },
      { id: 'AP-03', nombre: 'Acceso Bodega',      ip: '192.168.1.103', estado: 'offline' },
      { id: 'AP-04', nombre: 'Acceso Oficinas',    ip: '192.168.1.104', estado: 'online'  },
    ];
  },

  async getAlerts(clientId) {
    _log('[stub] getAlerts', clientId);
    // En producción:
    // const snap = await db.collection('alerts')
    //   .where('clientId', '==', clientId)
    //   .where('status', '==', 'active').get();
    // return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    await _delay(600);
    return {
      activas: [
        { id: 'al-01', tipo: 'high',   mensaje: 'Intento de acceso no autorizado — Bodega',    punto: 'AP-03', createdAt: Date.now() - 300_000 },
        { id: 'al-02', tipo: 'medium', mensaje: 'Lector AP-04 sin respuesta hace 15 minutos.', punto: 'AP-04', createdAt: Date.now() - 900_000 },
      ],
      resueltas: [
        { id: 'al-00', tipo: 'low', mensaje: 'Tag desconocido en entrada principal.', punto: 'AP-01', createdAt: Date.now() - 3_600_000 },
      ],
    };
  },

  async acknowledgeAlert(clientId, alertId) {
    _log('[stub] acknowledgeAlert', alertId);
    // En producción:
    // await db.collection('alerts').doc(alertId).update({
    //   status: 'resolved', resolvedAt: firebase.firestore.FieldValue.serverTimestamp()
    // });
    await _delay(500);
  },

  async createAlert(clientId, data) {
    _log('[stub] createAlert', data);
    // En producción:
    // await db.collection('alerts').add({
    //   ...data, clientId, status: 'active',
    //   createdAt: firebase.firestore.FieldValue.serverTimestamp()
    // });
    await _delay(600);
  },
};


/* ============================================================
   HELPERS PARA STUBS
============================================================ */
function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const _UIDS    = ['A1B2C3D4', '9F3E7A12', 'CC840021', '3D5F9B01', 'FF001234', 'AB9870EF'];
const _PUNTOS  = ['Entrada Principal', 'Estacionamiento', 'Acceso Bodega', 'Acceso Oficinas'];
const _NOMBRES = ['Ana García', 'Luis Mendoza', 'María Torres', 'Carlos Ruiz', 'Sofía Jiménez'];
const _ESTADOS = ['permitido', 'permitido', 'permitido', 'denegado']; // 75% permitido

function _demoEvents(n) {
  return Array.from({ length: n }, (_, i) => ({
    uid:       _UIDS[Math.floor(Math.random() * _UIDS.length)],
    usuario:   _NOMBRES[Math.floor(Math.random() * _NOMBRES.length)],
    punto:     _PUNTOS[Math.floor(Math.random() * _PUNTOS.length)],
    estado:    _ESTADOS[Math.floor(Math.random() * _ESTADOS.length)],
    timestamp: Date.now() - i * 12_000,
  }));
}


/* ============================================================
   PUNTO DE ENTRADA
============================================================ */
function init() {
  _log('init v3');

  _initTopbar();
  _initSidebar();
  _initModals();
  _initRefreshButtons();
  _initTagsControls();
  _initUsuariosSearch();
  _initAlertaActions();
  _initAuth();

  // Inicializar auth listener (Firebase o stub)
  FirebaseStubs.initAuth(
    (userData) => {
      STATE.clientId = userData.clientId ?? null;
      _showApp(userData);
      _initRouter();
      _setIndicator('indicatorDB', 'loading');
    },
    () => {
      _showAuth();
      // Mostrar auth screen
      const authScreen = document.getElementById('authScreen');
      if (authScreen) authScreen.hidden = false;
    }
  );
}

// Arrancar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
