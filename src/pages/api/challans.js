import { handleDocumentCollection } from '../../lib/documentApi';

export default function handler(req, res) {
  return handleDocumentCollection(req, res, 'challan');
}
