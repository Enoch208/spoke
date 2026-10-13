import {
  apiError,
  clientMethodSchemas,
  clientRoutes,
  envelope,
  type ClientInput,
  type ClientOutput,
  type ErrorCode,
} from "@spoke/protocol";
import { z } from "zod";

export const publicReadMethods = [
  "campaigns.list",
  "campaigns.get",
  "campaigns.policy",
  "campaigns.stats",
  "campaigns.activity",
  "products.get",
  "products.categories",
  "merchants.get",
  "merchants.record",
  "merchants.offers",
  "links.get",
  "links.resolveCode",
  "graph.forCampaign",
  "graph.ancestry",
  "graph.salePath",
  "graph.search",
  "checkout.preview",
  "receipts.get",
  "receipts.events",
  "receipts.verify",
  "receipts.recent",
  "receipts.forCampaign",
  "reputation.get",
  "distributors.search",
  "distributors.get",
  "networks.list",
  "tokens.list",
  "system.health",
  "system.status",
  "system.contracts",
  "system.endpoints",
  "system.events",
] as const;
export type PublicReadMethod = (typeof publicReadMethods)[number];
export type SpokeReadEnvelope<M extends PublicReadMethod> = Omit<
  z.infer<ReturnType<typeof envelope>>,
  "data"
> & { data: ClientOutput<M> };
export type SpokeReadInput<M extends PublicReadMethod> = ClientInput<M>;
export type SpokeReadOutput<M extends PublicReadMethod> = ClientOutput<M>;
export class SpokeApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number,
    public requestId: string | null,
    public retryable: boolean,
  ) {
    super(message);
    this.name = "SpokeApiError";
  }
}
export const createSpokeClient = (options: { baseUrl: string; fetch?: typeof fetch }) => {
  const origin = z
    .url()
    .refine((value) => ["https:", "http:"].includes(new URL(value).protocol))
    .parse(options.baseUrl);
  const transport = options.fetch ?? fetch;
  const readEnvelope = async <M extends PublicReadMethod>(
    method: M,
    input: ClientInput<M>,
  ): Promise<SpokeReadEnvelope<M>> => {
    if (!(publicReadMethods as readonly string[]).includes(method))
      throw new TypeError("This method is not part of the public read SDK.");
    const schema = clientMethodSchemas[method];
    const parsed = schema.input.parse(input);
    const fields = z.record(z.string(), z.unknown()).parse(parsed);
    const route = clientRoutes[method];
    const pathFields = new Set<string>();
    const path = route.path.replace(/:([\w]+)/g, (_, key: string) => {
      const value = fields[key];
      if (typeof value !== "string" && typeof value !== "number")
        throw new TypeError(`Missing path parameter ${key}`);
      pathFields.add(key);
      return encodeURIComponent(String(value));
    });
    const url = new URL(`/v1${path}`, origin);
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || pathFields.has(key)) continue;
      url.searchParams.set(
        key,
        typeof value === "object"
          ? JSON.stringify(value)
          : String(z.union([z.string(), z.number(), z.boolean()]).parse(value)),
      );
    }
    const response = await transport(url, {
      headers: { accept: "application/json" },
      credentials: "omit",
      signal: AbortSignal.timeout(10_000),
    });
    const raw: unknown = await response.json();
    if (!response.ok) {
      const problem = apiError.safeParse(raw);
      throw new SpokeApiError(
        problem.success ? problem.data.error.code : "UPSTREAM_UNAVAILABLE",
        problem.success
          ? problem.data.error.message
          : "The API returned an invalid error response.",
        response.status,
        problem.success ? problem.data.error.requestId : response.headers.get("x-request-id"),
        problem.success ? problem.data.error.retryable : true,
      );
    }
    return envelope(schema.output).parse(raw) as SpokeReadEnvelope<M>;
  };
  return {
    readEnvelope,
    async read<M extends PublicReadMethod>(
      method: M,
      input: ClientInput<M>,
    ): Promise<ClientOutput<M>> {
      return (await readEnvelope(method, input)).data;
    },
  };
};
export type SpokeReadClient = ReturnType<typeof createSpokeClient>;
