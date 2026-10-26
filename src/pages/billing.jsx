import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import MainLayout from '../components/Layout/MainLayout';
import { authenticatedFetch } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
}

async function readResponse(response) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Billing request failed.');
  return result;
}

function formatDate(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BillingPage() {
  const { workspace } = useAuth();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadBilling = async () => {
    const response = await authenticatedFetch('/api/billing');
    setBilling(await readResponse(response));
  };

  useEffect(() => {
    let active = true;

    authenticatedFetch('/api/billing')
      .then(readResponse)
      .then((result) => {
        if (active) setBilling(result);
      })
      .catch((loadError) => {
        console.error('Unable to load billing page:', loadError);
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const startCheckout = async (planCode) => {
    setSelectedPlan(planCode);
    setError('');
    setMessage('');

    try {
      const response = await authenticatedFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode }),
      });
      const checkout = await readResponse(response);
      await loadRazorpayCheckout();

      const razorpay = new window.Razorpay({
        key: checkout.keyId,
        subscription_id: checkout.subscriptionId,
        name: 'DC Challan System',
        description: `${checkout.planName} monthly subscription`,
        theme: { color: '#C41E3A' },
        handler: async (payment) => {
          try {
            const verifyResponse = await authenticatedFetch('/api/billing/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payment),
            });
            await readResponse(verifyResponse);
            setMessage('Checkout verified. Your subscription status will update shortly.');
            await loadBilling();
          } catch (verificationError) {
            console.error('Unable to verify billing checkout:', verificationError);
            setError(verificationError.message);
          } finally {
            setSelectedPlan('');
          }
        },
        modal: {
          ondismiss: () => setSelectedPlan(''),
        },
      });

      razorpay.open();
    } catch (checkoutError) {
      console.error('Unable to start billing checkout:', checkoutError);
      setError(checkoutError.message);
      setSelectedPlan('');
    }
  };

  const subscription = billing?.subscription;
  const usage = billing?.usage;
  const isTrial = subscription?.status === 'trialing';

  return (
    <>
      <Head><title>Billing - DC System</title></Head>
      <MainLayout>
        <main style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem' }}>
          <header style={{ marginBottom: '1.5rem' }}>
            <h1>Plans and billing</h1>
            <p>Choose a plan for {workspace?.name || 'your workspace'}.</p>
          </header>

          {error && <p role="alert" style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>}
          {message && <p role="status" style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>{message}</p>}

          {loading ? (
            <p>Loading billing details...</p>
          ) : billing ? (
            <>
              <section
                aria-label="Current subscription"
                style={{
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                <h2>Current plan: {subscription.planName}</h2>
                <p>Status: {subscription.status}</p>
                {isTrial && <p>Free trial ends {formatDate(subscription.trialEndsAt)}.</p>}
                {usage.limit !== null && (
                  <p>
                    Documents this period: {usage.documents} / {usage.limit}
                  </p>
                )}
                {subscription.currentPeriodEnd && (
                  <p>Current period ends {formatDate(subscription.currentPeriodEnd)}.</p>
                )}
              </section>

              <section
                aria-label="Available subscription plans"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                  gap: '1rem',
                }}
              >
                {billing.plans.map((plan) => (
                  <article
                    key={plan.code}
                    style={{
                      padding: '1.25rem',
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border-light)',
                      borderRadius: 'var(--radius-lg)',
                    }}
                  >
                    <h2>{plan.name}</h2>
                    <p style={{ margin: '0.75rem 0' }}>
                      <strong style={{ fontSize: '1.5rem' }}>₹{plan.price}</strong> / month
                    </p>
                    <p>{plan.documentLimit} challans and invoices per month</p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ marginTop: '1rem' }}
                      disabled={
                        Boolean(selectedPlan) ||
                        (subscription.planCode === plan.code && subscription.status === 'active') ||
                        subscription.hasRazorpaySubscription
                      }
                      onClick={() => startCheckout(plan.code)}
                    >
                      {selectedPlan === plan.code
                        ? 'Starting checkout...'
                        : subscription.hasRazorpaySubscription
                          ? 'Subscription pending'
                          : 'Choose plan'}
                    </button>
                  </article>
                ))}

                <article
                  style={{
                    padding: '1.25rem',
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border-light)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <h2>Enterprise</h2>
                  <p style={{ margin: '0.75rem 0' }}><strong>Custom pricing</strong></p>
                  <p>Talk to us about higher document volumes and business requirements.</p>
                  {process.env.NEXT_PUBLIC_SUPPORT_EMAIL ? (
                    <a
                      href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
                      className="btn btn-secondary"
                      style={{ display: 'inline-block', marginTop: '1rem' }}
                    >
                      Contact us
                    </a>
                  ) : (
                    <p style={{ marginTop: '1rem' }}>Contact your system administrator about a custom plan.</p>
                  )}
                </article>
              </section>
              <p style={{ marginTop: '1.5rem', color: 'var(--color-text-secondary)' }}>
                New workspaces include a 7-day free trial. When you choose a paid plan during
                your trial, billing is scheduled to begin after the trial ends. Test checkout
                is enabled until live Razorpay credentials are intentionally configured.
              </p>
            </>
          ) : (
            <p role="alert">Billing details are unavailable.</p>
          )}
        </main>
      </MainLayout>
    </>
  );
}
