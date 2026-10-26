import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireWorkspace } from '../../../lib/apiAuth';
import { BILLING_PLANS, getRazorpayConfig, razorpayRequest } from '../../../lib/razorpay';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireWorkspace(req, res);
  if (!access) return;

  const plan = BILLING_PLANS[req.body?.planCode];
  if (!plan) return res.status(400).json({ error: 'Choose a valid subscription plan.' });

  try {
    const { keyId } = getRazorpayConfig();
    const planId = plan.razorpayPlanId();
    if (!planId) {
      return res.status(503).json({
        error: `Razorpay monthly plan ID for ${plan.name} is not configured.`,
      });
    }

    const supabase = getSupabaseAdmin();
    const { data: current, error: readError } = await supabase
      .from('workspace_subscriptions')
      .select('status, trial_ends_at, razorpay_subscription_id')
      .eq('workspace_id', access.workspace.id)
      .maybeSingle();

    if (readError) throw readError;
    if (!current) return res.status(503).json({ error: 'Workspace billing is not initialized.' });
    if (current.razorpay_subscription_id) {
      return res.status(409).json({
        error: 'A Razorpay subscription is already linked to this workspace.',
      });
    }
    if (!['trialing', 'expired', 'cancelled', 'halted', 'completed'].includes(current.status)) {
      return res.status(409).json({ error: 'This workspace already has an active billing cycle.' });
    }

    const trialEnd = Math.floor(new Date(current.trial_ends_at).getTime() / 1000);
    const startAt = Math.max(trialEnd, Math.floor(Date.now() / 1000) + 15 * 60);
    const created = await razorpayRequest('/subscriptions', {
      plan_id: planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      start_at: startAt,
    });

    const { data: saved, error: updateError } = await supabase
      .from('workspace_subscriptions')
      .update({
        plan_code: req.body.planCode,
        razorpay_plan_id: planId,
        razorpay_subscription_id: created.id,
        updated_at: new Date().toISOString(),
      })
      .eq('workspace_id', access.workspace.id)
      .is('razorpay_subscription_id', null)
      .select('workspace_id')
      .maybeSingle();

    if (updateError) {
      try {
        await razorpayRequest(`/subscriptions/${encodeURIComponent(created.id)}/cancel`, {
          cancel_at_cycle_end: false,
        });
      } catch (cancelError) {
        console.error('Unable to cancel orphaned Razorpay subscription:', cancelError);
      }
      throw updateError;
    }

    if (!saved) {
      try {
        await razorpayRequest(`/subscriptions/${encodeURIComponent(created.id)}/cancel`, {
          cancel_at_cycle_end: false,
        });
      } catch (cancelError) {
        console.error('Unable to cancel duplicate Razorpay subscription:', cancelError);
      }
      return res.status(409).json({
        error: 'A subscription checkout was started in another tab. Reload billing and try again.',
      });
    }

    return res.status(201).json({
      keyId,
      subscriptionId: created.id,
      planName: plan.name,
    });
  } catch (error) {
    console.error('Unable to create Razorpay subscription:', error);
    return res.status(error.statusCode || 500).json({
      error:
        error.statusCode === 503 || error.statusCode === 502
          ? error.message
          : 'Unable to start checkout. Please try again.',
    });
  }
}
