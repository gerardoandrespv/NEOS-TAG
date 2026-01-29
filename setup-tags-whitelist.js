// Script para agregar tags de prueba con whitelist/blacklist
// Ejecutar desde la consola del navegador en http://localhost:5000 (Dashboard)
// 1. Abre el dashboard: http://localhost:5000
// 2. Abre DevTools (F12)
// 3. Pega este código en la consola
// 4. Ejecuta: agregarTagsPrueba()

async function agregarTagsPrueba() {
    console.log('🚀 Agregando tags de prueba con whitelist/blacklist...\n');
    
    const clientId = 'condominio-neos';
    
    // Referencia al cliente
    const clientRef = db.collection('clients').doc(clientId);
    
    // Verificar/crear cliente
    const clientDoc = await clientRef.get();
    if (!clientDoc.exists) {
        console.log('📝 Creando cliente...');
        await clientRef.set({
            name: 'Condominio Neos',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            auto_created: false
        });
        console.log('✅ Cliente creado\n');
    } else {
        console.log('✓ Cliente ya existe\n');
    }
    
    // Tags de prueba
    const tags = [
        {
            tag_id: 'E28069150000402009073E7F',
            status: 'whitelist',
            name: 'Tag de Prueba 1',
            description: 'Tag detectado en las pruebas - DEBE ABRIR',
            owner: 'Administrador',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            tag_id: 'E280691500004020090AAAAA',
            status: 'whitelist',
            name: 'Residente Juan Pérez',
            description: 'Tag del residente - DEBE ABRIR',
            owner: 'Juan Pérez',
            apartment: 'Apto 101',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            tag_id: 'E280691500004020090BBBBB',
            status: 'blacklist',
            name: 'Tag Bloqueado',
            description: 'Tag en lista negra - NO DEBE ABRIR',
            owner: 'Bloqueado por seguridad',
            blocked_reason: 'Actividad sospechosa',
            blocked_at: firebase.firestore.FieldValue.serverTimestamp(),
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        },
        {
            tag_id: 'E280691500004020090CCCCC',
            status: 'whitelist',
            name: 'Residente María García',
            description: 'Tag válido - DEBE ABRIR',
            owner: 'María García',
            apartment: 'Apto 205',
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
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
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
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
    console.log(`   - Whitelist (✅ debe abrir): ${whitelistCount}`);
    console.log(`   - Blacklist (❌ NO debe abrir): ${blacklistCount}`);
    console.log('\n🔍 Para ver los tags:');
    console.log(`   Firestore Console → clients → ${clientId} → tags`);
    console.log('\n🧪 PRUEBAS:');
    console.log('   1. Acerca el tag E28069150000402009073E7F');
    console.log('      → Debería ABRIR el relé ✅');
    console.log('   2. Si tienes un tag E280691500004020090BBBBB (blacklist)');
    console.log('      → NO debe abrir el relé ❌');
    console.log('   3. Cualquier tag no registrado');
    console.log('      → NO debe abrir el relé ⚠️');
}

// Ejecutar automáticamente
console.log('═══════════════════════════════════════════════════════');
console.log('  📋 Script de configuración de tags cargado');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('Ejecuta:  agregarTagsPrueba()');
console.log('');
