import type { SignUpInput } from '../sessionStore';
import { AuthenticationForm } from './AuthenticationForm';
import styles from './AuthenticationGateway.module.css';

interface AuthenticationGatewayProps {
  initialError?: string | null;
  onLogin: (email: string, password: string) => boolean | void | Promise<boolean | void>;
  onSignup: (input: SignUpInput, password: string) => boolean | Promise<boolean>;
  onResetPassword: (email: string) => void | Promise<void>;
  onVerifyEmailCode: (code: string) => boolean | Promise<boolean>;
  onVerifyTwoFactorCode: (code: string) => void | Promise<void>;
  onCancelChallenge: () => void;
}

export function AuthenticationGateway({ initialError, onLogin, onSignup, onResetPassword, onVerifyEmailCode, onVerifyTwoFactorCode, onCancelChallenge }: AuthenticationGatewayProps) {
  return (
    <main className={styles.gateway}>
      <section className={styles.introduction}>
        <p className={styles.eyebrow}>THE SANCTUARY</p>
        <h1>A community<br />to pause and grow.</h1>
        <p className={styles.description}>Reflect, share what matters, and meet people with care.</p>
      </section>
      <section className={styles.formPanel} aria-label="Sign in or create an account">
        <AuthenticationForm initialError={initialError} onLogin={onLogin} onSignup={onSignup}
          onResetPassword={onResetPassword} onVerifyEmailCode={onVerifyEmailCode}
          onVerifyTwoFactorCode={onVerifyTwoFactorCode} onCancelChallenge={onCancelChallenge} />
      </section>
    </main>
  );
}
