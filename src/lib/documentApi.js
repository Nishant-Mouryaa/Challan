import { getSupabaseAdmin } from './supabaseAdmin';
import { requireWorkspace } from './apiAuth';

const TABLE = 'documents';

const documentConfig = {
  challan: {
    label: 'Challan',
    number: (data) => data.challanNo,
    date: (data) => data.date,
    party: (data) => data.receiverDetails?.name,
    isValid: (data) =>
      Boolean(data.challanNo && data.receiverDetails?.name && data.items?.length),
  },
  international_invoice: {
    label: 'Invoice',
    number: (data) => data.invoiceNo,
    date: (data) => data.invoiceDate,
    party: (data) => data.consigneeDetails?.name,
    isValid: (data) =>
      Boolean(data.invoiceNo && data.consigneeDetails?.name && data.items?.length),
  },
};

const recordColumns =
  'id, document_number, document_date, party_name, payload, created_at, updated_at';

function toDocument(row) {
  return {
    ...row.payload,
    id: row.id,
    createdAt: row.created_at,
    ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
  };
}

function toPayload(data) {
  const { id, createdAt, updatedAt, ...payload } = data;
  return payload;
}

function toRow(kind, data, workspaceId) {
  const config = documentConfig[kind];
  return {
    workspace_id: workspaceId,
    kind,
    document_number: String(config.number(data)),
    document_date: config.date(data) || null,
    party_name: String(config.party(data)),
    payload: toPayload(data),
  };
}

function reportError(res, action, error) {
  console.error(`Error ${action}:`, error);
  if (error.code === 'P0001' && error.message === 'DOCUMENT_LIMIT_REACHED') {
    return res.status(402).json({
      error: 'Your monthly document limit has been reached. Upgrade your plan to continue.',
      code: 'DOCUMENT_LIMIT_REACHED',
    });
  }
  if (error.code === 'P0001' && error.message === 'SUBSCRIPTION_REQUIRED') {
    return res.status(402).json({
      error: 'Your trial has ended. Choose a plan to create more documents.',
      code: 'SUBSCRIPTION_REQUIRED',
    });
  }
  const status = error.statusCode || 500;
  return res.status(status).json({
    error:
      status === 503
        ? error.message
        : 'Document storage failed. Please try again.',
  });
}

function methodNotAllowed(res, methods) {
  res.setHeader('Allow', methods);
  return res.status(405).json({ error: 'Method not allowed' });
}

export async function handleDocumentCollection(req, res, kind) {
  const config = documentConfig[kind];

  if (req.method !== 'GET' && req.method !== 'POST') {
    return methodNotAllowed(res, 'GET, POST');
  }

  try {
    const access = await requireWorkspace(req, res);
    if (!access) return;

    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from(TABLE)
        .select(recordColumns)
        .eq('workspace_id', access.workspace.id)
        .eq('kind', kind)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data.map(toDocument));
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || !config.isValid(body)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const row = toRow(kind, body, access.workspace.id);
    const { data, error } = await supabase.rpc('create_workspace_document', {
      target_workspace_id: row.workspace_id,
      target_kind: row.kind,
      target_document_number: row.document_number,
      target_document_date: row.document_date,
      target_party_name: row.party_name,
      target_payload: row.payload,
    });

    if (error) throw error;
    return res.status(201).json(toDocument(Array.isArray(data) ? data[0] : data));
  } catch (error) {
    return reportError(res, `handling ${config.label.toLowerCase()} collection`, error);
  }
}

export async function handleDocumentItem(req, res, kind) {
  const config = documentConfig[kind];
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  if (!id) return res.status(400).json({ error: 'Document ID is required' });
  if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
    return methodNotAllowed(res, 'GET, PUT, DELETE');
  }

  try {
    const access = await requireWorkspace(req, res);
    if (!access) return;

    const supabase = getSupabaseAdmin();

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from(TABLE)
        .select(recordColumns)
        .eq('workspace_id', access.workspace.id)
        .eq('kind', kind)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: `${config.label} not found` });
      return res.status(200).json(toDocument(data));
    }

    if (req.method === 'PUT') {
      const { data: current, error: readError } = await supabase
        .from(TABLE)
        .select(recordColumns)
        .eq('workspace_id', access.workspace.id)
        .eq('kind', kind)
        .eq('id', id)
        .maybeSingle();

      if (readError) throw readError;
      if (!current) return res.status(404).json({ error: `${config.label} not found` });

      const body = req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Document data is required' });
      }

      const updatedDocument = { ...current.payload, ...body };
      if (!config.isValid(updatedDocument)) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data, error } = await supabase
        .from(TABLE)
        .update({
          ...toRow(kind, updatedDocument, access.workspace.id),
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', access.workspace.id)
        .eq('kind', kind)
        .eq('id', id)
        .select(recordColumns)
        .single();

      if (error) throw error;
      return res.status(200).json(toDocument(data));
    }

    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('workspace_id', access.workspace.id)
      .eq('kind', kind)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: `${config.label} not found` });
    return res.status(200).json({ message: `${config.label} deleted` });
  } catch (error) {
    return reportError(res, `handling ${config.label.toLowerCase()} item`, error);
  }
}
