# Advertising

## Web: Google AdSense

`AdsConsent` is mounted in the root layout. The server layout only enables it when `NEXT_PUBLIC_ADSENSE_ENABLED=true`, `VERCEL_ENV=production`, and the publisher ID is valid. Preview and local deployments fail closed, even if an ad flag is accidentally enabled there. Configure `NEXT_PUBLIC_ADSENSE_ENABLED=true` in the Vercel Production environment only; leave it unset/false for Preview and Development. Vercel system environment variables must be enabled so the server-side `VERCEL_ENV` check works. There is no default publisher ID; set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` explicitly.

After the deployment gate passes, `AdsConsent` still does not load the AdSense library until the visitor chooses “Allow ads”; the choice is stored in `localStorage`. `AdSlot` renders responsive display units only when the enable flag, publisher ID, the relevant numeric slot ID, and advertising consent are all present:

- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE`
- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR`
- `NEXT_PUBLIC_ADSENSE_SLOT_SHORTS`

These values are public and must be set in the relevant Vercel environment **before its build**, since Next.js inlines `NEXT_PUBLIC_*` values at build time. Enable the flag and set live slot IDs only in Production. Empty or malformed slot IDs leave placements absent. `public/ads.txt` contains the publisher authorization line; update it if the publisher ID changes.

For verification, deploy the current build to the exact domain registered in AdSense and confirm the homepage is publicly reachable. Because the script is consent-gated, verification may require temporarily granting consent in the browser or using an approved CMP. Confirm `robots.txt`, firewall rules, or access controls do not block Google's crawler. AdSense also offers meta-tag and `ads.txt` verification methods. Complete any required site review and configure an approved consent-management platform for applicable regions before serving production ads.

Ad blockers, consent state, site review, and policy controls can prevent an ad from appearing. The app does not treat an empty slot as an error or an impression.

## Native: AdMob

`AdPlacement` is exported from `src/modules/ads/native.ts`, not from the shared barrel. Import it only from Capacitor-specific code so the Android plugin never enters the web bundle. On native Android it requests an AdMob adaptive banner or frequency-capped interstitial after UMP consent; these placements are hidden for paid members. Development uses Google's test units; production requires configured Android app and unit IDs.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
