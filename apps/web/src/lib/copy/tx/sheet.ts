import { common } from "../common";
import { required } from "../required";
import { saleTxActions } from "./actions-sale";
import type { TxCopy, TxCopySource } from "./actions-shape";
import { txEngineStates } from "./engine";
import { txReplacementOutcomes } from "./outcomes";
import { txConfirmedSyncing, txReportProblem } from "./sheet-steps";

type SheetCopy = { readonly [key: string]: TxCopy | TxCopySource };

const errorMapping = { from: "errorMapping" } as const;
const handOff = { from: "action.success.actions" } as const;
const checkAgain = "Check again";

export const txSheet = {
  hide: common.hide,
  close: common.close,
  summaryTitle: "What’s happening",
  contractRow: "Spoke contract on Monad Testnet · {contractAddress}",
  reassurance: "You can hide this or leave the page. We’ll keep track of it.",
  stepsLabel: common.steps,
  currentStepName: "Step {i} of {n}, {title}, {chipWord}",
  explorerLink: common.viewOnExplorer,
  explorerLinkLabel: common.transactionOnExplorer,
} as const satisfies SheetCopy;

export const txSheetTitles = {
  checking: { title: "{label}", subtitle: "Checking…" },
  preflightBlocked: { title: "{label}", subtitle: { from: "preflight" } },
  running: { title: "{label}", subtitle: "Step {i} of {n} · {chipWord}" },
  needsConfirmation: {
    title: "{label}",
    subtitle: { wallet: "Confirm in {wallet}", passkey: "Confirm with your passkey" },
  },
  done: { title: { from: "action.success.title" }, subtitle: { from: "action.success.body" } },
  confirmedSyncing: { title: { from: "action.success.title" }, subtitle: txConfirmedSyncing },
  alreadyDone: { title: "Already done", subtitle: errorMapping },
  rejected: {
    title: "Cancelled",
    subtitle: "Nothing was sent.",
    purchaseAfterAllow: saleTxActions.purchase.cancelledAfterAllow,
  },
  failed: { title: "{label} didn’t go through", subtitle: errorMapping },
  unknown: {
    title: "Waiting for the network",
    subtitle: "Don’t send it again. We’ll keep checking and let you know.",
  },
} as const satisfies SheetCopy;

export const txPreflight = {
  notDeployed: {
    line: "Spoke’s contracts aren’t deployed on this network yet, so this can’t run.",
    actions: [common.close],
  },
  wrongNetwork: { line: required.wrongNetwork, actions: ["Switch network", common.cancel] },
  notEnoughMon: {
    line: "You need about {fee} MON for network fees. You have {mon} MON.",
    actions: ["Get test MON", common.cancel],
  },
  notEnoughSdusd: {
    line: "You need {amount}. You have {balance}.",
    actions: ["Get test SDUSD", common.cancel],
  },
  simulationReverts: { line: txEngineStates.failed.beforeSending.helper, actions: errorMapping },
  checkoutExpired: {
    line: "This checkout expired. Start again to see the current price and rewards.",
    actions: ["Back to checkout"],
  },
  rpcUnreachable: {
    line: "Couldn’t reach Monad Testnet. Nothing was sent. Try again.",
    actions: [common.tryAgain, common.cancel],
  },
} as const satisfies SheetCopy;

export const txFees = {
  title: "Network fee",
  totalEstimate: "up to {fee} MON · testnet",
  totalPaid: "{fee} MON paid",
  stepEstimate: "Fee: up to {fee} MON",
  stepNotSimulated: "Fee: about {fee} MON",
  stepPaid: "Fee paid: {fee} MON",
  whyUpTo: "Why ‘up to’?",
  whyUpToBody:
    "Monad charges for the gas limit a transaction declares, not the gas it ends up using. Spoke sets each limit from a fresh estimate plus 10%, so the fee shown is close to what you’ll pay and the transaction won’t run out of gas. MON on Monad Testnet is a test token with no cash value.",
  walletNote:
    "{wallet} may show a slightly different fee. The fee in your wallet is the one that applies.",
} as const satisfies SheetCopy;

export const txOutcomeActions = {
  done: { primary: handOff, secondary: common.viewOnExplorer },
  confirmedSyncing: { primary: handOff, secondary: common.viewOnExplorer, ghost: common.hide },
  alreadyDone: { primary: "Done", withHandOff: handOff },
  rejected: { primary: common.tryAgain, secondary: common.close },
  failedRetryable: {
    primary: common.tryAgain,
    secondary: common.viewOnExplorer,
    ghost: txReportProblem.action,
  },
  failedFinal: {
    primary: common.back,
    secondary: common.viewOnExplorer,
    ghost: txReportProblem.action,
  },
  unknown: { primary: checkAgain, secondary: common.viewOnExplorer, ghost: txReportProblem.action },
  replacedCancelled: {
    primary: txReplacementOutcomes.cancelled.actions[0],
    secondary: common.close,
    ghost: common.viewOnExplorer,
  },
  replacedOther: {
    primary: txReplacementOutcomes.replaced.actions[0],
    secondary: common.close,
    ghost: common.viewOnExplorer,
  },
} as const satisfies SheetCopy;

export const txIndicator = {
  running: "{n} running",
  needsAction: "Action needed",
  runningAria: "{n} transactions running",
  needsActionAria: "Transaction needs your attention",
} as const satisfies SheetCopy;

export const txListView = {
  title: "Transactions on this device",
  show: "Show",
  back: "All transactions",
} as const satisfies SheetCopy;

export const txAnnouncements = {
  sent: "{stepTitle}: sent to Monad Testnet.",
  confirmed: "{stepTitle}: confirmed onchain.",
} as const satisfies SheetCopy;

export const txResumption = {
  wentThrough: "This went through before you left.",
  expired: "Expired. Nothing was sent.",
} as const satisfies SheetCopy;

export const txDemo = {
  confirm: "Confirm (simulated)",
  hash: common.simulated,
  fee: "Network fee: simulated, nothing charged",
  simulateTitle: "Simulate an outcome",
  simulateOptions: {
    success: "Success",
    cancelInWallet: "Cancel in wallet",
    contractRejects: "Contract rejects it ({errorName})",
    lostConnection: "Lost connection after sending",
    walletSpedUp: "Wallet sped it up",
    walletCancelled: "Wallet cancelled it",
    wrongNetwork: "Wrong network",
    notEnoughMon: "Not enough MON",
    indexerBehind: "Indexer behind",
  },
} as const satisfies SheetCopy;
