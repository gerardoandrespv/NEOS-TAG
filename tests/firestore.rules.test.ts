import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_ID  = 'neos-tech-rules-test';
const RULES_PATH  = resolve(__dirname, '../firestore.rules');

const TENANT_A = 'tenant-alpha';
const TENANT_B = 'tenant-beta';

const ADMIN_A_UID     = 'uid-admin-a';
const STAFF_A_UID     = 'uid-staff-a';
const RESIDENT_A_UID  = 'uid-resident-a';
const SUSPENDED_A_UID = 'uid-suspended-a';
const ADMIN_B_UID     = 'uid-admin-b';

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await seedUsers();
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT HELPERS
// Custom claims must include clientId so isAuthenticated() + isTenantConsistent()
// resolve correctly against the seeded users/ documents.
// ─────────────────────────────────────────────────────────────────────────────

const adminA    = () => testEnv.authenticatedContext(ADMIN_A_UID,     { clientId: TENANT_A }).firestore();
const staffA    = () => testEnv.authenticatedContext(STAFF_A_UID,     { clientId: TENANT_A }).firestore();
const residentA = () => testEnv.authenticatedContext(RESIDENT_A_UID,  { clientId: TENANT_A }).firestore();
const suspended = () => testEnv.authenticatedContext(SUSPENDED_A_UID, { clientId: TENANT_A }).firestore();
const adminB    = () => testEnv.authenticatedContext(ADMIN_B_UID,     { clientId: TENANT_B }).firestore();
const unauth    = () => testEnv.unauthenticatedContext().firestore();

// ─────────────────────────────────────────────────────────────────────────────
// SEED HELPERS
// Written with security rules DISABLED so these bypass all rules.
// User documents must have clientId matching the JWT claim so that
// isTenantConsistent() passes for each identity context above.
// ─────────────────────────────────────────────────────────────────────────────

async function seedUsers(): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db  = ctx.firestore();
    const now = Timestamp.now();

    await setDoc(doc(db, 'users', ADMIN_A_UID), {
      name: 'Admin Alpha', email: 'admin@alpha.com',
      role: 'admin', status: 'active', clientId: TENANT_A, created_at: now,
    });
    await setDoc(doc(db, 'users', STAFF_A_UID), {
      name: 'Staff Alpha', email: 'staff@alpha.com',
      role: 'staff', status: 'active', clientId: TENANT_A, created_at: now,
    });
    await setDoc(doc(db, 'users', RESIDENT_A_UID), {
      name: 'Resident Alpha', email: 'resident@alpha.com',
      role: 'resident', status: 'active', clientId: TENANT_A, created_at: now,
    });
    await setDoc(doc(db, 'users', SUSPENDED_A_UID), {
      name: 'Suspended Alpha', email: 'suspended@alpha.com',
      role: 'admin', status: 'suspended', clientId: TENANT_A, created_at: now,
    });
    await setDoc(doc(db, 'users', ADMIN_B_UID), {
      name: 'Admin Beta', email: 'admin@beta.com',
      role: 'admin', status: 'active', clientId: TENANT_B, created_at: now,
    });
  });
}

async function seedDoc(collection: string, id: string, data: object): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), collection, id), data);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA FACTORIES
// ─────────────────────────────────────────────────────────────────────────────

const now = () => Timestamp.now();

const validWhitelistCreate = (clientId: string) => ({
  tag_id: 'ABCDEF123456',
  user_name: 'Valid User',
  status: 'active',
  clientId,
  created_at: serverTimestamp(),
});

const seededWhitelist = (clientId: string) => ({
  tag_id: 'ABCDEF123456',
  user_name: 'Valid User',
  status: 'active',
  clientId,
  created_at: now(),
});

const validWhitelistUpdate = (clientId: string, originalCreatedAt: Timestamp) => ({
  tag_id: 'ABCDEF123456',
  user_name: 'Updated User',
  status: 'inactive',
  clientId,
  created_at: originalCreatedAt,
  updated_at: serverTimestamp(),
});

