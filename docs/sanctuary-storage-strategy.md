# Sanctuary storage strategy: server-authoritative, local-friendly

Status: recommended architecture, not a claim that server sync or a Linux runtime is already deployed.

## Decision

Use a **server-authoritative account experience with local-first handling for large, private files and offline resilience**. “Server-based” should mean that account data is safely available across the user's signed-in devices—not that every byte on a device must be uploaded.

The browser should never be the only copy of important account data once a feature is advertised as synced. Conversely, the server should not silently ingest a user's entire music or photo library.

## Where data belongs

| Data | Recommended source of truth | Local role |
| --- | --- | --- |
| Account profile, preferences and layout mode | Authenticated database row, scoped by verified account identity | Cache last-known settings for fast startup/offline display |
| Guild library entries, tags, favourites and supported web links | Server database, owner-scoped with row-level authorization | Optimistic cache and offline edits queued for sync |
| Guild browser-game progress and achievements | Server database after server-side validation; platform-issued achievements remain authoritative | Temporary progress queue while offline |
| Linux workspace ownership, lifecycle, quota and volume reference | Server control-plane database | Display cached status only; never store provider credentials |
| Linux home directory, installed packages and user files | Encrypted persistent server volume dedicated to that workspace | Optional explicit archive/export to the user's device |
| User-selected music and photos for the current lounge session | User's device by default | Read through browser file picker; session-only object URLs |
| Optional cloud media backup | Explicitly opted-in private object storage with quotas, retention and deletion | Upload only selected files, with progress and cancel controls |
| Game scan results from an optional desktop companion | Server only after explicit consent and a clearly scoped sync action | Companion reads only the approved locations; no silent scan |
| Secrets, session tokens and provider credentials | Server-side secret store / secure session mechanism | Never persist provider secrets in localStorage |

## Why not make everything server-side?

Uploading all personal media and game files by default would increase storage, bandwidth, privacy exposure, operational cost and deletion complexity. Most music and photos already exist on the user's device, and the browser can play or display selected files without copying them to Sanctuary. Keep that behaviour local unless the user explicitly chooses a cloud backup feature.

## Why not make everything local?

Browser storage can be cleared, is quota-limited, may be unavailable in private browsing, and does not naturally sync across devices. It is also not a safe place for credentials or a real Linux filesystem. Important account settings, library metadata, collaboration state and workspace ownership should be server-backed when those features are implemented.

## Cost and quota controls

- Ship server-backed features with measured per-account storage and request limits, visible usage, sensible defaults and clear upgrade/cleanup paths.
- Put hard caps on uploads, file count, individual file size, workspace disk, CPU, memory, lifetime, concurrency and total spend.
- Apply retention policies and a tested deletion path for primary data, object versions, backups and workspace snapshots.
- Do not silently enable cloud media backup or provision paid compute. Require explicit opt-in and disclose the quota/cost before the action.
- Keep a local cache bounded; treat cache eviction as recoverable because the server is canonical.
- Provide export/restore for user-owned data and test what happens when sync fails or a quota is reached.

## Sync rules

1. Authenticate with the existing Sanctuary session and derive account identity from verified server-side claims.
2. Enforce ownership and authorization on every read/write; never trust a client-supplied owner ID.
3. Use stable record IDs, updated timestamps or revisions, idempotent writes and explicit conflict handling.
4. Show sync states such as **Synced**, **Saving**, **Offline changes**, and **Needs attention**. Do not label a local-only save as cloud-synced.
5. Queue small metadata changes while offline; do not queue large media uploads without clear user consent.
6. Keep server secrets out of browser bundles, localStorage, URLs and diagnostic logs.

## Migration path

1. Keep the current Guild library explicitly labelled device-local, with JSON export/import until its authenticated server API and row-level policies are implemented and tested.
2. Implement account-scoped library metadata storage and sync status; test two accounts, multiple devices, offline edits, deletion and quota failures before changing the UI's claim.
3. Keep audio/photo selection local. Consider a separate opt-in private-media backup only after storage quotas, signed upload/download URLs, access policies, retention and deletion tests exist.
4. Provision Cloud Lab only after a provider, region, isolation boundary, storage class, backup policy, cost ceiling and emergency shutdown path are approved.
5. Use an encrypted per-workspace persistent volume for Linux home directories. A workspace stop/start must preserve that volume; reset/delete must clearly warn about data loss and remove related snapshots according to policy.
6. Launch cloud compute behind an allowlist and hard spend cap; verify isolation and cross-account access with adversarial tests before wider access.

## Current implementation boundary

The current Guild companion stores library metadata in this browser's localStorage, keeps selected media in the current browser session, and offers JSON backup/restore. Cloud Lab is a design/status panel only. There is no server-side Guild library sync, cloud media store, persistent Linux runtime or provisioned workspace volume in this change. These boundaries must remain visible until the real services exist.
