import { lazy } from "react";
import type { ModalFragment } from "@/components/app/modal-types";
export const platformModals: ModalFragment = { "M-41": lazy(() => import("./report-modal")) };
