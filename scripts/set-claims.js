/**
 * set-claims.js
 * Asigna custom claims a un usuario de Firebase Auth usando Admin SDK.
 *
 * Uso:
 *   node scripts/set-claims.js
 *
 * Requisito previo:
 *   Descarga serviceAccountKey.json desde:
 *   Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   y guárdalo en la raíz del proyecto (NUNCA lo subas a git).
 */

const admin = require('firebase-admin');
const path  = require('path');

// ── Configuración ──────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '..', 'serviceAccountKey.json');
const TARGET_UID            = '1a9XrbXvdohQzUtYPVMVXCmdySq2';
const CLAIMS                = {
    clientId : 'tenant-A',
    role     : 'admin',
};
// ──────────────────────────────────────────────────────────────────────────

// Verificar que el archivo existe antes de inicializar
const fs = require('fs');
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ No se encontró serviceAccountKey.json en:', SERVICE_ACCOUNT_PATH);
    console.error('   Descárgalo desde Firebase Console → Project Settings → Service Accounts');
    process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

async function main() {
    console.log('🔧 Firebase Admin SDK inicializado');
    console.log('🎯 UID objetivo:', TARGET_UID);
    console.log('📋 Claims a asignar:', JSON.stringify(CLAIMS, null, 2));
    console.log('');

    // 1) Verificar que el usuario existe en Auth
    let userRecord;
    try {
        userRecord = await admin.auth().getUser(TARGET_UID);
        console.log('✅ Usuario encontrado en Auth:', userRecord.email);
    } catch (err) {
        console.error('❌ Usuario NO encontrado en Firebase Auth:', err.message);
        process.exit(1);
    }

    // 2) Asignar custom claims
    try {
        await admin.auth().setCustomUserClaims(TARGET_UID, CLAIMS);
        console.log('✅ Custom claims asignados correctamente');
    } catch (err) {
        console.error('❌ Error asignando claims:', err.message);
        process.exit(1);
    }

    // 3) Verificar leyendo el usuario actualizado
    try {
        const updated = await admin.auth().getUser(TARGET_UID);
        console.log('');
        console.log('🔍 Claims actuales en Auth:');
        console.log(JSON.stringify(updated.customClaims, null, 2));
    } catch (err) {
        console.error('❌ Error leyendo claims actualizados:', err.message);
    }

    console.log('');
    console.log('⚠️  IMPORTANTE: el usuario debe cerrar sesión y volver a iniciarla');
    console.log('    para que el token JWT se refresque con los nuevos claims.');
    console.log('    También puedes forzarlo con: firebase.auth().currentUser.getIdToken(true)');

    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
});
