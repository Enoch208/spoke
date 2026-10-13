# Changelog

## 0.1.2 — 2026-10-13

Publish the SDK on npm as `@enochid/spoke-sdk`, with matching installation and import examples. This replaces the `@spoke/sdk` name used by the earlier GitHub-only archives; change the dependency and import path when upgrading. Runtime behavior and the API contract are unchanged.

## 0.1.1 — 2026-10-13

Publish the SDK archive through the public documentation repository, with corrected install and support links. Runtime behavior and the API contract are unchanged from 0.1.0.

## 0.1.0 — 2026-10-13

First independently installable release of the public read SDK.

- 32 public read methods with shared input and response validation.
- ESM and CommonJS builds with TypeScript declarations.
- `readEnvelope` retains request IDs, chain context, block numbers, and indexing status.
- `SpokeApiError` retains API error codes, status, request ID, and retryability.
- Ten-second timeouts and credential-free requests.
- Protocol schemas bundled into the release; no private workspace package is required.

This release targets Spoke API v1 and the v3.0 schema on Monad Testnet. It does not sign transactions or provide authenticated write methods. Before 1.0, breaking changes increment the minor version; compatible fixes increment the patch version. Pin an exact version when reproducibility matters.
