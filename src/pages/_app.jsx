import '../styles/globals.css';
import '../styles/print.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../context/AuthContext';

function AuthGate({ children }) {
  const router = useRouter();
  const { session, workspace, isLoading, error, configurationError, signOut } = useAuth();
  const isPublicPage = ['/login', '/signup'].includes(router.pathname);
  const isBillingPage = router.pathname === '/billing';
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    if (!router.isReady || isLoading) return;
    if (isPublicPage && session && workspace) {
      router.replace('/');
    } else if (!isPublicPage && !session) {
      const next = encodeURIComponent(router.asPath);
      router.replace(`/login?next=${next}`);
    } else if (
      !isPublicPage &&
      !isBillingPage &&
      workspace?.subscription &&
      !hasEntitlement(workspace.subscription)
    ) {
      router.replace('/billing');
    }
  }, [isBillingPage, isLoading, isPublicPage, router, session, workspace]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (signOutError) {
      console.error('Unable to sign out:', signOutError);
      setSignOutError('Unable to sign out. Please try again.');
    }
  };

  if (isPublicPage) return children;
  if (configurationError) return <p role="alert">{configurationError}</p>;
  if (isLoading || !session) return <p>Checking your sign-in...</p>;
  if (error || !workspace) {
    return (
      <main style={{ maxWidth: 560, margin: '4rem auto', padding: '1.5rem' }}>
        <p role="alert">{error || 'Your account does not have a workspace.'}</p>
        <button type="button" onClick={handleSignOut}>Sign out</button>
        {signOutError && <p role="alert">{signOutError}</p>}
      </main>
    );
  }
  if (!isBillingPage && !hasEntitlement(workspace.subscription)) {
    return (
      <main style={{ maxWidth: 560, margin: '4rem auto', padding: '1.5rem' }}>
        <h1>Choose a subscription plan</h1>
        <p>Your free trial has ended. Select a plan to continue using your workspace.</p>
        <button type="button" onClick={() => router.replace('/billing')}>
          View plans
        </button>
      </main>
    );
  }

  return children;
}

function hasEntitlement(subscription) {
  if (!subscription) return false;
  if (subscription.status === 'active') return true;
  return (
    subscription.status === 'trialing' &&
    new Date(subscription.trialEndsAt).getTime() > Date.now()
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AuthGate>
        <Component {...pageProps} />
      </AuthGate>
    </AuthProvider>
  );
}

export default MyApp;