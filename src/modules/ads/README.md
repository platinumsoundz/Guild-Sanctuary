# Advertising

Owns reusable feed and Shorts ad-placement slots. On native Capacitor platforms the feed slot requests an AdMob adaptive banner and the Shorts slot requests a frequency-capped interstitial. Both require UMP consent before SDK initialization and are hidden for non-free VIP profiles. Development uses Google's test units; production requires configured Android app and unit IDs. Web builds do not display the native placements.

Before enabling production ads, publish UMP consent messages, validate age/region eligibility and child-directed treatment, configure policy-approved placements and live IDs, and exercise load failures, frequency behavior, privacy controls, and invalid-traffic/revenue reporting. Never treat a rendered placement or client event as a billable impression.
