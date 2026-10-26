import '../styles/globals.css';
import '../styles/print.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../context/AuthContext';

function AuthGate({ children }) {
  const router = useRouter();
  const { session, workspace, isLoading, error, configurationError, signOut } = useAuth();
  const isPublicPage = ['/login', '/signup'].includes(router.pathname);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    if (!router.isReady || isLoading) return;
    if (isPublicPage && session && workspace) {
      router.replace('/');
    } else if (!isPublicPage && !session) {
      const next = encodeURIComponent(router.asPath);
      router.replace(`/login?next=${next}`);
    }
  }, [isLoading, isPublicPage, router, session, workspace]);

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

  return children;
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