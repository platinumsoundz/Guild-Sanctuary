# Competitive landscape — first source-backed findings

Research date: 2026-10-27  
Scope: initial evidence slice for roadmap decisions, not a complete competitor audit or legal advice. Product policies vary by country and change over time; re-check the exact UK/EEA terms before implementing purchases or age gates.

## Executive summary

The Sanctuary should not try to be “all of Discord + Instagram + Finch” by copying features. Its defensible direction is a **calm social growth space**: practical self-reflection and small habits, real friendships and circles, free peer wisdom, and strong safety/privacy defaults.

The strongest patterns to adapt are:
1. **Community-level rules with a platform-wide safety floor** (Discord, Reddit).
2. **A separate, server-enforced purchase-age gate and plain virtual-item rules** (TikTok's public virtual-item policy).
3. **Small, user-owned goals, reflection prompts, flexible routines and optional playful cosmetics** (Finch).
4. **Visible deletion controls and clear explanations of what deletion does—and does not—remove** (Reddit's account/data help pages).
5. **Safety and wellbeing affordances must not depend on a paid tier.** Finch explicitly says its core self-care features remain free; that aligns with Sanctuary's free wisdom and peer support principle.

These findings support the current roadmap; they do not justify adding engagement pressure, public rankings, paid reach, or monetisation inside vulnerable spaces.

## Comparison matrix

| Platform | What its public materials establish | Pattern to learn from | Sanctuary decision |
| --- | --- | --- | --- |
| Discord | Community servers are expected to have clear rules, a moderation team, a welcoming environment, and an escalation path to Discord Trust & Safety. | Local stewards can support context-specific norms, but the platform still needs a common safety floor and escalation path. | **Adapt:** small Circles can have named stewards and local guidelines later; global rules, reporting, appeal rights, and platform-level enforcement remain authoritative. |
| Reddit | Reddit describes a layered moderation model: site-wide rules plus community-specific rules and moderator action. Its appeal guidance says users are notified of removal/enforcement reasons and can appeal; it also publishes transparency reporting. | Explain enforcement, offer an appeal route, and make local community rules subordinate to platform safety. | **Adopt:** reasoned moderation outcomes, appeals, audit records, and eventually a small transparency summary. Do not promise appeal turnaround times until operationally staffed. |
| TikTok virtual items | TikTok's public virtual-item terms describe age restrictions for purchases, platform-only items, restrictions on transfer/exchange, and a transaction history. The exact applicable policy differs by region. | Separate account/community eligibility from purchase eligibility; disclose price and item purpose; keep balances/history understandable. | **Adapt:** server-side 18+ purchase eligibility and transparent token history. **Reject:** gifts, popularity-linked creator rewards, transfers, and cash-out; Sanctuary tokens remain cosmetic-only. Re-check the current UK-specific policy and legal requirements before any live sales. |
| Finch | Finch describes personal goals, journaling/reflection, breathing/focus tools, friend encouragement, customization, and an optional subscription. Its help materials describe pausing streaks while preserving progress. | Personal growth can feel gentle and playful; a flexible pause is more humane than punishing missed days. | **Adopt/adapt:** tiny user-defined goals, opt-in reflection prompts, gentle encouragement, optional cosmetics, and a pause/rest mode that preserves progress. **Reject:** any streak loss or reward design that shames members or pressures daily return. |
| Reddit account/data controls | Reddit's account deletion guide explains that deletion is not the same as deleting every post/comment, and its data help pages describe data-request and deletion handling. | Explain exactly what disappears, what is retained, what remains public, and the expected timeline. | **Adopt:** a clear data-export path, deletion preview, grace-period/restore explanation, and separate treatment of posts/media/account records. Avoid implying deletion is complete until storage and provider-side records are handled and verified. |

## Product recommendations

### Adopt now / Phase 1
- Keep a common moderation policy and clear moderator/admin permission boundaries.
- Make the reason for a moderation action visible to the affected member and provide an appeal route where appropriate.
- Keep purchase-age checks server-side, separate from general account eligibility, and default checkout off until staging acceptance passes.
- Document account deletion, grace period, restoration, media cleanup, and the exact limits of deletion in member-facing language.
- Keep free core community support and wisdom sharing available without payment.

### Adapt for later phases
- Circle-level stewards and rules, with platform-wide safety escalation.
- Flexible self-care goals, reflection prompts, optional friend encouragement, and rest/pause mode.
- Cosmetic personalisation that does not affect visibility, ranking, access to people, or influence over others.
- A transparent safety report summarising actions and appeals only once the data and moderation operations can support it.

### Reject under current product principles
- Paid visibility, boosted posts, creator gifting tied to popularity, cash-out, token trading/transfers, or marketplaces.
- Infinite-scroll and notification mechanics designed to maximise compulsive use.
- Public follower/engagement leaderboards or streak punishment.
- Paid access to peer support, crisis signposting, or core wellbeing tools.
- Presenting self-discovery questionnaires as clinical diagnosis or certified personality assessment.

## Metrics to test whether the product is genuinely better

Use a balanced scorecard rather than daily active use alone:
- **Member value:** members reporting that a post, Circle, practice, or reflection helped them.
- **Community quality:** helpful responses, repeat participation by choice, and member-reported belonging.
- **Safety:** report response time, appeal reversal rate, repeat abuse, and unresolved high-severity cases.
- **Privacy:** deletion completion time, failed purge retries, access-control test failures, and successful export/delete requests.
- **Wellbeing-respecting engagement:** notification opt-out, rest-mode use, and whether people can return without penalty.
- **Reliability:** error rate, failed jobs, recovery time, and verified persistence across sessions/devices.
- **Cost/accessibility:** cost per active member, keyboard/screen-reader coverage, mobile performance, and low-bandwidth usability.

Do not set targets until a baseline is measured and the owner approves the definitions.

## Evidence and limitations

Official/public sources reviewed on 2026-10-27:

- Discord, [Community Server Guidelines](https://support.discord.com/hc/en-us/articles/360035969312-Community-Server-Guidelines) — clear rules, moderator team, healthy environment and escalation.
- Reddit, [Content Moderation, Enforcement, and Appeals](https://support.reddithelp.com/hc/en-us/articles/23511059871252-Content-Moderation-Enforcement-and-Appeals) — layered moderation, appeal explanation and transparency.
- Reddit, [How do I delete my account?](https://support.reddithelp.com/hc/en-us/articles/204579509-How-do-I-delete-my-account) — account deletion and retained post/comment distinction.
- Reddit, [How do I request a copy of my data?](https://support.reddithelp.com/hc/en-us/articles/360043048352-How-do-I-request-a-copy-of-my-Reddit-data-and-information) — account data request.
- TikTok, [Virtual Items Policy](https://www.tiktok.com/legal/page/row/virtual-items/en) — age eligibility and restrictions on virtual items; this linked version explicitly excludes UK/EEA/Switzerland, so use it only for general pattern comparison, not as the UK policy.
- Finch, [About Finch](https://finchcare.com/about-finch) — goals, reflections, breathing/focus, friends, cosmetics, and free core self-care.
- Finch Help Center, [Our Approach to Self-Care](https://help.finchcare.com/hc/en-us/articles/37935669335309-Our-Approach-to-Self-Care) — gentle goals, flexible routines, reminders and streak framing.
- Finch Help Center, [Pause Mode](https://help.finchcare.com/hc/en-us/articles/37936144770701-Pause-Mode) — pauses streaks and hides most features to support rest while preserving progress.

This first slice does **not** yet verify the full comparison set from issue #72 (Instagram, YouTube, Twitch, Patreon, Facebook Groups, WhatsApp, Mighty Networks, Daylio, Headspace, Duolingo, Habitica, Roblox, Steam, Notion, Meetup, Insight Timer, and 7 Cups). Those require separate source checks before making feature-level claims.


## Additional platform findings — 2026-10-27

This section extends the first research slice with official help-centre material for YouTube, Patreon, WhatsApp, Headspace, and Meetup. These are product-pattern observations, not recommendations to copy entire monetisation models.

| Platform | Verified public capability / policy | Sanctuary implication | Decision |
| --- | --- | --- | --- |
| YouTube | Creators can pause or disable comments, hold comments for review at different moderation levels, hide users across a channel, and define visible community guidelines. YouTube notes that channel guidelines set expectations but do not themselves automatically enforce platform rules. | Separate the visible rules from actual enforcement. Give members a way to set boundaries, pause discussion when needed, and make moderation state explainable. A guideline banner alone is not safety. | **Adopt/adapt:** community expectations plus real report/block/moderation controls; later consider pause mode for a post/thread during review. |
| Patreon | Community chats can be scoped to all members or selected paid tiers; creators can assign moderators who review reported messages in a moderation hub. | Role-based moderation queues are a useful pattern, but tier-gating is not suitable for Sanctuary's core peer-support spaces. | **Adapt:** named community stewards and a dedicated report queue; **reject** paid access to support spaces or paid influence over moderation. |
| WhatsApp | Group privacy settings let members limit who can add them; people can leave or report a group and receive context when an unknown contact adds them. | Prevent unwanted group membership and make exits/reports straightforward. Joining should be a choice, not a forced social obligation. | **Adopt:** invite/accept flows, clear group context, leave/mute/report controls and controls over who can add a member. |
| Headspace | The full meditation library is subscription-based after trial, while a smaller set of articles, audio and public content remains free. Headspace's own guidance also encourages people to respect their pace and avoid unrealistic expectations. | Sanctuary can offer paid creator content later, but the product should preserve free community wisdom, safety information and basic reflection tools. | **Adapt:** optional paid structured guides only after free community and self-reflection basics are useful; **reject** locking core peer support behind a subscription. |
| Meetup | Members can report content or people, organizers manage local groups, and the help centre describes review/appeal options. Some member-to-member messaging access is subscription-gated, while organizer contact and group discussions remain available in other contexts. | Local organisers can support real-world community, but a small platform needs a central escalation path and predictable privacy boundaries. Paid messaging is not aligned with Sanctuary's free mutual support principle. | **Adopt/adapt:** clear organizer/steward responsibilities, report confirmation and review status; **reject** charging members just to contact one another for support. |

### Source notes for this section

- YouTube Help, [Learn about comment settings](https://support.google.com/youtube/answer/9483359?hl=en) — comment pause/off, review queues, hidden users, blocked words and link filtering.
- YouTube Help, [Set your channel guidelines](https://support.google.com/youtube/answer/11895180?hl=en) — visible expectations are not automatic enforcement.
- Patreon Help Center, [Building Community with Chats](https://support.patreon.com/hc/en-gb/articles/18855652505357-Building-Community-with-Chats) — moderators and reported-message review.
- Patreon Help Center, [Chats FAQ](https://support.patreon.com/hc/en-us/articles/25280817460877-Chats-FAQ) — access can depend on membership tiers.
- WhatsApp Help Center, [How to stay safe in groups](https://faq.whatsapp.com/424124173736394/?cms_platform=web) — group privacy, leaving and reporting groups.
- Headspace Help Center, [What's included for free?](https://help.headspace.com/hc/en-us/articles/115008192928-What-s-included-for-free) — free public resources versus subscription library.
- Headspace Help Center, [How Long Does Meditation Take to learn?](https://help.headspace.com/hc/en-us/articles/115008040007-How-Long-Does-Meditation-Take-to-learn) — guidance that progress varies and people should avoid unrealistic expectations.
- Meetup Help Center, [Reporting spam, inappropriate content or activity](https://help.meetup.com/hc/en-us/articles/360001673551-Reporting-spam-inappropriate-content-or-activity) — reporting and review flow.
- Meetup Help Center, [Contacting other members and organizers](https://help.meetup.com/hc/en-us/articles/360002880111-Contacting-other-members-and-organizers) — messaging access and organizer contact.

### Research limitations

Instagram, Facebook Groups, WhatsApp's complete privacy/data controls, Mighty Networks, Daylio, Duolingo, Habitica, Roblox, Steam, Notion, Insight Timer, and 7 Cups are not fully assessed in this update. Do not infer a complete competitor ranking from this partial sample. The next pass should focus on privacy/export/deletion, member safety controls, accessibility, notification design, and current user pain reports, with official sources first and community reports labelled qualitative.
