import { attestFlow } from "./attest";
import { budgetFlow } from "./budget";
import { buyFlow } from "./buy";
import { campaignFlow } from "./campaign";
import { communityFlow } from "./community";
import { demoFlow } from "./demo";
import { featureFlow } from "./feature";
import { fundsFlow } from "./funds";
import { linkFlow } from "./link";
import { moderationFlow } from "./moderation";
import { netFlow } from "./net";
import { policyFlow } from "./policy";
import { profileFlow } from "./profile";
import { recoverFlow } from "./recover";
import { repFlow } from "./rep";
import { sellFlow } from "./sell";
import { settleFlow } from "./settle";
import { signinFlow } from "./signin";
import { subsFlow } from "./subs";
import { sysFlow } from "./sys";
import { txFlow } from "./tx";
import { uploadFlow } from "./upload";

export const flows = {
  tx: txFlow,
  signin: signinFlow,
  profile: profileFlow,
  funds: fundsFlow,
  net: netFlow,
  buy: buyFlow,
  link: linkFlow,
  campaign: campaignFlow,
  policy: policyFlow,
  sell: sellFlow,
  budget: budgetFlow,
  settle: settleFlow,
  rep: repFlow,
  recover: recoverFlow,
  attest: attestFlow,
  subs: subsFlow,
  community: communityFlow,
  moderation: moderationFlow,
  upload: uploadFlow,
  sys: sysFlow,
  feature: featureFlow,
  demo: demoFlow,
} as const satisfies Record<string, Readonly<Record<string, string>>>;
