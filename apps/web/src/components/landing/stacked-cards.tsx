"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";

const stickyTop = (index: number) => 90 + index * 15;

export function StackedCards({
  anchors,
  children,
}: {
  anchors: readonly string[];
  children: ReactNode;
}) {
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const [deepest, setDeepest] = useState(0);

  useEffect(() => {
    const reached = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(entry.target.getAttribute("data-index"));
          if (entry.intersectionRatio >= 0.5) reached.add(index);
          else reached.delete(index);
        }
        setDeepest(reached.size ? Math.max(...reached) : 0);
      },
      { threshold: [0, 0.5] },
    );
    cards.current.forEach((card) => {
      if (card) observer.observe(card);
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  return Children.toArray(children).map((child, index) => {
    const scale = deepest > index ? 1 - 0.05 * (deepest - index) : 1;
    return (
      <div
        key={isValidElement(child) && child.key !== null ? child.key : index}
        className="contents"
      >
        <div id={anchors[index]} className="-mb-10 h-0 scroll-mt-24" />
        <div
          ref={(element) => {
            cards.current[index] = element;
          }}
          data-index={index}
          className="sticky"
          style={{ top: stickyTop(index) }}
        >
          <div
            className="ease-stack origin-center transition-transform duration-[951ms]"
            style={{ transform: `perspective(1200px) scale(${String(scale)})` }}
          >
            {child}
          </div>
        </div>
      </div>
    );
  });
}
