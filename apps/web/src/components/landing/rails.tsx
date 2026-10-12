import {
  Analytics01Icon,
  ApiIcon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  DatabaseIcon,
  Link01Icon,
  PuzzleIcon,
  QrCodeIcon,
  Share08Icon,
  ShoppingCart01Icon,
  SourceCodeIcon,
  UserStar01Icon,
  Wallet01Icon,
  WebhookIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { ArrowLink } from "@/components/ui/arrow-link";
import { BrandMark } from "@/components/ui/brand-mark";
import { routes, sections } from "@/lib/routes";

type Orbiter = { icon: IconSvgElement; tone: string; label: string };

const outer: Orbiter[] = [
  { icon: ShoppingCart01Icon, tone: "text-lime-deep", label: "Native checkout" },
  { icon: Link01Icon, tone: "text-pink-deep", label: "Share links" },
  { icon: ApiIcon, tone: "text-sky-deep", label: "Read API" },
  { icon: Wallet01Icon, tone: "text-olive", label: "Wallet claims" },
  { icon: WebhookIcon, tone: "text-pink-deep", label: "Webhooks" },
  { icon: Analytics01Icon, tone: "text-sky-deep", label: "Analytics" },
  { icon: Coins01Icon, tone: "text-lime-deep", label: "Reward vault" },
  { icon: UserStar01Icon, tone: "text-olive", label: "Reputation" },
  { icon: Share08Icon, tone: "text-pink-deep", label: "Share kit" },
  { icon: DatabaseIcon, tone: "text-sky-deep", label: "Event index" },
];

const inner: Orbiter[] = [
  { icon: QrCodeIcon, tone: "text-olive", label: "QR codes" },
  { icon: SourceCodeIcon, tone: "text-sky-deep", label: "SDK" },
  { icon: PuzzleIcon, tone: "text-pink-deep", label: "Widgets" },
  { icon: CheckmarkBadge01Icon, tone: "text-lime-deep", label: "Receipts" },
  { icon: ApiIcon, tone: "text-olive", label: "Graph API" },
  { icon: WebhookIcon, tone: "text-sky-deep", label: "Settlement events" },
  { icon: Link01Icon, tone: "text-lime-deep", label: "Deep links" },
  { icon: Wallet01Icon, tone: "text-pink-deep", label: "Payout claims" },
  { icon: Coins01Icon, tone: "text-olive", label: "Funded rewards" },
  { icon: Analytics01Icon, tone: "text-lime-deep", label: "Policy previews" },
];

function IconRing({
  items,
  radius,
  spin,
  counter,
  offset,
}: {
  items: Orbiter[];
  radius: number;
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
            key={item.label}
            title={item.label}
            className={`orbit-spin bg-section absolute flex size-16 items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.05)] ${counter}`}
            style={{ left: radius * Math.cos(angle) - 32, top: radius * Math.sin(angle) - 32 }}
          >
            <HugeiconsIcon icon={item.icon} size={30} className={item.tone} aria-hidden="true" />
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
      className="bg-section relative mt-24 h-[720px] scroll-mt-20 overflow-hidden pt-20 lg:mt-[80px] lg:h-[946px]"
    >
      <div className="relative z-10 mx-auto flex max-w-[780px] flex-col items-center px-5 text-center">
        <h2 className="font-display text-[36px] leading-[1.2] font-medium text-balance lg:text-h2">
          Plug the same rails into any product
        </h2>
        <div className="mt-8">
          <ArrowLink href={routes.docs}>Explore the developer API</ArrowLink>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="absolute top-[965px] left-1/2 size-0 max-lg:top-[640px] max-lg:scale-[0.55]"
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
          items={outer}
          radius={498}
          spin="animate-orbit-outer"
          counter="animate-orbit-outer-counter"
          offset={0.2}
        />
        <IconRing
          items={inner}
          radius={376}
          spin="animate-orbit-inner"
          counter="animate-orbit-inner-counter"
          offset={0.5}
        />
        <div className="absolute -top-[190px] -left-[58px]">
          <BrandMark height={170} />
        </div>
      </div>
    </section>
  );
}
