import { Blob } from "@/components/art/blob";
import { Piece } from "@/components/art/piece";
import { ArrowLink } from "@/components/ui/arrow-link";
import { PillLink } from "@/components/ui/pill-link";
import { routes } from "@/lib/routes";

export function Hero() {
  return (
    <section className="animate-hero-in relative mx-auto max-w-[1240px] px-5 pt-16 pb-14 lg:mt-10 lg:flex lg:h-[600px] lg:items-center lg:justify-center lg:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden xl:overflow-visible"
      >
        <Blob tone="sky" shape="dot" className="top-2 left-[54%] size-10" />
        <Piece
          id="hero-lime"
          shape="lime"
          className="animate-rock absolute top-0 -left-12 w-20 drop-shadow-[0_18px_24px_rgba(140,190,20,0.25)] will-change-transform xl:top-[70px] xl:left-[140px] xl:w-[120px]"
        />
        <Piece
          id="hero-lilac"
          shape="block"
          tone="lilac"
          className="absolute top-[110px] right-[70px] hidden w-[150px] rotate-[10deg] drop-shadow-[0_18px_24px_rgba(150,120,240,0.25)] xl:block"
        />
        <Piece
          id="hero-pink"
          shape="pink"
          className="absolute top-[408px] right-[150px] hidden w-[150px] rotate-[14deg] drop-shadow-[0_24px_30px_rgba(240,120,210,0.3)] xl:block"
        />
        <Blob
          tone="lime"
          shape="diamond"
          className="top-[475px] left-[324px] hidden size-12 xl:block"
        />
      </div>
      <div className="relative mx-auto flex w-full max-w-[780px] flex-col items-center text-center">
        <p className="text-body flex items-center gap-2">
          <span aria-hidden="true" className="flex gap-1">
            <span className="bg-lime size-2.5 rounded-[3px]" />
            <span className="bg-olive size-2.5 rounded-[3px]" />
            <span className="bg-pink size-2.5 rounded-[3px]" />
          </span>
          Open distribution protocol on Monad Testnet
        </p>
        <h1 className="font-display mt-5 text-[38px] leading-[1.2] font-medium tracking-[-0.01em] text-balance lg:text-h1">
          Distribution is a network. Now everyone in it can earn.
        </h1>
        <p className="text-body mt-5 text-base max-w-[520px] text-pretty lg:text-lead">
          Let people share your product through trusted communities, and pay only for real, verified
          sales.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <ArrowLink href={routes.launch}>Launch a campaign</ArrowLink>
          <PillLink href={routes.explore} size="lg">
            Explore campaigns
          </PillLink>
        </div>
      </div>
    </section>
  );
}
