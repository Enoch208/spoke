// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISpokeProtocol {
    enum SaleStatus {
        None,
        Pending,
        Refunded,
        Finalized
    }
    enum SaleSource {
        NativeOnchain,
        MerchantAttested,
        ThirdPartyVerified
    }
    enum ShortPathMode {
        Renormalize,
        ReturnUnused
    }

    struct CommissionPolicy {
        address rewardToken;
        uint16 commissionBps;
        uint16 maxRewardedAncestors;
        uint16[] weightsBps;
        uint256 perSaleCap;
        uint256 campaignLiabilityCap;
        uint64 holdSeconds;
        uint64 expiry;
        ShortPathMode shortPathMode;
        bytes32 eligibilityHash;
    }

    struct CampaignConfig {
        bytes32 skuHash;
        uint128 skuPrice;
    }

    struct Campaign {
        address merchant;
        address token;
        bytes32 metadataHash;
        bytes32 skuHash;
        uint128 skuPrice;
        uint64 createdAt;
        uint64 endsAt;
        bool active;
        bool paused;
        bool ended;
        uint256 nodeCount;
        uint256 saleCount;
    }

    struct PolicyVersion {
        CommissionPolicy policy;
        bytes32 policyHash;
        uint32 version;
        uint64 effectiveAt;
    }

    struct RewardLedger {
        uint256 netDeposited;
        uint256 available;
        uint256 pendingReserved;
        uint256 vestedUnclaimed;
        uint256 rewardsClaimed;
        uint256 surplusWithdrawn;
    }

    struct PriceLedger {
        uint256 received;
        uint256 proceedsPending;
        uint256 proceedsClaimable;
        uint256 proceedsClaimed;
        uint256 buyerRefunded;
    }

    struct ReferralNode {
        uint256 campaignId;
        uint256 parentId;
        address creator;
        bytes32 metadataHash;
        uint64 createdAt;
    }

    struct Allocation {
        address recipient;
        uint256 amount;
        uint8 depth;
        uint16 effectiveWeightBps;
    }

    struct Sale {
        uint256 campaignId;
        uint256 nodeId;
        address buyer;
        bytes32 orderKey;
        bytes32 policyHash;
        uint32 policyVersion;
        uint256 price;
        uint256 rewardReserved;
        uint64 purchasedAt;
        uint64 unlockAt;
        SaleStatus status;
        SaleSource source;
    }

    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed merchant,
        bytes32 metadataHash,
        bytes32 skuHash,
        uint256 price,
        address token,
        bytes32 policyHash
    );
    event PolicyVersionRegistered(
        uint256 indexed campaignId,
        uint32 indexed version,
        bytes32 indexed policyHash,
        uint64 effectiveAt,
        CommissionPolicy policy
    );
    event CampaignFunded(
        uint256 indexed campaignId, address indexed funder, uint256 receivedAmount
    );
    event CampaignStatusChanged(uint256 indexed campaignId, bool active, bool paused, bool ended);
    event NodeCreated(
        uint256 indexed campaignId,
        uint256 indexed nodeId,
        uint256 parentNodeId,
        address indexed owner,
        bytes32 metadataHash
    );
    event NativePurchaseAccepted(
        uint256 indexed saleId,
        uint256 indexed campaignId,
        address indexed buyer,
        uint256 nodeId,
        bytes32 orderKey,
        bytes32 policyHash,
        uint32 policyVersion,
        uint256 price,
        uint256 rewardReserved,
        uint64 unlockAt
    );
    event RewardReserved(
        uint256 indexed saleId,
        uint256 indexed campaignId,
        address indexed recipient,
        uint256 amount,
        uint8 depth,
        uint16 effectiveWeightBps
    );
    event SaleRefunded(
        uint256 indexed saleId, uint256 indexed campaignId, uint256 price, uint256 releasedReward
    );
    event SaleFinalized(
        uint256 indexed saleId,
        uint256 indexed campaignId,
        uint256 merchantAmount,
        uint256 commissionAmount
    );
    event RewardVested(uint256 indexed saleId, address indexed recipient, uint256 amount);
    event RewardClaimed(
        uint256 indexed campaignId, address indexed recipient, address indexed token, uint256 amount
    );
    event MerchantProceedsClaimed(
        uint256 indexed campaignId, address indexed merchant, uint256 amount
    );
    event SurplusReturned(uint256 indexed campaignId, address indexed merchant, uint256 amount);

    error TokenNotAllowed(address token);
    error InvalidCommission(uint16 commissionBps);
    error InvalidPolicy();
    error InvalidWeights();
    error InvalidSchedule();
    error InvalidPrice();
    error ZeroAmount();
    error UnknownCampaign(uint256 campaignId);
    error UnknownNode(uint256 nodeId);
    error UnknownSale(uint256 saleId);
    error NotMerchant(uint256 campaignId, address caller);
    error NotAuthorizedToRefund(uint256 saleId, address caller);
    error CampaignNotActive(uint256 campaignId);
    error CampaignActive(uint256 campaignId);
    error CampaignIsPaused(uint256 campaignId);
    error CampaignIsEnded(uint256 campaignId);
    error CampaignCapacityReached(uint256 campaignId);
    error CampaignNotFunded(uint256 campaignId);
    error PolicyVersionPending(uint256 campaignId);
    error PolicyNoticeTooShort(uint64 earliestEffectiveAt);
    error PolicyTokenImmutable();
    error PolicyMismatch(bytes32 expected, bytes32 actual);
    error LiabilityCapExceeded(uint256 required, uint256 available);
    error NodeAlreadyRegistered(uint256 campaignId, address wallet);
    error InvalidParent(uint256 campaignId, uint256 parentNodeId);
    error InvalidReferralPath(uint256 nodeId);
    error SelfReferral(address wallet);
    error OrderAlreadyUsed(bytes32 orderKey);
    error BuyerAlreadyPurchased(uint256 campaignId, address buyer);
    error ZeroReward(uint256 campaignId);
    error InsufficientRewardEscrow(uint256 required, uint256 available);
    error UnexpectedTransferAmount(uint256 expected, uint256 received);
    error SaleNotMature(uint256 saleId, uint64 unlockAt);
    error SaleAlreadyFinalized(uint256 saleId);
    error SaleAlreadyRefunded(uint256 saleId);
    error RefundWindowClosed(uint256 saleId, uint64 unlockAt);
    error NothingToClaim(address account);

    function paymentToken() external view returns (address);
    function createCampaign(
        bytes32 metadataHash,
        CampaignConfig calldata config,
        CommissionPolicy calldata policy
    ) external returns (uint256 campaignId);
    function fundCampaign(uint256 campaignId, uint256 amount) external;
    function activateCampaign(uint256 campaignId) external;
    function createNode(uint256 campaignId, uint256 parentNodeId, bytes32 metadataHash)
        external
        returns (uint256 nodeId);
    function purchase(uint256 campaignId, uint256 nodeId, bytes32 orderKey)
        external
        returns (uint256 saleId);
    function registerPolicyVersion(
        uint256 campaignId,
        CommissionPolicy calldata policy,
        uint64 effectiveAt
    ) external;
    function refundNativeSale(uint256 saleId) external;
    function finalizeSale(uint256 saleId) external;
    function claimRewards(address token) external returns (uint256 amount);
    function claimMerchantProceeds(uint256 campaignId) external returns (uint256 amount);
    function refundUnusedRewardBudget(uint256 campaignId) external returns (uint256 amount);
    function pauseCampaign(uint256 campaignId) external;
    function resumeCampaign(uint256 campaignId) external;
    function endCampaign(uint256 campaignId) external;
    function getCampaign(uint256 campaignId) external view returns (Campaign memory);
    function getCurrentPolicy(uint256 campaignId) external view returns (PolicyVersion memory);
    function getScheduledPolicy(uint256 campaignId) external view returns (PolicyVersion memory);
    function getPolicyVersion(uint256 campaignId, uint32 version)
        external
        view
        returns (PolicyVersion memory);
    function getRewardLedger(uint256 campaignId) external view returns (RewardLedger memory);
    function getPriceLedger(uint256 campaignId) external view returns (PriceLedger memory);
    function getNode(uint256 nodeId) external view returns (ReferralNode memory);
    function nodeOf(uint256 campaignId, address wallet) external view returns (uint256 nodeId);
    function getPath(uint256 nodeId) external view returns (address[] memory nearestFirst);
    function previewAllocation(uint256 campaignId, uint256 nodeId, uint256 saleAmount)
        external
        view
        returns (address[] memory recipients, uint256[] memory amounts, uint256 rewardTotal);
    function previewPurchase(uint256 campaignId, uint256 nodeId, address buyer)
        external
        view
        returns (
            uint256 price,
            uint256 rewardTotal,
            Allocation[] memory allocations,
            bytes32 policyHash,
            uint32 policyVersion,
            uint256 unallocated
        );
    function getSale(uint256 saleId)
        external
        view
        returns (Sale memory sale, Allocation[] memory allocations);
    function saleIdForOrder(uint256 campaignId, bytes32 orderKey)
        external
        view
        returns (uint256 saleId);
    function claimableOf(uint256 campaignId, address account)
        external
        view
        returns (uint256 reward, uint256 proceeds);
    function claimableRewards(address token, address account) external view returns (uint256 amount);
    function totalCampaigns() external view returns (uint256);
    function totalNodes() external view returns (uint256);
    function totalSales() external view returns (uint256);
}
