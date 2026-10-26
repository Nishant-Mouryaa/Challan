import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [configurationError, setConfigurationError] = useState('');

  useEffect(() => {
    let active = true;
    let subscription;

    try {
      const supabase = getSupabaseClient();
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setWorkspace(null);
        setError('');
        setIsLoading(Boolean(nextSession));
      });
      subscription = authSubscription;

      supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          setError('Unable to restore your session. Please sign in again.');
          console.error('Error restoring authentication session:', sessionError);
        }
        setSession(data.session);
        if (!data.session) setIsLoading(false);
      });
    } catch (clientError) {
      setConfigurationError(clientError.message);
      setIsLoading(false);
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return undefined;

    let active = true;
    setIsLoading(true);
    setError('');

    fetch('/api/workspace', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load workspace');
        return result;
      })
      .then((result) => {
        if (active) setWorkspace(result);
      })
      .catch((workspaceError) => {
        if (active) setError(workspaceError.message);
        console.error('Error loading authenticated workspace:', workspaceError);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const signOut = async () => {
    const { error: signOutError } = await getSupabaseClient().auth.signOut();
    if (signOutError) throw signOutError;
  };

  return (
    <AuthContext.Provider
      value={{ session, workspace, isLoading, error, configurationError, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
