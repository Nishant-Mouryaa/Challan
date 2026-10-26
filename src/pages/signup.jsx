import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getSupabaseClient } from '../lib/supabaseClient';
import styles from '../styles/auth.module.css';

export default function SignupPage() {
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { data, error: signupError } = await getSupabaseClient().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { business_name: businessName.trim() },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (signupError) throw signupError;

      setMessage(
        data.session
          ? 'Your workspace is ready. Redirecting to the dashboard...'
          : 'Check your email to confirm your account, then sign in to your workspace.'
      );
    } catch (signupError) {
      console.error('Unable to create business account:', signupError);
      setError(signupError.message || 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>Create business account - DC System</title></Head>
      <main className={styles.authPage}>
        <form className={styles.authCard} onSubmit={handleSubmit}>
          <h1>Create your workspace</h1>
          <p>Your business data will be kept in its own workspace.</p>
          {error && <div className={styles.error} role="alert">{error}</div>}
          {message && <div className={styles.success} role="status">{message}</div>}
          <label>
            Business name
            <input
              type="text"
              minLength="2"
              maxLength="120"
              autoComplete="organization"
              required
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />
          </label>
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
              autoComplete="new-password"
              minLength="8"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating workspace...' : 'Create account'}
          </button>
          <p>Already have an account? <Link href="/login">Sign in</Link></p>
        </form>
      </main>
    </>
  );
}
