import { MINUTE, demoId, iso } from "../../../../demo/world/ids";
import { exportUrlOf } from "../../../../demo/world/seed-accounts-parts";
import type { ExportJob } from "../../../../demo/world/world";
import { fail, type PartialHandlers } from "../handler";
import { accountOf } from "./account-store";

export const DEMO_DELETE_REFUSAL = "Demo accounts can't be deleted. Use Reset demo.";

export const settingsReads = {
  "account.sessions": (_input, runtime) =>
    accountOf(runtime).sessions.map((session) => ({
      ...session,
      lastActiveAt: session.isCurrent ? iso(runtime.now()) : session.lastActiveAt,
    })),
  "account.preferences": (_input, runtime) => ({ ...accountOf(runtime).preferences }),
} satisfies PartialHandlers<"account">;

export const settingsWrites = {
  "account.revokeSession": (input, runtime) => {
    const account = accountOf(runtime);
    if ("sessionId" in input) {
      const target = account.sessions.find((session) => session.id === input.sessionId);
      if (!target) return fail("NOT_FOUND", "That device isn't signed in any more.");
      if (target.isCurrent)
        fail("VALIDATION_FAILED", "Use Sign out of this device for the device you're on.");
      account.sessions = account.sessions.filter((session) => session.id !== target.id);
      return { ok: true };
    }
    account.sessions = account.sessions.filter((session) => session.isCurrent);
    return { ok: true };
  },
  "account.updatePreferences": (input, runtime) => {
    const account = accountOf(runtime);
    const current = account.preferences;
    account.preferences = {
      displayCurrency: input.displayCurrency ?? current.displayCurrency,
      theme: input.theme ?? current.theme,
      language: input.language ?? current.language,
      startWorkspace: input.startWorkspace ?? current.startWorkspace,
      earnChecklistHidden: input.earnChecklistHidden ?? current.earnChecklistHidden,
    };
    return { ...account.preferences };
  },
  "account.exportData": (_input, runtime) => {
    const account = accountOf(runtime);
    const jobId = demoId("export", runtime.nextId("export"));
    const job: ExportJob = {
      jobId,
      status: "ready",
      url: exportUrlOf(jobId),
      expiresAt: iso(runtime.now() + 15 * MINUTE),
    };
    account.exports.push(job);
    return { ...job };
  },
  "account.deleteAccount": () => fail("NOT_AUTHORIZED", DEMO_DELETE_REFUSAL),
} satisfies PartialHandlers<"account">;
