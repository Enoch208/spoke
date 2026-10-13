import { z } from "zod";

const credentialSchema = z.object({
  credentialId: z.string().min(16),
  transports: z
    .array(z.enum(["usb", "nfc", "ble", "internal", "hybrid", "smart-card"]))
    .default([]),
  kind: z.enum(["original", "added"]).optional(),
});
const key = "spoke-passkey";

export const storedPasskey = () => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    const parsed = credentialSchema.safeParse(value);
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

export const rememberPasskey = (value: unknown) => {
  const parsed = credentialSchema.parse(value);
  localStorage.setItem(key, JSON.stringify(parsed));
  return parsed;
};
