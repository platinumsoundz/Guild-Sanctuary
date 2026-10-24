# Advertising

## Web: Google AdSense

`AdSenseScript` loads the AdSense library from the root layout only when `NEXT_PUBLIC_ADSENSE_ENABLED=true`, `VERCEL_ENV=production`, and the publisher ID is valid. Preview and local deployments fail closed, even if an ad flag is accidentally enabled there. Configure `NEXT_PUBLIC_ADSENSE_ENABLED=true` in the Vercel Production environment only; leave it unset/false for Preview and Development. Vercel system environment variables must be enabled so the server-side `VERCEL_ENV` check works. The publisher ID defaults to the public project ID and can be overridden with `NEXT_PUBLIC_ADSENSE_CLIENT_ID`. The script uses Next.js `beforeInteractive`, which injects it into the initial document `<head>` for AdSense site verification. `AdSlot` also requires the enable flag plus a valid publisher ID and numeric slot ID:

- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE`
- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR`
- `NEXT_PUBLIC_ADSENSE_SLOT_SHORTS`

These values are public and must be set in the relevant Vercel environment **before its build**, since Next.js inlines `NEXT_PUBLIC_*` values at build time. Enable the flag and set live slot IDs only in Production. Empty or malformed slot IDs leave placements absent. For verification, deploy the current build to the exact domain registered in AdSense and confirm the homepage is publicly reachable and its initial HTML `<head>` contains the `adsbygoogle.js?client=ca-pub-...` script. Confirm `robots.txt`, firewall rules, or access controls do not block Google's crawler. AdSense also offers meta-tag and `ads.txt` verification methods. Complete any required site review and configure an approved consent-management platform for applicable regions before serving production ads. Ad blockers, consent state, site review, and policy controls can prevent an ad from appearing; the app does not treat an empty slot as an error or an impression.

The inline feed, feed sidebar, and Shorts placements are app UI locations. Review layout and policy compliance on real devices before enabling each slot ID. Avoid placing ads where they can be mistaken for navigation or interactive controls.

## Native: AdMob

On native Capacitor Android platforms `AdPlacement` requests an AdMob adaptive banner or frequency-capped interstitial after UMP consent; these placements are hidden for paid members. Development uses Google's test units; production requires configured Android app and unit IDs. Web builds do not display these native placements.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
