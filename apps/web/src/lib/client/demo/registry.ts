import { workspaceHandlers } from "./domains/workspace";
import { authReads, authWrites } from "./domains/auth";
import { accountReads, accountWrites } from "./domains/account";
import { fundingReads, fundingWrites } from "./domains/funding";
import { auroraReads, auroraWrites } from "./domains/aurora";
import { notificationsReads, notificationsWrites } from "./domains/notifications";
import { supportReads, supportWrites } from "./domains/support";
import { invitationsReads, invitationsWrites } from "./domains/invitations";
import { analyticsReads, analyticsWrites } from "./domains/analytics";
import { reportsReads, reportsWrites } from "./domains/reports";
import { studioReads, studioWrites } from "./domains/studio";
import { disputesReads, disputesWrites } from "./domains/disputes";
import { billingReads, billingWrites } from "./domains/billing";
import {
  integrationsReads,
  integrationsWrites,
  signersReads,
  signersWrites,
} from "./domains/integrations";
import { apiKeysReads, apiKeysWrites, webhooksReads, webhooksWrites } from "./domains/developer";
import { teamReads, teamWrites } from "./domains/team";
import { subscriptionsReads, subscriptionsWrites } from "./domains/subscriptions";
import { partnershipsReads, partnershipsWrites } from "./domains/partnerships";
import { communitiesReads, communitiesWrites } from "./domains/communities";
import {
  systemReads,
  systemWrites,
  playgroundReads,
  playgroundWrites,
  clientsReads,
  clientsWrites,
  networksReads,
  networksWrites,
  tokensReads,
  tokensWrites,
} from "./domains/system";
import { opsReads, opsWrites } from "./domains/ops";
import { credentialsReads, credentialsWrites } from "./domains/credentials";
import { insightsReads, insightsWrites } from "./domains/insights";
import { graphExportReads, graphExportWrites } from "./domains/graph-export";
import { campaignsReads, campaignsWrites } from "./domains/campaigns";
import { productsReads, productsWrites } from "./domains/products";
import { merchantsReads, merchantsWrites } from "./domains/merchants";
import { linksReads, linksWrites } from "./domains/links";
import { graphReads, graphWrites } from "./domains/graph";
import { checkoutReads, checkoutWrites } from "./domains/checkout";
import { receiptsReads, receiptsWrites } from "./domains/receipts";
import { fulfillmentReads, fulfillmentWrites } from "./domains/fulfillment";
import { earningsReads, earningsWrites } from "./domains/earnings";
import { vaultReads, vaultWrites } from "./domains/vault";
import { reputationReads, reputationWrites } from "./domains/reputation";
import {
  distributorsReads,
  distributorsWrites,
  partnersReads,
  partnersWrites,
} from "./domains/distributors";

export const demoReads = {
  ...workspaceHandlers,
  ...authReads,
  ...accountReads,
  ...fundingReads,
  ...auroraReads,
  ...notificationsReads,
  ...supportReads,
  ...invitationsReads,
  ...analyticsReads,
  ...reportsReads,
  ...studioReads,
  ...disputesReads,
  ...billingReads,
  ...integrationsReads,
  ...signersReads,
  ...apiKeysReads,
  ...webhooksReads,
  ...teamReads,
  ...subscriptionsReads,
  ...partnershipsReads,
  ...communitiesReads,
  ...systemReads,
  ...playgroundReads,
  ...clientsReads,
  ...networksReads,
  ...tokensReads,
  ...opsReads,
  ...credentialsReads,
  ...insightsReads,
  ...graphExportReads,
  ...campaignsReads,
  ...productsReads,
  ...merchantsReads,
  ...linksReads,
  ...graphReads,
  ...checkoutReads,
  ...receiptsReads,
  ...fulfillmentReads,
  ...earningsReads,
  ...vaultReads,
  ...reputationReads,
  ...distributorsReads,
  ...partnersReads,
};

export const demoWrites = {
  ...authWrites,
  ...accountWrites,
  ...fundingWrites,
  ...auroraWrites,
  ...notificationsWrites,
  ...supportWrites,
  ...invitationsWrites,
  ...analyticsWrites,
  ...reportsWrites,
  ...studioWrites,
  ...disputesWrites,
  ...billingWrites,
  ...integrationsWrites,
  ...signersWrites,
  ...apiKeysWrites,
  ...webhooksWrites,
  ...teamWrites,
  ...subscriptionsWrites,
  ...partnershipsWrites,
  ...communitiesWrites,
  ...systemWrites,
  ...playgroundWrites,
  ...clientsWrites,
  ...networksWrites,
  ...tokensWrites,
  ...opsWrites,
  ...credentialsWrites,
  ...insightsWrites,
  ...graphExportWrites,
  ...campaignsWrites,
  ...productsWrites,
  ...merchantsWrites,
  ...linksWrites,
  ...graphWrites,
  ...checkoutWrites,
  ...receiptsWrites,
  ...fulfillmentWrites,
  ...earningsWrites,
  ...vaultWrites,
  ...reputationWrites,
  ...distributorsWrites,
  ...partnersWrites,
};
