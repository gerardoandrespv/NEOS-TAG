// Script para agregar tags de prueba a Firestore
// Ejecutar: node scripts/setup-tags-firestore.js

const admin = require('firebase-admin');

// Inicializar con credenciales por defecto de la aplicación
// Esto usa las credenciales configuradas con 'firebase login'
admin.initializeApp({
  projectId: 'neos-tech'
});

const db = admin.firestore();

async function setupTags() {
  try {
    console.log('🚀 Configurando tags en Firestore...\n');
    
    const clientId = 'condominio-neos';
    const clientRef = db.collection('clients').doc(clientId);
    
    // Verificar/crear cliente
    const clientDoc = await clientRef.get();
    if (!clientDoc.exists) {
      console.log('📝 Creando cliente...');
      await clientRef.set({
        name: 'Condominio Neos',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        status: 'active',
        auto_created: false
      });
      console.log('✅ Cliente creado\n');
    } else {
      console.log('✓ Cliente ya existe\n');
    }
    
    // Tags de prueba - TAGS REALES DETECTADOS
    const tags = [
      {
        tag_id: 'E28069150000502009073A7F',  // TAG REAL DETECTADO
        status: 'whitelist',
        name: 'Tag de Prueba 1',
        description: 'Tag detectado en las pruebas',
        owner: 'Administrador',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        tag_id: 'E28069150000402009073E7F',  // TAG REAL DETECTADO
        status: 'whitelist',
        name: 'Tag de Prueba 2',
        description: 'Tag del residente',
        owner: 'Juan Pérez',
        apartment: 'Apto 101',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        tag_id: 'E280691500004020090BBBBB',
        status: 'blacklist',
        name: 'Tag Bloqueado',
        description: 'Tag en lista negra - NO debe abrir',
        owner: 'Bloqueado por seguridad',
        blocked_reason: 'Actividad sospechosa',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        tag_id: 'E280691500004020090CCCCC',
        status: 'whitelist',
        name: 'Residente María García',
        description: 'Tag válido',
        owner: 'María García',
        apartment: 'Apto 205',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }
    ];
    
    console.log('📋 Agregando tags...\n');
    
    for (const tag of tags) {
      // Verificar si ya existe
      const existingQuery = await clientRef.collection('tags')
        .where('tag_id', '==', tag.tag_id)
        .limit(1)
        .get();
      
      if (!existingQuery.empty) {
        console.log(`⚠️  Tag ${tag.tag_id} ya existe - actualizando...`);
        await existingQuery.docs[0].ref.update({
          ...tag,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        console.log(`➕ Agregando tag ${tag.tag_id}...`);
        await clientRef.collection('tags').add(tag);
      }
      
      const statusIcon = tag.status === 'whitelist' ? '✅' : '❌';
      console.log(`   ${statusIcon} ${tag.name} (${tag.status})`);
    }
    
    console.log('\n✅ Tags configurados exitosamente!');
    console.log('\n📊 Resumen:');
    
    const allTags = await clientRef.collection('tags').get();
    const whitelistCount = allTags.docs.filter(doc => doc.data().status === 'whitelist').length;
    const blacklistCount = allTags.docs.filter(doc => doc.data().status === 'blacklist').length;
    
    console.log(`   - Total tags: ${allTags.size}`);
    console.log(`   - Whitelist: ${whitelistCount}`);
    console.log(`   - Blacklist: ${blacklistCount}`);
    console.log('\n🔍 Para ver los tags:');
    console.log(`   Firestore Console → clients → ${clientId} → tags`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

setupTags();
