import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  http,
  type Address,
  type Hex,
} from "viem";
import {
  isContractErrorName,
  contractErrorCodes,
  spokeProtocolAbi,
  demoTokenAbi,
  policyVersion,
} from "@spoke/protocol";
import { ApiProblem } from "../http/problem.js";

export const wire = (value: unknown): unknown =>
  JSON.parse(
    JSON.stringify(value, (_, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
export const omitFields = (value: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));

export const createChainService = (
  rpcUrl: string,
  chainId: number,
  protocolAddress: string | null,
  tokenAddress: string | null,
  fetcher?: typeof fetch,
) => {
  const client = createPublicClient({
    transport: http(rpcUrl, { timeout: 8000, retryCount: fetcher ? 0 : 1, fetchFn: fetcher }),
  });
  const address = protocolAddress ? getAddress(protocolAddress) : null;
  const token = tokenAddress ? getAddress(tokenAddress) : null;
  const service = {
    client,
    chainId,
    address,
    token,
    async ready() {
      if (!address)
        throw new ApiProblem(
          503,
          "PROTOCOL_NOT_DEPLOYED",
          "Settlement contract has not been configured. No financial result is available.",
        );
      const [actualChain, code] = await Promise.all([
        client.getChainId(),
        client.getCode({ address }),
      ]);
      if (actualChain !== chainId)
        throw new ApiProblem(503, "WRONG_NETWORK", "RPC is connected to the wrong network.");
      if (!code || code === "0x")
        throw new ApiProblem(
          503,
          "PROTOCOL_NOT_DEPLOYED",
          "No settlement contract exists at the configured address.",
        );
      return address;
    },
    async head() {
      const block = await client.getBlock();
      return {
        blockNumber: block.number.toString(),
        blockHash: block.hash,
        at: new Date(Number(block.timestamp) * 1000).toISOString(),
      };
    },
    async campaign(id: string, blockNumber?: bigint) {
      const contract = await service.ready();
      const args = {
        address: contract,
        abi: spokeProtocolAbi,
        args: [BigInt(id)],
        ...(blockNumber === undefined ? {} : { blockNumber }),
      } as const;
      const [campaign, rewards, proceeds, currentPolicy, scheduledPolicy] = await Promise.all([
        client.readContract({ ...args, functionName: "getCampaign" }),
        client.readContract({ ...args, functionName: "getRewardLedger" }),
        client.readContract({ ...args, functionName: "getPriceLedger" }),
        client.readContract({ ...args, functionName: "getCurrentPolicy" }),
        client.readContract({ ...args, functionName: "getScheduledPolicy" }),
      ]);
      if (campaign.merchant === "0x0000000000000000000000000000000000000000")
        throw new ApiProblem(404, "NOT_FOUND", "No such campaign.");
      return { campaign, rewards, proceeds, currentPolicy, scheduledPolicy };
    },
    async node(id: string) {
      const contract = await service.ready();
      return client.readContract({
        address: contract,
        abi: spokeProtocolAbi,
        functionName: "getNode",
        args: [BigInt(id)],
      });
    },
    async sale(id: string, blockNumber?: bigint) {
      const contract = await service.ready();
      return client.readContract({
        address: contract,
        abi: spokeProtocolAbi,
        functionName: "getSale",
        args: [BigInt(id)],
        ...(blockNumber === undefined ? {} : { blockNumber }),
      });
    },
    async preview(campaignId: string, nodeId: string, buyer: Address, atBlock?: bigint) {
      const contract = await service.ready();
      const blockNumber = atBlock ?? (await client.getBlockNumber());
      const [price, reward, allocations, policyHash, policyVersion, unallocated] =
        await client.readContract({
          address: contract,
          abi: spokeProtocolAbi,
          functionName: "previewPurchase",
          args: [BigInt(campaignId), BigInt(nodeId), buyer],
          blockNumber,
        });
      return {
        price: price.toString(),
        rewardTotal: reward.toString(),
        allocations: wire(allocations),
        policyHash,
        policyVersion,
        unallocated: unallocated.toString(),
        blockNumber: blockNumber.toString(),
      };
    },
    async balances(account: Address, atBlock?: bigint) {
      const blockNumber = atBlock ?? (await client.getBlockNumber());
      const monWei = await client.getBalance({ address: account, blockNumber });
      if (!token)
        return {
          monWei: monWei.toString(),
          sdusd: null,
          sdusdAllowanceToProtocol: null,
          blockNumber: blockNumber.toString(),
        };
      const sdusd = await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [account],
        blockNumber,
      });
      const allowance = address
        ? await client.readContract({
            address: token,
            abi: erc20Abi,
            functionName: "allowance",
            args: [account, address],
            blockNumber,
          })
        : null;
      return {
        monWei: monWei.toString(),
        sdusd: sdusd.toString(),
        sdusdAllowanceToProtocol: allowance?.toString() ?? null,
        blockNumber: blockNumber.toString(),
      };
    },
    async findSale(campaignId: string, orderKey: Hex) {
      const contract = await service.ready();
      return client.readContract({
        address: contract,
        abi: spokeProtocolAbi,
        functionName: "saleIdForOrder",
        args: [BigInt(campaignId), orderKey],
      });
    },
    async verifySignature(account: Address, message: string, signature: Hex) {
      return client.verifyMessage({ address: account, message, signature, mode: "eoa" });
    },
    checkoutData(campaignId: string, nodeId: string, orderKey: Hex) {
      return encodeFunctionData({
        abi: spokeProtocolAbi,
        functionName: "purchase",
        args: [BigInt(campaignId), BigInt(nodeId), orderKey],
      });
    },
    async tokenInfo() {
      if (!token) return [];
      const [symbol, decimals, limit] = await Promise.all([
        client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
        client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
        client.readContract({ address: token, abi: demoTokenAbi, functionName: "FAUCET_LIMIT" }),
      ]);
      return [
        {
          address: token,
          symbol,
          decimals,
          faucetLimit: limit.toString(),
          role: "both",
          testnet: true,
          label: "Non-redeemable testnet demo token",
        },
      ];
    },
  };
  return service;
};
export type ChainService = ReturnType<typeof createChainService>;

export const policyView = (value: Awaited<ReturnType<ChainService["campaign"]>>["currentPolicy"]) =>
  policyVersion.parse({
    ...value.policy,
    perSaleCap: value.policy.perSaleCap.toString(),
    campaignLiabilityCap: value.policy.campaignLiabilityCap.toString(),
    holdSeconds: Number(value.policy.holdSeconds),
    expiry: value.policy.expiry.toString(),
    shortPathMode: value.policy.shortPathMode === 0 ? "RENORMALIZE_EXISTING" : "RETURN_UNUSED",
    policyHash: value.policyHash,
    version: value.version,
    effectiveAt: new Date(Number(value.effectiveAt) * 1000).toISOString(),
    regions: [],
    sharingRules: [],
  });

export const translateChainError = (error: unknown) => {
  if (error instanceof ApiProblem) return error;
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current && typeof current === "object"; depth++) {
    if (
      "data" in current &&
      current.data &&
      typeof current.data === "object" &&
      "errorName" in current.data &&
      typeof current.data.errorName === "string" &&
      isContractErrorName(current.data.errorName)
    ) {
      return new ApiProblem(
        409,
        contractErrorCodes[current.data.errorName],
        "The contract rejected this operation.",
        false,
        { contractError: current.data.errorName },
      );
    }
    current = "cause" in current ? current.cause : null;
  }
  return new ApiProblem(
    503,
    "UPSTREAM_UNAVAILABLE",
    "The chain service is temporarily unavailable.",
    true,
  );
};
