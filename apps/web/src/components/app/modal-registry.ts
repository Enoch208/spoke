import { accountModals } from "@/components/account/modals";
import { buyModals } from "@/components/buy/modals";
import { earnModals } from "@/components/earn/modals";
import { platformModals } from "@/components/platform/modals";
import { publicModals } from "@/components/public/modals";
import { sellCoreModals } from "@/components/sell/core/modals";
import { sellGrowthModals } from "@/components/sell/growth/modals";
import { appModals } from "./app-modals";
import type { ModalFragment } from "./modal-types";

export const modalRegistry: ModalFragment = {
  ...accountModals,
  ...publicModals,
  ...buyModals,
  ...earnModals,
  ...sellCoreModals,
  ...sellGrowthModals,
  ...platformModals,
  ...appModals,
};
