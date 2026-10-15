# Spoke operations

The web and API bind to loopback behind Caddy. PostgreSQL runs in `spoke-db` on a dedicated internal Docker network. The host API connects to its private bridge address; no database port is exposed publicly. Keep `DATABASE_URL` aligned with the container address when recreating it. HyperIndex runs as an unprivileged user in `spoke-indexer`, with its metrics bound to loopback. Its separate egress network permits HyperSync and the independent live Monad RPC source; the API uses its private provider to verify canonical hashes.

Deploy a verified Git revision using a clean archive, install frozen workspace dependencies and build the web app. Keep server credentials in private environment files outside the archive. Restart only `spoke-api`, `spoke-web` and the dedicated indexer container. Retain the previous release and environment for rollback.

## Email sign-in

Set `NEXT_PUBLIC_REOWN_PROJECT_ID` before building the web app. In that project's Reown Dashboard configuration, enable Social & Email and allowlist the exact production origin, `https://usespoke.xyz`. Check the project ID used by the deployed build rather than relying on the project's display name. Review other applications using the project before changing its domain list; prefer a separate project for each application.

Verify email sign-in on the production origin. A successful localhost test is insufficient: the provider's secure iframe allows localhost separately. If production stalls while localhost works, inspect the browser console for a `frame-ancestors` CSP error from `secure.walletconnect.org`. Confirm the provider response allows the production origin. Reown documents that allowlist changes can take 15 minutes to apply; a cached iframe may also need a hard reload after the policy updates. Do not disable CSP, proxy the credential frame, or broaden the API's allowed origins to fix this.

Complete the verification-code step in the browser, then confirm Spoke creates an authenticated session and loads the account. Seeing the code form or receiving an email alone does not prove that final step. Keep codes, session tokens and provider credentials out of logs. The installed provider timeout patch is documented in [`patches/README.md`](../patches/README.md); it makes failed requests recoverable but does not replace correct provider configuration.

Reference: [Reown relay origin allowlist](https://docs.reown.com/walletkit/ios/cloud/relay).

## Public redirects

`caddy/spoke-redirects.caddy` contains the public `/video` redirect. Install it as `/etc/caddy/spoke-redirects.caddy` and import it inside the `usespoke.xyz` site block:

```caddyfile
usespoke.xyz {
	import /etc/caddy/spoke-redirects.caddy
	encode zstd gzip
	reverse_proxy 127.0.0.1:3040
}
```

Keep the existing site configuration and other domains intact. Back up the active Caddyfile, validate the candidate with `caddy validate --config /path/to/candidate --adapter caddyfile`, and reload Caddy only after validation succeeds. Both `/video` and `/video/` return a 302 redirect to the configured YouTube URL, with `Cache-Control: no-store` so the destination can be updated. The existing `www` redirect also preserves the path. Verify the live `Location` header after reloading; no application rebuild is required.

## Backups

Install the supplied service and timer in `/etc/systemd/system`, create `/srv/spoke/backups` with mode 700, then enable `spoke-backup.timer`. Run `spoke-backup.service` once and check its exit status. The backup checks the PostgreSQL archive catalog before publishing the dump and also archives immutable private assets. Files are mode 600. This is a host-local backup; copy encrypted backups off the host for disaster recovery. Monitor free disk space and apply a retention policy appropriate to the deployment.

Before restoring, stop Spoke API writes and the indexer. Restore into a fresh database and validate it before switching the API's connection. Use `pg_restore --no-owner --no-acl`, then restore private assets with their existing hashes and Spoke ownership. Never overwrite a shared database or another application's storage. Resume HyperIndex from its persisted checkpoint and check the API cursor, reconciliation and receipt verification.

## Health

Check `/v1/health`, `/v1/system/status`, `/v1/system/contracts` and the indexer's local `/healthz`. HyperSync can lag the RPC head. Preserve its reported timestamp and expose `behind` to clients; do not label delayed data as current. A failed batch retains the last committed cursor. Replays rebuild only derived chain state; accounts and catalog versions are preserved.

Nansen refreshes are explicit and budgeted. Preserve both cached responses and budget records when deploying or restoring. Never trigger a live query from a page view or reset the budget to conceal earlier calls.
