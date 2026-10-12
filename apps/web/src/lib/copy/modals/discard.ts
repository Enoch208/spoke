import type { Message } from "../types";

type DiscardDialogCopy = Message & {
  readonly actions: Readonly<Record<string, string>>;
  readonly states: Readonly<Record<string, string>>;
};

export const discardDialog = {
  title: "Discard changes?",
  body: "You have unsaved changes to {subject}. If you leave now, they’ll be lost.",
  actions: { keepEditing: "Keep editing", saveDraft: "Save draft", discard: "Discard" },
  states: { saveFailed: "Couldn’t save your draft. Keep editing, or discard." },
} as const satisfies DiscardDialogCopy;
