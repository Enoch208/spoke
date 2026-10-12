import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { asset } from "@spoke/protocol";
import { newId, type StoredRecord } from "../db/store.js";
import { ApiProblem } from "../http/problem.js";
import type { Services } from "../types.js";

export const assetView = (row: StoredRecord) => asset.parse({ id: row.id, ...row.payload });
export const assetPath = (services: Services, id: string) => {
  if (!services.storageDirectory)
    throw new ApiProblem(503, "FEATURE_NOT_AVAILABLE", "File storage is not configured.");
  return join(services.storageDirectory, z.uuid().parse(id));
};
export const storeAsset = async (
  services: Services,
  owner: string,
  file: File,
  productId: string | null,
  logo = false,
) => {
  z.file()
    .min(1)
    .max(logo ? 2_000_000 : 25_000_000)
    .parse(file);
  const image = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  if (logo && !image)
    throw new ApiProblem(400, "VALIDATION_FAILED", "Upload a PNG, JPG or WebP image.");
  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  let dimensions: { width: number; height: number } | undefined;
  if (image) {
    try {
      const decoder = sharp(bytes, { limitInputPixels: 16_777_216 });
      const metadata = await decoder.metadata();
      if (!metadata.width || !metadata.height || !["png", "jpeg", "webp"].includes(metadata.format))
        throw new Error("Invalid image");
      if (logo && (metadata.width !== metadata.height || metadata.width < 256))
        throw new Error("Invalid logo dimensions");
      const encoded = await decoder
        .rotate()
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      bytes = encoded.data;
      dimensions = { width: encoded.info.width, height: encoded.info.height };
    } catch {
      throw new ApiProblem(
        400,
        "VALIDATION_FAILED",
        logo
          ? "The logo must be a square image of at least 256 pixels."
          : "The image could not be decoded safely.",
      );
    }
  }
  const id = newId();
  const path = assetPath(services, id);
  await mkdir(services.storageDirectory ?? "", { recursive: true, mode: 0o700 });
  await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
  const payload = {
    productId,
    kind: image ? "image" : "download",
    mime: image ? "image/webp" : "application/octet-stream",
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(image
      ? {
          url: new URL(`/v1/assets/${id}`, services.apiOrigin ?? services.webOrigin).href,
          ...dimensions,
        }
      : {}),
  };
  return services.store.put("asset", id, owner, payload);
};
export const loadAsset = async (services: Services, id: string) => {
  const row = await services.store.require("asset", z.uuid().parse(id));
  const bytes = await readFile(assetPath(services, id));
  if (createHash("sha256").update(bytes).digest("hex") !== row.payload.sha256)
    throw new ApiProblem(
      503,
      "UPSTREAM_UNAVAILABLE",
      "Stored file integrity could not be verified.",
      true,
    );
  return { row, bytes };
};
