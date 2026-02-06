// Script para crear usuario administrador en Firestore
// Ejecutar con: node create-admin.js

const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('./neos-tech-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://neos-tech-default-rtdb.firebaseio.com"
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdminUser() {
    try {
        console.log('🔧 Creando usuario administrador...');
        
        // 1. Crear usuario en Authentication
        let userRecord;
        try {
            userRecord = await auth.createUser({
                email: 'admin@neostech.local',
                password: 'Admin123!',
                emailVerified: true,
                displayName: 'Administrador Sistema'
            });
            console.log('✅ Usuario creado en Authentication:', userRecord.uid);
        } catch (error) {
            if (error.code === 'auth/email-already-exists') {
                console.log('⚠️ Usuario ya existe, obteniendo UID...');
                userRecord = await auth.getUserByEmail('admin@neostech.local');
                console.log('✅ Usuario encontrado:', userRecord.uid);
            } else {
                throw error;
            }
        }
        
        // 2. Crear documento en Firestore users collection
        await db.collection('users').doc(userRecord.uid).set({
            email: 'admin@neostech.local',
            displayName: 'Administrador Sistema',
            role: 'admin',
            permissions: {
                manage_users: true,
                manage_tags: true,
                send_alerts: true,
                view_logs: true,
                manage_buildings: true
            },
            notifications_enabled: true,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            active: true,
            building_access: ['all'],
            floor_access: ['all']
        }, { merge: true });
        
        console.log('✅ Documento de usuario creado en Firestore');
        
        // 3. Establecer custom claims para admin
        await auth.setCustomUserClaims(userRecord.uid, {
            admin: true,
            role: 'admin'
        });
        
        console.log('✅ Custom claims establecidos');
        
        console.log('\n🎉 Usuario administrador creado exitosamente!');
        console.log('📧 Email: admin@neostech.local');
        console.log('🔑 Contraseña: Admin123!');
        console.log('🔗 URL: https://neos-tech.web.app');
        console.log('\n⚠️ IMPORTANTE: Cambia la contraseña después del primer login');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

createAdminUser();
