import type { SignUpInput } from '../sessionStore';
import { AuthenticationForm } from './AuthenticationForm';
import styles from './AuthenticationGateway.module.css';

interface AuthenticationGatewayProps {
  onLogin: (email: string) => void;
  onSignup: (input: SignUpInput) => void;
  onVerifyEmailCode: (code: string) => boolean;
  onVerifyTwoFactorCode: (code: string) => void;
  onCancelChallenge: () => void;
}

export function AuthenticationGateway({
  onLogin,
  onSignup,
  onVerifyEmailCode,
  onVerifyTwoFactorCode,
  onCancelChallenge,
}: AuthenticationGatewayProps) {
  return (
    <main className={styles.gateway}>
      <section className={styles.introduction}>
        <p className={styles.eyebrow}>GUILD &amp; SANCTUARY</p>
        <h1>One community.<br />Two worlds.</h1>
        <p className={styles.description}>Find a place to reflect, make room for play, and meet people along the way.</p>
      </section>
      <section className={styles.formPanel} aria-label="Sign in or create an account">
        <AuthenticationForm
          onLogin={onLogin}
          onSignup={onSignup}
          onVerifyEmailCode={onVerifyEmailCode}
          onVerifyTwoFactorCode={onVerifyTwoFactorCode}
          onCancelChallenge={onCancelChallenge}
        />
      </section>
    </main>
  );
}