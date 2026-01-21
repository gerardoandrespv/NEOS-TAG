// clean_all_firestore.js
const admin = require('firebase-admin');

// Configuración - Asegúrate de tener el archivo de credenciales
// O usa Application Default Credentials si estás en GCP
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'neos-tech'
});

const db = admin.firestore();

async function deleteAllDocuments() {
  console.log('🚨 INICIANDO LIMPIEZA TOTAL DE FIRESTORE 🚨');
  console.log('Proyecto: neos-tech');
  console.log('Colección: rfid_tags');
  console.log('==========================================');
  
  // Obtener todos los documentos
  const snapshot = await db.collection('rfid_tags').get();
  console.log(`📊 Documentos encontrados: ${snapshot.size}`);
  
  if (snapshot.size === 0) {
    console.log('✅ La colección ya está vacía');
    return;
  }
  
  // Preguntar confirmación (en terminal)
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise(resolve => readline.question(query, resolve));
  
  const answer = await question(`¿Estás SEGURO de eliminar ${snapshot.size} documentos? (escribe "SI" para confirmar): `);
  
  if (answer.toUpperCase() !== 'SI') {
    console.log('❌ Operación cancelada');
    readline.close();
    return;
  }
  
  readline.close();
  
  // Eliminar en lotes (Firestore limita a 500 por batch)
  const batchSize = 400; // Por seguridad
  let deletedCount = 0;
  let batch = db.batch();
  
  snapshot.docs.forEach((doc, index) => {
    batch.delete(doc.ref);
    deletedCount++;
    
    if ((index + 1) % batchSize === 0) {
      console.log(`  Procesando lote ${Math.floor((index + 1) / batchSize)}...`);
      // Aquí normalmente haríamos batch.commit() y crearíamos un nuevo batch
      // Pero para simplificar, vamos a usar delete() individual
    }
  });
  
  // Alternativa: eliminar uno por uno (más lento pero seguro)
  console.log('⏳ Eliminando documentos...');
  for (const doc of snapshot.docs) {
    await doc.ref.delete();
  }
  
  console.log(`✅ ELIMINADOS ${deletedCount} DOCUMENTOS`);
  console.log('🎉 Firestore completamente limpio');
  
  process.exit(0);
}

deleteAllDocuments().catch(console.error);
