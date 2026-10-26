import { getSupabaseAdmin } from './supabaseAdmin';

export async function requireWorkspace(req, res) {
  const authorization = req.headers.authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    res.status(401).json({ error: 'Sign in to access this resource' });
    return null;
  }

  try {
    const supabase = getSupabaseAdmin();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      res.status(401).json({ error: 'Your session is invalid or has expired' });
      return null;
    }

    const { data: membership, error: membershipError } = await supabase
      .from('workspace_memberships')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) {
      res.status(403).json({ error: 'Your account is not assigned to a workspace' });
      return null;
    }

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', membership.workspace_id)
      .single();

    if (workspaceError) throw workspaceError;

    return { user, workspace, role: membership.role };
  } catch (error) {
    console.error('Error resolving authenticated workspace:', error);
    res.status(error.statusCode || 500).json({
      error:
        error.statusCode === 503
          ? error.message
          : 'Unable to verify workspace access. Please try again.',
    });
    return null;
  }
}
