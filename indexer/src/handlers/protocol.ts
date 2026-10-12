import { indexer } from "envio";

const eventNames = [
  "CampaignCreated",
  "CampaignFunded",
  "CampaignStatusChanged",
  "MerchantProceedsClaimed",
  "NativePurchaseAccepted",
  "NodeCreated",
  "PolicyVersionRegistered",
  "RewardClaimed",
  "RewardReserved",
  "RewardVested",
  "SaleFinalized",
  "SaleRefunded",
  "SurplusReturned",
] as const;

for (const eventName of eventNames)
  indexer.onEvent(
    {
      contract: "SpokeProtocol",
      event: eventName,
      fields: { transaction: ["hash"], block: ["hash", "timestamp"] },
    },
    ({ event, context }) => {
      context.ChainEvent.set({
        id: `${String(event.chainId)}:${event.transaction.hash}:${String(event.logIndex)}:${event.block.hash}`,
        chainId: event.chainId,
        contractAddress: event.srcAddress.toLowerCase(),
        blockNumber: BigInt(event.block.number),
        blockHash: event.block.hash,
        transactionHash: event.transaction.hash,
        logIndex: event.logIndex,
        name: event.eventName,
        payload: JSON.stringify(event.params, (_, value: unknown) =>
          typeof value === "bigint" ? value.toString() : value,
        ),
        timestamp: BigInt(event.block.timestamp),
      });
      return Promise.resolve();
    },
  );

indexer.onBlock({ name: "CanonicalCheckpoint" }, ({ block, context }) => {
  context.IndexerCheckpoint.set({
    id: String(context.chain.id),
    chainId: context.chain.id,
    blockNumber: BigInt(block.number),
  });
  return Promise.resolve();
});

indexer.onEvent(
  {
    contract: "SpokeDemoUSD",
    event: "Transfer",
    fields: { transaction: ["hash"], block: ["hash", "timestamp"] },
  },
  ({ event, context }) => {
    context.ChainEvent.set({
      id: `${String(event.chainId)}:${event.transaction.hash}:${String(event.logIndex)}:${event.block.hash}`,
      chainId: event.chainId,
      contractAddress: event.srcAddress.toLowerCase(),
      blockNumber: BigInt(event.block.number),
      blockHash: event.block.hash,
      transactionHash: event.transaction.hash,
      logIndex: event.logIndex,
      name: event.eventName,
      payload: JSON.stringify(event.params, (_, value: unknown) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
      timestamp: BigInt(event.block.timestamp),
    });
    return Promise.resolve();
  },
);
