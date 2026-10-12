"use client";

import { ConnectivityWatcher } from "./connectivity";
import { ModalHost } from "./modal-host";

export function GlobalLayer() {
  return (
    <>
      <ConnectivityWatcher />
      <ModalHost />
    </>
  );
}
