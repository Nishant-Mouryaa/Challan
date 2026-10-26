import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { requireWorkspace } from '../../lib/apiAuth';
import { BILLING_PLANS } from '../../lib/razorpay';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireWorkspace(req, res);
  if (!access) return;

  try {
    const supabase = getSupabaseAdmin();
    const { data: subscription, error: subscriptionError } = await supabase
      .from('workspace_subscriptions')
      .select(
        'plan_code, status, trial_started_at, trial_ends_at, current_period_start, current_period_end, razorpay_subscription_id'
      )
      .eq('workspace_id', access.workspace.id)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;
    if (!subscription) {
      return res.status(503).json({
        error: 'Billing is not initialized. Apply the subscriptions database migration.',
      });
    }

    const periodStart =
      subscription.current_period_start || subscription.trial_started_at;
    const { count, error: countError } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', access.workspace.id)
      .gte('created_at', periodStart);

    if (countError) throw countError;

    const currentPlan = BILLING_PLANS[subscription.plan_code];
    return res.status(200).json({
      subscription: {
        planCode: subscription.plan_code,
        planName: currentPlan?.name || 'Enterprise',
        status: subscription.status,
        trialEndsAt: subscription.trial_ends_at,
        currentPeriodEnd: subscription.current_period_end,
        hasRazorpaySubscription: Boolean(subscription.razorpay_subscription_id),
      },
      usage: {
        documents: count || 0,
        limit: currentPlan?.documentLimit ?? null,
      },
      plans: Object.entries(BILLING_PLANS).map(([code, plan]) => ({
        code,
        name: plan.name,
        price: plan.price,
        documentLimit: plan.documentLimit,
      })),
    });
  } catch (error) {
    console.error('Unable to load workspace billing:', error);
    return res.status(error.statusCode || 500).json({
      error:
        error.statusCode === 503
          ? error.message
          : 'Unable to load billing details. Please try again.',
    });
  }
}
