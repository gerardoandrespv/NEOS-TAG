// Script rápido para agregar tags usando Firebase Emulator o directo
const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'neos-tech'
});

const db = admin.firestore();

async function addTags() {
  console.log('═══════════════════════════════════════════');
  console.log('🚀 Agregando tags de prueba a Firestore...');
  console.log('═══════════════════════════════════════════\n');
  
  const clientId = 'condominio-neos';
  const clientRef = db.collection('clients').doc(clientId);
  
  try {
    // Verificar cliente
    const clientDoc = await clientRef.get();
    if (!clientDoc.exists) {
      await clientRef.set({
        name: 'Condominio Neos',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });
      console.log('✅ Cliente creado\n');
    } else {
      console.log('✓ Cliente ya existe\n');
    }
    
    console.log('📋 Agregando tags...\n');
    
    const tags = [
      {
        tag_id: 'E28069150000502009073A7F',
        status: 'whitelist',
        name: 'Tag de Prueba 1',
        owner: 'Administrador',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        tag_id: 'E28069150000402009073E7F',
        status: 'whitelist',
        name: 'Tag de Prueba 2',
        owner: 'Administrador',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        tag_id: 'E280691500004020090BBBBB',
        status: 'blacklist',
        name: 'Tag Bloqueado',
        owner: 'Test',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }
    ];
    
    for (const tag of tags) {
      const docRef = await clientRef.collection('tags').add(tag);
      console.log(`✅ ${tag.name} agregado (${tag.status}) - ID: ${docRef.id}`);
    }
    
    console.log('\n✅ Tags configurados correctamente!');
    console.log('\n🔍 Verifica en: https://console.firebase.google.com/project/neos-tech/firestore');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

addTags();
