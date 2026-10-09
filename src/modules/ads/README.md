# Advertising

Owns reusable feed and Shorts ad-placement slots. The current implementation displays clearly disclosed demo placeholders to free-tier profiles and suppresses them for non-free VIP profiles. It has no ad network, impression tracking, or revenue reporting configured.

Production placement delivery must go through a provider adapter with consent, age/region eligibility, frequency caps, viewability and invalid-traffic controls, and independently auditable revenue reconciliation. Never treat a rendered placeholder or client event as a billable impression.
