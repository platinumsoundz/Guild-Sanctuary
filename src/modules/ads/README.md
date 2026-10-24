# Advertising

## Web: Google AdSense

The web ad system is deliberately fail-closed. It only runs when all of these are true:

- `NEXT_PUBLIC_ADSENSE_ENABLED=true`
- the deployment is explicitly marked production (`VERCEL_ENV=production` or `NEXT_PUBLIC_DEPLOYMENT_ENV=production`)
- `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is a valid `ca-pub-…` publisher ID
- the placement's numeric slot ID is configured
- the visitor has allowed advertising

`AdsConsent` is mounted in the root layout. It does not inject the AdSense script until the visitor chooses **Allow ads**. The choice is stored in `localStorage` and can be changed later in **Settings → Advertising**. The layout also emits the `google-adsense-account` meta tag for site verification when the gates pass.

### Placements

- `feed-sidebar` — one responsive unit for the feed. On wide screens it sits in a non-sticky right-hand rail; below 1100px the same unit moves to the bottom of the feed. It never overlays content.
- `shorts` — a responsive unit below the Shorts feed, not an interstitial or overlay.

The feed rail only reserves space when an ad is actually rendered. Missing consent, a missing slot ID, a preview build, or an ad blocker leaves the feed at full width.

Configured slot variables:

- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR`
- `NEXT_PUBLIC_ADSENSE_SLOT_SHORTS`

These values are public and must be set in the hosting environment **before its build**, because Next.js inlines `NEXT_PUBLIC_*` values at build time. Empty or malformed slot IDs leave placements absent. `public/ads.txt` contains the publisher authorization line; update it if the publisher ID changes.

### Policy: no rewards for ad views

Do **not** offer tokens, points, perks, or any other compensation for viewing, clicking, or interacting with ads. Google AdSense prohibits compensating users for ad views or searches and prohibits language such as “support us” or “click the ads” next to ad units. A token reward for ad opt-in would put the publisher account at risk. The Settings copy therefore states that no tokens or rewards are offered for viewing ads.

The opt-in is only a privacy/consent choice: it lets ads load or keeps them off.

### UK/EEA consent

The local banner is a minimum gate for non-regulated deployments. It is not a Google-certified CMP. Before serving ads to UK/EEA visitors, configure a Google-certified consent management platform (for example through AdSense Privacy & Messaging) and use that as the consent gate. Do not enable live ads in those regions until the CMP is verified.

### Verification checklist

1. Attach the exact custom domain that is registered in AdSense. AdSense does not verify shared platform subdomains such as `*.workers.dev`.
2. Deploy the production build with the ad flag, publisher ID, and slot IDs.
3. Confirm `/ads.txt` returns the expected publisher line and the page head contains the `google-adsense-account` meta tag.
4. Grant consent in the browser and confirm the feed rail and Shorts unit render without covering content.
5. Confirm `robots.txt`, firewall rules, and access controls do not block Google's crawler.
6. Complete site review and the UK/EEA CMP requirement before serving live ads.
7. Never click your own ads or ask community members to do so.

Ad blockers, consent state, site review, and policy controls can prevent an ad from appearing. The app does not treat an empty slot as an error or an impression.

## Native: AdMob

`AdPlacement` is exported from `src/modules/ads/native.ts`, not from the shared barrel. Import it only from Capacitor-specific code so the Android plugin never enters the web bundle. On native Android it requests an AdMob adaptive banner or frequency-capped interstitial after UMP consent; these placements are hidden for paid members. Development uses Google's test units; production requires configured Android app and unit IDs.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