const validBlacklistCreate = (clientId: string) => ({
  tag_id: 'DEADBEEF1234',
  reason: 'Unauthorized access attempt',
  clientId,
  created_at: serverTimestamp(),
});

const seededBlacklist = (clientId: string) => ({
  tag_id: 'DEADBEEF1234',
  reason: 'Unauthorized access attempt',
  clientId,
  created_at: now(),
});

const validAccessPointCreate = (clientId: string) => ({
  name: 'Main Gate',
  location: 'Building Entrance',
  status: 'online',
  clientId,
  created_at: serverTimestamp(),
});

const seededAccessPoint = (clientId: string) => ({
  name: 'Main Gate',
  location: 'Building Entrance',
  status: 'online',
  clientId,
  created_at: now(),
});

const validAlertCreate = (clientId: string) => ({
  type: 'FIRE',
  severity: 'CRITICAL',
  status: 'ACTIVE',
  message: 'Fire detected on floor 3 of Tower A',
  clientId,
  created_at: serverTimestamp(),
});

const seededAlert = (clientId: string) => ({
  type: 'FIRE',
  severity: 'CRITICAL',
  status: 'ACTIVE',
  message: 'Fire detected on floor 3 of Tower A',
  clientId,
  created_at: now(),
});

const validSubscriberCreate = (uid: string, clientId: string) => ({
  subscriberId: uid,
  platform: 'web',
  fcmToken: 'tok_abc123_valid_fcm_token',
  clientId,
  created_at: serverTimestamp(),
});

const seededSubscriber = (uid: string, clientId: string) => ({
  subscriberId: uid,
  platform: 'web',
  fcmToken: 'tok_abc123_valid_fcm_token',
  clientId,
  created_at: now(),
});

const seededLog = (userId: string, clientId: string) => ({
  tag_id: 'ABCDEF123456',
  access_point_id: 'gate-1',
  result: 'ALLOW',
  user_id: userId,
  clientId,
  created_at: now(),
});

const seededRfidEvent = (clientId: string) => ({
  raw_uid: 'ABCDEF123456',
  reader_id: 'reader-01',
  processed: false,
  clientId,
  created_at: now(),
});

const validSystemConfigCreate = (clientId: string) => ({
  name: 'max_attempts',
  value: '3',
  clientId,
  created_at: serverTimestamp(),
});

