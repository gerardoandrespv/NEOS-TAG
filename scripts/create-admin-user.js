/**
 * ========================================
 * CREAR USUARIO ADMINISTRADOR
 * ========================================
 * 
 * Este script crea el usuario admin inicial en Firebase Authentication
 * y lo vincula con el documento en Firestore.
 * 
 * EJECUTAR:
 * node scripts/create-admin-user.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Inicializar con credenciales por defecto del proyecto
admin.initializeApp({
  projectId: 'neos-tech'
});

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  console.log('\n' + '='.repeat(60));
  console.log('👤 CREAR USUARIO ADMINISTRADOR');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // Solicitar datos
    const email = await question('📧 Email del administrador: ');
    const password = await question('🔑 Contraseña (mínimo 6 caracteres): ');
    const displayName = await question('👤 Nombre completo: ');
    
    // Validar inputs
    if (!email || !email.includes('@')) {
      console.error('❌ Email inválido');
      process.exit(1);
    }
    
    if (!password || password.length < 6) {
      console.error('❌ Contraseña debe tener al menos 6 caracteres');
      process.exit(1);
    }
    
    if (!displayName || displayName.trim().length < 3) {
      console.error('❌ Nombre debe tener al menos 3 caracteres');
      process.exit(1);
    }
    
    console.log('\n⏳ Creando usuario en Firebase Authentication...');
    
    // Crear usuario en Authentication
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email.trim(),
        password: password,
        displayName: displayName.trim(),
        emailVerified: true  // Marcar como verificado
      });
      
      console.log('✅ Usuario creado en Authentication');
      console.log('   UID:', userRecord.uid);
      
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('⚠️  Email ya existe. Obteniendo usuario existente...');
        userRecord = await auth.getUserByEmail(email.trim());
        console.log('   UID:', userRecord.uid);
      } else {
        throw error;
      }
    }
    
    console.log('\n⏳ Creando/actualizando documento en Firestore...');
    
    // Crear o actualizar documento en Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    const userDoc = await userDocRef.get();
    
    if (userDoc.exists) {
      // Actualizar role a admin
      await userDocRef.update({
        role: 'admin',
        email: email.trim(),
        name: displayName.trim(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Documento actualizado en Firestore');
      
    } else {
      // Crear nuevo documento
      await userDocRef.set({
        user_id: userRecord.uid,
        email: email.trim(),
        name: displayName.trim(),
        role: 'admin',
        status: 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Documento creado en Firestore');
    }
    
    console.log('\n⏳ Asignando custom claims...');
    
    // Asignar custom claims (opcional pero recomendado)
    await auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
      role: 'admin'
    });
    
    console.log('✅ Custom claims asignados');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ USUARIO ADMINISTRADOR CREADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 DETALLES:');
    console.log(`   UID:    ${userRecord.uid}`);
    console.log(`   Email:  ${email.trim()}`);
    console.log(`   Nombre: ${displayName.trim()}`);
    console.log(`   Role:   admin`);
    console.log('');
    console.log('🔐 CREDENCIALES DE ACCESO:');
    console.log(`   URL:        https://neos-tech.web.app`);
    console.log(`   Email:      ${email.trim()}`);
    console.log(`   Contraseña: [la que ingresaste]`);
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Guarda estas credenciales en un lugar seguro');
    console.log('   - No compartas la contraseña');
    console.log('   - Puedes crear más usuarios desde Firebase Console');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
  
  rl.close();
  process.exit(0);
}

// Manejar Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n\n⚠️  Operación cancelada por el usuario');
  process.exit(0);
});

createAdminUser();
