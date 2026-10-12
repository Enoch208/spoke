import { PillLink } from "@/components/ui/pill-link";
import { anchor, sections } from "@/lib/routes";

const stack = [
  "Monad",
  "Solidity",
  "OpenZeppelin",
  "Foundry",
  "viem",
  "wagmi",
  "Next.js",
  "TypeScript",
] as const;

export function BuiltWith() {
  return (
    <section data-reveal className="mx-auto mt-24 max-w-[980px] px-5 lg:mt-[120px] xl:px-0">
      <p className="text-body text-center text-lg lg:text-lead">
        Built on open, verifiable infrastructure
      </p>
      <div className="group/logos relative mt-10">
        <ul className="ease-spring grid grid-cols-2 gap-5 transition-[filter] duration-[423ms] sm:grid-cols-4 [@media(hover:hover)]:group-hover/logos:blur-[5px] [@media(hover:hover)]:group-focus-within/logos:blur-[5px]">
          {stack.map((name) => (
            <li
              key={name}
              className="font-display text-muted flex h-[74px] items-center justify-center text-[22px] font-bold tracking-[-0.02em] lg:text-[26px]"
            >
              {name}
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
