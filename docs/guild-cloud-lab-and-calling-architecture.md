# Guild Cloud Lab and calling scale-out architecture

Status: design and implementation checklist only. No terminal runtime, compute provider, TURN provider, SFU, or cloud media storage is provisioned by this document.

## Guild Cloud Lab: persistent Linux workspace

### User experience
- Guild shows a clear provisioned / stopped / starting / error state and never presents a fake shell.
- A member explicitly creates a workspace, sees its storage and runtime quota, and can start, stop, reset, export, or delete it.
- Terminal output is streamed to the member's authenticated browser. Session reconnect restores the same workspace after a browser refresh.
- Persistent home storage survives workspace stop/restart; reset and delete require confirmation and explain data-loss impact.
- Package installation is performed by the actual isolated guest OS, subject to disk, CPU, memory, process, runtime and network quotas.

### Repository control-plane groundwork

- A staged migration now defines a safe, owner-readable `guild_workspace_status` row for lifecycle state and bounded disk/CPU/memory/runtime quotas.
- The first release enforces one persistent workspace per account and makes status rows read-only to browser clients. A server-side orchestrator must perform lifecycle transitions after authorization, quota and spend checks.
- Infrastructure mappings live separately in `guild_workspace_runtime_private`; provider instance IDs and persistent-volume references are not granted to browser roles. Only `service_role` receives table privileges for this private mapping.
- Authenticated members can read only their own active-account status row. They cannot directly create, change, or delete workspace status through the browser; a future server-side orchestrator must own lifecycle transitions.
- These tables are schema groundwork only. The migration is not applied, and no provider, runtime, volume, terminal gateway, or billing path has been provisioned.

### Required control plane
1. Authenticate every action with the current Sanctuary session and resolve the account from verified claims, never from a client-supplied user ID.
2. Check active-account status, workspace ownership, plan limits and abuse/rate limits before provisioning or opening a terminal.
3. Keep provider credentials in server-side secrets. Browser code receives only short-lived, narrowly scoped connection credentials.
4. Maintain a server-side workspace record with owner, provider instance ID, lifecycle state, quota, timestamps and storage reference. Never store shell output or arbitrary secrets in ordinary application logs.
5. Use an authenticated gateway to a dedicated per-workspace runtime. Revalidate ownership on every WebSocket connection and reconnect.
6. Mount only that workspace's persistent home volume. Never mount host paths, provider sockets, application secrets or another user's volume into the guest.

### Isolation and operations
- Prefer a hardened VM or microVM boundary for untrusted package installs and user code. If containers are chosen, require a separately reviewed isolation profile and document the residual shared-kernel risk.
- Run as a non-root guest user; apply CPU, memory, disk, process and wall-clock limits; cap concurrent workspaces; enforce idle shutdown and maximum lifetime.
- Default to restricted outbound networking. Block cloud metadata endpoints, internal control-plane addresses, private networks and abuse-prone ports; use an explicit allowlist or controlled egress proxy where feasible.
- Do not offer privileged Docker-in-Docker, host networking, arbitrary port exposure, inbound public listeners, or unrestricted persistent daemons in the first release.
- Encrypt persistent volumes, use per-workspace access controls, define retention and deletion behavior, and test deletion of both active instances and snapshots.
- Emit minimal audit events for provision/start/stop/reset/delete and policy denials. Never log terminal input, environment variables or credential contents by default.
- Add provider spend budgets, concurrency caps, abuse alerts, incident shutdown, backup/restore drills and a documented kill switch before enabling general access.

### Release sequence
1. Decide provider, runtime boundary, region, retention and cost ceiling.
2. Implement schema and owner-only administrative provisioning with idempotent lifecycle operations.
3. Add authenticated gateway and a single disposable test workspace; run cross-account authorization tests.
4. Add persistent volumes and verify restart, backup, restore, quota enforcement and complete deletion.
5. Run isolation, SSRF/egress, secret-leakage, abuse and load tests.
6. Launch behind an explicit opt-in/allowlist with a hard spending cap. Expand only after real operational evidence.

## Calling: production rollout and group-call path

