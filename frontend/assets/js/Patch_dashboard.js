// PARCHES PARA EL DASHBOARD - Copiar en la Consola (F12)

console.log("=== APLICANDO PARCHES AL DASHBOARD ===");

// 1. Parche para extraer client_id correctamente
function patchExtractTagInfo() {
    // Sobreescribir la función que extrae datos
    const originalExtract = window.extractTagInfo || function(doc) {
        const data = doc.data();
        return {
            id: data.id || 'N/A',
            client: 'N.A',
            reader: data.readsn || 'N/A',
            timestamp: data.timestamp || doc.id
        };
    };
    
    // Nueva función mejorada
    window.extractTagInfo = function(doc) {
        const data = doc.data();
        console.log("📊 Datos crudos recibidos:", data);
        
        // Extraer ID
        const tagId = data.id || data.epc || data.tag_id || 'N/A';
        
        // Extraer CLIENTE - LÓGICA MEJORADA
        let client = 'N.A';
        
        // Prioridad 1: client_id directo
        if (data.client_id) {
            client = data.client_id;
            console.log(`✅ Cliente de client_id: ${client}`);
        }
        // Prioridad 2: gateway_version
        else if (data.gateway_version) {
            if (data.gateway_version.includes('condominio')) {
                client = 'condominio-neos';
            } else if (data.gateway_version.includes('2.0')) {
                client = 'condominio-neos';
            } else {
                client = data.gateway_version;
            }
            console.log(`✅ Cliente de gateway_version: ${client}`);
        }
        // Prioridad 3: campo version
        else if (data.version && data.version.includes('multi-tenant')) {
            client = 'condominio-neos';
            console.log(`✅ Cliente de version: ${client}`);
        }
        // Prioridad 4: campo source
        else if (data.source === 'gateway') {
            client = 'condominio-neos';
            console.log(`✅ Cliente de source: ${client}`);
        }
        
        // Extraer lector
        const reader = data.readsn || data.reader_sn || data.reader_id || 'N/A';
        
        // Timestamp
        let timestamp = 'N/A';
        if (data.timestamp) {
            if (data.timestamp.toDate) {
                timestamp = data.timestamp.toDate().toLocaleString();
            } else if (data.timestamp instanceof Date) {
                timestamp = data.timestamp.toLocaleString();
            } else {
                timestamp = data.timestamp;
            }
        }
        
        const result = {
            id: tagId,
            client: client,
            reader: reader,
            timestamp: timestamp,
            rawData: data
        };
        
        console.log("📋 Resultado procesado:", result);
        return result;
    };
    
    console.log("✅ Función extractTagInfo parcheada");
}

// 2. Aplicar parches
try {
    patchExtractTagInfo();
    console.log("✅ Todos los parches aplicados");
    console.log("🔄 Recargando datos...");
    
    // Intentar forzar recarga de datos
    if (typeof unsubscribe === 'function') {
        unsubscribe();
        console.log("🔌 Suscripción anterior desconectada");
    }
    
    // Recargar página después de 2 segundos
    setTimeout(() => {
        console.log("🔄 Recargando dashboard...");
        location.reload(true);
    }, 2000);
    
} catch (error) {
    console.error("❌ Error aplicando parches:", error);
}
