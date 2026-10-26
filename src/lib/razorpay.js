export const BILLING_PLANS = {
  starter: {
    name: 'Starter',
    price: 499,
    documentLimit: 100,
    razorpayPlanId: () => process.env.RAZORPAY_PLAN_STARTER_ID,
  },
  business: {
    name: 'Business',
    price: 1499,
    documentLimit: 500,
    razorpayPlanId: () => process.env.RAZORPAY_PLAN_BUSINESS_ID,
  },
};

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || !keyId.startsWith('rzp_test_')) {
    const error = new Error(
      'Razorpay test mode is not configured. Set a test key ID and key secret.'
    );
    error.statusCode = 503;
    throw error;
  }

  return { keyId, keySecret };
}

export async function razorpayRequest(path, body) {
  const { keyId, keySecret } = getRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const result = await response.json();
  if (!response.ok) {
    const error = new Error(
      result.error?.description || 'Razorpay could not process this request.'
    );
    error.statusCode = response.status === 429 ? 503 : 502;
    throw error;
  }

  return result;
}

export function getSubscriptionPeriodStart(subscription) {
  const value = subscription.current_period_start;
  return Number.isInteger(value) && value > 0 ? new Date(value * 1000).toISOString() : null;
}
