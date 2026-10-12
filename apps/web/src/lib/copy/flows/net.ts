import { required } from "../required";

export const netFlow = {
  notDeployed: "Spoke isn’t deployed on Monad Testnet yet",
  wrongNetwork: required.wrongNetwork,
  manualSwitch:
    "Your wallet can’t switch automatically. Open it and choose Monad Testnet (chain ID 10143).",
  rpcDown: "Monad Testnet isn’t responding. Nothing was sent.",
  "rpcDown.readOnly":
    "Showing the last data we loaded. Onchain actions are paused here until the connection returns. Your funds stay in the Spoke contract.",
  linkUnavailable: "We can’t load this link right now.",
  offline: "You’re offline. Spoke will reconnect when your connection is back.",
  maintenance:
    "Spoke is being updated until about {endTime}. Your funds stay in the Spoke contract on Monad Testnet, and nothing you’ve earned changes during maintenance.",
} as const satisfies Record<string, string>;
