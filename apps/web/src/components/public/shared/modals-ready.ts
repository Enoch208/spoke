import { modalRegistry } from "@/components/app/modal-registry";
import type { ModalId } from "@/lib/stores/modal-props";

export const hasModal = (id: ModalId) => modalRegistry[id] !== undefined;
