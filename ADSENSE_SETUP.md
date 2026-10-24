# AdSense switch-on checklist

The code is ready. Live ads stay off until the production environment is configured. Do these in order.

## 1. Domain

AdSense must verify the exact site domain. A shared `*.workers.dev` or preview URL cannot be used as the AdSense site.

1. Attach a custom domain to the production deployment.
2. Make sure the homepage is publicly reachable without auth.
3. Use HTTPS.

## 2. AdSense site and publisher ID

1. In AdSense, add the custom domain as a site.
2. Use the `google-adsense-account` meta tag that the app emits when ads are enabled, or verify through `/ads.txt`.
3. Confirm `public/ads.txt` contains the publisher line for the same account. It currently contains:

```text
google.com, pub-8267279636493149, DIRECT, f08c47fec0942fa0
```

If that is not the correct account, replace the publisher number in both `public/ads.txt` and `NEXT_PUBLIC_ADSENSE_CLIENT_ID`.

## 3. Create ad units

In AdSense, create two responsive display units:

1. Feed unit — used as the desktop right rail and the mobile bottom unit.
2. Shorts unit — used below the Shorts feed.

Copy each numeric slot ID. Do not use the publisher ID as a slot ID.

## 4. Production environment variables

Set these in the production hosting environment, then rebuild. `NEXT_PUBLIC_*` values are inlined at build time, so changing them later requires a new deployment.

```text
NEXT_PUBLIC_DEPLOYMENT_ENV=production
NEXT_PUBLIC_ADSENSE_ENABLED=true
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-8267279636493149
NEXT_PUBLIC_ADSENSE_SLOT_FEED_SIDEBAR=YOUR_FEED_SLOT_ID
NEXT_PUBLIC_ADSENSE_SLOT_SHORTS=YOUR_SHORTS_SLOT_ID
```

Leave `NEXT_PUBLIC_ADSENSE_ENABLED=false` in local development and previews. The code also fails closed unless the deployment is explicitly marked production.

## 5. Consent

- Visitors see an advertising choice banner. The AdSense script does not load until they choose **Allow ads**.
- Signed-in members can change the choice in **Settings → Advertising**.
- The local banner is not a Google-certified CMP.
- For UK/EEA traffic, configure a Google-certified consent management platform (for example AdSense Privacy & Messaging) before serving ads. Do not enable live ads in those regions until that is verified.

## 6. Placement behavior

- Feed: one responsive unit. On wide screens it is a non-sticky right rail; below 1100px it moves to the bottom of the feed. It does not overlay content.
- Shorts: a responsive unit below the Shorts feed.
- No pop-ups, interstitials, sticky overlays, or auto-refreshing units on the web.
- The feed only reserves rail space when an ad is actually rendered.

## 7. Verify before announcing

1. Open the production site on desktop and mobile.
2. Confirm the consent banner appears and ads stay off after **No ads**.
3. Choose **Allow ads** and confirm the feed rail appears on desktop and the bottom unit appears on mobile.
4. Confirm no ad covers navigation, buttons, or content.
5. Confirm `/ads.txt` returns the expected line.
6. Confirm the page head contains `google-adsense-account`.
7. Confirm `robots.txt` and firewall rules allow Google's crawler.
8. Complete AdSense site review.
9. Never click your own ads or ask members to click them.

## 8. Token reward policy

Do **not** offer tokens for allowing, viewing, or clicking ads. Google AdSense prohibits compensating users for ad views or searches. The Settings panel explicitly says no tokens or rewards are offered for viewing ads.

If you want a 10-token onboarding reward, make it a separate action such as completing a profile or enabling two-factor authentication. Do not connect it to advertising.

## 9. What remains outside the code

- Custom domain
- AdSense site approval
- Live slot IDs
- UK/EEA certified CMP
- Final privacy/legal review
- AdSense policy review of the community pages
