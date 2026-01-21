// Variables globales
let allTags = [];
let currentPage = 1;
const pageSize = 10;
let uniqueReaders = new Set();
let activityData = {};
let realtimeListener = null;

// Inicializar gráfico de Google Charts
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initDashboard);

// Inicializar el dashboard
function initDashboard() {
    // Configurar Firebase Firestore
    setupFirebase();
    
    // Configurar listeners de eventos
    setupEventListeners();
    
    // Inicializar reloj en tiempo real
    updateClock();
    setInterval(updateClock, 1000);
    
    // Actualizar la hora de última actualización
    updateLastUpdateTime();
}

// Configurar Firebase Firestore
function setupFirebase() {
    console.log("Conectando a Firestore...");
    
    // Escuchar nuevos tags en tiempo real
    realtimeListener = db.collection("rfid_tags")
        .orderBy("received_at", "desc")
        .limit(50)
        .onSnapshot((snapshot) => {
            const changes = snapshot.docChanges();
            changes.forEach(change => {
                if (change.type === "added") {
                    const tag = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    // Agregar al inicio del array
                    allTags.unshift(tag);
                    
                    // Actualizar contadores
                    updateCounters();
                    
                    // Actualizar lista de lectores únicos
                    if (tag.reader_sn) {
                        uniqueReaders.add(tag.reader_sn);
                        updateReaderFilter();
                        updateReadersList();
                    }
                    
                    // Actualizar último tag
                    updateLatestTag(tag);
                    
                    // Actualizar gráfico de actividad
                    updateActivityChart(tag);
                    
                    // Actualizar tabla con animación
                    addTagToTable(tag);
                    
                    // Mostrar notificación
                    showNotification(tag);
                }
            });
            
            // Mantener solo los últimos 1000 tags en memoria
            if (allTags.length > 1000) {
                allTags = allTags.slice(0, 1000);
            }
            
            updateTable();
        }, (error) => {
            console.error("Error en conexión Firestore:", error);
            document.querySelector('.status-indicator').className = 'status-indicator disconnected';
            document.querySelector('.status-indicator span').textContent = 'Desconectado';
        });
    
    // Cargar datos iniciales
    loadInitialData();
}

// Cargar datos iniciales
async function loadInitialData() {
    try {
        const snapshot = await db.collection("rfid_tags")
            .orderBy("received_at", "desc")
            .limit(100)
            .get();
        
        allTags = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        updateCounters();
        updateTable();
        updateReadersList();
        
        // Inicializar gráfico de actividad
        initActivityChart();
        
    } catch (error) {
        console.error("Error cargando datos iniciales:", error);
    }
}

// Actualizar contadores
function updateCounters() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const todayCount = allTags.filter(tag => 
        tag.timestamp && tag.timestamp.startsWith(today)
    ).length;
    
    const hourCount = allTags.filter(tag => {
        if (!tag.received_at) return false;
        const tagTime = new Date(tag.received_at);
        return tagTime > oneHourAgo;
    }).length;
    
    const uniqueReadersCount = new Set(allTags.map(tag => tag.reader_sn)).size;
    
    document.getElementById("total-tags").innerText = snapshot.size;
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('hour-count').textContent = hourCount;
    document.getElementById('readers-count').textContent = uniqueReadersCount;
    document.getElementById('realtime-count').textContent = allTags.length;
}

