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
    <section className="reveal mx-auto mt-24 max-w-[980px] px-5 lg:mt-[120px] xl:px-0">
      <p className="text-body text-center text-lg lg:text-lead">
        Built on open, verifiable infrastructure
      </p>
      <ul className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-4">
        {stack.map((name) => (
          <li
            key={name}
            className="font-display text-muted flex h-[74px] items-center justify-center text-[22px] font-bold tracking-[-0.02em] lg:text-[26px]"
          >
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
