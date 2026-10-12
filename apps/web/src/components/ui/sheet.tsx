"use client";

import { ModalFrame, type ModalFrameProps } from "./modal-frame";

const sheetWidths = { transaction: 440, share: 480, checkout: 560 } as const;

export type SheetPlacement = keyof typeof sheetWidths;

export function Sheet({ placement, ...props }: ModalFrameProps & { placement: SheetPlacement }) {
  return <ModalFrame kind="sheet" width={sheetWidths[placement]} {...props} />;
}
