// EJECUTAR EN CONSOLA (F12) DE: https://neos-tech.web.app

console.clear();
console.log("=== DIAGNÓSTICO DASHBOARD PRINCIPAL ===");

// 1. Verificar Firebase
console.log("1. Firebase SDK:", typeof firebase);
console.log("   Versión:", firebase.SDK_VERSION || "No detectada");

// 2. Verificar inicialización
console.log("2. Apps Firebase:", firebase.apps.length);
if (firebase.apps.length > 0) {
    console.log("   Config:", firebase.apps[0].options.projectId);
} else {
    console.error("   ❌ Firebase NO inicializado");
}

// 3. Verificar elementos HTML críticos
const criticalElements = [
    'total-tags',
    'last-hour', 
    'status-connection',
    'tags-table',
    'tags-container'
];

console.log("3. Elementos HTML:");
criticalElements.forEach(id => {
    const el = document.getElementById(id);
    console.log(`   ${id}:`, el ? "✅ EXISTE" : "❌ NO EXISTE");
});

// 4. Probar conexión Firestore directa
console.log("4. Probando Firestore...");
try {
    const db = firebase.firestore();
    
    // Test simple
    db.collection("rfid_tags").limit(1).get()
        .then(snap => {
            console.log(`   ✅ Firestore funciona: ${snap.size} documentos`);
            
            // Mostrar primer documento para ver estructura
            snap.forEach(doc => {
                console.log("   Estructura datos:", Object.keys(doc.data()));
                console.log("   Datos ejemplo:", {
                    id: doc.data().id || "No hay campo 'id'",
                    reader: doc.data().readsn || doc.data().reader_sn || "No hay reader",
                    client: doc.data().client_id || "No hay client_id",
                    timestamp: doc.data().timestamp || "No hay timestamp"
                });
            });
            
            // Forzar actualización UI
            updateDashboardUI(snap.size);
        })
        .catch(error => {
            console.error(`   ❌ Error Firestore: ${error.code} - ${error.message}`);
            showErrorInUI(error);
        });
} catch (error) {
    console.error("   ❌ Error accediendo Firestore:", error.message);
}

// 5. Buscar funciones del dashboard
console.log("5. Funciones del dashboard:");
const functions = ['updateDashboard', 'loadData', 'renderTable'];
functions.forEach(fn => {
    console.log(`   ${fn}:`, typeof window[fn] !== 'undefined' ? "✅ EXISTE" : "❌ NO EXISTE");
});

// 6. Función para forzar actualización UI
function updateDashboardUI(count) {
    console.log("   Forzando actualización UI...");
    
    // Actualizar elementos si existen
    const totalEl = document.getElementById('total-tags');
    const statusEl = document.getElementById('status-connection');
    
    if (totalEl) {
        totalEl.textContent = count;
        console.log(`   ✅ Actualizado total-tags: ${count}`);
    }
    
    if (statusEl) {
        statusEl.textContent = "Conectado ✓";
        statusEl.style.color = "green";
        console.log("   ✅ Actualizado status-connection");
    }
}

// 7. Función para mostrar errores en UI
function showErrorInUI(error) {
    const statusEl = document.getElementById('status-connection');
    if (statusEl) {
        statusEl.textContent = `Error: ${error.code}`;
        statusEl.style.color = "red";
        statusEl.title = error.message;
    }
}

console.log("=== DIAGNÓSTICO COMPLETADO ===");
console.log("Si hay errores, compartir captura de esta consola.");
