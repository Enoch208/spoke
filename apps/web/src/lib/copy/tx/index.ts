import { campaignTxActions } from "./actions-campaign";
import { lifecycleTxActions } from "./actions-lifecycle";
import { saleTxActions } from "./actions-sale";
import { settlementTxActions } from "./actions-settlement";
import type { TxActionCopy, TxActionName, TxOffchainActionCopy } from "./actions-shape";
import { testnetTxActions } from "./actions-testnet";

export const txActions = {
  ...campaignTxActions,
  ...lifecycleTxActions,
  ...saleTxActions,
  ...settlementTxActions,
  ...testnetTxActions,
} as const satisfies Record<TxActionName, TxActionCopy | TxOffchainActionCopy>;

export {
  txActionIds,
  type TxActionCopy,
  type TxActionId,
  type TxActionName,
  type TxCopy,
  type TxCopySource,
  type TxOffchainActionCopy,
  type TxSuccess,
  type TxToast,
} from "./actions-shape";
export { campaignTxActions } from "./actions-campaign";
export { lifecycleTxActions } from "./actions-lifecycle";
export { saleTxActions } from "./actions-sale";
export { settlementTxActions } from "./actions-settlement";
export { testnetTxActions } from "./actions-testnet";
export { txApprove } from "./approve";
export { txEngineStates, txQuickActions } from "./engine";
export { txReplacementOutcomes, txUnknownOutcomes } from "./outcomes";
export {
  txAnnouncements,
  txDemo,
  txFees,
  txIndicator,
  txListView,
  txOutcomeActions,
  txPreflight,
  txResumption,
  txSheet,
  txSheetTitles,
} from "./sheet";
export { txConfirmedSyncing, txReportProblem, txStepStates } from "./sheet-steps";
