# Spoke operations

The web and API bind to loopback behind Caddy. PostgreSQL runs in `spoke-db` on a dedicated internal Docker network with a loopback-only port. HyperIndex runs as an unprivileged user in `spoke-indexer`, with its metrics bound to loopback. Its separate egress network permits HyperSync access.

Deploy a verified Git revision using a clean archive, install frozen workspace dependencies and build the web app. Keep server credentials in private environment files outside the archive. Restart only `spoke-api`, `spoke-web` and the dedicated indexer container. Retain the previous release and environment for rollback.

## Backups

Install the supplied service and timer in `/etc/systemd/system`, create `/srv/spoke/backups` with mode 700, then enable `spoke-backup.timer`. Run `spoke-backup.service` once and check its exit status. The backup checks the PostgreSQL archive catalog before publishing the dump and also archives immutable private assets. Files are mode 600. This is a host-local backup; copy encrypted backups off the host for disaster recovery. Monitor free disk space and apply a retention policy appropriate to the deployment.

Before restoring, stop Spoke API writes and the indexer. Restore into a fresh database and validate it before switching the API's connection. Use `pg_restore --no-owner --no-acl`, then restore private assets with their existing hashes and Spoke ownership. Never overwrite a shared database or another application's storage. Resume HyperIndex from its persisted checkpoint and check the API cursor, reconciliation and receipt verification.

## Health

Check `/v1/health`, `/v1/system/status`, `/v1/system/contracts` and the indexer's local `/healthz`. HyperSync can lag the RPC head. Preserve its reported timestamp and expose `behind` to clients; do not label delayed data as current. A failed batch retains the last committed cursor. Replays rebuild only derived chain state; accounts and catalog versions are preserved.

Nansen refreshes are explicit and budgeted. Preserve both cached responses and budget records when deploying or restoring. Never trigger a live query from a page view or reset the budget to conceal earlier calls.
