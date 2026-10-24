import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms draft | The Sanctuary',
  description: 'A working draft of The Sanctuary Terms and Conditions. Not yet in force.',
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5 text-sm text-amber-100">
        <strong className="font-semibold">Draft only — not in force.</strong> This page is a working
        draft for review. It is not final legal advice, has not been reviewed by qualified counsel, and
        must not be presented as the accepted Terms at signup or used to support live token sales.
      </div>

      <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Legal</p>
      <h1 className="mt-3 text-4xl font-semibold text-white">Terms and Conditions (draft)</h1>
      <p className="mt-4 text-neutral-400">
        Effective date: [DATE] · Operator: [LEGAL NAME] · Contact: [SUPPORT EMAIL / POSTAL ADDRESS] ·
        Governing law: [JURISDICTION] · Minimum age: [MINIMUM AGE]
      </p>

      <div className="mt-10 space-y-8 text-neutral-300">
        <section>
          <h2 className="text-2xl font-semibold text-white">1. About these terms</h2>
          <p className="mt-3">
            These terms govern use of The Sanctuary website and related services (the “Service”). By
            creating an account, you confirm that you have read and accepted the version of these terms
            shown during signup. If you do not agree, do not create an account. Acceptance must be
            explicit and recorded with the document version and a server-recorded time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">2. Eligibility and accounts</h2>
          <p className="mt-3">
            You may use the Service only if you meet the minimum age shown above and can legally agree
            to these terms. Keep your account details accurate, protect access to your account, and tell
            us promptly if you believe someone else has accessed it. Do not impersonate another person
            or create accounts to evade restrictions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">3. Community conduct and moderation</h2>
          <p className="mt-3">
            Use the Service lawfully and respectfully. Do not harass, threaten, exploit, spam,
            impersonate, or post unlawful or infringing material; do not interfere with the Service or
            other users. We may review reports, remove content, limit features, suspend accounts, or
            terminate accounts when reasonably necessary to protect users, comply with law, or enforce
            these terms. The Community Guidelines and appeal path are published separately.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">4. User content</h2>
          <p className="mt-3">
            You retain ownership of content you submit. You give the Service a limited, non-exclusive
            permission to host, store, reproduce, and display that content as needed to operate and
            improve the Service and show it to the audiences you select. You confirm you have the rights
            needed to post it. The approved licence scope, retention after deletion, and any use in
            promotion must be confirmed before publication.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">5. Tokens and digital features</h2>
          <p className="mt-3">
            Tokens are account-bound digital units for use only in features that The Sanctuary makes
            available. They have no cash value, are not money or a deposit, and cannot be transferred,
            traded, sold, or cashed out. Token purchases and redemptions are currently disabled by
            default; planned features are not promised or available until visibly launched.
          </p>
          <p className="mt-3">
            Before any live token sale or redemption is enabled, The Sanctuary will publish the
            applicable prices, purchase and refund/cancellation terms, treatment of disputes or
            chargebacks, and rules for any token-funded features. The intended policy is to claw back
            unspent tokens after a refund or chargeback and to send spent-token cases to manual support
            review. That policy is not implemented yet.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">6. Availability and changes</h2>
          <p className="mt-3">
            The Service and its features may change, be unavailable, or be discontinued. We will make
            reasonable efforts to communicate material changes where appropriate. Any statutory
            consumer rights that cannot lawfully be excluded remain unaffected.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">7. Account suspension and deletion</h2>
          <p className="mt-3">
            You may stop using the Service and request account deletion through the available account
            controls. The intended process hides the profile immediately, allows restoration by signing
            in within seven days, and purges the account after that window. The current code still uses
            the immediate-deletion flow. We may suspend or terminate access for serious or repeated
            violations, subject to applicable law and any appeal process we publish.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">8. Privacy</h2>
          <p className="mt-3">
            Our separate Privacy Notice explains what personal data we collect, why we use it, how long
            we retain it, and how to exercise applicable rights. See the{' '}
            <Link className="text-emerald-300 underline decoration-emerald-300/40 underline-offset-4" href="/privacy">
              Privacy notice
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">9. Disclaimers and liability</h2>
          <p className="mt-3">
            The Service is provided subject to applicable law. Nothing in these terms excludes liability
            or consumer rights that cannot lawfully be excluded. Warranty, liability, and consumer-rights
            language must be drafted for the selected jurisdiction by qualified counsel.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-white">10. Changes and contact</h2>
          <p className="mt-3">
            We may update these terms. For material changes, we will provide notice and ask users to
            accept the new version where required. The version and acceptance time should be retained
            for each account. Questions or complaints: [SUPPORT EMAIL / POSTAL ADDRESS].
          </p>
        </section>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 hover:border-emerald-300 hover:text-white"
          href="/guidelines"
        >
          Community guidelines
        </Link>
        <Link
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 hover:border-emerald-300 hover:text-white"
          href="/"
        >
          Back to The Sanctuary
        </Link>
      </div>
    </main>
  );
}
