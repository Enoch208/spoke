export const spokeProtocolAbi = [
  {
    type: "function",
    name: "activateCampaign",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimMerchantProceeds",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
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
    name: "claimRewards",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
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
        type: "uint256",
        internalType: "uint256",
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
    name: "claimableRewards",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "amount",
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
        name: "metadataHash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "config",
        type: "tuple",
        internalType: "struct ISpokeProtocol.CampaignConfig",
        components: [
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
        ],
      },
      {
        name: "policy",
        type: "tuple",
        internalType: "struct ISpokeProtocol.CommissionPolicy",
        components: [
          {
            name: "rewardToken",
            type: "address",
            internalType: "address",
          },
          {
            name: "commissionBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxRewardedAncestors",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "weightsBps",
            type: "uint16[]",
            internalType: "uint16[]",
          },
          {
            name: "perSaleCap",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "campaignLiabilityCap",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "holdSeconds",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "expiry",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "shortPathMode",
            type: "uint8",
            internalType: "enum ISpokeProtocol.ShortPathMode",
          },
          {
            name: "eligibilityHash",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createNode",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "parentNodeId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "metadataHash",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "nodeId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
            name: "metadataHash",
            type: "bytes32",
            internalType: "bytes32",
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
            name: "createdAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "endsAt",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "active",
            type: "bool",
            internalType: "bool",
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
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "saleCount",
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
    name: "getCurrentPolicy",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISpokeProtocol.PolicyVersion",
        components: [
          {
            name: "policy",
            type: "tuple",
            internalType: "struct ISpokeProtocol.CommissionPolicy",
            components: [
              {
                name: "rewardToken",
                type: "address",
                internalType: "address",
              },
              {
                name: "commissionBps",
                type: "uint16",
                internalType: "uint16",
              },
              {
                name: "maxRewardedAncestors",
                type: "uint16",
                internalType: "uint16",
              },
              {
                name: "weightsBps",
                type: "uint16[]",
                internalType: "uint16[]",
              },
              {
                name: "perSaleCap",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "campaignLiabilityCap",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "holdSeconds",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "expiry",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "shortPathMode",
                type: "uint8",
                internalType: "enum ISpokeProtocol.ShortPathMode",
              },
              {
                name: "eligibilityHash",
                type: "bytes32",
                internalType: "bytes32",
              },
            ],
          },
          {
            name: "policyHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "version",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "effectiveAt",
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
    name: "getNode",
    inputs: [
      {
        name: "nodeId",
        type: "uint256",
        internalType: "uint256",
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
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "parentId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "creator",
            type: "address",
            internalType: "address",
          },
          {
            name: "metadataHash",
            type: "bytes32",
            internalType: "bytes32",
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
        type: "uint256",
        internalType: "uint256",
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
    name: "getPolicyVersion",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "version",
        type: "uint32",
        internalType: "uint32",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISpokeProtocol.PolicyVersion",
        components: [
          {
            name: "policy",
            type: "tuple",
            internalType: "struct ISpokeProtocol.CommissionPolicy",
            components: [
              {
                name: "rewardToken",
                type: "address",
                internalType: "address",
              },
              {
                name: "commissionBps",
                type: "uint16",
                internalType: "uint16",
              },
              {
                name: "maxRewardedAncestors",
                type: "uint16",
                internalType: "uint16",
              },
              {
                name: "weightsBps",
                type: "uint16[]",
                internalType: "uint16[]",
              },
              {
                name: "perSaleCap",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "campaignLiabilityCap",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "holdSeconds",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "expiry",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "shortPathMode",
                type: "uint8",
                internalType: "enum ISpokeProtocol.ShortPathMode",
              },
              {
                name: "eligibilityHash",
                type: "bytes32",
                internalType: "bytes32",
              },
            ],
          },
          {
            name: "policyHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "version",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "effectiveAt",
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
    name: "getPriceLedger",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
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
            name: "proceedsPending",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "proceedsClaimable",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "proceedsClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "buyerRefunded",
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
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISpokeProtocol.RewardLedger",
        components: [
          {
            name: "netDeposited",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "available",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "pendingReserved",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "vestedUnclaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "rewardsClaimed",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "surplusWithdrawn",
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
        type: "uint256",
        internalType: "uint256",
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
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "nodeId",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "buyer",
            type: "address",
            internalType: "address",
          },
          {
            name: "orderKey",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "policyHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "policyVersion",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "price",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "rewardReserved",
            type: "uint256",
            internalType: "uint256",
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
          {
            name: "source",
            type: "uint8",
            internalType: "enum ISpokeProtocol.SaleSource",
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
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "depth",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "effectiveWeightBps",
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
    name: "getScheduledPolicy",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct ISpokeProtocol.PolicyVersion",
        components: [
          {
            name: "policy",
            type: "tuple",
            internalType: "struct ISpokeProtocol.CommissionPolicy",
            components: [
              {
                name: "rewardToken",
                type: "address",
                internalType: "address",
              },
              {
                name: "commissionBps",
                type: "uint16",
                internalType: "uint16",
              },
              {
                name: "maxRewardedAncestors",
                type: "uint16",
                internalType: "uint16",
              },
              {
                name: "weightsBps",
                type: "uint16[]",
                internalType: "uint16[]",
              },
              {
                name: "perSaleCap",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "campaignLiabilityCap",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "holdSeconds",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "expiry",
                type: "uint64",
                internalType: "uint64",
              },
              {
                name: "shortPathMode",
                type: "uint8",
                internalType: "enum ISpokeProtocol.ShortPathMode",
              },
              {
                name: "eligibilityHash",
                type: "bytes32",
                internalType: "bytes32",
              },
            ],
          },
          {
            name: "policyHash",
            type: "bytes32",
            internalType: "bytes32",
          },
          {
            name: "version",
            type: "uint32",
            internalType: "uint32",
          },
          {
            name: "effectiveAt",
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
    name: "nodeOf",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
    name: "previewAllocation",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "nodeId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "saleAmount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "recipients",
        type: "address[]",
        internalType: "address[]",
      },
      {
        name: "amounts",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "rewardTotal",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "previewPurchase",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "nodeId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "rewardTotal",
        type: "uint256",
        internalType: "uint256",
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
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "depth",
            type: "uint8",
            internalType: "uint8",
          },
          {
            name: "effectiveWeightBps",
            type: "uint16",
            internalType: "uint16",
          },
        ],
      },
      {
        name: "policyHash",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "policyVersion",
        type: "uint32",
        internalType: "uint32",
      },
      {
        name: "unallocated",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "purchase",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "nodeId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "orderKey",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "saleId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refundNativeSale",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refundUnusedRewardBudget",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
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
    name: "registerPolicyVersion",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "policy",
        type: "tuple",
        internalType: "struct ISpokeProtocol.CommissionPolicy",
        components: [
          {
            name: "rewardToken",
            type: "address",
            internalType: "address",
          },
          {
            name: "commissionBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxRewardedAncestors",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "weightsBps",
            type: "uint16[]",
            internalType: "uint16[]",
          },
          {
            name: "perSaleCap",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "campaignLiabilityCap",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "holdSeconds",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "expiry",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "shortPathMode",
            type: "uint8",
            internalType: "enum ISpokeProtocol.ShortPathMode",
          },
          {
            name: "eligibilityHash",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
      {
        name: "effectiveAt",
        type: "uint64",
        internalType: "uint64",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "resumeCampaign",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "saleIdForOrder",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "orderKey",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "saleId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "merchant",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "metadataHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "skuHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "price",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "token",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "policyHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
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
        type: "uint256",
        indexed: true,
        internalType: "uint256",
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
    name: "CampaignStatusChanged",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "active",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "paused",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
      {
        name: "ended",
        type: "bool",
        indexed: false,
        internalType: "bool",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "MerchantProceedsClaimed",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
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
    name: "NativePurchaseAccepted",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "buyer",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "nodeId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "orderKey",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "policyHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
      {
        name: "policyVersion",
        type: "uint32",
        indexed: false,
        internalType: "uint32",
      },
      {
        name: "price",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "rewardReserved",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "unlockAt",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "NodeCreated",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "nodeId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "parentNodeId",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "metadataHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PolicyVersionRegistered",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "version",
        type: "uint32",
        indexed: true,
        internalType: "uint32",
      },
      {
        name: "policyHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32",
      },
      {
        name: "effectiveAt",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
      {
        name: "policy",
        type: "tuple",
        indexed: false,
        internalType: "struct ISpokeProtocol.CommissionPolicy",
        components: [
          {
            name: "rewardToken",
            type: "address",
            internalType: "address",
          },
          {
            name: "commissionBps",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "maxRewardedAncestors",
            type: "uint16",
            internalType: "uint16",
          },
          {
            name: "weightsBps",
            type: "uint16[]",
            internalType: "uint16[]",
          },
          {
            name: "perSaleCap",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "campaignLiabilityCap",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "holdSeconds",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "expiry",
            type: "uint64",
            internalType: "uint64",
          },
          {
            name: "shortPathMode",
            type: "uint8",
            internalType: "enum ISpokeProtocol.ShortPathMode",
          },
          {
            name: "eligibilityHash",
            type: "bytes32",
            internalType: "bytes32",
          },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RewardClaimed",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "token",
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
    name: "RewardReserved",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
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
        name: "depth",
        type: "uint8",
        indexed: false,
        internalType: "uint8",
      },
      {
        name: "effectiveWeightBps",
        type: "uint16",
        indexed: false,
        internalType: "uint16",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "RewardVested",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
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
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SaleFinalized",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "merchantAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "commissionAmount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
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
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
      },
      {
        name: "price",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "releasedReward",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SurplusReturned",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        indexed: true,
        internalType: "uint256",
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
    type: "error",
    name: "BuyerAlreadyPurchased",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
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
    name: "CampaignActive",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignCapacityReached",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignIsEnded",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignIsPaused",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignNotActive",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "CampaignNotFunded",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "parentNodeId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidPolicy",
    inputs: [],
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
        name: "nodeId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "InvalidSchedule",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidWeights",
    inputs: [],
  },
  {
    type: "error",
    name: "LiabilityCapExceeded",
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
    name: "NodeAlreadyRegistered",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
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
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OrderAlreadyUsed",
    inputs: [
      {
        name: "orderKey",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "PolicyMismatch",
    inputs: [
      {
        name: "expected",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "actual",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
  },
  {
    type: "error",
    name: "PolicyNoticeTooShort",
    inputs: [
      {
        name: "earliestEffectiveAt",
        type: "uint64",
        internalType: "uint64",
      },
    ],
  },
  {
    type: "error",
    name: "PolicyTokenImmutable",
    inputs: [],
  },
  {
    type: "error",
    name: "PolicyVersionPending",
    inputs: [
      {
        name: "campaignId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "RefundWindowClosed",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "SaleAlreadyRefunded",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "SaleNotMature",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "UnknownNode",
    inputs: [
      {
        name: "nodeId",
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "UnknownSale",
    inputs: [
      {
        name: "saleId",
        type: "uint256",
        internalType: "uint256",
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
        type: "uint256",
        internalType: "uint256",
      },
    ],
  },
] as const;
