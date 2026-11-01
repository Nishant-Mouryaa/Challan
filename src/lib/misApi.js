import { getSupabaseAdmin } from './supabaseAdmin';
import { requireWorkspace } from './apiAuth';

/* =========================================================
   VALIDATION
   ========================================================= */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function apiError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export function isUuid(value) {
  return (
    typeof value === 'string' &&
    UUID_PATTERN.test(value)
  );
}

export function requireUuid(value, label = 'ID') {
  if (!isUuid(value)) {
    throw apiError(400, `${label} is invalid.`);
  }

  return value;
}

export function queryString(value, label) {
  if (value === undefined) return '';

  if (typeof value !== 'string') {
    throw apiError(400, `${label} must be a single value.`);
  }

  return value.trim();
}

export function requireObject(body) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    throw apiError(400, 'A JSON object is required.');
  }

  return body;
}

export function requiredText(value, label, maxLength) {
  if (typeof value !== 'string') {
    throw apiError(400, `${label} is required.`);
  }

  const text = value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ');

  if (!text) {
    throw apiError(400, `${label} is required.`);
  }

  if (text.length > maxLength) {
    throw apiError(
      400,
      `${label} must not exceed ${maxLength} characters.`
    );
  }

  return text;
}

/*
 * Intentionally conservative:
 * normalize case and whitespace, but preserve punctuation.
 *
 * Different punctuation variants can be added as explicit
 * aliases after approval.
 */
export function normalizeClientName(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function positiveInteger(
  value,
  label,
  defaultValue,
  maximum
) {
  const text = queryString(value, label);

  if (!text) return defaultValue;

  if (!/^\d+$/.test(text)) {
    throw apiError(400, `${label} must be a positive integer.`);
  }

  const number = Number(text);

  if (
    !Number.isSafeInteger(number) ||
    number < 1 ||
    number > maximum
  ) {
    throw apiError(
      400,
      `${label} must be between 1 and ${maximum}.`
    );
  }

  return number;
}

export function optionalDate(value, label) {
  const text = queryString(value, label);

  if (!text) return '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw apiError(400, `${label} must use YYYY-MM-DD.`);
  }

  const date = new Date(`${text}T00:00:00.000Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== text
  ) {
    throw apiError(400, `${label} is not a valid date.`);
  }

  return text;
}

/*
 * Used for an ILIKE value, not a raw PostgREST .or() expression.
 */
export function containsPattern(value) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

export function toMisClient(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMisAlias(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    sourceName: row.source_name,
    createdAt: row.created_at,
  };
}

/* =========================================================
   AUTHENTICATED ROUTE WRAPPER

   Never accept workspace_id from request body or query.
   ========================================================= */

export function withMisWorkspace(methods, handler) {
  return async function misHandler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');

    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));

      return res.status(405).json({
        error: 'Method not allowed.',
      });
    }

    try {
      const access = await requireWorkspace(req, res);

      if (!access) return;

      const workspaceId = access.workspace?.id;

      if (!isUuid(workspaceId)) {
        console.error(
          'MIS access failed: requireWorkspace returned an invalid workspace.'
        );

        return res.status(500).json({
          error: 'Workspace access could not be resolved.',
        });
      }

      const supabase = getSupabaseAdmin();

      return await handler(req, res, {
        access,
        workspaceId,
        supabase,
      });
    } catch (error) {
      const statusCode =
        Number.isInteger(error.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode <= 599
          ? error.statusCode
          : 500;

      /*
       * Avoid logging uploaded shipment payloads, recipient
       * addresses, or authentication headers.
       */
      console.error('MIS API error:', {
        code: error.code || null,
        statusCode,
      });

      return res.status(statusCode).json({
        error:
          statusCode === 500
            ? 'MIS storage failed. Please try again.'
            : error.message,
      });
    }
  };
}