const seededSystemConfig = (clientId: string) => ({
  name: 'max_attempts',
  value: '3',
  clientId,
  created_at: now(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: MULTI-TENANT ISOLATION
// ─────────────────────────────────────────────────────────────────────────────

describe('Multi-Tenant: cross-tenant read blocked', () => {

  test('Tenant-A admin cannot read whitelist document of Tenant-B', async () => {
    await seedDoc('whitelist', 'tag-b-1', seededWhitelist(TENANT_B));
    await assertFails(getDoc(doc(adminA(), 'whitelist', 'tag-b-1')));
  });

  test('Tenant-A staff cannot read whitelist document of Tenant-B', async () => {
    await seedDoc('whitelist', 'tag-b-1', seededWhitelist(TENANT_B));
    await assertFails(getDoc(doc(staffA(), 'whitelist', 'tag-b-1')));
  });

  test('Tenant-A admin cannot read blacklist document of Tenant-B', async () => {
    await seedDoc('blacklist', 'tag-b-1', seededBlacklist(TENANT_B));
    await assertFails(getDoc(doc(adminA(), 'blacklist', 'tag-b-1')));
  });

  test('Tenant-A resident cannot read emergency_alerts of Tenant-B', async () => {
    await seedDoc('emergency_alerts', 'alert-b-1', seededAlert(TENANT_B));
    await assertFails(getDoc(doc(residentA(), 'emergency_alerts', 'alert-b-1')));
  });

  test('Tenant-A staff cannot read access_points of Tenant-B', async () => {
    await seedDoc('access_points', 'gate-b-1', seededAccessPoint(TENANT_B));
    await assertFails(getDoc(doc(staffA(), 'access_points', 'gate-b-1')));
  });
});

describe('Multi-Tenant: cross-tenant write blocked', () => {

  test('Tenant-A admin cannot create whitelist document with Tenant-B clientId', async () => {
    await assertFails(
      setDoc(doc(adminA(), 'whitelist', 'tag-x-1'), validWhitelistCreate(TENANT_B))
    );
  });

  test('Tenant-B admin cannot write to Tenant-A whitelist document', async () => {
    const ts = now();
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertFails(
      updateDoc(doc(adminB(), 'whitelist', 'tag-a-1'), {
        tag_id: 'ABCDEF123456',
        user_name: 'Hijacked',
        status: 'active',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('Tenant-B admin cannot delete Tenant-A whitelist document', async () => {
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertFails(deleteDoc(doc(adminB(), 'whitelist', 'tag-a-1')));
  });

  test('Tenant-B admin cannot create access_point for Tenant-A', async () => {
    await assertFails(
      setDoc(doc(adminB(), 'access_points', 'gate-hijack'), validAccessPointCreate(TENANT_A))
    );
  });
});

describe('Multi-Tenant: Tenant-A admin has no cross-tenant privileges', () => {

  test('Tenant-A admin cannot read users of Tenant-B', async () => {
    await assertFails(getDoc(doc(adminA(), 'users', ADMIN_B_UID)));
  });

  test('Tenant-A admin cannot read system_config of Tenant-B', async () => {
    await seedDoc('system_config', 'cfg-b-1', seededSystemConfig(TENANT_B));
    await assertFails(getDoc(doc(adminA(), 'system_config', 'cfg-b-1')));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: RBAC
// ─────────────────────────────────────────────────────────────────────────────

describe('RBAC: access_points visibility', () => {

  test('resident cannot read access_points', async () => {
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertFails(getDoc(doc(residentA(), 'access_points', 'gate-a-1')));
  });

  test('staff can read access_points', async () => {
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertSucceeds(getDoc(doc(staffA(), 'access_points', 'gate-a-1')));
  });

  test('admin can read access_points', async () => {
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertSucceeds(getDoc(doc(adminA(), 'access_points', 'gate-a-1')));
  });
});

describe('RBAC: whitelist & blacklist require staff or admin', () => {

  test('resident cannot read whitelist', async () => {
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertFails(getDoc(doc(residentA(), 'whitelist', 'tag-a-1')));
  });

  test('staff can read whitelist', async () => {
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertSucceeds(getDoc(doc(staffA(), 'whitelist', 'tag-a-1')));
  });

  test('resident cannot create whitelist entry', async () => {
    await assertFails(
      setDoc(doc(residentA(), 'whitelist', 'tag-new'), validWhitelistCreate(TENANT_A))
    );
  });

  test('staff cannot create whitelist entry (admin only)', async () => {
    await assertFails(
      setDoc(doc(staffA(), 'whitelist', 'tag-new'), validWhitelistCreate(TENANT_A))
    );
  });

  test('admin can create whitelist entry', async () => {
    await assertSucceeds(
      setDoc(doc(adminA(), 'whitelist', 'tag-new'), validWhitelistCreate(TENANT_A))
    );
  });
});

describe('RBAC: suspended account cannot exercise any privileges', () => {

  test('suspended admin cannot read whitelist', async () => {
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertFails(getDoc(doc(suspended(), 'whitelist', 'tag-a-1')));
  });

  test('suspended admin cannot create whitelist entry', async () => {
    await assertFails(
      setDoc(doc(suspended(), 'whitelist', 'tag-new'), validWhitelistCreate(TENANT_A))
    );
  });

  test('suspended admin cannot create emergency alert', async () => {
    await assertFails(
      setDoc(doc(suspended(), 'emergency_alerts', 'alert-new'), validAlertCreate(TENANT_A))
    );
  });

  test('suspended admin cannot read access_points', async () => {
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertFails(getDoc(doc(suspended(), 'access_points', 'gate-a-1')));
  });

  test('suspended admin cannot read system_config', async () => {
    await seedDoc('system_config', 'cfg-a-1', seededSystemConfig(TENANT_A));
    await assertFails(getDoc(doc(suspended(), 'system_config', 'cfg-a-1')));
  });
});

describe('RBAC: emergency_alerts readable by authenticated resident', () => {

  test('resident can read emergency_alerts of own tenant', async () => {
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertSucceeds(getDoc(doc(residentA(), 'emergency_alerts', 'alert-a-1')));
  });

  test('unauthenticated user cannot read emergency_alerts', async () => {
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertFails(getDoc(doc(unauth(), 'emergency_alerts', 'alert-a-1')));
  });

  test('resident cannot create emergency_alert (staff/admin only)', async () => {
    await assertFails(
      setDoc(doc(residentA(), 'emergency_alerts', 'alert-new'), validAlertCreate(TENANT_A))
    );
  });

  test('staff can create emergency_alert', async () => {
    await assertSucceeds(
      setDoc(doc(staffA(), 'emergency_alerts', 'alert-new'), validAlertCreate(TENANT_A))
    );
  });
});

describe('RBAC: access_logs — resident reads own logs only', () => {

  test('resident can read own access_log', async () => {
    await seedDoc('access_logs', 'log-1', seededLog(RESIDENT_A_UID, TENANT_A));
    await assertSucceeds(getDoc(doc(residentA(), 'access_logs', 'log-1')));
  });

  test('resident cannot read another user access_log', async () => {
    await seedDoc('access_logs', 'log-2', seededLog(STAFF_A_UID, TENANT_A));
    await assertFails(getDoc(doc(residentA(), 'access_logs', 'log-2')));
  });

  test('staff can read all access_logs of own tenant', async () => {
    await seedDoc('access_logs', 'log-1', seededLog(RESIDENT_A_UID, TENANT_A));
    await assertSucceeds(getDoc(doc(staffA(), 'access_logs', 'log-1')));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: IMMUTABILITY
// ─────────────────────────────────────────────────────────────────────────────

describe('Immutability: clientId cannot be changed', () => {

  test('admin cannot change clientId on whitelist document', async () => {
    const ts = now();
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'whitelist', 'tag-a-1'), {
        tag_id: 'ABCDEF123456',
        user_name: 'Valid User',
        status: 'active',
        clientId: TENANT_B,           // attempting to change clientId
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('admin cannot change clientId on access_point document', async () => {
    const ts = now();
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'access_points', 'gate-a-1'), {
        name: 'Main Gate',
        location: 'Building Entrance',
        status: 'online',
        clientId: TENANT_B,           // attempting to change clientId
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });
});

describe('Immutability: created_at cannot be changed', () => {

  test('admin cannot overwrite created_at on whitelist document', async () => {
    const originalTs = now();
    await seedDoc('whitelist', 'tag-a-1', { ...seededWhitelist(TENANT_A), created_at: originalTs });
    await assertFails(
      updateDoc(doc(adminA(), 'whitelist', 'tag-a-1'), {
        tag_id: 'ABCDEF123456',
        user_name: 'Valid User',
        status: 'active',
        clientId: TENANT_A,
        created_at: serverTimestamp(), // attempting to change created_at to new server time
        updated_at: serverTimestamp(),
      })
    );
  });

  test('admin cannot overwrite created_at on emergency_alert', async () => {
    const originalTs = now();
    await seedDoc('emergency_alerts', 'alert-a-1', { ...seededAlert(TENANT_A), created_at: originalTs });
    await assertFails(
      updateDoc(doc(adminA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'FIRE',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: Timestamp.fromMillis(Date.now() + 86400000), // future timestamp
        updated_at: serverTimestamp(),
      })
    );
  });
});

describe('Immutability: H-1 suspended user cannot self-reactivate', () => {

  test('suspended user cannot update own status to active', async () => {
    const ts = now();
    // The user doc for suspended already has status: 'suspended'
    await assertFails(
      updateDoc(doc(suspended(), 'users', SUSPENDED_A_UID), {
        name: 'Suspended Alpha',
        email: 'suspended@alpha.com',
        role: 'admin',
        status: 'active',              // attempting self-reactivation
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('active admin can change another user status', async () => {
    const ts = now();
    await assertSucceeds(
      updateDoc(doc(adminA(), 'users', RESIDENT_A_UID), {
        name: 'Resident Alpha',
        email: 'resident@alpha.com',
        role: 'resident',
        status: 'suspended',           // admin can suspend a user
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: AUDIT LOG DELETION FORBIDDEN
// ─────────────────────────────────────────────────────────────────────────────

describe('Logs: delete is always denied', () => {

  test('admin cannot delete access_log', async () => {
    await seedDoc('access_logs', 'log-1', seededLog(ADMIN_A_UID, TENANT_A));
    await assertFails(deleteDoc(doc(adminA(), 'access_logs', 'log-1')));
  });

  test('admin cannot delete rfid_event', async () => {
    await seedDoc('rfid_events', 'evt-1', seededRfidEvent(TENANT_A));
    await assertFails(deleteDoc(doc(adminA(), 'rfid_events', 'evt-1')));
  });

  test('staff cannot delete access_log', async () => {
    await seedDoc('access_logs', 'log-1', seededLog(STAFF_A_UID, TENANT_A));
    await assertFails(deleteDoc(doc(staffA(), 'access_logs', 'log-1')));
  });

  test('admin cannot create access_log (Cloud Functions only)', async () => {
    await assertFails(
      setDoc(doc(adminA(), 'access_logs', 'log-new'), seededLog(ADMIN_A_UID, TENANT_A))
    );
  });

  test('admin cannot create rfid_event (Cloud Functions only)', async () => {
    await assertFails(
      setDoc(doc(adminA(), 'rfid_events', 'evt-new'), seededRfidEvent(TENANT_A))
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: SCHEMA ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('Schema: extra fields rejected on create', () => {

  test('whitelist create with extra field fails', async () => {
    await assertFails(
      setDoc(doc(adminA(), 'whitelist', 'tag-extra'), {
        ...validWhitelistCreate(TENANT_A),
        metadata: 'extra_field',       // not in allow-list
      })
    );
  });

  test('blacklist create with extra field fails', async () => {
    await assertFails(
      setDoc(doc(adminA(), 'blacklist', 'tag-extra'), {
        ...validBlacklistCreate(TENANT_A),
        notes: 'unauthorized field',
      })
    );
  });

  test('access_points create with extra field fails', async () => {
    await assertFails(
      setDoc(doc(adminA(), 'access_points', 'gate-extra'), {
        ...validAccessPointCreate(TENANT_A),
        ip_address: '192.168.1.100',   // not in allow-list
      })
    );
  });

  test('emergency_alerts create with extra field fails', async () => {
    await assertFails(
      setDoc(doc(staffA(), 'emergency_alerts', 'alert-extra'), {
        ...validAlertCreate(TENANT_A),
        created_by: STAFF_A_UID,       // not in allow-list
      })
    );
  });

  test('system_config create with extra field fails', async () => {
    await assertFails(
      setDoc(doc(adminA(), 'system_config', 'cfg-extra'), {
        ...validSystemConfigCreate(TENANT_A),
        category: 'extra',
      })
    );
  });
});

describe('Schema: extra fields rejected on update', () => {

  test('whitelist update with extra field fails', async () => {
    const ts = now();
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'whitelist', 'tag-a-1'), {
        tag_id: 'ABCDEF123456',
        user_name: 'Valid User',
        status: 'active',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
        extra_field: true,             // not in allow-list
      })
    );
  });

  test('access_points update with extra field fails', async () => {
    const ts = now();
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'access_points', 'gate-a-1'), {
        name: 'Main Gate',
        location: 'Building Entrance',
        status: 'online',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
        relay_pin: 18,                 // not in allow-list
      })
    );
  });

  test('emergency_alerts update with extra field fails', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'FIRE',
        severity: 'CRITICAL',
        status: 'RESOLVED',
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
        resolved_by: ADMIN_A_UID,     // not in allow-list
      })
    );
  });
});

describe('Schema: mandatory fields cannot be dropped on update', () => {

  test('whitelist update without user_name fails (field deleted)', async () => {
    const ts = now();
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'whitelist', 'tag-a-1'), {
        tag_id: 'ABCDEF123456',
        // user_name intentionally omitted
        status: 'active',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('blacklist update without reason fails (field deleted)', async () => {
    const ts = now();
    await seedDoc('blacklist', 'tag-a-1', seededBlacklist(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'blacklist', 'tag-a-1'), {
        tag_id: 'DEADBEEF1234',
        // reason intentionally omitted
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('access_points update without name fails', async () => {
    const ts = now();
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'access_points', 'gate-a-1'), {
        // name intentionally omitted
        location: 'Building Entrance',
        status: 'online',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('access_points update without status fails', async () => {
    const ts = now();
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'access_points', 'gate-a-1'), {
        name: 'Main Gate',
        location: 'Building Entrance',
        // status intentionally omitted
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: EMERGENCY ALERTS — TYPE / SEVERITY IMMUTABILITY
// ─────────────────────────────────────────────────────────────────────────────

describe('Alerts: type and severity are immutable after create', () => {

  test('admin cannot change alert type', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'EVACUATION',            // changed from FIRE
        severity: 'CRITICAL',
        status: 'ACTIVE',
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('admin cannot change alert severity', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertFails(
      updateDoc(doc(adminA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'FIRE',
        severity: 'LOW',               // downgraded from CRITICAL
        status: 'ACTIVE',
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('staff cannot change alert type', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertFails(
      updateDoc(doc(staffA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'MEDICAL',               // changed from FIRE
        severity: 'CRITICAL',
        status: 'ACTIVE',
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });
});

describe('Alerts: only admin can CANCEL or RESOLVE', () => {

  test('staff cannot CANCEL an alert', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertFails(
      updateDoc(doc(staffA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'FIRE',
        severity: 'CRITICAL',
        status: 'CANCELLED',           // staff attempting to cancel
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('staff cannot RESOLVE an alert', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertFails(
      updateDoc(doc(staffA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'FIRE',
        severity: 'CRITICAL',
        status: 'RESOLVED',            // staff attempting to resolve
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('admin can CANCEL an alert', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertSucceeds(
      updateDoc(doc(adminA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'FIRE',
        severity: 'CRITICAL',
        status: 'CANCELLED',
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('admin can RESOLVE an alert', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertSucceeds(
      updateDoc(doc(adminA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'FIRE',
        severity: 'CRITICAL',
        status: 'RESOLVED',
        message: 'Fire detected on floor 3 of Tower A',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('staff can update message while status remains ACTIVE', async () => {
    const ts = now();
    await seedDoc('emergency_alerts', 'alert-a-1', seededAlert(TENANT_A));
    await assertSucceeds(
      updateDoc(doc(staffA(), 'emergency_alerts', 'alert-a-1'), {
        type: 'FIRE',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        message: 'Fire confirmed on floor 3, evacuate immediately',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('staff cannot create alert with status CANCELLED', async () => {
    await assertFails(
      setDoc(doc(staffA(), 'emergency_alerts', 'alert-bad'), {
        type: 'FIRE',
        severity: 'CRITICAL',
        status: 'CANCELLED',           // must start as ACTIVE
        message: 'Invalid initial status test',
        clientId: TENANT_A,
        created_at: serverTimestamp(),
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: ALERT SUBSCRIBERS — ONE-PER-USER ENFORCEMENT
// ─────────────────────────────────────────────────────────────────────────────

describe('alert_subscribers: subscriberId must equal auth.uid', () => {

  test('user cannot create subscriber with a different doc ID', async () => {
    await assertFails(
      setDoc(doc(residentA(), 'alert_subscribers', 'some-other-uid'), {
        subscriberId: 'some-other-uid',
        platform: 'web',
        fcmToken: 'tok_abc123_valid_fcm_token',
        clientId: TENANT_A,
        created_at: serverTimestamp(),
      })
    );
  });

  test('user can create own subscriber document (doc ID == uid)', async () => {
    await assertSucceeds(
      setDoc(
        doc(residentA(), 'alert_subscribers', RESIDENT_A_UID),
        validSubscriberCreate(RESIDENT_A_UID, TENANT_A)
      )
    );
  });

  test('user can update own fcmToken', async () => {
    const ts = now();
    await seedDoc('alert_subscribers', RESIDENT_A_UID, seededSubscriber(RESIDENT_A_UID, TENANT_A));
    await assertSucceeds(
      updateDoc(doc(residentA(), 'alert_subscribers', RESIDENT_A_UID), {
        subscriberId: RESIDENT_A_UID,
        platform: 'web',
        fcmToken: 'tok_new_rotated_token_xyz',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('user cannot update another user subscriber document', async () => {
    const ts = now();
    await seedDoc('alert_subscribers', STAFF_A_UID, seededSubscriber(STAFF_A_UID, TENANT_A));
    await assertFails(
      updateDoc(doc(residentA(), 'alert_subscribers', STAFF_A_UID), {
        subscriberId: STAFF_A_UID,
        platform: 'web',
        fcmToken: 'tok_hijacked',
        clientId: TENANT_A,
        created_at: ts,
        updated_at: serverTimestamp(),
      })
    );
  });

  test('admin cannot read subscriber of a different tenant', async () => {
    await seedDoc('alert_subscribers', RESIDENT_A_UID, seededSubscriber(RESIDENT_A_UID, TENANT_A));
    await assertFails(getDoc(doc(adminB(), 'alert_subscribers', RESIDENT_A_UID)));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE: UNAUTHENTICATED ACCESS DENIED
// ─────────────────────────────────────────────────────────────────────────────

describe('Unauthenticated access denied on all collections', () => {

  test('unauth cannot read users', async () => {
    await assertFails(getDoc(doc(unauth(), 'users', ADMIN_A_UID)));
  });

  test('unauth cannot read whitelist', async () => {
    await seedDoc('whitelist', 'tag-a-1', seededWhitelist(TENANT_A));
    await assertFails(getDoc(doc(unauth(), 'whitelist', 'tag-a-1')));
  });

  test('unauth cannot read access_points', async () => {
    await seedDoc('access_points', 'gate-a-1', seededAccessPoint(TENANT_A));
    await assertFails(getDoc(doc(unauth(), 'access_points', 'gate-a-1')));
  });

  test('unauth cannot read access_logs', async () => {
    await seedDoc('access_logs', 'log-1', seededLog(ADMIN_A_UID, TENANT_A));
    await assertFails(getDoc(doc(unauth(), 'access_logs', 'log-1')));
  });

  test('unauth cannot write anywhere', async () => {
    await assertFails(
      setDoc(doc(unauth(), 'whitelist', 'tag-unauth'), validWhitelistCreate(TENANT_A))
    );
  });
});
