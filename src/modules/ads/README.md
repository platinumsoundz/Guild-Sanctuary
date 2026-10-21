# Advertising

## Web: Google AdSense

`AdSenseScript` conditionally loads the AdSense library from the root layout when `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is a valid `ca-pub-...` publisher ID. `AdSlot` renders responsive display units only when both that publisher ID and the relevant numeric slot ID are configured:

- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_INLINE`
- `NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR`
- `NEXT_PUBLIC_ADSENSE_SLOT_SHORTS`

These values are public and must be set in each deployment environment **before its build**, since Next.js inlines `NEXT_PUBLIC_*` values at build time. Empty or malformed values leave placements absent. Confirm the deployed domain is approved in AdSense, complete any required site verification and `ads.txt` setup, and configure an approved consent-management platform for applicable regions before enabling real inventory. Ad blockers, consent state, site review, and policy controls can prevent an ad from appearing; the app does not treat an empty slot as an error or an impression.

The inline feed, feed sidebar, and Shorts placements are app UI locations. Review layout and policy compliance on real devices before enabling each slot ID. Avoid placing ads where they can be mistaken for navigation or interactive controls.

## Native: AdMob

On native Capacitor Android platforms `AdPlacement` requests an AdMob adaptive banner or frequency-capped interstitial after UMP consent; these placements are hidden for paid members. Development uses Google's test units; production requires configured Android app and unit IDs. Web builds do not display these native placements.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
