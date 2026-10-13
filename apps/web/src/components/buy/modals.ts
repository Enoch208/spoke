import { lazy } from "react";
import type { ModalFragment } from "@/components/app/modal-types";

export const buyModals: ModalFragment = {
  "M-17": lazy(() => import("./checkout/checkout-sheet")),
  "M-18": lazy(() => import("./purchase-done-modal")),
};
