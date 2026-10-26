import { handleBusinessRecords } from '../../lib/businessRecordsApi';

export default async function handler(req, res) {
  return handleBusinessRecords(req, res, 'product');
}