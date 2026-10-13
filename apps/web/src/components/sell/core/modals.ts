import { lazy } from "react";
import type { ModalFragment } from "@/components/app/modal-types";

export const sellCoreModals: ModalFragment = {
  "M-22": lazy(() => import("./modals/refund-modal")),
  "M-23": lazy(() => import("./modals/add-budget-modal")),
  "M-24": lazy(() => import("./modals/withdraw-modal")),
  "M-25": lazy(() => import("./modals/pause-modal")),
  "M-26": lazy(() => import("./modals/end-modal")),
};
