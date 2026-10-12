import { PillLink } from "@/components/ui/pill-link";
import { anchor, sections } from "@/lib/routes";

const stack = [
  { name: "Monad", logo: "/stack/monad.png" },
  { name: "Solidity", logo: "/stack/solidity.svg" },
  { name: "OpenZeppelin", logo: "/stack/openzeppelin.svg" },
  { name: "Foundry", logo: "/stack/foundry.png" },
  { name: "viem", logo: "/stack/viem.png" },
  { name: "wagmi", logo: "/stack/wagmi.svg" },
  { name: "Next.js", logo: "/stack/nextjs.svg" },
  { name: "TypeScript", logo: "/stack/typescript.svg" },
] as const;

export function BuiltWith() {
  return (
    <section data-reveal className="mx-auto mt-24 max-w-[980px] px-5 lg:mt-[120px] xl:px-0">
      <p className="text-body text-center text-lg lg:text-lead">
        Built on open, verifiable infrastructure
      </p>
      <div className="group/logos relative mt-10">
        <ul className="ease-spring grid grid-cols-2 gap-5 transition-[filter] duration-[423ms] sm:grid-cols-4 [@media(hover:hover)]:group-hover/logos:blur-[5px] [@media(hover:hover)]:group-focus-within/logos:blur-[5px]">
          {stack.map((item) => (
            <li
              key={item.name}
              className="text-muted flex h-[74px] items-center justify-center gap-2.5"
            >
              <span
                aria-hidden="true"
                className="size-6 shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] lg:size-7"
                style={{ maskImage: `url(${item.logo})` }}
              />
              <span className="font-display text-[22px] font-bold tracking-[-0.02em] lg:text-[26px]">
                {item.name}
              </span>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center [@media(hover:none)]:hidden">
          <div className="ease-spring pointer-events-auto scale-95 opacity-0 transition-[opacity,scale] duration-[423ms] group-focus-within/logos:scale-100 group-focus-within/logos:opacity-100 group-hover/logos:scale-100 group-hover/logos:opacity-100">
            <PillLink href={anchor(sections.developers)}>See how it fits together</PillLink>
          </div>
        </div>
      </div>
    </section>
  );
}
