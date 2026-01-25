# Script para activar todos los usuarios y agregar usuario demo con multiples tags
# NEOS TECH - RFID System Pro

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEOS TECH - Actualizacion de Usuarios" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Node.js y Firebase esten instalados
$nodeVersion = node --version 2>$null
$firebaseVersion = firebase --version 2>$null

if (-not $nodeVersion) {
    Write-Host "Node.js no esta instalado" -ForegroundColor Red
    exit 1
}

if (-not $firebaseVersion) {
    Write-Host "Firebase CLI no esta instalado" -ForegroundColor Red
    Write-Host "Instale con: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "Firebase CLI: $firebaseVersion" -ForegroundColor Green
Write-Host ""

# Crear script Node.js temporal para actualizar Firestore
$updateScript = @"
const admin = require('firebase-admin');
const serviceAccount = require('../config/production.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateUsers() {
    try {
        console.log('Iniciando actualizacion de usuarios...\n');
        
        // 1. Activar todos los usuarios existentes
        console.log('1. Activando todos los usuarios...');
        const usersSnapshot = await db.collection('users').get();
        let activated = 0;
        
        const batch = db.batch();
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (!userData.active) {
                batch.update(doc.ref, { active: true });
                activated++;
            }
        });
        
        await batch.commit();
        console.log('   ' + activated + ' usuarios activados de ' + usersSnapshot.size + ' totales\n');
        
        // 2. Crear usuario demo con multiples tags
        console.log('2. Creando usuario demo con multiples tags...');
        const demoUser = {
            name: 'Juan Perez Demo',
            departamento: 'A-305',
            block: 'Torre A',
            phone: '+593987654321',
            email: 'juan.perez@demo.com',
            vehicle: 'ABC-1234',
            tags: [
                '300833B2DDD9014000000000',
                'E0040150B6FC9C25',
                'A1B2C3D4E5F60708',
                '1234567890ABCDEF'
            ],
            active: true,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };
        
        const demoRef = await db.collection('users').add(demoUser);
        console.log('   Usuario demo creado con ID: ' + demoRef.id);
        console.log('   Tags asignados: ' + demoUser.tags.length);
        console.log('   Departamento: ' + demoUser.departamento);
        console.log('   Block: ' + demoUser.block + '\n');
        
        // 3. Registrar los tags en la coleccion rfid_tags
        console.log('3. Registrando tags RFID en la base de datos...');
        let tagsRegistered = 0;
        
        for (const tag of demoUser.tags) {
            const tagData = {
                epc: tag,
                user_id: demoRef.id,
                user_name: demoUser.name,
                departamento: demoUser.departamento,
                block: demoUser.block,
                active: true,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('rfid_tags').add(tagData);
            tagsRegistered++;
        }
        
        console.log('   ' + tagsRegistered + ' tags RFID registrados\n');
        
        // 4. Mostrar resumen
        console.log('========================================');
        console.log('RESUMEN DE ACTUALIZACION');
        console.log('========================================');
        console.log('Total de usuarios: ' + (usersSnapshot.size + 1));
        console.log('Usuarios activados: ' + activated);
        console.log('Usuarios demo agregados: 1');
        console.log('Tags RFID registrados: ' + tagsRegistered);
        console.log('========================================\n');
        
        console.log('Actualizacion completada exitosamente');
        console.log('Accede al dashboard: https://neos-tech.web.app');
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error durante la actualizacion:', error);
        process.exit(1);
    }
}

updateUsers();
"@

# Guardar script temporal
$tempScriptPath = Join-Path $PSScriptRoot "temp-update-users.js"
$updateScript | Out-File -FilePath $tempScriptPath -Encoding UTF8

Write-Host "Ejecutando actualizacion de Firestore..." -ForegroundColor Yellow
Write-Host ""

# Ejecutar script
try {
    node $tempScriptPath
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ACTUALIZACION COMPLETADA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Dashboard: https://neos-tech.web.app" -ForegroundColor Cyan
    Write-Host "Usuario demo: Juan Perez Demo" -ForegroundColor Cyan
    Write-Host "Departamento: A-305" -ForegroundColor Cyan
    Write-Host "Block: Torre A" -ForegroundColor Cyan
    Write-Host "Tags: 4 tags RFID asignados" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "Error ejecutando script: $_" -ForegroundColor Red
    exit 1
} finally {
    # Limpiar archivo temporal
    if (Test-Path $tempScriptPath) {
        Remove-Item $tempScriptPath -Force
    }
}
