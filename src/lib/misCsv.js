import Papa from 'papaparse';
import { createHash } from 'crypto';

import {
  apiError,
  normalizeClientName,
} from './misApi';

const MAX_ROWS = 1000;

const REQUIRED_HEADERS = {
  pudo: [
    'DATE OF BOOKING',
    'BOOKING REFERENCE',
    'CONSIGNMENT NO',
    'CUSTOMER',
    'RECIPIENT NAME',
    'RECIPIENT ADDRESS',
  ],

  workspace: [
    'CnNo',
    'Last Status/Event',
    'Last Milestone',
    'Last Status Date Time',
  ],
};

const clean = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .trim();

const optionalText = (value) => {
  const text = clean(value);

  if (
    !text ||
    /^(null|undefined|nan)$/i.test(text)
  ) {
    return undefined;
  }

  if (text.length > 2000) {
    throw new Error('A field exceeds 2000 characters.');
  }

  return text;
};

const identifier = (value) => {
  const text = clean(value);

  if (/^\d+\.0+$/.test(text)) {
    return text.replace(/\.0+$/, '');
  }

  return text;
};

const consignment = (value) => {
  const text = identifier(value).toUpperCase();

  if (!/^[A-Z0-9-]{1,80}$/.test(text)) {
    throw new Error('Missing or invalid consignment number.');
  }

  return text;
};

const cleanAddress = (value) => {
  const text = optionalText(value);

  if (!text) return undefined;

  const address = text
    .split(',')
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        !/^(null|undefined|nan)$/i.test(part)
    )
    .join(', ');

  return address || undefined;
};

const optionalNumber = (value) => {
  const text = optionalText(value);

  if (!text) return undefined;

  const number = Number(text);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`Invalid non-negative number: ${text}`);
  }

  return number;
};

/*
 * Accepted date formats:
 * YYYY-MM-DD
 * YYYY-MM-DD HH:mm[:ss]
 * DD/MM/YYYY
 * DD/MM/YYYY HH:mm[:ss]
 *
 * Unqualified timestamps are interpreted as Asia/Kolkata.
 */
const dateParts = (value) => {
  const text = optionalText(value);

  if (!text) return null;

  let match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );

  let year;
  let month;
  let day;
  let hour;
  let minute;
  let second;

  if (match) {
    [, year, month, day, hour = '00', minute = '00', second = '00'] =
      match;
  } else {
    match = text.match(
      /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
    );

    if (!match) {
      throw new Error(`Unsupported date format: ${text}`);
    }

    [, day, month, year, hour = '00', minute = '00', second = '00'] =
      match;
  }

  const dayString = `${year}-${month}-${day}`;

  const check = new Date(`${dayString}T00:00:00.000Z`);

  if (
    !Number.isFinite(check.getTime()) ||
    check.toISOString().slice(0, 10) !== dayString ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  ) {
    throw new Error(`Invalid date: ${text}`);
  }

  return {
    date: dayString,

    timestamp: new Date(
      `${dayString}T${hour}:${minute}:${second}+05:30`
    ).toISOString(),
  };
};

const dateOnly = (value) => dateParts(value)?.date;
const timestamp = (value) => dateParts(value)?.timestamp;

const optionalUrl = (value) => {
  const text = optionalText(value);

  if (!text) return undefined;

  try {
    const url = new URL(text);

    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error('Invalid tracking-document link.');
  }
};

const fingerprint = (value) => {
  const sorted = Object.fromEntries(
    Object.entries(value).sort(([a], [b]) =>
      a.localeCompare(b)
    )
  );

  return createHash('sha256')
    .update(JSON.stringify(sorted))
    .digest('hex');
};

const withoutBlanks = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) =>
        item !== undefined &&
        item !== null &&
        item !== ''
    )
  );

const normalizeStatus = (row) => {
  const code = clean(row['Last Status/Event']).toUpperCase();
  const milestone = clean(row['Last Milestone']);

  if (code === 'DLV') return 'Delivered';
  if (code === 'OUTDLV') return 'Out for Delivery';
  if (code === 'NONDLV') return 'Undelivered';

  const known = {
    'delivered': 'Delivered',
    'out for delivery': 'Out for Delivery',
    'undelivered': 'Undelivered',
    'at destination': 'At Destination',
    'in transit': 'In Transit',
    'softdata upload': 'Softdata Upload',
  };

  return (
    known[milestone.toLowerCase()] ||
    milestone ||
    optionalText(row['Last Status Description']) ||
    'Unknown'
  );
};

const parsePudoRow = (row) => {
  const booking = dateParts(row['DATE OF BOOKING']);

  if (!booking) {
    throw new Error('Booking date is missing.');
  }

  const customer = optionalText(row.CUSTOMER);

  if (!customer) {
    throw new Error('PUDO CUSTOMER is missing.');
  }

  const patch = withoutBlanks({
    consignment_no: consignment(row['CONSIGNMENT NO']),

    booking_reference:
      identifier(row['BOOKING REFERENCE']) || undefined,

    source_customer_name: customer,
    normalized_customer_name: normalizeClientName(customer),

    sender_name: optionalText(row['SENDER NAME']),
    recipient_name: optionalText(row['RECIPIENT NAME']),
    recipient_address: cleanAddress(row['RECIPIENT ADDRESS']),

    booking_date: booking.date,
    booking_at: booking.timestamp,

    shipment_type: optionalText(
      row['SHIPMENT TYPE'] || row.MODE
    ),

    pudo_service_type: optionalText(row['SERVICE TYPE']),

    booking_weight_kg: optionalNumber(
      row['WEIGHT (IN Kg)']
    ),
  });

  return {
    ...patch,
    booking_fingerprint: fingerprint(patch),
  };
};

