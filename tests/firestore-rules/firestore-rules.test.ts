/**
 * ========================================
 * FIRESTORE SECURITY RULES TESTS
 * ========================================
 * 
 * Tests de reglas de seguridad de Firestore
 * Verifica que accesos no autorizados sean bloqueados
 */

import * as firebase from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ID = 'neos-tech-test';

// Leer reglas
const rules = readFileSync(resolve(__dirname, '../../../firestore.rules'), 'utf8');


// ========================================
// SETUP & TEARDOWN
// ========================================

beforeAll(async () => {
  await firebase.initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: 'localhost',
      port: 8080
    }
  });
});

afterAll(async () => {
  await firebase.clearFirestoreData({ projectId: PROJECT_ID });
});

beforeEach(async () => {
  await firebase.clearFirestoreData({ projectId: PROJECT_ID });
});


// ========================================
// HELPER FUNCTIONS
// ========================================

function getAuthedDb(uid: string | null = null) {
  const testEnv = firebase.getTestEnv();
  if (uid) {
    return testEnv!.authenticatedContext(uid).firestore();
  }
  return testEnv!.unauthenticatedContext().firestore();
}


// ========================================
// TEST: Public Read Access (SECURITY BUG)
// ========================================

describe('Firestore Security Rules - PUBLIC ACCESS BUG', () => {
  
  test('🔴 CRITICAL: Unauthenticated user can read ALL users', async () => {
    const db = getAuthedDb(null);  // No auth
    
    // Crear usuario de prueba como admin
    const adminDb = getAuthedDb('admin');
    await adminDb.collection('users').doc('user1').set({
      name: 'Sensitive User',
      email: 'secret@example.com',
      rfid_tags: ['SECRETTAGID123'],
      status: 'active'
    });
    
    // Intentar leer como no autenticado
    const doc = await db.collection('users').doc('user1').get();
    
    // ❌ ESTO DEBERÍA FALLAR PERO PASA (BUG)
    expect(doc.exists).toBe(true);
    expect(doc.data()?.email).toBe('secret@example.com');
    
    console.error('🚨 SECURITY VULNERABILITY: Unauthenticated access allowed!');
  });
  
  
  test('🔴 CRITICAL: Unauthenticated user can read whitelist', async () => {
    const db = getAuthedDb(null);
    
    // Crear entrada en whitelist
    const adminDb = getAuthedDb('admin');
    await adminDb.collection('whitelist').doc('TAG123').set({
      tag_id: 'TAG123',
      user_name: 'VIP User',
      apartment: '501',
      added_at: new Date()
    });
    
    // Leer como no autenticado
    const doc = await db.collection('whitelist').doc('TAG123').get();
    
    // ❌ ESTO DEBERÍA FALLAR
    expect(doc.exists).toBe(true);
    console.error('🚨 SECURITY VULNERABILITY: Whitelist publicly readable!');
  });
  
  
  test('🔴 CRITICAL: Unauthenticated user can WRITE to users collection', async () => {
    const db = getAuthedDb(null);
    
    // Intentar crear usuario malicioso
    await db.collection('users').doc('hacker').set({
      name: 'Malicious User',
      email: 'hacker@evil.com',
      role: 'admin',  // ❌ Escalación de privilegios
      rfid_tags: ['HACKEDTAG']
    });
    
    // Verificar que se creó
    const doc = await db.collection('users').doc('hacker').get();
    
    // ❌ ESTO DEBERÍA FALLAR PERO PASA
    expect(doc.exists).toBe(true);
    expect(doc.data()?.role).toBe('admin');
    
    console.error('🚨 CRITICAL: Privilege escalation possible!');
  });
  
  
  test('🔴 CRITICAL: Unauthenticated user can delete ALL data', async () => {
    const db = getAuthedDb(null);
    
    // Crear datos como admin
    const adminDb = getAuthedDb('admin');
    await adminDb.collection('users').doc('important').set({
      name: 'Important Data',
      status: 'active'
    });
    
    // Eliminar como no autenticado
    await db.collection('users').doc('important').delete();
    
    // Verificar que se eliminó
    const doc = await adminDb.collection('users').doc('important').get();
    
    // ❌ ESTO DEBERÍA FALLAR
    expect(doc.exists).toBe(false);
    
    console.error('🚨 CRITICAL: Data deletion allowed for unauthenticated users!');
  });
});


// ========================================
// TEST: Alert Subscribers Security
// ========================================

