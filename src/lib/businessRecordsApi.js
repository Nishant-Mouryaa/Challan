import { requireWorkspace } from './apiAuth';
import { getSupabaseAdmin } from './supabaseAdmin';

const recordFields = {
  client: ['name', 'address', 'city', 'state', 'pin', 'contactNo', 'email', 'contactPerson'],
  sender: [
    'company',
    'careOf',
    'address',
    'area',
    'city',
    'pin',
    'state',
    'contactNo',
    'email',
  ],
  product: ['code', 'name', 'category', 'price'],
};

const GENERIC_ERROR = 'Please provide valid required fields';

const normalizeText = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Returns { record } on success or { error } with a message the UI can show.
export function normalizeRecord(kind, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: GENERIC_ERROR };
  }

  const record = Object.fromEntries(
    recordFields[kind]
      .filter((field) => field in body)
      .map((field) => [field, body[field]])
  );

  for (const field of recordFields[kind]) {
    if (field === 'price') {
      if (field in record) {
        if (
          record.price === null ||
          record.price === '' ||
          !Number.isFinite(Number(record.price))
        ) {
          return { error: 'Price must be a valid number' };
        }
        record.price = Number(record.price);
      }
      continue;
    }
    if (field in record && typeof record[field] !== 'string') {
      return { error: GENERIC_ERROR };
    }
    if (typeof record[field] === 'string') record[field] = record[field].trim();
  }

  if (kind === 'client' && (!record.name || !record.address)) {
    return { error: 'Client name and address are required' };
  }
  if (kind === 'sender' && (!record.company || !record.address)) {
    return { error: 'Sender company and address are required' };
  }
  if (
    kind === 'product' &&
    (!record.code || !record.name || record.price === undefined || record.price < 0)
  ) {
    return { error: GENERIC_ERROR };
  }

  if (kind === 'client' || kind === 'sender') {
    if (record.pin && !/^[1-9]\d{5}$/.test(record.pin)) {
      return { error: 'PIN code must be 6 digits' };
    }
    if (record.contactNo && record.contactNo.replace(/\D/g, '').length < 10) {
      return { error: 'Contact number must have at least 10 digits' };
    }
  }
  if (kind === 'client' && record.contactPerson && record.contactPerson.length > 80) {
    return { error: 'Contact person name is too long' };
  }

  return { record };
}

// Same client = same name AND same PIN. If either side has no PIN, compare addresses instead.
export function isSameClient(existing = {}, incoming = {}) {
  if (normalizeText(existing.name) !== normalizeText(incoming.name)) return false;
  if (existing.pin && incoming.pin) return existing.pin === incoming.pin;
  return normalizeText(existing.address) === normalizeText(incoming.address);
}

function toRecord(row) {
  const { legacyId, ...payload } = row.payload;
  return { ...payload, id: legacyId ?? row.id };
}

export async function handleBusinessRecords(req, res, kind) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireWorkspace(req, res);
  if (!access) return;

  try {
    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('business_records')
        .select('id, payload')
        .eq('workspace_id', access.workspace.id)
        .eq('kind', kind)
        .order('id');

      if (error) throw error;
      return res.status(200).json(data.map(toRecord));
    }

    const { record: payload, error: validationError } = normalizeRecord(kind, req.body);
    if (!payload) {
      return res.status(400).json({ error: validationError || GENERIC_ERROR });
    }

    if (kind === 'client') {
      const { data: existing, error: lookupError } = await supabase
        .from('business_records')
        .select('id, payload')
        .eq('workspace_id', access.workspace.id)
        .eq('kind', 'client');

      if (lookupError) throw lookupError;

      const duplicate = existing.find((row) => isSameClient(row.payload, payload));
      if (duplicate) {
        return res.status(409).json({
          error: 'A saved client with the same name and PIN already exists.',
          existing: toRecord(duplicate),
        });
      }
    }

    const { data, error } = await supabase
      .from('business_records')
      .insert({
        workspace_id: access.workspace.id,
        kind,
        payload,
      })
      .select('id, payload')
      .single();

    if (error) throw error;
    return res.status(201).json(toRecord(data));
  } catch (error) {
    console.error(`Error handling ${kind} records:`, error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      error:
        status === 503
          ? error.message
          : `Unable to load or save ${kind} records`,
    });
  }
}