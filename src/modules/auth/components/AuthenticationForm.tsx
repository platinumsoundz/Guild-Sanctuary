'use client';

import { useState, type FormEvent } from 'react';
import type { WorldType } from '@/types';
import { MOCK_EMAIL_CODE, MOCK_TWO_FACTOR_CODE, type SignUpInput } from '../sessionStore';
import styles from './AuthenticationForm.module.css';

export type AuthMode = 'login' | 'signup';

interface AuthenticationFormProps {
  initialMode?: AuthMode;
  initialEmail?: string;
  onLogin: (email: string) => void;
  onSignup: (input: SignUpInput) => void;
  onVerifyEmailCode: (code: string) => boolean;
  onVerifyTwoFactorCode: (code: string) => void;
  onCancelChallenge: () => void;
  onSuccess?: () => void;
}

type AuthStep = 'credentials' | 'email-code' | 'two-factor-code';

const entryWorlds: { type: WorldType; title: string; description: string }[] = [
  { type: 'sanctuary', title: 'The Sanctuary', description: 'Reflect and grow' },
  { type: 'guild', title: 'The Guild Hall', description: 'Play and connect' },
];

export function AuthenticationForm({
  initialMode = 'signup',
  initialEmail = '',
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
  const [entryWorld, setEntryWorld] = useState<WorldType>('sanctuary');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    try {
      if (step === 'email-code') {
        const requiresTwoFactor = onVerifyEmailCode(verificationCode.trim());
        setVerificationCode('');
        if (requiresTwoFactor) {
          setStep('two-factor-code');
        } else {
          onSuccess?.();
        }
        return;
      }

      if (step === 'two-factor-code') {
        onVerifyTwoFactorCode(verificationCode.trim());
        onSuccess?.();
        return;
      }

      if (mode === 'signup') {
        onSignup({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim(),
          entryWorld,
        });
      } else {
        onLogin(email.trim());
      }

      setStep('email-code');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'We could not complete your request.');
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
        aria-label={step === 'email-code' ? 'Email verification' : step === 'two-factor-code' ? 'Two-factor verification' : mode === 'login' ? 'Sign in' : 'Create account'}
      >
        <form className={styles.form} onSubmit={handleSubmit}>
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

              <fieldset className={styles.entryFieldset}>
                <legend>Choose your entry world</legend>
                <div className={styles.entryWorlds}>
                  {entryWorlds.map((world) => (
                    <label
                      key={world.type}
                      className={styles.entryWorld}
                      data-selected={entryWorld === world.type}
                    >
                      <input
                        type="radio"
                        name="entryWorld"
                        value={world.type}
                        checked={entryWorld === world.type}
                        onChange={() => setEntryWorld(world.type)}
                      />
                      <span className={styles.entryWorldName}>{world.title}</span>
                      <span className={styles.entryWorldDescription}>{world.description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
                </>
              )}
            </>
          ) : (
            <>
              <p className={styles.challengeCopy}>
                {step === 'email-code'
                  ? `Enter the code sent to ${email}. For this local demo, use ${MOCK_EMAIL_CODE}.`
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

          <button className={styles.submitButton} type="submit">
            {step === 'email-code' ? 'Verify email' : step === 'two-factor-code' ? 'Verify and continue' : mode === 'signup' ? 'Continue to email verification' : 'Continue with email'}
          </button>
        </form>
        {step === 'credentials' && <p className={styles.disclaimer}>Local demo accounts are saved in this browser. Verification codes are mocked; no email is sent and no backend authentication is used.</p>}
      </div>
    </div>
  );
}