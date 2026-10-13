import { lazy } from "react";
import type { ModalFragment } from "@/components/app/modal-types";

export const earnModals: ModalFragment = {
  "M-46": lazy(() => import("./invitations/review-dialog")),
  "M-12": lazy(() => import("./dialogs/create-link-dialog")),
  "M-13": lazy(() => import("./dialogs/share-kit")),
  "M-14": lazy(() => import("./dialogs/qr-dialog")),
  "M-36": lazy(() => import("./dialogs/visibility-dialog")),
  "M-37": lazy(() => import("./dialogs/export-record-dialog")),
  "M-16": lazy(() => import("./dialogs/sale-path-dialog")),
  "M-20": lazy(() => import("./dialogs/finalize-dialog")),
  "M-21": lazy(() => import("./dialogs/claim-dialog")),
};
