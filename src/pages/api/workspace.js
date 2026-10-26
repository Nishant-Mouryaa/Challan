import { requireWorkspace } from '../../lib/apiAuth';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireWorkspace(req, res);
  if (!access) return;

  const supabase = getSupabaseAdmin();
  const { data: subscription, error } = await supabase
    .from('workspace_subscriptions')
    .select('plan_code, status, trial_ends_at')
    .eq('workspace_id', access.workspace.id)
    .maybeSingle();

  if (error) {
    console.error('Unable to load workspace subscription:', error);
    return res.status(500).json({ error: 'Unable to load workspace billing status.' });
  }

  return res.status(200).json({
    id: access.workspace.id,
    name: access.workspace.name,
    role: access.role,
    email: access.user.email,
    subscription: subscription
      ? {
          planCode: subscription.plan_code,
          status: subscription.status,
          trialEndsAt: subscription.trial_ends_at,
        }
      : null,
  });
}
