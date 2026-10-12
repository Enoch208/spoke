import { loadDemoBundle } from "../demo/bundle";
import { approvalAmount } from "./calls";
import { classifySendError } from "./errors";
import type { StepContext, StepOutcome } from "./live-step";

export const runDemoStep = async (context: StepContext): Promise<StepOutcome> => {
  const { chain } = await loadDemoBundle();
  const record = context.current();
  const step = context.step();
  const campaignId =
    record.context.campaignId ?? ("campaignId" in record.params ? record.params.campaignId : "");
  context.update({ status: "wallet_confirmation" });
  await context.clock.sleep(300);
  try {
    const result = (() => {
      switch (step.kind) {
        case "approve":
          return chain.execute("approve", { amount: approvalAmount(record).toString() });
        case "createCampaign":
          if (record.kind === "createCampaign")
            return chain.execute("createCampaign", { draftId: record.params.draftId });
          break;
        case "fundCampaign":
          if (record.kind === "createCampaign")
            return chain.execute("fundCampaign", { campaignId, amount: record.params.deposit });
          if (record.kind === "fundCampaign") return chain.execute("fundCampaign", record.params);
          break;
        case "activateCampaign":
          return chain.execute("activateCampaign", { campaignId });
        case "purchase":
          if (record.kind === "purchase") return chain.execute("purchase", record.params);
          break;
        case "createNode":
          if (record.kind === "createNode") return chain.execute("createNode", record.params);
          break;
        case "refund":
          if (record.kind === "refund") return chain.execute("refund", record.params);
          break;
        case "finalize":
          return chain.execute("finalize", {
            saleId: step.target ?? (record.kind === "finalize" ? record.params.saleId : ""),
          });
        case "claimRewards":
          if (record.kind === "claimRewards") return chain.execute("claimRewards", record.params);
          break;
        case "claimProceeds":
          return chain.execute("claimProceeds", { campaignId: step.target ?? campaignId });
        case "withdrawUnused":
          return chain.execute("withdrawUnused", { campaignId });
        case "pause":
          return chain.execute("pause", { campaignId });
        case "resume":
          return chain.execute("resume", { campaignId });
        case "end":
          return chain.execute("end", { campaignId });
        case "registerPolicyVersion":
          if (record.kind === "registerPolicyVersion")
            return chain.execute("registerPolicyVersion", record.params);
          break;
        case "mintDemoTokens":
          if (record.kind === "mintDemoTokens")
            return chain.execute("mintDemoTokens", record.params);
          break;
      }
      throw new Error("The sample transaction parameters do not match this step.");
    })();
    context.update({ status: "submitted", hash: result.hash, submittedAt: context.clock.now() });
    await context.clock.sleep(300);
    if (result.objectId) {
      if (step.kind === "createCampaign") context.setContext({ campaignId: result.objectId });
      if (step.kind === "createNode") context.setContext({ nodeId: result.objectId });
      if (step.kind === "purchase") context.setContext({ saleId: result.objectId });
    }
    context.update({
      status: "indexed",
      blockNumber: result.blockNumber,
      confirmedAt: context.clock.now(),
    });
    return "done";
  } catch (error) {
    context.update({ status: "failed", error: classifySendError(error, "preflight") });
    return "stopped";
  }
};
