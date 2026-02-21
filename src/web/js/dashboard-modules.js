/**
 * Neos Tech RFID Dashboard - Módulo Principal
 * Firebase v8.10.1 + Core Functions
 */

/* ========================================
   CONFIGURACIÓN FIREBASE
   ======================================== */
const firebaseConfig = {
    apiKey: "AIzaSyBZ-XRSRgC2gz9E6zdYpes7yv5nLZtKmSw",
    authDomain: "neos-tech.firebaseapp.com",
    projectId: "neos-tech",
    storageBucket: "neos-tech.firebasestorage.app",
    messagingSenderId: "738411977369",
    appId: "1:738411977369:web:7facc71cea4c271d217608",
    measurementId: "G-DL4X5MX5JL"
};

// Inicializar Firebase
console.log('🔧 [FIREBASE] Iniciando Firebase...');
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ [FIREBASE] Firebase inicializado correctamente');
} else {
    console.log('⚠️ [FIREBASE] Firebase ya estaba inicializado');
}

const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging.isSupported() ? firebase.messaging() : null;

console.log('✅ [FIREBASE] Firestore conectado');
console.log('✅ [FIREBASE] Auth inicializado');
console.log('📱 [FIREBASE] Messaging soportado:', !!messaging);

/* ========================================
   VARIABLES GLOBALES
   ======================================== */
let users = [];
let alerts = [];
let logs = [];
let selectedTags = [];
let charts = {};
let whitelist = [];
let blacklist = [];
let unregisteredTags = [];
let currentUser = null;
let userRole = null;
window.currentUserClientId = null;
let realtimeListeners = [];
let currentTab = 'control'; // Tab actualmente visible
let dataLoaded = false; // Bandera para saber si los datos ya se cargaron

// Variables para gestión de listas
let selectedUnregisteredTags = [];
let selectedWhitelistTags = [];
let selectedBlacklistTags = [];

// Variables para paginación de live tags
let liveTagsArray = [];
let currentLiveTagsPage = 1;
let liveTagsPerPage = 10;
let currentLiveTagsFilter = 'all';

// Variables para sistema de alertas
let activeAlerts = [];
let alertTemplates = {};

/* ========================================
   FUNCIONES PRINCIPALES
   ======================================== */

/**
 * Inicialización del dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ========================================');
    console.log('🚀 Neos Tech Dashboard Iniciando...');
    console.log('🚀 ========================================');
    
    // Verificar autenticación
    console.log('🔐 [AUTH] Configurando listener de autenticación...');
    auth.onAuthStateChanged(user => {
        console.log('🔐 [AUTH] Estado de autenticación cambió');
        if (user) {
            console.log('✅ [AUTH] Usuario autenticado:', user.email);
            console.log('✅ [AUTH] UID:', user.uid);
            currentUser = user;
            
            const modal = document.getElementById('loginModal');
            console.log('🔐 [AUTH] Ocultando loginModal...');
            modal.style.display = 'none';
            
            console.log('🔐 [AUTH] Llamando initDashboard()...');
            initDashboard();
        } else {
            console.log('⚠️ [AUTH] Usuario NO autenticado - mostrando login');
            const modal = document.getElementById('loginModal');
            modal.style.display = 'flex';
        }
    });
    
    // Actualizar reloj
    console.log('⏰ [CLOCK] Iniciando reloj...');
    updateClock();
    setInterval(updateClock, 1000);
});

/**
 * Autenticación - Login
 */
function performLogin() {
    console.log('🔐 [AUTH] performLogin iniciado');
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    console.log('🔐 [AUTH] Intentando login con email:', email);
    
    if (!email || !password) {
        showNotification('Por favor ingresa email y contraseña', 'warning');
        console.warn('⚠️ [AUTH] Email o password vacío');
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log('✅ [AUTH] Login exitoso:', userCredential.user.email);
            showNotification('¡Bienvenido a Neos Tech!', 'success');
            currentUser = userCredential.user;
            
            const modal = document.getElementById('loginModal');
            console.log('🔐 [AUTH] Ocultando modal de login...');
            modal.style.display = 'none';
            
            console.log('🔐 [AUTH] Llamando initDashboard()...');
            initDashboard();
        })
        .catch((error) => {
            console.error('❌ [AUTH] Error de autenticación:', error);
            console.error('❌ [AUTH] Error code:', error.code);
            console.error('❌ [AUTH] Error message:', error.message);
            showNotification('Error: ' + error.message, 'danger');
        });
}

/**
 * Cerrar sesión
 */
function logout() {
    auth.signOut().then(() => {
        showNotification('Sesión cerrada correctamente', 'info');
        location.reload();
    });
}

/**
 * Inicialización del dashboard después del login
 */
function initDashboard() {
    console.log('🚀 ========================================');
    console.log('🚀 [INIT] initDashboard() INICIADO');
    console.log('🚀 ========================================');
    console.log('✅ Dashboard inicializado para:', currentUser.email);
    
    // Mostrar email del usuario
    const userInfoEl = document.getElementById('user-info');
    if (userInfoEl) {
        userInfoEl.style.display = 'flex';
        const nameEl = document.getElementById('currentUserName');
        if (nameEl) nameEl.textContent = currentUser.email;
    }
    
    // GATE: leer users/{uid} para obtener clientId ANTES de cualquier query multi-tenant
    console.log('📂 [INIT] Leyendo perfil de usuario (clientId + role)...');
    db.collection('users').doc(currentUser.uid).get().then((userDoc) => {
        if (!userDoc.exists) {
            console.error('❌ [INIT] Perfil no encontrado en users/' + currentUser.uid);
            showNotification('Perfil de usuario no encontrado en Firestore', 'danger');
            return;
        }
        const userData = userDoc.data();
        userRole = userData.role || 'resident';
        window.currentUserClientId = userData.clientId;
        console.log('✅ [INIT] clientId:', window.currentUserClientId, '| role:', userRole);
        applyRoleRestrictions();

        // Cargar datos iniciales Y ESPERAR a que terminen
        console.log('📂 [INIT] Iniciando carga de datos desde Firebase...');
        Promise.all([
            loadUsers(),
            loadAlerts(),
            loadLogs(),
            loadWhitelist(),
            loadBlacklist()
        ]).then(() => {
            console.log('');
            console.log('✅ ========================================');
            console.log('✅ DATOS CARGADOS EXITOSAMENTE');
            console.log('✅ ========================================');
            console.log(`📊 Usuarios: ${users.length}`);
            console.log(`📊 Alertas: ${alerts.length}`);
            console.log(`📊 Logs: ${logs.length}`);
            console.log(`📊 Whitelist: ${whitelist.length}`);
            console.log(`📊 Blacklist: ${blacklist.length}`);
            console.log('✅ ========================================');
            console.log('');

            // Actualizar estadísticas después de cargar
            console.log('📈 [INIT] Actualizando estadísticas del dashboard...');
            updateDashboardStats();

            // Marcar datos como cargados
            dataLoaded = true;
            console.log('✅ [INIT] dataLoaded = true');

            // Activar tab inicial DESPUÉS de cargar datos
            console.log('🔄 [INIT] Activando tab inicial (control)...');
            switchTab('control');

            // Si el usuario ya cambió a otro tab mientras se cargaban los datos, re-renderizarlo
            if (currentTab !== 'control') {
                console.log('🔄 [INIT] Usuario ya estaba en tab:', currentTab, '- Re-renderizando...');
                loadTabContent(currentTab);
            }

            // Cargar tags RFID
            console.log('🏷️ [INIT] Cargando tags RFID...');
            loadRFIDTags();

            console.log('');
            console.log('✅ ========================================');
            console.log('✅ DASHBOARD COMPLETAMENTE INICIALIZADO');
            console.log('✅ ========================================');
            console.log('');
        }).catch(error => {
            console.log('');
            console.error('❌ ========================================');
            console.error('❌ ERROR CARGANDO DATOS INICIALES');
            console.error('❌ ========================================');
            console.error('❌ Error:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            console.error('❌ ========================================');
            console.log('');
            showNotification('Error cargando datos desde Firebase', 'danger');
        });
    }).catch((error) => {
        console.error('❌ [INIT] Error leyendo perfil de usuario:', error);
        showNotification('Error leyendo perfil de usuario', 'danger');
    });

    // ACTUALIZACIÓN MANUAL - Listeners en tiempo real deshabilitados
    // startRealtimeListeners(); // ❌ Comentado - usar botones de actualizar

    // FCM deshabilitado hasta tener VAPID key válida
    // if (messaging) {
    //     requestNotificationPermission(); // ❌ Error: Invalid VAPID key
    // }
}

/**
 * Sistema de navegación entre tabs
 */
function switchTab(tabName) {
    console.log('🔄 [NAV] switchTab llamado con:', tabName);
    
    // Actualizar tab actual
    currentTab = tabName;
    
    // Ocultar todos los tabs
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Desactivar todos los botones
    const allButtons = document.querySelectorAll('.tab-button');
    allButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Activar tab seleccionado
    const activeTab = document.getElementById(tabName + '-tab');
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Activar botón correspondiente
    const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Cargar contenido específico del tab
    console.log('🔄 [NAV] Llamando loadTabContent para:', tabName);
    loadTabContent(tabName);
    console.log('✅ [NAV] switchTab completado');
}

/**
 * Cargar contenido específico de cada tab
 */
function loadTabContent(tabName) {
    console.log('📄 [TAB] loadTabContent iniciado para:', tabName);
    
    switch(tabName) {
        case 'control':
            console.log('🎯 [TAB] Ejecutando updateDashboardStats...');
            updateDashboardStats();
            console.log('✅ [TAB] control tab completado');
            break;
        case 'users':
            console.log('🎯 [TAB] Ejecutando renderUsersTable...');
            renderUsersTable();
            console.log('✅ [TAB] users tab completado');
            break;
        case 'lists':
            console.log('🎯 [TAB] Ejecutando renderWhitelistTable y renderBlacklistTable...');
            renderWhitelistTable();
            renderBlacklistTable();
            console.log('✅ [TAB] lists tab completado');
            break;
        case 'alerts':
            console.log('🎯 [TAB] Ejecutando renderAlertsTable...');
            renderAlertsTable();
            console.log('✅ [TAB] alerts tab completado');
            break;
        case 'logs':
            console.log('🎯 [TAB] Ejecutando renderLogsTable...');
            renderLogsTable();
            console.log('✅ [TAB] logs tab completado');
            break;
        case 'charts':
            console.log('🎯 [TAB] Ejecutando initCharts...');
            initCharts();
            console.log('✅ [TAB] charts tab completado');
            break;
        case 'reader':
            console.log('🎯 [TAB] reader tab (sin implementación)');
            // Configuración del lector RFID
            break;
        case 'access':
            console.log('🎯 [TAB] Ejecutando loadAccessHistory...');
            loadAccessHistory();
            console.log('✅ [TAB] access tab completado');
            break;
        case 'config':
            console.log('🎯 [TAB] config tab (sin implementación)');
            // Configuración del sistema
            break;
    }
    console.log('✅ [TAB] loadTabContent completado para:', tabName);
}

/**
 * Actualizar reloj en tiempo real
 */
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
    });
    const dateString = now.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    const timestampEl = document.getElementById('current-time');
    if (timestampEl) {
        timestampEl.textContent = `${timeString} - ${dateString}`;
    }
}

/**
 * Sistema de notificaciones
 */
function showNotification(message, type = 'info') {
    // TODO: Implementar sistema de notificaciones toast
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Fallback alert
    if (type === 'danger' || type === 'warning') {
        alert(message);
    }
}

/**
 * Solicitar permisos de notificaciones push
 * ⚠️ DESHABILITADO - Requiere VAPID key válida de Firebase Console
 * Para habilitar: Ir a Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
 */
function requestNotificationPermission() {
    console.warn('⚠️ FCM deshabilitado - Configure VAPID key en Firebase Console');
    return; // ❌ Deshabilitado hasta configurar VAPID key
    
    // if (!messaging) return;
    // 
    // Notification.requestPermission().then((permission) => {
    //     if (permission === 'granted') {
    //         console.log('✅ Permisos de notificación concedidos');
    //         messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY_HERE' }) // ⚠️ Reemplazar con key real
    //             .then((currentToken) => {
    //                 if (currentToken) {
    //                     console.log('FCM Token:', currentToken);
    //                     saveNotificationToken(currentToken);
    //                 }
    //             })
    //             .catch((err) => {
    //                 console.error('Error obteniendo token FCM:', err);
    //             });
    //     }
    // });
}

/**
 * Guardar token de notificación
 */
