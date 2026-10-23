# Settings

Owns the account settings hub, persisted account preferences, profile privacy controls, social-link editing, layout selection, the private encrypted profile vault, and account deletion confirmation UI. Social links include Facebook, X/Twitter, YouTube, Xbox, PlayStation, Steam, Epic Games, and Reddit. Gaming network handles may be entered as handles; web profiles must use HTTPS and an approved host.

When Supabase is configured, preferences load from and save to `account_settings`, and profile privacy/social-link changes write to `profiles`. The private vault uses AES-GCM with a PBKDF2-derived key; only ciphertext and salt are stored in `private_profile_vault`. The passphrase never leaves the browser, and there is no recovery if it is lost. The vault UI is hidden when Supabase is absent.

Account deletion requires the active session, matching email, exact `DELETE` phrase, and the TOTP code when 2FA is enabled. The Supabase path calls `POST /api/account/delete`, which removes stored media and deletes the auth user server-side. The local demo path uses browser storage only. Production still needs an auditable retention policy and backup rotation review.
