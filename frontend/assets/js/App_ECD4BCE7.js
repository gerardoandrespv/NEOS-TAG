// dashboard_fixed.js - Versión corregida para Firestore
// Reemplaza el contenido de tu archivo dashboard.js actual

// Configuración Firebase
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
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Referencia a la colección
const rfidTagsRef = db.collection('rfid_tags');

// Elementos del DOM
const eventTable = document.getElementById('eventTable');
const refreshBtn = document.getElementById('refreshBtn');
const filterSelect = document.getElementById('filterSelect');
const searchInput = document.getElementById('searchInput');
const exportBtn = document.getElementById('exportBtn');

// Formatear fecha desde timestamp de Firestore
function formatFirestoreTimestamp(timestamp) {
    if (!timestamp) return 'N.A';
    
    try {
        // Si es un objeto de timestamp de Firestore
        if (timestamp.toDate) {
            const date = timestamp.toDate();
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }
        // Si ya es una cadena
        else if (typeof timestamp === 'string') {
            return new Date(timestamp).toLocaleString('es-ES');
        }
        // Si es un objeto Date
        else if (timestamp instanceof Date) {
            return timestamp.toLocaleString('es-ES');
        }
    } catch (error) {
        console.error('Error formateando fecha:', error, timestamp);
    }
    
    return 'N.A';
}

// Obtener valor de campo con manejo seguro
function getFieldValue(doc, fieldName, defaultValue = 'N.A') {
    const data = doc.data();
    
    // Intentar diferentes nombres de campo para compatibilidad
    const fieldVariations = {
        'tag_id': ['tag_id', 'id', 'epc', 'tagId'],
        'reader_id': ['reader_id', 'readsn', 'readerId', 'reader'],
        'timestamp': ['timestamp', 'time', 'createdAt', 'fecha'],
        'access_granted': ['access_granted', 'access', 'granted', 'permitted'],
        'message': ['message', 'msg', 'status_message'],
        'location': ['location', 'loc', 'place'],
        'client_id': ['client_id', 'client', 'clientId']
    };
    
    // Si tenemos variaciones para este campo
    if (fieldVariations[fieldName]) {
        for (const variation of fieldVariations[fieldName]) {
            if (data[variation] !== undefined) {
                return data[variation];
            }
        }
    }
    
    // Campo directo
    if (data[fieldName] !== undefined) {
        return data[fieldName];
    }
    
    return defaultValue;
}

// Crear fila de tabla
function createTableRow(doc) {
    const data = doc.data();
    const row = document.createElement('tr');
    
    // Obtener valores con manejo seguro
    const tagId = getFieldValue(doc, 'tag_id');
    const readerId = getFieldValue(doc, 'reader_id');
    const timestamp = getFieldValue(doc, 'timestamp');
    const accessGranted = getFieldValue(doc, 'access_granted');
    const message = getFieldValue(doc, 'message');
    const location = getFieldValue(doc, 'location', 'No especificada');
    const clientId = getFieldValue(doc, 'client_id', 'condominio-neos');
    
    // Formatear valores
    const formattedTime = formatFirestoreTimestamp(timestamp);
    const accessStatus = accessGranted === true ? '✅ Permitido' : 
                        accessGranted === false ? '❌ Denegado' : 
                        typeof accessGranted === 'string' ? accessGranted : 'N.A';
    
    // Crear celdas
    row.innerHTML = `
        <td>${tagId}</td>
        <td>${readerId}</td>
        <td>${formattedTime}</td>
        <td>${accessStatus}</td>
        <td>${message}</td>
        <td>${location}</td>
        <td>${clientId}</td>
    `;
    
    return row;
}

// Cargar eventos desde Firestore
async function loadEvents() {
    try {
        console.log('📡 Cargando eventos desde Firestore...');
        
        // Limpiar tabla
        eventTable.innerHTML = '';
        
        // Obtener documentos ordenados por timestamp descendente
        const snapshot = await rfidTagsRef
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        console.log(`✅ ${snapshot.size} eventos cargados`);
        
        if (snapshot.empty) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" class="text-center">No hay eventos registrados</td>`;
            eventTable.appendChild(row);
            return;
        }
        
        // Añadir cada documento a la tabla
        snapshot.forEach(doc => {
            console.log('Documento:', doc.id, doc.data());
            const row = createTableRow(doc);
            eventTable.appendChild(row);
        });
        
        // Actualizar contador
        document.getElementById('eventCount').textContent = snapshot.size;
        
    } catch (error) {
        console.error('❌ Error cargando eventos:', error);
        eventTable.innerHTML = `
            <tr>
                <td colspan="7" class="error">
                    Error cargando eventos: ${error.message}
                    <br><small>Verifica la consola para más detalles</small>
                </td>
            </tr>
        `;
    }
}

// Filtrar eventos
function filterEvents() {
    const filterValue = filterSelect.value;
    const searchValue = searchInput.value.toLowerCase();
    const rows = eventTable.getElementsByTagName('tr');
    
    let visibleCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');
        
        if (cells.length === 0) continue;
        
        let shouldShow = true;
        
        // Aplicar filtro por tipo
        if (filterValue !== 'all') {
            const accessCell = cells[3].textContent;
            if (filterValue === 'granted' && !accessCell.includes('✅')) {
                shouldShow = false;
            } else if (filterValue === 'denied' && !accessCell.includes('❌')) {
                shouldShow = false;
            }
        }
        
        // Aplicar búsqueda
        if (shouldShow && searchValue) {
            let rowText = '';
            for (let j = 0; j < cells.length; j++) {
                rowText += cells[j].textContent.toLowerCase() + ' ';
            }
            
            if (!rowText.includes(searchValue)) {
                shouldShow = false;
            }
        }
        
        // Mostrar/ocultar fila
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
    }
    
    document.getElementById('visibleCount').textContent = visibleCount;
}

// Exportar a CSV
function exportToCSV() {
    const rows = eventTable.getElementsByTagName('tr');
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Encabezados
    csvContent += "Tag ID,Lector,Fecha,Hora,Acceso,Mensaje,Ubicación,Cliente\n";
    
    // Datos
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.style.display === 'none') continue;
        
        const cells = row.getElementsByTagName('td');
        if (cells.length === 0) continue;
        
        const rowData = [];
        for (let j = 0; j < cells.length; j++) {
            let cellText = cells[j].textContent;
            // Escapar comas para CSV
            if (cellText.includes(',') || cellText.includes('"')) {
                cellText = `"${cellText.replace(/"/g, '""')}"`;
            }
            rowData.push(cellText);
        }
        
        csvContent += rowData.join(',') + "\n";
    }
    
    // Descargar
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rfid_events_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event Listeners
refreshBtn.addEventListener('click', loadEvents);
filterSelect.addEventListener('change', filterEvents);
searchInput.addEventListener('input', filterEvents);
exportBtn.addEventListener('click', exportToCSV);

// Cargar eventos al iniciar y cada 30 segundos
document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    setInterval(loadEvents, 30000); // Actualizar cada 30 segundos
});

// Mostrar información de debug en consola
console.log('🔥 Dashboard RFID - Neos Tech');
console.log('📁 Colección: rfid_tags');
console.log('🔄 Actualización automática cada 30 segundos');