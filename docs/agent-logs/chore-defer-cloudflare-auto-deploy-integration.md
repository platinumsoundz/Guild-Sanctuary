# Integration release guard — 2026-10-28

## Purpose
Keep production deployment separate from repository integration while active Sanctuary feature branches are reviewed and consolidated.

## Base and branch
- Repository: `platinumsoundz/Guild-Sanctuary`
- Base: `main` at `eba8beafc67932f10287aa7147cee3073ea1e1ed`
- Branch: `chore/defer-cloudflare-auto-deploy-integration`
- Change commit: `34757687a70610f3f92c794c7fa88e48533dbaf7`

## Change
- Preserve Cloudflare build validation for pull requests and pushes to `main`.
- Restrict the actual Cloudflare deploy command to an explicit `workflow_dispatch`.
- Print a clear notice when a PR or main push is build-only.
- Keep credential/config checks and the existing owner-controlled secrets unchanged.

## Why
The owner requested a larger integration batch and explicitly deferred production deployment until the work is ready. Since a push to `main` previously could automatically deploy when credentials were present, merging ready work before the release batch could unexpectedly deploy intermediate states.

## Verification and limits
- Source-level workflow review completed.
- CI, YAML/workflow execution, Cloudflare build and deploy behavior must be verified by the PR's GitHub Actions run.
- This change does not edit provider settings or secrets, run a deployment, or claim production behavior has been verified.
- Manual workflow dispatch remains capable of deploying if owner-controlled credentials/config are present; do not dispatch it during integration.

## Rollback
Revert the workflow change to restore the prior automatic deployment behavior. Only do so when the owner explicitly resumes the release process.

## Next steps
- Confirm this PR's workflow checks pass.
- Integrate it before merging other safe, reviewed branches so main pushes remain build-only during integration.
- Keep database migrations and security-sensitive changes gated by their documented owner/staging review requirements.
