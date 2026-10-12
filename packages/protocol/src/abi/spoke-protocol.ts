export const spokeProtocolAbi = [
  {
    type: "function",
    name: "checkout",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "leafNodeId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "checkoutKey",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimCampaignEarnings",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimableOf",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "reward",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "proceeds",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createCampaign",
    inputs: [
      {
        name: "config",
        type: "tuple",
        internalType: "struct ISpokeProtocol.CampaignConfig",
        components: [
          {
            name: "token",
            type: "address",
            internalType: "address",
          },
          {
            name: "skuHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "skuPrice",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "maxCommissionPerSale",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "commissionBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "startsAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "endsAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "settlementHoldSeconds",
            type: "uint32",
            internalType: "uint32",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createReferralNode",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "parentId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "nodeId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "endCampaign",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "finalizeSale",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "fundCampaign",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getCampaign",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISpokeProtocol.Campaign",
        components: [
          {
            name: "merchant",
            type: "address",
            internalType: "address",
          },
          {
            name: "token",
            type: "address",
            internalType: "address",
          },
          {
            name: "skuHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "skuPrice",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "maxCommissionPerSale",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "commissionBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "startsAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "endsAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "settlementHoldSeconds",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "paused",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "ended",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "nodeCount",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "saleCount",
            type: "uint16",
            internalType: "uint16",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNode",
    inputs: [
      {
        name: "nodeId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISpokeProtocol.ReferralNode",
        components: [
          {
            name: "campaignId",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "parentId",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "creator",
            type: "address",
            internalType: "address",
          },
          {
            name: "createdAt",
            type: "uint64",
            internalType: "uint64",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPath",
    inputs: [
      {
        name: "nodeId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "nearestFirst",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPriceLedger",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISpokeProtocol.PriceLedger",
        components: [
          {
            name: "received",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "pendingEscrow",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "merchantClaimable",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "merchantClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "refunded",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getRewardLedger",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISpokeProtocol.RewardLedger",
        components: [
          {
            name: "deposited",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "available",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "reserved",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "claimable",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "claimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "withdrawn",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getSale",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [
      {
        name: "sale",
        type: "tuple",
        internalType: "struct ISpokeProtocol.Sale",
        components: [
          {
            name: "campaignId",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "leafNodeId",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "buyer",
            type: "address",
            internalType: "address",
          },
          {
            name: "price",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "commission",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "purchasedAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "unlockAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "status",
            type: "uint8",
            internalType: "enum ISpokeProtocol.SaleStatus",
          },
        ],
      },
      {
        name: "allocations",
        type: "tuple[]",
        internalType: "struct ISpokeProtocol.Allocation[]",
        components: [
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "amount",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "depth",
            type: "uint8",
            internalType: "uint8",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nodeOf",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "wallet",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "nodeId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pauseCampaign",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "paused",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "paymentToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "previewCheckout",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "leafNodeId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "buyer",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "price",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "commission",
        type: "uint128",
        internalType: "uint128",
      },
      {
        name: "allocations",
        type: "tuple[]",
        internalType: "struct ISpokeProtocol.Allocation[]",
        components: [
          {
            name: "recipient",
            type: "address",
            internalType: "address",
          },
          {
            name: "amount",
            type: "uint128",
            internalType: "uint128",
          },
          {
            name: "depth",
            type: "uint8",
            internalType: "uint8",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "refundPendingSale",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "saleIdForCheckout",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "buyer",
        type: "address",
        internalType: "address",
      },
      {
        name: "checkoutKey",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalCampaigns",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalNodes",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSales",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawAvailableReward",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "merchant",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "skuHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "price",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "commissionBps",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
      {
        name: "maxCommissionPerSale",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "settlementHoldSeconds",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
      {
        name: "startsAt",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "endsAt",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CampaignEnded",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CampaignFunded",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "funder",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "receivedAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "CampaignPaused",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "paused",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EarningsClaimed",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "source",
        type: "uint8",
        indexed: false,
        internalType: "enum ISpokeProtocol.CreditSource",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReferralNodeCreated",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "nodeId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "parentId",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "distributor",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RewardReserved",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "depth",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RewardWithdrawn",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "merchant",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SaleFinalized",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "merchantAmount",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "commissionAmount",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SalePurchased",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "leafNodeId",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "price",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "commission",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "unlockAt",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "checkoutKey",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SaleRefunded",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "campaignId",
        type: "uint64",
        indexed: true,
        internalType: "uint64",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "price",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
      {
        name: "releasedReward",
        type: "uint128",
        indexed: false,
        internalType: "uint128",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "AmountExceedsAvailable",
    inputs: [
      {
        name: "requested",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "available",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "BuyerAlreadyPurchased",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "buyer",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignCapacityReached",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignIsEnded",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignIsPaused",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignNotActive",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "DuplicateCheckout",
    inputs: [
      {
        name: "checkoutKey",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "InsufficientRewardEscrow",
    inputs: [
      {
        name: "required",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "available",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidCommission",
    inputs: [
      {
        name: "commissionBps",
        type: "uint16",
        internalType: "uint16",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidParent",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "parentId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidPrice",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidReferralPath",
    inputs: [
      {
        name: "leafNodeId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidSchedule",
    inputs: [
      {
        name: "startsAt",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "endsAt",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "NodeAlreadyRegistered",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "wallet",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "NotAuthorizedToRefund",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "caller",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "NotMerchant",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "caller",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "NothingToClaim",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "RefundWindowClosed",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "unlockAt",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "SaleAlreadyFinalized",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "SaleAlreadyRefunded",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "SaleNotMature",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
      {
        name: "unlockAt",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "SelfReferral",
    inputs: [
      {
        name: "wallet",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "TokenNotAllowed",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "UnexpectedTransferAmount",
    inputs: [
      {
        name: "expected",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "received",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "UnknownCampaign",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "UnknownNode",
    inputs: [
      {
        name: "nodeId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "UnknownSale",
    inputs: [
      {
        name: "saleId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "ZeroAmount",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroReward",
    inputs: [
      {
        name: "campaignId",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
] as const;
