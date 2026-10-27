# Contributing to The Sanctuary

Welcome. The project uses small, reviewable changes so the product can evolve without losing track of what is real, what is a prototype, and what still needs verification.

## Start here

- Read the [collaboration guide](docs/COLLABORATION_GUIDE.md) for branches, pull requests, previews, reviews, and access.
- Read the [beta testing guide](docs/BETA_TESTING_GUIDE.md) to report bugs and product feedback.
- Use the GitHub issue templates for a bug or feature request.
- Use the pull-request template when proposing code changes.

## Rules of contribution

1. Work on a branch; do not push normal feature work directly to main.
2. Keep one coherent user outcome per pull request.
3. Describe what changed, how to test it, limitations, and rollback.
4. Label unfinished UI honestly: Available, In preview, In design, or Safety gated.
5. Never include credentials, tokens, private user data, or environment files.
6. Do not apply production migrations, change production settings, enable purchases, or alter account roles as part of a UI change.
7. Do not claim a feature is live based only on a passing build or an open pull request.
8. Ask before changing collaborator permissions or merging a major release.

## Verification

Run the repository's relevant checks before opening a PR. For the visible beta showcase, run:

- `npm run check:showcase`
- `npm run typecheck`
- `npm run build`

The checks support review; they do not replace browser testing on mobile and desktop or staging verification for database/auth/payment/moderation work.
