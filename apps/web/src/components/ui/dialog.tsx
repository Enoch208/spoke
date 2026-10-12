"use client";

import { ModalFrame, type ModalFrameProps } from "./modal-frame";

const dialogWidths = { sm: 400, md: 520, lg: 640 } as const;

export function Dialog({
  size = "sm",
  ...props
}: ModalFrameProps & { size?: keyof typeof dialogWidths }) {
  return <ModalFrame kind="dialog" width={dialogWidths[size]} {...props} />;
}
