import {
  apiError,
  containsPattern,
  normalizeClientName,
  positiveInteger,
  queryString,
  requireObject,
  requiredText,
  toMisClient,
  withMisWorkspace,
} from '../../../../lib/misApi';

const CLIENT_COLUMNS =
  'id, name, created_at, updated_at';

export default withMisWorkspace(
  ['GET', 'POST'],
  async (req, res, { workspaceId, supabase }) => {
    if (req.method === 'GET') {
      const page = positiveInteger(
        req.query.page,
        'Page',
        1,
        100000
      );

      const pageSize = positiveInteger(
        req.query.pageSize,
        'Page size',
        100,
        200
      );

      const search = queryString(req.query.q, 'Search');

      if (search.length > 160) {
        throw apiError(400, 'Search is too long.');
      }

      const offset = (page - 1) * pageSize;

      let query = supabase
        .from('mis_clients')
        .select(CLIENT_COLUMNS, { count: 'exact' })
        .eq('workspace_id', workspaceId);

      if (search) {
        query = query.ilike(
          'name',
          containsPattern(search)
        );
      }

      const { data, count, error } = await query
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      return res.status(200).json({
        clients: (data || []).map(toMisClient),
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      });
    }

    const body = requireObject(req.body);

    const name = requiredText(
      body.name,
      'Client name',
      160
    );

    const normalizedName = normalizeClientName(name);

    const { data, error } = await supabase
      .from('mis_clients')
      .insert({
        workspace_id: workspaceId,
        name,
        normalized_name: normalizedName,
      })
      .select(CLIENT_COLUMNS)
      .single();

    if (error?.code === '23505') {
      throw apiError(
        409,
        'A client with this name already exists in your workspace.'
      );
    }

    if (error) throw error;

    return res.status(201).json({
      client: toMisClient(data),
    });
  }
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '16kb',
    },
  },
};