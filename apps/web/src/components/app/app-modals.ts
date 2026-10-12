import { lazy } from "react";
import type { ModalFragment } from "./modal-types";

export const appModals: ModalFragment = {
  "M-11": lazy(() => import("./tx/transaction-sheet")),
  "M-43": lazy(() => import("./modals/discard-changes")),
  "M-44": lazy(() => import("./modals/feature-not-live")),
};