function saveNotificationToken(token) {
    db.collection('notification_tokens').doc(currentUser.uid).set({
        token: token,
        userId: currentUser.uid,
        email: currentUser.email,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/* ========================================
   OPERACIONES FIRESTORE
   ======================================== */

/**
 * Guard: aborta queries si clientId aún no está disponible.
 * @returns {boolean}
 */
function requireClientId() {
    if (!window.currentUserClientId) {
        console.error('❌ currentUserClientId no definido, abortando query Firestore');
        return false;
    }
    return true;
}

/**
 * Cargar usuarios desde Firestore
 */
function loadUsers() {
    console.log('📂 [LOAD] Iniciando loadUsers...');
    return db.collection('users')
        .where('clientId', '==', window.currentUserClientId)
        .get()
        .then((querySnapshot) => {
            console.log('📊 [LOAD] Documentos users recibidos:', querySnapshot.size);
            users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            console.log(`✅ [LOAD] ${users.length} usuarios cargados en array`);
            updateUserCount();
        })
        .catch((error) => {
            console.error('Error cargando usuarios:', error);
            throw error;
        });
}

/**
 * Cargar alertas
 */
function loadAlerts() {
    console.log('📂 [LOAD] Iniciando loadAlerts...');
    return db.collection('emergency_alerts')
        .where('clientId', '==', window.currentUserClientId)
        .orderBy('timestamp', 'desc').limit(100).get()
        .then((querySnapshot) => {
            console.log('📊 [LOAD] Documentos alerts recibidos:', querySnapshot.size);
            alerts = [];
            querySnapshot.forEach((doc) => {
                alerts.push({ id: doc.id, ...doc.data() });
            });
            console.log(`✅ [LOAD] ${alerts.length} alertas cargadas en array`);
            updateAlertCount();
        })
        .catch((error) => {
            console.error('❌ [LOAD] Error cargando alertas:', error);
            throw error;
        });
}

/**
 * Cargar logs de eventos
 */
function loadLogs() {
    console.log('📂 [LOAD] Iniciando loadLogs...');
    return db.collection('access_logs')
        .where('clientId', '==', window.currentUserClientId)
        .orderBy('timestamp', 'desc').limit(500).get()
        .then((querySnapshot) => {
            console.log('📊 [LOAD] Documentos logs recibidos:', querySnapshot.size);
            logs = [];
            querySnapshot.forEach((doc) => {
                logs.push({ id: doc.id, ...doc.data() });
            });
            console.log(`✅ [LOAD] ${logs.length} logs cargados en array`);
            updateAccessCount();
        })
        .catch((error) => {
            console.error('❌ [LOAD] Error cargando logs:', error);
            throw error;
        });
}

/**
 * Cargar whitelist
 */
function loadWhitelist() {
    console.log('📂 [LOAD] Iniciando loadWhitelist...');
    return db.collection('whitelist')
        .where('clientId', '==', window.currentUserClientId)
        .get()
        .then((querySnapshot) => {
            console.log('📊 [LOAD] Documentos whitelist recibidos:', querySnapshot.size);
            whitelist = [];
            querySnapshot.forEach((doc) => {
                whitelist.push({ id: doc.id, ...doc.data() });
            });
            console.log(`✅ [LOAD] ${whitelist.length} tags en whitelist cargados en array`);
        })
        .catch((error) => {
            console.error('❌ [LOAD] Error cargando whitelist:', error);
            throw error;
        });
}

/**
 * Cargar blacklist
 */
function loadBlacklist() {
    console.log('📂 [LOAD] Iniciando loadBlacklist...');
    return db.collection('blacklist')
        .where('clientId', '==', window.currentUserClientId)
        .get()
        .then((querySnapshot) => {
            console.log('📊 [LOAD] Documentos blacklist recibidos:', querySnapshot.size);
            blacklist = [];
            querySnapshot.forEach((doc) => {
                blacklist.push({ id: doc.id, ...doc.data() });
            });
            console.log(`✅ [LOAD] ${blacklist.length} tags en blacklist cargados en array`);
        })
        .catch((error) => {
            console.error('❌ [LOAD] Error cargando blacklist:', error);
            throw error;
        });
}

/**
 * Listeners en tiempo real
 * ⚠️ DESHABILITADO - Ahora usa actualización manual con botones
 */
function startRealtimeListeners() {
    console.warn('⚠️ Listeners en tiempo real deshabilitados - Usar botones de actualizar');
    // Función deshabilitada - Se usa loadRFIDTags() manual
}

/**
 * Cargar tags RFID manualmente (sin listeners en tiempo real)
 */
async function loadRFIDTags() {
    try {
        const snapshot = await db.collection('rfid_events')
            .where('clientId', '==', window.currentUserClientId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        const feedContainer = document.getElementById('liveTagsFeed');
        if (!feedContainer) return;
        
        feedContainer.innerHTML = ''; // Limpiar feed
        
        snapshot.docs.forEach(doc => {
            const tagData = doc.data();
            addTagToLiveFeed(tagData);
        });
        
        // Actualizar último tag en panel de detalles
        if (snapshot.docs.length > 0) {
            updateLatestTagDetails(snapshot.docs[0].data());
        }
        
        setLastUpdate();
        showNotification('✅ Tags RFID actualizados', 'success');
    } catch (error) {
        console.error('Error cargando tags RFID:', error);
        showNotification('❌ Error al cargar tags: ' + error.message, 'danger');
    }
}

/**
 * Agregar tag al feed en vivo
 */
function addTagToLiveFeed(tag) {
    const feedContainer = document.getElementById('liveTagsFeed');
    if (!feedContainer) return;

    const card = document.createElement('div');
    card.className = 'detail-item';
    card.setAttribute('data-timestamp', tag.timestamp?.seconds || Date.now() / 1000);
    const ts = tag.timestamp?.toDate ? tag.timestamp.toDate() : new Date();

    card.innerHTML = `
        <span>${tag.epc || 'Tag desconocido'}</span>
        <span>${ts.toLocaleTimeString('es-MX')}</span>
    `;

    feedContainer.prepend(card);

    // Limitar a 50 items
    while (feedContainer.children.length > 50) {
        feedContainer.removeChild(feedContainer.lastChild);
    }
    
    // Actualizar contador
    updateLiveTagsCount();
}

function updateLiveTagsCount() {
    const feedContainer = document.getElementById('liveTagsFeed');
    const countEl = document.getElementById('liveTagsCount');
    if (feedContainer && countEl) {
        const count = feedContainer.querySelectorAll('.detail-item').length;
        countEl.textContent = count;
    }
}

function sortLiveTags() {
    const feedContainer = document.getElementById('liveTagsFeed');
    const sortSelect = document.getElementById('liveTagsSort');
    if (!feedContainer || !sortSelect) return;
    
    const items = Array.from(feedContainer.querySelectorAll('.detail-item'));
    const sortValue = sortSelect.value;
    
    items.sort((a, b) => {
        const timeA = parseFloat(a.getAttribute('data-timestamp') || 0);
        const timeB = parseFloat(b.getAttribute('data-timestamp') || 0);
        return sortValue === 'newest' ? timeB - timeA : timeA - timeB;
    });
    
    feedContainer.innerHTML = '';
    items.forEach(item => feedContainer.appendChild(item));
}

/**
 * Actualizar detalles del último tag
 */
function updateLatestTagDetails(tag) {
    const ts = tag.timestamp?.toDate ? tag.timestamp.toDate() : new Date();
    const map = {
        'latest-epc': tag.epc || 'N/A',
        'latest-time': ts.toLocaleTimeString('es-MX'),
        'latest-reader': tag.reader || 'Desconocido',
        'latest-timestamp': ts.toLocaleDateString('es-MX') + ' ' + ts.toLocaleTimeString('es-MX')
    };
    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

/**
 * Actualizar contadores del dashboard
 */
function updateDashboardStats() {
    updateUserCount();
    updateAlertCount();
    updateAccessCount();
}

function updateUserCount() {
    // Contar residentes (filtrar admin/system)
    const residents = users.filter(u => {
        const type = (u.type || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        // Excluir admin/system, contar el resto como residentes
        return type !== 'admin' && type !== 'system' && !email.includes('admin');
    }).length;
    
    // Contar vehículos registrados (usuarios con campo vehicle)
    const vehicles = users.filter(u => {
        const hasVehicle = u.vehicle && u.vehicle.trim() !== '';
        return hasVehicle;
    }).length;
    
    const residentEl = document.getElementById('residentCount');
    const vehicleEl = document.getElementById('vehicleCount');
    
    if (residentEl) residentEl.textContent = residents;
    if (vehicleEl) vehicleEl.textContent = vehicles;
    
    console.log(`📊 Stats: ${residents} residentes, ${vehicles} vehículos`);
}

function updateAlertCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAlerts = alerts.filter(a => {
        if (!a.timestamp) return false;
        const alertDate = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        return alertDate >= today;
    }).length;
    
    const alertEl = document.getElementById('alertsToday');
    if (alertEl) alertEl.textContent = todayAlerts;
    
    console.log(`🔔 ${todayAlerts} alertas hoy de ${alerts.length} totales`);
}

function updateAccessCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAccess = logs.filter(l => {
        if (!l.timestamp) return false;
        const logDate = l.timestamp.toDate ? l.timestamp.toDate() : new Date(l.timestamp);
        const isToday = logDate >= today;
        // Contar eventos de tipo 'access', 'entry', 'exit' o manual_open
        const isAccess = l.type === 'access' || l.type === 'entry' || l.type === 'exit' || l.event_type === 'manual_open';
        return isToday && isAccess;
    }).length;
    
    const accessEl = document.getElementById('accessToday');
    if (accessEl) accessEl.textContent = todayAccess;
    
    console.log(`🚪 ${todayAccess} accesos hoy de ${logs.length} logs totales`);
}

/* ========================================
   FILTROS RFID FEED
   ======================================== */
function filterTags(event, filter) {
    console.log('Filtro aplicado:', filter);
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    if (event?.currentTarget) event.currentTarget.classList.add('active');
    // TODO: Filtrar feed según estado
}

/* ========================================
   RENDERIZADO DE TABLAS
   ======================================== */
function renderUsersTable() {
    console.log('🎨 [RENDER] Iniciando renderUsersTable...');
    console.log('📊 [RENDER] Total usuarios en array:', users.length);
    
    const container = document.getElementById('usersTable');
    console.log('📦 [RENDER] Container usersTable encontrado:', !!container);
    if (!container) {
        console.error('❌ [RENDER] No se encontró elemento #usersTable');
        return;
    }
    
    // Si los datos aún no se han cargado, mostrar loader
    if (!dataLoaded) {
        console.log('⏳ [RENDER] Datos aún cargando, mostrando loader...');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #ff9800;"></i>
                <p style="margin-top: 1rem; color: #616161;">Cargando usuarios desde Firebase...</p>
            </div>
        `;
        return;
    }
    
    // Filtrar usuarios: EXCLUIR admin/system
    const regularUsers = users.filter(u => {
        const type = (u.type || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return type !== 'admin' && type !== 'system' && !email.includes('admin');
    });
    
    console.log('👥 [RENDER] Usuarios regulares (sin admin):', regularUsers.length);
    
    if (!regularUsers.length) {
        console.log('⚠️ [RENDER] Sin usuarios regulares, mostrando empty-state');
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Sin usuarios cargados</p></div>';
        return;
    }
    
    const table = `
        <div class="table-wrapper">
            <table class="users-table">
                <thead>
                    <tr style="height: 50px;">
                        <th style="height: 44px; padding: 12px; vertical-align: middle;">Nombre</th>
                        <th style="height: 44px; padding: 12px; vertical-align: middle;">Departamento</th>
                        <th style="height: 44px; padding: 12px; vertical-align: middle;">Teléfono</th>
                        <th style="height: 44px; padding: 12px; vertical-align: middle;">Vehículo</th>
                        <th style="height: 44px; padding: 12px; vertical-align: middle;">Tags</th>
                        <th style="height: 44px; padding: 12px; vertical-align: middle; text-align: center;">Estado</th>
                        <th style="height: 44px; padding: 12px; vertical-align: middle; text-align: center;">Acciones</th>
                    </tr>
                </thead>
                <tbody style="height: 200px;">
                    ${regularUsers.map((u, index) => `
                        <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}" style="height: 50px;">
                            <td class="text-cell" style="height: 40px; padding: 10px; vertical-align: middle; line-height: 1.5;">${u.name || 'Sin nombre'}</td>
                            <td class="text-cell" style="height: 40px; padding: 10px; vertical-align: middle; line-height: 1.5;">${u.departamento || '-'}</td>
                            <td class="text-cell" style="height: 40px; padding: 10px; vertical-align: middle; line-height: 1.5;">${u.phone || '-'}</td>
                            <td class="text-cell" style="height: 40px; padding: 10px; vertical-align: middle; line-height: 1.5;">${u.vehicle || '-'}</td>
                            <td class="text-cell" style="height: 40px; padding: 10px; vertical-align: middle; line-height: 1.5;">
                                ${(u.tags || []).map(t => `<span class="tag-badge">...${t.slice(-8)}</span>`).join('')}
                            </td>
                            <td style="height: 40px; padding: 10px; vertical-align: middle; line-height: 1.5; text-align: center;">
                                <span class="status-badge ${u.active? 'status-active' : 'status-inactive'}">
                                    ${u.active ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td style="height: 40px; padding: 10px; vertical-align: middle; line-height: 1.5; text-align: center;">
                                <button onclick="editUser('${u.id}')" class="btn-edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteUser('${u.id}')" class="btn-delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = table;
    console.log('✅ [RENDER] Tabla usuarios renderizada, longitud HTML:', container.innerHTML.length);
    console.log('🔍 [DEBUG] Primeros 500 caracteres del HTML:', container.innerHTML.substring(0, 500));
    
    // NUCLEAR: Forzar estilos inline para bypassear CSS (!important no funciona en cssText)
    container.style.cssText = 'min-height: 400px; display: block; background: #f5f7fa; padding: 1.5rem; border-radius: 12px; border: 3px solid #ff9800; overflow-y: auto; max-height: 600px; visibility: visible;';
    
    // Forzar estilos al panel padre
    const panel = container.closest('.panel');
    if (panel) {
        panel.style.cssText = 'min-height: 400px; display: block; height: auto; background: white; border-radius: 16px; padding: 1.5rem; visibility: visible;';
    }
    
    // Forzar estilos al tab
    const tabContent = container.closest('.tab-content');
    if (tabContent) {
        tabContent.style.cssText = 'display: block; min-height: 500px; padding: 1.5rem; visibility: visible;';
    }
    
    // Forzar reflow ANTES de medir
    void document.body.offsetHeight;
    
    // Logging de estilos computados
    const containerComputed = window.getComputedStyle(container);
    console.log('🔍 [COMPUTED] Container:', {
        display: containerComputed.display,
        minHeight: containerComputed.minHeight,
        height: containerComputed.height,
        visibility: containerComputed.visibility,
        position: containerComputed.position,
        overflow: containerComputed.overflow,
        float: containerComputed.float
    });
    
    if (panel) {
        const panelComputed = window.getComputedStyle(panel);
        console.log('🔍 [COMPUTED] Panel:', {
            display: panelComputed.display,
            minHeight: panelComputed.minHeight,
            height: panelComputed.height,
            visibility: panelComputed.visibility
        });
    }
    
    // CRÍTICO: Verificar estilos de los elementos INTERNOS que deberían expandir el container
    const tableWrapper = container.querySelector('.table-wrapper');
    const usersTable = container.querySelector('.users-table');
    
    if (tableWrapper) {
        const wrapperComputed = window.getComputedStyle(tableWrapper);
        console.log('🔍 [COMPUTED] .table-wrapper:', {
            display: wrapperComputed.display,
            position: wrapperComputed.position,
            float: wrapperComputed.float,
            height: wrapperComputed.height,
            minHeight: wrapperComputed.minHeight
        });
    } else {
        console.error('❌ .table-wrapper NO ENCONTRADO en el DOM');
    }
    
    if (usersTable) {
        const tableComputed = window.getComputedStyle(usersTable);
        console.log('🔍 [COMPUTED] .users-table:', {
            display: tableComputed.display,
            position: tableComputed.position,
            tableLayout: tableComputed.tableLayout,
            height: tableComputed.height
        });
        
        // CRÍTICO: Verificar estructura interna de la tabla
        const tbody = usersTable.querySelector('tbody');
        const thead = usersTable.querySelector('thead');
        const allRows = usersTable.querySelectorAll('tbody tr');
        const allCells = usersTable.querySelectorAll('tbody td');
        
        console.log('🔍 [STRUCTURE] Elementos de tabla:', {
            tbody: tbody ? 'EXISTE' : 'NO EXISTE',
            thead: thead ? 'EXISTE' : 'NO EXISTE',
            totalRows: allRows.length,
            totalCells: allCells.length
        });
        
        if (tbody) {
            const tbodyComputed = window.getComputedStyle(tbody);
            console.log('🔍 [COMPUTED] <tbody>:', {
                display: tbodyComputed.display,
                height: tbody.offsetHeight,
                childCount: tbody.children.length,
                // ⚠️ CRÍTICO: Verificar si estilo INLINE fue aplicado
                inlineHeight: tbody.style.height,
                computedHeight: tbodyComputed.height
            });
        }
        
        if (allRows.length > 0) {
            const firstRow = allRows[0];
            const firstRowComputed = window.getComputedStyle(firstRow);
            console.log('🔍 [COMPUTED] Primera <tr>:', {
                display: firstRowComputed.display,
                height: firstRow.offsetHeight,
                cellCount: firstRow.children.length,
                className: firstRow.className,
                // ⚠️ CRÍTICO: Verificar si estilo INLINE fue aplicado
                inlineHeight: firstRow.style.height,
                computedHeight: firstRowComputed.height
            });
            
            // Verificar primera celda
            const firstCell = firstRow.querySelector('td');
            if (firstCell) {
                const cellComputed = window.getComputedStyle(firstCell);
                console.log('🔍 [COMPUTED] Primera <td>:', {
                    display: cellComputed.display,
                    height: firstCell.offsetHeight,
                    fontSize: cellComputed.fontSize,
                    lineHeight: cellComputed.lineHeight,  // ✅ CRÍTICO: Ver si line-height se aplicó
                    minHeight: cellComputed.minHeight,    // ✅ CRÍTICO: Ver si min-height se aplicó
                    color: cellComputed.color,
                    padding: cellComputed.padding,
                    textContent: firstCell.textContent.substring(0, 30),
                    // ⚠️ CRÍTICO: Verificar si estilo INLINE fue aplicado
                    inlineHeight: firstCell.style.height,
                    computedHeight: cellComputed.height,
                    // 🔍 Ver atributo style completo en el HTML
                    styleAttr: firstCell.getAttribute('style')
                });
                
                // 🚨 CRÍTICO: Verificar si hay algo SOBRESCRIBIENDO los estilos
                console.warn('🔍 [VERIFY] Contenido HTML de la primera celda:');
                console.warn(firstCell.outerHTML.substring(0, 200));
            }
        }
    } else {
        console.error('❌ .users-table NO ENCONTRADA en el DOM');
    }
    
    console.log('🔍 [DEBUG] Elemento container visible:', container.offsetHeight > 0, 'Altura:', container.offsetHeight);
    console.log('🔍 [DEBUG] Panel altura:', panel ? panel.offsetHeight : 'NO EXISTE');
    console.log('🔍 [DEBUG] Tab activo:', tabContent ? tabContent.classList.contains('active') : 'NO EXISTE');
    console.log('🔍 [DEBUG] Tab display:', tabContent ? window.getComputedStyle(tabContent).display : 'NO EXISTE');
    
    // Forzar múltiples reflows
    void container.offsetHeight;
    if (panel) void panel.offsetHeight;
    document.body.offsetHeight;
    requestAnimationFrame(() => {
        container.style.opacity = '0.99';
        setTimeout(() => { container.style.opacity = '1'; }, 10);
    });
    
    console.log('🔍 [DEBUG] Después de forzar repaint, altura:', container.offsetHeight);

    const totalEl = document.getElementById('usersTotal');
    if (totalEl) totalEl.innerText = regularUsers.length;
    const residentEl = document.getElementById('usersResidents');
    if (residentEl) residentEl.innerText = regularUsers.filter(u => u.type === 'resident').length;
    const vehicleEl = document.getElementById('usersVehicles');
    if (vehicleEl) vehicleEl.innerText = regularUsers.filter(u => u.type === 'vehicle').length;
    
    console.log('✅ [RENDER] renderUsersTable completado exitosamente');
}

function renderWhitelistTable() {
    console.log('🎨 [RENDER] Iniciando renderWhitelistTable...');
    console.log('📊 [RENDER] Total whitelist en array:', whitelist.length);
    
    const container = document.getElementById('whitelistTable');
    console.log('📦 [RENDER] Container whitelistTable encontrado:', !!container);
    if (!container) {
        console.error('❌ [RENDER] No se encontró elemento #whitelistTable');
        return;
    }
    
    // Si los datos aún no se han cargado, mostrar loader
    if (!dataLoaded) {
        console.log('⏳ [RENDER] Datos aún cargando, mostrando loader...');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #ff9800;"></i>
                <p style="margin-top: 1rem; color: #616161;">Cargando whitelist...</p>
            </div>
        `;
        return;
    }
    
    if (!whitelist.length) {
        console.log('⚠️ [RENDER] Sin whitelist, mostrando empty-state');
        container.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i><p>Whitelist vacía</p></div>';
        return;
    }
    container.innerHTML = whitelist.map(w => `
        <div class="system-item" style="color: #212121;">
            <span>${w.name || w.epc}</span>
            <span>${w.epc || '-'}</span>
        </div>
    `).join('');
    console.log('✅ [RENDER] Whitelist renderizada, longitud HTML:', container.innerHTML.length);
    console.log('✅ [RENDER] renderWhitelistTable completado exitosamente');
}

function renderBlacklistTable() {
    console.log('🎨 [RENDER] Iniciando renderBlacklistTable...');
    console.log('📊 [RENDER] Total blacklist en array:', blacklist.length);
    
    const container = document.getElementById('blacklistTable');
    console.log('📦 [RENDER] Container blacklistTable encontrado:', !!container);
    if (!container) {
        console.error('❌ [RENDER] No se encontró elemento #blacklistTable');
        return;
    }
    
    // Si los datos aún no se han cargado, mostrar loader
    if (!dataLoaded) {
        console.log('⏳ [RENDER] Datos aún cargando, mostrando loader...');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #ff9800;"></i>
                <p style="margin-top: 1rem; color: #616161;">Cargando blacklist...</p>
            </div>
        `;
        return;
    }
    
    if (!blacklist.length) {
        console.log('⚠️ [RENDER] Sin blacklist, mostrando empty-state');
        container.innerHTML = '<div class="empty-state"><i class="fas fa-ban"></i><p>Blacklist vacía</p></div>';
        return;
    }
    container.innerHTML = blacklist.map(b => `
        <div class="system-item" style="color: #212121;">
            <span>${b.name || b.epc}</span>
            <span>${b.epc || '-'}</span>
        </div>
    `).join('');
    console.log('✅ [RENDER] Blacklist renderizada, longitud HTML:', container.innerHTML.length);
    console.log('✅ [RENDER] renderBlacklistTable completado exitosamente');
}

function renderAlertsTable() {
    console.log('🎨 [RENDER] Iniciando renderAlertsTable...');
    console.log('📊 [RENDER] Total alertas en array:', alerts.length);
    
    const container = document.getElementById('alertsTable');
    console.log('📦 [RENDER] Container alertsTable encontrado:', !!container);
    if (!container) {
        console.error('❌ [RENDER] No se encontró elemento #alertsTable');
        return;
    }
    
    // Si los datos aún no se han cargado, mostrar loader
    if (!dataLoaded) {
        console.log('⏳ [RENDER] Datos aún cargando, mostrando loader...');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #ff9800;"></i>
                <p style="margin-top: 1rem; color: #616161;">Cargando alertas...</p>
            </div>
        `;
        return;
    }
    
    if (!alerts.length) {
        console.log('⚠️ [RENDER] Sin alertas, mostrando empty-state');
        container.innerHTML = '<div class="empty-state"><i class="fas fa-bell"></i><p>Sin alertas</p></div>';
        return;
    }
    container.innerHTML = alerts.map(a => {
        const ts = a.timestamp?.toDate ? a.timestamp.toDate() : new Date();
        return `
            <div class="system-item" style="color: #212121;">
                <span>${a.type || 'Alerta'}</span>
                <span>${ts.toLocaleTimeString('es-MX')}</span>
            </div>
        `;
    }).join('');
    
    console.log('✅ [RENDER] Alertas renderizadas, longitud HTML:', container.innerHTML.length);
    
    const alertTotalEl = document.getElementById('alertsTotal');
    if (alertTotalEl) alertTotalEl.innerText = alerts.length;
    
    console.log('✅ [RENDER] renderAlertsTable completado exitosamente');
}

function renderLogsTable() {
    console.log('🎨 [RENDER] Iniciando renderLogsTable...');
    console.log('📊 [RENDER] Total logs en array:', logs.length);
    
    const container = document.getElementById('logsTable');
    console.log('📦 [RENDER] Container logsTable encontrado:', !!container);
    if (!container) {
        console.error('❌ [RENDER] No se encontró elemento #logsTable');
        return;
    }
    
    // Si los datos aún no se han cargado, mostrar loader
    if (!dataLoaded) {
        console.log('⏳ [RENDER] Datos aún cargando, mostrando loader...');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: #ff9800;"></i>
                <p style="margin-top: 1rem; color: #616161;">Cargando logs...</p>
            </div>
        `;
        return;
    }
    
    if (!logs.length) {
        console.log('⚠️ [RENDER] Sin logs, mostrando empty-state');
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Sin registros</p></div>';
        return;
    }
    container.innerHTML = logs.map(l => {
        const ts = l.timestamp?.toDate ? l.timestamp.toDate() : new Date();
        return `
            <div class="system-item" style="color: #212121;">
                <span>${l.message || l.type || 'Evento'}</span>
                <span>${ts.toLocaleTimeString('es-MX')}</span>
            </div>
        `;
    }).join('');
    
    console.log('✅ [RENDER] Logs renderizados, longitud HTML:', container.innerHTML.length);
    console.log('✅ [RENDER] renderLogsTable completado exitosamente');
}

/* ========================================
   INICIALIZACIÓN DE GRÁFICOS
   ======================================== */
function initCharts() {
    console.log('Inicializando gráficos con Chart.js...');
    const weeklyCtx = document.getElementById('weeklyChart');
    const accessTypeCtx = document.getElementById('accessTypeChart');
    const topUsersCtx = document.getElementById('topUsersChart');
    
    // Destruir gráficos existentes para evitar duplicados
    if (charts.weekly) charts.weekly.destroy();
    if (charts.accessType) charts.accessType.destroy();
    if (charts.topUsers) charts.topUsers.destroy();

    // Gráfico semanal con datos reales si existen
    if (weeklyCtx) {
        const weeklyData = calculateWeeklyAccess();
        charts.weekly = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{ 
                    label: 'Accesos', 
                    data: weeklyData,
                    backgroundColor: '#ff9800',
                    borderColor: '#f57c00',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Accesos por Día de la Semana' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
    
    // Gráfico de tipo de acceso
    if (accessTypeCtx) {
        const accessStats = calculateAccessStats();
        charts.accessType = new Chart(accessTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Permitidos', 'Denegados'],
                datasets: [{ 
                    data: [accessStats.granted, accessStats.denied], 
                    backgroundColor: ['#00c853', '#f44336'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'Tipos de Acceso' }
                }
            }
        });
    }
    
    // Gráfico de usuarios top
    if (topUsersCtx) {
        const topUsers = calculateTopUsers();
        charts.topUsers = new Chart(topUsersCtx, {
            type: 'bar',
            data: {
                labels: topUsers.labels,
                datasets: [{ 
                    label: 'Accesos', 
                    data: topUsers.data, 
                    backgroundColor: '#3949ab',
                    borderColor: '#1a237e',
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Usuarios Más Activos' }
                },
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    }
}

function calculateWeeklyAccess() {
    // Si hay logs, calcular datos reales
    if (logs.length > 0) {
        const weekData = [0, 0, 0, 0, 0, 0, 0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        logs.forEach(log => {
            const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
            if (date >= sevenDaysAgo) {
                const dayOfWeek = date.getDay();
                const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lunes = 0, Domingo = 6
                weekData[index]++;
            }
        });
        
        return weekData;
    }
    // Datos de ejemplo
    return [12, 19, 15, 17, 22, 18, 13];
}

function calculateAccessStats() {
    if (logs.length > 0) {
        const granted = logs.filter(l => l.status === 'granted' || l.status === 'allowed').length;
        const denied = logs.filter(l => l.status === 'denied' || l.status === 'blocked').length;
        return { granted, denied: denied || 1 };
    }
    return { granted: 85, denied: 15 };
}

function calculateTopUsers() {
    if (users.length > 0) {
        // Contar accesos por usuario basado en logs
        const userAccess = {};
        logs.forEach(log => {
            const userId = log.user_id || log.userId;
            if (userId) {
                userAccess[userId] = (userAccess[userId] || 0) + 1;
            }
        });
        
        // Ordenar y tomar top 5
        const sorted = Object.entries(userAccess)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        if (sorted.length > 0) {
            return {
                labels: sorted.map(([userId]) => {
                    const user = users.find(u => u.id === userId);
                    return user ? user.name.slice(0, 15) : 'Usuario';
                }),
                data: sorted.map(([, count]) => count)
            };
        }
    }
    
    return {
        labels: ['Usuario 1', 'Usuario 2', 'Usuario 3', 'Usuario 4', 'Usuario 5'],
        data: [25, 20, 15, 12, 10]
    };
}

/* ========================================
   EXPORTACIÓN DE DATOS
   ======================================== */
async function exportUsersExcel() {
    if (users.length === 0) {
        showNotification('⚠️ No hay usuarios para exportar', 'warning');
        return;
    }
    
    showNotification('📊 Generando Excel...', 'info');
    
    try {
        if (!window.ExcelJS) {
            throw new Error('Librería ExcelJS no disponible. Verifica la conexión.');
        }
        
        const currentDate = new Date().toLocaleDateString('es-MX', { 
            year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        
        const ExcelJS = window.ExcelJS;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Residentes', {
            views: [{ showGridLines: true }]
        });
        
        // Títulos
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = 'NEOSTECH - SISTEMA DE CONTROL DE ACCESO RFID';
        worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF1a237e' } };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.mergeCells('A2:F2');
        worksheet.getCell('A2').value = 'LISTADO DE RESIDENTES REGISTRADOS';
        worksheet.getCell('A2').font = { size: 14, bold: true };
        worksheet.getCell('A2').alignment = { horizontal: 'center' };
        
        worksheet.mergeCells('A3:F3');
        worksheet.getCell('A3').value = `Fecha de generación: ${currentDate}`;
        worksheet.getCell('A3').font = { size: 10, italic: true };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };
        
        // Encabezados
        const headers = ['Nombre', 'Departamento', 'Teléfono', 'Vehículo', 'Tags RFID', 'Estado'];
        worksheet.getRow(5).values = headers;
        worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1a237e' }
        };
        worksheet.getRow(5).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Datos
        users.forEach((u, index) => {
            const row = worksheet.getRow(6 + index);
            row.values = [
                u.name || '',
                u.departamento || '',
                u.phone || '',
                u.vehicle || '',
                (u.tags || []).map(t => t.slice(-8)).join('; '),
                u.active ? 'Activo' : 'Inactivo'
            ];
            
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: index % 2 === 0 ? 'FFFFFFFF' : 'FFF5F7FA' }
            };
            
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                };
            });
        });
        
        // Anchos de columnas
        worksheet.getColumn(1).width = 25;
        worksheet.getColumn(2).width = 20;
        worksheet.getColumn(3).width = 15;
        worksheet.getColumn(4).width = 12;
        worksheet.getColumn(5).width = 30;
        worksheet.getColumn(6).width = 10;
        
        // Exportar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NeosTech_Residentes_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('✅ Excel generado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando Excel:', error);
        showNotification('❌ Error al generar Excel: ' + error.message, 'danger');
    }
}

async function exportUsersPDF() {
    if (users.length === 0) {
        showNotification('⚠️ No hay usuarios para exportar', 'warning');
        return;
    }
    
    showNotification('📄 Generando PDF...', 'info');
    
    const currentDate = new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    
    try {
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF) {
            throw new Error('jsPDF no disponible');
        }
        
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Encabezado
        doc.setFontSize(18);
        doc.setTextColor(26, 35, 126);
        doc.text('NEOSTECH - SISTEMA DE CONTROL DE ACCESO RFID', pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('LISTADO DE RESIDENTES REGISTRADOS', pageWidth / 2, 23, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Fecha de generación: ${currentDate}`, pageWidth / 2, 30, { align: 'center' });
        
        // Tabla
        const headers = ['NOMBRE', 'DEPARTAMENTO', 'TELÉFONO', 'VEHÍCULO', 'TAGS RFID', 'ESTADO'];
        const data = users.map(u => [
            u.name || '',
            u.departamento || '',
            u.phone || '',
            u.vehicle || '',
            (u.tags || []).map(t => t.slice(-8)).join('; '),
            u.active ? 'Activo' : 'Inactivo'
        ]);
        
        doc.autoTable({
            startY: 35,
            head: [headers],
            body: data,
            theme: 'grid',
            headStyles: { 
                fillColor: [26, 35, 126], 
                textColor: 255, 
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: { 
                fontSize: 9, 
                cellPadding: 3
            }
        });
        
        doc.save(`NeosTech_Residentes_${new Date().toISOString().slice(0,10)}.pdf`);
        showNotification('✅ PDF generado exitosamente', 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showNotification('❌ Error al generar PDF: ' + error.message, 'danger');
    }
}

/* ========================================
   CONTROL DE ACCESOS
   ======================================== */
/**
 * Abrir portón/puerta manualmente
 */
async function openGate(accessPointId) {
    const now = new Date();
    const accessPointNames = {
        'porton_triwe': 'Portón Triwe',
        'porton_trasero': 'Portón Trasero',
        'porton_garage': 'Portón Garage',
        'puerta_principal': 'Puerta Entrada Principal',
        'puerta_reuniones': 'Puerta Sala Reuniones',
        'puerta_parking': 'Puerta Estacionamiento'
    };
    const accessPointName = accessPointNames[accessPointId] || accessPointId;
    
    showNotification(`🔓 Abriendo ${accessPointName}...`, 'info');
    
    try {
        // Registrar evento de apertura manual en rfid_tags
        const eventDoc = await db.collection('rfid_events').add({
            event_type: 'manual_open',
            access_point_id: accessPointId,
            access_point_name: accessPointName,
            user_name: currentUser ? currentUser.email : 'Dashboard Manual',
            user_id: currentUser ? currentUser.uid : null,
            user_email: currentUser ? currentUser.email : null,
            action: 'open',
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            client_timestamp: now,
            access_granted: true,
            granted: true,
            reader_id: accessPointId,
            location: accessPointName,
            source: 'dashboard_manual',
            clientId: window.currentUserClientId
        });
        
        // También registrar en gate_commands para compatibilidad
        await db.collection('gate_commands').add({
            gate_id: accessPointId,
            gate_name: accessPointName,
            action: 'open',
            user: currentUser ? currentUser.email : 'Dashboard',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`✅ ${accessPointName} - Comando enviado al Gateway`, 'success');
        
        // Actualizar historial visual
        updateAccessHistory(accessPointName, now);
        
    } catch (error) {
        console.error('Error al crear evento:', error);
        
        // Manejo específico de errores de permisos
        if (error.code === 'permission-denied') {
            showNotification('❌ Permisos insuficientes. Verifica las reglas de Firestore para rfid_tags y gate_commands', 'danger');
        } else {
            showNotification(`❌ Error: ${error.message}`, 'danger');
        }
    }
}

/**
 * Actualizar historial visual de acciones
 */
function updateAccessHistory(accessPointName, timestamp) {
    const container = document.getElementById('accessHistoryContainer');
    if (!container) return;
    
    // Quitar empty state si existe
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    
    // Agregar nueva acción al inicio
    const item = document.createElement('div');
    item.className = 'system-item';
    item.style.marginBottom = '10px';
    item.innerHTML = `
        <span><i class="fas fa-door-open" style="color: #00c853;"></i> ${accessPointName}</span>
        <span style="color: #64748b; font-size: 13px;">${timestamp.toLocaleTimeString('es-MX')}</span>
    `;
    container.prepend(item);
    
    // Limitar a 10 items
    while (container.children.length > 10) {
        container.removeChild(container.lastChild);
    }
}

/**
 * Cargar historial de acciones desde Firebase
 * SOLUCIÓN: No usar where() para evitar índice compuesto requerido
 */
async function loadAccessHistory() {
    try {
        // Cargar últimos 50 eventos y filtrar en cliente (no requiere índice)
        const snapshot = await db.collection('rfid_events')
            .where('clientId', '==', window.currentUserClientId)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        const container = document.getElementById('accessHistoryContainer');
        if (!container) return;
        
        // Filtrar solo eventos de apertura manual
        const manualOpenEvents = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.event_type === 'manual_open' || data.source === 'dashboard_manual';
        });
        
        // Limpiar contenedor
        container.innerHTML = '';
        
        if (manualOpenEvents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <p>No hay acciones recientes de apertura manual</p>
                </div>
            `;
            return;
        }
        
        // Renderizar primeros 10 eventos filtrados
        manualOpenEvents.slice(0, 10).forEach(doc => {
            const data = doc.data();
            const timestamp = data.timestamp?.toDate() || new Date();
            
            const item = document.createElement('div');
            item.className = 'system-item';
            item.style.marginBottom = '10px';
            item.innerHTML = `
                <span><i class="fas fa-door-open" style="color: #00c853;"></i> ${data.access_point_name || data.access_point_id}</span>
                <span style="color: #64748b; font-size: 13px;">${timestamp.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'})}</span>
            `;
            container.appendChild(item);
        });
        
        console.log(`✅ ${manualOpenEvents.length} acciones de apertura manual encontradas, mostrando ${Math.min(manualOpenEvents.length, 10)}`);
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        const container = document.getElementById('accessHistoryContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar historial: ${error.message}</p>
                </div>
            `;
        }
    }
}

/**
 * Mostrar configuración avanzada de dispositivo
 */
function showDeviceSettings(deviceId) {
    const deviceNames = {
        'porton_triwe': 'Portón Triwe',
        'porton_trasero': 'Portón Trasero',
        'porton_garage': 'Portón Garage',
        'puerta_principal': 'Puerta Entrada Principal',
        'puerta_reuniones': 'Puerta Sala Reuniones',
        'puerta_parking': 'Puerta Estacionamiento'
    };
    
    showNotification(`⚙️ Configuración avanzada de ${deviceNames[deviceId] || deviceId} - Próximamente`, 'info');
    console.log('🔧 Device settings requested for:', deviceId);
}

/**
 * Mostrar modal de configuración de puntos de acceso
 */
function showAccessPointConfigModal() {
    showNotification('⚙️ Configuración de puntos de acceso - Próximamente', 'info');
    console.log('🔧 Access point configuration modal requested');
}

function saveReaderConfig() {
    showNotification('Configuración del lector guardada (pendiente implementación backend)', 'info');
}

function setLastUpdate() {
    const el = document.getElementById('last-update');
    if (el) el.textContent = new Date().toLocaleTimeString('es-MX');
    const cfg = document.getElementById('last-update-config');
    if (cfg) cfg.textContent = new Date().toLocaleString('es-MX');
}

/* ========================================
   GESTIÓN DE USUARIOS - MODAL & CRUD
   ======================================== */
function showAddUserModal() {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('modalTitle');
    
    if (!modal || !title) return;
    
    title.textContent = '👤 Nuevo Residente';
    
    // Limpiar todos los campos
    document.getElementById('userId').value = '';
    document.getElementById('userName').value = '';
    document.getElementById('userDepartamento').value = '';
    document.getElementById('userBlock').value = '1';
    document.getElementById('userPhone').value = '';
    document.getElementById('userEmail').value = '';
    document.getElementById('userVehicle').value = '';
    document.getElementById('userTags').value = '';
    document.getElementById('userActive').checked = true;
    
    clearTagsContainer();
    
    modal.style.display = 'flex';
}

function closeUserModal() {
    const modal = document.getElementById('userModal');
    if (modal) modal.style.display = 'none';
}

function clearTagsContainer() {
    const container = document.getElementById('tagsContainer');
    if (container) {
        container.innerHTML = '<span style="color: #94a3b8; font-size: 13px;" id="tagsPlaceholder">No hay tags agregados</span>';
    }
    const hiddenInput = document.getElementById('userTags');
    if (hiddenInput) hiddenInput.value = '';
}

async function addTag() {
    const input = document.getElementById('newTagInput');
    const tagId = input.value.trim();
    
    if (!tagId) {
        showNotification('⚠️ Ingresa un Tag ID', 'warning');
        return;
    }
    
    // Validar formato (24 caracteres hexadecimales)
    if (!/^[0-9A-Fa-f]{24}$/.test(tagId)) {
        showNotification('🏷️ Tag ID debe tener 24 caracteres hexadecimales', 'warning');
        return;
    }
    
    // Obtener tags actuales
    const hiddenInput = document.getElementById('userTags');
    const currentTags = hiddenInput.value ? hiddenInput.value.split(',').map(t => t.trim()) : [];
    
    // Verificar si ya existe
    if (currentTags.includes(tagId)) {
        showNotification('⚠️ Este tag ya está agregado', 'warning');
        return;
    }
    
    // Verificar duplicados en Firestore
    try {
        const currentUserId = document.getElementById('userId').value;
        const snapshot = await db.collection('users')
            .where('clientId', '==', window.currentUserClientId)
            .where('tags', 'array-contains', tagId)
            .get();
        
        if (!snapshot.empty) {
            const existingUser = snapshot.docs[0].data();
            const existingUserId = snapshot.docs[0].id;
            
            if (existingUserId !== currentUserId) {
                showNotification(`⚠️ Este tag ya está asignado a ${existingUser.name}`, 'warning');
                return;
            }
        }
    } catch (error) {
        console.error('Error verificando tag:', error);
        showNotification('❌ Error al verificar el tag', 'danger');
        return;
    }
    
    // Agregar tag
    currentTags.push(tagId);
    hiddenInput.value = currentTags.join(', ');
    
    // Renderizar tags
    renderTags(currentTags);
    
    // Limpiar input
    input.value = '';
    showNotification('✅ Tag agregado', 'success');
}

function renderTags(tags) {
    const container = document.getElementById('tagsContainer');
    if (!container) return;
    
    if (!tags || tags.length === 0) {
        clearTagsContainer();
        return;
    }
    
    container.innerHTML = tags.map(tagId => `
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: linear-gradient(135deg, #ff9800, #ffb74d); color: white; border-radius: 6px; font-size: 12px; font-weight: 500;">
            <i class="fas fa-tag"></i>
            <span>...${tagId.slice(-8)}</span>
            <button type="button" onclick="removeTag('${tagId}')" style="background: none; border: none; color: white; cursor: pointer; padding: 0; margin-left: 4px;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeTag(tagId) {
    const hiddenInput = document.getElementById('userTags');
    const currentTags = hiddenInput.value.split(',').map(t => t.trim()).filter(t => t !== tagId);
    hiddenInput.value = currentTags.join(', ');
    renderTags(currentTags);
    showNotification('🗑️ Tag eliminado', 'info');
}

async function saveUser() {
    const userId = document.getElementById('userId').value;
    const name = document.getElementById('userName').value.trim();
    const deptNum = document.getElementById('userDepartamento').value.trim();
    const block = document.getElementById('userBlock').value;
    const phone = document.getElementById('userPhone').value.trim();
    const vehicle = document.getElementById('userVehicle').value.trim();
    const tagsStr = document.getElementById('userTags').value.trim();
    const active = document.getElementById('userActive').checked;
    
    // Validaciones
    if (!name) {
        showNotification('⚠️ El nombre es requerido', 'warning');
        return;
    }
    
    if (!deptNum) {
        showNotification('⚠️ El número de departamento es requerido', 'warning');
        return;
    }
    
    const departamento = `${block}-${deptNum}`;
    
    // Verificar duplicados
    const duplicateUser = users.find(u => 
        u.block === block && 
        u.unit === deptNum && 
        u.id !== userId
    );
    
    if (duplicateUser) {
        showNotification(`⚠️ Ya existe un usuario (${duplicateUser.name}) en Block ${block}-${deptNum}`, 'warning');
        return;
    }
    
    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];
    
    // Validar tags
    if (tags.length > 0) {
        for (const tag of tags) {
            if (!/^[0-9A-Fa-f]{24}$/.test(tag)) {
                showNotification(`🏷️ Tag inválido: ${tag}. Debe tener 24 caracteres hexadecimales`, 'warning');
                return;
            }
        }
        
        // Verificar duplicados en Firestore
        try {
            for (const tagId of tags) {
                const snapshot = await db.collection('users')
                    .where('clientId', '==', window.currentUserClientId)
                    .where('tags', 'array-contains', tagId)
                    .get();
                
                if (!snapshot.empty) {
                    const existingUserId = snapshot.docs[0].id;
                    if (existingUserId !== userId) {
                        const existingUser = snapshot.docs[0].data();
                        showNotification(`⚠️ El tag ${tagId.slice(-8)} ya está asignado a ${existingUser.name}`, 'warning');
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Error validando tags:', error);
            showNotification('❌ Error al validar tags', 'danger');
            return;
        }
    }
    
    try {
        showNotification('💾 Guardando usuario...', 'info');
        
        const userData = {
            name: name,
            departamento: departamento,
            block: block,
            unit: deptNum,
            phone: phone,
            vehicle: vehicle,
            tags: tags,
            active: active,
            updated_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_by: currentUser?.email || 'dashboard',
            clientId: window.currentUserClientId
        };
        
        if (userId) {
            // Actualizar
            await db.collection('users').doc(userId).update(userData);
            showNotification('✅ Usuario actualizado exitosamente', 'success');
        } else {
            // Crear nuevo
            userData.created_at = firebase.firestore.FieldValue.serverTimestamp();
            userData.created_by = currentUser?.email || 'dashboard';
            await db.collection('users').add(userData);
            showNotification('✅ Usuario creado exitosamente', 'success');
        }
        
        // Actualizar whitelist
        if (tags.length > 0) {
            await Promise.all(tags.map(tagId => 
                db.collection('whitelist').doc(tagId).set({
                    tag_id: tagId,
                    user_name: name,
                    departamento: departamento,
                    added_at: firebase.firestore.FieldValue.serverTimestamp(),
                    added_by: currentUser?.email || 'dashboard',
                    clientId: window.currentUserClientId,
                    active: active
                })
            ));
        }
        
        closeUserModal();
        
        // Recargar usuarios
        await new Promise(resolve => setTimeout(resolve, 300));
        await loadUsers();
        renderUsersTable();
        
    } catch (error) {
        console.error('Error guardando usuario:', error);
        showNotification('❌ Error al guardar usuario: ' + error.message, 'danger');
    }
}

async function deleteUser(userId) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
        showNotification('🗑️ Eliminando usuario...', 'info');
        await db.collection('users').doc(userId).delete();
        showNotification('✅ Usuario eliminado', 'success');
        await loadUsers();
        renderUsersTable();
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showNotification('❌ Error al eliminar usuario: ' + error.message, 'danger');
    }
}

async function cleanEmptyUsers() {
    if (!confirm('¿Eliminar todos los usuarios sin nombre o con datos vacíos?\n\nEsta acción NO eliminará usuarios tipo admin/system.')) return;
    
    try {
        showNotification('🧹 Buscando usuarios vacíos...', 'info');
        
        const snapshot = await db.collection('users').where('clientId', '==', window.currentUserClientId).get();
        let deleted = 0;
        
        for (const doc of snapshot.docs) {
            const user = doc.data();
            const type = (user.type || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            
            // NO eliminar admins/system
            if (type === 'admin' || type === 'system' || email.includes('admin')) {
                continue;
            }
            
            // Eliminar si no tiene nombre O si todos los campos clave están vacíos
            const isEmpty = !user.name || 
                (!user.name && !user.departamento && !user.phone && !user.vehicle && (!user.tags || user.tags.length === 0));
            
            if (isEmpty) {
                await db.collection('users').doc(doc.id).delete();
                deleted++;
            }
        }
        
        if (deleted > 0) {
            showNotification(`✅ ${deleted} usuario(s) vacío(s) eliminado(s)`, 'success');
            await loadUsers();
            renderUsersTable();
        } else {
            showNotification('ℹ️ No se encontraron usuarios vacíos', 'info');
        }
        
    } catch (error) {
        console.error('Error limpiando usuarios:', error);
        showNotification('❌ Error al limpiar usuarios: ' + error.message, 'danger');
    }
}

async function editUser(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            showNotification('❌ Usuario no encontrado', 'danger');
            return;
        }
        
        const user = userDoc.data();
        const modal = document.getElementById('userModal');
        const title = document.getElementById('modalTitle');
        
        if (!modal || !title) return;
        
        title.textContent = '✏️ Editar Residente';
        
        document.getElementById('userId').value = userId;
        document.getElementById('userName').value = user.name || '';
        document.getElementById('userDepartamento').value = user.unit || '';
        document.getElementById('userBlock').value = user.block || '1';
        document.getElementById('userPhone').value = user.phone || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userVehicle').value = user.vehicle || '';
        document.getElementById('userTags').value = (user.tags || []).join(', ');
        document.getElementById('userActive').checked = user.active !== false;
        
        renderTags(user.tags || []);
        
        modal.style.display = 'flex';
    } catch (error) {
        console.error('Error cargando usuario:', error);
        showNotification('❌ Error al cargar usuario', 'danger');
    }
}

/* ========================================
   LIMPIEZA AL SALIR
   ======================================== */
window.addEventListener('beforeunload', function() {
    // Detener listeners en tiempo real
    realtimeListeners.forEach(listener => listener());
});

/* ========================================
   EXPONER FUNCIONES GLOBALES
   ======================================== */
// Asegurar que todas las funciones llamadas desde HTML estén disponibles
window.switchTab = switchTab;
window.performLogin = performLogin;
window.logout = logout;
window.loadRFIDTags = loadRFIDTags;
window.filterTags = filterTags;
window.showAccessPointConfigModal = showAccessPointConfigModal;
window.showDeviceSettings = showDeviceSettings;
window.openGate = openGate;
window.showAddUserModal = showAddUserModal;
window.exportUsersExcel = exportUsersExcel;
window.exportUsersPDF = exportUsersPDF;
window.cleanEmptyUsers = cleanEmptyUsers;
window.cleanupUIAfterLogout = cleanupUIAfterLogout;
window.applyRoleRestrictions = applyRoleRestrictions;
window.filterUsers = filterUsers;
window.deleteAllUsers = deleteAllUsers;
window.createTestUsers = createTestUsers;
window.formatChileanPlate = formatChileanPlate;
window.validateChileanPlate = validateChileanPlate;
window.saveReaderConfig = saveReaderConfig;
window.addTag = addTag;
window.removeTag = removeTag;
window.closeUserModal = closeUserModal;
window.saveUser = saveUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.renderUsersTable = renderUsersTable;
window.renderWhitelistTable = renderWhitelistTable;
window.renderBlacklistTable = renderBlacklistTable;
window.renderAlertsTable = renderAlertsTable;
window.renderLogsTable = renderLogsTable;
window.loadUsers = loadUsers;
window.loadAlerts = loadAlerts;
window.loadLogs = loadLogs;
window.loadWhitelist = loadWhitelist;
window.loadBlacklist = loadBlacklist;
window.showNotification = showNotification;
window.initCharts = initCharts;

// FASE 7: Utilidades Complementarias (20 funciones)
window.debounce = debounce;
window.throttle = throttle;
window.copyToClipboard = copyToClipboard;
window.downloadJSON = downloadJSON;
window.uploadFile = uploadFile;
window.validateEmail = validateEmail;
window.sanitizeInput = sanitizeInput;
window.generateRandomId = generateRandomId;
window.parseQueryParams = parseQueryParams;
window.showSection = showSection;
window.hideSection = hideSection;
window.updateBreadcrumb = updateBreadcrumb;
window.scrollToSection = scrollToSection;
window.highlightActiveTab = highlightActiveTab;
window.initNavigation = initNavigation;
window.requestNotificationPermission = requestNotificationPermission;
window.saveFCMToken = saveFCMToken;
window.sendPushNotification = sendPushNotification;
window.sendBulkNotifications = sendBulkNotifications;
window.onMessageListener = onMessageListener;
window.testNotification = testNotification;

// FASE 6: Navegación, Notificaciones Push y Utilidades
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.initPushNotifications = initPushNotifications;
window.getAlertSound = getAlertSound;
window.showInAppNotification = showInAppNotification;
window.confirmAlertReception = confirmAlertReception;
window.showNotificationBanner = showNotificationBanner;
window.loadSubscribersCount = loadSubscribersCount;
window.showQRModal = showQRModal;
window.closeQRModal = closeQRModal;
window.loadQRStats = loadQRStats;
window.copyRegistrationLink = copyRegistrationLink;
window.downloadQR = downloadQR;
window.printQR = printQR;
window.formatTimeAgo = formatTimeAgo;
window.formatChileanPlate = formatChileanPlate;
window.validateChileanPlate = validateChileanPlate;

// FASE 5: Gráficos, Logs y Exportación
window.updateCharts = updateCharts;
window.createHourlyChart = createHourlyChart;
window.createWeeklyChart = createWeeklyChart;
window.createAccessTypeChart = createAccessTypeChart;
window.createTopUsersChart = createTopUsersChart;
window.generateSampleChartData = generateSampleChartData;
window.renderLogs = renderLogs;
window.addGuardComment = addGuardComment;
window.saveGuardComment = saveGuardComment;
window.deleteGuardComment = deleteGuardComment;
window.filterLogs = filterLogs;
window.exportLogsExcel = exportLogsExcel;
window.exportLogsPDF = exportLogsPDF;
window.exportVehiclesExcel = exportVehiclesExcel;
window.exportVehiclesPDF = exportVehiclesPDF;
window.exportUsersExcel = exportUsersExcel;
window.exportUsersPDF = exportUsersPDF;
window.generatePDFWithLogo = generatePDFWithLogo;

// FASE 4: Control de Acceso y Dispositivos
window.loadBlocks = loadBlocks;
window.toggleBlock = toggleBlock;
window.addBlock = addBlock;
window.loadDepartments = loadDepartments;
window.filterDepartmentsByBlock = filterDepartmentsByBlock;
window.addDepartment = addDepartment;
window.closeDepartmentModal = closeDepartmentModal;
window.saveDepartment = saveDepartment;
window.toggleDepartmentOccupied = toggleDepartmentOccupied;
window.deleteDepartment = deleteDepartment;
window.loadAccessPoints = loadAccessPoints;
window.addAccessPoint = addAccessPoint;
window.saveAccessPoint = saveAccessPoint;
window.editAccessPoint = editAccessPoint;
window.toggleAccessPoint = toggleAccessPoint;
window.deleteAccessPoint = deleteAccessPoint;
window.showAccessPointConfigModal = showAccessPointConfigModal;
window.closeAccessPointConfigModal = closeAccessPointConfigModal;
window.showAddAccessPointForm = showAddAccessPointForm;
window.cancelAccessPointForm = cancelAccessPointForm;
window.loadAccessPointsList = loadAccessPointsList;
window.showDeviceSettings = showDeviceSettings;
window.closeDeviceSettingsModal = closeDeviceSettingsModal;
window.loadDeviceConfig = loadDeviceConfig;
window.saveDeviceSettings = saveDeviceSettings;
window.testDeviceConnection = testDeviceConnection;
window.readDeviceInfo = readDeviceInfo;
window.resetDevice = resetDevice;
window.escapeHtml = escapeHtml;

// FASE 3: Sistema de Alertas
window.initAlertTemplates = initAlertTemplates;
window.initEmergencyAlerts = initEmergencyAlerts;
window.generateFloorsGrid = generateFloorsGrid;
window.autoFillAlertMessage = autoFillAlertMessage;
window.loadActiveAlerts = loadActiveAlerts;
window.renderActiveAlerts = renderActiveAlerts;
window.getAlertIcon = getAlertIcon;
window.loadTotalAlertsCount = loadTotalAlertsCount;
window.listenToActiveAlerts = listenToActiveAlerts;
window.openNewAlertModal = openNewAlertModal;
window.selectAllBlocks = selectAllBlocks;
window.clearAllBlocks = clearAllBlocks;
window.loadAlertTemplate = loadAlertTemplate;
window.closeNewAlertModal = closeNewAlertModal;
window.previewAlert = previewAlert;
window.emitAlert = emitAlert;
window.viewAlertDetails = viewAlertDetails;
window.confirmCancelAlert = confirmCancelAlert;
window.closeCancelAlertModal = closeCancelAlertModal;
window.executeCancelAlert = executeCancelAlert;
window.activateAllSubscribers = activateAllSubscribers;
window.debugSubscribers = debugSubscribers;
window.cleanOldSubscribers = cleanOldSubscribers;
window.loadSubscribersCount = loadSubscribersCount;
window.showQRModal = showQRModal;
window.closeQRModal = closeQRModal;
window.loadQRStats = loadQRStats;
window.copyRegistrationLink = copyRegistrationLink;
window.downloadQR = downloadQR;
window.printQR = printQR;

// FASE 2: RFID y Listas
window.initLiveTagReading = initLiveTagReading;
window.displayLiveTag = displayLiveTag;
window.showRegisterTagModal = showRegisterTagModal;
window.switchRegisterTab = switchRegisterTab;
window.saveTagAssignment = saveTagAssignment;
window.closeRegisterTagModal = closeRegisterTagModal;
window.updateDepartmentNumber = updateDepartmentNumber;
window.clearLiveTags = clearLiveTags;
window.sortLiveTags = sortLiveTags;
window.prevLiveTagsPage = prevLiveTagsPage;
window.nextLiveTagsPage = nextLiveTagsPage;
window.renderLiveTagsPage = renderLiveTagsPage;
window.createLiveTagElement = createLiveTagElement;
window.updateLiveTagsPagination = updateLiveTagsPagination;
window.initializeLiveTagsPagination = initializeLiveTagsPagination;
window.loadLists = loadLists;
window.switchListView = switchListView;
window.filterAuthorizedTags = filterAuthorizedTags;
window.filterDeniedTags = filterDeniedTags;
window.filterUnregisteredTags = filterUnregisteredTags;
window.loadUnregisteredTags = loadUnregisteredTags;
window.showAddToWhitelistModal = showAddToWhitelistModal;
window.showAddToBlacklistModal = showAddToBlacklistModal;
window.addToBlacklist = addToBlacklist;
window.toggleUnregisteredSelection = toggleUnregisteredSelection;
window.toggleWhitelistSelection = toggleWhitelistSelection;
window.toggleBlacklistSelection = toggleBlacklistSelection;
window.moveSelectedToBlacklist = moveSelectedToBlacklist;
window.moveSelectedToWhitelist = moveSelectedToWhitelist;
window.grantTemporaryAccess = grantTemporaryAccess;
window.saveTempAccess = saveTempAccess;
window.assignUserToSelectedTag = assignUserToSelectedTag;
window.moveToBlacklist = moveToBlacklist;
window.removeFromBlacklist = removeFromBlacklist;

/* ========================================
   FUNCIONES AUXILIARES
   ======================================== */

/**
 * Obtiene los tags filtrados según el filtro activo
 */
function getFilteredLiveTags() {
    if (currentLiveTagsFilter === 'all') {
        return liveTagsArray;
    } else if (currentLiveTagsFilter === 'granted') {
        return liveTagsArray.filter(tag => tag.isGranted);
    } else if (currentLiveTagsFilter === 'denied') {
        return liveTagsArray.filter(tag => !tag.isGranted);
    }
    return liveTagsArray;
}

/**
 * Actualiza el contador de tags en vivo
 */
function updateLiveTagsCount() {
    const countEl = document.getElementById('liveTagsCount');
    if (countEl) {
        const filteredCount = getFilteredLiveTags().length;
        countEl.textContent = filteredCount;
    }
}

/**
 * Formatea un timestamp de Firestore
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    
    let date;
    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        return 'N/A';
    }
    
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/* ============================================
   FASE 7: UTILIDADES COMPLEMENTARIAS
   20 funciones adicionales (helpers y utilities)
   ============================================ */

// ===== PERFORMANCE UTILITIES (2 funciones) =====

/**
 * Debounce - Limita la frecuencia de ejecución de una función
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle - Ejecuta una función máximo 1 vez por periodo
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Tiempo mínimo entre ejecuciones en ms
 * @returns {Function} Función throttled
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== FILE OPERATIONS (3 funciones) =====

/**
 * Copiar texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} True si se copió exitosamente
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                textArea.remove();
                return true;
            } catch (err) {
                console.error('Error copiando al portapapeles:', err);
                textArea.remove();
                return false;
            }
        }
    } catch (err) {
        console.error('Error en copyToClipboard:', err);
        return false;
    }
}

/**
 * Descargar objeto como archivo JSON
 * @param {Object} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 */
function downloadJSON(data, filename = 'data.json') {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Helper para subir archivo con validación
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<File>} Archivo seleccionado
 */
async function uploadFile(options = {}) {
    const {
        accept = '*/*',
        maxSizeMB = 10,
        onProgress = null
    } = options;

    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            
            if (!file) {
                reject(new Error('No se seleccionó archivo'));
                return;
            }
            
            const sizeMB = file.size / (1024 * 1024);
            if (sizeMB > maxSizeMB) {
                reject(new Error(`Archivo demasiado grande. Máximo ${maxSizeMB}MB`));
                return;
            }
            
            if (onProgress) {
                onProgress({ loaded: file.size, total: file.size, file });
            }
            
            resolve(file);
        };
        
        input.click();
    });
}

// ===== VALIDATION (2 funciones) =====

/**
 * Validar formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Sanitizar input para prevenir XSS
 * @param {string} input - Texto a sanitizar
 * @returns {string} Texto limpio
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ===== GENERATORS (2 funciones) =====

/**
 * Generar ID único aleatorio
 * @param {number} length - Longitud del ID
 * @returns {string} ID generado
 */
function generateRandomId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Parsear parámetros de URL
 * @param {string} url - URL a parsear (opcional, usa window.location por defecto)
 * @returns {Object} Objeto con parámetros
 */
function parseQueryParams(url = window.location.href) {
    const params = {};
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return params;
}

// ===== UI HELPERS (6 funciones) =====

/**
 * Mostrar sección con animación
 * @param {string} sectionId - ID de la sección
 */
function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
        setTimeout(() => {
            section.style.opacity = '1';
            section.style.transform = 'translateY(0)';
        }, 10);
    }
}

/**
 * Ocultar sección con animación
 * @param {string} sectionId - ID de la sección
 */
function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.opacity = '0';
        section.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            section.style.display = 'none';
        }, 300);
    }
}

/**
 * Actualizar breadcrumb de navegación
 * @param {Array<Object>} items - Array de {label, link}
 */
function updateBreadcrumb(items) {
    const breadcrumbEl = document.getElementById('breadcrumb');
    if (!breadcrumbEl) return;
    
    breadcrumbEl.innerHTML = items.map((item, index) => {
        const isLast = index === items.length - 1;
        if (isLast) {
            return `<span class="breadcrumb-item active">${item.label}</span>`;
        } else {
            return `<a href="${item.link}" class="breadcrumb-item">${item.label}</a>`;
        }
    }).join(' <span class="breadcrumb-separator">/</span> ');
}

/**
 * Scroll suave a sección
 * @param {string} sectionId - ID de la sección
 * @param {number} offset - Offset en px (para headers fijos)
 */
function scrollToSection(sectionId, offset = 80) {
    const section = document.getElementById(sectionId);
    if (section) {
        const y = section.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }
}

/**
 * Resaltar tab activo
 * @param {string} tabId - ID del tab
 */
function highlightActiveTab(tabId) {
    document.querySelectorAll('.tab-button, .sidebar-item').forEach(el => {
        el.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

/**
 * Inicializar sistema de navegación
 */
function initNavigation() {
    // Event listeners para navegación
    document.querySelectorAll('[data-tab]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
            highlightActiveTab(tabId);
        });
    });
    
    // Manejar navegación por URL params
    const params = parseQueryParams();
    if (params.tab) {
        switchTab(params.tab);
        highlightActiveTab(params.tab);
    }
    
    console.log('✅ Sistema de navegación inicializado');
}

// ===== PUSH NOTIFICATIONS HELPERS (5 funciones) =====

/**
 * Solicitar permisos de notificación
 * @returns {Promise<string>} Estado del permiso
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Este navegador no soporta notificaciones');
        return 'denied';
    }
    
    const permission = await Notification.requestPermission();
    console.log(`Permiso de notificaciones: ${permission}`);
    
    if (permission === 'granted') {
        showNotification('✅ Notificaciones activadas', 'success');
    } else if (permission === 'denied') {
        showNotification('🚫 Notificaciones bloqueadas', 'error');
    }
    
    return permission;
}

/**
 * Guardar token FCM en Firestore
 * @param {string} token - Token FCM
 * @param {string} userId - ID del usuario
 * @returns {Promise<void>}
 */
async function saveFCMToken(token, userId) {
    try {
        await db.collection('users').doc(userId).update({
            fcm_token: token,
            fcm_token_updated: firebase.firestore.FieldValue.serverTimestamp(),
            notifications_enabled: true,
            device_info: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        });
        console.log('✅ Token FCM guardado en Firestore');
    } catch (error) {
        console.error('Error guardando token FCM:', error);
        throw error;
    }
}

/**
 * Enviar notificación push (via Cloud Function)
 * @param {Object} notification - Datos de la notificación
 * @returns {Promise<Object>} Resultado del envío
 */
async function sendPushNotification(notification) {
    const {
        title,
        body,
        token,
        data = {},
        imageUrl = null
    } = notification;
    
    try {
        const response = await fetch('https://us-central1-neos-tech.cloudfunctions.net/sendPushNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                body,
                token,
                data,
                imageUrl
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Notificación enviada:', result);
        } else {
            console.error('❌ Error enviando notificación:', result.error);
        }
        
        return result;
    } catch (error) {
        console.error('Error en sendPushNotification:', error);
        throw error;
    }
}

/**
 * Enviar notificaciones en lote
 * @param {Array<Object>} notifications - Array de notificaciones
 * @returns {Promise<Object>} Resultados del envío
 */
async function sendBulkNotifications(notifications) {
    try {
        const response = await fetch('https://us-central1-neos-tech.cloudfunctions.net/sendBulkNotifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notifications })
        });
        
        const result = await response.json();
        console.log(`📊 Notificaciones enviadas: ${result.successCount}/${notifications.length}`);
        return result;
    } catch (error) {
        console.error('Error en sendBulkNotifications:', error);
        throw error;
    }
}

/**
 * Listener para mensajes FCM en foreground
 * @param {Function} callback - Callback a ejecutar cuando llega mensaje
 */
function onMessageListener(callback) {
    if (!messagingInstance) {
        console.error('Firebase Messaging no inicializado');
        return;
    }
    
    messagingInstance.onMessage((payload) => {
        console.log('🔔 Mensaje FCM recibido:', payload);
        
        if (typeof callback === 'function') {
            callback(payload);
        }
        
        // Mostrar notificación en navegador si está disponible
        if ('Notification' in window && Notification.permission === 'granted') {
            const { title, body } = payload.notification || {};
            if (title) {
                new Notification(title, {
                    body: body || '',
                    icon: '/assets/images/neostechc.png',
                    badge: '/assets/images/neostechc.png',
                    tag: 'fcm-notification',
                    requireInteraction: false
                });
            }
        }
    });
}

/**
 * Enviar notificación de prueba al usuario actual
 */
async function testNotification() {
    if (!currentUser) {
        showNotification('⚠️ Usuario no autenticado', 'warning');
        return;
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get().then((userDoc) => {
            const userData = userDoc.data();
            userRole = userData.role || 'resident';
            currentUserClientId = userData.clientId;   // ← AÑADIR ESTA LÍNEA
            console.log('✅ Tenant cargado:', currentUserClientId);
        });;
        const userData = userDoc.data();
        
        if (!userData || !userData.fcm_token) {
            showNotification('⚠️ Token FCM no encontrado. Activa notificaciones primero.', 'warning');
            return;
        }
        
        const result = await sendPushNotification({
            title: '✅ Notificación de Prueba',
            body: `Hola ${currentUser.email}, las notificaciones están funcionando correctamente en NeosTech.`,
            token: userData.fcm_token,
            data: {
                type: 'test',
                timestamp: Date.now().toString()
            }
        });
        
        if (result.success) {
            showNotification('✅ Notificación de prueba enviada', 'success');
        } else {
            showNotification('❌ Error enviando notificación: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Error en testNotification:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

/* ============================================
   FASE 6: NAVEGACIÓN, NOTIFICACIONES PUSH Y UTILIDADES
   22 funciones completas extraídas de index.html
   ============================================ */

// ===== NAVEGACIÓN Y UI (5 funciones) =====

function navigateTo(tab) {
    switchTab(tab);
    
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.sidebar-submenu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const sidebarItems = document.querySelectorAll('.sidebar-item, .sidebar-submenu-item');
    sidebarItems.forEach(item => {
        const onclick = item.getAttribute('onclick');
        if (onclick && onclick.includes(`'${tab}'`)) {
            if (item.classList.contains('sidebar-submenu-item')) {
                item.classList.add('active');
                const parent = item.closest('.sidebar-item.has-submenu');
                if (parent) parent.classList.add('expanded');
            } else {
                item.classList.add('active');
            }
        }
    });
    
    // Cerrar sidebar en mobile después de navegar
    if (window.innerWidth <= 1023) {
        closeSidebar();
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        const isOpen = sidebar.classList.contains('mobile-open');
        
        if (isOpen) {
            closeSidebar();
        } else {
            openSidebar();
        }
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
    
    // Prevenir scroll del body cuando el drawer está abierto
    if (window.innerWidth <= 1023) {
        document.body.style.overflow = 'hidden';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    
    // Restaurar scroll del body
    document.body.style.overflow = '';
}

// ===== NOTIFICACIONES PUSH / FCM (5 funciones) =====

async function initPushNotifications() {
    try {
        console.log('[Push] Initializing push notifications...');

        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.warn('[Push] This browser does not support notifications');
            return;
        }

        // Check if Service Workers are supported
        if (!('serviceWorker' in navigator)) {
            console.warn('[Push] Service Workers not supported in this browser');
            return;
        }

        // Check if Firebase Messaging is available
        if (!firebase.messaging.isSupported()) {
            console.warn('[Push] Firebase Messaging is not supported in this browser');
            return;
        }

        // CRITICAL: Register Service Worker BEFORE initializing messaging
        console.log('[Push] Registering Service Worker...');
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('[Push] Service Worker registered successfully:', registration.scope);
        
        // Wait for Service Worker to be ready
        await navigator.serviceWorker.ready;
        console.log('[Push] Service Worker is ready');

        // Initialize messaging with the Service Worker registration
        messagingInstance = firebase.messaging();
        console.log('[Push] Firebase Messaging initialized');

        // Request notification permission
        const permission = await Notification.requestPermission();
        console.log('[Push] Notification permission:', permission);

        if (permission === 'granted') {
            // Get FCM token
            currentFCMToken = await messagingInstance.getToken({
                vapidKey: 'BEd-BNhI_7rq5_sjALjNVA7UKpXhvrsfDX23vSVHr7GPsvAZ654qFAN7LkKudcLLF_Ot8EPZ03ebzHcKZO8WgtM'
            });

            console.log('[Push] FCM Token:', currentFCMToken);

            // Save token to Firestore for this user
            if (currentUser && currentFCMToken) {
                await db.collection('users').doc(currentUser.uid).update({
                    fcm_token: currentFCMToken,
                    fcm_token_updated: firebase.firestore.FieldValue.serverTimestamp(),
                    notifications_enabled: true
                });
                console.log('[Push] Token saved to user profile');
                
                // Suscribir al topic all-users
                try {
                    const subscribeResponse = await fetch('https://us-central1-neos-tech.cloudfunctions.net/subscribeToTopic', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            token: currentFCMToken,
                            topic: 'all-users'
                        })
                    });
                    
                    const subscribeResult = await subscribeResponse.json();
                    if (subscribeResult.success) {
                        console.log('[Push] ✅ Suscrito exitosamente al topic all-users');
                        console.log('[Push] Respuesta de suscripción:', subscribeResult);
                    } else {
                        console.error('[Push] ❌ Error suscribiendo al topic:', subscribeResult.error);
                    }
                } catch (subError) {
                    console.error('[Push] Error en suscripción:', subError);
                }
            }

            // Listen for messages when app is in foreground
            messagingInstance.onMessage((payload) => {
                console.log('[Push] 🔔 FOREGROUND MESSAGE RECEIVED!', payload);
                console.log('[Push] Payload data:', payload.data);
                console.log('[Push] Payload notification:', payload.notification);
                
                // Show browser notification even in foreground
                const alertType = payload.data.alert_type || 'general';
                const title = payload.notification.title || payload.data.title || 'Alerta de Emergencia';
                const body = payload.notification.body || payload.data.body || 'Nueva alerta del sistema';
                const severity = payload.data.severity || 'critical';
                const alertId = payload.data.alertId || 'unknown';
                
                // Build alert URL
                const alertUrl = `/alert-view.html?type=${encodeURIComponent(alertType)}&severity=${encodeURIComponent(severity)}&title=${encodeURIComponent(title)}&message=${encodeURIComponent(body)}&location=Edificio&alertId=${encodeURIComponent(alertId)}`;
                
                // Show system notification (requires Notification API)
                if ('Notification' in window && Notification.permission === 'granted') {
                    const notificationOptions = {
                        body: body,
                        icon: '/assets/images/neostechc.png',
                        badge: '/assets/images/neostechc.png',
                        tag: 'emergency-alert-foreground',
                        requireInteraction: true,
                        vibrate: [200, 100, 200, 100, 200, 100, 200],
                        data: {
                            url: alertUrl,
                            alertId: alertId,
                            severity: severity,
                            alertType: alertType
                        },
                        actions: [
                            { action: 'confirm', title: '✅ Confirmar Recepción' },
                            { action: 'view', title: '👁 Ver Detalles' }
                        ]
                    };
                    
                    const notification = new Notification(title, notificationOptions);
                    
                    notification.onclick = function(event) {
                        event.preventDefault();
                        window.open(alertUrl, '_blank');
                        notification.close();
                    };
                    
                    console.log('[Push] Foreground notification shown');
                }
            });

            // Show notification permission banner
            showNotificationBanner('success', '✅ Notificaciones activadas - Recibirás alertas en tu dispositivo');

        } else if (permission === 'denied') {
            showNotificationBanner('error', '🚫 Notificaciones bloqueadas - Actívalas en configuración del navegador');
        } else {
            showNotificationBanner('warning', '⚠️ Notificaciones pendientes - Acepta los permisos para recibir alertas');
        }

    } catch (error) {
        console.error('[Push] Error initializing push notifications:', error);
        if (error.code === 'messaging/permission-blocked') {
            showNotificationBanner('error', '🚫 Permisos de notificación bloqueados');
        }
    }
}

function getAlertSound(alertType) {
    const soundMap = {
        'fire': '/sounds/emergency_alarm_fire.wav',
        'flood': '/sounds/emergency_alarm_flood.wav',
        'evacuation': '/sounds/emergency_alarm_evacuation.wav',
        'cancel': '/sounds/emergency_alarm_cancel.wav',
        'general': '/sounds/emergency_alarm_general.wav'
    };
    return soundMap[alertType] || '/sounds/emergency_alarm_general.wav';
}

function showInAppNotification(payload) {
    const { notification, data } = payload;
    
    // Create notification element
    const notifDiv = document.createElement('div');
    notifDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        max-width: 400px;
        background: linear-gradient(135deg, #DC2626, #991B1B);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4);
        z-index: 99999;
        animation: slideInRight 0.3s ease;
    `;

    notifDiv.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
            <div style="font-size: 32px;">📡</div>
            <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">${notification.title || 'Alerta de Emergencia'}</div>
                <div style="font-size: 14px; opacity: 0.95; margin-bottom: 12px;">${notification.body || ''}</div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="confirmAlertReception('${data.alertId}')" style="padding: 8px 16px; background: white; color: #DC2626; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px;">
                        ✅ Confirmar
                    </button>
                    <button onclick="this.closest('div').parentElement.parentElement.remove()" style="padding: 8px 16px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(notifDiv);

    // Play alert sound based on type
    const alertType = data.alert_type || 'general';
    const soundUrl = getAlertSound(alertType);
    const audio = new Audio(soundUrl);
    audio.volume = 0.8;
    audio.play().catch(e => console.log('[Push] Audio play failed:', e));

    // Auto-remove after 10 seconds
    setTimeout(() => {
        notifDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notifDiv.remove(), 300);
    }, 10000);
}

async function confirmAlertReception(alertId) {
    try {
        await fetch('https://us-central1-neos-tech.cloudfunctions.net/confirm_alert_reception', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                alert_id: alertId,
                user_id: currentUser.uid,
                timestamp: Date.now()
            })
        });
        showNotificationBanner('success', '✅ Recepción confirmada');
    } catch (error) {
        console.error('[Push] Error confirming alert:', error);
    }
}

function showNotificationBanner(type, message) {
    const colors = {
        success: 'linear-gradient(135deg, #10B981, #059669)',
        error: 'linear-gradient(135deg, #EF4444, #DC2626)',
        warning: 'linear-gradient(135deg, #F59E0B, #D97706)'
    };

    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 16px 24px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 99999;
        font-size: 14px;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    banner.textContent = message;
    document.body.appendChild(banner);

    setTimeout(() => {
        banner.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => banner.remove(), 300);
    }, 5000);
}

// ===== QR Y REGISTRO (7 funciones) =====

async function loadSubscribersCount() {
    try {
        const snapshot = await db.collection('alert_subscribers')
            .where('clientId', '==', window.currentUserClientId).where('notifications_enabled', '==', true)
            .get();
        
        const count = snapshot.size;
        document.getElementById('subscribersCount').textContent = count;
    } catch (error) {
        console.error('[QR] Error loading subscribers count:', error);
        document.getElementById('subscribersCount').textContent = '•';
    }
}

function showQRModal() {
    const modal = document.getElementById('qrModal');
    modal.classList.add('active');
    
    // Generate QR Code
    const registrationURL = 'https://neos-tech.web.app/register-alerts.html';
    const canvas = document.getElementById('qrCanvas');
    
    // Verificar si qrcode está disponible
    if (typeof qrcode === 'undefined') {
        console.error('[QR] QRCode library not loaded');
        alert('Error: Librería QR no cargada. Recarga la página.');
        return;
    }
    
    try {
        // Create QR code object
        const qr = qrcode(0, 'H');
        qr.addData(registrationURL);
        qr.make();
        
        // Get canvas context
        const ctx = canvas.getContext('2d');
        const cellSize = 5;
        const margin = 2;
        const size = qr.getModuleCount();
        
        // Set canvas size
        canvas.width = (size + margin * 2) * cellSize;
        canvas.height = (size + margin * 2) * cellSize;
        
        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.fillStyle = '#000000';
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(
                        (col + margin) * cellSize,
                        (row + margin) * cellSize,
                        cellSize,
                        cellSize
                    );
                }
            }
        }
        
        console.log('[QR] QR Code generated successfully');
    } catch (error) {
        console.error('[QR] Error generating QR:', error);
        alert('Error generando QR: ' + error.message);
    }

    // Load stats
    loadQRStats();
}

