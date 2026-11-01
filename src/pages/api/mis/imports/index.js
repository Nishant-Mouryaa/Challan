import { createHash } from 'crypto';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

import {
  apiError,
  requireObject,
  requiredText,
  withMisWorkspace,
} from '../../../../lib/misApi';

import { parseMisCsv } from '../../../../lib/misCsv';

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_BYTES / 3) * 4;

function cellText(cell) {
  const value = cell.value;

  if (value == null) return '';

  if (value instanceof Date) {
    const pad = (part) => String(part).padStart(2, '0');

    return (
      `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-` +
      `${pad(value.getUTCDate())} ${pad(value.getUTCHours())}:` +
      `${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`
    );
  }

  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }

    if (typeof value.text === 'string') return value.text;
    if ('result' in value) return String(value.result ?? '');

    throw apiError(
      400,
      `Unsupported value in Excel cell ${cell.address}.`
    );
  }

  return String(value);
}

async function excelToCsv(fileBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw apiError(400, 'The Excel file has no worksheets.');
  }

  const rows = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = [];

    for (let column = 1; column <= row.cellCount; column += 1) {
      values.push(cellText(row.getCell(column)));
    }

    rows.push(values);
  });

  if (!rows.length) {
    throw apiError(400, 'The Excel worksheet is empty.');
  }

  return Papa.unparse(rows);
}

export default withMisWorkspace(
  ['POST'],
  async (req, res, { workspaceId, supabase }) => {
    const body = requireObject(req.body);

    if (!['pudo', 'workspace'].includes(body.sourceType)) {
      throw apiError(
        400,
        'Choose PUDO or Workspace as the import source.'
      );
    }

    if (typeof body.preview !== 'boolean') {
      throw apiError(
        400,
        'The preview flag must be true or false.'
      );
    }

    const fileName = requiredText(
      body.fileName,
      'File name',
      240
    );

    const lowerFileName = fileName.toLowerCase();
    const isExcel = lowerFileName.endsWith('.xlsx');
    const isCsv = lowerFileName.endsWith('.csv');

    if (!isCsv && !(body.sourceType === 'workspace' && isExcel)) {
      throw apiError(
        400,
        'PUDO imports require CSV files. Workspace imports accept CSV or XLSX files.'
      );
    }

    let csvText;
    let fileContents;

    if (isExcel) {
      if (
        typeof body.excelBase64 !== 'string' ||
        !body.excelBase64 ||
        body.excelBase64.length > MAX_BASE64_LENGTH ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          body.excelBase64
        )
      ) {
        throw apiError(
          400,
          'A valid Excel workbook is required.'
        );
      }

      fileContents = Buffer.from(body.excelBase64, 'base64');

      if (fileContents.length > MAX_FILE_BYTES) {
        throw apiError(
          413,
          'Maximum file size is 1 MB for this import version.'
        );
      }

      try {
        csvText = await excelToCsv(fileContents);
      } catch (error) {
        if (error.statusCode) throw error;

        throw apiError(
          400,
          'The Excel file could not be read. Please upload a valid .xlsx workbook.'
        );
      }
    } else {
      if (
        typeof body.csvText !== 'string' ||
        !body.csvText.trim()
      ) {
        throw apiError(400, 'CSV content is required.');
      }

      if (
        Buffer.byteLength(body.csvText, 'utf8') >
        MAX_FILE_BYTES
      ) {
        throw apiError(
          413,
          'Maximum CSV file size is 1 MB for this import version.'
        );
      }

      csvText = body.csvText;
      fileContents = Buffer.from(csvText, 'utf8');
    }

    const parsed = parseMisCsv(
      csvText,
      body.sourceType
    );

    if (!body.preview && !parsed.rows.length) {
      throw apiError(
        400,
        'There are no valid shipment rows to import.'
      );
    }

    const fileHash = createHash('sha256')
      .update(fileContents)
      .digest('hex');

    const { data, error } = await supabase.rpc(
      'import_mis_csv',
      {
        p_workspace_id: workspaceId,
        p_source: body.sourceType,
        p_file_name: fileName,
        p_file_hash: fileHash,
        p_rows: parsed.rows,
        p_invalid_count: parsed.invalidCount,
        p_preview: body.preview,
      }
    );

    if (error) throw error;

    return res.status(200).json({
      ...data,

      totalRows: parsed.totalRows,
      validConsignments: parsed.rows.length,
      duplicatesCollapsed: parsed.duplicateCount,

      issues: parsed.issues,

      detailsTruncated: parsed.rows.length > 100,
    });
  }
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};