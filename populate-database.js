// Script para poblar la base de datos con usuarios de ejemplo
// Ejecutar desde la consola del navegador en http://localhost:5000

async function poblarBaseDeDatos() {
    console.log('🚀 Iniciando población de base de datos...\n');
    
    // Eliminar usuarios existentes
    try {
        const existingSnapshot = await db.collection('users').get();
        if (!existingSnapshot.empty) {
            console.log(`🗑️ Eliminando ${existingSnapshot.size} usuarios existentes...`);
            const batch1 = db.batch();
            existingSnapshot.forEach(doc => {
                batch1.delete(doc.ref);
            });
            await batch1.commit();
            console.log('✅ Usuarios antiguos eliminados\n');
        }
    } catch (e) {
        console.log('ℹ️ Sin usuarios previos\n');
    }
    
    // Crear usuarios de ejemplo
    const sampleUsers = [
        {
            name: 'María González',
            departamento: 'A-101',
            block: 'Torre A',
            phone: '+593987654321',
            email: 'maria.gonzalez@example.com',
            vehicle: 'ABC-1234',
            tags: ['300833B2DDD9014000000001'],
            active: true
        },
        {
            name: 'Carlos Rodríguez',
            departamento: 'B-205',
            block: 'Torre B',
            phone: '+593987654322',
            email: 'carlos.rodriguez@example.com',
            vehicle: 'DEF-5678',
            tags: ['300833B2DDD9014000000002'],
            active: true
        },
        {
            name: 'Ana Martínez',
            departamento: 'C-310',
            block: 'Torre C',
            phone: '+593987654323',
            email: 'ana.martinez@example.com',
            vehicle: 'GHI-9012',
            tags: ['300833B2DDD9014000000003', 'E0040150B6FC9C25'],
            active: true
        },
        {
            name: 'Juan Pérez Demo',
            departamento: 'A-305',
            block: 'Torre A',
            phone: '+593987654324',
            email: 'juan.perez@demo.com',
            vehicle: 'JKL-3456',
            tags: ['300833B2DDD9014000000000', 'E0040150B6FC9C26', 'A1B2C3D4E5F60708', '1234567890ABCDEF'],
            active: true
        },
        {
            name: 'Luis Fernández',
            departamento: 'B-102',
            block: 'Torre B',
            phone: '+593987654325',
            email: 'luis.fernandez@example.com',
            vehicle: 'MNO-7890',
            tags: ['400833B2DDD9014000000004'],
            active: true
        },
        {
            name: 'Patricia Sánchez',
            departamento: 'C-201',
            block: 'Torre C',
            phone: '+593987654326',
            email: 'patricia.sanchez@example.com',
            vehicle: 'PQR-1122',
            tags: ['500833B2DDD9014000000005'],
            active: true
        }
    ];
    
    try {
        console.log('➕ Creando usuarios...');
        const batch = db.batch();
        
        for (const user of sampleUsers) {
            const ref = db.collection('users').doc();
            batch.set(ref, {
                ...user,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_at: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`   ✅ ${user.name} - ${user.departamento} - ${user.block}`);
        }
        
        await batch.commit();
        console.log(`\n✅ ${sampleUsers.length} usuarios creados exitosamente`);
        console.log('\n🔄 Recargando lista de usuarios...');
        
        // Recargar usuarios en el dashboard
        if (typeof loadUsers === 'function') {
            await loadUsers();
            console.log('✅ Lista de usuarios actualizada');
        }
        
        console.log('\n🎉 ¡Listo! Ahora deberías ver los usuarios en la tabla.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Detalles:', error);
    }
}

// Ejecutar
poblarBaseDeDatos();
