import type { DemoRuntime } from "../../../../demo/runtime/runtime";
import { DAY, iso } from "../../../../demo/world/ids";
import type { DemoWorld, Partnership } from "../../../../demo/world/world";
import { fail, found, type PartialHandlers } from "../handler";
import { page, personById } from "../views/basics";
import { campaignOf } from "../views/catalog";
import { merchantsOwnedBy } from "../views/merchant-org";
import { countsOf } from "../views/settlement";

const PROPOSAL_VALID_MS = 14 * DAY;
const earning = new Set<Partnership["status"]>(["accepted", "notice", "terminated"]);
const noSales = { pending: 0, finalized: 0, refunded: 0 };

const partiesOf = (runtime: DemoRuntime): string[] => {
  const world = runtime.world;
  const person = personById(world, runtime.personaId());
  const merchants = merchantsOwnedBy(world, runtime.personaId()).map((merchant) => merchant.id);
  const parties = [...merchants, ...(person?.isDistributor ? [person.id] : [])];
  return parties.length
    ? parties
    : fail(
        "NOT_AUTHORIZED",
        "Partnerships are between a business and the distributors it works with.",
      );
};

const performanceOf = (world: DemoWorld, agreement: Partnership) => {
  if (!earning.has(agreement.status)) return { ...noSales };
  const partner = [agreement.fromMerchantId, agreement.toMerchantId]
    .map((id) => personById(world, id))
    .find((person) => person?.isDistributor);
  const since = agreement.versionHistory[0]?.at;
  if (!partner || since === undefined) return { ...noSales };
  const addresses = new Set(partner.addresses.map((address) => address.toLowerCase()));
  return countsOf(
    world.sales.filter(
      (sale) =>
        agreement.campaignIds.includes(sale.campaignId) &&
        sale.purchasedAt >= Date.parse(since) &&
        sale.allocations.some((allocation) => addresses.has(allocation.owner.toLowerCase())),
    ),
  );
};

const present = (world: DemoWorld, agreement: Partnership): Partnership => ({
  ...agreement,
  campaignIds: [...agreement.campaignIds],
  versionHistory: agreement.versionHistory.map((version) => ({ ...version })),
  performance: performanceOf(world, agreement),
});

const between = (agreement: Partnership, a: string, b: string) =>
  (agreement.fromMerchantId === a && agreement.toMerchantId === b) ||
  (agreement.fromMerchantId === b && agreement.toMerchantId === a);

const overlaps = (agreement: Partnership, campaignIds: readonly string[]) =>
  agreement.campaignIds.some((id) => campaignIds.includes(id));

const counterpart = (world: DemoWorld, agreement: Partnership) =>
  world.partnerships.find(
    (candidate) =>
      candidate.id !== agreement.id &&
      (candidate.status === "accepted" || candidate.status === "notice") &&
      between(candidate, agreement.fromMerchantId, agreement.toMerchantId) &&
      overlaps(candidate, agreement.campaignIds),
  );

const mineById = (runtime: DemoRuntime, id: string) => {
  const parties = partiesOf(runtime);
  const agreement = found(
    runtime.world.partnerships.find(
      (candidate) =>
        candidate.id === id &&
        (parties.includes(candidate.fromMerchantId) || parties.includes(candidate.toMerchantId)),
    ),
    "That partnership",
  );
  return { parties, agreement };
};

const save = (world: DemoWorld, agreement: Partnership) => {
  world.partnerships = world.partnerships.map((candidate) =>
    candidate.id === agreement.id ? agreement : candidate,
  );
  return present(world, agreement);
};

export const partnershipsReads = {
  "partnerships.list": (input, runtime) => {
    const parties = partiesOf(runtime);
    const agreements = runtime.world.partnerships
      .filter((agreement) =>
        [agreement.fromMerchantId, agreement.toMerchantId].some((id) => parties.includes(id)),
      )
      .map((agreement) => present(runtime.world, agreement));
    return page(agreements, input);
  },
} satisfies PartialHandlers<"partnerships">;

