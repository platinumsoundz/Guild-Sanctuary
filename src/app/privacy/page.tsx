import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy | The Sanctuary',
  description: 'How The Sanctuary handles accounts, community content, advertising consent, and deletion.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Privacy</p>
      <h1 className="mt-3 text-4xl font-semibold text-white">Privacy notice</h1>
      <p className="mt-4 text-neutral-400">
        The Sanctuary is a small, privacy-focused community. This notice explains the data the app
        stores and the choices you control.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold text-white">Accounts and community content</h2>
        <p>
          When you create an account we store your email address, username, display name, profile
          details, posts, comments, RSVPs, conversations, and uploaded media. Supabase provides
          authentication and database hosting. Profile privacy controls decide which details are
          visible to other signed-in members.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-2xl font-semibold text-white">Advertising</h2>
        <p>
          Web advertising is disabled until you allow it. If you allow ads, Google AdSense may use
          cookies or similar technologies to serve and measure ads. Signed-in members can change
          this choice at any time in Settings; otherwise you can clear this site&apos;s storage or use
          your browser&apos;s privacy controls. We do not offer tokens or other rewards for viewing
          ads. Deployments serving the EEA or UK must use a Google-certified consent management
          platform.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-2xl font-semibold text-white">Deleting your account</h2>
        <p>
          You can delete your account from Settings. Deletion removes your authentication record,
          profile, content, conversations, and stored media. Some records may remain in backups for a
          limited period before they are rotated out.
        </p>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-2xl font-semibold text-white">Contact</h2>
        <p>
          Questions about privacy can be sent through the in-app support area. Do not include
          passwords or authentication codes in support messages.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 hover:border-emerald-300 hover:text-white" href="/guidelines">
          Community guidelines
        </Link>
        <Link className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 hover:border-emerald-300 hover:text-white" href="/terms">
          Terms draft
        </Link>
        <Link className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 hover:border-emerald-300 hover:text-white" href="/">
          Back to The Sanctuary
        </Link>
      </div>
    </main>
  );
}
