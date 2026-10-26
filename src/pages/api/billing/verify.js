import crypto from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { requireWorkspace } from '../../../lib/apiAuth';
import { getRazorpayConfig, razorpayRequest } from '../../../lib/razorpay';

function safeEqualHex(left, right) {
  if (!/^[a-f\d]{64}$/i.test(left) || !/^[a-f\d]{64}$/i.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const access = await requireWorkspace(req, res);
  if (!access) return;

  const { razorpay_payment_id: paymentId, razorpay_subscription_id: subscriptionId, razorpay_signature: signature } =
    req.body || {};
  if (
    typeof paymentId !== 'string' ||
    typeof subscriptionId !== 'string' ||
    typeof signature !== 'string'
  ) {
    return res.status(400).json({ error: 'Checkout verification details are incomplete.' });
  }

  try {
    const { keySecret } = getRazorpayConfig();
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');
    if (!safeEqualHex(signature, expected)) {
      return res.status(400).json({ error: 'Razorpay checkout signature is invalid.' });
    }

    const supabase = getSupabaseAdmin();
    const { data: current, error: readError } = await supabase
      .from('workspace_subscriptions')
      .select('razorpay_subscription_id')
      .eq('workspace_id', access.workspace.id)
      .maybeSingle();
    if (readError) throw readError;
    if (current?.razorpay_subscription_id !== subscriptionId) {
      return res.status(400).json({ error: 'Subscription does not belong to this workspace.' });
    }

    const verified = await razorpayRequest(
      `/subscriptions/${encodeURIComponent(subscriptionId)}`
    );
    return res.status(200).json({ status: verified.status });
  } catch (error) {
    console.error('Unable to verify Razorpay checkout:', error);
    return res.status(error.statusCode || 500).json({
      error:
        error.statusCode === 503 || error.statusCode === 502
          ? error.message
          : 'Unable to verify checkout. Contact support before retrying payment.',
    });
  }
}
