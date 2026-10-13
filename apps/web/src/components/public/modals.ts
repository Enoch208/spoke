import { lazy } from "react";
import type { ModalFragment } from "@/components/app/modal-types";

export const publicModals: ModalFragment = {
  "M-41": lazy(() => import("./report/report-dialog")),
};
