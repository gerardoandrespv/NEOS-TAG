// dashboard_corrected.js - Versión 3.1 para estructura REAL de Firestore
// Condominio Neos Tech - Sistema RFID

console.log('🚀 Dashboard RFID v3.1 - Inicializando...');

// =======================================================
// CONFIGURACIÓN FIREBASE
// =======================================================
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // Ya está inicializado
}

const db = firebase.firestore();
const rfidTagsRef = db.collection('rfid_tags');

// =======================================================
// FUNCIONES DE UTILIDAD
// =======================================================

/**
 * Formatea fecha de Firestore (Timestamp o string ISO)
 */
function formatFirestoreDate(firestoreDate) {
    if (!firestoreDate) return 'N.A';
    
    try {
        // Si es objeto Timestamp de Firestore
        if (firestoreDate.toDate) {
            const date = firestoreDate.toDate();
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        
        // Si es string ISO (puede terminar en Z)
        if (typeof firestoreDate === 'string') {
            let dateStr = firestoreDate;
            if (dateStr.endsWith('Z')) {
                dateStr = dateStr.slice(0, -1) + '+00:00';
            }
            const date = new Date(dateStr);
            if (!isNaN(date)) {
                return date.toLocaleString('es-ES');
            }
        }
        
        return String(firestoreDate);
    } catch (error) {
        console.error('Error formateando fecha:', error, firestoreDate);
        return 'Error fecha';
    }
}

/**
 * Obtiene el estado de acceso basado en los datos
 */
function getAccessStatus(data) {
    const status = data.status || '';
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'active' || statusLower === 'granted' || statusLower === 'allowed') {
        return '<span class="status-badge granted">✅ Permitido</span>';
    } else if (statusLower === 'denied' || statusLower === 'blocked' || statusLower === 'rejected') {
        return '<span class="status-badge denied">❌ Denegado</span>';
    } else {
        return '<span class="status-badge unknown">⚠️ Registrado</span>';
    }
}

/**
 * Obtiene mensaje descriptivo
 */
function getMessage(data) {
    const status = data.status || '';
    const statusLower = status.toLowerCase();
    
    switch (statusLower) {
        case 'active': return 'Acceso registrado';
        case 'granted': return 'Acceso permitido';
        case 'denied': return 'Acceso denegado';
        case 'blocked': return 'Tag bloqueado';
        default: return 'Evento RFID';
    }
}

/**
 * Acorta el EPC para mostrar
 */
function shortenEPC(epc) {
    if (!epc) return 'N.A';
    if (epc.length <= 16) return epc;
    return epc.substring(0, 8) + '...' + epc.substring(epc.length - 8);
}

// =======================================================
// FUNCIONES PRINCIPALES
// =======================================================

/**
 * Carga y muestra los eventos desde Firestore
 */
