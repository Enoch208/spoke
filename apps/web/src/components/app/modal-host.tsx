"use client";

import { Suspense, createElement, useEffect, useRef, type ComponentType } from "react";
import type { ModalId, ModalPropsMap } from "@/lib/stores/modal-props";
import { useUiStore } from "@/lib/stores/ui";
import { modalRegistry } from "./modal-registry";
import type { ModalComponentProps } from "./modal-types";

const anchoredModals = new Set<ModalId>(["M-07", "M-39", "M-40"]);
const phoneQuery = "(max-width: 639px)";
const historyMarker = "spokeModal";

function ModalSlot<K extends ModalId>({
  entry,
  isTop,
  onClose,
}: {
  entry: { key: string; id: K; props: ModalPropsMap[K] };
  isTop: boolean;
  onClose: (key: string) => void;
}) {
  const Component: ComponentType<ModalComponentProps<K>> | undefined = modalRegistry[entry.id];
  if (!Component) return null;
  const componentProps: ModalComponentProps<K> = {
    props: entry.props,
    modalKey: entry.key,
    isTop,
    close: () => {
      onClose(entry.key);
    },
  };
  return <Suspense fallback={null}>{createElement(Component, componentProps)}</Suspense>;
}

const hasMarker = (state: unknown) =>
  typeof state === "object" && state !== null && historyMarker in state;

const useBackClosesTopModal = (
  count: number,
  topKey: string | null,
  close: (key: string) => void,
) => {
  const marked = useRef(false);
  const ignoreNextPop = useRef(false);
  const latestTop = useRef(topKey);

  useEffect(() => {
    latestTop.current = topKey;
  }, [topKey]);

  useEffect(() => {
    if (!window.matchMedia(phoneQuery).matches) return;
    if (count > 0 && !marked.current) {
      window.history.pushState({ [historyMarker]: true }, "");
      marked.current = true;
    }
    if (count === 0 && marked.current) {
      marked.current = false;
      if (hasMarker(window.history.state)) {
        ignoreNextPop.current = true;
        window.history.back();
      }
    }
  }, [count]);

  useEffect(() => {
    const onPop = () => {
      if (ignoreNextPop.current) {
        ignoreNextPop.current = false;
        return;
      }
      if (!marked.current || !latestTop.current) return;
      marked.current = false;
      close(latestTop.current);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, [close]);
};

export function ModalHost() {
  const modals = useUiStore((state) => state.modals);
  const close = useUiStore((state) => state.close);
  const hosted = modals.filter((entry) => !anchoredModals.has(entry.id));
  const top = hosted.at(-1) ?? null;
  useBackClosesTopModal(hosted.length, top?.key ?? null, close);
  return hosted.map((entry) => (
    <ModalSlot key={entry.key} entry={entry} isTop={entry.key === top?.key} onClose={close} />
  ));
}