export const partnershipsWrites = {
  "partnerships.propose": (input, runtime) => {
    const world = runtime.world;
    const parties = partiesOf(runtime);
    const from = parties[0] ?? fail("NOT_AUTHORIZED", "Sign in to propose a partnership.");
    const to = input.toMerchantId;
    if (parties.includes(to))
      fail("VALIDATION_FAILED", "You can't propose a partnership to yourself.");
    const toMerchant = world.merchants.some((merchant) => merchant.id === to);
    if (!toMerchant && !personById(world, to)?.isDistributor)
      fail("NOT_FOUND", "That partner isn't in the sample world.");
    const business = toMerchant ? to : from;
    if (!input.campaignIds.length)
      fail("VALIDATION_FAILED", "Choose the campaign this partnership runs on.");
    for (const id of input.campaignIds) {
      const campaign = found(campaignOf(world, id), "That campaign");
      if (campaign.merchantId !== business)
        fail("VALIDATION_FAILED", "A partnership runs on the business's own campaigns.");
    }
    const terms = input.terms.trim();
    if (!terms) fail("VALIDATION_FAILED", "Describe the terms you're proposing.");
    const open = world.partnerships.some(
      (agreement) =>
        agreement.status === "proposed" &&
        between(agreement, from, to) &&
        overlaps(agreement, input.campaignIds),
    );
    if (open) fail("CONFLICT", "There's already an open proposal on this campaign.");
    const draft: Partnership = {
      id: `demo-pship-n${String(runtime.nextId("plus:partnership"))}`,
      fromMerchantId: from,
      toMerchantId: to,
      campaignIds: [...input.campaignIds],
      terms,
      status: "proposed",
      versionHistory: [],
      performance: { ...noSales },
    };
    const history = counterpart(world, draft)?.versionHistory ?? [];
    const version = (history.at(-1)?.version ?? 0) + 1;
    const proposal = {
      ...draft,
      versionHistory: [...history, { version, terms, at: iso(runtime.now()) }],
    };
    world.partnerships.push(proposal);
    return present(world, proposal);
  },
  "partnerships.respond": (input, runtime) => {
    const world = runtime.world;
    const { parties, agreement } = mineById(runtime, input.id);
    if (!parties.includes(agreement.toMerchantId))
      fail("NOT_AUTHORIZED", "Only the partner it was sent to can answer this proposal.");
    if (agreement.status !== "proposed") fail("CONFLICT", "This proposal was already answered.");
    const sentAt = Date.parse(agreement.versionHistory.at(-1)?.at ?? iso(runtime.now()));
    if (sentAt + PROPOSAL_VALID_MS < runtime.now()) fail("CONFLICT", "This proposal expired.");
    if (input.response === "decline") return save(world, { ...agreement, status: "declined" });
    const base = counterpart(world, agreement);
    if (!base) return save(world, { ...agreement, status: "accepted" });
    world.partnerships = world.partnerships.filter((candidate) => candidate.id !== agreement.id);
    return save(world, {
      ...base,
      terms: agreement.terms,
      versionHistory: agreement.versionHistory.map((version) => ({ ...version })),
    });
  },
  "partnerships.terminate": (input, runtime) => {
    const { parties, agreement } = mineById(runtime, input.id);
    if (input.mode === "withdraw") {
      if (agreement.status !== "proposed" || !parties.includes(agreement.fromMerchantId))
        fail("CONFLICT", "Only an unanswered proposal you sent can be withdrawn.");
      return save(runtime.world, { ...agreement, status: "withdrawn" });
    }
    if (agreement.status !== "accepted")
      fail("CONFLICT", "Only an active partnership can be ended with notice.");
    return save(runtime.world, { ...agreement, status: "notice" });
  },
} satisfies PartialHandlers<"partnerships">;
