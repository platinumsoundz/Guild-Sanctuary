# Advertising

## Web: Google AdSense

`AdsConsent` is mounted in the root layout. It does not load the AdSense library until the visitor chooses “Allow ads”; the choice is stored in `localStorage`. There is no default publisher ID. Ads remain disabled unless `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is a valid `ca-pub-...` value.

`AdSlot` renders responsive display units only when the publisher ID, the relevant numeric slot ID, and advertising consent are all present:

- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE`
- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR`
- `NEXT_PUBLIC_ADSENSE_SLOT_SHORTS`

These values are public and must be set in each deployment environment **before its build**, since Next.js inlines `NEXT_PUBLIC_*` values at build time. Empty or malformed IDs leave placements absent. `public/ads.txt` contains the publisher authorization line; update it if the publisher ID changes.

For AdSense site verification, deploy the current build to the exact domain registered in AdSense and confirm the homepage is publicly reachable and `public/robots.txt` does not block Google's crawlers. Because the script is consent-gated, verification may require temporarily granting consent in the browser or using an approved CMP. A local consent banner is not a Google-certified CMP; deployments serving the EEA/UK must configure one.

Ad blockers, consent state, site review, and policy controls can prevent an ad from appearing. The app does not treat an empty slot as an error or an impression.

## Native: AdMob

`AdPlacement` is exported from `src/modules/ads/native.ts`, not from the shared barrel. Import it only from Capacitor-specific code so the Android plugin never enters the web bundle. On native Android it requests an AdMob adaptive banner or frequency-capped interstitial after UMP consent; these placements are hidden for paid members. Development uses Google's test units; production requires configured Android app and unit IDs.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
