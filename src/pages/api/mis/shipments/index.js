import {
  apiError,
  containsPattern,
  optionalDate,
  positiveInteger,
  queryString,
  requireUuid,
  withMisWorkspace,
} from '../../../../lib/misApi';

const SHIPMENT_COLUMNS = [
  'id',
  'consignment_no',
  'parent_consignment_no',
  'booking_reference',
  'client_id',
  'source_customer_name',
  'sender_name',
  'recipient_name',
  'recipient_address',
  'booking_date',
  'destination_city',
  'destination_state',
  'destination_pincode',
  'current_status',
  'status_code',
  'status_description',
  'milestone',
  'tracking_event_at',
  'delivered_at',
  'needs_review',
  'review_reason',
  'updated_at',
].join(', ');

export default withMisWorkspace(
  ['GET'],
  async (req, res, { workspaceId, supabase }) => {
    const clientId = queryString(
      req.query.clientId,
      'Client ID'
    );

    if (clientId) {
      requireUuid(clientId, 'Client ID');
    }

    const from = optionalDate(
      req.query.from,
      'Start date'
    );

    const to = optionalDate(
      req.query.to,
      'End date'
    );

    if (from && to && from > to) {
      throw apiError(
        400,
        'Start date must not be after end date.'
      );
    }

    const search = queryString(req.query.q, 'Search');

    if (search.length > 80) {
      throw apiError(
        400,
        'Consignment search must not exceed 80 characters.'
      );
    }

    const status = queryString(
      req.query.status,
      'Status'
    );

    if (status.length > 100) {
      throw apiError(400, 'Status is too long.');
    }

    const includeChildrenValue = queryString(
      req.query.includeChildren,
      'Include children'
    );

    if (
      includeChildrenValue &&
      !['true', 'false'].includes(includeChildrenValue)
    ) {
      throw apiError(
        400,
        'includeChildren must be true or false.'
      );
    }

    const includeChildren =
      includeChildrenValue === 'true';

    const page = positiveInteger(
      req.query.page,
      'Page',
      1,
      100000
    );

    const pageSize = positiveInteger(
      req.query.pageSize,
      'Page size',
      50,
      200
    );

    const offset = (page - 1) * pageSize;

    let client = null;

    if (clientId) {
      const {
        data,
        error,
      } = await supabase
        .from('mis_clients')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .eq('id', clientId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw apiError(
          404,
          'Client not found in your workspace.'
        );
      }

      client = data;
    }

    let query = supabase
      .from('mis_shipments')
      .select(SHIPMENT_COLUMNS, { count: 'exact' })
      .eq('workspace_id', workspaceId);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (from) {
      query = query.gte('booking_date', from);
    }

    if (to) {
      query = query.lte('booking_date', to);
    }

    if (status) {
      query = query.eq('current_status', status);
    }

    if (search) {
      query = query.ilike(
        'consignment_no',
        containsPattern(search)
      );
    }

    /*
     * Parent shipments only by default.
     *
     * Child records remain in the database for package-level
     * reporting. We do not assume that their statuses can
     * simply be added together.
     */
    if (!includeChildren) {
      query = query.is('parent_consignment_no', null);
    }

    const { data, count, error } = await query
      .order('booking_date', {
        ascending: false,
        nullsFirst: false,
      })
      .order('consignment_no', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const rows = data || [];

    /*
     * Resolve client display names without relying on a
     * guessed Supabase relationship name.
     */
    const clientNames = new Map();

    if (client) {
      clientNames.set(client.id, client.name);
    }

    const missingClientIds = [
      ...new Set(
        rows
          .map((row) => row.client_id)
          .filter(
            (id) => id && !clientNames.has(id)
          )
      ),
    ];

    if (missingClientIds.length) {
      const {
        data: clients,
        error: clientsError,
      } = await supabase
        .from('mis_clients')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .in('id', missingClientIds);

      if (clientsError) throw clientsError;

      (clients || []).forEach((item) => {
        clientNames.set(item.id, item.name);
      });
    }

    return res.status(200).json({
      client,

      shipments: rows.map((row) => ({
        id: row.id,

        consignmentNo: row.consignment_no,
        parentConsignmentNo: row.parent_consignment_no,

        bookingReference: row.booking_reference,
        bookingDate: row.booking_date,

        clientId: row.client_id,
        clientName:
          clientNames.get(row.client_id) || null,

        sourceCustomerName: row.source_customer_name,
        senderName: row.sender_name,

        recipientName: row.recipient_name,
        recipientAddress: row.recipient_address,

        destinationLocation: row.destination_city,
        destinationState: row.destination_state,
        pincode: row.destination_pincode,

        status: row.current_status,
        statusCode: row.status_code,
        statusDescription: row.status_description,
        milestone: row.milestone,

        trackingEventAt: row.tracking_event_at,
        deliveredAt: row.delivered_at,

        needsReview: row.needs_review,
        reviewReason: row.review_reason,

        updatedAt: row.updated_at,
      })),

      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil(
          (count || 0) / pageSize
        ),
      },
    });
  }
);