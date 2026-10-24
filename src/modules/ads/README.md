# Advertising

## Web: Google AdSense

`AdsConsent` is mounted in the root layout. The server layout only enables it when `NEXT_PUBLIC_ADSENSE_ENABLED=true`, the deployment is explicitly marked as production, and the publisher ID is valid. Vercel supplies `VERCEL_ENV=production`; Cloudflare Workers and other hosts must set `NEXT_PUBLIC_DEPLOYMENT_ENV=production` in the production build. Preview and local deployments fail closed, even if an ad flag is accidentally enabled there. Configure the enable flag only in production and leave it unset/false for previews and development. There is no default publisher ID; set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` explicitly.

When enabled, the layout also renders the `google-adsense-account` meta tag for site verification. After that gate passes, `AdsConsent` still does not load the AdSense library until the visitor chooses “Allow ads”; the choice is stored in `localStorage`. `AdSlot` renders responsive display units only when the enable flag, production marker, publisher ID, the relevant numeric slot ID, and advertising consent are all present:

- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE`
- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR`
- `NEXT_PUBLIC_ADSENSE_SLOT_SHORTS`

These values are public and must be set in the relevant hosting environment **before its build**, since Next.js inlines `NEXT_PUBLIC_*` values at build time. Enable the flag and set live slot IDs only in production. Empty or malformed slot IDs leave placements absent. `public/ads.txt` contains the publisher authorization line; update it if the publisher ID changes.

For verification, deploy the current build to the exact domain registered in AdSense and confirm the homepage is publicly reachable. AdSense verifies domains, not shared platform subdomains such as `*.workers.dev`; attach a custom domain before applying. Confirm `/ads.txt` returns the expected publisher line and that the page head contains the `google-adsense-account` meta tag. Because the ad script is consent-gated, verification may require temporarily granting consent in the browser or using an approved CMP. Confirm `robots.txt`, firewall rules, or access controls do not block Google's crawler. Complete any required site review and configure an approved consent-management platform for applicable regions before serving production ads.

Ad blockers, consent state, site review, and policy controls can prevent an ad from appearing. The app does not treat an empty slot as an error or an impression.

## Native: AdMob

`AdPlacement` is exported from `src/modules/ads/native.ts`, not from the shared barrel. Import it only from Capacitor-specific code so the Android plugin never enters the web bundle. On native Android it requests an AdMob adaptive banner or frequency-capped interstitial after UMP consent; these placements are hidden for paid members. Development uses Google's test units; production requires configured Android app and unit IDs.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
