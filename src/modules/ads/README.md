# Advertising

## Web: Google AdSense

`AdSenseScript` loads the AdSense library from the root layout using the supplied publisher ID by default; deployments can override it with `NEXT_PUBLIC_ADSENSE_CLIENT_ID`. It uses Next.js `beforeInteractive`, which injects the snippet into the initial document `<head>` so the AdSense site-verification crawler can find it. `AdSlot` renders responsive display units only when both that publisher ID and the relevant numeric slot ID are configured:

- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE`
- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR`
- `NEXT_PUBLIC_ADSENSE_SLOT_SHORTS`

These values are public and must be set in each deployment environment **before its build**, since Next.js inlines `NEXT_PUBLIC_*` values at build time. Empty or malformed slot IDs leave placements absent. For verification, deploy the current build to the exact domain registered in AdSense and confirm the homepage is publicly reachable and its initial HTML `<head>` contains the `adsbygoogle.js?client=ca-pub-...` script. Confirm `robots.txt`, firewall rules, or access controls do not block Google's crawler. AdSense also offers meta-tag and `ads.txt` verification methods. Complete any required site review and configure an approved consent-management platform for applicable regions before serving production ads. Ad blockers, consent state, site review, and policy controls can prevent an ad from appearing; the app does not treat an empty slot as an error or an impression.

The inline feed, feed sidebar, and Shorts placements are app UI locations. Review layout and policy compliance on real devices before enabling each slot ID. Avoid placing ads where they can be mistaken for navigation or interactive controls.

## Native: AdMob

On native Capacitor Android platforms `AdPlacement` requests an AdMob adaptive banner or frequency-capped interstitial after UMP consent; these placements are hidden for paid members. Development uses Google's test units; production requires configured Android app and unit IDs. Web builds do not display these native placements.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