describe('Alert Subscribers Collection', () => {
  
  test('🔴 Anyone can read all FCM tokens', async () => {
    const db = getAuthedDb(null);
    
    // Crear suscriptor con token FCM
    const adminDb = getAuthedDb('admin');
    await adminDb.collection('alert_subscribers').doc('sub1').set({
      name: 'User 1',
      fcm_token: 'SENSITIVE_FCM_TOKEN_12345',
      notifications_enabled: true
    });
    
    // Leer como no autenticado
    const doc = await db.collection('alert_subscribers').doc('sub1').get();
    
    // ❌ FCM tokens expuestos públicamente
    expect(doc.exists).toBe(true);
    expect(doc.data()?.fcm_token).toBe('SENSITIVE_FCM_TOKEN_12345');
    
    console.error('🚨 FCM tokens exposed publicly!');
  });
  
  
  test('🔴 Anyone can disable notifications for others', async () => {
    const db = getAuthedDb(null);
    
    // Crear suscriptor
    const adminDb = getAuthedDb('admin');
    await adminDb.collection('alert_subscribers').doc('sub1').set({
      name: 'User 1',
      notifications_enabled: true
    });
    
    // Deshabilitar como no autenticado
    await db.collection('alert_subscribers').doc('sub1').update({
      notifications_enabled: false
    });
    
    // Verificar
    const doc = await adminDb.collection('alert_subscribers').doc('sub1').get();
    
    // ❌ Modificación no autorizada
    expect(doc.data()?.notifications_enabled).toBe(false);
    
    console.error('🚨 Unauthorized modification of subscriber data!');
  });
});


// ========================================
// TEST: Emergency Alerts Security
// ========================================

describe('Emergency Alerts Collection', () => {
  
  test('🔴 Unauthenticated user can create fake emergency alerts', async () => {
    const db = getAuthedDb(null);
    
    // Crear alerta falsa
    await db.collection('emergency_alerts').doc('fake-alert').set({
      type: 'FIRE',
      severity: 'CRITICAL',
      message: 'FAKE EMERGENCY - This is a malicious alert',
      status: 'ACTIVE',
      created_at: new Date()
    });
    
    // Verificar que se creó
    const doc = await db.collection('emergency_alerts').doc('fake-alert').get();
    
    // ❌ Alerta falsa creada exitosamente
    expect(doc.exists).toBe(true);
    
    console.error('🚨 CRITICAL: Fake emergency alerts can be created!');
  });
  
  
  test('🔴 Anyone can cancel active alerts', async () => {
    const adminDb = getAuthedDb('admin');
    await adminDb.collection('emergency_alerts').doc('real-alert').set({
      type: 'FIRE',
      status: 'ACTIVE'
    });
    
    const db = getAuthedDb(null);
    
    // Cancelar como no autenticado
    await db.collection('emergency_alerts').doc('real-alert').update({
      status: 'CANCELLED',
      cancelled_by: 'hacker'
    });
    
    // Verificar
    const doc = await adminDb.collection('emergency_alerts').doc('real-alert').get();
    
    // ❌ Alerta cancelada
    expect(doc.data()?.status).toBe('CANCELLED');
    
    console.error('🚨 Unauthorized alert cancellation!');
  });
});


// ========================================
// TEST: Access Logs Security
// ========================================

describe('Access Logs Collection', () => {
  
  test('🔴 Unauthenticated user can read access logs', async () => {
    const adminDb = getAuthedDb('admin');
    await adminDb.collection('access_logs').doc('log1').set({
      user_id: 'user123',
      tag_id: 'SENSITIVE_TAG',
      timestamp: new Date(),
      access_granted: true,
      access_point_id: 'main_gate'
    });
    
    const db = getAuthedDb(null);
    const doc = await db.collection('access_logs').doc('log1').get();
    
    // ❌ Logs de acceso expuestos
    expect(doc.exists).toBe(true);
    
    console.error('🚨 Access logs exposed - Privacy violation!');
  });
  
  
  test('🔴 Anyone can forge access logs', async () => {
    const db = getAuthedDb(null);
    
    // Crear log falso
    await db.collection('access_logs').doc('fake-log').set({
      user_id: 'admin',
      tag_id: 'ADMIN_TAG',
      timestamp: new Date(),
      access_granted: true,
      forged: true
    });
    
    const doc = await db.collection('access_logs').doc('fake-log').get();
    
    // ❌ Log falsificado
    expect(doc.exists).toBe(true);
    
    console.error('🚨 Access logs can be forged!');
  });
});


// ========================================
// PROPOSED SECURE RULES (Tests que DEBERÍAN pasar)
// ========================================