// Actualizar tabla
function updateTable() {
    const tbody = document.getElementById('tags-body');
    const readerFilter = document.getElementById('reader-filter').value;
    
    // Filtrar tags por lector
    let filteredTags = allTags;
    if (readerFilter !== 'all') {
        filteredTags = allTags.filter(tag => tag.reader_sn === readerFilter);
    }
    
    // Calcular paginación
    const totalPages = Math.ceil(filteredTags.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageTags = filteredTags.slice(startIndex, endIndex);
    
    // Limpiar tabla
    tbody.innerHTML = '';
    
    if (pageTags.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">
                    <i class="fas fa-search"></i>
                    <p>No se encontraron tags RFID</p>
                </td>
            </tr>
        `;
    } else {
        pageTags.forEach(tag => {
            const row = createTableRow(tag);
            tbody.appendChild(row);
        });
    }
    
    // Actualizar controles de paginación
    updatePaginationControls(totalPages);
}

// Crear fila de tabla
function createTableRow(tag) {
    const row = document.createElement('tr');
    
    const timeAgo = getTimeAgo(tag.received_at || tag.timestamp);
    const formattedTime = formatDateTime(tag.received_at || tag.timestamp);
    
    row.innerHTML = `
        <td>
            <div class="epc-cell">
                <i class="fas fa-microchip"></i>
                <span class="epc-value">${tag.epc || 'N/A'}</span>
            </div>
        </td>
        <td>
            <span class="reader-badge">
                <i class="fas fa-wifi"></i>
                ${tag.reader_sn || 'Desconocido'}
            </span>
        </td>
        <td>
            <div class="timestamp-cell">
                <div class="date">${formattedTime.date}</div>
                <div class="time">${formattedTime.time}</div>
            </div>
        </td>
        <td>
            <span class="time-ago">${timeAgo}</span>
        </td>
        <td>
            <button class="btn-view" data-id="${tag.id}">
                <i class="fas fa-eye"></i> Ver
            </button>
        </td>
    `;
    
    // Agregar evento al botón de ver
    row.querySelector('.btn-view').addEventListener('click', () => {
        showTagDetails(tag);
    });
    
    return row;
}

// Agregar tag a la tabla con animación
function addTagToTable(tag) {
    const tbody = document.getElementById('tags-body');
    const readerFilter = document.getElementById('reader-filter').value;
    
    // Verificar si pasa el filtro actual
    if (readerFilter !== 'all' && tag.reader_sn !== readerFilter) {
        return;
    }
    
    // Si estamos en la primera página, agregar al inicio
    if (currentPage === 1) {
        const firstRow = tbody.querySelector('tr:first-child');
        if (firstRow && !firstRow.classList.contains('empty-row')) {
            const newRow = createTableRow(tag);
            newRow.classList.add('new-tag');
            tbody.insertBefore(newRow, firstRow);
            
            // Si excedemos el tamaño de página, remover el último
            if (tbody.children.length > pageSize) {
                tbody.removeChild(tbody.lastChild);
            }
        } else {
            // Si no hay filas, actualizar toda la tabla
            updateTable();
        }
    }
}

// Actualizar controles de paginación
function updatePaginationControls(totalPages) {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
}

// Actualizar último tag detectado
function updateLatestTag(tag) {
    document.getElementById('latest-epc').textContent = tag.epc || 'N/A';
    document.getElementById('latest-reader').textContent = tag.reader_sn || 'Desconocido';
    document.getElementById('latest-docid').textContent = tag.id || 'N/A';
    document.getElementById('latest-timestamp').textContent = formatDateTime(tag.timestamp).full;
    document.getElementById('latest-time').textContent = getTimeAgo(tag.received_at);
}

// Actualizar lista de lectores
function updateReadersList() {
    const readersList = document.getElementById('readers-list');
    const readerCounts = {};
    
    // Contar tags por lector
    allTags.forEach(tag => {
        if (tag.reader_sn) {
            readerCounts[tag.reader_sn] = (readerCounts[tag.reader_sn] || 0) + 1;
        }
    });
    
    // Actualizar lista
    readersList.innerHTML = '';
    Object.entries(readerCounts).forEach(([reader, count]) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <i class="fas fa-circle online"></i>
            <span>${reader}</span>
            <span class="reader-count">${count} tags</span>
        `;
        readersList.appendChild(li);
    });
}

// Actualizar filtro de lectores
function updateReaderFilter() {
    const select = document.getElementById('reader-filter');
    const currentValue = select.value;
    
    // Guardar opciones existentes
    const existingOptions = Array.from(select.options).map(opt => opt.value);
    
    // Agregar nuevos lectores
    uniqueReaders.forEach(reader => {
        if (!existingOptions.includes(reader)) {
            const option = document.createElement('option');
            option.value = reader;
            option.textContent = reader;
            select.appendChild(option);
        }
    });
}

// Inicializar gráfico de actividad
function initActivityChart() {
    // Inicializar datos de las últimas 24 horas
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourKey = hour.getHours().toString().padStart(2, '0') + ':00';
        activityData[hourKey] = 0;
    }
    
    // Contar tags por hora
    allTags.forEach(tag => {
        if (tag.received_at) {
            const tagTime = new Date(tag.received_at);
            const hourKey = tagTime.getHours().toString().padStart(2, '0') + ':00';
            if (activityData[hourKey] !== undefined) {
                activityData[hourKey]++;
            }
        }
    });
    
    drawActivityChart();
}

// Actualizar gráfico de actividad con nuevo tag
function updateActivityChart(tag) {
    if (tag.received_at) {
        const tagTime = new Date(tag.received_at);
        const hourKey = tagTime.getHours().toString().padStart(2, '0') + ':00';
        if (activityData[hourKey] !== undefined) {
            activityData[hourKey]++;
            drawActivityChart();
        }
    }
}

// Dibujar gráfico de actividad
function drawActivityChart() {
    const data = new google.visualization.DataTable();
    data.addColumn('string', 'Hora');
    data.addColumn('number', 'Tags');
    
    const rows = Object.entries(activityData).map(([hour, count]) => [hour, count]);
    data.addRows(rows);
    
    const options = {
        height: 200,
        backgroundColor: 'transparent',
        colors: ['#4361ee'],
        hAxis: {
            textStyle: { color: '#666' }
        },
        vAxis: {
            textStyle: { color: '#666' },
            minValue: 0
        },
        legend: { position: 'none' },
        chartArea: { width: '85%', height: '70%' }
    };
    
    const chart = new google.visualization.ColumnChart(document.getElementById('activity-chart'));
    chart.draw(data, options);
}

