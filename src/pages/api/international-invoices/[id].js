import { handleDocumentItem } from '../../../lib/documentApi';

export default function handler(req, res) {
  return handleDocumentItem(req, res, 'international_invoice');
}
