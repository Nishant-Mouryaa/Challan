import { requireWorkspace } from './apiAuth';
import { getSupabaseAdmin } from './supabaseAdmin';

const recordFields = {
  client: ['name', 'address', 'city', 'state', 'pin', 'contactNo', 'email'],
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

function normalizeRecord(kind, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

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
          return null;
        }
        record.price = Number(record.price);
      }
      continue;
    }
    if (field in record && typeof record[field] !== 'string') return null;
    if (typeof record[field] === 'string') record[field] = record[field].trim();
  }

  if (kind === 'client' && (!record.name || !record.address)) return null;
  if (kind === 'sender' && (!record.company || !record.address)) return null;
  if (
    kind === 'product' &&
    (!record.code || !record.name || record.price === undefined || record.price < 0)
  ) {
    return null;
  }

  return record;
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

    const payload = normalizeRecord(kind, req.body);
    if (!payload) {
      return res.status(400).json({ error: 'Please provide valid required fields' });
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