// Mostrar notificación de nuevo tag
function showNotification(tag) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-microchip"></i>
        </div>
        <div class="notification-content">
            <strong>Nuevo Tag Detectado</strong>
            <p>EPC: ${tag.epc}</p>
            <small>Lector: ${tag.reader_sn}</small>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Estilos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        min-width: 300px;
        border-left: 4px solid #4361ee;
    `;
    
    // Agregar estilos para la animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Agregar al DOM
    document.body.appendChild(notification);
    
    // Configurar botón de cerrar
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Mostrar detalles del tag en modal
function showTagDetails(tag) {
    const modal = document.getElementById('details-modal');
    const modalBody = document.getElementById('modal-body');
    
    const formattedTime = formatDateTime(tag.timestamp);
    const receivedTime = formatDateTime(tag.received_at);
    
    modalBody.innerHTML = `
        <div class="tag-detail-view">
            <div class="detail-section">
                <h3><i class="fas fa-microchip"></i> Información del Tag</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">EPC:</span>
                        <span class="detail-value epc-large">${tag.epc || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Lector:</span>
                        <span class="detail-value">${tag.reader_sn || 'Desconocido'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">ID Documento:</span>
                        <span class="detail-value">${tag.id}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ubicación:</span>
                        <span class="detail-value">${tag.location || 'No especificada'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Estado:</span>
                        <span class="detail-value status-active">
                            <i class="fas fa-circle"></i> ${tag.status || 'active'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-clock"></i> Tiempos</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Timestamp:</span>
                        <span class="detail-value">${formattedTime.full}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Recibido en Cloud:</span>
                        <span class="detail-value">${receivedTime.full}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Tiempo transcurrido:</span>
                        <span class="detail-value">${getTimeAgo(tag.received_at)}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-database"></i> Datos Raw</h3>
                <pre class="json-view">${JSON.stringify(tag, null, 2)}</pre>
            </div>
        </div>
    `;
    
    // Mostrar modal
    modal.style.display = 'flex';
    
    // Configurar botón de cerrar
    document.querySelector('.close-modal').onclick = () => {
        modal.style.display = 'none';
    };
    
    // Cerrar al hacer clic fuera del modal
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Botón de refrescar
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadInitialData();
        showToast('Datos actualizados');
    });
    
    // Filtro de lectores
    document.getElementById('reader-filter').addEventListener('change', () => {
        currentPage = 1;
        updateTable();
    });
    
    // Paginación
    document.getElementById('prev-btn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
        }
    });
    
    document.getElementById('next-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(allTags.length / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
        }
    });
    
    // Botones de detalles
    document.getElementById('view-details').addEventListener('click', () => {
        if (allTags.length > 0) {
            showTagDetails(allTags[0]);
        }
    });
    
    // Botón de copiar EPC
    document.getElementById('copy-epc').addEventListener('click', () => {
        if (allTags.length > 0) {
            navigator.clipboard.writeText(allTags[0].epc);
            showToast('EPC copiado al portapapeles');
        }
    });
    
    // Cerrar modal con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('details-modal').style.display = 'none';
        }
    });
}

// Funciones auxiliares
function formatDateTime(isoString) {
    if (!isoString) return { date: 'N/A', time: 'N/A', full: 'N/A' };
    
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const dateStr = isToday ? 'Hoy' : date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    const timeStr = date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    return {
        date: dateStr,
        time: timeStr,
        full: `${dateStr} ${timeStr}`
    };
}

function getTimeAgo(isoString) {
    if (!isoString) return 'N/A';
    
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'justo ahora';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHour < 24) return `hace ${diffHour} h`;
    if (diffDay < 7) return `hace ${diffDay} d`;
    return `hace ${Math.floor(diffDay / 7)} sem`;
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('current-time').textContent = timeStr;
}

function updateLastUpdateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('last-update').textContent = `${now.toLocaleDateString('es-ES')} ${timeStr}`;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 1000;
        animation: fadeInOut 3s ease;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
            15% { opacity: 1; transform: translateX(-50%) translateY(0); }
            85% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
// En app.js - Extraer datos compatible
function extractTagInfo(doc) {
    const data = doc.data();
    
    // Extraer ID
    const tagId = data.id || data.epc || data.tag_id || 'N/A';
    
    // Extraer Cliente (con lógica mejorada)
    let client = data.client_id || 'N.A';
    
    // Si es 'N.A' pero tenemos gateway_version, usarlo
    if (client === 'N.A' && data.gateway_version) {
        if (data.gateway_version.includes('condominio')) {
            client = 'condominio-neos';
        } else {
            client = data.gateway_version;
        }
    }
    
    // Extraer Lector
    const reader = data.readsn || data.reader_sn || data.reader_id || 'N/A';
    
    return {
        id: tagId,
        client: client,
        reader: reader,
        timestamp: data.timestamp || data.received_at || doc.id
    };

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initDashboard);