const parseWorkspaceRow = (row) => {
  const eventAt = timestamp(row['Last Status Date Time']);

  if (!eventAt) {
    throw new Error('Tracking event date/time is missing.');
  }

  const currentStatus = normalizeStatus(row);
  const deliveredAt = timestamp(row['Delivered Date']);

  if (currentStatus !== 'Delivered' && deliveredAt) {
    throw new Error(
      'A non-delivered record contains a delivered date. Review the source row.'
    );
  }

  const pieces = optionalNumber(row['No. of Pieces']);

  if (pieces !== undefined && !Number.isInteger(pieces)) {
    throw new Error('Number of pieces must be an integer.');
  }

  const parentValue = optionalText(row['Parent CnNo']);

  const patch = withoutBlanks({
    consignment_no: consignment(row.CnNo),

    parent_consignment_no: parentValue
      ? consignment(parentValue)
      : undefined,

    workspace_booking_date: dateOnly(row['Booking Date']),

    destination_city: optionalText(row['Destination City']),
    destination_state: optionalText(row['Destination State']),

    destination_pincode:
      identifier(row['Destination Pincode']) || undefined,

    transport_mode: optionalText(row.Mode),

    workspace_service_type: optionalText(row['Service Type']),

    tracking_weight_kg: optionalNumber(row.Weight),
    pieces,

    status_code: optionalText(row['Last Status/Event']),
    status_description: optionalText(
      row['Last Status Description']
    ),
    milestone: optionalText(row['Last Milestone']),
    current_status: currentStatus,
    tracking_event_at: eventAt,

    delivered_at: deliveredAt,

    expected_delivery_date: dateOnly(row['EDD Date']),
    revised_expected_delivery_date: dateOnly(row['REDD Date']),

    received_by: optionalText(row['Received by']),
    failed_reason: optionalText(row['Failed Reason']),
    delivery_remarks: optionalText(row['Delivery Remarks']),

    pod_url: optionalUrl(row['POD Link']),
    drs_url: optionalUrl(row['DRS Link']),
  });

  if (
    patch.parent_consignment_no === patch.consignment_no
  ) {
    throw new Error('A consignment cannot be its own parent.');
  }

  return {
    ...patch,
    tracking_fingerprint: fingerprint(patch),
  };
};

export function parseMisCsv(csvText, sourceType) {
  const parsed = Papa.parse(
    csvText.replace(/^\uFEFF/, ''),
    {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: 'greedy',

      transformHeader: (header) =>
        header.replace(/^\uFEFF/, '').trim(),
    }
  );

  if (parsed.errors.length) {
    throw apiError(
      400,
      `CSV parsing failed: ${parsed.errors[0].message}`
    );
  }

  if (Object.keys(parsed.meta.renamedHeaders || {}).length) {
    throw apiError(
      400,
      'Duplicate column headings were found in the CSV.'
    );
  }

  const fields = parsed.meta.fields || [];

  const missing = REQUIRED_HEADERS[sourceType].filter(
    (header) => !fields.includes(header)
  );

  if (missing.length) {
    throw apiError(
      400,
      `Wrong file type or missing headings: ${missing.join(', ')}`
    );
  }

  if (!parsed.data.length) {
    throw apiError(400, 'The CSV contains no shipment rows.');
  }

  if (parsed.data.length > MAX_ROWS) {
    throw apiError(
      400,
      `Please split this file into batches of at most ${MAX_ROWS} rows.`
    );
  }

  const rowsByCn = new Map();
  const blocked = new Set();

  const issues = [];

  let invalidCount = 0;
  let duplicateCount = 0;

  parsed.data.forEach((rawRow, index) => {
    try {
      const normalized =
        sourceType === 'pudo'
          ? parsePudoRow(rawRow)
          : parseWorkspaceRow(rawRow);

      const cn = normalized.consignment_no;

      if (blocked.has(cn)) {
        invalidCount += 1;
        return;
      }

      const previous = rowsByCn.get(cn);

      if (!previous) {
        rowsByCn.set(cn, normalized);
        return;
      }

      const fingerprintKey =
        sourceType === 'pudo'
          ? 'booking_fingerprint'
          : 'tracking_fingerprint';

      if (
        previous[fingerprintKey] ===
        normalized[fingerprintKey]
      ) {
        duplicateCount += 1;
        return;
      }

      if (sourceType === 'workspace') {
        const oldTime = Date.parse(
          previous.tracking_event_at
        );

        const newTime = Date.parse(
          normalized.tracking_event_at
        );

        if (oldTime !== newTime) {
          const newer =
            newTime > oldTime ? normalized : previous;

          const older =
            newTime > oldTime ? previous : normalized;

          // Do not automatically accept a Delivered reversal.
          if (
            older.current_status !== 'Delivered' ||
            newer.current_status === 'Delivered'
          ) {
            rowsByCn.set(cn, newer);
            duplicateCount += 1;
            return;
          }
        }
      }

      rowsByCn.delete(cn);
      blocked.add(cn);

      invalidCount += 2;

      issues.push({
        row: index + 2,
        consignmentNo: cn,
        message:
          'Conflicting duplicate rows in this file. All rows for this consignment were excluded.',
      });
    } catch (error) {
      invalidCount += 1;

      issues.push({
        row: index + 2,
        message: error.message || 'Invalid row.',
      });
    }
  });

  return {
    rows: [...rowsByCn.values()],
    totalRows: parsed.data.length,
    invalidCount,
    duplicateCount,
    issues: issues.slice(0, 100),
  };
}