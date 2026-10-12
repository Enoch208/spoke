import {
  CheckListIcon,
  Clock01Icon,
  Coins01Icon,
  GitBranchIcon,
  HierarchyIcon,
  QrCodeIcon,
  Search01Icon,
  SlidersHorizontalIcon,
  SourceCodeIcon,
  UserStar01Icon,
  Wallet01Icon,
  ApiIcon,
} from "@hugeicons/core-free-icons";
import { anchor, routes, sections } from "@/lib/routes";
import { FeatureBlock, type Feature } from "./feature-block";
import { StackedCards } from "./stacked-cards";
import { MarketplaceScreen } from "./screens/marketplace-screen";
import { NetworkScreen } from "./screens/network-screen";
import { ReputationScreen } from "./screens/reputation-screen";
import { StudioScreen } from "./screens/studio-screen";

const features: Feature[] = [
  {
    id: sections.marketplace,
    title: "Campaign Marketplace",
    body: "Merchants publish funded offers with public terms. Distributors browse by category, reward and settlement hold, then join in one step. Cards show what is funded, never invented traction.",
    chips: [
      { label: "Funded offers", icon: Coins01Icon },
      { label: "Public terms", icon: CheckListIcon },
      { label: "Category search", icon: Search01Icon },
    ],
    cta: { label: "Explore campaigns", href: routes.explore },
    tone: "lilac",
    screen: <MarketplaceScreen />,
  },
  {
    id: sections.network,
    title: "Distribution Graph",
    body: "Every share creates a node with a fixed parent. Products branch through people, and the exact paid path of every sale stays open to inspect.",
    chips: [
      { label: "Branching links", icon: GitBranchIcon },
      { label: "QR share kit", icon: QrCodeIcon },
      { label: "Network Explorer", icon: HierarchyIcon },
    ],
    cta: { label: "Start sharing", href: routes.startSharing },
    tone: "sky",
    screen: <NetworkScreen />,
  },
  {
    id: sections.settlement,
    title: "Programmable Settlement",
    body: "Set the rate, the cap and the weight of each level. Every sale reserves its reward from escrow, settles after a hold, and pays each eligible contributor to the last unit.",
    chips: [
      { label: "Commission Studio", icon: SlidersHorizontalIcon },
      { label: "Settlement hold", icon: Clock01Icon },
      { label: "Pull claims", icon: Wallet01Icon },
    ],
    cta: { label: "Launch a campaign", href: routes.launch },
    tone: "lime",
    screen: <StudioScreen />,
  },
  {
    id: sections.reputation,
    title: "Portable Reputation",
    body: "Finalized, non-refunded sales roll up into a profile that travels across merchants. The same receipts are open to any app through a public read API.",
    chips: [
      { label: "Cross-merchant profile", icon: UserStar01Icon },
      { label: "Public read API", icon: ApiIcon },
      { label: "Open receipts", icon: SourceCodeIcon },
    ],
    cta: { label: "See how it counts", href: anchor(sections.howItWorks) },
    tone: "pink",
    screen: <ReputationScreen />,
  },
];

export function Layers() {
  return (
    <section data-reveal className="mx-auto mt-24 max-w-[1200px] px-5 lg:mt-[120px] xl:px-0">
      <h2 className="font-display max-w-[780px] text-[36px] leading-[1.2] font-medium text-balance lg:text-h2">
        One network for everything distribution needs
      </h2>
      <div className="mt-10 flex flex-col gap-10">
        <StackedCards anchors={features.map((feature) => feature.id)}>
          {features.map((feature) => (
            <FeatureBlock key={feature.id} feature={feature} />
          ))}
        </StackedCards>
      </div>
    </section>
  );
}
