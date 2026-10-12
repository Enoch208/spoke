"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const gentle = (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t));

function observeOnce(selector: string) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-inview", "");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0 },
  );
  document.querySelectorAll(selector).forEach((element) => {
    observer.observe(element);
  });
  return observer;
}

function observeToggle(selector: string) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.toggleAttribute("data-inview", entry.isIntersecting);
    }
  });
  document.querySelectorAll(selector).forEach((element) => {
    observer.observe(element);
  });
  return observer;
}

export function MotionRoot() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motionReady = "true";
    const reveals = observeOnce("[data-reveal]");
    const toggles = observeToggle("[data-orbit]");
    if (root.dataset.motion !== "on") {
      return () => {
        reveals.disconnect();
        toggles.disconnect();
      };
    }
    const lenis = new Lenis({
      duration: 1.4,
      easing: gentle,
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: 1,
      autoRaf: true,
      anchors: true,
    });
    return () => {
      lenis.destroy();
      reveals.disconnect();
      toggles.disconnect();
    };
  }, [pathname]);
  return null;
}
