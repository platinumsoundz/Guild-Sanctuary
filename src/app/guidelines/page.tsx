import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Community guidelines | The Sanctuary',
  description:
    'How The Sanctuary approaches reflection, spiritual exploration, safety, reports, appeals, age limits, and token purchases.',
};

const sections = [
  {
    title: 'What The Sanctuary is for',
    body: [
      'The Sanctuary is a small community for reflection, growth, care, and connection. It is a place to share a practice, ask honest questions, and meet people who are exploring meaning without being sold a single answer.',
      'We welcome contemplative, spiritual, philosophical, and secular perspectives. No tradition owns the room. Curiosity, good faith, and consent matter more than certainty.',
    ],
  },
  {
    title: 'How we treat each other',
    body: [
      'Be direct without being cruel. Disagree with ideas, not with a person’s right to exist. Do not harass, threaten, stalk, dox, impersonate, spam, or coordinate pile-ons.',
      'Ask before offering advice about someone’s health, grief, relationships, money, or spiritual practice. Do not pressure anyone to disclose private experiences or to accept a teacher, reading, ritual, or purchase.',
      'Respect boundaries around direct messages. A public profile is not consent to intimate contact, and “no” does not need a justification.',
    ],
  },
  {
    title: 'Spiritual and wellbeing content',
    body: [
      'You may share personal practice, tradition, philosophy, and creative work. You may not present unverified medical or mental-health claims as fact, promise cures, discourage someone from seeking professional care, or use spiritual language to coerce, shame, or financially exploit another person.',
      'Do not use the community to recruit for high-control groups, multi-level schemes, or paid “mystical” services that make extraordinary promises. Do not post instructions for obtaining or using illegal substances.',
      'The Sanctuary is not a crisis service, a therapist, or a substitute for emergency care. If you or someone else is in immediate danger, contact local emergency services. In the UK you can call 999. Samaritans is available on 116 123. International helplines are listed at findahelpline.com.',
    ],
  },
  {
    title: 'Content we do not allow',
    body: [
      'No child sexual abuse material, sexual exploitation, grooming, or sexual content involving minors. No non-consensual intimate imagery, threats, hateful conduct, or content that incites violence.',
      'No content that promotes self-harm, suicide, or eating disorders. No graphic violence, illegal goods or services, malware, phishing, or attempts to break another account’s security.',
      'No doxxing, private information, or sharing someone’s location, workplace, family, or contact details without permission. No impersonation of another member, moderator, or the Sanctuary team.',
    ],
  },
  {
    title: 'Age and account rules',
    body: [
      'The community is intended for people aged 13 and over. Some features have a higher age requirement. Token purchases are restricted to adults aged 18 and over.',
      'Do not create an account to evade a suspension, a ban, or an age requirement. Do not help someone else do so. If we believe an account belongs to someone below the minimum age, we may restrict or remove it.',
      'Keep your account secure. Do not share passwords or authentication codes, and tell us if you believe someone else has access to your account.',
    ],
  },
  {
    title: 'Tokens and paid features',
    body: [
      'Tokens are account-bound digital units for features The Sanctuary makes available. They are not money, a deposit, an investment, or a promise of future value. They cannot be transferred, traded, sold, or cashed out.',
      'Prices, availability, and fulfillment are decided by the server, not by the browser. A cosmetic is a permanent unlock on the account that bought it. Buying the same cosmetic again does not charge the account twice.',
      'Token purchases are 18+ and remain disabled until secure checkout, refund handling, and legal review are complete. If a payment is refunded or reversed, we may remove unspent tokens. If the tokens were already spent, the case goes to manual support review rather than silently creating a negative balance or reversing a cosmetic.',
    ],
  },
  {
    title: 'Reports, moderation, and appeals',
    body: [
      'Use the report control on a post, comment, message, or profile. Reports go to the moderation queue with the content, the reporter, and the reason. Do not use reports to harass someone or to silence a disagreement.',
      'Moderators may remove content, limit a feature, suspend an account, or ban an account. We aim to use the least severe action that protects the community, but serious harm can lead to immediate removal.',
      'If you believe a moderation decision was wrong, use the appeal path in the moderation notice or contact support. Include the decision, the content, and anything you want us to review. Do not create a new account to appeal.',
      'Moderators and administrators can see reports, moderation history, account status, and wallet history. Access is limited to people who need it for safety, support, or legal compliance.',
    ],
  },
  {
    title: 'Privacy and account deletion',
    body: [
      'Your profile privacy controls decide which details are visible to other signed-in members. Public discovery only lists profiles that are public and have discovery enabled.',
      'You can request account deletion from Settings. The intended deletion path hides the profile immediately, allows you to restore it by signing in within seven days, and purges the account after that window. The current code still uses the immediate-deletion flow; the grace period is not implemented yet.',
      'Do not post someone else’s private information, and do not ask others to post yours. If you need a copy of your data or have a privacy question, use the in-app support area. Do not send passwords or authentication codes.',
    ],
  },
  {
    title: 'What happens when rules are broken',
    body: [
      'We may remove content, send a warning, restrict messaging or discovery, suspend an account temporarily, or ban an account permanently. We may also preserve records where required for safety, legal compliance, or a dispute.',
      'We do not promise a particular outcome or timeline. We do promise to review reports in good faith and to keep a record of moderation actions so decisions can be reviewed.',
    ],
  },
];

export default function GuidelinesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Community</p>
      <h1 className="mt-3 text-4xl font-semibold text-white">Community guidelines</h1>
      <p className="mt-4 text-neutral-400">
        The Sanctuary is a place for reflection, growth, care, and connection. These guidelines explain
        what we welcome, what we remove, and how to ask for help. They are a community guide, not the
        legal Terms of Service.
      </p>

      <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5 text-sm text-emerald-100">
        <strong className="font-semibold">In an emergency:</strong> contact local emergency services. In
        the UK call 999. Samaritans is available on 116 123. The Sanctuary is not a crisis service.
      </div>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
            <div className="mt-3 space-y-3 text-neutral-300">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 hover:border-emerald-300 hover:text-white"
          href="/privacy"
        >
          Privacy notice
        </Link>
        <Link
          className="inline-flex rounded-full border border-neutral-700 px-5 py-2 text-sm text-neutral-200 hover:border-emerald-300 hover:text-white"
          href="/terms"
        >
          Terms draft
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
