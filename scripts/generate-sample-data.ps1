# Script para generar datos de ejemplo en Firestore

Write-Host "Generando datos de ejemplo para el dashboard..." -ForegroundColor Cyan
Write-Host ""

# Nota: Este script requiere que tengas Node.js y las credenciales de Firebase configuradas
Write-Host "INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "1. Asegurate de tener Node.js instalado" -ForegroundColor White
Write-Host "2. Instala Firebase Admin SDK: npm install firebase-admin" -ForegroundColor White
Write-Host "3. Coloca tu archivo de credenciales en config/firebase-credentials.json" -ForegroundColor White
Write-Host ""

$sampleDataScript = @'
const admin = require('firebase-admin');
const serviceAccount = require('./config/firebase-credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function generateSampleData() {
    console.log('Generando datos de ejemplo...');
    
    const now = new Date();
    const users = [
        { name: 'Juan Pérez', departamento: '101', block: '1', phone: '+56912345678', vehicle: 'AB-12-CD', tags: ['E200001234567890'] },
        { name: 'María González', departamento: '205', block: '2', phone: '+56987654321', vehicle: 'XY-34-ZW', tags: ['E200001234567891'] },
        { name: 'Carlos López', departamento: '310', block: '3', phone: '+56911223344', vehicle: 'PQ-56-RS', tags: ['E200001234567892'] },
        { name: 'Ana Martínez', departamento: '102', block: '1', phone: '+56922334455', vehicle: 'TU-78-VW', tags: ['E200001234567893'] },
        { name: 'Pedro Soto', departamento: '203', block: '2', phone: '+56933445566', vehicle: '', tags: ['E200001234567894'] }
    ];
    
    // Agregar usuarios
    console.log('Agregando usuarios...');
    for (const user of users) {
        const userId = user.tags[0];
        await db.collection('users').doc(userId).set({
            ...user,
            active: true,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Agregar a whitelist
        await db.collection('whitelist').doc(user.tags[0]).set({
            tag_id: user.tags[0],
            user_name: user.name,
            departamento: user.departamento,
            added_at: admin.firestore.FieldValue.serverTimestamp(),
            added_by: 'system'
        });
    }
    
    // Generar registros de acceso (últimos 7 días)
    console.log('Generando registros de acceso...');
    for (let day = 0; day < 7; day++) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);
        
        // 10-20 accesos por día
        const accessCount = Math.floor(Math.random() * 10) + 10;
        
        for (let i = 0; i < accessCount; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const hour = Math.floor(Math.random() * 16) + 6; // Entre 6am y 10pm
            const minute = Math.floor(Math.random() * 60);
            
            const timestamp = new Date(date);
            timestamp.setHours(hour, minute, 0, 0);
            
            const eventTypes = ['auto_open', 'manual_open', 'denied'];
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            
            await db.collection('rfid_tags').add({
                tag_id: user.tags[0],
                user_name: user.name,
                departamento: user.departamento,
                event_type: eventType,
                access_granted: eventType !== 'denied',
                timestamp: admin.firestore.Timestamp.fromDate(timestamp),
                reader_id: 'porton_triwe',
                access_point_name: 'Triwe'
            });
        }
    }
    
    console.log('✅ Datos de ejemplo generados exitosamente');
    process.exit(0);
}

generateSampleData().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
'@

# Guardar script de Node.js
$sampleDataScript | Out-File -FilePath "generate-sample-data.js" -Encoding UTF8

Write-Host "Script de Node.js generado: generate-sample-data.js" -ForegroundColor Green
Write-Host ""
Write-Host "Para ejecutar:" -ForegroundColor Yellow
Write-Host "  node generate-sample-data.js" -ForegroundColor White
Write-Host ""
