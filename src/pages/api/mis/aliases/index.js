import {
  apiError,
  normalizeClientName,
  positiveInteger,
  queryString,
  requireObject,
  requiredText,
  requireUuid,
  toMisAlias,
  withMisWorkspace,
} from '../../../../lib/misApi';

const ALIAS_COLUMNS =
  'id, client_id, source_name, created_at';

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

      const clientId = queryString(
        req.query.clientId,
        'Client ID'
      );

      if (clientId) {
        requireUuid(clientId, 'Client ID');
      }

      const offset = (page - 1) * pageSize;

      let query = supabase
        .from('mis_client_aliases')
        .select(ALIAS_COLUMNS, { count: 'exact' })
        .eq('workspace_id', workspaceId);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, count, error } = await query
        .order('source_name', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      return res.status(200).json({
        aliases: (data || []).map(toMisAlias),
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      });
    }

    const body = requireObject(req.body);

    const clientId = requireUuid(
      body.clientId,
      'Client ID'
    );

    const sourceName = requiredText(
      body.sourceName,
      'Imported customer name',
      300
    );

    const normalizedSourceName =
      normalizeClientName(sourceName);

    const {
      data: client,
      error: clientError,
    } = await supabase
      .from('mis_clients')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', clientId)
      .maybeSingle();

    if (clientError) throw clientError;

    if (!client) {
      throw apiError(
        404,
        'Client not found in your workspace.'
      );
    }

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from('mis_client_aliases')
      .select(ALIAS_COLUMNS)
      .eq('workspace_id', workspaceId)
      .eq('normalized_source_name', normalizedSourceName)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      if (existing.client_id !== clientId) {
        throw apiError(
          409,
          'This imported customer name is already mapped to another client.'
        );
      }

      return res.status(200).json({
        alias: toMisAlias(existing),
        alreadyExists: true,
      });
    }

    const { data, error } = await supabase
      .from('mis_client_aliases')
      .insert({
        workspace_id: workspaceId,
        client_id: clientId,
        source_name: sourceName,
        normalized_source_name: normalizedSourceName,
      })
      .select(ALIAS_COLUMNS)
      .single();

    if (error?.code === '23505') {
      /*
       * Another staff member may have added this alias
       * after our initial lookup.
       */
      const {
        data: concurrentAlias,
        error: concurrentError,
      } = await supabase
        .from('mis_client_aliases')
        .select(ALIAS_COLUMNS)
        .eq('workspace_id', workspaceId)
        .eq(
          'normalized_source_name',
          normalizedSourceName
        )
        .maybeSingle();

      if (concurrentError) throw concurrentError;

      if (concurrentAlias?.client_id === clientId) {
        return res.status(200).json({
          alias: toMisAlias(concurrentAlias),
          alreadyExists: true,
        });
      }

      throw apiError(
        409,
        'This customer name was mapped by another staff member. Refresh and review the mapping.'
      );
    }

    if (error) throw error;

    return res.status(201).json({
      alias: toMisAlias(data),
      alreadyExists: false,
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