// clean_test_data.js - Ejecutar con: node clean_test_data.js
const admin = require('firebase-admin');

// Inicializar Firebase Admin (necesitas el archivo de credenciales)
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'neos-tech'
});

const db = admin.firestore();

async function cleanTestData() {
  console.log('🔍 Buscando datos de prueba en Firestore...');
  
  const snapshot = await db.collection('rfid_tags')
    .where('id', '>=', 'TEST_')
    .where('id', '<=', 'TEST_' + '\uf8ff')
    .get();
  
  console.log(`📊 Encontrados ${snapshot.size} documentos de prueba`);
  
  // Opción 1: Solo mostrar (sin eliminar)
  snapshot.forEach(doc => {
    console.log(`   • ${doc.id} - ${doc.data().id} - ${doc.data().timestamp}`);
  });
  
  // Opción 2: Eliminar (DESCOMENTAR PARA EJECUTAR)
  /*
  const batch = db.batch();
  snapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`✅ Eliminados ${snapshot.size} documentos de prueba`);
  */
  
  // También buscar por source o client_id
  const testSources = await db.collection('rfid_tags')
    .where('source', '==', 'test')
    .get();
  
  console.log(`📊 Encontrados ${testSources.size} documentos con source='test'`);
  
  process.exit(0);
}

cleanTestData().catch(console.error);
