# Token shop and founding-member reward — current product direction

**Status:** repository proposal and migrations only. Nothing has been applied to a remote Supabase database. Token redemption remains disabled.

## Pricing

The standard token bundle rate is 100 tokens for £1. The cosmetic catalogue has been repriced to an affordable 20–50 token range (20p–50p at that standard rate). All 32 items are listed in [SHOP_CATALOGUE.md](src/modules/economy/SHOP_CATALOGUE.md).

- Premium themes: 50 tokens each.
- Everyday profile effects and badges: 20 tokens.
- Frames and banners: 30–50 tokens.
- No cosmetic item exceeds 50 tokens.

## First-100 thank-you reward

The previous 1,000-token proposal is superseded.

- The first 100 eligible, verified, active, distinct accounts receive 500 tokens total each.
- Existing accounts among the first 100 already have the original 100-token welcome balance; the new migration adds 400 tokens to bring their original welcome allocation to 500.
- Eligible signups after the programme opens receive 500 tokens.
- A private database allocation pool serializes awards; each account and rank can be awarded only once. Awards are created only by trusted database triggers after email verification and profile creation.
- Maximum total first-100 allocation is 50,000 tokens, counting the original 100-token welcome amounts for existing accounts.

## Security and release gates

- The bonus migration creates an auditable account award record and a server-side balance update in one transaction. No client-side amount, rank, or account ID can be supplied to the grant function.
- No paid checkout, redemption, game spending, transfers, trading, or cash-out is enabled by this change.
- Both the repricing and bonus migrations are code-only and **NOT APPLIED**.
- Before any production migration, owner-reviewed isolated staging must confirm the existing account count and original balances, test the first-100 cap under concurrent verification, confirm one grant per account, verify the wallet/award ledger, and test RLS/privileges.
- Do not call the bonus live or promise a specific user's eligibility until the migration has been applied and the resulting award is visible in that user's wallet.

## Ownership boundary

The project owner performs remote Supabase operations, migration application, secrets, payment configuration, and production release. Contributors prepare repository changes and test contracts only.
