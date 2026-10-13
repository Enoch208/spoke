import { fill } from "@/lib/copy";
import { uploadCopy as copy } from "../copy/upload";

export type UploadKind = "productImage" | "deliverable" | "logo" | "avatar";

const mb = 1_000_000;

const rules = {
  productImage: { types: ["png", "jpg", "jpeg", "webp"], label: "PNG, JPG or WebP", limit: 5 * mb },
  deliverable: {
    types: ["pdf", "zip", "epub", "mp4", "png", "jpg", "jpeg", "webp", "csv", "txt", "md"],
    label: "ZIP, PDF, EPUB, MP4, PNG, JPG, WebP, CSV, TXT or MD",
    limit: 25 * mb,
  },
  logo: { types: ["png", "jpg", "jpeg", "webp"], label: "PNG, JPG or WebP", limit: 2 * mb },
  avatar: { types: ["png", "jpg", "jpeg", "webp"], label: "PNG, JPG or WebP", limit: 2 * mb },
} as const;

const executables = new Set(["exe", "dmg", "apk", "msi", "sh", "bat", "cmd", "app", "jar"]);

export const formatMegabytes = (bytes: number) => {
  const tenths = Math.round((bytes / mb) * 10);
  if (tenths === 0 && bytes > 0) return "under 0.1 MB";
  return `${String(Math.floor(tenths / 10))}.${String(tenths % 10)} MB`;
};

const extension = (name: string) => name.split(".").at(-1)?.toLowerCase() ?? "";

export const checkFile = (kind: UploadKind, file: File): string | null => {
  const rule = rules[kind];
  const ext = extension(file.name);
  if (executables.has(ext)) return copy.errors.executable;
  if (!rule.types.some((type) => type === ext))
    return fill(copy.errors.type, { types: rule.label });
  if (file.size === 0) return copy.errors.empty;
  if (file.size > rule.limit)
    return fill(copy.errors.size, {
      size: formatMegabytes(file.size),
      limit: formatMegabytes(rule.limit),
    });
  return null;
};

export const acceptFor = (kind: UploadKind) =>
  rules[kind].types.map((type) => `.${type}`).join(",");

export const isImageKind = (kind: UploadKind) => kind !== "deliverable";
