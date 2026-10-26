import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getSupabaseClient } from '../lib/supabaseClient';
import styles from '../styles/auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      const next = typeof router.query.next === 'string' ? router.query.next : '/';
      await router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (signInError) {
      console.error('Unable to sign in:', signInError);
      setError(signInError.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Sign in - DC System</title></Head>
      <main className={styles.authPage}>
        <form className={styles.authCard} onSubmit={handleSubmit}>
          <h1>Sign in</h1>
          <p>Access your business workspace.</p>
          {error && <div className={styles.error} role="alert">{error}</div>}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p>New here? <Link href="/signup">Create a business account</Link></p>
        </form>
      </main>
    </>
  );
}
