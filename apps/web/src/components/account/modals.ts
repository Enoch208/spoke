import type { ModalFragment } from "@/components/app/modal-types";
import { lazy } from "react";
import SignInModal from "./sign-in-modal";

export const accountModals: ModalFragment = {
  "M-01": SignInModal,
  "M-02": SignInModal,
  "M-03": SignInModal,
  "M-04": lazy(() => import("./recovery-modal")),
  "M-05": lazy(() => import("./wrong-network-modal")),
  "M-06": lazy(() => import("./insufficient-funds-modal")),
  "M-08": lazy(() => import("./session-expired-modal")),
  "M-07": lazy(() => import("./account-menu")),
  "M-09": lazy(() => import("./quick-actions-modal")),
};
