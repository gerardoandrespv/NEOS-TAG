// ============================================
// DASHBOARD RFID NEOS TECH - VERSIÓN CORREGIDA
// ============================================
// Fecha: 2026-01-20
// Problema resuelto: N.A en visualización
// ============================================

// 🔧 CONFIGURACIÓN FIREBASE (VERIFICADA)
const firebaseConfig = {
    apiKey: "AIzaSyBZ-XRSRgC2gz9E6zdYpes7yv5nLZtKmSw",
    authDomain: "neos-tech.firebaseapp.com",
    projectId: "neos-tech",
    storageBucket: "neos-tech.firebasestorage.app",
    messagingSenderId: "738411977369",
    appId: "1:738411977369:web:7facc71cea4c271d217608",
    measurementId: "G-DL4X5MX5JL"
};

// 🚀 INICIALIZACIÓN FIREBASE
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 📊 VARIABLES GLOBALES
let lastDocument = null;
let isInitialLoad = true;
const PAGE_SIZE = 50;

// 📅 FUNCIÓN: Formatear fecha ISO a texto legible
function formatDateTime(isoString) {
    if (!isoString) return "N/A";
    
    try {
        const date = new Date(isoString);
        
        // Formato: "19 Ene 2026, 10:43:52"
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch (error) {
        console.error("Error formateando fecha:", error);
        return isoString;
    }
}

// 🏷️ FUNCIÓN: Formatear Tag EPC (acortar si es muy largo)
function formatEPC(epc) {
    if (!epc) return "N/A";
    if (epc.length > 16) {
        return epc.substring(0, 8) + "..." + epc.substring(epc.length - 8);
    }
    return epc;
}

// 🔄 FUNCIÓN: Cargar eventos RFID desde Firestore
async function loadRFIDEvents(loadMore = false) {
    try {
        const tableBody = document.getElementById('rfidTableBody');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        
        // Mostrar indicador de carga
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (loadMoreBtn) loadMoreBtn.disabled = true;
        
        // Construir consulta
        let query = db.collection('rfid_tags')
            .orderBy('processed_at', 'desc');
        
        // Para paginación
        if (loadMore && lastDocument) {
            query = query.startAfter(lastDocument);
        } else {
            if (tableBody) tableBody.innerHTML = '';
        }
        
        query = query.limit(PAGE_SIZE);
        
        // Ejecutar consulta
        const querySnapshot = await query.get();
        
        // Ocultar indicador de carga
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Verificar si hay datos
        if (querySnapshot.empty) {
            if (!loadMore) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">
                            No hay eventos RFID registrados
                        </td>
                    </tr>
                `;
            }
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }
        
        // Procesar cada documento
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            addEventToTable(data);
        });
        
        // Actualizar último documento para paginación
        lastDocument = querySnapshot.docs[querySnapshot.docs.length - 1];
        
        // Mostrar/ocultar botón "Cargar más"
        if (loadMoreBtn) {
            loadMoreBtn.disabled = false;
            loadMoreBtn.style.display = querySnapshot.size === PAGE_SIZE ? 'block' : 'none';
        }
        
        // Actualizar contador
        updateEventCount();
        
        // Marcar carga inicial completada
        isInitialLoad = false;
        
    } catch (error) {
        console.error("Error cargando eventos RFID:", error);
        showError("Error al cargar datos: " + error.message);
    }
}

// 📋 FUNCIÓN: Agregar evento a la tabla
function addEventToTable(eventData) {
    const tableBody = document.getElementById('rfidTableBody');
    if (!tableBody) return;
    
    // Mapear campos REALES (según estructura en Firestore)
    const tagId = eventData.epc || "N/A";
    const readerId = eventData.reader_sn || "N/A";
    const location = eventData.location || "N/A";
    
    // Usar timestamp (string ISO) o processed_at (Timestamp)
    let timestamp = eventData.timestamp || eventData.received_at;
    if (eventData.processed_at) {
        // Si processed_at es un Timestamp de Firestore
        timestamp = eventData.processed_at.toDate().toISOString();
    }
    
    const formattedTime = formatDateTime(timestamp);
    const status = eventData.status || "N/A";
    const gatewayVersion = eventData.gateway_version || "N/A";
    
    // Crear fila
    const row = document.createElement('tr');
    
    // Determinar clase CSS basada en estado
    if (status === "active") {
        row.classList.add("table-success");
    } else if (status === "inactive" || status === "blocked") {
        row.classList.add("table-danger");
    }
    
    // Crear celdas con datos CORRECTOS
    row.innerHTML = `
        <td>
            <span class="tag-id" title="${tagId}">
                ${formatEPC(tagId)}
            </span>
        </td>
        <td>
            <span class="badge bg-primary">
                ${readerId}
            </span>
        </td>
        <td>
            <span class="badge bg-secondary">
                ${location}
            </span>
        </td>
        <td class="text-nowrap">
            ${formattedTime}
        </td>
        <td>
            ${getStatusBadge(status)}
        </td>
        <td>
            <span class="badge bg-info">
                v${gatewayVersion}
            </span>
        </td>
    `;
    
    // Insertar al inicio para mostrar los más recientes primero
    tableBody.insertBefore(row, tableBody.firstChild);
}

// 🏷️ FUNCIÓN: Generar badge de estado
function getStatusBadge(status) {
    const statusText = status.toLowerCase();
    
    if (statusText === "active") {
        return '<span class="badge bg-success">✅ Activo</span>';
    } else if (statusText === "inactive") {
        return '<span class="badge bg-warning">⏸️ Inactivo</span>';
    } else if (statusText === "blocked") {
        return '<span class="badge bg-danger">🚫 Bloqueado</span>';
    } else {
        return `<span class="badge bg-secondary">${status}</span>`;
    }
}

// 📊 FUNCIÓN: Actualizar contador de eventos
function updateEventCount() {
    const countElement = document.getElementById('eventCount');
    if (!countElement) return;
    
    const tableRows = document.querySelectorAll('#rfidTableBody tr');
    const visibleCount = Array.from(tableRows).filter(row => 
        !row.querySelector('td.text-center.text-muted')
    ).length;
    
    countElement.textContent = visibleCount;
}

// 🎯 FUNCIÓN: Configurar escucha en tiempo real
function setupRealtimeListener() {
    db.collection('rfid_tags')
        .orderBy('processed_at', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    // Solo agregar si no es carga inicial
                    if (!isInitialLoad) {
                        const newEvent = change.doc.data();
                        addEventToTable(newEvent);
                        updateEventCount();
                        
                        // Mostrar notificación de nuevo evento
                        showNewEventNotification(newEvent);
                    }
                }
            });
        }, (error) => {
            console.error("Error en listener tiempo real:", error);
        });
}

// 🔔 FUNCIÓN: Mostrar notificación de nuevo evento
function showNewEventNotification(eventData) {
    // Verificar si las notificaciones están habilitadas
    const notificationsEnabled = localStorage.getItem('rfidNotifications') === 'true';
    if (!notificationsEnabled) return;
    
    const tagId = eventData.epc || "Nuevo Tag";
    const readerId = eventData.reader_sn || "Desconocido";
    
    // Crear notificación toast
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">🚨 Nuevo Evento RFID</strong>
                <small class="text-muted">justo ahora</small>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                <strong>Tag:</strong> ${formatEPC(tagId)}<br>
                <strong>Lector:</strong> ${readerId}<br>
                <strong>Ubicación:</strong> ${eventData.location || 'N/A'}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Mostrar toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    // Reproducir sonido de notificación
    playNotificationSound();
    
    // Eliminar toast después de que desaparezca
    toastElement.addEventListener('hidden.bs.toast', function () {
        this.remove();
    });
}

// 🔊 FUNCIÓN: Reproducir sonido de notificación
function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ');
    audio.volume = 0.3;
    audio.play().catch(e => console.log("No se pudo reproducir sonido:", e));
}

// 📈 FUNCIÓN: Inicializar gráficos
function initializeCharts() {
    // Gráfico de actividad por hora
    const ctxHourly = document.getElementById('hourlyChart');
    if (ctxHourly) {
        // TODO: Implementar gráfico de actividad horaria
        console.log("Gráfico de actividad por hora listo para implementar");
    }
    
    // Gráfico de lectores activos
    const ctxReaders = document.getElementById('readersChart');
    if (ctxReaders) {
        // TODO: Implementar gráfico de lectores
        console.log("Gráfico de lectores listo para implementar");
    }
}

// 🔍 FUNCIÓN: Buscar eventos
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#rfidTableBody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
        
        updateEventCount();
    });
}

// 📅 FUNCIÓN: Configurar filtros de fecha
function setupDateFilters() {
    const dateFilter = document.getElementById('dateFilter');
    if (!dateFilter) return;
    
    dateFilter.addEventListener('change', function() {
        const filterValue = this.value;
        const rows = document.querySelectorAll('#rfidTableBody tr');
        const now = new Date();
        
        rows.forEach(row => {
            const dateCell = row.cells[3]; // Columna de fecha
            if (!dateCell) return;
            
            const dateText = dateCell.textContent;
            const eventDate = new Date(dateText);
            
            let showRow = true;
            
            if (filterValue === 'today') {
                const isToday = eventDate.toDateString() === now.toDateString();
                showRow = isToday;
            } else if (filterValue === 'week') {
                const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
                showRow = eventDate >= oneWeekAgo;
            } else if (filterValue === 'month') {
                const oneMonthAgo = new Date(now);
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                showRow = eventDate >= oneMonthAgo;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
        
        updateEventCount();
    });
}

// ⚙️ FUNCIÓN: Configurar controles de usuario
function setupUserControls() {
    // Botón de actualización manual
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            refreshBtn.classList.add('spin');
            loadRFIDEvents(false).finally(() => {
                setTimeout(() => refreshBtn.classList.remove('spin'), 500);
            });
        });
    }
    
    // Botón de cargar más
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            loadRFIDEvents(true);
        });
    }
    
    // Interruptor de notificaciones
    const notificationToggle = document.getElementById('notificationToggle');
    if (notificationToggle) {
        const savedSetting = localStorage.getItem('rfidNotifications');
        if (savedSetting !== null) {
            notificationToggle.checked = savedSetting === 'true';
        }
        
        notificationToggle.addEventListener('change', function() {
            localStorage.setItem('rfidNotifications', this.checked.toString());
        });
    }
}

// 🚨 FUNCIÓN: Mostrar mensaje de error
function showError(message) {
    const errorDiv = document.getElementById('errorAlert');
    if (!errorDiv) return;
    
    errorDiv.querySelector('.error-message').textContent = message;
    errorDiv.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// 📊 FUNCIÓN: Mostrar estadísticas del sistema
async function showSystemStats() {
    try {
        // Contar documentos totales
        const countSnapshot = await db.collection('rfid_tags').count().get();
        const totalCount = countSnapshot.data().count;
        
        // Obtener lectores únicos
        const readersSnapshot = await db.collection('rfid_tags')
            .select('reader_sn')
            .get();
        
        const uniqueReaders = new Set();
        readersSnapshot.forEach(doc => {
            const reader = doc.data().reader_sn;
            if (reader) uniqueReaders.add(reader);
        });
        
        // Actualizar UI
        document.getElementById('totalEvents').textContent = totalCount.toLocaleString();
        document.getElementById('uniqueReaders').textContent = uniqueReaders.size;
        document.getElementById('systemStatus').innerHTML = 
            '<span class="badge bg-success">✅ Conectado</span>';
            
    } catch (error) {
        console.error("Error obteniendo estadísticas:", error);
        document.getElementById('systemStatus').innerHTML = 
            '<span class="badge bg-danger">⚠️ Error de conexión</span>';
    }
}

// 🚀 INICIALIZACIÓN CUANDO EL DOM ESTÁ LISTO
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Dashboard RFID Neos Tech iniciando...");
    console.log("🔍 Estructura de datos esperada:");
    console.log("- epc → Tag ID");
    console.log("- reader_sn → Lector");
    console.log("- timestamp/processed_at → Fecha");
    console.log("- location → Ubicación");
    console.log("- status → Estado");
    
    // Cargar eventos iniciales
    loadRFIDEvents(false);
    
    // Configurar funcionalidades
    setupRealtimeListener();
    setupSearch();
    setupDateFilters();
    setupUserControls();
    
    // Mostrar estadísticas
    showSystemStats();
    
    // Inicializar gráficos
    setTimeout(initializeCharts, 1000);
    
    // Configurar auto-refresh cada 30 segundos (opcional)
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadRFIDEvents(false);
            showSystemStats();
        }
    }, 30000);
    
    console.log("✅ Dashboard RFID Neos Tech listo");
});

// 🌐 FUNCIÓN: Exportar datos a CSV
function exportToCSV() {
    const rows = document.querySelectorAll('#rfidTableBody tr');
    const csvContent = [];
    
    // Encabezados
    csvContent.push(['Tag ID', 'Lector', 'Ubicación', 'Fecha/Hora', 'Estado', 'Versión'].join(','));
    
    // Datos
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            const cells = row.querySelectorAll('td');
            const rowData = Array.from(cells).map(cell => {
                // Extraer texto limpio (sin HTML)
                let text = cell.textContent || cell.innerText || '';
                // Limpiar y escapar comas
                text = text.replace(/,/g, ';').trim();
                return `"${text}"`;
            });
            csvContent.push(rowData.join(','));
        }
    });
    
    // Crear y descargar archivo
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `rfid_events_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 📱 Detectar cambios en visibilidad de página
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // Recargar datos cuando la pestaña se vuelve visible
        loadRFIDEvents(false);
    }
});