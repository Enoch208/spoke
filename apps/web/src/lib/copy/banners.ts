import {
  Alert01Icon,
  Alert02Icon,
  CloudOffIcon,
  InformationCircleIcon,
  Key01Icon,
  RefreshIcon,
  ServerStack01Icon,
  TestTube01Icon,
  WifiDisconnected01Icon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { globalStates } from "./global-states";
import { required } from "./required";

type Variants = Readonly<Record<string, string>>;

export type BannerCopy = {
  readonly icon: IconSvgElement;
  readonly title?: string;
  readonly body?: string;
  readonly bodies?: Variants;
  readonly actions: readonly string[];
  readonly dismiss?: string;
  readonly dismissBy?: Variants;
  readonly tooltip?: string;
  readonly chip?: string;
  readonly phoneBody?: string;
  readonly phoneMenu?: string;
  readonly storageBlocked?: string;
  readonly downBody?: string;
  readonly holdingFundsBody?: string;
  readonly severity?: Variants;
  readonly more?: string;
  readonly closeLabel?: string;
  readonly regionLabel?: string;
};

export const demoPersonas = [
  "merchant",
  "distributor",
  "buyer",
] as const satisfies readonly string[];

export const bannerStack = {
  moreNotices: "{n} more notices",
} as const satisfies Record<string, string>;

export const banners = {
  demo: {
    icon: TestTube01Icon,
    chip: "Demo",
    title: "Demo data",
    body: "You’re exploring sample merchants, people and sales as the {persona}. Nothing here touches the chain.",
    phoneBody: "Demo data · Sample {persona}",
    storageBlocked: "Progress won’t be saved after this tab closes.",
    actions: ["Switch persona", "Reset demo", "Exit demo"],
    phoneMenu: "Demo options",
    regionLabel: "Demo mode",
  },
  testnet: {
    icon: InformationCircleIcon,
    title: "Monad Testnet",
    body: "Amounts are in SDUSD, a testnet demo token with no cash value.",
    actions: ["Disclosures"],
    dismiss: "Got it",
    closeLabel: "Hide testnet notice for this session",
    regionLabel: "Testnet notice",
  },
  syncing: {
    icon: RefreshIcon,
    title: "Syncing",
    body: `${required.syncing} Last recorded block {block}.`,
    downBody:
      "Spoke’s activity index is down. Amounts read straight from the contract are current; lists and history may be out of date.",
    actions: ["View status"],
  },
  incident: {
    icon: Alert02Icon,
    severity: { degraded: "Degraded", outage: "Outage", maintenance: "Planned maintenance" },
    actions: ["View status"],
    dismiss: "Hide",
    more: "+{n} more",
  },
  rpc: {
    icon: ServerStack01Icon,
    title: globalStates.rpcUnavailable.title,
    body: globalStates.rpcUnavailable.body,
    actions: ["Try again", "View status"],
  },
  api: {
    icon: CloudOffIcon,
    title: globalStates.apiUnavailable.title,
    body: globalStates.apiUnavailable.body,
    actions: ["Try again", "View status"],
  },
  offline: {
    icon: WifiDisconnected01Icon,
    title: globalStates.offline.title,
    body: globalStates.offline.body,
    actions: [],
  },
  maintenanceSoon: {
    icon: Wrench01Icon,
    title: "Planned maintenance",
    bodies: {
      scheduled:
        "Actions will pause {startTime}–{endTime}. Pages stay readable, and funds and earnings are not affected.",
      underWay:
        "Spoke is under planned maintenance until {endTime}. Pages stay readable; actions and transactions are paused until then.",
    },
    actions: ["View status"],
    dismissBy: { scheduled: "Hide" },
  },
  wrongNetwork: {
    icon: Alert01Icon,
    title: "Wrong network",
    body: `Your wallet is on {chainName}. ${required.wrongNetwork}`,
    tooltip: required.wrongNetwork,
    actions: ["Switch network"],
  },
  recovery: {
    icon: Key01Icon,
    title: "Back up your recovery phrase",
    body: "If you lose this device, the phrase is the only way back into your account.",
    holdingFundsBody:
      "Your account holds {amount}. Back up your recovery phrase so you can’t lose access to it.",
    actions: ["Back up now"],
    dismiss: "Later",
    regionLabel: "Recovery reminder",
  },
} as const satisfies Record<string, BannerCopy>;

export const bannerIds = {
  "B-01": "demo",
  "B-02": "testnet",
  "B-03": "syncing",
  "B-05": "wrongNetwork",
  "B-06": "recovery",
} as const satisfies Record<string, keyof typeof banners>;

export const incidentBannerVariants = {
  incident: "incident",
  "maintenance-soon": "maintenanceSoon",
  rpc: "rpc",
  api: "api",
  offline: "offline",
} as const satisfies Record<string, keyof typeof banners>;
