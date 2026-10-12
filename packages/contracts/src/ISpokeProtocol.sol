// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISpokeProtocol {
    enum SaleStatus {
        None,
        Pending,
        Refunded,
        Finalized
    }

    enum CreditSource {
        Reward,
        SaleProceeds
    }

    struct CampaignConfig {
        address token;
        bytes32 skuHash;
        uint128 skuPrice;
        uint128 maxCommissionPerSale;
        uint16 commissionBps;
        uint64 startsAt;
        uint64 endsAt;
        uint32 settlementHoldSeconds;
    }

    struct Campaign {
        address merchant;
        address token;
        bytes32 skuHash;
        uint128 skuPrice;
        uint128 maxCommissionPerSale;
        uint16 commissionBps;
        uint64 startsAt;
        uint64 endsAt;
        uint32 settlementHoldSeconds;
        bool paused;
        bool ended;
        uint16 nodeCount;
        uint16 saleCount;
    }

    struct RewardLedger {
        uint256 deposited;
        uint256 available;
        uint256 reserved;
        uint256 claimable;
        uint256 claimed;
        uint256 withdrawn;
    }

    struct PriceLedger {
        uint256 received;
        uint256 pendingEscrow;
        uint256 merchantClaimable;
        uint256 merchantClaimed;
        uint256 refunded;
    }

    struct ReferralNode {
        uint64 campaignId;
        uint64 parentId;
        address creator;
        uint64 createdAt;
    }

    struct Allocation {
        address recipient;
        uint128 amount;
        uint8 depth;
    }

    struct Sale {
        uint64 campaignId;
        uint64 leafNodeId;
        address buyer;
        uint128 price;
        uint128 commission;
        uint64 purchasedAt;
        uint64 unlockAt;
        SaleStatus status;
    }

    event CampaignCreated(
        uint64 indexed campaignId,
        address indexed merchant,
        bytes32 skuHash,
        address token,
        uint128 price,
        uint16 commissionBps,
        uint128 maxCommissionPerSale,
        uint32 settlementHoldSeconds,
        uint64 startsAt,
        uint64 endsAt
    );
    event CampaignFunded(uint64 indexed campaignId, address indexed funder, uint256 receivedAmount);
    event ReferralNodeCreated(
        uint64 indexed campaignId,
        uint64 indexed nodeId,
        uint64 parentId,
        address indexed distributor
    );
    event CampaignPaused(uint64 indexed campaignId, bool paused);
    event CampaignEnded(uint64 indexed campaignId);
    event SalePurchased(
        uint64 indexed saleId,
        uint64 indexed campaignId,
        address indexed buyer,
        uint64 leafNodeId,
        uint128 price,
        uint128 commission,
        uint64 unlockAt,
        bytes32 checkoutKey
    );
    event RewardReserved(
        uint64 indexed saleId,
        uint64 indexed campaignId,
        address indexed recipient,
        uint128 amount,
        uint8 depth
    );
    event SaleRefunded(
        uint64 indexed saleId,
        uint64 indexed campaignId,
        address indexed buyer,
        uint128 price,
        uint128 releasedReward
    );
    event SaleFinalized(
        uint64 indexed saleId,
        uint64 indexed campaignId,
        uint128 merchantAmount,
        uint128 commissionAmount
    );
    event EarningsClaimed(
        uint64 indexed campaignId, address indexed recipient, uint256 amount, CreditSource source
    );
    event RewardWithdrawn(uint64 indexed campaignId, address indexed merchant, uint256 amount);

    error TokenNotAllowed(address token);
    error InvalidCommission(uint16 commissionBps);
    error InvalidSchedule(uint64 startsAt, uint64 endsAt);
    error InvalidPrice();
    error ZeroAmount();
    error UnknownCampaign(uint64 campaignId);
    error UnknownNode(uint64 nodeId);
    error UnknownSale(uint64 saleId);
    error NotMerchant(uint64 campaignId, address caller);
    error NotAuthorizedToRefund(uint64 saleId, address caller);
    error CampaignNotActive(uint64 campaignId);
    error CampaignIsPaused(uint64 campaignId);
    error CampaignIsEnded(uint64 campaignId);
    error CampaignCapacityReached(uint64 campaignId);
    error NodeAlreadyRegistered(uint64 campaignId, address wallet);
    error InvalidParent(uint64 campaignId, uint64 parentId);
    error InvalidReferralPath(uint64 leafNodeId);
    error SelfReferral(address wallet);
    error DuplicateCheckout(bytes32 checkoutKey);
    error BuyerAlreadyPurchased(uint64 campaignId, address buyer);
    error ZeroReward(uint64 campaignId);
    error InsufficientRewardEscrow(uint256 required, uint256 available);
    error UnexpectedTransferAmount(uint256 expected, uint256 received);
    error SaleNotMature(uint64 saleId, uint64 unlockAt);
    error SaleAlreadyFinalized(uint64 saleId);
    error SaleAlreadyRefunded(uint64 saleId);
    error RefundWindowClosed(uint64 saleId, uint64 unlockAt);
    error NothingToClaim(uint64 campaignId, address account);
    error AmountExceedsAvailable(uint256 requested, uint256 available);

    function paymentToken() external view returns (address);

    function createCampaign(CampaignConfig calldata config) external returns (uint64 campaignId);

    function fundCampaign(uint64 campaignId, uint256 amount) external;

    function createReferralNode(uint64 campaignId, uint64 parentId) external returns (uint64 nodeId);

    function checkout(uint64 campaignId, uint64 leafNodeId, bytes32 checkoutKey)
        external
        returns (uint64 saleId);

    function refundPendingSale(uint64 saleId) external;

    function finalizeSale(uint64 saleId) external;

    function claimCampaignEarnings(uint64 campaignId) external returns (uint256 amount);

    function withdrawAvailableReward(uint64 campaignId, uint256 amount) external;

    function pauseCampaign(uint64 campaignId, bool paused) external;

    function endCampaign(uint64 campaignId) external;

    function getCampaign(uint64 campaignId) external view returns (Campaign memory);

    function getRewardLedger(uint64 campaignId) external view returns (RewardLedger memory);

    function getPriceLedger(uint64 campaignId) external view returns (PriceLedger memory);

    function getNode(uint64 nodeId) external view returns (ReferralNode memory);

    function nodeOf(uint64 campaignId, address wallet) external view returns (uint64 nodeId);

    function getPath(uint64 nodeId) external view returns (address[] memory nearestFirst);

    function previewCheckout(uint64 campaignId, uint64 leafNodeId, address buyer)
        external
        view
        returns (uint128 price, uint128 commission, Allocation[] memory allocations);

    function getSale(uint64 saleId)
        external
        view
        returns (Sale memory sale, Allocation[] memory allocations);

    function saleIdForCheckout(uint64 campaignId, address buyer, bytes32 checkoutKey)
        external
        view
        returns (uint64 saleId);

    function claimableOf(uint64 campaignId, address account)
        external
        view
        returns (uint256 reward, uint256 proceeds);

    function totalCampaigns() external view returns (uint64);

    function totalNodes() external view returns (uint64);

    function totalSales() external view returns (uint64);
}
