import { fail, type DomainHandlers } from "../handler";
export const workspaceHandlers = {
  "workspace.list": () => ({ items: [], maxNotes: 100 }),
  "workspace.get": () => ({ note: null, updatedAt: null }),
  "workspace.save": () =>
    fail(
      "FEATURE_NOT_AVAILABLE",
      "Encrypted workspace sync requires a live Spoke passkey account. Demo does not store private notes.",
    ),
} satisfies DomainHandlers<"workspace">;
