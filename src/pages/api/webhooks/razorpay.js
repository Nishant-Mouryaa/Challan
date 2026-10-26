import crypto from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const config = {
  api: {
    bodyParser: false,
  },
};

const subscriptionEvents = new Set([
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.paused',
  'subscription.resumed',
  'subscription.cancelled',
  'subscription.completed',
  'subscription.updated',
]);

const allowedStatuses = new Set([
  'authenticated',
  'active',
  'created',
  'pending',
  'halted',
  'paused',
  'cancelled',
  'completed',
  'expired',
]);

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let exceededLimit = false;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        exceededLimit = true;
        return;
      }
      if (!exceededLimit) chunks.push(chunk);
    });
    req.on('end', () => {
      if (exceededLimit) {
        reject(new Error('Webhook payload exceeds 1 MB.'));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });
    req.on('error', reject);
  });
}

function isValidSignature(body, signature, secret) {
  if (!/^[a-f\d]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest();
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Razorpay webhook secret is not configured.');
    return res.status(503).json({ error: 'Webhook endpoint is not configured.' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (error) {
    console.error('Unable to read Razorpay webhook payload:', error);
    return res.status(413).json({ error: 'Webhook payload is too large or could not be read.' });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (typeof signature !== 'string' || !isValidSignature(rawBody, signature, webhookSecret)) {
    return res.status(400).json({ error: 'Invalid webhook signature.' });
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8'));
    if (!subscriptionEvents.has(payload.event)) {
      return res.status(200).json({ received: true });
    }

    const eventId = req.headers['x-razorpay-event-id'];
    const subscription = payload.payload?.subscription?.entity;
    const createdAt = payload.created_at;
    if (
      typeof eventId !== 'string' ||
      typeof subscription?.id !== 'string' ||
      !Number.isInteger(createdAt)
    ) {
      return res.status(400).json({ error: 'Required webhook event details are missing.' });
    }

    const status = subscription.status;
    if (!allowedStatuses.has(status)) {
      return res.status(400).json({ error: 'Webhook contains an unsupported subscription status.' });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.rpc('apply_razorpay_subscription_event', {
      target_event_id: eventId,
      target_subscription_id: subscription.id,
      target_status: status,
      target_event_created_at: createdAt,
      target_period_start: subscription.current_start || null,
      target_period_end: subscription.current_end || null,
    });
    if (error) throw error;

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Unable to process Razorpay webhook:', error);
    return res.status(500).json({ error: 'Unable to process webhook event.' });
  }
}
