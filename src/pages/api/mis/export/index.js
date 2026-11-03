import ExcelJS from 'exceljs';

import {
  apiError,
  optionalDate,
  queryString,
  requireUuid,
  withMisWorkspace,
} from '../../../../lib/misApi';
import MIS_EXPORT_COLUMNS from '../../../../lib/misExportColumns';

const DEFAULT_EXPORT_COLUMN_KEYS = MIS_EXPORT_COLUMNS
  .filter((column) => column.defaultSelected)
  .map((column) => column.key);

const MAX_EXPORT_ROWS = 10000;

// An explicit application limit, separate from Next.js warnings.
const MAX_EXPORT_BYTES = 3 * 1024 * 1024;

const indiaDateFormatter = new Intl.DateTimeFormat(
  'en-GB',
  {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }
);

function toExcelDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const parts = indiaDateFormatter.formatToParts(date);

  const getPart = (type) =>
    Number(
      parts.find((part) => part.type === type)?.value
    );

  // Keep only the India-local calendar date.
  return new Date(
    Date.UTC(
      getPart('year'),
      getPart('month') - 1,
      getPart('day')
    )
  );
}

function text(value) {
  return value == null ? '' : String(value);
}

function safeFilePart(value) {
  return (
    text(value)
      .normalize('NFKC')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 70) || 'client'
  );
}

export default withMisWorkspace(
  ['GET'],
  async (req, res, { workspaceId, supabase }) => {
    const clientId = requireUuid(
      queryString(req.query.clientId, 'Client ID'),
      'Client ID'
    );

    const from = optionalDate(
      req.query.from,
      'Start date'
    );

    const to = optionalDate(
      req.query.to,
      'End date'
    );

    if (!from || !to) {
      throw apiError(
        400,
        'Start date and end date are required.'
      );
    }

    if (from > to) {
      throw apiError(
        400,
        'Start date must not be after end date.'
      );
    }

    const requestedFields = queryString(
      req.query.fields,
      'Export fields'
    );

    if (requestedFields.length > 1000) {
      throw apiError(400, 'Export fields are too long.');
    }

    const requestedColumnKeys = requestedFields
      ? requestedFields.split(',')
      : DEFAULT_EXPORT_COLUMN_KEYS;

    const allowedColumnKeys = new Set(
      MIS_EXPORT_COLUMNS.map((column) => column.key)
    );

    if (
      !requestedColumnKeys.length ||
      requestedColumnKeys.some(
        (key) => !allowedColumnKeys.has(key)
      )
    ) {
      throw apiError(
        400,
        'One or more selected export fields are invalid.'
      );
    }

    const selectedColumnKeys = new Set(requestedColumnKeys);
    const selectedColumns = MIS_EXPORT_COLUMNS.filter(
      (column) => selectedColumnKeys.has(column.key)
    );

    if (!selectedColumns.length) {
      throw apiError(
        400,
        'Select at least one field for the Excel report.'
      );
    }

    // Confirm the selected client belongs to this workspace.
    const {
      data: client,
      error: clientError,
    } = await supabase
      .from('mis_clients')
      .select('id, name')
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
      data: rows,
      error: exportError,
    } = await supabase.rpc(
      'get_mis_export_rows',
      {
        p_workspace_id: workspaceId,
        p_client_id: clientId,
        p_from: from,
        p_to: to,
      }
    );

    if (exportError) throw exportError;

    if (!Array.isArray(rows)) {
      throw new Error('Unexpected export result.');
    }

    if (rows.length > MAX_EXPORT_ROWS) {
      throw apiError(
        413,
        'This report exceeds 10,000 shipments. Choose a smaller booking-date range.'
      );
    }

    if (!rows.length) {
      throw apiError(
        404,
        'No shipments match this client and booking-date range.'
      );
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'DC System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet('Client MIS');

    sheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    sheet.columns = selectedColumns.map(
      ({ header, key, width }) => ({
        header,
        key,
        width,
      })
    );

    // Identifiers are written as strings, with text formatting.
    for (const column of selectedColumns) {
      if (column.key === 'consignmentNo' || column.key === 'pincode') {
        sheet.getColumn(column.key).numFmt = '@';
      }

      if (column.date) {
        sheet.getColumn(column.key).numFmt = 'dd/mm/yyyy';
      }
    }

    for (const shipment of rows) {
      const excelRow = sheet.addRow(
        Object.fromEntries(
          selectedColumns.map((column) => {
            if (column.key === 'clientName') {
              return [
                column.key,
                text(client.name || shipment.sender_name),
              ];
            }

            if (column.key === 'status') {
              return [
                column.key,
                text(
                  shipment.current_status ||
                    'Tracking unavailable'
                ),
              ];
            }

            if (column.date) {
              return [
                column.key,
                column.key === 'deliveredDate' &&
                shipment.current_status !== 'Delivered'
                  ? null
                  : toExcelDate(shipment[column.source]),
              ];
            }

            return [
              column.key,
              text(shipment[column.source]),
            ];
          })
        )
      );

      excelRow.alignment = {
        vertical: 'top',
        wrapText: true,
      };

      // Highlight review cases without changing the saved shipment status.
      const statusColumnIndex = selectedColumns.findIndex(
        (column) => column.key === 'status'
      );

      if (shipment.needs_review && statusColumnIndex >= 0) {
        const statusCell = excelRow.getCell(
          statusColumnIndex + 1
        );

        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'FFFFF3CD',
          },
        };

        statusCell.note =
          'Needs review: ' +
          text(
            shipment.review_reason ||
              'Review this shipment before sharing.'
          );
      }
    }

    const header = sheet.getRow(1);

    header.height = 30;

    header.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: {
          argb: 'FFFFFFFF',
        },
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FFC41E3A',
        },
      };

      cell.alignment = {
        vertical: 'middle',
        wrapText: true,
      };
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: selectedColumns.length },
    };

    sheet.pageSetup = {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:1',
    };

    const buffer = Buffer.from(
      await workbook.xlsx.writeBuffer()
    );

    if (buffer.length > MAX_EXPORT_BYTES) {
      throw apiError(
        413,
        'The generated file exceeds this version’s 3 MB download limit. Choose a smaller booking-date range.'
      );
    }

    const fileName =
      `DTDC-MIS-${safeFilePart(client.name)}-` +
      `${from}-to-${to}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.status(200).send(buffer);
  }
);