describe('PROPOSED SECURE RULES (Currently FAILING)', () => {
  
  test('Should REJECT unauthenticated read of users', async () => {
    const db = getAuthedDb(null);
    
    await expect(async () => {
      await db.collection('users').doc('user1').get();
    }).rejects.toThrow();  // Debería lanzar PERMISSION_DENIED
  });
  
  
  test('Should ALLOW authenticated users to read own data only', async () => {
    const adminDb = getAuthedDb('admin');
    await adminDb.collection('users').doc('user123').set({
      name: 'User 123',
      owner_uid: 'user123'
    });
    
    // Usuario puede leer su propia data
    const userDb = getAuthedDb('user123');
    const doc = await userDb.collection('users').doc('user123').get();
    expect(doc.exists).toBe(true);
    
    // Usuario NO puede leer data de otros
    await expect(async () => {
      const otherUserDb = getAuthedDb('other-user');
      await otherUserDb.collection('users').doc('user123').get();
    }).rejects.toThrow();
  });
  
  
  test('Should REQUIRE authentication for whitelist write', async () => {
    const db = getAuthedDb(null);
    
    await expect(async () => {
      await db.collection('whitelist').doc('TAG123').set({
        tag_id: 'TAG123'
      });
    }).rejects.toThrow();
  });
  
  
  test('Should VALIDATE data schema on write', async () => {
    const adminDb = getAuthedDb('admin');
    
    // Datos válidos deben pasar
    await adminDb.collection('users').doc('valid').set({
      name: 'Valid User',
      email: 'valid@example.com',
      status: 'active',
      role: 'resident'
    });
    
    // Datos inválidos deben rechazarse
    await expect(async () => {
      await adminDb.collection('users').doc('invalid').set({
        name: 'A',  // Muy corto (< 3 chars)
        email: 'not-an-email',  // Email inválido
        status: 'invalid-status',  // Estado no válido
        role: 'hacker'  // Rol no válido
      });
    }).rejects.toThrow();
  });
});


// ========================================
// SECURITY BEST PRACTICES TESTS
// ========================================

describe('Security Best Practices', () => {
  
  test('Should use SERVER_TIMESTAMP for audit fields', async () => {
    const adminDb = getAuthedDb('admin');
    
    // Cliente NO debe poder setear timestamps manualmente
    await expect(async () => {
      await adminDb.collection('users').doc('user1').set({
        name: 'Test',
        created_at: new Date('2020-01-01'),  // Timestamp falso
        updated_at: new Date('2020-01-01')
      });
    }).rejects.toThrow();
  });
  
  
  test('Should prevent role escalation', async () => {
    const userDb = getAuthedDb('regular-user');
    
    await expect(async () => {
      await userDb.collection('users').doc('regular-user').update({
        role: 'admin'  // ❌ Intentar convertirse en admin
      });
    }).rejects.toThrow();
  });
  
  
  test('Should validate RFID tag format', async () => {
    const adminDb = getAuthedDb('admin');
    
    // Tag válido (hexadecimal, 12-50 chars)
    await adminDb.collection('whitelist').doc('tag1').set({
      tag_id: 'E28069150000402009073E7F',
      user_name: 'Valid User'
    });
    
    // Tag inválido debe rechazarse
    await expect(async () => {
      await adminDb.collection('whitelist').doc('tag2').set({
        tag_id: 'INVALID-TAG-123!@#',  // No hexadecimal
        user_name: 'Invalid'
      });
    }).rejects.toThrow();
  });
});


// ========================================
// SUMMARY REPORT
// ========================================

afterAll(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 FIRESTORE SECURITY AUDIT SUMMARY');
  console.log('='.repeat(60));
  console.log('');
  console.log('🔴 CRITICAL VULNERABILITIES FOUND:');
  console.log('  1. Public read/write access to ALL collections');
  console.log('  2. No authentication required');
  console.log('  3. No data validation');
  console.log('  4. FCM tokens exposed publicly');
  console.log('  5. Fake emergency alerts possible');
  console.log('  6. Access logs can be forged');
  console.log('  7. Privilege escalation possible');
  console.log('');
  console.log('📝 RECOMMENDED ACTIONS:');
  console.log('  - Implement proper authentication checks');
  console.log('  - Add role-based access control (RBAC)');
  console.log('  - Validate data schemas');
  console.log('  - Restrict FCM token access');
  console.log('  - Audit trail for all writes');
  console.log('  - Use SERVER_TIMESTAMP for audit fields');
  console.log('');
  console.log('⚠️  IMPACT: HIGH - Production deployment blocked');
  console.log('='.repeat(60));
});
