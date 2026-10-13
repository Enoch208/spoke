import { lazy } from "react";
import type { ModalFragment } from "@/components/app/modal-types";

export const partnersModals: ModalFragment = {
  "M-28": lazy(() => import("./invite-dialog")),
};
