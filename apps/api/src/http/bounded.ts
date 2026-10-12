import { ApiProblem } from "./problem.js";

export const boundedText = async (response: Response, maxBytes: number) => {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const value: unknown = chunk.value;
      if (!(value instanceof Uint8Array))
        throw new ApiProblem(503, "UPSTREAM_UNAVAILABLE", "Response body is invalid.");
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ApiProblem(503, "UPSTREAM_UNAVAILABLE", "Response exceeded the size limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
};
