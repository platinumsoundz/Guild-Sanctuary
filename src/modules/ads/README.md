# Advertising

## Web: Google AdSense

The web AdSense loader and ad placements fail closed unless all of the following are true in the built application:

- `NEXT_PUBLIC_ADSENSE_ENABLED=true`
- `NEXT_PUBLIC_ADSENSE_ENVIRONMENT=production`
- `NODE_ENV=production`
- A valid `NEXT_PUBLIC_ADSENSE_CLIENT_ID` publisher ID (or the existing project fallback)
- For a placement, a numeric slot ID is configured

The explicit environment setting is platform-neutral and works with Vercel and Cloudflare builds. Configure both public variables only in the production build environment on the host serving the registered site. Leave `NEXT_PUBLIC_ADSENSE_ENABLED` unset/false and `NEXT_PUBLIC_ADSENSE_ENVIRONMENT` unset for previews and local development. Do not set the production environment flag on preview deployments. Next.js inlines `NEXT_PUBLIC_*` values at build time, so changing dashboard variables requires a new build.

The publisher ID can be overridden with `NEXT_PUBLIC_ADSENSE_CLIENT_ID`. The inline feed, feed sidebar, and Shorts placements use these optional slot IDs:

- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE`
- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR`
- `NEXT_PUBLIC_ADSENSE_SLOT_SHORTS`

Empty or malformed slot IDs leave placements absent. Do not enable ads until the publisher ID is confirmed against the owner's AdSense account and Google has approved the exact public domain. For verification, deploy a production build to that domain, confirm the homepage is publicly reachable and its initial HTML `<head>` contains the `adsbygoogle.js?client=ca-pub-...` script, and confirm `robots.txt`, firewall rules, or access controls do not block Google's crawler. AdSense also offers meta-tag and `ads.txt` verification methods; an `ads.txt` entry must use the exact publisher ID shown in the account and must not be guessed from a repository default.

Complete any required site review and configure an approved consent-management platform for applicable regions before serving production ads. Ad blockers, consent state, site review, and policy controls can prevent an ad from appearing; the app does not treat an empty slot as an error or an impression.

The inline feed, feed sidebar, and Shorts placements are app UI locations. Review layout and policy compliance on real devices before enabling each slot ID. Avoid placing ads where they can be mistaken for navigation or interactive controls.

## Native: AdMob

On native Capacitor Android platforms `AdPlacement` requests an AdMob adaptive banner or frequency-capped interstitial after UMP consent; these placements are hidden for paid members. Development uses Google's test units; production requires configured Android app and unit IDs. Web builds do not display these native placements. Website AdSense and native-app AdMob are separate integrations; do not use website AdSense units inside the native Android app.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
