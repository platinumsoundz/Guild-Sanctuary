'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/services/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 10) {
      setError('Use a password with at least 10 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const client = getSupabaseBrowserClient();
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('This password reset link is invalid or has expired. Request a new one from the sign-in page.');
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage('Your password has been updated. You can now sign in with your email and new password.');
      setPassword('');
      setConfirmPassword('');
      window.setTimeout(() => router.replace('/'), 1400);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your password could not be updated.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main style={{ maxWidth: 440, margin: '64px auto', padding: 24, color: 'var(--ink, #25372c)' }}>
      <p style={{ fontSize: 11, letterSpacing: 1.4, fontWeight: 700 }}>THE SANCTUARY</p>
      <h1 style={{ fontSize: 32, margin: '12px 0' }}>Reset your password</h1>
      <p style={{ color: 'var(--muted, #68776c)', lineHeight: 1.6 }}>Choose a new password with at least 10 characters.</p>
      <form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
        <label style={{ display: 'grid', gap: 7 }}>New password
          <input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={password} onChange={event => setPassword(event.currentTarget.value)} style={{ padding: 12, border: '1px solid var(--line, #dce4dc)', borderRadius: 4, background: 'var(--surface, #fbfcf9)' }} />
        </label>
        <label style={{ display: 'grid', gap: 7 }}>Confirm new password
          <input type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={confirmPassword} onChange={event => setConfirmPassword(event.currentTarget.value)} style={{ padding: 12, border: '1px solid var(--line, #dce4dc)', borderRadius: 4, background: 'var(--surface, #fbfcf9)' }} />
        </label>
        {error && <p role="alert" style={{ color: '#b33b32', fontSize: 13 }}>{error}</p>}
        {message && <p role="status" style={{ color: 'var(--accent, #52765c)', fontSize: 13 }}>{message}</p>}
        <button type="submit" disabled={busy} style={{ padding: 12, borderRadius: 4, background: 'var(--accent, #52765c)', color: 'white', fontWeight: 700 }}>{busy ? 'Updating…' : 'Update password'}</button>
      </form>
    </main>
  );
}