### Current one-to-one path
- Sanctuary message threads own call invitations and private Realtime signalling.
- WebRTC carries media directly or through a configured TURN relay; Realtime carries negotiation metadata only.
- TURN credentials must be short-lived, authenticated, no-store, and minted only for an active conversation member.
- Before production, verify Realtime public-access settings, migration history, two-account membership RLS, private-channel sender binding, HTTPS/media permissions, browser backgrounding, network changes, device switching and disconnect recovery.
- Deploy the ICE configuration Edge Function only after setting the canonical HTTPS `APP_BASE_URL`. Configure `TURN_SERVER_URLS` and `TURN_SHARED_SECRET` as server-only function secrets if the selected TURN provider supports the expected REST/HMAC credential format.
- Do not treat the existing STUN fallback as reliable connectivity across restrictive networks.

### Group calling
- Do not extend the current peer-to-peer mesh to large groups: every client would send separate media streams to every other participant, multiplying upload bandwidth and connection complexity.
- Use an SFU for group media, with authenticated room creation, active-conversation membership checks, short-lived room tokens, participant limits, rate limits and explicit join/leave signalling.
- Keep the media plane and room tokens separate from text-message storage. Do not record calls by default; if recording is ever introduced, require explicit consent, visible indicators, retention/deletion policy and jurisdiction review.
- Ship group calling only after one-to-one reliability, abuse handling, permission UX, reconnect behavior and cross-account security tests pass.

## Explicit non-goals for this stage
- No provider credentials or infrastructure are created by this specification.
- No shell runs in the browser itself.
- No public game server or arbitrary inbound port mapping.
- No automatic recording, transcription, or end-to-end-encryption claim for Sanctuary text messages.


## Storage strategy alignment

The default is server-authoritative account data with bounded local caching, not unconditional server upload of every local file. See `docs/sanctuary-storage-strategy.md` for data placement and sync rules. A future Linux workspace must use an encrypted persistent server volume; localStorage is not a substitute for a Linux home directory. The Guild library schema is staged in `supabase/migrations/20261028214500_guild_library_entries.sql`, but that migration has not been applied or live-tested; Guild Companion now includes an explicit authenticated sync path that requires it to be applied. User-selected music and photos remain on-device unless a separate, explicitly opted-in cloud backup is implemented with quotas and deletion guarantees.

### Cloud Lab control endpoint scaffold

- Added `supabase/functions/guild-cloud-lab-control` as an authenticated, same-origin control-plane entry point. It resolves the member from verified session claims, checks the active account, and only selects the caller's own workspace status.
- The `status` action is read-only. It returns no-store responses and reports missing schema/runtime as unavailable instead of fabricating a running terminal.
- `start`, `stop`, `reset`, and `delete` intentionally fail closed with `RUNTIME_NOT_CONFIGURED` until a real provider adapter, idempotent job queue, spend guard, and persistent-volume lifecycle exist. The endpoint does not provision compute or mutate lifecycle state.
- The function requires JWT verification in `supabase/config.toml`. It is repository code only and has not been deployed or tested against a live project. Configure the canonical HTTPS `APP_BASE_URL` before any staging test.
- Static source-contract coverage is available via `npm run check:guild-cloud-lab-control`; this is not a substitute for authenticated cross-account tests.

## Current calling implementation status

- The conversation panel implements one-to-one audio/video calls with private Realtime signalling, WebRTC media, incoming accept/decline, mute/camera controls, hang-up, invite timeout, reconnect feedback, and bounded payload/ICE handling.
- Incoming broadcast payloads are validated before any call state changes; the pre-description ICE candidate queue is capped. Signalling database policies and the ICE-config function enforce active conversation membership and active-account status.
- Calls use browser-provided WebRTC encryption and are not recorded by Sanctuary. Group calling is not implemented; it should use an SFU rather than mesh connections as the product grows.
- STUN fallback may work on many networks, but cannot guarantee connectivity through restrictive NATs/firewalls. Reliable broad coverage requires a configured TURN relay; the server-side credential function supports configuration, but no TURN service or secrets are provisioned here.
- Source-contract checks do not establish that audio/video works between real devices. Before calling this production-ready, run authenticated two-device tests for audio and video, permission denial, incoming timeout, reject/hang-up, tab refresh, reconnect, restricted networks, and cross-account/left-member access. Check Supabase Realtime private-channel settings in the deployed project.
- Cloud Lab is explicitly **in development / pinned for later**. The current app and Supabase schema alone do not provide a safe persistent Linux guest; no provider has been selected and no compute is running.

