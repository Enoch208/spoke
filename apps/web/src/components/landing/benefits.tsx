import type { ReactNode } from "react";
import { Piece, type PieceShape } from "@/components/art/piece";
import { RecordArt, SalesArt, ShareArt } from "./benefit-art";

const benefits: { title: string; body: string; shape: PieceShape; art: ReactNode }[] = [
  {
    title: "Pay for sales",
    body: "Fund a reward pool once. Commission is reserved only when a real purchase lands, never for clicks or sign-ups.",
    shape: "lime",
    art: <SalesArt />,
  },
  {
    title: "Earn from every branch",
    body: "Share a product and pass it on. When a sale settles, each eligible person in the path gets the share the campaign promised.",
    shape: "pink",
    art: <ShareArt />,
  },
  {
    title: "Carry your record",
    body: "Settled sales build a track record that follows you to the next merchant instead of resetting at every dashboard.",
    shape: "block",
    art: <RecordArt />,
  },
];

export function Benefits() {
  return (
    <section className="reveal mx-auto mt-14 max-w-[1200px] px-5 lg:mt-5 xl:px-0">
      <div className="bg-pill flex flex-col gap-2 rounded-[32px] p-2 lg:h-[436px] lg:flex-row lg:[&:has(>article:hover)>article]:basis-[316px] lg:[&:has(>article:hover)>article:hover]:basis-[537px]">
        {benefits.map((benefit, index) => (
          <article
            key={benefit.title}
            className={`@container flex flex-col gap-2 rounded-3xl p-2 transition-[flex-basis,background-color] duration-500 ease-out lg:grow lg:flex-row lg:gap-0 ${index === 0 ? "bg-surface lg:basis-[537px]" : "bg-soft hover:bg-surface lg:basis-[316px]"}`}
          >
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-10 px-6 pt-6 pb-6 lg:pb-[17px]">
              <span className="bg-pill flex size-16 items-center justify-center rounded-full">
                <Piece id={`benefit-${benefit.shape}`} shape={benefit.shape} className="w-9" />
              </span>
              <div>
                <h3 className="font-display text-h4 font-medium">{benefit.title}</h3>
                <p className="text-muted mt-1.5">{benefit.body}</p>
              </div>
            </div>
            <div className="h-[300px] shrink-0 lg:hidden lg:h-auto lg:w-[267px] xl:@min-[420px]:block">
              {benefit.art}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
