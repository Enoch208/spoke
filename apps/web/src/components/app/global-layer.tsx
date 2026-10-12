"use client";

import { ConnectivityWatcher } from "./connectivity";
import { ModalHost } from "./modal-host";
import { Toaster } from "./toaster";

export function GlobalLayer() {
  return (
    <>
      <ConnectivityWatcher />
      <ModalHost />
      <Toaster />
    </>
  );
}
