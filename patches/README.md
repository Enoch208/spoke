# Reown email request recovery

`@reown/appkit-wallet@2.0.0-wagmi-3.0` is pinned to the application's Wagmi 3 adapter. Its original frame initialization waits indefinitely for a readiness event, and its request timeout aborts the shared controller without rejecting the request promise. Both paths can leave the email form spinning.

The pnpm patch reuses the frame's readiness promise, shares the complete initialization handshake, and rejects unavailable frame or initialization requests after 20 seconds. Email and OTP requests reject after 60 seconds. Request handlers and timers are cleaned up on completion, failure, or cancellation, and timeout recovery does not permanently abort the shared provider. Wallet signing does not receive the email request deadline.

`apps/web/tests/email-provider.test.ts` exercises the installed, patched provider against a controlled frame transport. It covers delayed readiness, missing initialization responses, concurrent initialization, email and OTP timeouts, retry, and wallet-signature cancellation. These tests do not establish real email delivery or successful OTP authentication.

Remove this patch only when the pinned upstream release has equivalent behavior and these regressions pass without it. Install dependencies with the committed lockfile so production receives the same patch. The application separately limits AppKit startup to 20 seconds.
