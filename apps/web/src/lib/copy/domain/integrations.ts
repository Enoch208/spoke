import {
  Alert01Icon,
  Alert02Icon,
  ArrowReloadHorizontalIcon,
  CancelCircleIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  ConnectIcon,
  HourglassIcon,
  Key01Icon,
  Loading03Icon,
  PauseCircleIcon,
  PlugSocketIcon,
  RefreshIcon,
  SignatureIcon,
  ToggleOffIcon,
  Unlink02Icon,
  WebhookIcon,
} from "@hugeicons/core-free-icons";
import type { ExplainedChip } from "../types";

export const integrationStateCopy = {
  notConnected: {
    label: "Not connected",
    icon: PlugSocketIcon,
    tone: "faint",
    explainer: "Connect {provider} to let its orders earn rewards.",
  },
  connecting: {
    label: "Connecting",
    icon: Loading03Icon,
    tone: "sky",
    explainer: "Waiting for {provider} to confirm access.",
  },
  connected: {
    label: "Connected",
    icon: ConnectIcon,
    tone: "lime",
    explainer: "Orders from {store} can be attested since {date}.",
  },
  needsAttention: {
    label: "Needs attention",
    icon: Alert01Icon,
    tone: "amber",
    explainer: "{provider} access expired or was changed. Reconnect to keep attesting orders.",
  },
  disconnected: {
    label: "Disconnected",
    icon: Unlink02Icon,
    tone: "faint",
    explainer: "No new orders are attested. Past attested orders keep their state.",
  },
} as const satisfies Record<string, ExplainedChip>;

export const signerStateCopy = {
  active: {
    label: "Active",
    icon: SignatureIcon,
    tone: "lime",
    explainer: "Can attest orders until {expiresAt}.",
  },
  expired: {
    label: "Expired",
    icon: HourglassIcon,
    tone: "faint",
    explainer: "Can’t attest new orders. Add a new signer.",
  },
  suspended: {
    label: "Suspended",
    icon: PauseCircleIcon,
    tone: "amber",
    explainer: "Paused after a risk flag. New attestations are held for review.",
  },
  revoked: {
    label: "Revoked",
    icon: CancelCircleIcon,
    tone: "pink",
    explainer: "Revoked {date}. Affects only attestations after revocation.",
  },
} as const satisfies Record<string, ExplainedChip>;

export const apiKeyStateCopy = {
  active: {
    label: "Active",
    icon: Key01Icon,
    tone: "lime",
    explainer: "Scopes: {scopes}. Last used {time}.",
  },
  revoked: {
    label: "Revoked",
    icon: CancelCircleIcon,
    tone: "pink",
    explainer: "Requests with this key are rejected since {date}.",
  },
} as const satisfies Record<string, ExplainedChip>;

export const webhookEndpointStateCopy = {
  enabled: {
    label: "Enabled",
    icon: WebhookIcon,
    tone: "lime",
    explainer: "Receiving {eventCount} event types.",
  },
  failing: {
    label: "Failing",
    icon: Alert02Icon,
    tone: "pink",
    explainer: "The last {failureCount} deliveries failed. Check the endpoint, then replay.",
  },
  disabled: {
    label: "Disabled",
    icon: ToggleOffIcon,
    tone: "faint",
    explainer: "No events are sent. Deliveries resume when you enable it.",
  },
} as const satisfies Record<string, ExplainedChip>;

export const webhookDeliveryStateCopy = {
  queued: {
    label: "Queued",
    icon: Clock01Icon,
    tone: "amber",
    explainer: "Waiting to send.",
  },
  delivered: {
    label: "Delivered",
    icon: CheckmarkCircle02Icon,
    tone: "lime",
    explainer: "Your endpoint answered {statusCode} in {duration}.",
  },
  retrying: {
    label: "Retrying",
    icon: RefreshIcon,
    tone: "sky",
    explainer:
      "Attempt {attempt} of {maxAttempts} failed ({statusCode}). Next try {nextAttemptAt}.",
  },
  failed: {
    label: "Failed",
    icon: Alert02Icon,
    tone: "pink",
    explainer: "All {maxAttempts} attempts failed. The event is kept for replay.",
  },
  replayed: {
    label: "Replayed",
    icon: ArrowReloadHorizontalIcon,
    tone: "sky",
    explainer: "Sent again on request at {time}.",
  },
} as const satisfies Record<string, ExplainedChip>;
