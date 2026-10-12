import type { ComponentType } from "react";
import type { ModalId, ModalPropsMap } from "@/lib/stores/modal-props";

export type ModalComponentProps<K extends ModalId> = {
  props: ModalPropsMap[K];
  modalKey: string;
  isTop: boolean;
  close: () => void;
};

export type ModalFragment = {
  readonly [K in ModalId]?: ComponentType<ModalComponentProps<K>>;
};
