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
let realtimeListeners = [];
let currentTab = 'control'; // Tab actualmente visible
let dataLoaded = false; // Bandera para saber si los datos ya se cargaron

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
 * Cargar usuarios desde Firestore
 */
function loadUsers() {
    console.log('📂 [LOAD] Iniciando loadUsers...');
    return db.collection('users').get()
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
    return db.collection('alerts').orderBy('timestamp', 'desc').limit(100).get()
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
    return db.collection('logs').orderBy('timestamp', 'desc').limit(500).get()
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
    return db.collection('whitelist').get()
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
    return db.collection('blacklist').get()
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
        const snapshot = await db.collection('rfid_tags')
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
                    <tr>
                        <th>Nombre</th>
                        <th>Departamento</th>
                        <th>Teléfono</th>
                        <th>Vehículo</th>
                        <th>Tags</th>
                        <th style="text-align: center;">Estado</th>
                        <th style="text-align: center;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${regularUsers.map((u, index) => `
                        <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
                            <td class="text-cell">${u.name || 'Sin nombre'}</td>
                            <td class="text-cell">${u.departamento || '-'}</td>
                            <td class="text-cell">${u.phone || '-'}</td>
                            <td class="text-cell">${u.vehicle || '-'}</td>
                            <td class="text-cell">
                                ${(u.tags || []).map(t => `<span class="tag-badge">...${t.slice(-8)}</span>`).join('')}
                            </td>
                            <td style="text-align: center;">
                                <span class="status-badge ${u.active? 'status-active' : 'status-inactive'}">
                                    ${u.active ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td style="text-align: center;">
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
                childCount: tbody.children.length
            });
        }
        
        if (allRows.length > 0) {
            const firstRow = allRows[0];
            const firstRowComputed = window.getComputedStyle(firstRow);
            console.log('🔍 [COMPUTED] Primera <tr>:', {
                display: firstRowComputed.display,
                height: firstRow.offsetHeight,
                cellCount: firstRow.children.length,
                className: firstRow.className
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
                    textContent: firstCell.textContent.substring(0, 30)
                });
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
        const eventDoc = await db.collection('rfid_tags').add({
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
            client_id: 'condominio-neos'
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
        const snapshot = await db.collection('rfid_tags')
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
            updated_by: currentUser?.email || 'dashboard'
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
        
        const snapshot = await db.collection('users').get();
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

console.log('✅ Módulo dashboard-modules.js cargado correctamente');

