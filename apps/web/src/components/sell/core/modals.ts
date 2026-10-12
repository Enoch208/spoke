import { lazy } from "react";
import type { ModalFragment } from "@/components/app/modal-types";

export const sellCoreModals: ModalFragment = {
  "M-23": lazy(() => import("./modals/add-budget-modal")),
  "M-24": lazy(() => import("./modals/withdraw-modal")),
};
