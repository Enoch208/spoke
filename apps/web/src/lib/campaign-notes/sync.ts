import { encryptedNote, type EncryptedNote } from "./crypto";

export const chooseNoteCopy = (
  local: EncryptedNote | null,
  remote: EncryptedNote | null,
  preference?: "local" | "synced" | "offline",
) => {
  if (
    local &&
    remote &&
    local.revision === remote.revision &&
    JSON.stringify(encryptedNote.parse(local)) !== JSON.stringify(encryptedNote.parse(remote))
  )
    throw new Error(
      "A saved revision differs between devices. Keep your local backup and contact support.",
    );
  const conflict = Boolean(local && remote && local.revision !== remote.revision);
  if (conflict && !preference) return { conflict: true as const, selected: null };
  return {
    conflict: false as const,
    selected: preference === "local" || preference === "offline" ? local : (remote ?? local),
  };
};
export const canSyncRevision = (
  remote: string | null,
  opened: string | null,
  local: string | null,
) => remote === opened || remote === local;
