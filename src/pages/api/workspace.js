import { requireWorkspace } from '../../lib/apiAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireWorkspace(req, res);
  if (!access) return;

  return res.status(200).json({
    id: access.workspace.id,
    name: access.workspace.name,
    role: access.role,
    email: access.user.email,
  });
}
