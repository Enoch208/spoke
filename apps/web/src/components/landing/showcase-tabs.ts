import {
  HierarchyIcon,
  SlidersHorizontalIcon,
  SourceCodeIcon,
  Store01Icon,
  UserStar01Icon,
} from "@hugeicons/core-free-icons";
import { DevelopersScreen } from "./screens/developers-screen";
import { MarketplaceScreen } from "./screens/marketplace-screen";
import { NetworkScreen } from "./screens/network-screen";
import { ReputationScreen } from "./screens/reputation-screen";
import { StudioScreen } from "./screens/studio-screen";

export const showcaseTabs = [
  { key: "marketplace", label: "Marketplace", icon: Store01Icon, Screen: MarketplaceScreen },
  { key: "network", label: "Network Explorer", icon: HierarchyIcon, Screen: NetworkScreen },
  { key: "studio", label: "Commission Studio", icon: SlidersHorizontalIcon, Screen: StudioScreen },
  { key: "reputation", label: "Reputation", icon: UserStar01Icon, Screen: ReputationScreen },
  { key: "developers", label: "Developers", icon: SourceCodeIcon, Screen: DevelopersScreen },
] as const;
