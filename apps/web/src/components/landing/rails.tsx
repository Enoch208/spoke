import { ArrowLink } from "@/components/ui/arrow-link";
import { BrandMark } from "@/components/ui/brand-mark";
import { routes, sections } from "@/lib/routes";
import { openStack, shareChannels, type OrbitBrand } from "./orbit-brands";

function IconRing({
  items,
  radius,
  bubble,
  logo,
  spin,
  counter,
  offset,
}: {
  items: OrbitBrand[];
  radius: number;
  bubble: number;
  logo: number;
  spin: string;
  counter: string;
  offset: number;
}) {
  return (
    <div className={`orbit-spin absolute top-0 left-0 size-0 will-change-transform ${spin}`}>
      {items.map((item, index) => {
        const angle = offset + (index / items.length) * Math.PI * 2;
        return (
          <span
            key={item.name}
            title={item.name}
            className={`orbit-spin bg-section absolute flex items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.05)] ${counter}`}
            style={{
              width: bubble,
              height: bubble,
              left: radius * Math.cos(angle) - bubble / 2,
              top: radius * Math.sin(angle) - bubble / 2,
            }}
          >
            <span
              className="[mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
              style={{
                width: logo,
                height: logo,
                backgroundColor: item.color,
                maskImage: `url(${item.logo})`,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}

const circles = [
  { size: 1286, className: "orbit-halo opacity-40" },
  { size: 1184, className: "orbit-ring" },
  { size: 937, className: "orbit-ring" },
] as const;

export function Rails() {
  return (
    <section
      id={sections.developers}
      data-orbit
      className="bg-section relative mt-24 h-[720px] scroll-mt-20 overflow-hidden pt-20 lg:mt-[80px] lg:h-[946px]"
    >
      <div className="relative z-10 mx-auto flex max-w-[780px] flex-col items-center px-5 text-center">
        <h2 className="font-display text-[36px] leading-[1.2] font-medium text-balance lg:text-h2">
          One link for every channel, one API for every app
        </h2>
        <div className="mt-8">
          <ArrowLink href={routes.docs}>Explore the developer API</ArrowLink>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute top-[965px] left-1/2 size-0 max-lg:top-[730px] max-lg:scale-[0.55]"
      >
        {circles.map((circle) => (
          <div
            key={circle.size}
            className={`absolute rounded-full ${circle.className}`}
            style={{
              width: circle.size,
              height: circle.size,
              left: -circle.size / 2,
              top: -circle.size / 2,
            }}
          />
        ))}
        <IconRing
          items={shareChannels}
          radius={498}
          bubble={68}
          logo={32}
          spin="animate-orbit-outer"
          counter="animate-orbit-outer-counter"
          offset={0.2}
        />
        <IconRing
          items={openStack}
          radius={376}
          bubble={76}
          logo={38}
          spin="animate-orbit-inner"
          counter="animate-orbit-inner-counter"
          offset={0.5}
        />
        <div className="absolute -top-[169px] -left-[109px]">
          <BrandMark height={320} />
        </div>
      </div>
    </section>
  );
}
