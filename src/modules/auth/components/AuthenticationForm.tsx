'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { MOCK_TWO_FACTOR_CODE, type SignUpInput } from '../sessionStore';
import styles from './AuthenticationForm.module.css';

export type AuthMode = 'login' | 'signup';
interface AuthenticationFormProps {
  initialMode?: AuthMode;
  initialEmail?: string;
  initialError?: string | null;
  onLogin: (email: string, password: string) => void | Promise<void>;
  onSignup: (input: SignUpInput, password: string) => boolean | Promise<boolean>;
  onResetPassword: (email: string) => void | Promise<void>;
  onVerifyEmailCode: (code: string) => boolean | Promise<boolean>;
  onVerifyTwoFactorCode: (code: string) => void | Promise<void>;
  onCancelChallenge: () => void;
  onSuccess?: () => void;
}

type AuthStep = 'credentials' | 'signup-confirm' | 'email-code' | 'two-factor-code' | 'reset-email';

export function AuthenticationForm({
  initialMode = 'signup',
  initialEmail = '',
  initialError = null,
  onLogin,
  onSignup,
  onResetPassword,
  onVerifyEmailCode,
  onVerifyTwoFactorCode,
  onCancelChallenge,
  onSuccess,
}: AuthenticationFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>('credentials');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { if (initialError) setError(initialError); }, [initialError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      if (step === 'reset-email') {
        await onResetPassword(email.trim());
        setNotice('If an account exists for that address, a password reset link will arrive by email.');
        return;
      }
      if (step === 'email-code') {
        const requiresTwoFactor = await onVerifyEmailCode(verificationCode.trim());
        setVerificationCode('');
        if (requiresTwoFactor) setStep('two-factor-code');
        else onSuccess?.();
        return;
      }
      if (step === 'two-factor-code') {
        await onVerifyTwoFactorCode(verificationCode.trim());
        onSuccess?.();
        return;
      }
      if (step !== 'credentials') return;

      if (mode === 'signup') {
        if (password.length < 10) throw new Error('Use a password with at least 10 characters.');
        if (password !== confirmPassword) throw new Error('The passwords do not match.');
        const needsConfirmation = await onSignup({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim(),
        }, password);
        if (needsConfirmation) {
          setStep('signup-confirm');
          setPassword('');
          setConfirmPassword('');
        } else {
          onSuccess?.();
        }
      } else {
        await onLogin(email.trim(), password);
        setPassword('');
        onSuccess?.();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not complete your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelChallenge = () => {
    onCancelChallenge();
    setVerificationCode('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setNotice(null);
    setStep('credentials');
  };

  return (
    <div className={styles.formContainer}>
      {step === 'credentials' && (
        <div className={styles.modeTabs} role="tablist" aria-label="Authentication options">
          <button id="sign-in-tab" className={styles.modeTab} type="button" role="tab"
            aria-selected={mode === 'login'} aria-controls="authentication-panel"
            onClick={() => { setError(null); setNotice(null); setMode('login'); }}>
            Sign in
          </button>
          <button id="register-tab" className={styles.modeTab} type="button" role="tab"
            aria-selected={mode === 'signup'} aria-controls="authentication-panel"
            onClick={() => { setError(null); setNotice(null); setMode('signup'); }}>
            Create account
          </button>
        </div>
      )}
      <div id="authentication-panel" className={styles.panel} role="region"
        aria-label={step === 'signup-confirm' ? 'Confirm email' : step === 'reset-email' ? 'Reset password' : step === 'email-code' || step === 'two-factor-code' ? 'Security verification' : mode === 'login' ? 'Sign in' : 'Create account'}>
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          {step === 'credentials' && <>
            <label className={styles.field} htmlFor="auth-email"><span>Email address</span>
              <input id="auth-email" name="email" type="email" autoComplete="email" maxLength={254}
                value={email} onChange={(event) => setEmail(event.currentTarget.value)} required />
            </label>
            {mode === 'signup' && <>
              <label className={styles.field} htmlFor="auth-username"><span>Username</span>
                <input id="auth-username" name="username" type="text" autoComplete="username"
                  minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" value={username}
                  onChange={(event) => setUsername(event.currentTarget.value)} required />
              </label>
              <label className={styles.field} htmlFor="auth-display-name"><span>Display name</span>
                <input id="auth-display-name" name="displayName" type="text" autoComplete="nickname"
                  maxLength={50} value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} required />
              </label>
            </>}
            <label className={styles.field} htmlFor="auth-password"><span>Password</span>
              <input id="auth-password" name="password" type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 10 : undefined} maxLength={128}
                value={password} onChange={(event) => setPassword(event.currentTarget.value)} required />
            </label>
            {mode === 'signup' && <label className={styles.field} htmlFor="auth-confirm-password"><span>Confirm password</span>
              <input id="auth-confirm-password" name="confirmPassword" type="password" autoComplete="new-password"
                minLength={10} maxLength={128} value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.currentTarget.value)} required />
            </label>}
            {mode === 'login' && <button className={styles.backButton} type="button" onClick={() => {
              setStep('reset-email'); setPassword(''); setError(null); setNotice(null);
            }}>Forgot password?</button>}
          </>}
          {step === 'signup-confirm' && <p className={styles.challengeCopy} role="status">
            Your account request is saved. Check <strong>{email}</strong> once to confirm your email address, then sign in with your email and password. You will not need an email link for every sign-in.
          </p>}
          {step === 'reset-email' && <>
            <p className={styles.challengeCopy}>Enter your account email and we’ll send a password reset link if the account exists.</p>
            <label className={styles.field} htmlFor="reset-email"><span>Email address</span>
              <input id="reset-email" type="email" autoComplete="email" value={email}
                onChange={(event) => setEmail(event.currentTarget.value)} required />
            </label>
            <button className={styles.backButton} type="button" onClick={() => { setStep('credentials'); setError(null); setNotice(null); }}>Back to sign in</button>
          </>}
          {(step === 'email-code' || step === 'two-factor-code') && <>
            <p className={styles.challengeCopy}>{step === 'email-code' ? `Enter the verification code sent to ${email}.` : isSupabaseConfigured() ? 'Enter the code from your authenticator app.' : `Local demo code: ${MOCK_TWO_FACTOR_CODE}.`}</p>
            <label className={styles.field} htmlFor="auth-verification-code"><span>{step === 'email-code' ? 'Email verification code' : 'Two-factor code'}</span>
              <input id="auth-verification-code" name="verificationCode" type="text" inputMode="numeric"
                autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6}
                value={verificationCode} onChange={(event) => setVerificationCode(event.currentTarget.value)} required />
            </label>
            <button className={styles.backButton} type="button" onClick={cancelChallenge}>Back to sign in</button>
          </>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          {notice && <p className={styles.challengeCopy} role="status">{notice}</p>}
          {step !== 'signup-confirm' && <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : step === 'reset-email' ? 'Send reset link' : step === 'email-code' ? 'Verify email' : step === 'two-factor-code' ? 'Verify and continue' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>}
          {step === 'signup-confirm' && <button className={styles.submitButton} type="button" onClick={() => { setStep('credentials'); setMode('login'); setPassword(''); setError(null); }}>Return to sign in</button>}
        </form>
        {step === 'credentials' && <p className={styles.disclaimer}>{isSupabaseConfigured()
          ? 'Use your email and password to sign in. Email is only needed to confirm a new account or reset a forgotten password. Sessions are restored automatically on this device.'
          : 'Secure password accounts require the Supabase Auth configuration. Local demo accounts are not real accounts and are not safe for passwords.'}</p>}
      </div>
    </div>
  );
}

function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