function closeQRModal() {
    document.getElementById('qrModal').classList.remove('active');
}

async function loadQRStats() {
    try {
        const snapshot = await db.collection('alert_subscribers').where('clientId', '==', window.currentUserClientId).get();
        const total = snapshot.size;
        
        const activeSnapshot = await db.collection('alert_subscribers')
            .where('clientId', '==', window.currentUserClientId).where('notifications_enabled', '==', true)
            .get();
        const active = activeSnapshot.size;

        document.getElementById('qrStatsActive').textContent = active;
        document.getElementById('qrStatsTotal').textContent = total;

    } catch (error) {
        console.error('[QR] Error loading stats:', error);
    }
}

function copyRegistrationLink() {
    const input = document.getElementById('registrationLink');
    input.select();
    document.execCommand('copy');
    
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copiado';
    btn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
    }, 2000);
}

function downloadQR() {
    const canvas = document.getElementById('qrCanvas');
    const link = document.createElement('a');
    link.download = 'NeosTech-Registro-Alertas-QR.png';
    link.href = canvas.toDataURL();
    link.click();
}

function printQR() {
    const printWindow = window.open('', '', 'width=800,height=600');
    const canvas = document.getElementById('qrCanvas');
    const dataURL = canvas.toDataURL();
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Código QR - Registro de Alertas NeosTech</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 40px;
                }
                h1 {
                    color: #DC2626;
                    margin-bottom: 20px;
                }
                .qr-container {
                    margin: 30px auto;
                    padding: 30px;
                    border: 3px solid #DC2626;
                    border-radius: 20px;
                    display: inline-block;
                }
                img {
                    max-width: 400px;
                }
                .instructions {
                    margin-top: 30px;
                    font-size: 18px;
                    color: #374151;
                }
                .link {
                    margin-top: 20px;
                    padding: 15px;
                    background: #F3F4F6;
                    border-radius: 10px;
                    font-family: monospace;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <h1>✅ Sistema de Alertas NeosTech</h1>
            <h2>Registro de Dispositivos para Alertas de Emergencia</h2>
            
            <div class="qr-container">
                <img src="${dataURL}" alt="QR Code">
            </div>
            
            <div class="instructions">
                <p><strong>Instrucciones:</strong></p>
                <p>1. Escanea el código QR con tu celular</p>
                <p>2. Completa el formulario de registro</p>
                <p>3. Acepta los permisos de notificación</p>
                <p>4. ¡Listo! Recibirás alertas en tiempo real</p>
            </div>
            
            <div class="link">
                O ingresa a: https://neos-tech.web.app/register-alerts.html
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// ===== UTILIDADES GENERALES (5 funciones) =====

function formatTimeAgo(date) {
    if (!date) return 'Fecha desconocida';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Hace menos de 1 minuto';
    if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

function formatChileanPlate(plate) {
    // Remover espacios y convertir a mayúsculas
    plate = plate.replace(/\s/g, '').toUpperCase();
    
    // Remover guiones existentes
    plate = plate.replace(/-/g, '');
    
    // Formato chileno: XXXX99 -> XX-XX-99 (4 letras + 2 números)
    if (plate.length === 6 && /^[A-Z]{4}\d{2}$/.test(plate)) {
        return `${plate.substring(0, 2)}-${plate.substring(2, 4)}-${plate.substring(4, 6)}`;
    }
    
    // Si ya tiene el formato correcto, devolverlo
    if (/^[A-Z]{2}-[A-Z]{2}-\d{2}$/.test(plate)) {
        return plate;
    }
    
    // Si no coincide con ningún formato válido, devolver original
    return plate;
}

function validateChileanPlate(plate) {
    // Formato chileno nuevo: XX-XX-99 (2 letras - 2 letras - 2 números)
    const patternNew = /^[A-Z]{2}-[A-Z]{2}-\d{2}$/;
    // Formato chileno antiguo: XXXX99 (4 letras + 2 números sin guiones)
    const patternOld = /^[A-Z]{4}\d{2}$/;
    
    return patternNew.test(plate) || patternOld.test(plate);
}

/* ============================================
   FASE 5: GRÁFICOS, LOGS Y EXPORTACIÓN
   21 funciones completas extraídas de index.html
   ============================================ */

// ===== GRÁFICOS Y VISUALIZACIONES =====

/**
 * Initialize charts system (stub function)
 * Charts are created when user navigates to charts tab
 */
function initCharts() {
    console.log('✅ Sistema de gráficos inicializado');
    // Los gráficos se crean cuando el usuario navega al tab de charts
    // No crear gráficos aquí para evitar conflictos de Canvas
}

/**
 * Update all charts with latest data
 * Fetches data from Firestore and creates/updates all chart visualizations
 */
async function updateCharts() {
    console.log('📈 Actualizando gráficos...');
    
    // Verificar que estamos en el tab de charts
    const chartsTab = document.getElementById('charts-tab');
    if (!chartsTab) {
        console.error('⚠️ Tab de gráficos no encontrado');
        return;
    }
    
    // Si no está activo, esperar un momento
    if (!chartsTab.classList.contains('active')) {
        console.log('⚠️ Tab de gráficos no está activo, esperando...');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    try {
        // Verificar que Chart.js está cargado
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js no está cargado');
            showNotification('❌ Error: Biblioteca de gráficos no cargada', 'error');
            return;
        }
        
        console.log('✅ Chart.js disponible, versión:', Chart.version);
        
        // Obtener datos de los últimos 7 días
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        console.log('📋 Consultando registros desde:', sevenDaysAgo.toLocaleString());
        
        let logs = [];
        
        // Estrategia 1: Intentar access_logs sin orderBy
        try {
            const logsSnapshot = await db.collection('access_logs')
                .where('clientId', '==', window.currentUserClientId)
                .limit(500)
                .get();
            
            logsSnapshot.forEach(doc => {
                const data = doc.data();
                // Filtrar por fecha manualmente
                const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                if (timestamp >= sevenDaysAgo) {
                    logs.push({ id: doc.id, ...data });
                }
            });
            console.log(`✅ Cargados ${logs.length} registros desde access_logs`);
        } catch (accessLogsError) {
            console.warn('❌ Error consultando access_logs:', accessLogsError.message);
            
            // Estrategia 2: Intentar rfid_tags sin orderBy
            try {
                const tagsSnapshot = await db.collection('rfid_events')
                    .where('clientId', '==', window.currentUserClientId)
                    .limit(500)
                    .get();
                
                tagsSnapshot.forEach(doc => {
                    const data = doc.data();
                    const timestamp = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    if (timestamp >= sevenDaysAgo) {
                        logs.push({ id: doc.id, ...data });
                    }
                });
                console.log(`✅ Cargados ${logs.length} registros desde rfid_tags (fallback)`);
            } catch (tagsError) {
                console.warn('❌ Error consultando rfid_tags:', tagsError.message);
            }
        }
        
        // Si no hay datos, generar ejemplos
        if (logs.length === 0) {
            console.log('⚠️ No hay datos recientes, generando datos de ejemplo...');
            generateSampleChartData();
            return;
        }
        
        // Ordenar logs por timestamp (del más reciente al más antiguo)
        logs.sort((a, b) => {
            const timeA = a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const timeB = b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            return timeB - timeA;
        });
        
        // Procesar datos con un pequeño delay entre cada gráfico
        console.log('📊 Creando gráficos...');
        await createHourlyChart(logs);
        await new Promise(resolve => setTimeout(resolve, 100));
        await createWeeklyChart(logs);
        await new Promise(resolve => setTimeout(resolve, 100));
        await createAccessTypeChart(logs);
        await new Promise(resolve => setTimeout(resolve, 100));
        await createTopUsersChart(logs);
        
        console.log('✅ Todos los gráficos creados exitosamente');
        
    } catch (error) {
        console.error('❌ Error actualizando gráficos:', error);
        console.log('📋 Usando datos de ejemplo debido al error');
        generateSampleChartData();
    }
}

/**
 * Create hourly access chart (bar chart showing accesses by hour of day)
 * @param {Array} logs - Array of access log entries
 */
async function createHourlyChart(logs) {
    try {
        console.log('📋 Creando gráfico horario con', logs.length, 'registros');
        const hourlyData = new Array(24).fill(0);
        
        logs.forEach(log => {
            if (log.timestamp) {
                try {
                    const date = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                    const hour = date.getHours();
                    if (hour >= 0 && hour < 24) {
                        hourlyData[hour]++;
                    }
                } catch (e) {
                    console.warn('❌ Error procesando timestamp:', e);
                }
            }
        });
        
        console.log('📋 Datos horarios procesados:', hourlyData);
        
        const ctx = document.getElementById('hourlyChart');
        if (!ctx) {
            console.error('❌ Canvas hourlyChart no encontrado en el DOM');
            throw new Error('Canvas hourlyChart no encontrado');
        }
        
        console.log('✅ Canvas hourlyChart encontrado, creando gráfico...');
        
        // Destruir gráfico anterior si existe
        if (hourlyChart) {
            try {
                console.log('🔄 Destruyendo gráfico hourly anterior');
                hourlyChart.destroy();
                hourlyChart = null;
            } catch (e) {
                console.warn('❌ Error destruyendo gráfico anterior:', e);
            }
        }
        
        // Destruir cualquier gráfico asociado al canvas
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            console.log('🔄 Destruyendo gráfico existente en canvas');
            existingChart.destroy();
        }
        
        hourlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Accesos por Hora',
                    data: hourlyData,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        console.log('✅ Gráfico horario creado exitosamente');
    } catch (error) {
        console.error('❌ Error creando gráfico horario:', error);
        throw error;
    }
}

/**
 * Create weekly access chart (line chart showing accesses by day of week)
 * @param {Array} logs - Array of access log entries
 */
async function createWeeklyChart(logs) {
    try {
        console.log('📋 Creando gráfico semanal con', logs.length, 'registros');
        const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const weeklyData = new Array(7).fill(0);
        
        logs.forEach(log => {
            if (log.timestamp) {
                try {
                    const date = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
                    const day = date.getDay();
                    if (day >= 0 && day < 7) {
                        weeklyData[day]++;
                    }
                } catch (e) {
                    console.warn('❌ Error procesando timestamp:', e);
                }
            }
        });
        
        console.log('📋 Datos semanales procesados:', weeklyData);
        
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) {
            console.error('❌ Canvas weeklyChart no encontrado en el DOM');
            throw new Error('Canvas weeklyChart no encontrado');
        }
        
        console.log('✅ Canvas weeklyChart encontrado, creando gráfico...');
        
        // Destruir gráfico anterior si existe
        if (weeklyChart) {
            try {
                console.log('🔄 Destruyendo gráfico weekly anterior');
                weeklyChart.destroy();
                weeklyChart = null;
            } catch (e) {
                console.warn('❌ Error destruyendo gráfico anterior:', e);
            }
        }
        
        // Destruir cualquier gráfico asociado al canvas
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            console.log('🔄 Destruyendo gráfico existente en canvas');
            existingChart.destroy();
        }
        
        weeklyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weekDays,
                datasets: [{
                    label: 'Accesos por Día',
                    data: weeklyData,
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        console.log('✅ Gráfico semanal creado exitosamente');
    } catch (error) {
        console.error('❌ Error creando gráfico semanal:', error);
        throw error;
    }
}

/**
 * Create access type chart (doughnut chart showing granted/denied/manual/unknown)
 * @param {Array} logs - Array of access log entries
 */
async function createAccessTypeChart(logs) {
    try {
        console.log('📋 Creando gráfico de tipos de acceso con', logs.length, 'registros');
        const types = { granted: 0, denied: 0, manual: 0, unknown: 0 };
        
        logs.forEach(log => {
            try {
                if (log.access_granted === true || log.granted === true) {
                    types.granted++;
                } else if (log.event_type === 'manual_open' || log.event_type === 'manual_door_open') {
                    types.manual++;
                } else if (log.access_granted === false || log.granted === false) {
                    types.denied++;
                } else {
                    types.unknown++;
                }
            } catch (e) {
                console.warn('❌ Error procesando registro:', e);
                types.unknown++;
            }
        });
        
        console.log('📋 Tipos de acceso procesados:', types);
        
        const ctx = document.getElementById('accessTypeChart');
        if (!ctx) {
            console.error('❌ Canvas accessTypeChart no encontrado en el DOM');
            throw new Error('Canvas accessTypeChart no encontrado');
        }
        
        console.log('✅ Canvas accessTypeChart encontrado, creando gráfico...');
        
        // Destruir gráfico anterior si existe
        if (accessTypeChart) {
            try {
                console.log('🔄 Destruyendo gráfico accessType anterior');
                accessTypeChart.destroy();
                accessTypeChart = null;
            } catch (e) {
                console.warn('❌ Error destruyendo gráfico anterior:', e);
            }
        }
        
        // Destruir cualquier gráfico asociado al canvas
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            console.log('🔄 Destruyendo gráfico existente en canvas');
            existingChart.destroy();
        }
        
        accessTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Permitidos', 'Denegados', 'Manuales', 'Desconocidos'],
                datasets: [{
                    data: [types.granted, types.denied, types.manual, types.unknown],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(148, 163, 184, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
        
        console.log('✅ Gráfico de tipos de acceso creado exitosamente');
    } catch (error) {
        console.error('❌ Error creando gráfico de tipos de acceso:', error);
        throw error;
    }
}

/**
 * Create top users chart (horizontal bar chart showing most frequent users)
 * @param {Array} logs - Array of access log entries
 */
async function createTopUsersChart(logs) {
    try {
        console.log('📋 Creando gráfico de top usuarios con', logs.length, 'registros');
        const userCounts = {};
        
        logs.forEach(log => {
            try {
                const userName = log.user_name || log.userName || log.name || 'Desconocido';
                userCounts[userName] = (userCounts[userName] || 0) + 1;
            } catch (e) {
                console.warn('❌ Error procesando registro:', e);
            }
        });
        
        const sortedUsers = Object.entries(userCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        console.log('📋 Top usuarios procesados:', sortedUsers);
        
        const ctx = document.getElementById('topUsersChart');
        if (!ctx) {
            console.error('❌ Canvas topUsersChart no encontrado en el DOM');
            throw new Error('Canvas topUsersChart no encontrado');
        }
        
        console.log('✅ Canvas topUsersChart encontrado, creando gráfico...');
        
        // Destruir gráfico anterior si existe
        if (topUsersChart) {
            try {
                console.log('🔄 Destruyendo gráfico topUsers anterior');
                topUsersChart.destroy();
                topUsersChart = null;
            } catch (e) {
                console.warn('❌ Error destruyendo gráfico anterior:', e);
            }
        }
        
        // Destruir cualquier gráfico asociado al canvas
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            console.log('🔄 Destruyendo gráfico existente en canvas');
            existingChart.destroy();
        }
        
        topUsersChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedUsers.map(u => u[0]),
                datasets: [{
                    label: 'Número de Accesos',
                    data: sortedUsers.map(u => u[1]),
                    backgroundColor: 'rgba(139, 92, 246, 0.6)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
        
        console.log('✅ Gráfico de top usuarios creado exitosamente');
    } catch (error) {
        console.error('❌ Error creando gráfico de top usuarios:', error);
        throw error;
    }
}

/**
 * Generate sample chart data for demo/testing purposes
 * Used when no real data is available
 */
function generateSampleChartData() {
    console.log('⚙️ Generando datos de ejemplo para gráficos...');
    
    // Datos de ejemplo
    const hourlyData = [2, 1, 0, 0, 0, 0, 5, 15, 25, 20, 12, 8, 10, 15, 18, 22, 28, 24, 18, 12, 8, 5, 3, 2];
    const weeklyData = [45, 120, 115, 130, 125, 110, 50];
    
    // Destruir todos los gráficos existentes primero
    if (hourlyChart) { try { hourlyChart.destroy(); hourlyChart = null; } catch(e) {} }
    if (weeklyChart) { try { weeklyChart.destroy(); weeklyChart = null; } catch(e) {} }
    if (accessTypeChart) { try { accessTypeChart.destroy(); accessTypeChart = null; } catch(e) {} }
    if (topUsersChart) { try { topUsersChart.destroy(); topUsersChart = null; } catch(e) {} }
    
    // Gráfico por hora
    const ctx1 = document.getElementById('hourlyChart');
    if (ctx1) {
        const existing1 = Chart.getChart(ctx1);
        if (existing1) existing1.destroy();
        
        hourlyChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Accesos por Hora',
                    data: hourlyData,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
    
    // Gráfico semanal
    const ctx2 = document.getElementById('weeklyChart');
    if (ctx2) {
        const existing2 = Chart.getChart(ctx2);
        if (existing2) existing2.destroy();
        
        weeklyChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
                datasets: [{
                    label: 'Accesos por Día',
                    data: weeklyData,
                    borderColor: 'rgba(34, 197, 94, 1)',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
    
    // Gráfico de tipos
    const ctx3 = document.getElementById('accessTypeChart');
    if (ctx3) {
        const existing3 = Chart.getChart(ctx3);
        if (existing3) existing3.destroy();
        
        accessTypeChart = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: ['Permitidos', 'Denegados', 'Manuales', 'Desconocidos'],
                datasets: [{
                    data: [450, 35, 28, 12],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(148, 163, 184, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
    
    // Top usuarios
    const ctx4 = document.getElementById('topUsersChart');
    if (ctx4) {
        const existing4 = Chart.getChart(ctx4);
        if (existing4) existing4.destroy();
        
        topUsersChart = new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: ['Juan Pérez', 'María González', 'Carlos López', 'Ana Martínez', 'Pedro Soto', 'Lucía Rojas', 'Diego Silva', 'Carmen Vega'],
                datasets: [{
                    label: 'Número de Accesos',
                    data: [45, 38, 35, 32, 28, 25, 22, 20],
                    backgroundColor: 'rgba(139, 92, 246, 0.6)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    }
}

// ===== LOGS Y HISTORIAL =====

/**
 * Load access logs from Firestore
 * Fetches from login_logs and rfid_tags collections
 */
async function loadLogs() {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="loading"><div class="spinner"></div>Cargando...</td></tr>';
    
    try {
        const dateInput = document.getElementById('logDate');
        const dateStr = dateInput ? dateInput.value : '';
        const date = dateStr ? new Date(dateStr) : new Date();
        date.setHours(0, 0, 0, 0);
        
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        logs = [];
        
        // Cargar desde login_logs (aperturas manuales y eventos del sistema)
        try {
            const loginSnapshot = await db.collection('access_logs')
                .where('clientId', '==', window.currentUserClientId)
                .where('timestamp', '>=', date)
                .where('timestamp', '<=', endDate)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            
            loginSnapshot.forEach(doc => {
                logs.push({ id: doc.id, source: 'login_logs', ...doc.data() });
            });
        } catch (err) {
            console.log('login_logs query error (may not exist yet):', err.message);
        }
        
        // Cargar desde rfid_tags (lecturas de tags)
        try {
            const tagSnapshot = await db.collection('rfid_events')
                .where('clientId', '==', window.currentUserClientId)
                .where('timestamp', '>=', date)
                .where('timestamp', '<=', endDate)
                .orderBy('timestamp', 'desc')
                .limit(50)
                .get();
            
            tagSnapshot.forEach(doc => {
                logs.push({ id: doc.id, source: 'rfid_tags', ...doc.data() });
            });
        } catch (err) {
            console.log('rfid_tags query error:', err.message);
        }
        
        // Ordenar por timestamp descendente
        logs.sort((a, b) => {
            const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
            const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
            return timeB - timeA;
        });
        
        // Limitar a 100 registros combinados
        logs = logs.slice(0, 100);
        
        renderLogs();
    } catch (error) {
        console.error('Error loading logs:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Error cargando registros: ' + error.message + '</td></tr>';
    }
}

/**
 * Render logs table from loaded logs data
 */
function renderLogs() {
    const tbody = document.getElementById('logsTableBody');
    if (!tbody) return;
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No hay registros para esta fecha</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map((log, index) => {
        let eventType = '🏷️ Tag Leído';
        let eventIcon = '📋';
        
        if (log.event_type === 'manual_open' || log.action === 'manual_open') {
            eventType = '🔓 Apertura Manual';
            eventIcon = '🔓';
        } else if (log.event_type === 'auto_open' || log.action === 'login') {
            eventType = '✅ Acceso Permitido';
            eventIcon = '✅';
        } else if (log.event_type === 'denied' || log.action === 'denied') {
            eventType = '⛔ Acceso Denegado';
            eventIcon = '⛔';
        } else if (log.action === 'gate_opened') {
            eventType = '🚧 Portón Abierto';
            eventIcon = '🚧';
        }
        
        const tagShort = log.tag_id ? log.tag_id.slice(-8) : (log.id && log.source === 'rfid_tags' ? log.id.slice(-8) : 'N/A');
        const isSuccess = log.access_granted !== false && log.granted !== false && log.success !== false;
        const statusColor = isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
        const statusText = isSuccess ? '✅ OK' : '⛔ Denegado';
        const userName = log.user_name || log.userName || log.user || 'Desconocido';
        const userDept = log.departamento || log.department || 'N/A';
        
        let readerInfo = log.reader_id || log.reader_serial || log.location || log.access_point || 'N/A';
        if (readerInfo === 'porton_triwe' || readerInfo === 'triwe') {
            readerInfo = 'Triwe';
        } else if (readerInfo === 'porton_principal') {
            readerInfo = 'Portón Principal';
        } else if (readerInfo === 'N/A' && log.access_point_name) {
            readerInfo = log.access_point_name;
        }
        
        const comment = log.guard_comment || log.comment || '';
        const commentDisplay = comment ? `<small style="color: #3498db;">${comment}</small>` : `<button onclick="addGuardComment(${index})" class="btn-primary" style="padding: 4px 8px; font-size: 0.75em;">📝</button>`;
        
        return `
            <tr>
                <td>${formatTimestamp(log.timestamp)}</td>
                <td><span style="font-size: 1.2em;">${eventIcon}</span> ${eventType}</td>
                <td>${userName}</td>
                <td><strong>${userDept}</strong></td>
                <td><code style="font-size: 0.85em; color: var(--primary-color);">${tagShort}</code></td>
                <td><small>${readerInfo}</small></td>
                <td><span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></td>
                <td style="position: relative;">
                    ${comment ? `<small style="color: #3498db;">${comment}</small>` : ''}
                    <button onclick="addGuardComment(${index})" class="btn-primary" style="padding: 4px 8px; font-size: 0.75em; margin-left: 5px;">
                        ${comment ? '✏️' : '📝'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Add or edit guard comment for a log entry
 * @param {number} logIndex - Index of log in logs array
 */
async function addGuardComment(logIndex) {
    const log = logs[logIndex];
    const existingComment = log.guard_comment || log.comment || '';
    
    // Crear modal para comentarios
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>💬 ${existingComment ? 'Editar' : 'Agregar'} Comentario</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div style="background: rgba(52, 152, 219, 0.1); padding: 12px; border-radius: 4px; margin-bottom: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
                        <div><strong>Usuario:</strong> ${log.user_name || log.userName || 'Desconocido'}</div>
                        <div><strong>Depto:</strong> ${log.departamento || log.department || 'N/A'}</div>
                        <div><strong>Evento:</strong> ${log.event_type || log.action || 'N/A'}</div>
                        <div><strong>Hora:</strong> ${formatTimestamp(log.timestamp)}</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label><strong>Comentario del Guardia:</strong></label>
                    <textarea id="guardCommentText" 
                              rows="4" 
                              placeholder="Escribe aquí cualquier observación relevante sobre este evento..."
                              style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;">${existingComment}</textarea>
                </div>
                
                <div class="form-group">
                    <label><strong>Categoría:</strong></label>
                    <select id="commentCategory" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Sin categoría</option>
                        <option value="normal">✅ Normal</option>
                        <option value="important">⚠️ Importante</option>
                        <option value="incident">🚨 Incidente</option>
                        <option value="suspicious">👁️ Actividad Sospechosa</option>
                        <option value="resolved">✔️ Resuelto</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal').remove()" class="btn-secondary">Cancelar</button>
                ${existingComment ? `<button onclick="deleteGuardComment(${logIndex})" class="btn-danger">🗑️ Eliminar</button>` : ''}
                <button onclick="saveGuardComment(${logIndex})" class="btn-primary">💾 Guardar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Seleccionar categoría existente
    if (log.comment_category) {
        document.getElementById('commentCategory').value = log.comment_category;
    }
}

/**
 * Save guard comment for a log entry
 * @param {number} logIndex - Index of log in logs array
 */
async function saveGuardComment(logIndex) {
    const comment = document.getElementById('guardCommentText').value.trim();
    const category = document.getElementById('commentCategory').value;
    
    if (!comment) {
        showNotification('⚠️ Escribe un comentario', 'warning');
        return;
    }
    
    const log = logs[logIndex];
    
    try {
        const collection = log.source || 'rfid_tags';
        const updateData = {
            guard_comment: comment,
            comment_category: category,
            comment_added_at: firebase.firestore.FieldValue.serverTimestamp(),
            comment_added_by: currentUser ? currentUser.email : 'guardia'
        };
        
        await db.collection(collection).doc(log.id).update(updateData);
        
        log.guard_comment = comment;
        log.comment_category = category;
        renderLogs();
        document.querySelector('.modal').remove();
        showNotification('✅ Comentario guardado', 'success');
    } catch (error) {
        console.error('Error saving comment:', error);
        showNotification('❌ Error al guardar comentario', 'error');
    }
}

/**
 * Delete guard comment from a log entry
 * @param {number} logIndex - Index of log in logs array
 */
async function deleteGuardComment(logIndex) {
    if (!confirm('¿Eliminar este comentario?')) return;
    
    const log = logs[logIndex];
    
    try {
        const collection = log.source || 'rfid_tags';
        await db.collection(collection).doc(log.id).update({
            guard_comment: firebase.firestore.FieldValue.delete(),
            comment_category: firebase.firestore.FieldValue.delete(),
            comment_added_at: firebase.firestore.FieldValue.delete(),
            comment_added_by: firebase.firestore.FieldValue.delete()
        });
        
        log.guard_comment = '';
        log.comment_category = '';
        renderLogs();
        document.querySelector('.modal').remove();
        showNotification('✅ Comentario eliminado', 'success');
    } catch (error) {
        console.error('Error deleting comment:', error);
        showNotification('❌ Error al eliminar comentario', 'error');
    }
}

/**
 * Filter logs by date
 * Reloads logs with new date filter
 */
function filterLogs() {
    loadLogs();
}

// ===== EXPORTACIÓN DE DATOS =====

/**
 * Export logs to Excel with NeosTech logo watermark
 */
async function exportLogsExcel() {
    if (!accessEvents || accessEvents.length === 0) {
        showNotification('⚠️ No hay eventos para exportar', 'warning');
        return;
    }
    
    showNotification('📊 Generando Excel...', 'info');
    
    const currentDate = new Date().toLocaleDateString('es-CL', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    
    try {
        const ExcelJS = window.ExcelJS;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Eventos', {
            views: [{ showGridLines: true }]
        });
        
        // Cargar logo como imagen de fondo
        const logoResponse = await fetch('assets/images/neostechc.png');
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoBlob);
        });
        
        // Agregar logo centrado con opacidad
        const imageId = workbook.addImage({
            base64: logoBase64,
            extension: 'png',
        });
        
        // Calcular posición central basada en cantidad de eventos
        const totalRows = filteredLogs.length + 6;
        const centerRow = Math.floor(totalRows / 2);
        
        // Agregar logo como marca de agua en el centro
        worksheet.addImage(imageId, {
            tl: { col: 0.5, row: centerRow },
            ext: { width: 250, height: 250 },
            editAs: 'absolute'
        });
        
        // Títulos
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = 'NEOSTECH - SISTEMA DE CONTROL DE ACCESO RFID';
        worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.mergeCells('A2:F2');
        worksheet.getCell('A2').value = 'REGISTRO DE EVENTOS DE ACCESO';
        worksheet.getCell('A2').font = { size: 14, bold: true };
        worksheet.getCell('A2').alignment = { horizontal: 'center' };
        
        worksheet.mergeCells('A3:F3');
        worksheet.getCell('A3').value = `Fecha de generación: ${currentDate}`;
        worksheet.getCell('A3').font = { size: 10, italic: true };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };
        
        // Encabezados
        const headers = ['Fecha/Hora', 'Tag ID', 'Usuario', 'Estado', 'Punto de Acceso', 'Departamento'];
        worksheet.getRow(5).values = headers;
        worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2563EB' }
        };
        worksheet.getRow(5).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Datos
        accessEvents.forEach((event, index) => {
            const row = worksheet.getRow(6 + index);
            row.values = [
                formatTimestamp(event.timestamp),
                event.tag_id ? event.tag_id.slice(-8) : 'N/A',
                event.user_name || 'Desconocido',
                event.status === 'granted' ? 'Permitido' : 'Denegado',
                event.access_point_name || event.reader_id || 'N/A',
                event.departamento || 'N/A'
            ];
            
            // Filas con fondo blanco muy transparente para ver el logo
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: index % 2 === 0 ? 'F5FFFFFF' : 'F5F0F9FF' }
            };
            
            // Agregar bordes para mejorar legibilidad
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                };
            });
        });
        
        // Anchos de columnas
        worksheet.getColumn(1).width = 20;
        worksheet.getColumn(2).width = 15;
        worksheet.getColumn(3).width = 25;
        worksheet.getColumn(4).width = 12;
        worksheet.getColumn(5).width = 25;
        worksheet.getColumn(6).width = 20;
        
        // Resguardos legales
        const lastRow = 6 + accessEvents.length + 1;
        worksheet.mergeCells(`A${lastRow}:F${lastRow}`);
        worksheet.getCell(`A${lastRow}`).value = 'RESGUARDOS LEGALES:';
        worksheet.getCell(`A${lastRow}`).font = { bold: true, size: 9 };
        
        const legal = [
            'Este documento contiene información confidencial y de uso exclusivo para fines de auditoría de acceso.',
            'La divulgación, reproducción o uso no autorizado de este documento está prohibido por ley.',
            'Datos protegidos según Ley Nº 19.628 sobre Protección de Datos Personales de Chile.',
            `Total de eventos: ${accessEvents.length} | Generado por: ${currentUser || 'Sistema'}`
        ];
        
        legal.forEach((text, i) => {
            worksheet.mergeCells(`A${lastRow + 1 + i}:F${lastRow + 1 + i}`);
            worksheet.getCell(`A${lastRow + 1 + i}`).value = text;
            worksheet.getCell(`A${lastRow + 1 + i}`).font = { size: 8, color: { argb: 'FF505050' } };
        });
        
        // Exportar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NeosTech_Eventos_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('✅ Excel generado exitosamente con logo', 'success');
    } catch (error) {
        console.error('Error generando Excel:', error);
        showNotification('❌ Error al generar Excel: ' + error.message, 'error');
    }
}

/**
 * Export logs to PDF with NeosTech logo watermark
 */
async function exportLogsPDF() {
    if (!accessEvents || accessEvents.length === 0) {
        showNotification('⚠️ No hay eventos para exportar', 'warning');
        return;
    }
    
    showNotification('📄 Generando PDF...', 'info');
    
    const currentDate = new Date().toLocaleDateString('es-CL', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    
    const headers = ['Fecha/Hora', 'Tag ID', 'Usuario', 'Estado', 'Punto de Acceso', 'Departamento'];
    const data = accessEvents.slice(0, 100).map(event => [
        formatTimestamp(event.timestamp),
        event.tag_id ? event.tag_id.slice(-8) : 'N/A',
        event.user_name || 'Desconocido',
        event.status === 'granted' ? 'Permitido' : 'Denegado',
        event.access_point_name || event.reader_id || 'N/A',
        event.departamento || 'N/A'
    ]);
    
    await generatePDFWithLogo(headers, data, 'Eventos', currentDate, true);
    showNotification('✅ PDF generado exitosamente', 'success');
}

/**
 * Export vehicles to Excel with NeosTech logo watermark
 */
async function exportVehiclesExcel() {
    const vehiclesWithData = users.filter(u => u.vehicle);
    if (vehiclesWithData.length === 0) {
        showNotification('⚠️ No hay vehículos para exportar', 'warning');
        return;
    }
    
    showNotification('📊 Generando Excel...', 'info');
    
    const currentDate = new Date().toLocaleDateString('es-CL', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    
    try {
        const ExcelJS = window.ExcelJS;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Vehículos', {
            views: [{ showGridLines: true }]
        });
        
        // Cargar logo como imagen de fondo
        const logoResponse = await fetch('assets/images/neostechc.png');
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoBlob);
        });
        
        // Agregar logo centrado con opacidad
        const imageId = workbook.addImage({
            base64: logoBase64,
            extension: 'png',
        });
        
        worksheet.addImage(imageId, {
            tl: { col: 1, row: 10 },
            ext: { width: 400, height: 400 },
            editAs: 'absolute'
        });
        
        // Títulos
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = 'NEOSTECH - SISTEMA DE CONTROL DE ACCESO RFID';
        worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.mergeCells('A2:F2');
        worksheet.getCell('A2').value = 'LISTADO DE VEHÍCULOS REGISTRADOS';
        worksheet.getCell('A2').font = { size: 14, bold: true };
        worksheet.getCell('A2').alignment = { horizontal: 'center' };
        
        worksheet.mergeCells('A3:F3');
        worksheet.getCell('A3').value = `Fecha de generación: ${currentDate}`;
        worksheet.getCell('A3').font = { size: 10, italic: true };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };
        
        // Encabezados
        const headers = ['Patente', 'Propietario', 'Block-Departamento', 'Teléfono', 'Tags RFID', 'Estado'];
        worksheet.getRow(5).values = headers;
        worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2563EB' }
        };
        worksheet.getRow(5).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Datos
        vehiclesWithData.forEach((u, index) => {
            const row = worksheet.getRow(6 + index);
            row.values = [
                u.vehicle || '',
                u.name || '',
                (u.block && u.unit) ? `Block ${u.block}-${u.unit}` : (u.departamento || ''),
                u.phone || '',
                (u.tags || []).map(t => t.slice(-8)).join('; '),
                u.active ? 'Activo' : 'Inactivo'
            ];
            
            // Filas con fondo blanco muy transparente para ver el logo
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: index % 2 === 0 ? 'F5FFFFFF' : 'F5F0F9FF' }
            };
            
            // Agregar bordes para mejorar legibilidad
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                };
            });
        });
        
        // Anchos de columnas
        worksheet.getColumn(1).width = 12;
        worksheet.getColumn(2).width = 25;
        worksheet.getColumn(3).width = 20;
        worksheet.getColumn(4).width = 15;
        worksheet.getColumn(5).width = 30;
        worksheet.getColumn(6).width = 10;
        
        // Resguardos legales
        const lastRow = 6 + vehiclesWithData.length + 1;
        worksheet.mergeCells(`A${lastRow}:F${lastRow}`);
        worksheet.getCell(`A${lastRow}`).value = 'RESGUARDOS LEGALES:';
        worksheet.getCell(`A${lastRow}`).font = { bold: true, size: 9 };
        
        const legal = [
            'Este documento contiene información confidencial y de uso exclusivo para fines de control de acceso.',
            'La divulgación, reproducción o uso no autorizado de este documento está prohibido por ley.',
            'Datos protegidos según Ley Nº 19.628 sobre Protección de Datos Personales de Chile.',
            `Total de registros: ${vehiclesWithData.length} | Generado por: ${currentUser || 'Sistema'}`
        ];
        
        legal.forEach((text, i) => {
            worksheet.mergeCells(`A${lastRow + 1 + i}:F${lastRow + 1 + i}`);
            worksheet.getCell(`A${lastRow + 1 + i}`).value = text;
            worksheet.getCell(`A${lastRow + 1 + i}`).font = { size: 8, color: { argb: 'FF505050' } };
        });
        
        // Exportar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NeosTech_Vehiculos_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('✅ Excel generado exitosamente con logo', 'success');
    } catch (error) {
        console.error('Error generando Excel:', error);
        showNotification('❌ Error al generar Excel: ' + error.message, 'error');
    }
}

/**
 * Export vehicles to PDF with NeosTech logo watermark
 */
async function exportVehiclesPDF() {
    const vehiclesWithData = users.filter(u => u.vehicle);
    if (vehiclesWithData.length === 0) {
        showNotification('⚠️ No hay vehículos para exportar', 'warning');
        return;
    }
    
    showNotification('📄 Generando PDF...', 'info');
    
    const currentDate = new Date().toLocaleDateString('es-CL', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    
    const headers = ['Patente', 'Propietario', 'Block-Departamento', 'Teléfono', 'Tags RFID', 'Estado'];
    const data = vehiclesWithData.map(u => [
        u.vehicle || '',
        u.name || '',
        (u.block && u.unit) ? `Block ${u.block}-${u.unit}` : (u.departamento || ''),
        u.phone || '',
        (u.tags || []).map(t => t.slice(-8)).join('; '),
        u.active ? 'Activo' : 'Inactivo'
    ]);
    
    await generatePDFWithLogo(headers, data, 'Vehículos', currentDate);
    showNotification('✅ PDF generado exitosamente', 'success');
}

/**
 * Export users/residents to Excel with NeosTech logo watermark
 */
async function exportUsersExcel() {
    if (users.length === 0) {
        showNotification('⚠️ No hay usuarios para exportar', 'warning');
        return;
    }
    
    showNotification('📊 Generando Excel...', 'info');
    
    try {
        // Verificar que ExcelJS está disponible
        if (!window.ExcelJS) {
            throw new Error('Librería ExcelJS no disponible. Verifica la conexión.');
        }
        
        const currentDate = new Date().toLocaleDateString('es-CL', { 
            year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
        
        const ExcelJS = window.ExcelJS;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Residentes', {
            views: [{ showGridLines: true }]
        });
        
        // Cargar logo como imagen de fondo
        const logoResponse = await fetch('assets/images/neostechc.png');
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoBlob);
        });
        
        // Agregar imagen de fondo (watermark)
        // Agregar logo centrado con opacidad (más transparente)
        const imageId = workbook.addImage({
            base64: logoBase64,
            extension: 'png',
        });
        
        // Calcular posición central basada en cantidad de filas de usuarios
        const totalRows = users.length + 6;
        const centerRow = Math.floor(totalRows / 2);
        
        // Posicionar logo centrado como marca de agua
        worksheet.addImage(imageId, {
            tl: { col: 0.5, row: centerRow },
            ext: { width: 250, height: 250 },
            editAs: 'absolute'
        });
        
        // Títulos
        worksheet.mergeCells('A1:F1');
        worksheet.getCell('A1').value = 'NEOSTECH - SISTEMA DE CONTROL DE ACCESO RFID';
        worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF2563EB' } };
        worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.mergeCells('A2:F2');
        worksheet.getCell('A2').value = 'LISTADO DE RESIDENTES REGISTRADOS';
        worksheet.getCell('A2').font = { size: 14, bold: true };
        worksheet.getCell('A2').alignment = { horizontal: 'center' };
        
        worksheet.mergeCells('A3:F3');
        worksheet.getCell('A3').value = `Fecha de generación: ${currentDate}`;
        worksheet.getCell('A3').font = { size: 10, italic: true };
        worksheet.getCell('A3').alignment = { horizontal: 'center' };
        
        // Encabezados
        const headers = ['Nombre', 'Block-Departamento', 'Teléfono', 'Vehículo', 'Tags RFID', 'Estado'];
        worksheet.getRow(5).values = headers;
        worksheet.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2563EB' }
        };
        worksheet.getRow(5).alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Datos
        users.forEach((u, index) => {
            const row = worksheet.getRow(6 + index);
            row.values = [
                u.name || '',
                (u.block && u.unit) ? `Block ${u.block}-${u.unit}` : (u.departamento || ''),
                u.phone || '',
                u.vehicle || '',
                (u.tags || []).map(t => t.slice(-8)).join('; '),
                u.active ? 'Activo' : 'Inactivo'
            ];
            
            // Filas con fondo blanco muy transparente para ver el logo
            row.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: index % 2 === 0 ? 'F5FFFFFF' : 'F5F0F9FF' }
            };
            
            // Agregar bordes para mejorar legibilidad
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                    right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                };
            });
        });
        
        // Anchos de columnas
        worksheet.getColumn(1).width = 25;
        worksheet.getColumn(2).width = 20;
        worksheet.getColumn(3).width = 15;
        worksheet.getColumn(4).width = 12;
        worksheet.getColumn(5).width = 30;
        worksheet.getColumn(6).width = 10;
        
        // Resguardos legales
        const lastRow = 6 + users.length + 1;
        worksheet.mergeCells(`A${lastRow}:F${lastRow}`);
        worksheet.getCell(`A${lastRow}`).value = 'RESGUARDOS LEGALES:';
        worksheet.getCell(`A${lastRow}`).font = { bold: true, size: 9 };
        
        const legal = [
            'Este documento contiene información confidencial y de uso exclusivo para fines de control de acceso.',
            'La divulgación, reproducción o uso no autorizado de este documento está prohibido por ley.',
            'Datos protegidos según Ley Nº 19.628 sobre Protección de Datos Personales de Chile.',
            `Total de registros: ${users.length} | Generado por: ${currentUser || 'Sistema'}`
        ];
        
        legal.forEach((text, i) => {
            worksheet.mergeCells(`A${lastRow + 1 + i}:F${lastRow + 1 + i}`);
            worksheet.getCell(`A${lastRow + 1 + i}`).value = text;
            worksheet.getCell(`A${lastRow + 1 + i}`).font = { size: 8, color: { argb: 'FF505050' } };
        });
        
        // Exportar
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NeosTech_Residentes_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showNotification('✅ Excel generado exitosamente con logo', 'success');
    } catch (error) {
        console.error('Error generando Excel:', error);
        showNotification('❌ Error al generar Excel: ' + error.message, 'error');
    }
}

/**
 * Export users/residents to PDF with NeosTech logo watermark
 */
async function exportUsersPDF() {
    if (users.length === 0) {
        showNotification('⚠️ No hay usuarios para exportar', 'warning');
        return;
    }
    
    showNotification('📄 Generando PDF...', 'info');
    
    const currentDate = new Date().toLocaleDateString('es-CL', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
    });
    
    const headers = ['Nombre', 'Block-Departamento', 'Teléfono', 'Vehículo', 'Tags RFID', 'Estado'];
    const data = users.map(u => [
        u.name || '',
        (u.block && u.unit) ? `Block ${u.block}-${u.unit}` : (u.departamento || ''),
        u.phone || '',
        u.vehicle || '',
        (u.tags || []).map(t => t.slice(-8)).join('; '),
        u.active ? 'Activo' : 'Inactivo'
    ]);
    
    await generatePDFWithLogo(headers, data, 'Residentes', currentDate);
    showNotification('✅ PDF generado exitosamente', 'success');
}

/**
 * Generic function to generate PDF with NeosTech logo watermark
 * @param {Array} headers - Table column headers
 * @param {Array} data - Table rows data
 * @param {string} type - Type of export (Eventos, Residentes, Vehículos)
 * @param {string} currentDate - Current date string
 * @param {boolean} isEvents - Whether this is an events export
 */
async function generatePDFWithLogo(headers, data, type, currentDate, isEvents = false) {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        showNotification('❌ jsPDF no disponible', 'error');
        return;
    }
    
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Cargar y agregar logo como marca de agua translúcida
    try {
        const logoImg = new Image();
        logoImg.src = 'assets/images/neostechc.png';
        
        await new Promise((resolve, reject) => {
            logoImg.onload = () => {
                // Marca de agua con logo
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.40 })); // Logo claramente visible
                
                // Logo más grande para ajustarse a la página
                const logoWidth = 140;
                const logoHeight = 140;
                const logoX = (pageWidth - logoWidth) / 2;
                const logoY = (pageHeight - logoHeight) / 2;
                
                doc.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
                doc.restoreGraphicsState();
                resolve();
            };
            logoImg.onerror = () => {
                console.warn('No se pudo cargar el logo, usando marca de agua de texto');
                resolve();
            };
        });
    } catch (error) {
        console.warn('Error al agregar marca de agua con logo:', error);
    }
    
    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('NEOSTECH - SISTEMA DE CONTROL DE ACCESO RFID', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    const subtitle = type === 'Residentes' ? 'LISTADO DE RESIDENTES REGISTRADOS' : 
                    type === 'Vehículos' ? 'LISTADO DE VEHÍCULOS REGISTRADOS' : 
                    'REGISTRO DE EVENTOS DE ACCESO';
    doc.text(subtitle, pageWidth / 2, 23, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de generación: ${currentDate}`, pageWidth / 2, 30, { align: 'center' });
    
    // Tabla - anchos más grandes para mejor visualización centrada
    const columnWidths = type === 'Residentes' ? 
        { 0: { cellWidth: 60 }, 1: { cellWidth: 42 }, 2: { cellWidth: 36 }, 3: { cellWidth: 30 }, 4: { cellWidth: 72 }, 5: { cellWidth: 24 } } :
        type === 'Vehículos' ? 
        { 0: { cellWidth: 30 }, 1: { cellWidth: 60 }, 2: { cellWidth: 42 }, 3: { cellWidth: 36 }, 4: { cellWidth: 72 }, 5: { cellWidth: 24 } } :
        { 0: { cellWidth: 42 }, 1: { cellWidth: 30 }, 2: { cellWidth: 60 }, 3: { cellWidth: 30 }, 4: { cellWidth: 60 }, 5: { cellWidth: 42 } };
    
    // Convertir encabezados a mayúsculas
    const headersUpper = headers.map(h => h.toUpperCase());
    
    doc.autoTable({
        startY: 35,
        head: [headersUpper],
        body: data,
        theme: 'plain',
        tableWidth: 'auto',
        halign: 'center', // Centrar tabla horizontalmente
        headStyles: { 
            fillColor: [37, 99, 235], 
            textColor: 255, 
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
        },
        styles: { 
            fontSize: isEvents ? 8 : 9, 
            cellPadding: isEvents ? 2 : 3,
            lineWidth: 0.2,
            lineColor: [200, 200, 200],
            textColor: [0, 0, 0]
        },
        bodyStyles: {
            fillColor: false // Completamente transparente
        },
        alternateRowStyles: {
            fillColor: false // Completamente transparente
        },
        columnStyles: columnWidths
    });
    
    // Pie de página con resguardos legales
    const finalY = doc.lastAutoTable.finalY || 40;
    doc.setFontSize(8);
    doc.setTextColor(150, 0, 0);
    doc.text('RESGUARDOS LEGALES:', 14, finalY + 10);
    
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const legalText = isEvents ? [
        'Este documento contiene información confidencial y de uso exclusivo para fines de auditoría de acceso.',
        'La divulgación, reproducción o uso no autorizado de este documento está prohibido por ley.',
        'Datos protegidos según Ley Nº 19.628 sobre Protección de Datos Personales de Chile.',
        `Total de eventos: ${accessEvents.length} (mostrando primeros 100) | Generado por: ${currentUser || 'Sistema'}`
    ] : [
        'Este documento contiene información confidencial y de uso exclusivo para fines de control de acceso.',
        'La divulgación, reproducción o uso no autorizado de este documento está prohibido por ley.',
        'Datos protegidos según Ley Nº 19.628 sobre Protección de Datos Personales de Chile.',
        `Total de registros: ${data.length} | Generado por: ${currentUser || 'Sistema'} | Página 1 de 1`
    ];
    
    legalText.forEach((line, i) => {
        doc.text(line, 14, finalY + 15 + (i * 4));
    });
    
    const fileName = type === 'Residentes' ? 'NeosTech_Residentes' : 
                   type === 'Vehículos' ? 'NeosTech_Vehiculos' : 'NeosTech_Eventos';
    doc.save(`${fileName}_${new Date().toISOString().slice(0,10)}.pdf`);
}

/* ============================================
   FASE 4: CONTROL DE ACCESO Y DISPOSITIVOS
   32 funciones completas extraídas de index.html
   ============================================ */

// ===== BLOQUES Y DEPARTAMENTOS (10 funciones) =====

async function loadBlocks() {
    const blocksList = document.getElementById('blocksList');
    const blockFilter = document.getElementById('blockFilter');
    
    if (!blocksList) return;
    
    blocksList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #7f8c8d;">Cargando bloques...</div>';
    
    try {
        const snapshot = await db.collection('blocks').orderBy('block_number').get();
        
        if (snapshot.empty) {
            // Crear bloques por defecto (1-20)
            const batch = db.batch();
            for (let i = 1; i <= 20; i++) {
                const ref = db.collection('blocks').doc();
                batch.set(ref, {
                    block_number: i,
                    name: `Block ${i}`,
                    enabled: true,
                    created_at: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            await batch.commit();
            showNotification('✅ 20 Blocks creados exitosamente', 'success');
            loadBlocks(); // Recargar
            return;
        }
        
        blocksList.innerHTML = '';
        if (blockFilter) {
            blockFilter.innerHTML = '<option value="">Todos los blocks</option>';
        }
        
        snapshot.forEach(doc => {
            const block = doc.data();
            
            // Card del bloque
            const card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '20px';
            card.style.textAlign = 'center';
            card.style.background = block.enabled ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))' : 'rgba(100, 100, 100, 0.1)';
            card.style.border = block.enabled ? '2px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(148, 163, 184, 0.2)';
            card.innerHTML = `
                <div style="font-size: 32px; margin-bottom: 10px;">${block.enabled ? '🏢' : '🔒'}</div>
                <h4 style="color: ${block.enabled ? '#3b82f6' : '#94a3b8'}; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Block ${block.block_number}</h4>
                <div style="font-size: 12px; color: ${block.enabled ? '#22c55e' : '#ef4444'}; margin-bottom: 12px; font-weight: 600;">
                    ${block.enabled ? '✅ Activo' : '❌ Inactivo'}
                </div>
                <button class="btn ${block.enabled ? 'btn-danger' : 'btn-success'}" onclick="toggleBlock('${doc.id}', ${!block.enabled})" 
                        style="padding: 8px 12px; font-size: 12px; width: 100%; font-weight: 600;">
                    ${block.enabled ? '🔒 Desactivar' : '✅ Activar'}
                </button>
            `;
            blocksList.appendChild(card);
            
            // Agregar al filtro
            if (blockFilter) {
                const option = document.createElement('option');
                option.value = block.block_number;
                option.textContent = `Block ${block.block_number}`;
                blockFilter.appendChild(option);
            }
        });
        
    } catch (error) {
        console.error('Error al cargar bloques:', error);
        blocksList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #e74c3c;">❌ Error al cargar bloques</div>';
    }
}

async function toggleBlock(blockId, newState) {
    try {
        await db.collection('blocks').doc(blockId).update({
            enabled: newState,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification(`✅ Bloque ${newState ? 'activado' : 'desactivado'}`, 'success');
        loadBlocks();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al actualizar bloque', 'error');
    }
}

async function addBlock() {
    try {
        // Obtener el número más alto de block actual
        const snapshot = await db.collection('blocks').orderBy('block_number', 'desc').limit(1).get();
        let nextBlockNumber = 1;
        
        if (!snapshot.empty) {
            const lastBlock = snapshot.docs[0].data();
            nextBlockNumber = (lastBlock.block_number || 0) + 1;
        }
        
        // Pedir confirmación al usuario
        const blockNumber = prompt(`Ingresa el número del nuevo block (sugerido: ${nextBlockNumber}):`, nextBlockNumber);
        
        if (!blockNumber) {
            return; // Usuario canceló
        }
        
        const blockNum = parseInt(blockNumber);
        
        if (isNaN(blockNum) || blockNum < 1) {
            showNotification('⚠️ Número de block inválido (debe ser un número mayor a 0)', 'error');
            return;
        }
        
        // Verificar si ya existe un block con ese número
        const existingBlock = await db.collection('blocks')
            .where('block_number', '==', blockNum)
            .get();
        
        if (!existingBlock.empty) {
            showNotification(`⚠️ Ya existe un Block con el número ${blockNum}`, 'warning');
            return;
        }
        
        // Crear el nuevo block
        await db.collection('blocks').add({
            block_number: blockNum,
            name: `Block ${blockNum}`,
            enabled: true,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`✅ Block ${blockNum} creado exitosamente`, 'success');
        loadBlocks();
        
    } catch (error) {
        console.error('❌ Error agregando block:', error);
        showNotification('❌ Error al agregar block: ' + error.message, 'error');
    }
}

async function loadDepartments(blockFilter = '') {
    const tbody = document.getElementById('departmentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #7f8c8d;">Cargando departamentos...</td></tr>';
    
    try {
        let query = db.collection('departments');
        
        if (blockFilter) {
            query = query.where('block', '==', blockFilter);
        }
        
        const snapshot = await query.orderBy('block').orderBy('number').get();
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #7f8c8d;">No hay departamentos. Haz clic en "Agregar Departamento" para crear uno.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        snapshot.forEach(doc => {
            const dept = doc.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #ecf0f1';
            tr.innerHTML = `
                <td style="padding: 10px; color: #1a1f3a; font-weight: 600;">Block ${dept.block}</td>
                <td style="padding: 10px; color: #2563eb; font-weight: 600; font-family: 'Courier New', monospace;">${dept.block}-${dept.number}</td>
                <td style="padding: 10px;">${dept.occupied ? '🔴 Ocupado' : '🟢 Disponible'}</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn" onclick="toggleDepartmentOccupied('${doc.id}', ${!dept.occupied})" 
                            style="padding: 5px 10px; font-size: 12px; margin-right: 5px;">
                        ${dept.occupied ? 'Marcar Disponible' : 'Marcar Ocupado'}
                    </button>
                    <button class="btn" onclick="deleteDepartment('${doc.id}')" 
                            style="padding: 5px 10px; font-size: 12px; background: #e74c3c;">
                        🗑️ Eliminar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Error al cargar departamentos:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #e74c3c;">❌ Error al cargar departamentos</td></tr>';
    }
}

function filterDepartmentsByBlock() {
    const blockFilter = document.getElementById('blockFilter');
    if (blockFilter) {
        loadDepartments(blockFilter.value);
    }
}

async function addDepartment() {
    // Abrir modal visual en lugar de usar prompts
    const modal = document.getElementById('departmentModal');
    const blockSelect = document.getElementById('deptBlock');
    const numberInput = document.getElementById('deptNumber');
    const occupiedCheckbox = document.getElementById('deptOccupied');
    
    // Cargar lista de blocks disponibles
    try {
        const snapshot = await db.collection('blocks').orderBy('block_number').get();
        blockSelect.innerHTML = '<option value="">Seleccionar block...</option>';
        
        snapshot.forEach(doc => {
            const block = doc.data();
            if (block.enabled) { // Solo mostrar blocks activos
                const option = document.createElement('option');
                option.value = block.block_number;
                option.textContent = `Block ${block.block_number}`;
                blockSelect.appendChild(option);
            }
        });
        
        // Limpiar formulario
        blockSelect.value = '';
        numberInput.value = '';
        occupiedCheckbox.checked = false;
        
        // Mostrar modal usando clase 'show'
        modal.classList.add('show');
        
        // Enfoque en el select de block
        setTimeout(() => blockSelect.focus(), 100);
        
    } catch (error) {
        console.error('Error cargando blocks:', error);
        showNotification('❌ Error al cargar blocks', 'error');
    }
}

function closeDepartmentModal() {
    const modal = document.getElementById('departmentModal');
    if (modal) modal.classList.remove('show');
}

async function saveDepartment() {
    const block = document.getElementById('deptBlock').value;
    const number = document.getElementById('deptNumber').value.trim();
    const occupied = document.getElementById('deptOccupied').checked;
    
    if (!block) {
        showNotification('⚠️ Debes seleccionar un block', 'error');
        return;
    }
    
    if (!number) {
        showNotification('⚠️ Debes ingresar un número de departamento', 'error');
        return;
    }
    
    try {
        // Verificar si ya existe
        const exists = await db.collection('departments')
            .where('block', '==', block.toString())
            .where('number', '==', number.toString())
            .get();
        
        if (!exists.empty) {
            showNotification('⚠️ Este departamento ya existe', 'warning');
            return;
        }
        
        // Crear el departamento
        await db.collection('departments').add({
            block: block.toString(),
            number: number.toString(),
            full_code: `${block}-${number}`,
            occupied: occupied,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`✅ Departamento ${block}-${number} agregado exitosamente`, 'success');
        closeDepartmentModal();
        
        // Recargar lista de departamentos
        const blockFilterEl = document.getElementById('blockFilter');
        loadDepartments(blockFilterEl ? blockFilterEl.value : '');
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al agregar departamento: ' + error.message, 'error');
    }
}

async function toggleDepartmentOccupied(deptId, newState) {
    try {
        await db.collection('departments').doc(deptId).update({
            occupied: newState,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification(`✅ Departamento actualizado`, 'success');
        const blockFilterEl = document.getElementById('blockFilter');
        loadDepartments(blockFilterEl ? blockFilterEl.value : '');
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al actualizar departamento', 'error');
    }
}

async function deleteDepartment(deptId) {
    if (!confirm('¿Estás seguro de eliminar este departamento?')) {
        return;
    }
    
    try {
        await db.collection('departments').doc(deptId).delete();
        showNotification('✅ Departamento eliminado', 'success');
        const blockFilterEl = document.getElementById('blockFilter');
        loadDepartments(blockFilterEl ? blockFilterEl.value : '');
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al eliminar departamento', 'error');
    }
}

// ===== PUNTOS DE ACCESO - SET 1 (6 funciones) =====

async function loadAccessPoints() {
    const tbody = document.getElementById('accessPointsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #7f8c8d;"><div class="spinner"></div>Cargando...</td></tr>';
    
    try {
        const snapshot = await db.collection('access_points').orderBy('name').get();
        
        if (snapshot.empty) {
            // Crear punto de acceso por defecto
            await db.collection('access_points').add({
                name: 'Portón Triwe',
                reader_id: 'porton_triwe',
                ip: '192.168.1.200',
                port: 60000,
                enabled: true,
                auto_open: true,
                relay_delay: 1000,
                description: 'Portón principal de acceso',
                created_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            loadAccessPoints();
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const ap = doc.data();
            const statusIcon = ap.enabled ? '🟢' : '🔴';
            const statusColor = ap.enabled ? '#22c55e' : '#ef4444';
            
            html += `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px;">${ap.name || 'Sin nombre'}</td>
                    <td style="padding: 12px;"><code style="color: var(--primary-color); font-size: 0.9em;">${ap.reader_id || 'N/A'}</code></td>
                    <td style="padding: 12px;">${ap.ip || 'N/A'}</td>
                    <td style="padding: 12px;">${ap.port || 'N/A'}</td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${ap.enabled ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="editAccessPoint('${doc.id}')" class="btn-primary" style="padding: 6px 12px; font-size: 0.85em; margin-right: 5px;">✏️</button>
                        <button onclick="toggleAccessPoint('${doc.id}', ${!ap.enabled})" class="btn ${ap.enabled ? 'btn-danger' : 'btn-success'}" style="padding: 6px 12px; font-size: 0.85em; margin-right: 5px;">
                            ${ap.enabled ? '🔒' : '✅'}
                        </button>
                        <button onclick="deleteAccessPoint('${doc.id}')" class="btn-danger" style="padding: 6px 12px; font-size: 0.85em;">🗑️</button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #7f8c8d;">No hay puntos de acceso configurados</td></tr>';
        
    } catch (error) {
        console.error('Error loading access points:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: red;">❌ Error al cargar puntos de acceso</td></tr>';
    }
}

async function addAccessPoint() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>🚪 Nuevo Punto de Acceso</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label><strong>Nombre del punto de acceso:</strong></label>
                    <input type="text" id="apName" placeholder="Ej: Portón Principal, Puerta Trasera" required>
                </div>
                
                <div class="form-group">
                    <label><strong>ID del Lector (único):</strong></label>
                    <input type="text" id="apReaderId" placeholder="Ej: porton_triwe, puerta_estacionamiento" required>
                    <small style="color: #7f8c8d;">Identificador único sin espacios, solo letras, números y guiones bajos</small>
                </div>
                
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label><strong>Dirección IP:</strong></label>
                        <input type="text" id="apIp" placeholder="192.168.1.200" required>
                    </div>
                    <div class="form-group">
                        <label><strong>Puerto:</strong></label>
                        <input type="number" id="apPort" value="60000" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label><strong>Descripción:</strong></label>
                    <textarea id="apDescription" rows="2" placeholder="Descripción opcional del punto de acceso"></textarea>
                </div>
                
                <div class="form-group">
                    <label><strong>Tiempo de apertura (ms):</strong></label>
                    <input type="number" id="apRelayDelay" value="1000" min="100" max="10000" step="100">
                    <small style="color: #7f8c8d;">Tiempo que el relé permanece activo (100-10000 ms)</small>
                </div>
                
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="apEnabled" checked style="width: 20px; height: 20px;">
                        <span>Activar punto de acceso</span>
                    </label>
                </div>
                
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="apAutoOpen" checked style="width: 20px; height: 20px;">
                        <span>Apertura automática al detectar tag válido</span>
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal').remove()" class="btn-secondary">Cancelar</button>
                <button onclick="saveAccessPoint()" class="btn-primary">✅ Crear Punto de Acceso</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
}

async function saveAccessPoint(apId = null) {
    const name = document.getElementById('apName').value.trim();
    const readerId = document.getElementById('apReaderId').value.trim().toLowerCase().replace(/\s+/g, '_');
    const ip = document.getElementById('apIp').value.trim();
    const port = parseInt(document.getElementById('apPort').value);
    const description = document.getElementById('apDescription').value.trim();
    const relayDelay = parseInt(document.getElementById('apRelayDelay').value);
    const enabled = document.getElementById('apEnabled').checked;
    const autoOpen = document.getElementById('apAutoOpen').checked;
    
    if (!name || !readerId || !ip || !port) {
        showNotification('⚠️ Completa todos los campos obligatorios', 'warning');
        return;
    }
    
    // Validar formato IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        showNotification('⚠️ Formato de IP inválido', 'warning');
        return;
    }
    
    // Validar puerto
    if (isNaN(port) || port < 1 || port > 65535) {
        showNotification('⚠️ Puerto inválido (1-65535)', 'warning');
        return;
    }
    
    try {
        // Verificar si el reader_id ya existe (solo si es nuevo)
        if (!apId) {
            const existing = await db.collection('access_points')
                .where('reader_id', '==', readerId)
                .get();
            
            if (!existing.empty) {
                showNotification(`⚠️ Ya existe un punto de acceso con ID "${readerId}"`, 'warning');
                return;
            }
        }
        
        const data = {
            name: name,
            reader_id: readerId,
            ip: ip,
            port: port,
            description: description,
            relay_delay: relayDelay,
            enabled: enabled,
            auto_open: autoOpen,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (apId) {
            await db.collection('access_points').doc(apId).update(data);
            showNotification('✅ Punto de acceso actualizado', 'success');
        } else {
            data.created_at = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('access_points').add(data);
            showNotification('✅ Punto de acceso creado', 'success');
        }
        
        document.querySelector('.modal').remove();
        loadAccessPoints();
        
    } catch (error) {
        console.error('Error saving access point:', error);
        showNotification('❌ Error al guardar punto de acceso', 'error');
    }
}

async function editAccessPoint(apId) {
    try {
        const doc = await db.collection('access_points').doc(apId).get();
        if (!doc.exists) {
            showNotification('⚠️ Punto de acceso no encontrado', 'error');
            return;
        }
        
        const ap = doc.data();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>✏️ Editar Punto de Acceso</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label><strong>Nombre del punto de acceso:</strong></label>
                        <input type="text" id="apName" value="${ap.name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>ID del Lector (único):</strong></label>
                        <input type="text" id="apReaderId" value="${ap.reader_id || ''}" required>
                        <small style="color: #7f8c8d;">Identificador único sin espacios</small>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label><strong>Dirección IP:</strong></label>
                            <input type="text" id="apIp" value="${ap.ip || ''}" required>
                        </div>
                        <div class="form-group">
                            <label><strong>Puerto:</strong></label>
                            <input type="number" id="apPort" value="${ap.port || 60000}" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Descripción:</strong></label>
                        <textarea id="apDescription" rows="2">${ap.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><strong>Tiempo de apertura (ms):</strong></label>
                        <input type="number" id="apRelayDelay" value="${ap.relay_delay || 1000}" min="100" max="10000" step="100">
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="apEnabled" ${ap.enabled ? 'checked' : ''} style="width: 20px; height: 20px;">
                            <span>Activar punto de acceso</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="apAutoOpen" ${ap.auto_open ? 'checked' : ''} style="width: 20px; height: 20px;">
                            <span>Apertura automática al detectar tag válido</span>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn-secondary">Cancelar</button>
                    <button onclick="saveAccessPoint('${apId}')" class="btn-primary">💾 Guardar Cambios</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        
    } catch (error) {
        console.error('Error loading access point:', error);
        showNotification('❌ Error al cargar punto de acceso', 'error');
    }
}

async function toggleAccessPoint(apId, newState) {
    try {
        await db.collection('access_points').doc(apId).update({
            enabled: newState,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification(`✅ Punto de acceso ${newState ? 'activado' : 'desactivado'}`, 'success');
        loadAccessPoints();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al actualizar punto de acceso', 'error');
    }
}

async function deleteAccessPoint(apId) {
    if (!confirm('¿Eliminar este punto de acceso? Esta acción no se puede deshacer.')) return;
    
    try {
        await db.collection('access_points').doc(apId).delete();
        showNotification('✅ Punto de acceso eliminado', 'success');
        loadAccessPoints();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al eliminar punto de acceso', 'error');
    }
}

// ===== PUNTOS DE ACCESO - SET 2: CONFIGURACIÓN MODAL (9 funciones) =====

function showAccessPointConfigModal() {
    const modal = document.getElementById('accessPointConfigModal');
    if (modal) {
        modal.classList.add('show');
        loadAccessPointsList();
    }
}

function closeAccessPointConfigModal() {
    const modal = document.getElementById('accessPointConfigModal');
    if (modal) modal.classList.remove('show');
    cancelAccessPointForm();
}

function showAddAccessPointForm() {
    const form = document.getElementById('accessPointForm');
    const formTitle = document.getElementById('formTitle');
    if (form && formTitle) {
        formTitle.textContent = 'Nuevo Punto de Acceso';
        document.getElementById('editAccessPointId').value = '';
        document.getElementById('apName').value = '';
        document.getElementById('apType').value = '';
        document.getElementById('apLocation').value = '';
        document.getElementById('apReaderId').value = '';
        document.getElementById('apMode').value = 'automatica';
        document.getElementById('apIp').value = '';
        document.getElementById('apPort').value = '';
        document.getElementById('apActive').checked = true;
        form.style.display = 'block';
    }
}

function cancelAccessPointForm() {
    const form = document.getElementById('accessPointForm');
    if (form) form.style.display = 'none';
}

async function loadAccessPointsList() {
    const container = document.getElementById('accessPointsList');
    if (!container) return;

    try {
        container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">Cargando...</p>';

        const snapshot = await db.collection('access_points').orderBy('name').get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">No hay puntos de acceso configurados</p>';
            return;
        }

        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="background: rgba(59, 130, 246, 0.1); border-bottom: 2px solid rgba(59, 130, 246, 0.3);">';
        html += '<th style="padding: 12px; text-align: left; color: #3b82f6;">Nombre</th>';
        html += '<th style="padding: 12px; text-align: left; color: #3b82f6;">Tipo</th>';
        html += '<th style="padding: 12px; text-align: left; color: #3b82f6;">Ubicación</th>';
        html += '<th style="padding: 12px; text-align: left; color: #3b82f6;">ID Lector</th>';
        html += '<th style="padding: 12px; text-align: center; color: #3b82f6;">Estado</th>';
        html += '<th style="padding: 12px; text-align: center; color: #3b82f6;">Acciones</th>';
        html += '</tr></thead><tbody>';

        snapshot.forEach(doc => {
            const ap = doc.data();
            const typeIcon = ap.type === 'puerta' ? '🚪' : '🚧';
            const typeLabel = ap.type === 'puerta' ? 'Puerta' : 'Portón';
            const statusColor = ap.active ? '#0ea5e9' : '#94a3b8';
            const statusText = ap.active ? 'Activo' : 'Inactivo';

            html += `<tr style="border-bottom: 1px solid rgba(100, 116, 139, 0.2);">`;
            html += `<td style="padding: 12px; color: #cbd5e1;">${typeIcon} ${escapeHtml(ap.name || 'Sin nombre')}</td>`;
            html += `<td style="padding: 12px; color: #94a3b8;">${typeLabel}</td>`;
            html += `<td style="padding: 12px; color: #94a3b8;">${escapeHtml(ap.location || 'N/A')}</td>`;
            html += `<td style="padding: 12px;"><code style="color: var(--primary-color); font-size: 0.9em;">${escapeHtml(ap.reader_id || 'N/A')}</code></td>`;
            html += `<td style="padding: 12px; text-align: center;"><span style="color: ${statusColor}; font-weight: 600;">${statusText}</span></td>`;
            html += `<td style="padding: 12px; text-align: center;">`;
            html += `<button onclick="editAccessPoint('${doc.id}')" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85em; margin-right: 5px;">✏️ Editar</button>`;
            html += `<button onclick="toggleAccessPoint('${doc.id}', ${!ap.active})" class="btn ${ap.active ? 'btn-danger' : 'btn-success'}" style="padding: 6px 12px; font-size: 0.85em; margin-right: 5px;">`;
            html += `${ap.active ? '🔒 Desactivar' : '✅ Activar'}</button>`;
            html += `<button onclick="deleteAccessPoint('${doc.id}')" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.85em;">🗑️</button>`;
            html += `</td></tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Error cargando puntos de acceso:', error);
        container.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 20px;">❌ Error al cargar datos</p>';
    }
}

// ===== DISPOSITIVOS ESP32 - CONFIGURACIÓN Y GESTIÓN (7 funciones) =====

let currentDeviceId = null;

function showDeviceSettings(deviceId) {
    currentDeviceId = deviceId;
    const modal = document.getElementById('deviceSettingsModal');
    const title = document.getElementById('deviceSettingsTitle');
    
    // Mapeo de nombres amigables
    const deviceNames = {
        'porton_triwe': 'Portón Triwe',
        'porton_trasero': 'Portón Trasero',
        'porton_garage': 'Portón Garage',
        'puerta_principal': 'Puerta Entrada Principal',
        'puerta_reuniones': 'Puerta Sala Reuniones',
        'puerta_parking': 'Puerta Estacionamiento'
    };
    
    if (title) {
        title.textContent = `Funciones Avanzadas - ${deviceNames[deviceId] || deviceId}`;
    }
    
    if (modal) {
        modal.classList.add('show');
        loadDeviceConfig(deviceId);
    }
}

function closeDeviceSettingsModal() {
    const modal = document.getElementById('deviceSettingsModal');
    if (modal) modal.classList.remove('show');
    currentDeviceId = null;
}

async function loadDeviceConfig(deviceId) {
    const statusEl = document.getElementById('deviceStatus');
    
    try {
        // Intentar cargar configuración desde la base de datos
        const snapshot = await db.collection('access_points')
            .where('reader_id', '==', deviceId)
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            const config = snapshot.docs[0].data();
            
            // Cargar datos en el formulario
            document.getElementById('deviceIp').value = config.ip || '';
            document.getElementById('devicePort').value = config.port || '';
            document.getElementById('deviceBaudrate').value = config.baudrate || '115200';
            document.getElementById('deviceProtocol').value = config.protocol || 'iso14443a';
            document.getElementById('deviceOpenTime').value = config.open_time || 3;
            document.getElementById('deviceReadTimeout').value = config.read_timeout || 1000;
            document.getElementById('deviceBeep').checked = config.beep !== false;
            document.getElementById('deviceLed').checked = config.led !== false;
            
            // Actualizar estado
            if (statusEl) {
                statusEl.textContent = config.active ? '✅ Activo' : '❌ Inactivo';
                statusEl.style.color = config.active ? '#22c55e' : '#ef4444';
            }
            
            // Actualizar última actividad
            const lastSeenEl = document.getElementById('deviceLastSeen');
            if (lastSeenEl && config.updated_at) {
                const lastUpdate = config.updated_at.toDate();
                lastSeenEl.textContent = lastUpdate.toLocaleString('es-CL');
            }
        } else {
            if (statusEl) {
                statusEl.textContent = '⚠️ No configurado';
                statusEl.style.color = '#94a3b8';
            }
        }
        
    } catch (error) {
        console.error('Error cargando configuración:', error);
        if (statusEl) {
            statusEl.textContent = '❌ Error';
            statusEl.style.color = '#ef4444';
        }
    }
}

async function saveDeviceSettings() {
    if (!currentDeviceId) {
        showNotification('⚠️ No hay dispositivo seleccionado', 'warning');
        return;
    }
    
    const ip = document.getElementById('deviceIp').value.trim();
    const port = document.getElementById('devicePort').value.trim();
    const baudrate = document.getElementById('deviceBaudrate').value;
    const protocol = document.getElementById('deviceProtocol').value;
    const openTime = document.getElementById('deviceOpenTime').value;
    const readTimeout = document.getElementById('deviceReadTimeout').value;
    const beep = document.getElementById('deviceBeep').checked;
    const led = document.getElementById('deviceLed').checked;
    
    try {
        // Buscar el documento del punto de acceso
        const snapshot = await db.collection('access_points')
            .where('reader_id', '==', currentDeviceId)
            .limit(1)
            .get();
        
        const data = {
            ip: ip || null,
            port: port || null,
            baudrate: baudrate,
            protocol: protocol,
            open_time: parseInt(openTime) || 3,
            read_timeout: parseInt(readTimeout) || 1000,
            beep: beep,
            led: led,
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (!snapshot.empty) {
            // Actualizar existente
            await snapshot.docs[0].ref.update(data);
            showNotification('✅ Configuración guardada exitosamente', 'success');
        } else {
            showNotification('⚠️ Punto de acceso no encontrado en la base de datos', 'warning');
        }
        
        closeDeviceSettingsModal();
        
    } catch (error) {
        console.error('Error guardando configuración:', error);
        showNotification('❌ Error al guardar: ' + error.message, 'error');
    }
}

async function testDeviceConnection() {
    if (!currentDeviceId) return;
    
    showNotification('🔄 Probando conexión...', 'info');
    
    const ip = document.getElementById('deviceIp').value.trim();
    const port = document.getElementById('devicePort').value.trim();
    
    if (!ip || !port) {
        showNotification('⚠️ Configura IP y puerto primero', 'warning');
        return;
    }
    
    try {
        // Intentar conectar al Gateway
        const response = await fetch(`http://${ip}:${port}/api/reader/ping`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            showNotification('✅ Conexión exitosa al dispositivo', 'success');
            const statusEl = document.getElementById('deviceStatus');
            if (statusEl) {
                statusEl.textContent = '✅ Conectado';
                statusEl.style.color = '#22c55e';
            }
        } else {
            showNotification('⚠️ El dispositivo respondió con error', 'warning');
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        showNotification('❌ No se pudo conectar al dispositivo', 'error');
        const statusEl = document.getElementById('deviceStatus');
        if (statusEl) {
            statusEl.textContent = '❌ Sin conexión';
            statusEl.style.color = '#ef4444';
        }
    }
}

async function readDeviceInfo() {
    showNotification('📖 Leyendo información del dispositivo...', 'info');
    
    const ip = document.getElementById('deviceIp').value.trim();
    const port = document.getElementById('devicePort').value.trim();
    
    if (!ip || !port) {
        showNotification('⚠️ Configura IP y puerto primero', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`http://${ip}:${port}/api/reader/info`);
        if (response.ok) {
            const data = await response.json();
            const firmwareEl = document.getElementById('deviceFirmware');
            if (firmwareEl && data.firmware) {
                firmwareEl.textContent = data.firmware;
            }
            showNotification('✅ Información actualizada', 'success');
        } else {
            showNotification('⚠️ No se pudo leer la información', 'warning');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al leer información', 'error');
    }
}

async function resetDevice() {
    if (!confirm('¿Estás seguro de reiniciar el lector? Esto puede interrumpir el servicio temporalmente.')) {
        return;
    }
    
    showNotification('🔄 Reiniciando dispositivo...', 'info');
    
    const ip = document.getElementById('deviceIp').value.trim();
    const port = document.getElementById('devicePort').value.trim();
    
    if (!ip || !port) {
        showNotification('⚠️ Configura IP y puerto primero', 'warning');
        return;
    }
    
    try {
        await fetch(`http://${ip}:${port}/api/reader/reset`, {
            method: 'POST'
        });
        showNotification('✅ Comando de reinicio enviado', 'success');
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al reiniciar dispositivo', 'error');
    }
}

// ===== HELPER FUNCTION: HTML ESCAPING =====

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ============================================
   FASE 3: SISTEMA DE ALERTAS DE EMERGENCIA
   30+ funciones completas extraídas de index.html
   ============================================ */

// ===== VARIABLES GLOBALES =====
// activeAlerts y alertTemplates están declarados arriba

// ===== PLANTILLAS DE ALERTAS =====
function initAlertTemplates() {
    alertTemplates = {
        FIRE: {
            title: '🔥 INCENDIO DETECTADO',
            message: `Se ha detectado un incendio en las áreas indicadas.

INSTRUCCIONES INMEDIATAS:
1. Mantenga la calma y no corra
2. Diríjase a la escalera de emergencia más cercana
3. Cierre puertas y ventanas tras de sí
4. Ayude a personas con movilidad reducida
5. Siga instrucciones del personal de seguridad
6. NO regrese por objetos personales

Punto de encuentro: Plaza principal del edificio

Una vez en lugar seguro, confirme su estado en la app.`,
            severity: 'CRITICAL'
        },
        FIGHT: {
            title: '⚠️ PELEA DETECTADA',
            message: `Se ha detectado una pelea en las áreas indicadas.

INSTRUCCIONES INMEDIATAS:
1. Mantenga la calma
2. Aléjese de la zona del incidente
3. NO intervenga directamente
4. Resguarde a niños y adultos mayores
5. Espere instrucciones del personal de seguridad

Seguridad ha sido notificada y está en camino.

Reporte cualquier información adicional a administración.`,
            severity: 'HIGH'
        },
        ROBBERY: {
            title: '🚨 ROBO DETECTADO',
            message: `Se ha detectado un robo en las áreas indicadas.

INSTRUCCIONES INMEDIATAS:
1. Mantenga la calma
2. Permanezca en su departamento con puertas cerradas
3. NO confronte a los sospechosos
4. Observe y tome nota de detalles (descripción, dirección de escape)
5. Espere instrucciones del personal de seguridad

Carabineros y seguridad han sido notificados.

Contacto Emergencias: 133 (Carabineros)`,
            severity: 'CRITICAL'
        },
        EVACUATION: {
            title: '🚪 EVACUACIÓN INMEDIATA REQUERIDA',
            message: `Se requiere evacuación inmediata del edificio.

INSTRUCCIONES:
1. Tome solo artículos esenciales (documentos, medicamentos)
2. Use escalera de emergencia, NO corra
3. Ayude a personas con movilidad reducida
4. Cierre puertas al salir
5. Diríjase al punto de encuentro designado

Punto de encuentro: Plaza principal del edificio
Contacto emergencias: 132`,
            severity: 'CRITICAL'
        },
        FLOOD: {
            title: '💧 FUGA DE AGUA DETECTADA',
            message: `Se ha detectado fuga de agua en las áreas indicadas.

INSTRUCCIONES:
1. Evite la zona afectada
2. NO toque sistemas eléctricos cercanos
3. Proteja sus pertenencias del agua
4. Reporte filtraciones adicionales a administración

Personal de mantención está trabajando en la solución.`,
            severity: 'HIGH'
        },
        POWER_OUTAGE: {
            title: '⚡ CORTE DE ENERGÍA',
            message: `Se informa corte de energía eléctrica en el edificio.

INFORMACIÓN:
- Generador de emergencia activado
- Iluminación de emergencia operativa
- Evite uso de equipos de alto consumo
- Mantenga refrigeradores cerrados

Estimado de restablecimiento: Se informará en breve.

Se notificará cuando se restablezca el servicio.`,
            severity: 'MEDIUM'
        },
        SYSTEM_FAILURE: {
            title: '⚙️ FALLA DE SISTEMAS',
            message: `Se informa falla en sistemas del edificio.

Personal técnico está trabajando en la solución.

Se actualizará información en breve.`,
            severity: 'MEDIUM'
        },
        GENERAL: {
            title: '📢 COMUNICADO IMPORTANTE',
            message: '',
            severity: 'LOW'
        }
    };
}

// ===== INICIALIZACIÓN PRINCIPAL =====
function initEmergencyAlerts() {
    console.log('[Alertas] Inicializando sistema de alertas de emergencia...');
    
    initAlertTemplates();
    generateFloorsGrid(3); // Máximo 3 pisos por bloque
    loadActiveAlerts();
    listenToActiveAlerts();
    
    // Event listeners
    const alertType = document.getElementById('alertType');
    if (alertType) {
        alertType.addEventListener('change', function() {
            autoFillAlertMessage(this.value);
        });
    }
    
    const severityRadios = document.querySelectorAll('input[name="severity"]');
    severityRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const isCritical = document.querySelector('input[name="severity"]:checked').value === 'CRITICAL';
            const warning = document.getElementById('doubleAuthWarning');
            if (warning) {
                warning.style.display = isCritical ? 'block' : 'none';
            }
        });
    });
}

// ===== GENERAR GRID DE PISOS =====
function generateFloorsGrid(totalFloors) {
    const grid = document.getElementById('floorsGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Opción "Todo el edificio" (por defecto marcado)
    grid.innerHTML += `
        <div class="floor-checkbox">
            <input type="checkbox" id="floor_all" value="all" checked>
            <label for="floor_all">Todo el edificio</label>
        </div>
    `;
    
    for (let i = 1; i <= totalFloors; i++) {
        grid.innerHTML += `
            <div class="floor-checkbox">
                <input type="checkbox" id="floor_${i}" value="${i}" checked>
                <label for="floor_${i}">Piso ${i}</label>
            </div>
        `;
    }
    
    // Event listener para "Todo el edificio"
    const floorAll = document.getElementById('floor_all');
    if (floorAll) {
        floorAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#floorsGrid input[type="checkbox"]');
            checkboxes.forEach(cb => {
                if (cb.id !== 'floor_all') {
                    cb.checked = this.checked;
                }
            });
        });
    }
}

// ===== AUTO-LLENAR MENSAJE SEGÚN TIPO =====
function autoFillAlertMessage(type) {
    if (!type || !alertTemplates[type]) return;
    
    const template = alertTemplates[type];
    const zone = document.getElementById('buildingZone').value || '{zone}';
    const meetingPoint = document.getElementById('meetingPoint').value || '{meeting_point}';
    
    // Llenar título
    const titleInput = document.getElementById('alertTitle');
    if (titleInput) {
        titleInput.value = template.title.replace('{zone}', zone);
    }
    
    // Llenar mensaje
    const messageInput = document.getElementById('alertMessage');
    if (messageInput) {
        messageInput.value = template.message
            .replace(/{zone}/g, zone)
            .replace(/{meeting_point}/g, meetingPoint);
    }
    
    // Seleccionar severidad
    const severityId = `severity${template.severity.charAt(0) + template.severity.slice(1).toLowerCase()}`;
    const severityRadio = document.getElementById(severityId);
    if (severityRadio) {
        severityRadio.checked = true;
        severityRadio.dispatchEvent(new Event('change'));
    }
}

// ===== CARGAR ALERTAS ACTIVAS =====
async function loadActiveAlerts() {
    try {
        const alertsSnapshot = await db.collection('emergency_alerts')
            .where('clientId', '==', window.currentUserClientId).where('status', '==', 'ACTIVE')
            .orderBy('issued_at', 'desc')
            .get();
        
        activeAlerts = [];
        alertsSnapshot.forEach(doc => {
            activeAlerts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Actualizar contador
        const counter = document.getElementById('activeAlertsCount');
        if (counter) {
            counter.textContent = activeAlerts.length;
        }
        
        renderActiveAlerts();
        loadTotalAlertsCount();
        
    } catch (error) {
        console.error('[Alertas] Error cargando alertas activas:', error);
    }
}

// ===== RENDERIZAR LISTA DE ALERTAS =====
function renderActiveAlerts() {
    const container = document.getElementById('activeAlertsList');
    if (!container) return;
    
    if (activeAlerts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 80px 20px; background: linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%);">
                <div style="font-size: 72px; margin-bottom: 20px; opacity: 0.15;">✅</div>
                <h3 style="font-size: 20px; color: #374151; margin-bottom: 10px; font-weight: 700;">No hay alertas activas</h3>
                <p style="font-size: 15px; color: #6B7280; font-weight: 500;">El sistema está en estado normal</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    activeAlerts.forEach(alert => {
        const severityClass = alert.severity ? alert.severity.toLowerCase() : 'medium';
        const typeIcon = getAlertIcon(alert.type);
        const confirmationPercent = (alert.total_recipients || 0) > 0 ?
             Math.round(((alert.confirmed_safe_count || 0) / alert.total_recipients) * 100)
            : 0;
        
        const issuedTime = alert.issued_at ?
            new Date(alert.issued_at.seconds * 1000).toLocaleTimeString('es-CL', {hour: '2-digit', minute: '2-digit'}) 
            : 'Recién';
        
        // Formatear bloques
        const blocksDisplay = alert.blocks_display || alert.building_zone || 'Sin especificar';
        const affectedBlocks = alert.affected_blocks || [];
        const blocksDetail = affectedBlocks.length > 0 ? 
            (affectedBlocks.length === 19 ? 'Todos los bloques (1-19)' : 
             affectedBlocks.length > 8 ? `Bloques: ${affectedBlocks.slice(0, 8).join(', ')}...` :
             `Bloques: ${affectedBlocks.join(', ')}`) : blocksDisplay;
        
        const typeDisplay = {
            'FIRE': 'INCENDIO',
            'FIGHT': 'PELEA',
            'ROBBERY': 'ROBO',
            'EVACUATION': 'EVACUACIÓN',
            'FLOOD': 'FUGA DE AGUA',
            'POWER_OUTAGE': 'CORTE ENERGÍA',
            'SYSTEM_FAILURE': 'FALLA SISTEMA',
            'GENERAL': 'GENERAL'
        }[alert.type] || alert.type;
        
        const cardHTML = `
            <div class="alert-card ${severityClass}" style="background: #FFFFFF; border-left: 5px solid ${severityClass === 'critical' ? '#DC2626' : '#F59E0B'}; padding: 24px; margin-bottom: 20px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div style="flex: 1;">
                        <span class="alert-type-badge ${alert.type.toLowerCase().replace('_', '-')}" style="display: inline-block; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 12px; letter-spacing: 0.5px;">
                            ${typeIcon} ${typeDisplay}
                        </span>
                        <h3 style="font-size: 22px; font-weight: 700; color: #1F2937; margin: 0; line-height: 1.3;">${alert.title || 'Alerta de Emergencia'}</h3>
                    </div>
                    <span class="alert-status-badge active" style="padding: 8px 18px; border-radius: 20px; font-size: 12px; font-weight: 700; background: linear-gradient(135deg, #DC2626, #991B1B); color: white;">ACTIVA</span>
                </div>
                
                <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 16px; font-size: 14px; font-weight: 600;">
                    <div style="display: flex; align-items: center; gap: 8px; color: #6B7280;">
                        <span style="font-size: 16px;">🕒</span>
                        <span>${issuedTime}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; color: #DC2626; font-weight: 700;">
                        <span style="font-size: 16px;">📍</span>
                        <span>${blocksDetail}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; color: #059669;">
                        <span style="font-size: 16px;">✅</span>
                        <span>${alert.confirmed_safe_count || 0}/${alert.total_recipients || 0} confirmados</span>
                    </div>
                </div>
                
                <div style="color: #374151; line-height: 1.7; margin-bottom: 16px; padding: 18px; background: linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%); border-radius: 10px; border-left: 3px solid #E5E7EB; font-size: 14px;">
                    ${(alert.message || 'Sin mensaje').substring(0, 250)}${(alert.message || '').length > 250 ? '...' : ''}
                </div>
                
                <div style="margin: 16px 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: #6B7280; margin-bottom: 10px; font-weight: 600;">
                        <span>Tasa de confirmación</span>
                        <span style="color: #059669; font-weight: 700; font-size: 14px;">${confirmationPercent}%</span>
                    </div>
                    <div style="background: #E5E7EB; height: 10px; border-radius: 10px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #10B981 0%, #059669 100%); height: 100%; width: ${confirmationPercent}%; transition: width 0.3s ease;"></div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 18px;">
                    <button onclick="viewAlertDetails('${alert.id}')" style="flex: 1; padding: 12px 24px; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, #3B82F6, #2563EB); color: white; transition: all 0.2s;">
                        📊 Ver Detalles
                    </button>
                    <button onclick="confirmCancelAlert('${alert.id}')" style="flex: 1; padding: 12px 24px; border: 2px solid #DC2626; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; background: white; color: #DC2626; transition: all 0.2s;">
                        ❌ Cancelar Alerta
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML += cardHTML;
    });
}

// ===== OBTENER ICONO SEGÚN TIPO =====
function getAlertIcon(type) {
    const icons = {
        'FIRE': '🔥',
        'FIGHT': '⚠️',
        'ROBBERY': '🚨',
        'EVACUATION': '🚪',
        'FLOOD': '💧',
        'POWER_OUTAGE': '⚡',
        'SYSTEM_FAILURE': '⚙️',
        'GENERAL': '📢'
    };
    return icons[type] || '📢';
}

// ===== CARGAR CONTADOR TOTAL DE ALERTAS =====
async function loadTotalAlertsCount() {
    try {
        const snapshot = await db.collection('emergency_alerts').where('clientId', '==', window.currentUserClientId).get();
        const counter = document.getElementById('totalAlertsCount');
        if (counter) {
            counter.textContent = snapshot.size;
        }
    } catch (error) {
        console.error('[Alertas] Error cargando total:', error);
    }
}

// ===== ESCUCHAR CAMBIOS EN TIEMPO REAL =====
function listenToActiveAlerts() {
    db.collection('emergency_alerts')
        .where('clientId', '==', window.currentUserClientId).where('status', '==', 'ACTIVE')
        .onSnapshot(snapshot => {
            console.log('[Alertas] Actualización en tiempo real');
            loadActiveAlerts();
        }, error => {
            console.error('[Alertas] Error en listener:', error);
        });
}

// ===== ABRIR MODAL DE NUEVA ALERTA =====
function openNewAlertModal() {
    const modal = document.getElementById('newAlertModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Generar checkboxes de bloques 1-19
        const blocksGrid = document.getElementById('blocksGrid');
        if (blocksGrid && blocksGrid.children.length === 0) {
            for (let i = 1; i <= 19; i++) {
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; align-items: center; justify-content: center;';
                div.innerHTML = `
                    <input type="checkbox" id="block${i}" value="${i}" class="block-item" style="display: none;">
                    <label for="block${i}" style="width: 100%; padding: 12px 8px; text-align: center; border: 2px solid #E5E7EB; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; background: #FFFFFF; color: #6B7280; user-select: none;">
                        ${i}
                    </label>
                `;
                blocksGrid.appendChild(div);
                
                // Agregar listener para cambiar estilo al seleccionar
                const checkbox = div.querySelector('input');
                const label = div.querySelector('label');
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        label.style.background = 'linear-gradient(135deg, #DC2626, #991B1B)';
                        label.style.color = '#FFFFFF';
                        label.style.borderColor = '#DC2626';
                        label.style.transform = 'scale(1.05)';
                    } else {
                        label.style.background = '#FFFFFF';
                        label.style.color = '#6B7280';
                        label.style.borderColor = '#E5E7EB';
                        label.style.transform = 'scale(1)';
                    }
                    // Ocultar error si hay al menos un bloque seleccionado
                    const anyChecked = document.querySelectorAll('.block-item:checked').length > 0;
                    document.getElementById('blocksError').style.display = anyChecked ? 'none' : 'none';
                });
            }
        }
        
        initEmergencyAlerts();
    }
}

// ===== SELECCIONAR TODOS LOS BLOQUES =====
function selectAllBlocks() {
    document.querySelectorAll('.block-item').forEach(cb => {
        cb.checked = true;
        cb.dispatchEvent(new Event('change'));
    });
}

// ===== LIMPIAR SELECCIÓN DE BLOQUES =====
function clearAllBlocks() {
    document.querySelectorAll('.block-item').forEach(cb => {
        cb.checked = false;
        cb.dispatchEvent(new Event('change'));
    });
}

// ===== CARGAR PLANTILLA AL SELECCIONAR TIPO =====
function loadAlertTemplate() {
    const type = document.getElementById('alertType').value;
    if (!type || !alertTemplates[type]) return;
    
    const template = alertTemplates[type];
    document.getElementById('alertTitle').value = template.title;
    document.getElementById('alertMessage').value = template.message;
    
    // Seleccionar severidad automáticamente
    const severityRadio = document.getElementById('severity' + template.severity.charAt(0) + template.severity.slice(1).toLowerCase());
    if (severityRadio) severityRadio.checked = true;
}

// ===== CERRAR MODAL DE NUEVA ALERTA =====
function closeNewAlertModal() {
    const modal = document.getElementById('newAlertModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        const form = document.getElementById('newAlertForm');
        if (form) form.reset();
    }
}

// ===== VISTA PREVIA DE ALERTA =====
function previewAlert() {
    const type = document.getElementById('alertType').value;
    const severity = document.querySelector('input[name="severity"]:checked').value;
    const title = document.getElementById('alertTitle').value;
    const message = document.getElementById('alertMessage').value;
    const zone = document.getElementById('buildingZone').value;
    
    if (!type || !severity || !title || !message || !zone) {
        alert('Por favor complete todos los campos requeridos');
        return;
    }
    
    const preview = `TIPO: ${type}\nSEVERIDAD: ${severity}\nZONA: ${zone}\n\n${title}\n\n${message}`;
    alert(preview);
}

// ===== EMITIR ALERTA =====
async function emitAlert() {
    console.log('[Alertas] 🚨 Función emitAlert() llamada');
    
    try {
        const type = document.getElementById('alertType').value;
        const severity = document.querySelector('input[name="severity"]:checked').value;
        const title = document.getElementById('alertTitle').value;
        const message = document.getElementById('alertMessage').value;
        const zone = document.getElementById('buildingZone').value || '';
        const meetingPoint = document.getElementById('meetingPoint').value || 'Plaza principal del edificio';
        
        // Obtener bloques seleccionados
        const affectedBlocks = [];
        document.querySelectorAll('.block-item:checked').forEach(cb => {
            affectedBlocks.push(parseInt(cb.value));
        });
        
        console.log('[Alertas] 📋 Valores del formulario:', {
            type,
            severity,
            title,
            message,
            zone,
            meetingPoint,
            affectedBlocks
        });
        
        // Validación: bloques requeridos
        if (affectedBlocks.length === 0) {
            document.getElementById('blocksError').style.display = 'block';
            document.getElementById('blocksGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        
        if (!type || !severity || !title || !message) {
            console.warn('[Alertas] ⚠️ Campos requeridos faltantes');
            alert('Por favor complete todos los campos requeridos:\n\n' + 
                  (!type ? '- Tipo de Alerta\n' : '') +
                  (!severity ? '- Severidad\n' : '') +
                  (!title ? '- Título\n' : '') +
                  (!message ? '- Mensaje\n' : ''));
            return;
        }
        
        console.log('[Alertas] ✅ Validación de campos pasada');
        console.log('[Alertas] 📍 Bloques afectados:', affectedBlocks);
        
        // Mostrar loading en el botón
        const emitButton = event.target || document.querySelector('[onclick*="emitAlert"]');
        const originalButtonText = emitButton ? emitButton.innerHTML : '';
        if (emitButton) {
            emitButton.disabled = true;
            emitButton.innerHTML = '⏳ Emitiendo alerta...';
        }
        
        // Formatear bloques para mostrar
        const blocksDisplay = affectedBlocks.length === 19 ? 'Todos los bloques' : 
                             affectedBlocks.length > 5 ? `Bloques ${affectedBlocks.slice(0, 3).join(', ')} y ${affectedBlocks.length - 3} más` :
                             `Bloque${affectedBlocks.length > 1 ? 's' : ''} ${affectedBlocks.join(', ')}`;
        
        // Preparar datos
        const alertData = {
            type: type,
            severity: severity,
            title: title,
            message: message,
            building_zone: zone || blocksDisplay,
            meeting_point: meetingPoint,
            affected_blocks: affectedBlocks,
            blocks_display: blocksDisplay,
            send_push: document.getElementById('sendPush').checked || false,
            send_sms: document.getElementById('sendSMS').checked || false,
            send_email: document.getElementById('sendEmail').checked || false,
            status: 'ACTIVE',
            issued_at: firebase.firestore.FieldValue.serverTimestamp(),
            issued_by: currentUser.uid || 'admin',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            confirmed_safe_count: 0,
            total_recipients: 0,
            clientId: window.currentUserClientId
        };
        
        console.log('[Alertas] 📦 Datos de alerta preparados:', alertData);
        console.log('[Alertas] 💾 Guardando en Firestore...');
        
        // Guardar en Firestore
        const docRef = await db.collection('emergency_alerts').add(alertData);
        
        console.log('[Alertas] ✅ Alerta guardada con ID:', docRef.id);
        
        // Contar suscriptores y enviar notificaciones push
        console.log('[Alertas] 👥 Consultando suscriptores...');
        
        // Primero ver TODOS los suscriptores (sin filtro)
        const allSubscribersSnapshot = await db.collection('alert_subscribers').where('clientId', '==', window.currentUserClientId).get();
        console.log(`[Alertas] 📊 Total de registros en DB: ${allSubscribersSnapshot.size}`);
        
        allSubscribersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log('[Alertas] 📝 Registro encontrado:', {
                id: doc.id,
                name: data.full_name,
                apartment: data.apartment,
                has_fcm_token: !!data.fcm_token,
                notifications_enabled: data.notifications_enabled,
                device_type: data.device_type
            });
        });
        
        // Ahora filtrar solo los activos
        const subscribersSnapshot = await db.collection('alert_subscribers')
            .where('clientId', '==', window.currentUserClientId).where('notifications_enabled', '==', true)
            .get();
        const subscribersCount = subscribersSnapshot.size;
        
        console.log(`[Alertas] ✅ Suscriptores ACTIVOS (con notifications_enabled=true): ${subscribersCount}`);
        
        // Mostrar detalles de cada suscriptor
        subscribersSnapshot.forEach(doc => {
            const data = doc.data();
            console.log('[Alertas] 👤 Suscriptor:', {
                id: doc.id,
                name: data.full_name,
                apartment: data.apartment,
                has_token: !!data.fcm_token,
                token_preview: data.fcm_token ? data.fcm_token.substring(0, 20) + '...' : 'NO TOKEN',
                notifications_enabled: data.notifications_enabled
            });
        });
        
        // Actualizar total_recipients en el documento
        await db.collection('emergency_alerts').doc(docRef.id).update({
            total_recipients: subscribersCount
        });
        console.log('[Alertas] 📊 total_recipients actualizado:', subscribersCount);
        
        // Enviar push notifications si está habilitado
        let pushSent = false;
        let pushError = null;
        
        if (alertData.send_push && subscribersSnapshot.size > 0) {
            console.log(`[Alertas] 📲 Enviando notificaciones a ${subscribersSnapshot.size} suscriptores...`);
            
            if (emitButton) {
                emitButton.innerHTML = '📤 Enviando notificaciones...';
            }
            
            // Llamar al Cloud Function existente sendEmergencyPush
            try {
                const pushPayload = {
                    alert_id: docRef.id,
                    type: type,
                    message: `${title}\n\n${message}`,
                    severity: severity,
                    tower: blocksDisplay,
                    floor: zone || blocksDisplay
                };
                
                console.log('[Alertas] 📦 Payload para Cloud Function:', pushPayload);
                console.log('[Alertas] 🚀 Llamando a sendEmergencyPush...');
                
                const pushResponse = await fetch('https://sendemergencypush-6psjv5t2ka-uc.a.run.app', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pushPayload)
                });
                
                console.log('[Alertas] 📥 Respuesta recibida:', {
                    status: pushResponse.status,
                    statusText: pushResponse.statusText,
                    ok: pushResponse.ok
                });
                
                if (pushResponse.ok) {
                    const pushResult = await pushResponse.json();
                    console.log('[Alertas] ✅ Notificaciones enviadas exitosamente:', pushResult);
                    pushSent = true;
                } else {
                    const errorText = await pushResponse.text();
                    console.error('[Alertas] ❌ Error en respuesta:', errorText);
                    console.warn(`[Alertas] ⚠️ Cloud Function falló con status ${pushResponse.status}`);
                    pushError = `Error ${pushResponse.status}: ${errorText.substring(0, 100)}`;
                }
            } catch (error) {
                console.error('[Alertas] ❌ Error al enviar push:', error);
                console.error('[Alertas] Error completo:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                pushError = error.message;
            }
        } else if (!alertData.send_push) {
            console.log('[Alertas] 🔕 Notificaciones push deshabilitadas (checkbox no marcado)');
        } else {
            console.log('[Alertas] ⚠️ No hay suscriptores activos para enviar notificaciones');
        }
        
        // Restaurar botón
        if (emitButton) {
            emitButton.disabled = false;
            emitButton.innerHTML = originalButtonText;
        }
        
        // Construir mensaje de resultado
        let resultMessage = '✅ ALERTA EMITIDA EXITOSAMENTE\n\n';
        resultMessage += `🆔 ID: ${docRef.id}\n`;
        resultMessage += `📊 Suscriptores registrados: ${allSubscribersSnapshot.size}\n`;
        resultMessage += `✅ Suscriptores activos: ${subscribersCount}\n`;
        resultMessage += `📍 Alcance: ${alertData.blocks_display}\n`;
        
        if (alertData.send_push) {
            if (pushSent) {
                resultMessage += `\n📲 Notificaciones push enviadas a ${subscribersCount} dispositivos`;
            } else if (pushError) {
                resultMessage += `\n❌ Error enviando notificaciones:\n${pushError}`;
            }
        }
        
        if (subscribersCount === 0 && alertData.send_push) {
            resultMessage += `\n\n⚠️ ADVERTENCIA: No hay suscriptores activos.\nLas notificaciones no se enviarán hasta que haya usuarios suscritos.`;
        }
        
        alert(resultMessage);
        
        closeNewAlertModal();
        loadActiveAlerts();

        
    } catch (error) {
        console.error('[Alertas] Error emitiendo alerta:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

// ===== VER DETALLES DE ALERTA =====
function viewAlertDetails(alertId) {
    console.log('[Alertas] Ver detalles:', alertId);
    alert('Función en desarrollo: Ver detalles de alerta\n\nID: ' + alertId);
}

// ===== CONFIRMAR CANCELACIÓN DE ALERTA =====
async function confirmCancelAlert(alertId) {
    console.log('[Alertas] 🚫 Abriendo modal de cancelación para:', alertId);
    
    // Guardar ID de alerta
    document.getElementById('cancelAlertId').value = alertId;
    
    // Limpiar textarea
    document.getElementById('cancelReason').value = '';
    
    // Mostrar modal
    const modal = document.getElementById('cancelAlertModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus en el textarea
        setTimeout(() => {
            document.getElementById('cancelReason').focus();
        }, 100);
    }
}

// ===== CERRAR MODAL DE CANCELACIÓN =====
function closeCancelAlertModal() {
    const modal = document.getElementById('cancelAlertModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// ===== EJECUTAR CANCELACIÓN DE ALERTA =====
async function executeCancelAlert() {
    const alertId = document.getElementById('cancelAlertId').value;
    const reason = document.getElementById('cancelReason').value.trim();
    
    console.log('[Alertas] 🚫 Ejecutando cancelación...');
    console.log('[Alertas] Alert ID:', alertId);
    console.log('[Alertas] Motivo:', reason);
    
    // Validar motivo
    if (!reason || reason.length < 3) {
        alert('⚠️ El motivo debe tener al menos 3 caracteres');
        document.getElementById('cancelReason').focus();
        return;
    }
    
    try {
        console.log('[Alertas] 💾 Actualizando Firestore...');
        
        // Verificar que db existe
        if (!db) {
            throw new Error('Base de datos no inicializada');
        }
        
        // Actualizar directamente en Firestore
        const updateData = {
            status: 'CANCELLED',
            cancelled_at: firebase.firestore.FieldValue.serverTimestamp(),
            cancelled_by: currentUser.uid || 'admin',
            cancellation_reason: reason
        };
        
        console.log('[Alertas] 📦 Datos de actualización:', JSON.stringify(updateData, null, 2));
        
        await db.collection('emergency_alerts').doc(alertId).update(updateData);
        
        console.log('[Alertas] ✅ Alerta cancelada exitosamente en Firestore');
        
        // Cerrar modal
        closeCancelAlertModal();
        
        // Mostrar confirmación
        alert(`✅ Alerta cancelada exitosamente\n\nID: ${alertId}\nMotivo: ${reason}`);
        
        // Recargar alertas
        console.log('[Alertas] 🔄 Recargando lista de alertas...');
        await loadActiveAlerts();
        console.log('[Alertas] ✅ Lista de alertas actualizada');
        
    } catch (error) {
        console.error('[Alertas] ❌ ERROR:', error);
        console.error('[Alertas] Error completo:', JSON.stringify({
            code: error.code,
            message: error.message,
            name: error.name,
            stack: error.stack
        }, null, 2));
        
        alert(`❌ Error al cancelar alerta:\n\n${error.message}\n\nCódigo: ${error.code || 'N/A'}\n\nRevise la consola para más detalles.`);
    }
}

// ===== ACTIVAR TODOS LOS SUSCRIPTORES =====
async function activateAllSubscribers() {
    try {
        console.log('[Alertas] 🔄 Activando todos los suscriptores...');
        
        const snapshot = await db.collection('alert_subscribers')
            .where('clientId', '==', window.currentUserClientId).where('notifications_enabled', '==', false)
            .get();
        
        console.log(`[Alertas] 📊 Encontrados ${snapshot.size} suscriptores inactivos`);
        
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                notifications_enabled: true,
                activated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        
        console.log('[Alertas] ✅ Todos los suscriptores activados');
        alert(`✅ ${snapshot.size} suscriptores activados exitosamente`);
        
    } catch (error) {
        console.error('[Alertas] ❌ Error activando suscriptores:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

// ===== DEBUG: VER TODOS LOS SUSCRIPTORES =====
async function debugSubscribers() {
    try {
        console.log('[DEBUG] 🔍 Analizando base de datos de suscriptores...');
        
        const allDocs = await db.collection('alert_subscribers').where('clientId', '==', window.currentUserClientId).get();
        
        console.log(`[DEBUG] 📊 TOTAL DE DOCUMENTOS: ${allDocs.size}`);
        console.log('[DEBUG] =====================================');
        
        if (allDocs.size === 0) {
            console.error('[DEBUG] ⚠️ NO HAY NINGÚN REGISTRO en alert_subscribers');
            alert('⚠️ No hay registros en la base de datos.\n\nPor favor regístrate primero en:\nhttps://neos-tech.web.app/register-alerts.html');
            return;
        }
        
        allDocs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`[DEBUG] 📝 Registro #${index + 1}:`);
            console.log('  - ID:', doc.id);
            console.log('  - Nombre:', data.full_name);
            console.log('  - Apartamento:', data.apartment);
            console.log('  - Piso:', data.floor);
            console.log('  - Teléfono:', data.phone);
            console.log('  - Tipo dispositivo:', data.device_type);
            console.log('  - Tiene FCM token:', !!data.fcm_token);
            console.log('  - FCM token preview:', data.fcm_token ? data.fcm_token.substring(0, 30) + '...' : 'NO TOKEN');
            console.log('  - notifications_enabled:', data.notifications_enabled);
            console.log('  - Registrado:', data.registered_at ? new Date(data.registered_at.seconds * 1000).toLocaleString() : 'N/A');
            console.log('  -----');
        });
        
        const activeCount = allDocs.docs.filter(doc => doc.data().notifications_enabled === true).length;
        const withTokenCount = allDocs.docs.filter(doc => !!doc.data().fcm_token).length;
        
        console.log('[DEBUG] =====================================');
        console.log(`[DEBUG] ✅ Con notifications_enabled=true: ${activeCount}`);
        console.log(`[DEBUG] 📲 Con FCM token: ${withTokenCount}`);
        console.log(`[DEBUG] ⚠️ Sin FCM token: ${allDocs.size - withTokenCount}`);
        
        alert(`🔍 DIAGNÓSTICO:\n\nTotal registros: ${allDocs.size}\nActivos: ${activeCount}\nCon token FCM: ${withTokenCount}\n\n✅ Revisa la consola para detalles completos`);
        
    } catch (error) {
        console.error('[DEBUG] ❌ Error:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

// ===== LIMPIAR SUSCRIPTORES SIN TOKEN =====
async function cleanOldSubscribers() {
    console.log('[CLEAN] 🚀 Iniciando limpieza de suscriptores sin token...');
    
    try {
        const snapshot = await db.collection('alert_subscribers').where('clientId', '==', window.currentUserClientId).get();
        console.log(`[CLEAN] 📊 Total documentos: ${snapshot.size}`);
        
        let deleted = 0;
        const batch = db.batch();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const hasToken = data.fcm_token && data.fcm_token.trim() !== '';
            
            if (!hasToken) {
                console.log(`[CLEAN] 🗑️ Eliminando: ${doc.id} - ${data.name} (sin token)`);
                batch.delete(doc.ref);
                deleted++;
            }
        });
        
        if (deleted > 0) {
            await batch.commit();
            console.log(`[CLEAN] ✅ Eliminados ${deleted} suscriptores sin token`);
            alert(`✅ Se eliminaron ${deleted} registros antiguos sin FCM token.\n\nAhora pide a los usuarios re-registrarse en:\nhttps://neos-tech.web.app/register-alerts.html`);
        } else {
            console.log('[CLEAN] ✅ No hay registros para eliminar');
            alert('✅ Todos los suscriptores tienen FCM token');
        }
        
    } catch (error) {
        console.error('[CLEAN] ❌ Error:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

// ===== CARGAR CONTADOR DE SUSCRIPTORES =====
async function loadSubscribersCount() {
    try {
        const snapshot = await db.collection('alert_subscribers')
            .where('clientId', '==', window.currentUserClientId).where('notifications_enabled', '==', true)
            .get();
        
        const count = snapshot.size;
        document.getElementById('subscribersCount').textContent = count;
    } catch (error) {
        console.error('[QR] Error loading subscribers count:', error);
        document.getElementById('subscribersCount').textContent = '⚠️';
    }
}

// ===== MOSTRAR MODAL QR =====
function showQRModal() {
    const modal = document.getElementById('qrModal');
    modal.classList.add('active');
    
    // Generate QR Code
    const registrationURL = 'https://neos-tech.web.app/register-alerts.html';
    const canvas = document.getElementById('qrCanvas');
    
    // Verificar si qrcode está disponible
    if (typeof qrcode === 'undefined') {
        console.error('[QR] QRCode library not loaded');
        alert('Error: Librería QR no cargada. Recarga la página.');
        return;
    }
    
    try {
        // Create QR code object
        const qr = qrcode(0, 'H');
        qr.addData(registrationURL);
        qr.make();
        
        // Get canvas context
        const ctx = canvas.getContext('2d');
        const cellSize = 5;
        const margin = 2;
        const size = qr.getModuleCount();
        
        // Set canvas size
        canvas.width = (size + margin * 2) * cellSize;
        canvas.height = (size + margin * 2) * cellSize;
        
        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw QR code
        ctx.fillStyle = '#000000';
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (qr.isDark(row, col)) {
                    ctx.fillRect(
                        (col + margin) * cellSize,
                        (row + margin) * cellSize,
                        cellSize,
                        cellSize
                    );
                }
            }
        }
        
        console.log('[QR] QR Code generated successfully');
    } catch (error) {
        console.error('[QR] Error generating QR:', error);
        alert('Error generando QR: ' + error.message);
    }

    // Load stats
    loadQRStats();
}

// ===== CERRAR MODAL QR =====
function closeQRModal() {
    document.getElementById('qrModal').classList.remove('active');
}

// ===== CARGAR ESTADÍSTICAS QR =====
async function loadQRStats() {
    try {
        const snapshot = await db.collection('alert_subscribers').where('clientId', '==', window.currentUserClientId).get();
        const total = snapshot.size;
        
        const activeSnapshot = await db.collection('alert_subscribers')
            .where('clientId', '==', window.currentUserClientId).where('notifications_enabled', '==', true)
            .get();
        const active = activeSnapshot.size;

        document.getElementById('qrStatsActive').textContent = active;
        document.getElementById('qrStatsTotal').textContent = total;

    } catch (error) {
        console.error('[QR] Error loading stats:', error);
    }
}

// ===== COPIAR LINK DE REGISTRO =====
function copyRegistrationLink() {
    const input = document.getElementById('registrationLink');
    input.select();
    document.execCommand('copy');
    
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copiado';
    btn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
    }, 2000);
}

// ===== DESCARGAR QR =====
function downloadQR() {
    const canvas = document.getElementById('qrCanvas');
    const link = document.createElement('a');
    link.download = 'NeosTech-Registro-Alertas-QR.png';
    link.href = canvas.toDataURL();
    link.click();
}

// ===== IMPRIMIR QR =====
function printQR() {
    const printWindow = window.open('', '', 'width=800,height=600');
    const canvas = document.getElementById('qrCanvas');
    const dataURL = canvas.toDataURL();
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Código QR - Registro de Alertas NeosTech</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 40px;
                }
                h1 {
                    color: #DC2626;
                    margin-bottom: 20px;
                }
                .qr-container {
                    margin: 30px auto;
                    padding: 30px;
                    border: 3px solid #DC2626;
                    border-radius: 20px;
                    display: inline-block;
                }
                img {
                    max-width: 400px;
                }
                .instructions {
                    margin-top: 30px;
                    font-size: 18px;
                    color: #374151;
                }
                .link {
                    margin-top: 20px;
                    padding: 15px;
                    background: #F3F4F6;
                    border-radius: 10px;
                    font-family: monospace;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <h1>✅ Sistema de Alertas NeosTech</h1>
            <h2>Registro de Dispositivos para Alertas de Emergencia</h2>
            
            <div class="qr-container">
                <img src="${dataURL}" alt="QR Code">
            </div>
            
            <div class="instructions">
                <p><strong>Instrucciones:</strong></p>
                <p>1. Escanea el código QR con tu celular</p>
                <p>2. Completa el formulario de registro</p>
                <p>3. Acepta los permisos de notificación</p>
                <p>4. ¡Listo! Recibirás alertas en tiempo real</p>
            </div>
            
            <div class="link">
                O ingresa a: https://neos-tech.web.app/register-alerts.html
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

/* ========================================
   FASE 2: RFID Y LISTAS
   ======================================== */

// ========== RFID EN TIEMPO REAL ==========

function initLiveTagReading() {
    console.log('🚀 Iniciando monitoreo de tags en tiempo real...');
    
    const statusEl = document.getElementById('liveReadingStatus');
    if (statusEl) statusEl.textContent = ' Conectando...';
    
    // Escuchar colección rfid_tags en tiempo real
    // Intentar sin orderBy primero para evitar problemas de índice
    try {
        db.collection('rfid_events')
            .where('clientId', '==', window.currentUserClientId)
            .limit(50)
            .onSnapshot(snapshot => {
                console.log(`📦 Snapshot recibido: ${snapshot.size} documentos`);
                if (statusEl) statusEl.textContent = ' Conectado';
                
                snapshot.docChanges().forEach(change => {
                    console.log(`Cambio detectado: ${change.type}`, change.doc.data());
                    if (change.type === 'added') {
                        const tagData = change.doc.data();
                        displayLiveTag(tagData);
                        
                        // Si es evento manual, actualizar historial de Acciones de Control
                        const isManualEvent = tagData.event_type === 'manual_open' || tagData.event_type === 'manual_door_open';
                        if (isManualEvent && typeof loadControlActionsHistory === 'function') {
                            loadControlActionsHistory();
                        }
                    }
                });
            }, error => {
                console.error('❌ Error en lectura en vivo:', error);
                if (statusEl) statusEl.textContent = '❌ Error: ' + error.message;
            });
    } catch (error) {
        console.error('❌ Error al iniciar lectura en vivo:', error);
        if (statusEl) statusEl.textContent = '❌ Error de inicialización';
    }
}

async function displayLiveTag(tagData) {
    // En el tab Reader usamos el sistema antiguo (directo al DOM)
    // En el tab Control usamos el sistema nuevo (con paginación)
    const containerReader = document.getElementById('liveTagsContainer');
    const containerControl = document.getElementById('liveTagsContainerControl');
    
    if (!containerReader && !containerControl) {
        console.error(' Contenedores de live tags no encontrados');
        return;
    }
    
    // FILTRAR eventos manuales - NO mostrarlos en "Lectura RFID en Tiempo Real"
    // Los eventos manuales solo deben aparecer en logs/historial
    const isManualEvent = tagData.event_type === 'manual_open' || 
                         tagData.event_type === 'manual_door_open' ||
                         tagData.event_type === 'manual_close' ||
                         tagData.manual === true;
    
    if (isManualEvent) {
        console.log('📦 Evento manual detectado - NO se mostrará en Lectura RFID en Tiempo Real:', tagData.event_type);
        return; // Salir de la función sin mostrar el evento
    }
    
    console.log('🏷️ Tag RFID detectado:', tagData);
    
    // Extraer datos del tag
    const tagId = tagData.tag_id || tagData.tagId || tagData.id || 'Desconocido';
    let userName = tagData.user_name || tagData.userName || tagData.user || null;
    let department = tagData.departamento || tagData.department || tagData.dept || null;
    
    // Si no hay información de usuario en tagData, consultar whitelist
    if ((!userName || userName === 'Desconocido') && tagId !== 'Desconocido') {
        try {
            console.log('🔍 Consultando whitelist para tag:', tagId);
            const whitelistDoc = await db.collection('whitelist').doc(tagId).get();
            if (whitelistDoc.exists) {
                const whitelistData = whitelistDoc.data();
                userName = whitelistData.user_name || whitelistData.userName || null;
                department = whitelistData.departamento || whitelistData.department || null;
                console.log(' Usuario encontrado en whitelist:', userName);
                // Actualizar tagData para mantener consistencia
                tagData.user_name = userName;
                tagData.departamento = department;
            } else {
                console.log('🏷️ Tag no encontrado en whitelist');
            }
        } catch (error) {
            console.error('Error consultando whitelist:', error);
        }
    }
    
    // Determinar si el acceso debe ser permitido o denegado
    // Si no hay usuario asignado, el tag está denegado
    const isUnknown = !userName || userName === 'Desconocido' || tagData.status === 'not_registered';
    const isGranted = !isUnknown && (tagData.access_granted !== false && tagData.granted !== false);
    
    // Verificar si el tag ya está registrado en la base de datos
    let tagAlreadyRegistered = false;
    if (isUnknown && tagId !== 'Desconocido') {
        try {
            const whitelistDoc = await db.collection('whitelist').doc(tagId).get();
            if (whitelistDoc.exists) {
                tagAlreadyRegistered = true;
                console.log('🏷️ Tag ya está registrado en whitelist:', tagId);
            }
        } catch (error) {
            console.error('Error verificando tag en whitelist:', error);
        }
    }
    
    // Usar el timestamp del evento si existe, si no usar timestamp actual
    let eventTimestamp;
    if (tagData.timestamp) {
        // Si viene de Firestore con toDate()
        if (typeof tagData.timestamp.toDate === 'function') {
            eventTimestamp = tagData.timestamp.toDate();
        } 
        // Si viene como ISO string desde Cloud Function
        else if (typeof tagData.timestamp === 'string') {
            eventTimestamp = new Date(tagData.timestamp);
        }
        // Si ya es un Date
        else if (tagData.timestamp instanceof Date) {
            eventTimestamp = tagData.timestamp;
        }
        // Fallback
        else {
            eventTimestamp = new Date();
        }
    } else {
        eventTimestamp = new Date();
    }
    
    console.log('🕐 Timestamp del evento:', eventTimestamp, 'Original:', tagData.timestamp);
    
    // === NUEVO SISTEMA DE PAGINACIÓN (Tab Control) ===
    // Agregar al array de live tags para el tab Control
    const tagObject = {
        timestamp: eventTimestamp,
        data: tagData,
        isGranted: isGranted,
        tagAlreadyRegistered: tagAlreadyRegistered
    };
    
    // Agregar al inicio del array
    liveTagsArray.unshift(tagObject);
    
    // Limitar tamaño del array (máximo 100 tags)
    if (liveTagsArray.length > 100) {
        liveTagsArray.pop();
    }
    
    // Renderizar la página actual
    renderLiveTagsPage();
    updateLiveTagsPagination();
    
    // Notificación con tag ID (solo si hay usuario logueado)
    if (currentUser) {
        const notifMessage = isUnknown ? 
            `🏷️ Tag desconocido: ${tagId.slice(-8)}` : 
            ` Tag detectado: ${userName}`;
        showNotification(notifMessage, isGranted ? 'success' : 'warning');
    }
}

async function showRegisterTagModal(tagId, accessPoint = null) {
    console.log('📋 Abriendo modal para tag:', tagId, 'Punto acceso:', accessPoint);
    
    try {
        // Cargar lista de usuarios para el selector (sin orderBy para evitar índice compuesto)
        const usersSnapshot = await db.collection('users').where('clientId', '==', window.currentUserClientId).where('active', '==', true).get();
        const usersList = [];
        usersSnapshot.forEach(doc => {
            const user = doc.data();
            usersList.push({
                id: doc.id,
                name: user.name,
                departamento: user.departamento || 'N/A',
                tags: user.tags || []
            });
        });
        
        // Ordenar en el cliente
        usersList.sort((a, b) => a.name.localeCompare(b.name));
    
    // Crear modal dinámicamente si no existe
    let modal = document.getElementById('registerTagModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'registerTagModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2> Registrar Tag RFID</h2>
                    <button class="close-btn" onclick="closeRegisterTagModal()"></button>
                </div>
                <div class="modal-body">
                    <!-- Tag Info -->
                    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(124, 58, 237, 0.08)); padding: 18px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.2);">
                        <div style="font-size: 11px; color: #7c3aed; margin-bottom: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Tag ID Detectado</div>
                        <code id="registerTagId" style="background: rgba(0, 0, 0, 0.35); padding: 10px 16px; border-radius: 8px; 
                                     font-family: 'Courier New', monospace; color: #c4b5fd; display: block; font-size: 14px; font-weight: 700; letter-spacing: 0.5px;">
                        </code>
                        <div id="accessPointInfo" style="margin-top: 12px; font-size: 12px; color: #7c3aed; display: none;">
                             <span style="font-weight: 600;">Punto de acceso:</span> <span id="accessPointName" style="font-weight: 700;"></span>
                        </div>
                    </div>
                    
                    <!-- Tabs -->
                    <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 4px;">
                        <button id="tabAssignUser" class="tab-btn-modal active" onclick="switchRegisterTab('assign')" style="flex: 1; padding: 10px 16px; background: none; border: none; border-bottom: 2.5px solid #8b5cf6; color: #8b5cf6; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px; border-radius: 6px 6px 0 0;">
                             Asignar Usuario
                        </button>
                        <button id="tabNewUser" class="tab-btn-modal" onclick="switchRegisterTab('new')" style="flex: 1; padding: 10px 16px; background: none; border: none; border-bottom: 2.5px solid transparent; color: #94a3b8; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 13px; border-radius: 6px 6px 0 0;">
                             Nuevo Usuario
                        </button>
                    </div>
                    
                    <!-- Tab: Asignar a Usuario Existente -->
                    <div id="assignUserContent" class="tab-content-modal">
                        <div class="form-group">
                            <label>Seleccionar Usuario</label>
                            <select id="selectExistingUser" class="form-control">
                                <option value="">-- Buscar y seleccionar usuario --</option>
                                ${usersList.map(u => `<option value="${u.id}">${u.name} (${u.departamento})</option>`).join('')}
                            </select>
                            <small>El tag se agregará automáticamente a la whitelist del usuario</small>
                        </div>
                        <div style="margin-top: 20px; padding: 16px; background: rgba(34, 197, 94, 0.08); border-radius: 10px; border: 1px solid rgba(34, 197, 94, 0.2);">
                            <div style="font-size: 13px; color: #16a34a; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 16px;"></span>
                                <span>Acceso automático habilitado</span>
                            </div>
                            <div style="font-size: 11px; color: #22c55e; margin-top: 6px; margin-left: 24px;">El usuario podrá usar este tag inmediatamente</div>
                        </div>
                    </div>
                    
                    <!-- Tab: Crear Nuevo Usuario -->
                    <div id="newUserContent" class="tab-content-modal" style="display: none;">
                        <div class="form-group">
                            <label>Nombre Completo *</label>
                            <input type="text" id="registerUserName" class="form-control" required placeholder="Ej: Juan Pérez González">
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label>Block *</label>
                                <select id="registerUserBlock" class="form-control" onchange="updateDepartmentNumber()">
                                    <option value="">Seleccionar</option>
                                    ${Array.from({length: 20}, (_, i) => `<option value="${i+1}">Block ${i+1}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Nº Depto *</label>
                                <input type="text" id="registerUserDept" class="form-control" oninput="updateDepartmentNumber()" required placeholder="101">
                            </div>
                        </div>
                        <div style="font-size: 11px; color: #94a3b8; margin-top: -12px; margin-bottom: 18px; padding: 8px 12px; background: #f8fafc; border-radius: 6px;">
                             Departamento: <span id="fullDeptPreview" style="color: #8b5cf6; font-weight: 700;">-</span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                            <div class="form-group">
                                <label>Teléfono</label>
                                <input type="tel" id="registerUserPhone" class="form-control" placeholder="+56 9 1234 5678">
                            </div>
                            <div class="form-group">
                                <label>Patente</label>
                                <input type="text" id="registerUserVehicle" class="form-control" placeholder="AB-12-CD" maxlength="8">
                            </div>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 0;">
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="checkbox" id="registerUserActive" checked style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
                                <span style="font-weight: 600;">Usuario Activo</span>
                            </label>
                            <small>Los usuarios inactivos no podrán acceder al sistema</small>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" onclick="closeRegisterTagModal()">Cancelar</button>
                    <button class="btn btn-success" onclick="saveTagAssignment()">
                        <span style="margin-right: 6px;"></span>
                        Guardar y Activar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Configurar modal
    document.getElementById('registerTagId').textContent = tagId;
    modal.setAttribute('data-tag-id', tagId);
    
    // Mostrar punto de acceso si está disponible
    if (accessPoint) {
        document.getElementById('accessPointInfo').style.display = 'block';
        document.getElementById('accessPointName').textContent = accessPoint;
        modal.setAttribute('data-access-point', accessPoint);
    } else {
        document.getElementById('accessPointInfo').style.display = 'none';
    }
    
    // Resetear formulario de nuevo usuario
    document.getElementById('registerUserName').value = '';
    document.getElementById('registerUserBlock').value = '';
    document.getElementById('registerUserDept').value = '';
    document.getElementById('registerUserPhone').value = '';
    document.getElementById('registerUserVehicle').value = '';
    document.getElementById('registerUserActive').checked = true;
    document.getElementById('fullDeptPreview').textContent = '-';
    document.getElementById('selectExistingUser').value = '';
    
    // Asegurar que el tab de asignar está activo
    switchRegisterTab('assign');
    
    // Mostrar modal
    modal.classList.add('show');
    
    } catch (error) {
        console.error('❌ Error al abrir modal de registro:', error);
        showNotification('❌ Error al cargar el formulario: ' + error.message, 'error');
    }
}

function switchRegisterTab(tab) {
    const assignTab = document.getElementById('tabAssignUser');
    const newTab = document.getElementById('tabNewUser');
    const assignContent = document.getElementById('assignUserContent');
    const newContent = document.getElementById('newUserContent');
    
    if (tab === 'assign') {
        assignTab.classList.add('active');
        newTab.classList.remove('active');
        assignTab.style.borderBottom = '3px solid #8b5cf6';
        assignTab.style.color = '#8b5cf6';
        newTab.style.borderBottom = '3px solid transparent';
        newTab.style.color = '#94a3b8';
        assignContent.style.display = 'block';
        newContent.style.display = 'none';
    } else {
        newTab.classList.add('active');
        assignTab.classList.remove('active');
        newTab.style.borderBottom = '3px solid #8b5cf6';
        newTab.style.color = '#8b5cf6';
        assignTab.style.borderBottom = '3px solid transparent';
        assignTab.style.color = '#94a3b8';
        newContent.style.display = 'block';
        assignContent.style.display = 'none';
    }
}

async function saveTagAssignment() {
    const modal = document.getElementById('registerTagModal');
    const tagId = modal.getAttribute('data-tag-id');
    const activeTab = document.getElementById('tabAssignUser').classList.contains('active') ? 'assign' : 'new';
    
    if (activeTab === 'assign') {
        // Asignar a usuario existente
        const userId = document.getElementById('selectExistingUser').value;
        if (!userId) {
            showNotification(' Por favor selecciona un usuario', 'warning');
            return;
        }
        
        try {
            showNotification(' Asignando tag al usuario...', 'info');
            
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();
            const userData = userDoc.data();
            const currentTags = userData.tags || [];
            
            if (currentTags.includes(tagId)) {
                showNotification(' Este tag ya está asignado a este usuario', 'warning');
                return;
            }
            
            await userRef.update({
                tags: firebase.firestore.FieldValue.arrayUnion(tagId),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Agregar a whitelist
            await db.collection('whitelist').doc(tagId).set({
                tag_id: tagId,
                user_name: userData.name,
                departamento: userData.departamento,
                added_at: firebase.firestore.FieldValue.serverTimestamp(),
                added_by: currentUser || 'dashboard',
                active: true
            });
            
            showNotification(` Tag asignado a ${userData.name}`, 'success');
            closeRegisterTagModal();
            
            // Recargar datos
            if (typeof loadUsers === 'function') loadUsers();
            if (typeof loadWhitelist === 'function') loadWhitelist();
            
        } catch (error) {
            console.error('Error asignando tag:', error);
            showNotification('❌ Error al asignar tag: ' + error.message, 'error');
        }
    } else {
        // Crear nuevo usuario
        const name = document.getElementById('registerUserName').value.trim();
        const block = document.getElementById('registerUserBlock').value;
        const deptNum = document.getElementById('registerUserDept').value.trim();
        const phone = document.getElementById('registerUserPhone').value.trim();
        let vehicle = document.getElementById('registerUserVehicle').value.trim();
        
        // Validar y formatear patente chilena
        if (vehicle) {
            vehicle = formatChileanPlate(vehicle);
            if (!validateChileanPlate(vehicle)) {
                showNotification(' Formato de patente inválido. Debe ser XX-XX-XX (ej: AB-12-CD)', 'warning');
                return;
            }
        }
        const active = document.getElementById('registerUserActive').checked;
        
        // Validación
        if (!name || !block || !deptNum) {
            showNotification(' Por favor completa los campos requeridos', 'warning');
            return;
        }
        
        const departamento = `${block}-${deptNum}`;
        
        try {
            showNotification(' Creando usuario...', 'info');
            
            // Guardar en Firestore
            const userData = {
                name: name,
                departamento: departamento,
                block: block,
                unit: deptNum,
                phone: phone || '',
                vehicle: vehicle || '',
                tags: [tagId],
                active: active,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: currentUser || 'dashboard',
                clientId: window.currentUserClientId
            };
            
            await db.collection('users').add(userData);
            
            // Agregar a whitelist
            await db.collection('whitelist').doc(tagId).set({
                tag_id: tagId,
                user_name: name,
                departamento: departamento,
                added_at: firebase.firestore.FieldValue.serverTimestamp(),
                added_by: currentUser || 'dashboard',
                clientId: window.currentUserClientId,
                active: true
            });
            
            showNotification(` Usuario ${name} registrado exitosamente con tag asignado`, 'success');
            closeRegisterTagModal();
            
            // Recargar usuarios si estamos en esa vista
            if (typeof loadUsers === 'function') loadUsers();
            if (typeof loadWhitelist === 'function') loadWhitelist();
            
        } catch (error) {
            console.error('Error creando usuario:', error);
            showNotification('❌ Error al crear el usuario: ' + error.message, 'error');
        }
    }
}

function closeRegisterTagModal() {
    const modal = document.getElementById('registerTagModal');
    if (modal) modal.classList.remove('show');
}

function updateDepartmentNumber() {
    const block = document.getElementById('registerUserBlock').value;
    const dept = document.getElementById('registerUserDept').value;
    const preview = document.getElementById('fullDeptPreview');
    
    if (block && dept) {
        preview.textContent = `${block}-${dept}`;
    } else {
        preview.textContent = '-';
    }
}

function clearLiveTags() {
    const container = document.getElementById('liveTagsContainerControl');
    if (!container) return;
    
    // Limpiar array y contenedor
    liveTagsArray = [];
    container.innerHTML = `
        <div style="color: #94a3b8; text-align: center; padding: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
            <div style="font-size: 48px; margin-bottom: 20px;">📡</div>
            <div style="font-size: 20px; margin-bottom: 10px; color: #64748b; font-weight: 600;">Esperando lectura de tags del lector RFID...</div>
            <small style="font-size: 14px; display: block; color: #94a3b8;">Los tags detectados aparecerán aquí automáticamente cuando el lector está activo</small>
        </div>
    `;
    
    // Resetear paginación
    currentLiveTagsPage = 1;
    updateLiveTagsCount();
    updateLiveTagsPagination();
    
    console.log(' Live tags limpiados');
    showNotification('🏷️ Tags en vivo limpiados', 'info');
}

function sortLiveTags() {
    const sortSelect = document.getElementById('liveTagsSort');
    if (!sortSelect) return;
    
    const sortOrder = sortSelect.value;
    
    // Ordenar el array
    liveTagsArray.sort((a, b) => {
        if (sortOrder === 'newest') {
            return b.timestamp - a.timestamp; // Más recientes primero
        } else {
            return a.timestamp - b.timestamp; // Más antiguos primero
        }
    });
    
    // Resetear a página 1 y renderizar
    currentLiveTagsPage = 1;
    renderLiveTagsPage();
    updateLiveTagsPagination();
    
    console.log(` Live tags ordenados por: ${sortOrder}`);
}

function prevLiveTagsPage() {
    if (currentLiveTagsPage > 1) {
        currentLiveTagsPage--;
        renderLiveTagsPage();
        updateLiveTagsPagination();
    }
}

function nextLiveTagsPage() {
    const totalPages = Math.ceil(getFilteredLiveTags().length / liveTagsPerPage);
    if (currentLiveTagsPage < totalPages) {
        currentLiveTagsPage++;
        renderLiveTagsPage();
        updateLiveTagsPagination();
    }
}

function renderLiveTagsPage() {
    const container = document.getElementById('liveTagsContainerControl');
    if (!container) return;
    
    const filteredTags = getFilteredLiveTags();
    
    // Calcular rango de tags a mostrar
    const start = (currentLiveTagsPage - 1) * liveTagsPerPage;
    const end = start + liveTagsPerPage;
    const tagsToShow = filteredTags.slice(start, end);
    
    // Animación de salida
    container.style.opacity = '0.5';
    container.style.transition = 'opacity 0.2s';
    
    setTimeout(() => {
        // Limpiar contenedor
        container.innerHTML = '';
        
        // Si no hay tags, mostrar mensaje
        if (tagsToShow.length === 0) {
            container.innerHTML = `
                <div style="color: #94a3b8; text-align: center; padding: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📡</div>
                    <div style="font-size: 20px; margin-bottom: 10px; color: #64748b; font-weight: 600;">
                        ${filteredTags.length === 0 ? 'Esperando lectura de tags del lector RFID...' : 'No hay tags en esta página'}
                    </div>
                    <small style="font-size: 14px; display: block; color: #94a3b8;">
                        ${filteredTags.length === 0 ? 'Los tags detectados aparecerán aquí automáticamente cuando el lector está activo' : 'Navega a otra página para ver más tags'}
                    </small>
                </div>
            `;
            container.style.opacity = '1';
            return;
        }
        
        // Renderizar tags de la página actual con animación escalonada
        tagsToShow.forEach((tagObj, index) => {
            const tagElement = createLiveTagElement(tagObj);
            tagElement.style.opacity = '0';
            tagElement.style.transform = 'translateY(20px)';
            container.appendChild(tagElement);
            
            // Animar entrada escalonada
            setTimeout(() => {
                tagElement.style.transition = 'all 0.3s ease';
                tagElement.style.opacity = '1';
                tagElement.style.transform = 'translateY(0)';
            }, index * 50); // 50ms de retraso entre cada tag
        });
        
        // Animación de entrada del contenedor
        container.style.opacity = '1';
        updateLiveTagsCount();
    }, 200);
}

function createLiveTagElement(tagObj) {
    const tagData = tagObj.data;
    const tagId = tagData.tag_id || tagData.tagId || tagData.id || 'Desconocido';
    const userName = tagData.user_name || tagData.userName || tagData.user || null;
    const department = tagData.departamento || tagData.department || tagData.dept || null;
    const isUnknown = !userName || userName === 'Desconocido' || tagData.status === 'not_registered';
    const isGranted = tagObj.isGranted;
    const accessPointName = tagData.access_point_name || tagData.accessPointName || tagData.location || tagData.reader_id || tagData.reader || tagData.access_point || tagData.lector || 'Punto de Acceso';
    
    const statusIcon = isGranted ? 
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : 
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    const statusText = isGranted ? 'PERMITIDO' : 'DENEGADO';
    const statusClass = isGranted ? 'granted' : 'denied';
    
    const timestamp = tagObj.timestamp;
    const timeStr = timestamp.toLocaleString('es-ES', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const registerButton = (isUnknown && !tagObj.tagAlreadyRegistered) ? 
        `<button class="btn btn-sm btn-primary register-tag-btn" data-tag-id="${tagId}" data-access-point="${accessPointName}" 
                 style="padding: 4px 12px; font-size: 11px; margin-left: 10px;">
             Registrar Usuario
        </button>` : (tagObj.tagAlreadyRegistered ? 
        `<span style="color: #10b981; font-size: 11px; margin-left: 10px; font-weight: 600;"> Ya registrado</span>` : '');
    
    const tagElement = document.createElement('div');
    tagElement.className = 'live-tag-item';
    tagElement.innerHTML = `
        <div class="live-tag-header ${statusClass}" style="background: ${isGranted ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95))'}; padding: 10px 12px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(10px);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="background: rgba(255,255,255,0.2); width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;">${statusIcon.replace('width="28" height="28"', 'width="18" height="18"')}</div>
                <div style="text-align: right; font-size: 12px; color: rgba(255,255,255,0.9); font-weight: 600;">
                ${timeStr}
            </div>
            </div>
        </div>
        <div style="background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.06) 100%); padding: 10px; border-radius: 0 0 8px 8px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px);">
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;"> Usuario</div>
                        <div style="color: ${isUnknown ? '#fbbf24' : '#86efac'}; font-weight: 700; font-size: 13px;">${isUnknown ? ' Sin Asignar' : userName}</div>
                    </div>
                    <div style="text-align: right; border-left: 1px solid rgba(255,255,255,0.1); padding-left: 8px; margin-left: 8px;">
                        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;"> Depto</div>
                        <div style="color: ${department ? '#e2e8f0' : '#94a3b8'}; font-weight: 700; font-size: 13px;">${department || 'N/A'}</div>
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 6px 8px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.08);">
                    <div style="font-size: 10px; color: #94a3b8; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">🏷️ Tag ID</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
                        <code style="background: rgba(37, 99, 235, 0.15); padding: 3px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 11px; color: #60a5fa; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tagId}</code>
                        <span style="color: #a78bfa; font-family: 'Courier New', monospace; font-weight: 700; font-size: 12px;">...${tagId.slice(-6)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 6px; font-size: 9px;">
                    <div style="background: rgba(96, 165, 250, 0.1); padding: 4px 7px; border-radius: 4px; border: 1px solid rgba(96, 165, 250, 0.2); flex: 1;">
                        <span style="color: #94a3b8;"></span>
                        <span style="color: #60a5fa; font-weight: 600; margin-left: 3px;">${accessPointName}</span>
                    </div>
                    ${registerButton.replace('padding: 4px 12px; font-size: 11px', 'padding: 5px 10px; font-size: 11px')}
                </div>
            </div>
        </div>
    `;
    
    // Agregar event listener al botón de registro si existe
    const registerBtn = tagElement.querySelector('.register-tag-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function() {
            const tagId = this.getAttribute('data-tag-id');
            const accessPoint = this.getAttribute('data-access-point');
            console.log(' Botón clickeado - Tag:', tagId, 'Punto:', accessPoint);
            showRegisterTagModal(tagId, accessPoint);
        });
    }
    
    return tagElement;
}

function updateLiveTagsPagination() {
    const paginationDiv = document.getElementById('liveTagsPagination');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const currentPageNum = document.getElementById('currentPageNum');
    const totalPagesNum = document.getElementById('totalPagesNum');
    
    const filteredTags = getFilteredLiveTags();
    const totalPages = Math.ceil(filteredTags.length / liveTagsPerPage) || 1;
    
    // Mostrar/ocultar paginación
    if (filteredTags.length > liveTagsPerPage) {
        paginationDiv.style.display = 'block';
    } else {
        paginationDiv.style.display = 'none';
    }
    
    // Actualizar números
    if (currentPageNum) currentPageNum.textContent = currentLiveTagsPage;
    if (totalPagesNum) totalPagesNum.textContent = totalPages;
    
    // Habilitar/deshabilitar botones
    if (prevBtn) prevBtn.disabled = currentLiveTagsPage <= 1;
    if (nextBtn) nextBtn.disabled = currentLiveTagsPage >= totalPages;
}

function initializeLiveTagsPagination() {
    console.log('📋 Inicializando sistema de paginación de live tags...');
    
    // Limpiar el contenedor y mostrar mensaje inicial
    const container = document.getElementById('liveTagsContainerControl');
    if (container && container.children.length === 0) {
        container.innerHTML = `
            <div style="color: #94a3b8; text-align: center; padding: 60px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                <div style="font-size: 48px; margin-bottom: 20px; animation: pulse 2s infinite;">📡</div>
                <div style="font-size: 20px; margin-bottom: 10px; color: #64748b; font-weight: 600;">Esperando lectura de tags del lector RFID...</div>
                <small style="font-size: 14px; display: block; color: #94a3b8;">Los tags detectados aparecerán aquí automáticamente cuando el lector está activo</small>
                <div style="margin-top: 20px; padding: 8px 16px; background: rgba(59, 130, 246, 0.1); border-radius: 6px; display: inline-block;">
                    <small style="color: #3b82f6; font-weight: 600;">✅ Sistema de paginación activado (10 tags por página)</small>
                </div>
            </div>
        `;
    }
    
    // Inicializar contador y paginación
    updateLiveTagsCount();
    updateLiveTagsPagination();
    
    console.log('✅ Sistema de paginación inicializado - Listo para recibir tags');
}

// ========== GESTIÓN DE LISTAS ==========

async function loadLists() {
    const whitelistContainer = document.getElementById('whitelistContainer');
    const blacklistContainer = document.getElementById('blacklistContainer');
    const unregisteredContainer = document.getElementById('unregisteredContainer');
    
    if (!whitelistContainer || !blacklistContainer) return;
    
    whitelistContainer.innerHTML = '<p style="text-align:center;"><div class="spinner"></div>Cargando...</p>';
    blacklistContainer.innerHTML = '<p style="text-align:center;"><div class="spinner"></div>Cargando...</p>';
    if (unregisteredContainer) {
        unregisteredContainer.innerHTML = '<p style="text-align:center;"><div class="spinner"></div>Cargando...</p>';
    }
    
    try {
        let whitelistSnapshot;
        try {
            whitelistSnapshot = await db.collection('whitelist').where('clientId', '==', window.currentUserClientId).limit(100).get();
        } catch (err) {
            const usersSnapshot = await db.collection('users').where('clientId', '==', window.currentUserClientId).where('rfid_tag', '!=', '').get();
            whitelistSnapshot = { empty: usersSnapshot.empty, docs: [] };
            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                if (userData.rfid_tag) {
                    await db.collection('whitelist').doc(userData.rfid_tag).set({
                        user_name: userData.name || 'Sin nombre',
                        departamento: userData.department || 'N/A',
                        added_at: firebase.firestore.FieldValue.serverTimestamp(),
                        user_id: userDoc.id,
                        clientId: window.currentUserClientId
                    });
                }
            }
            whitelistSnapshot = await db.collection('whitelist').where('clientId', '==', window.currentUserClientId).limit(100).get();
        }
        
        let whitelistHtml = '';
        if (whitelistSnapshot.empty) {
            whitelistHtml = '<p style="text-align:center; color:#7f8c8d;">No hay tags autorizados</p>';
        } else {
            whitelistHtml = '<div style="max-height: 650px; overflow-y: auto;">';
            whitelistSnapshot.forEach(doc => {
                const data = doc.data();
                const tagId = doc.id;
                const userName = data.user_name || 'Usuario Desconocido';
                const dept = data.departamento || 'N/A';
                const addedAt = data.added_at ? formatTimestamp(data.added_at) : 'N/A';
                
                whitelistHtml += `
                    <div style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.3); padding: 14px; margin-bottom: 8px; border-radius: 10px;">
                        <div style="font-weight: 600; color: #10b981; font-size: 15px; margin-bottom: 6px;"> ${userName}</div>
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <span style="font-size: 13px; color: #e2e8f0;"> ${dept}</span>
                            <code style="font-size: 11px; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px;">${tagId}</code>
                            <span style="font-size: 11px; color: #cbd5e1;">${addedAt}</span>
                        </div>
                    </div>
                `;
            });
            whitelistHtml += '</div>';
        }
        whitelistContainer.innerHTML = whitelistHtml;

        const blacklistSnapshot = await db.collection('blacklist').where('clientId', '==', window.currentUserClientId).limit(100).get();
        let blacklistHtml = '';
        if (blacklistSnapshot.empty) {
            blacklistHtml = '<p style="text-align:center; color:#7f8c8d;">No hay tags bloqueados</p>';
        } else {
            blacklistHtml = '<div style="max-height: 650px; overflow-y: auto;">';
            blacklistSnapshot.forEach(doc => {
                const data = doc.data();
                const tagId = doc.id;
                const reason = data.reason || 'Sin razón especificada';
                const addedAt = data.added_at ? formatTimestamp(data.added_at) : 'N/A';
                
                blacklistHtml += `
                    <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); padding: 14px; margin-bottom: 8px; border-radius: 10px;">
                        <div style="font-weight: 600; color: #ef4444; font-size: 15px; margin-bottom: 6px;"> ${reason}</div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <code style="font-size: 11px; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 4px;">${tagId}</code>
                            <span style="font-size: 11px; color: #cbd5e1;">${addedAt}</span>
                        </div>
                    </div>
                `;
            });
            blacklistHtml += '</div>';
        }
        blacklistContainer.innerHTML = blacklistHtml;
        
    } catch (error) {
        console.error('Error loading lists:', error);
        whitelistContainer.innerHTML = '<p style="color:#e74c3c;">❌ Error al cargar whitelist</p>';
        blacklistContainer.innerHTML = '<p style="color:#e74c3c;">❌ Error al cargar blacklist</p>';
    }
}

function switchListView(viewName) {
    // Ocultar todas las vistas
    document.querySelectorAll('.list-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.list-submenu-btn').forEach(btn => {
        btn.style.background = 'rgba(100, 116, 139, 0.2)';
        btn.style.color = '#94a3b8';
        btn.classList.remove('active');
    });
    
    // Mostrar la vista seleccionada
    const viewId = `${viewName}-list-view`;
    const view = document.getElementById(viewId);
    if (view) {
        view.style.display = 'block';
    }
    
    // Activar el botón seleccionado
    const activeBtn = document.querySelector(`[data-list="${viewName}"]`);
    if (activeBtn) {
        activeBtn.style.background = 'var(--gradient-primary)';
        activeBtn.style.color = 'white';
        activeBtn.classList.add('active');
    }
}

function filterAuthorizedTags() {
    const searchValue = document.getElementById('authorizedSearch').value.toLowerCase();
    const container = document.getElementById('whitelistContainer');
    if (!container) return;
    
    const tags = container.querySelectorAll('[data-tag-item]');
    tags.forEach(tag => {
        const text = tag.textContent.toLowerCase();
        tag.style.display = text.includes(searchValue) ? 'flex' : 'none';
    });
}

function filterDeniedTags() {
    const searchValue = document.getElementById('deniedSearch').value.toLowerCase();
    const container = document.getElementById('blacklistContainer');
    if (!container) return;
    
    const tags = container.querySelectorAll('[data-tag-item]');
    tags.forEach(tag => {
        const text = tag.textContent.toLowerCase();
        tag.style.display = text.includes(searchValue) ? 'flex' : 'none';
    });
}

function filterUnregisteredTags() {
    const searchValue = document.getElementById('unregisteredSearch').value.toLowerCase();
    const container = document.getElementById('unregisteredContainer');
    if (!container) return;
    
    const tags = container.querySelectorAll('[data-tag-item]');
    tags.forEach(tag => {
        const text = tag.textContent.toLowerCase();
        tag.style.display = text.includes(searchValue) ? 'flex' : 'none';
    });
}

async function loadUnregisteredTags() {
    try {
        showNotification(' Cargando tags no registrados...', 'info');
        const container = document.getElementById('unregisteredContainer');
        if (!container) {
            console.error(' Container "unregisteredContainer" no encontrado');
            return;
        }
        
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;"> Cargando...</p>';
        
        // Obtener logs de tags desconocidos (últimos 7 días)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const snapshot = await db.collection('access_logs')
            .where('clientId', '==', window.currentUserClientId).where('status', '==', 'unknown')
            .where('timestamp', '>=', sevenDaysAgo)
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        // Agrupar por tag_id único
        const uniqueTags = new Map();
        snapshot.forEach(doc => {
            const log = doc.data();
            const tagId = log.tag_id;
            if (!uniqueTags.has(tagId)) {
                uniqueTags.set(tagId, {
                    tagId: tagId,
                    lastSeen: log.timestamp.toDate() || new Date(),
                    accessPoint: log.access_point_name || 'Desconocido',
                    count: 1
                });
            } else {
                uniqueTags.get(tagId).count++;
            }
        });
        
        if (uniqueTags.size === 0) {
            container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:20px;"> No hay tags no registrados</p>';
            showNotification(' No se encontraron tags no registrados', 'success');
            return;
        }
        
        // Renderizar tags
        container.innerHTML = Array.from(uniqueTags.values()).map(tag => `
            <div data-tag-item style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(100, 116, 139, 0.1); border-radius: 8px; border: 1px solid rgba(100, 116, 139, 0.2); margin-bottom: 8px;">
                <input type="checkbox" id="unreg_${tag.tagId}" onchange="toggleUnregisteredSelection('${tag.tagId}')" style="width: 18px; height: 18px; cursor: pointer;">
                <div style="flex: 1;">
                    <div style="font-family: 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">
                        ${tag.tagId.slice(-8)} <span style="color: #94a3b8; font-size: 12px;">(${tag.count} veces)</span>
                    </div>
                    <div style="font-size: 12px; color: #64748b;">
                         ${tag.accessPoint} ·  ${formatTimestamp(tag.lastSeen)}
                    </div>
                </div>
            </div>
        `).join('');
        
        showNotification(` ${uniqueTags.size} tags no registrados encontrados`, 'success');
    } catch (error) {
        console.error('❌ Error cargando tags no registrados:', error);
        showNotification('❌ Error: ' + error.message, 'error');
        const container = document.getElementById('unregisteredContainer');
        if (container) {
            container.innerHTML = '<p style="text-align:center; color:#ef4444; padding:20px;">❌ Error al cargar tags</p>';
        }
    }
}

function showAddToWhitelistModal() {
    showNotification(' Para agregar un tag a la whitelist, asígnalo a un usuario desde la gestión de residentes', 'info');
}

function showAddToBlacklistModal() {
    const tagId = prompt('Ingresa el ID del tag a bloquear (24 caracteres hexadecimales):');
    if (!tagId) return;
    
    if (!/^[0-9A-Fa-f]{24}$/.test(tagId)) {
        showNotification(' Formato de tag inválido. Debe ser 24 caracteres hexadecimales', 'warning');
        return;
    }
    
    addToBlacklist(tagId);
}

async function addToBlacklist(tagId) {
    try {
        await db.collection('blacklist').doc(tagId).set({
            added_at: firebase.firestore.FieldValue.serverTimestamp(),
            added_by: currentUser || 'Sistema',
            reason: 'Bloqueado manualmente',
            clientId: window.currentUserClientId
        });
        
        showNotification(' Tag agregado a la blacklist', 'success');
        loadLists();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al agregar tag a blacklist', 'error');
    }
}

function toggleUnregisteredSelection(tagId) {
    const index = selectedUnregisteredTags.indexOf(tagId);
    if (index > -1) {
        selectedUnregisteredTags.splice(index, 1);
    } else {
        selectedUnregisteredTags.push(tagId);
    }
    
    const checkbox = document.querySelector(`#unreg_${tagId}`);
    if (checkbox) checkbox.checked = selectedUnregisteredTags.includes(tagId);
    
    console.log('Tags no registrados seleccionados:', selectedUnregisteredTags);
}

function toggleWhitelistSelection(tagId) {
    const index = selectedWhitelistTags.indexOf(tagId);
    if (index > -1) {
        selectedWhitelistTags.splice(index, 1);
    } else {
        selectedWhitelistTags.push(tagId);
    }
    
    const checkbox = document.querySelector(`.whitelist-checkbox[data-tag-id="${tagId}"]`);
    if (checkbox) checkbox.checked = selectedWhitelistTags.includes(tagId);
    
    console.log('Tags autorizados seleccionados:', selectedWhitelistTags);
}

function toggleBlacklistSelection(tagId) {
    const index = selectedBlacklistTags.indexOf(tagId);
    if (index > -1) {
        selectedBlacklistTags.splice(index, 1);
    } else {
        selectedBlacklistTags.push(tagId);
    }
    
    // Actualizar checkbox
    const checkbox = document.querySelector(`.blacklist-checkbox[data-tag-id="${tagId}"]`);
    if (checkbox) checkbox.checked = selectedBlacklistTags.includes(tagId);
    
    console.log('Tags bloqueados seleccionados:', selectedBlacklistTags);
}

async function moveSelectedToBlacklist() {
    if (selectedUnregisteredTags.length === 0) {
        showNotification(' Selecciona al menos un tag', 'warning');
        return;
    }
    
    const reason = prompt(`Motivo del bloqueo (${selectedUnregisteredTags.length} tag(s)):`, 'Tag no autorizado detectado');
    if (!reason) return;
    
    try {
        const batch = db.batch();
        selectedUnregisteredTags.forEach(tagId => {
            const ref = db.collection('blacklist').doc(tagId);
            batch.set(ref, {
                tag_id: tagId,
                reason: reason,
                added_at: firebase.firestore.FieldValue.serverTimestamp(),
                added_by: currentUser ? currentUser.email : 'system'
            });
        });
        
        await batch.commit();
        showNotification(` ${selectedUnregisteredTags.length} tag(s) movidos a BlackList`, 'success');
        selectedUnregisteredTags = [];
        loadLists();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al mover tags', 'error');
    }
}

async function moveSelectedToWhitelist() {
    if (selectedUnregisteredTags.length === 0) {
        showNotification(' Selecciona al menos un tag', 'warning');
        return;
    }
    
    const userName = prompt(`Nombre de usuario para ${selectedUnregisteredTags.length} tag(s):`, '');
    if (!userName) return;
    
    const dept = prompt('Departamento:', '');
    if (!dept) return;
    
    try {
        const batch = db.batch();
        selectedUnregisteredTags.forEach(tagId => {
            const ref = db.collection('whitelist').doc(tagId);
            batch.set(ref, {
                tag_id: tagId,
                user_name: userName,
                departamento: dept,
                added_at: firebase.firestore.FieldValue.serverTimestamp(),
                added_by: currentUser ? currentUser.email : 'system'
            });
        });
        
        await batch.commit();
        showNotification(` ${selectedUnregisteredTags.length} tag(s) movidos a WhiteList`, 'success');
        selectedUnregisteredTags = [];
        loadLists();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al mover tags', 'error');
    }
}

async function grantTemporaryAccess() {
    if (selectedUnregisteredTags.length === 0) {
        showNotification(' Selecciona al menos un tag', 'warning');
        return;
    }
    
    // Crear modal para acceso temporal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2> Acceso Temporal</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                <p><strong>${selectedUnregisteredTags.length}</strong> tag(s) seleccionado(s)</p>
                
                <div class="form-group">
                    <label>Nombre del visitante:</label>
                    <input type="text" id="tempAccessName" placeholder="Ej: Juan Pérez" required>
                </div>
                
                <div class="form-group">
                    <label>Motivo de la visita:</label>
                    <input type="text" id="tempAccessReason" placeholder="Ej: Visita técnica, Entrega, etc." required>
                </div>
                
                <div class="form-group">
                    <label>Fecha de expiración:</label>
                    <input type="datetime-local" id="tempAccessExpiry" required>
                </div>
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal').remove()" class="btn-secondary">Cancelar</button>
                <button onclick="saveTempAccess()" class="btn-primary"> Otorgar Acceso</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Establecer fecha por defecto (mañana a esta hora)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('tempAccessExpiry').value = tomorrow.toISOString().slice(0, 16);
}

async function saveTempAccess() {
    const name = document.getElementById('tempAccessName').value.trim();
    const reason = document.getElementById('tempAccessReason').value.trim();
    const expiry = document.getElementById('tempAccessExpiry').value;
    
    if (!name || !reason || !expiry) {
        showNotification(' Completa todos los campos', 'warning');
        return;
    }
    
    try {
        const batch = db.batch();
        const expiryDate = new Date(expiry);
        
        selectedUnregisteredTags.forEach(tagId => {
            const ref = db.collection('whitelist').doc(tagId);
            batch.set(ref, {
                tag_id: tagId,
                user_name: name,
                departamento: `TEMP: ${reason}`,
                temporary: true,
                expires_at: firebase.firestore.Timestamp.fromDate(expiryDate),
                added_at: firebase.firestore.FieldValue.serverTimestamp(),
                added_by: currentUser ? currentUser.email : 'system'
            });
        });
        
        await batch.commit();
        showNotification(` Acceso temporal otorgado hasta ${expiryDate.toLocaleString()}`, 'success');
        selectedUnregisteredTags = [];
        document.querySelector('.modal').remove();
        loadLists();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al otorgar acceso', 'error');
    }
}

async function assignUserToSelectedTag() {
    if (selectedUnregisteredTags.length === 0) {
        showNotification(' Selecciona un tag', 'warning');
        return;
    }
    
    if (selectedUnregisteredTags.length > 1) {
        showNotification(' Selecciona solo un tag para asignar usuario', 'warning');
        return;
    }
    
    const tagId = selectedUnregisteredTags[0];
    showRegisterTagModal(tagId, 'N/A');
}

async function moveToBlacklist() {
    if (selectedWhitelistTags.length === 0) {
        showNotification(' Selecciona al menos un tag autorizado', 'warning');
        return;
    }
    
    const reason = prompt(`Motivo del bloqueo (${selectedWhitelistTags.length} tag(s)):`, 'Acceso denegado por administración');
    if (!reason) return;
    
    try {
        const batch = db.batch();
        
        selectedWhitelistTags.forEach(tagId => {
            const blacklistRef = db.collection('blacklist').doc(tagId);
            batch.set(blacklistRef, {
                tag_id: tagId,
                reason: reason,
                added_at: firebase.firestore.FieldValue.serverTimestamp(),
                added_by: currentUser ? currentUser.email : 'system'
            });
            
            const whitelistRef = db.collection('whitelist').doc(tagId);
            batch.delete(whitelistRef);
        });
        
        await batch.commit();
        
        showNotification(` ${selectedWhitelistTags.length} tag(s) movidos a blacklist`, 'success');
        selectedWhitelistTags = [];
        loadLists();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al mover tags', 'error');
    }
}

async function removeFromBlacklist() {
    if (selectedBlacklistTags.length === 0) {
        showNotification(' Selecciona al menos un tag bloqueado', 'warning');
        return;
    }
    
    if (!confirm(`¿Desbloquear ${selectedBlacklistTags.length} tag(s)?`)) return;
    
    try {
        const batch = db.batch();
        
        selectedBlacklistTags.forEach(tagId => {
            const ref = db.collection('blacklist').doc(tagId);
            batch.delete(ref);
        });
        
        await batch.commit();
        
        showNotification(` ${selectedBlacklistTags.length} tag(s) desbloqueados`, 'success');
        selectedBlacklistTags = [];
        loadLists();
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al desbloquear tags', 'error');
    }
}

/* ========================================
   FASE 1: AUTENTICACIÓN Y USUARIOS
   ======================================== */

// ========== LIMPIEZA Y RESTAURACIÓN DE UI ==========

/**
 * Limpia la UI después del logout
 * - Remueve clases de autenticación
 * - Oculta información del usuario
 * - Restaura el logo al estado de login
 * - Reaplica restricciones de rol
 */
function cleanupUIAfterLogout() {
    // Remover clase authenticated del HTML y body
    document.documentElement.classList.remove('authenticated');
    document.body.classList.remove('authenticated');
    
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) userInfoEl.style.display = 'none';
    
    // Restaurar onclick del logo
    const headerLogo = document.getElementById('headerLogo');
    if (headerLogo) {
        headerLogo.style.cursor = 'pointer';
        headerLogo.onclick = showLoginModal;
        headerLogo.title = 'Click para iniciar sesión';
    }
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('restricted-tab');
        btn.disabled = false;
    });
    
    applyRoleRestrictions();
}

// ========== CONTROL DE ACCESO Y ROLES ==========

/**
 * Aplica restricciones de UI según el rol del usuario
 * - admin: acceso completo
 * - staff/guard: acceso a control y monitoreo
 * - resident/guest: solo visualización
 */
function applyRoleRestrictions() {
    // Si no hay usuario autenticado, restringir todo
    if (!currentUser || !userRole) {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.add('restricted-tab');
            btn.disabled = true;
        });
        return;
    }
    
    const restrictedTabsForGuards = ['users', 'config', 'alerts'];
    
    if (userRole === 'guard' || userRole === 'staff') {
        // Restringir tabs administrativas
        restrictedTabsForGuards.forEach(tabId => {
            const tabButton = document.querySelector(`[onclick*="${tabId}"]`);
            if (tabButton) {
                tabButton.classList.add('restricted-tab');
                tabButton.disabled = true;
            }
        });
        
        console.log('📋 Restricciones aplicadas para role:', userRole);
        
    } else if (userRole === 'admin') {
        // Admin tiene acceso completo - remover todas las restricciones
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('restricted-tab');
            btn.disabled = false;
        });
        
        console.log('✅ Acceso completo para admin');
        
    } else if (userRole === 'resident' || userRole === 'guest') {
        // Residentes y guests solo pueden ver, no modificar
        document.querySelectorAll('.tab-button').forEach(btn => {
            const tabId = btn.getAttribute('onclick');
            // Permitir solo dashboard y logs
            if (tabId && !tabId.includes('dashboard') && !tabId.includes('logs')) {
                btn.classList.add('restricted-tab');
                btn.disabled = true;
            }
        });
        
        console.log('📋 Acceso de solo lectura para:', userRole);
    }
}

// ========== GESTIÓN DE USUARIOS ==========

/**
 * Filtra usuarios según búsqueda en tiempo real
 * Busca en: nombre, departamento, teléfono, tags
 */
function filterUsers() {
    const search = document.getElementById('userSearch');
    if (!search) return;
    const searchValue = search.value.toLowerCase();
    const filtered = users.filter(user => 
        (user.name || '').toLowerCase().includes(searchValue) ||
        (user.departamento || user.unit || '').toLowerCase().includes(searchValue) ||
        (user.phone || '').toLowerCase().includes(searchValue) ||
        (user.tags || []).some(tag => tag.toLowerCase().includes(searchValue))
    );
    
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(user => {
        const blockDepto = user.block && user.departamento ? 
            `Block ${user.block}-${user.departamento}` : 
            (user.departamento || user.unit || 'N/A');
        
        return `
        <tr>
            <td>${user.name || 'N/A'}</td>
            <td style="font-weight: 600; color: #2563eb;">${blockDepto}</td>
            <td>${user.phone || 'N/A'}</td>
            <td style="font-family: 'Courier New', monospace; font-weight: 600;">${user.vehicle || 'N/A'}</td>
            <td style="font-family: 'Courier New', monospace; font-size: 12px;">${(user.tags || []).map(t => t.slice(-8)).join(', ') || 'Sin tags'}</td>
            <td><span style="color: ${user.active ? '#22c55e' : '#ef4444'}; font-weight: 600;">${user.active ? '✓ Activo' : '✗ Inactivo'}</span></td>
            <td>
                <button class="btn btn-primary btn-small" onclick="editUser('${user.id}')">✏</button>
                <button class="btn btn-danger btn-small" onclick="deleteUser('${user.id}')">🗑</button>
            </td>
        </tr>
    `}).join('');
}

// ========== FUNCIONES DE TESTING Y LIMPIEZA ==========

/**
 * Elimina TODOS los usuarios y sus datos de whitelist
 * Requiere doble confirmación por seguridad
 */
async function deleteAllUsers() {
    const confirmation = confirm('⚠ ADVERTENCIA: Esta acción eliminará TODOS los usuarios y sus datos de whitelist.\n\n¿Está absolutamente seguro de continuar?');
    if (!confirmation) {
        showNotification('ℹ Operación cancelada', 'info');
        return;
    }

    const secondConfirmation = prompt('Para confirmar, escriba "ELIMINAR TODOS" (en mayúsculas):');
    if (secondConfirmation !== 'ELIMINAR TODOS') {
        showNotification('❌ Confirmación incorrecta. Operación cancelada.', 'error');
        return;
    }

    try {
        showNotification('🔄 Eliminando todos los usuarios...', 'info');
        console.log('🚀 Iniciando eliminación masiva de usuarios');

        // Obtener todos los usuarios
        const snapshot = await db.collection('users').where('clientId', '==', window.currentUserClientId).get();
        console.log(`📊 Total de usuarios a eliminar: ${snapshot.size}`);

        if (snapshot.empty) {
            showNotification('ℹ No hay usuarios para eliminar', 'info');
            return;
        }

        // Eliminar en lotes para evitar problemas de rendimiento
        const batch = db.batch();
        let count = 0;

        for (const doc of snapshot.docs) {
            const user = doc.data();
            const tags = user.tags || [];

            // Eliminar tags de whitelist
            for (const tagId of tags) {
                const whitelistRef = db.collection('whitelist').doc(tagId);
                batch.delete(whitelistRef);
            }

            // Eliminar usuario
            batch.delete(doc.ref);
            count++;
        }

        // Ejecutar eliminación en batch
        await batch.commit();
        console.log(`✅ ${count} usuarios eliminados exitosamente`);

        showNotification(`✅ ${count} usuarios eliminados correctamente`, 'success');
        loadUsers();

    } catch (error) {
        console.error('❌ Error eliminando usuarios:', error);
        showNotification('❌ Error al eliminar usuarios: ' + error.message, 'error');
    }
}

/**
 * Crea 3 usuarios de prueba para testing
 * - Usuario Autorizado (Block 1-101)
 * - Usuario No Autorizado (Block 1-102)
 * - Usuario Sin Tags (Block 1-103)
 */
async function createTestUsers() {
    const confirmation = confirm('📋 Esta función creará 3 usuarios de prueba:\n\n1. Usuario Autorizado (Block 1-101)\n2. Usuario No Autorizado (Block 1-102)\n3. Usuario Sin Tags (Block 1-103)\n\n¿Desea continuar?');
    if (!confirmation) {
        showNotification('ℹ Operación cancelada', 'info');
        return;
    }

    try {
        showNotification('🔄 Creando usuarios de prueba...', 'info');
        console.log('🚀 Iniciando creación de usuarios de prueba');

        const testUsers = [
            {
                name: 'Usuario Autorizado - Prueba',
                departamento: '1-101',
                block: '1',
                unit: '101',
                phone: '+56912345001',
                vehicle: '',
                tags: [],  // Se asignará manualmente un tag conocido
                active: true,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: 'testing_script',
                notes: 'Usuario de prueba con tag autorizado'
            },
            {
                name: 'Usuario No Autorizado - Prueba',
                departamento: '1-102',
                block: '1',
                unit: '102',
                phone: '+56912345002',
                vehicle: '',
                tags: [],  // Se asignará manualmente un tag conocido pero NO autorizado
                active: false,  // Usuario inactivo = no autorizado
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: 'testing_script',
                notes: 'Usuario de prueba SIN autorización (inactivo)'
            },
            {
                name: 'Usuario Sin Tags - Prueba',
                departamento: '1-103',
                block: '1',
                unit: '103',
                phone: '+56912345003',
                vehicle: '',
                tags: [],  // Sin tags asignados
                active: true,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                created_by: 'testing_script',
                notes: 'Usuario de prueba sin tags asignados'
            }
        ];

        for (const userData of testUsers) {
            const docRef = await db.collection('users').add(userData);
            console.log(`✅ Usuario creado: ${userData.name} (ID: ${docRef.id})`);
        }

        showNotification('✅ 3 usuarios de prueba creados exitosamente', 'success');
        console.log('📋 Usuarios de prueba creados. Ahora debes asignar tags manualmente:');
        console.log('  1. Usuario Autorizado: Asigna un tag conocido y activa el usuario');
        console.log('  2. Usuario No Autorizado: Asigna un tag conocido pero mantén el usuario inactivo');
        console.log('  3. Usuario Sin Tags: No asignes ningún tag');

        loadUsers();

        // Mostrar instrucciones
        setTimeout(() => {
            alert('✅ Usuarios de prueba creados!\n\nPasos siguientes:\n\n1. Usuario Autorizado (Block 1-101):\n   - Edítalo y asigna un tag conocido\n   - Asegúrate que está ACTIVO\n\n2. Usuario No Autorizado (Block 1-102):\n   - Edítalo y asigna un tag DIFERENTE\n   - Asegúrate que está INACTIVO\n\n3. Usuario Sin Tags (Block 1-103):\n   - NO asignes tags\n   - Puede estar activo o inactivo');
        }, 1000);

    } catch (error) {
        console.error('❌ Error creando usuarios de prueba:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// ========== VALIDACIÓN DE PATENTES CHILENAS ==========

/**
 * Formatea una patente chilena al formato estándar
 * Formato: XX-XX-99 (2 letras - 2 letras - 2 números)
 * @param {string} plate - Patente sin formato
 * @returns {string} Patente formateada
 */
function formatChileanPlate(plate) {
    // Remover espacios y convertir a mayúsculas
    plate = plate.replace(/\s/g, '').toUpperCase();
    
    // Remover guiones existentes
    plate = plate.replace(/-/g, '');
    
    // Formato chileno: XXXX99 -> XX-XX-99 (4 letras + 2 números)
    if (plate.length === 6 && /^[A-Z]{4}\d{2}$/.test(plate)) {
        return `${plate.substring(0, 2)}-${plate.substring(2, 4)}-${plate.substring(4, 6)}`;
    }
    
    // Si ya tiene el formato correcto, devolverlo
    if (/^[A-Z]{2}-[A-Z]{2}-\d{2}$/.test(plate)) {
        return plate;
    }
    
    // Si no coincide con ningún formato válido, devolver original
    return plate;
}

/**
 * Valida si una patente cumple con el formato chileno
 * Acepta formatos: XX-XX-99 o XXXX99
 * @param {string} plate - Patente a validar
 * @returns {boolean} true si es válida
 */
function validateChileanPlate(plate) {
    // Formato chileno nuevo: XX-XX-99 (2 letras - 2 letras - 2 números)
    const patternNew = /^[A-Z]{2}-[A-Z]{2}-\d{2}$/;
    // Formato chileno antiguo: XXXX99 (4 letras + 2 números sin guiones)
    const patternOld = /^[A-Z]{4}\d{2}$/;
    
    return patternNew.test(plate) || patternOld.test(plate);
}

console.log('✅ Módulo dashboard-modules.js cargado correctamente');

