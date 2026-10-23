import { readFile } from 'node:fs/promises';
import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvConfig(projectRoot);
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before migrating document files.'
  );
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function readRecords(fileName, collection) {
  const filePath = path.join(projectRoot, 'public', 'data', fileName);
  const contents = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(contents);

  if (!Array.isArray(parsed[collection])) {
    throw new Error(`${fileName} must contain a "${collection}" array.`);
  }
  return parsed[collection];
}

function createRow(kind, record, number, date, party) {
  const { id, createdAt, updatedAt, ...payload } = record;
  const legacyId = id === undefined || id === null ? 'unknown' : String(id);

  return {
    id: `${kind}-legacy-${legacyId}`,
    kind,
    document_number: String(number || ''),
    document_date: date || null,
    party_name: String(party || ''),
    payload,
    created_at: createdAt || new Date().toISOString(),
    updated_at: updatedAt || null,
  };
}

const [legacyChallans, legacyInvoices, senderData] = await Promise.all([
  readRecords('challans.json', 'challans'),
  readRecords('internationalInvoices.json', 'invoices'),
  readRecords('senders.json', 'senders'),
]);

const records = [
  ...legacyChallans.map((record) => {
    const sender = senderData.find((entry) => entry.id === record.senderId);
    return createRow(
      'challan',
      {
        ...record,
        senderDetails: record.senderDetails || sender || {},
      },
      record.challanNo,
      record.date,
      record.receiverDetails?.name
    );
  }),
  ...legacyInvoices.map((record) =>
    createRow(
      'international_invoice',
      record,
      record.invoiceNo,
      record.invoiceDate,
      record.consigneeDetails?.name
    )
  ),
];

if (records.length === 0) {
  console.log('No legacy challans or invoices found.');
} else {
  const { error } = await supabase.from('documents').upsert(records, {
    onConflict: 'id',
  });

  if (error) throw error;
  console.log(`Migrated ${records.length} legacy document(s) to Supabase.`);
}

const archiveDirectory = path.join(projectRoot, 'data', 'legacy-documents');
await mkdir(archiveDirectory, { recursive: true });
const archiveSuffix = new Date().toISOString().replace(/[:.]/g, '-');

for (const fileName of ['challans.json', 'internationalInvoices.json']) {
  const source = path.join(projectRoot, 'public', 'data', fileName);
  const archive = path.join(
    archiveDirectory,
    `${path.basename(fileName, '.json')}-${archiveSuffix}.json`
  );
  await rename(source, archive);
  console.log(`Archived ${fileName} outside public/ at ${path.relative(projectRoot, archive)}.`);
}
