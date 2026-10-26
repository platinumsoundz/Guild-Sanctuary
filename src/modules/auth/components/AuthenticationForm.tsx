'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { MOCK_EMAIL_CODE, MOCK_TWO_FACTOR_CODE, type SignUpInput } from '../sessionStore';
import styles from './AuthenticationForm.module.css';

export type AuthMode = 'login' | 'signup';

interface AuthenticationFormProps {
  initialMode?: AuthMode;
  initialEmail?: string;
  initialError?: string | null;
  onLogin: (email: string) => void | Promise<void>;
  onSignup: (input: SignUpInput) => void | Promise<void>;
  onVerifyEmailCode: (code: string) => boolean | Promise<boolean>;
  onVerifyTwoFactorCode: (code: string) => void | Promise<void>;
  onCancelChallenge: () => void;
  onSuccess?: () => void;
}

type AuthStep = 'credentials' | 'email-code' | 'email-link' | 'two-factor-code';

export function AuthenticationForm({
  initialMode = 'signup',
  initialEmail = '',
  initialError = null,
  onLogin,
  onSignup,
  onVerifyEmailCode,
  onVerifyTwoFactorCode,
  onCancelChallenge,
  onSuccess,
}: AuthenticationFormProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<AuthStep>('credentials');
  const [email, setEmail] = useState(initialEmail);
  const [verificationCode, setVerificationCode] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialError) setError(initialError);
  }, [initialError]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (step === 'email-link') {
        if (mode === 'signup') {
          await onSignup({ email: email.trim(), username: username.trim(), displayName: displayName.trim() });
        } else {
          await onLogin(email.trim());
        }
        return;
      }

      if (step === 'email-code') {
        const requiresTwoFactor = await onVerifyEmailCode(verificationCode.trim());
        setVerificationCode('');
        if (requiresTwoFactor) {
          setStep('two-factor-code');
        } else {
          onSuccess?.();
        }
        return;
      }

      if (step === 'two-factor-code') {
        await onVerifyTwoFactorCode(verificationCode.trim());
        onSuccess?.();
        return;
      }

      if (mode === 'signup') {
        await onSignup({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim(),
        });
      } else {
        await onLogin(email.trim());
      }

      setStep(isSupabaseConfigured() ? 'email-link' : 'email-code');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not complete your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelChallenge = () => {
    onCancelChallenge();
    setVerificationCode('');
    setError(null);
    setStep('credentials');
  };

  return (
    <div className={styles.formContainer}>
      {step === 'credentials' && <div className={styles.modeTabs} role="tablist" aria-label="Authentication options">
        <button
          id="sign-in-tab"
          className={styles.modeTab}
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          aria-controls="authentication-panel"
          onClick={() => {
            setError(null);
            setMode('login');
          }}
        >
          Sign in
        </button>
        <button
          id="register-tab"
          className={styles.modeTab}
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          aria-controls="authentication-panel"
          onClick={() => {
            setError(null);
            setMode('signup');
          }}
        >
          Create account
        </button>
      </div>}

      <div
        id="authentication-panel"
        className={styles.panel}
        role="region"
        aria-label={step === 'email-link' ? 'Email link sent' : step === 'email-code' ? 'Email verification' : step === 'two-factor-code' ? 'Two-factor verification' : mode === 'login' ? 'Sign in' : 'Create account'}
      >
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          {step === 'credentials' ? (
            <>
              <label className={styles.field} htmlFor="auth-email">
                <span>Email address</span>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  required
                />
              </label>
              {mode === 'signup' && (
                <>
                  <label className={styles.field} htmlFor="auth-username">
                    <span>Username</span>
                    <input
                      id="auth-username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      minLength={3}
                      maxLength={24}
                      pattern="[A-Za-z0-9_]{3,24}"
                      value={username}
                      onChange={(event) => setUsername(event.currentTarget.value)}
                      required
                    />
                  </label>
                  <label className={styles.field} htmlFor="auth-display-name">
                    <span>Display name</span>
                    <input
                      id="auth-display-name"
                      name="displayName"
                      type="text"
                      autoComplete="nickname"
                      maxLength={50}
                      value={displayName}
                      onChange={(event) => setDisplayName(event.currentTarget.value)}
                      required
                    />
                  </label>
                  <div className={styles.termsConsent}>
                    <label className={styles.termsCheckbox} htmlFor="auth-terms-accepted">
                      <input
                        id="auth-terms-accepted"
                        name="termsAccepted"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(event) => setTermsAccepted(event.currentTarget.checked)}
                        required
                      />
                      <span>
                        I have read and agree to the{' '}
                        <a href="https://github.com/platinumsoundz/Guild-Sanctuary/blob/automation/free-scheduled-ci-foundation/TERMS_AND_CONDITIONS_DRAFT.md" target="_blank" rel="noreferrer">
                          Terms and Conditions draft
                        </a>.
                      </span>
                    </label>
                    <p className={styles.termsWarning}>
                      Draft only — these terms are not final or approved for production use.
                    </p>
                  </div>
                </>
              )}
            </>
          ) : step === 'email-link' ? (
            <>
              <p className={styles.challengeCopy} role="status">
                We sent a secure link to <strong>{email}</strong>. Open it in this browser to verify your email and continue. You do not need to enter a code.
              </p>
              <button className={styles.backButton} type="button" onClick={cancelChallenge}>
                Back to {mode === 'signup' ? 'registration' : 'sign in'}
              </button>
            </>
          ) : (
            <>
              <p className={styles.challengeCopy}>
                {step === 'email-code'
                  ? `Enter the code sent to ${email}. For this local demo, use ${MOCK_EMAIL_CODE}.`
                  : isSupabaseConfigured()
                    ? 'Enter the code from your authenticator app.'
                    : `Enter your second-factor code. For this local demo, use ${MOCK_TWO_FACTOR_CODE}.`}
              </p>
              <label className={styles.field} htmlFor="auth-verification-code">
                <span>{step === 'email-code' ? 'Email verification code' : 'Two-factor code'}</span>
                <input
                  id="auth-verification-code"
                  name="verificationCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.currentTarget.value)}
                  required
                />
              </label>
              <button className={styles.backButton} type="button" onClick={cancelChallenge}>
                Back to {mode === 'signup' && step === 'email-code' ? 'registration' : 'sign in'}
              </button>
            </>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : step === 'email-link' ? 'Resend email link' : step === 'email-code' ? 'Verify email' : step === 'two-factor-code' ? 'Verify and continue' : mode === 'signup' ? 'Continue to email verification' : 'Continue with email'}
          </button>
        </form>
        {step === 'credentials' && <p className={styles.disclaimer}>{isSupabaseConfigured()
          ? 'We use Supabase Auth for email verification. If you have enabled an authenticator, you will be asked for its current code.'
          : 'Local demo accounts are saved in this browser. Verification codes are mocked; no email is sent and no backend authentication is used.'}</p>}
      </div>
    </div>
  );
}

function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
