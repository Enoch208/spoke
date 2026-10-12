"use client";

import { ModalFrame, type ModalFrameProps } from "./modal-frame";

export function Drawer({ wide = false, ...props }: ModalFrameProps & { wide?: boolean }) {
  return <ModalFrame kind="drawer" width={wide ? 640 : 480} {...props} />;
}
