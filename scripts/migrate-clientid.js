/**
 * migrate-clientid.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Migración multi-tenant: inyecta clientId = TARGET_CLIENT_ID en todos los
 * documentos que aún no tengan ese campo.
 *
 * Colecciones cubiertas:
 *   users · alert_subscribers · whitelist · blacklist ·
 *   access_logs · rfid_events · emergency_alerts
 *
 * Uso:
 *   node scripts/migrate-clientid.js
 *
 * Requisito previo:
 *   serviceAccountKey.json en la raíz del proyecto (nunca subir a git).
 *
 * Límites Firestore:
 *   - Batch máximo 500 operaciones → se usa chunks de 499.
 *   - Se respeta con un pequeño delay entre batches para no saturar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ── Configuración ──────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '..', 'serviceAccountKey.json');
const TARGET_CLIENT_ID     = 'tenant-A';   // ← ajusta si el tenant es distinto
const BATCH_SIZE           = 499;           // máximo seguro por batch
const BATCH_DELAY_MS       = 300;           // ms entre batches para throttling

/** Colecciones a migrar (sin subcolecciones en este script). */
const COLLECTIONS = [
  'users',
  'alert_subscribers',
  'whitelist',
  'blacklist',
  'access_logs',
  'rfid_events',
  'emergency_alerts',
];
// ──────────────────────────────────────────────────────────────────────────

// ── Validar service account ────────────────────────────────────────────────
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌  No se encontró serviceAccountKey.json en:', SERVICE_ACCOUNT_PATH);
  console.error('    Descárgalo desde Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

// ── Inicializar Admin SDK ──────────────────────────────────────────────────
const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Helpers ────────────────────────────────────────────────────────────────

/** Fragmenta un array en trozos de tamaño `size`. */
function chunks(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/** Pausa async. */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Migra una colección entera.
 * @param {string} collectionName
 * @returns {Promise<{total: number, updated: number, skipped: number}>}
 */
async function migrateCollection(collectionName) {
  console.log(`\n📂  ${collectionName}`);

  const snapshot = await db.collection(collectionName).get();

  if (snapshot.empty) {
    console.log('    (vacía, sin documentos)');
    return { total: 0, updated: 0, skipped: 0 };
  }

  // Filtrar sólo los documentos sin clientId
  const docsToUpdate = snapshot.docs.filter(doc => !doc.data().clientId);
  const skipped      = snapshot.size - docsToUpdate.length;

  console.log(`    Total: ${snapshot.size}  |  Ya tienen clientId: ${skipped}  |  A migrar: ${docsToUpdate.length}`);

  if (docsToUpdate.length === 0) {
    return { total: snapshot.size, updated: 0, skipped };
  }

  // Procesar en batches de BATCH_SIZE
  let updated = 0;
  const batches = chunks(docsToUpdate, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = db.batch();
    const chunk = batches[i];

    chunk.forEach(doc => {
      batch.update(doc.ref, { clientId: TARGET_CLIENT_ID });
    });

    await batch.commit();
    updated += chunk.length;
    console.log(`    ✅  Batch ${i + 1}/${batches.length} — ${updated}/${docsToUpdate.length} documentos actualizados`);

    // Pequeño delay entre batches para evitar rate limiting
    if (i < batches.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  return { total: snapshot.size, updated, skipped };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  NeosTech RFID — Migración clientId');
  console.log(`  Target clientId: "${TARGET_CLIENT_ID}"`);
  console.log(`  Fecha: ${new Date().toLocaleString('es-CL')}`);
  console.log('═══════════════════════════════════════════════════════════');

  const summary = {};
  let totalUpdated = 0;

  for (const col of COLLECTIONS) {
    try {
      const result = await migrateCollection(col);
      summary[col] = result;
      totalUpdated += result.updated;
    } catch (err) {
      console.error(`❌  Error en colección "${col}":`, err.message);
      summary[col] = { error: err.message };
    }
  }

  // ── Resumen final ────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMEN FINAL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`${'Colección'.padEnd(25)} ${'Total'.padStart(8)} ${'Actualizados'.padStart(14)} ${'Saltados'.padStart(10)}`);
  console.log('─'.repeat(60));

  for (const [col, res] of Object.entries(summary)) {
    if (res.error) {
      console.log(`${col.padEnd(25)} ERROR: ${res.error}`);
    } else {
      console.log(
        `${col.padEnd(25)} ${String(res.total).padStart(8)} ${String(res.updated).padStart(14)} ${String(res.skipped).padStart(10)}`
      );
    }
  }

  console.log('─'.repeat(60));
  console.log(`Total documentos migrados: ${totalUpdated}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch(err => {
  console.error('❌  Error fatal:', err);
  process.exit(1);
});