async function loadEvents() {
    try {
        console.log('📡 [Firestore] Cargando eventos...');
        
        const eventTable = document.getElementById('eventTable');
        if (!eventTable) {
            console.error('❌ No se encontró tabla con id "eventTable"');
            return;
        }
        
        // Mostrar estado de carga
        eventTable.innerHTML = `
            <tr>
                <td colspan="7" class="loading-state">
                    <div class="spinner"></div>
                    <p>Cargando eventos desde Firestore...</p>
                </td>
            </tr>
        `;
        
        // Obtener documentos (últimos 100, ordenados por timestamp descendente)
        const snapshot = await rfidTagsRef
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        console.log(`✅ [Firestore] ${snapshot.size} documentos cargados`);
        
        if (snapshot.empty) {
            eventTable.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        📭 No hay eventos registrados en Firestore
                    </td>
                </tr>
            `;
            updateCounters(0, 0, 0);
            return;
        }
        
        // Procesar documentos
        let tableHTML = '';
        let grantedCount = 0;
        let deniedCount = 0;
        let lastHourCount = 0;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Usar campos REALES de Firestore
            const epc = data.epc || data.tag_id || data.id || 'N.A';
            const readerSn = data.reader_sn || data.reader_id || data.reader || 'N.A';
            const location = data.location || data.gate || 'No especificada';
            
            // Determinar timestamp (preferir processed_at, luego timestamp)
            const timestamp = data.processed_at || data.timestamp || data.received_at;
            const formattedTime = formatFirestoreDate(timestamp);
            
            // Determinar estado
            const accessStatus = getAccessStatus(data);
            const message = getMessage(data);
            
            // Contar estadísticas
            if (accessStatus.includes('✅')) grantedCount++;
            if (accessStatus.includes('❌')) deniedCount++;
            
            // Contar última hora
            if (timestamp) {
                let eventDate;
                if (timestamp.toDate) {
                    eventDate = timestamp.toDate();
                } else if (typeof timestamp === 'string') {
                    eventDate = new Date(timestamp);
                }
                
                if (eventDate && !isNaN(eventDate) && eventDate > oneHourAgo) {
                    lastHourCount++;
                }
            }
            
            // Crear fila
            tableHTML += `
                <tr>
                    <td class="epc-cell" title="${epc}">
                        <code>${shortenEPC(epc)}</code>
                    </td>
                    <td class="reader-cell">
                        <span class="reader-badge">${readerSn}</span>
                    </td>
                    <td class="time-cell">${formattedTime}</td>
                    <td class="status-cell">${accessStatus}</td>
                    <td class="message-cell">${message}</td>
                    <td class="location-cell">${location}</td>
                    <td class="client-cell">condominio-neos</td>
                </tr>
            `;
        });
        
        // Actualizar tabla
        eventTable.innerHTML = tableHTML;
        
        // Actualizar contadores
        updateCounters(snapshot.size, grantedCount, deniedCount, lastHourCount);
        
        // Configurar filtros
        setupFilters();
        
        console.log(`📊 [Estadísticas] Total: ${snapshot.size}, Permitidos: ${grantedCount}, Denegados: ${deniedCount}, Última hora: ${lastHourCount}`);
        
    } catch (error) {
        console.error('❌ [Error] Cargando eventos:', error);
        
        const eventTable = document.getElementById('eventTable');
        if (eventTable) {
            eventTable.innerHTML = `
                <tr>
                    <td colspan="7" class="error-state">
                        <div class="error-icon">⚠️</div>
                        <h4>Error cargando eventos</h4>
                        <p>${error.message}</p>
                        <small>Verifica la consola para detalles</small>
                    </td>
                </tr>
            `;
        }
    }
}

/**
 * Actualiza los contadores en la interfaz
 */
function updateCounters(total, granted, denied, lastHour = 0) {
    const elements = {
        totalCount: document.getElementById('totalCount'),
        grantedCount: document.getElementById('grantedCount'),
        deniedCount: document.getElementById('deniedCount'),
        lastHourCount: document.getElementById('lastHourCount'),
        recordCount: document.getElementById('recordCount')
    };
    
    if (elements.totalCount) elements.totalCount.textContent = total;
    if (elements.grantedCount) elements.grantedCount.textContent = granted;
    if (elements.deniedCount) elements.deniedCount.textContent = denied;
    if (elements.lastHourCount) elements.lastHourCount.textContent = lastHour;
    if (elements.recordCount) elements.recordCount.textContent = `${total} registros mostrados`;
}

/**
 * Configura los filtros y búsqueda
 */
function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterTable);
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', filterTable);
    }
}

/**
 * Filtra la tabla basado en búsqueda y filtros
 */
function filterTable() {
    const searchValue = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const filterValue = document.getElementById('filterSelect')?.value || 'all';
    
    const rows = document.querySelectorAll('#eventTable tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        if (row.cells.length === 0) return;
        
        const cells = row.cells;
        let shouldShow = true;
        
        // Aplicar filtro por estado
        if (filterValue !== 'all') {
            const statusCell = cells[3]?.innerHTML || '';
            if (filterValue === 'granted' && !statusCell.includes('granted')) {
                shouldShow = false;
            } else if (filterValue === 'denied' && !statusCell.includes('denied')) {
                shouldShow = false;
            }
        }
        
        // Aplicar búsqueda
        if (shouldShow && searchValue) {
            let rowText = '';
            for (let i = 0; i < cells.length; i++) {
                rowText += cells[i].textContent.toLowerCase() + ' ';
            }
            
            if (!rowText.includes(searchValue)) {
                shouldShow = false;
            }
        }
        
        // Mostrar/ocultar
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
    });
    
    // Actualizar contador visible
    const visibleCountElement = document.getElementById('visibleCount');
    if (visibleCountElement) {
        visibleCountElement.textContent = visibleCount;
    }
}

/**
 * Exporta datos a CSV
 */
function exportToCSV() {
    const rows = document.querySelectorAll('#eventTable tr:not([style*="none"])');
    if (rows.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "EPC,Lector,Fecha,Hora,Estado,Mensaje,Ubicación,Cliente\n";
    
    rows.forEach(row => {
        if (row.style.display === 'none' || row.cells.length === 0) return;
        
        const rowData = [];
        for (let i = 0; i < row.cells.length; i++) {
            let cellText = row.cells[i].textContent.replace(/,/g, ';').replace(/\n/g, ' ');
            if (cellText.includes(',') || cellText.includes('"')) {
                cellText = `"${cellText.replace(/"/g, '""')}"`;
            }
            rowData.push(cellText);
        }
        
        csvContent += rowData.join(',') + "\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rfid_events_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('📤 [Export] CSV exportado con ' + (rows.length - 1) + ' registros');
}

// =======================================================
// INICIALIZACIÓN
// =======================================================

/**
 * Inicializa el dashboard cuando el DOM está listo
 */
function initializeDashboard() {
    console.log('🏁 Inicializando dashboard RFID...');
    
    // Configurar botones
    const refreshBtn = document.getElementById('refreshBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Actualización manual solicitada');
            refreshBtn.innerHTML = '<span class="spinner-small"></span> Actualizando...';
            loadEvents().finally(() => {
                refreshBtn.innerHTML = '🔄 Actualizar';
            });
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
    
    // Cargar eventos iniciales
    loadEvents();
    
    // Actualizar automáticamente cada 30 segundos
    setInterval(loadEvents, 30000);
    
    // Actualizar hora actual
    function updateCurrentTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('es-ES');
        }
    }
    
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
    
    console.log('✅ Dashboard inicializado correctamente');
    console.log('📊 Colección: rfid_tags');
    console.log('🔄 Actualización automática: 30 segundos');
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    initializeDashboard();
}

// Hacer funciones disponibles globalmente para depuración
window.loadEvents = loadEvents;
window.filterTable = filterTable;
window.exportToCSV = exportToCSV;
