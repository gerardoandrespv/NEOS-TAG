/**
 * ========================================
 * MIGRACIÓN: Firestore Security Rules
 * ========================================
 * 
 * Este script migra datos existentes para cumplir
 * con las nuevas reglas de seguridad.
 * 
 * EJECUTAR ANTES DE DEPLOYAR LAS NUEVAS REGLAS:
 * node scripts/migrate-firestore-security.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../src/functions/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateUsers() {
  console.log('\n📦 Migrando colección: users');
  console.log('─'.repeat(60));
  
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  let updated = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const updates = {};
      
      // Agregar role si no existe (default: resident)
      if (!data.role) {
        updates.role = 'resident';
      }
      
      // Agregar status si no existe
      if (!data.status) {
        updates.status = 'active';
      }
      
      // Validar email
      if (data.email && !isValidEmail(data.email)) {
        console.warn(`⚠️  Usuario ${doc.id}: email inválido "${data.email}"`);
        updates.email = `user_${doc.id}@placeholder.local`;
      }
      
      // Agregar timestamps si no existen
      if (!data.created_at) {
        updates.created_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      if (!data.updated_at) {
        updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      // Agregar user_id para vinculación con auth
      if (!data.user_id) {
        updates.user_id = doc.id;
      }
      
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        console.log(`✅ Actualizado: ${doc.id} (${data.name || 'Sin nombre'})`);
        updated++;
      } else {
        console.log(`⏭️  Sin cambios: ${doc.id}`);
      }
      
    } catch (error) {
      console.error(`❌ Error en ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Resumen: ${updated} actualizados, ${errors} errores\n`);
}


async function migrateAlertSubscribers() {
  console.log('\n📦 Migrando colección: alert_subscribers');
  console.log('─'.repeat(60));
  
  const subscribersRef = db.collection('alert_subscribers');
  const snapshot = await subscribersRef.get();
  
  let updated = 0;
  let deleted = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const updates = {};
      
      // Eliminar suscriptores sin FCM token
      if (!data.fcm_token || data.fcm_token.trim() === '') {
        await doc.ref.delete();
        console.log(`🗑️  Eliminado (sin token): ${doc.id}`);
        deleted++;
        continue;
      }
      
      // Agregar user_id si no existe
      if (!data.user_id) {
        updates.user_id = 'anonymous_' + doc.id;
      }
      
      // Agregar timestamps
      if (!data.created_at) {
        updates.created_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      if (!data.updated_at) {
        updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      // Agregar notifications_enabled si no existe
      if (typeof data.notifications_enabled !== 'boolean') {
        updates.notifications_enabled = true;
      }
      
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        console.log(`✅ Actualizado: ${doc.id}`);
        updated++;
      }
      
    } catch (error) {
      console.error(`❌ Error en ${doc.id}:`, error.message);
    }
  }
  
  console.log(`\n📊 Resumen: ${updated} actualizados, ${deleted} eliminados\n`);
}


async function migrateWhitelist() {
  console.log('\n📦 Migrando colección: whitelist');
  console.log('─'.repeat(60));
  
  const whitelistRef = db.collection('whitelist');
  const snapshot = await whitelistRef.get();
  
  let updated = 0;
  let errors = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const updates = {};
      
      // Validar tag_id
      if (!data.tag_id || !isValidRFIDTag(data.tag_id)) {
        console.warn(`⚠️  Tag inválido: ${doc.id} - "${data.tag_id}"`);
        errors++;
        continue;
      }
      
      // Agregar timestamps
      if (!data.created_at) {
        updates.created_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      if (!data.updated_at) {
        updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      // Agregar created_by si no existe
      if (!data.created_by) {
        updates.created_by = 'system_migration';
      }
      
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        console.log(`✅ Actualizado: ${data.tag_id} (${data.user_name || 'Sin nombre'})`);
        updated++;
      }
      
    } catch (error) {
      console.error(`❌ Error en ${doc.id}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n📊 Resumen: ${updated} actualizados, ${errors} errores\n`);
}


async function migrateEmergencyAlerts() {
  console.log('\n📦 Migrando colección: emergency_alerts');
  console.log('─'.repeat(60));
  
  const alertsRef = db.collection('emergency_alerts');
  const snapshot = await alertsRef.get();
  
  let updated = 0;
  
  for (const doc of snapshot.docs) {
    try {
      const data = doc.data();
      const updates = {};
      
      // Validar type
      if (!['FIRE', 'EVACUATION', 'INTRUSION', 'MEDICAL', 'OTHER'].includes(data.type)) {
        updates.type = 'OTHER';
      }
      
      // Validar severity
      if (!['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(data.severity)) {
        updates.severity = 'MEDIUM';
      }
      
      // Validar status
      if (!['ACTIVE', 'CANCELLED', 'RESOLVED'].includes(data.status)) {
        updates.status = 'RESOLVED';
      }
      
      // Agregar timestamps
      if (!data.created_at) {
        updates.created_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      if (!data.updated_at) {
        updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
      }
      
      // Agregar created_by
      if (!data.created_by) {
        updates.created_by = 'system';
      }
      
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        console.log(`✅ Actualizado: ${doc.id} (${data.type})`);
        updated++;
      }
      
    } catch (error) {
      console.error(`❌ Error en ${doc.id}:`, error.message);
    }
  }
  
  console.log(`\n📊 Resumen: ${updated} actualizados\n`);
}


async function createAdminUser() {
  console.log('\n👤 Creando usuario administrador');
  console.log('─'.repeat(60));
  
  try {
    const adminRef = db.collection('users').doc('admin');
    const adminDoc = await adminRef.get();
    
    if (adminDoc.exists) {
      // Actualizar role a admin si existe
      await adminRef.update({
        role: 'admin',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Usuario admin actualizado');
    } else {
      // Crear nuevo usuario admin
      await adminRef.set({
        user_id: 'admin',
        name: 'Administrador',
        email: 'admin@neostech.local',
        role: 'admin',
        status: 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Usuario admin creado');
      console.log('⚠️  IMPORTANTE: Crear cuenta en Firebase Authentication');
      console.log('   Email: admin@neostech.local');
      console.log('   Después asignar custom claim: { admin: true }');
    }
    
  } catch (error) {
    console.error('❌ Error creando admin:', error.message);
  }
}


// ============================================
// FUNCIONES AUXILIARES
// ============================================

function isValidEmail(email) {
  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

function isValidRFIDTag(tag) {
  if (typeof tag !== 'string') return false;
  if (tag.length < 12 || tag.length > 50) return false;
  return /^[A-Fa-f0-9]+$/.test(tag);
}


// ============================================
// EJECUCIÓN
// ============================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔒 MIGRACIÓN DE SEGURIDAD FIRESTORE');
  console.log('='.repeat(60));
  console.log('');
  console.log('⚠️  ADVERTENCIA: Este script modifica datos en producción');
  console.log('   Asegúrate de tener un backup antes de continuar');
  console.log('');
  console.log('Ejecutando en 5 segundos...');
  console.log('');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  try {
    await createAdminUser();
    await migrateUsers();
    await migrateWhitelist();
    await migrateAlertSubscribers();
    await migrateEmergencyAlerts();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRACIÓN COMPLETADA');
    console.log('='.repeat(60));
    console.log('');
    console.log('📋 PRÓXIMOS PASOS:');
    console.log('');
    console.log('1. Verificar datos migrados en Firebase Console');
    console.log('2. Crear usuario admin en Authentication si no existe');
    console.log('3. Asignar custom claims al admin:');
    console.log('   firebase auth:import --hash-algo BCRYPT users.json');
    console.log('4. Deployar nuevas reglas de seguridad:');
    console.log('   firebase deploy --only firestore:rules');
    console.log('5. Probar acceso con usuario autenticado');
    console.log('6. Verificar que accesos no autenticados sean bloqueados');
    console.log('');
    console.log('🔐 IMPORTANTE: Los FCM tokens ahora solo son accesibles por admins');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
