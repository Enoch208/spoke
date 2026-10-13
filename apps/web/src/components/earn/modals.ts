import { lazy } from "react";
import type { ModalFragment } from "@/components/app/modal-types";

export const earnModals: ModalFragment = {
  "M-12": lazy(() => import("./dialogs/create-link-dialog")),
  "M-16": lazy(() => import("./dialogs/sale-path-dialog")),
  "M-20": lazy(() => import("./dialogs/finalize-dialog")),
  "M-21": lazy(() => import("./dialogs/claim-dialog")),
};
