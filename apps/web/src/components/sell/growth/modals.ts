import type { ModalFragment } from "@/components/app/modal-types";
import { developersModals } from "./developers/modals";
import { integrationsModals } from "./integrations/modals";
import { partnersModals } from "./partners/modals";
import { reportsModals } from "./reports/modals";
import { teamModals } from "./team/modals";

export const sellGrowthModals: ModalFragment = {
  ...partnersModals,
  ...integrationsModals,
  ...developersModals,
  ...teamModals,
  ...reportsModals,
};
