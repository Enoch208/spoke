// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISpokeProtocol} from "./ISpokeProtocol.sol";
import {PolicyMath} from "./PolicyMath.sol";

contract SpokeProtocol is ISpokeProtocol, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable override paymentToken;
    uint256 public constant MAX_CAMPAIGNS = 128;
    uint256 public constant MAX_NODES = 256;
    uint256 public constant MAX_SALES = 100;
    uint256 public override totalCampaigns;
    uint256 public override totalNodes;
    uint256 public override totalSales;
    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => mapping(uint32 => PolicyVersion)) private versions;
    mapping(uint256 => uint32) private currentVersion;
    mapping(uint256 => uint32) private scheduledVersion;
    mapping(uint256 => RewardLedger) private rewards;
    mapping(uint256 => PriceLedger) private proceeds;
    mapping(uint256 => ReferralNode) private nodes;
    mapping(uint256 => mapping(address => uint256)) public override nodeOf;
    mapping(uint256 => Sale) private sales;
    mapping(uint256 => Allocation[]) private saleAllocations;
    mapping(uint256 => mapping(bytes32 => uint256)) public override saleIdForOrder;
    mapping(uint256 => mapping(address => uint256)) public override saleIdForBuyer;
    mapping(uint256 => mapping(address => uint256)) private claimable;
    mapping(address => uint256) private totalClaimable;
    mapping(address => uint256[]) private earningCampaigns;
    mapping(uint256 => mapping(address => bool)) private seenEarningCampaign;
    mapping(uint256 => mapping(address => uint256)) private earnedThrough;
    mapping(uint256 => mapping(address => uint256)) private claimedThrough;
    mapping(uint256 => mapping(address => uint256)) private allocationCheckpoint;

    constructor(address token) {
        if (token.code.length == 0 || IERC20Metadata(token).decimals() != 6) {
            revert TokenNotAllowed(token);
        }
        paymentToken = token;
    }

    function createCampaign(
        bytes32 metadataHash,
        CampaignConfig calldata config,
        CommissionPolicy calldata policy
    ) external override returns (uint256 campaignId) {
        if (totalCampaigns >= MAX_CAMPAIGNS) {
            revert CampaignCapacityReached(0);
        }
        if (config.skuPrice == 0) revert InvalidPrice();
        PolicyMath.validate(policy, paymentToken);
        if (policy.expiry <= block.timestamp || policy.expiry > block.timestamp + 365 days) {
            revert InvalidSchedule();
        }
        campaignId = ++totalCampaigns;
        campaigns[campaignId] = Campaign(
            msg.sender,
            paymentToken,
            metadataHash,
            config.skuHash,
            config.skuPrice,
            uint64(block.timestamp),
            policy.expiry,
            false,
            false,
            false,
            0,
            0
        );
        _storePolicy(campaignId, 1, policy, uint64(block.timestamp));
        currentVersion[campaignId] = 1;
        emit CampaignCreated(
            campaignId,
            msg.sender,
            metadataHash,
            config.skuHash,
            config.skuPrice,
            paymentToken,
            versions[campaignId][1].policyHash
        );
    }

    function fundCampaign(uint256 campaignId, uint256 amount) external override nonReentrant {
        Campaign storage campaign = _campaign(campaignId);
        if (campaign.ended || block.timestamp >= _policy(campaignId).policy.expiry) {
            revert CampaignIsEnded(campaignId);
        }
        if (amount == 0) revert ZeroAmount();
        _receive(msg.sender, amount);
        rewards[campaignId].netDeposited += amount;
        rewards[campaignId].available += amount;
        emit CampaignFunded(campaignId, msg.sender, amount);
    }

    function activateCampaign(uint256 campaignId) external override {
        Campaign storage campaign = _merchant(campaignId);
        if (campaign.active) revert CampaignActive(campaignId);
        if (campaign.ended || block.timestamp >= _policy(campaignId).policy.expiry) {
            revert CampaignIsEnded(campaignId);
        }
        if (rewards[campaignId].available == 0) revert CampaignNotFunded(campaignId);
        campaign.active = true;
        emit CampaignStatusChanged(campaignId, true, false, false);
    }

    function registerPolicyVersion(
        uint256 campaignId,
        CommissionPolicy calldata policy,
        uint64 effectiveAt
    ) external override {
        Campaign storage campaign = _merchant(campaignId);
        _syncPolicy(campaignId);
        if (scheduledVersion[campaignId] != 0) revert PolicyVersionPending(campaignId);
        if (campaign.ended || block.timestamp >= _policy(campaignId).policy.expiry) {
            revert CampaignIsEnded(campaignId);
        }
        if (policy.rewardToken != campaign.token) revert PolicyTokenImmutable();
        if (effectiveAt < block.timestamp + 1 days) {
            revert PolicyNoticeTooShort(uint64(block.timestamp + 1 days));
        }
        if (
            effectiveAt >= _policy(campaignId).policy.expiry || policy.expiry <= effectiveAt
                || policy.expiry > campaign.createdAt + 365 days
        ) revert InvalidSchedule();
        PolicyMath.validate(policy, paymentToken);
        uint32 next = currentVersion[campaignId] + 1;
        _storePolicy(campaignId, next, policy, effectiveAt);
        scheduledVersion[campaignId] = next;
    }

    function createNode(uint256 campaignId, uint256 parentNodeId, bytes32 metadataHash)
        external
        override
        returns (uint256 nodeId)
    {
        Campaign storage campaign = _live(campaignId);
        if (campaign.merchant == msg.sender) revert SelfReferral(msg.sender);
        if (nodeOf[campaignId][msg.sender] != 0) {
            revert NodeAlreadyRegistered(campaignId, msg.sender);
        }
        if (campaign.nodeCount >= MAX_NODES) revert CampaignCapacityReached(campaignId);
        if (parentNodeId != 0 && nodes[parentNodeId].campaignId != campaignId) {
            revert InvalidParent(campaignId, parentNodeId);
        }
        nodeId = ++totalNodes;
        nodes[nodeId] = ReferralNode(
            campaignId, parentNodeId, msg.sender, metadataHash, uint64(block.timestamp)
        );
        nodeOf[campaignId][msg.sender] = nodeId;
        ++campaign.nodeCount;
        emit NodeCreated(campaignId, nodeId, parentNodeId, msg.sender, metadataHash);
    }

    function purchase(uint256 campaignId, uint256 nodeId, bytes32 orderKey)
        external
        override
        nonReentrant
        returns (uint256 saleId)
    {
        Campaign storage campaign = _live(campaignId);
        _syncPolicy(campaignId);
        if (saleIdForOrder[campaignId][orderKey] != 0) revert OrderAlreadyUsed(orderKey);
        if (saleIdForBuyer[campaignId][msg.sender] != 0) {
            revert BuyerAlreadyPurchased(campaignId, msg.sender);
        }
        if (campaign.saleCount >= MAX_SALES) revert CampaignCapacityReached(campaignId);
        PolicyVersion storage terms = _policy(campaignId);
        (Allocation[] memory split, uint256 reserved,) =
            _allocation(campaignId, nodeId, campaign.skuPrice, msg.sender);
        _receive(msg.sender, campaign.skuPrice);
        saleId = ++totalSales;
        uint64 unlockAt = uint64(block.timestamp + terms.policy.holdSeconds);
        sales[saleId] = Sale(
            campaignId,
            nodeId,
            msg.sender,
            orderKey,
            terms.policyHash,
            terms.version,
            campaign.skuPrice,
            reserved,
            uint64(block.timestamp),
            unlockAt,
            SaleStatus.Pending,
            SaleSource.NativeOnchain
        );
        saleIdForOrder[campaignId][orderKey] = saleId;
        saleIdForBuyer[campaignId][msg.sender] = saleId;
        ++campaign.saleCount;
        rewards[campaignId].available -= reserved;
        rewards[campaignId].pendingReserved += reserved;
        proceeds[campaignId].received += campaign.skuPrice;
        proceeds[campaignId].proceedsPending += campaign.skuPrice;
        emit NativePurchaseAccepted(
            saleId,
            campaignId,
            msg.sender,
            nodeId,
            orderKey,
            terms.policyHash,
            terms.version,
            campaign.skuPrice,
            reserved,
            unlockAt
        );
        for (uint256 i; i < split.length; ++i) {
            saleAllocations[saleId].push(split[i]);
            emit RewardReserved(
                saleId,
                campaignId,
                split[i].recipient,
                split[i].amount,
                split[i].depth,
                split[i].effectiveWeightBps
            );
        }
    }

    function refundNativeSale(uint256 saleId) external override nonReentrant {
        Sale storage sale = _sale(saleId);
        if (_campaign(sale.campaignId).merchant != msg.sender) {
            revert NotAuthorizedToRefund(saleId, msg.sender);
        }
        _pending(saleId, sale);
        if (block.timestamp >= sale.unlockAt) revert RefundWindowClosed(saleId, sale.unlockAt);
        sale.status = SaleStatus.Refunded;
        rewards[sale.campaignId].pendingReserved -= sale.rewardReserved;
        rewards[sale.campaignId].available += sale.rewardReserved;
        proceeds[sale.campaignId].proceedsPending -= sale.price;
        proceeds[sale.campaignId].buyerRefunded += sale.price;
        IERC20(paymentToken).safeTransfer(sale.buyer, sale.price);
        emit SaleRefunded(saleId, sale.campaignId, sale.price, sale.rewardReserved);
    }

    function finalizeSale(uint256 saleId) external override {
        Sale storage sale = _sale(saleId);
        _pending(saleId, sale);
        if (block.timestamp < sale.unlockAt) revert SaleNotMature(saleId, sale.unlockAt);
        sale.status = SaleStatus.Finalized;
        rewards[sale.campaignId].pendingReserved -= sale.rewardReserved;
        rewards[sale.campaignId].vestedUnclaimed += sale.rewardReserved;
        proceeds[sale.campaignId].proceedsPending -= sale.price;
        proceeds[sale.campaignId].proceedsClaimable += sale.price;
        Allocation[] storage split = saleAllocations[saleId];
        for (uint256 i; i < split.length; ++i) {
            address recipient = split[i].recipient;
            claimable[sale.campaignId][recipient] += split[i].amount;
            totalClaimable[recipient] += split[i].amount;
            earnedThrough[sale.campaignId][recipient] += split[i].amount;
            allocationCheckpoint[saleId][recipient] = earnedThrough[sale.campaignId][recipient];
            if (!seenEarningCampaign[sale.campaignId][recipient]) {
                seenEarningCampaign[sale.campaignId][recipient] = true;
                earningCampaigns[recipient].push(sale.campaignId);
            }
            emit RewardVested(saleId, recipient, split[i].amount);
        }
        emit SaleFinalized(saleId, sale.campaignId, sale.price, sale.rewardReserved);
    }

    function claimRewards(address token) external override nonReentrant returns (uint256 amount) {
        if (token != paymentToken) revert TokenNotAllowed(token);
        amount = totalClaimable[msg.sender];
        if (amount == 0) revert NothingToClaim(msg.sender);
        totalClaimable[msg.sender] = 0;
        uint256[] storage ids = earningCampaigns[msg.sender];
        for (uint256 i; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 part = claimable[id][msg.sender];
            if (part == 0) continue;
            claimable[id][msg.sender] = 0;
            claimedThrough[id][msg.sender] = earnedThrough[id][msg.sender];
            rewards[id].vestedUnclaimed -= part;
            rewards[id].rewardsClaimed += part;
            emit RewardClaimed(id, msg.sender, token, part);
        }
        IERC20(paymentToken).safeTransfer(msg.sender, amount);
    }

    function claimMerchantProceeds(uint256 campaignId)
        external
        override
        nonReentrant
        returns (uint256 amount)
    {
        _merchant(campaignId);
        amount = proceeds[campaignId].proceedsClaimable;
        if (amount == 0) revert NothingToClaim(msg.sender);
        proceeds[campaignId].proceedsClaimable = 0;
        proceeds[campaignId].proceedsClaimed += amount;
        IERC20(paymentToken).safeTransfer(msg.sender, amount);
        emit MerchantProceedsClaimed(campaignId, msg.sender, amount);
    }

    function refundUnusedRewardBudget(uint256 campaignId)
        external
        override
        nonReentrant
        returns (uint256 amount)
    {
        Campaign storage campaign = _merchant(campaignId);
        if (
            campaign.active && !campaign.paused && !campaign.ended
                && block.timestamp < _policy(campaignId).policy.expiry
        ) revert CampaignActive(campaignId);
        if (
            !campaign.paused && !campaign.ended
                && block.timestamp < _policy(campaignId).policy.expiry
        ) revert CampaignNotActive(campaignId);
        amount = rewards[campaignId].available;
        if (amount == 0) revert NothingToClaim(msg.sender);
        rewards[campaignId].available = 0;
        rewards[campaignId].surplusWithdrawn += amount;
        IERC20(paymentToken).safeTransfer(msg.sender, amount);
        emit SurplusReturned(campaignId, msg.sender, amount);
    }

    function pauseCampaign(uint256 campaignId) external override {
        Campaign storage campaign = _merchant(campaignId);
        _live(campaignId);
        campaign.paused = true;
        emit CampaignStatusChanged(campaignId, true, true, false);
    }

    function resumeCampaign(uint256 campaignId) external override {
        Campaign storage campaign = _merchant(campaignId);
        if (!campaign.active) revert CampaignNotActive(campaignId);
        if (campaign.ended || block.timestamp >= _policy(campaignId).policy.expiry) {
            revert CampaignIsEnded(campaignId);
        }
        campaign.paused = false;
        emit CampaignStatusChanged(campaignId, true, false, false);
    }

    function endCampaign(uint256 campaignId) external override {
        Campaign storage campaign = _merchant(campaignId);
        if (campaign.ended) revert CampaignIsEnded(campaignId);
        campaign.active = false;
        campaign.ended = true;
        emit CampaignStatusChanged(campaignId, false, campaign.paused, true);
    }

    function getCampaign(uint256 campaignId)
        external
        view
        override
        returns (Campaign memory campaign)
    {
        campaign = _campaign(campaignId);
        campaign.endsAt = _policy(campaignId).policy.expiry;
    }

    function getCurrentPolicy(uint256 campaignId)
        external
        view
        override
        returns (PolicyVersion memory)
    {
        _campaign(campaignId);
        return _policy(campaignId);
    }

    function getScheduledPolicy(uint256 campaignId)
        external
        view
        override
        returns (PolicyVersion memory)
    {
        _campaign(campaignId);
        uint32 next = scheduledVersion[campaignId];
        if (next == 0 || versions[campaignId][next].effectiveAt <= block.timestamp) {
            return versions[0][0];
        }
        return versions[campaignId][next];
    }

    function getPolicyVersion(uint256 campaignId, uint32 version)
        external
        view
        override
        returns (PolicyVersion memory)
    {
        _campaign(campaignId);
        if (versions[campaignId][version].version == 0) revert InvalidPolicy();
        return versions[campaignId][version];
    }

    function getRewardLedger(uint256 campaignId)
        external
        view
        override
        returns (RewardLedger memory)
    {
        _campaign(campaignId);
        return rewards[campaignId];
    }

    function getPriceLedger(uint256 campaignId)
        external
        view
        override
        returns (PriceLedger memory)
    {
        _campaign(campaignId);
        return proceeds[campaignId];
    }

    function getNode(uint256 nodeId) external view override returns (ReferralNode memory) {
        if (nodes[nodeId].creator == address(0)) revert UnknownNode(nodeId);
        return nodes[nodeId];
    }

    function getSale(uint256 saleId)
        external
        view
        override
        returns (Sale memory sale, Allocation[] memory split)
    {
        sale = _sale(saleId);
        split = saleAllocations[saleId];
    }

    function claimableOf(uint256 campaignId, address account)
        external
        view
        override
        returns (uint256 reward, uint256 price)
    {
        Campaign storage campaign = _campaign(campaignId);
        return (
            claimable[campaignId][account],
            account == campaign.merchant ? proceeds[campaignId].proceedsClaimable : 0
        );
    }

    function claimableRewards(address token, address account)
        external
        view
        override
        returns (uint256)
    {
        if (token != paymentToken) revert TokenNotAllowed(token);
        return totalClaimable[account];
    }

    function allocationClaimed(uint256 saleId, address recipient)
        external
        view
        override
        returns (bool)
    {
        Sale storage sale = _sale(saleId);
        return sale.status == SaleStatus.Finalized && allocationCheckpoint[saleId][recipient] != 0
            && claimedThrough[sale.campaignId][recipient] >= allocationCheckpoint[saleId][recipient];
    }

    function getPath(uint256 nodeId)
        external
        view
        override
        returns (address[] memory nearestFirst)
    {
        if (nodeId != 0 && nodes[nodeId].creator == address(0)) revert UnknownNode(nodeId);
        address[] memory buffer = new address[](MAX_NODES);
        uint256 count;
        while (nodeId != 0 && count < MAX_NODES) {
            buffer[count++] = nodes[nodeId].creator;
            nodeId = nodes[nodeId].parentId;
        }
        nearestFirst = new address[](count);
        for (uint256 i; i < count; ++i) {
            nearestFirst[i] = buffer[i];
        }
    }

    function previewAllocation(uint256 campaignId, uint256 nodeId, uint256 saleAmount)
        external
        view
        override
        returns (address[] memory recipients, uint256[] memory amounts, uint256 rewardTotal)
    {
        _campaign(campaignId);
        (Allocation[] memory split, uint256 reserved,) =
            _allocation(campaignId, nodeId, saleAmount, address(0));
        recipients = new address[](split.length);
        amounts = new uint256[](split.length);
        for (uint256 i; i < split.length; ++i) {
            recipients[i] = split[i].recipient;
            amounts[i] = split[i].amount;
        }
        return (recipients, amounts, reserved);
    }

    function previewPurchase(uint256 campaignId, uint256 nodeId, address buyer)
        external
        view
        override
        returns (
            uint256 price,
            uint256 rewardTotal,
            Allocation[] memory split,
            bytes32 policyHash,
            uint32 policyVersion,
            uint256 unallocated
        )
    {
        Campaign storage campaign = _live(campaignId);
        if (saleIdForBuyer[campaignId][buyer] != 0) {
            revert BuyerAlreadyPurchased(campaignId, buyer);
        }
        if (campaign.saleCount >= MAX_SALES) revert CampaignCapacityReached(campaignId);
        PolicyVersion storage terms = _policy(campaignId);
        (split, rewardTotal, unallocated) =
            _allocation(campaignId, nodeId, campaign.skuPrice, buyer);
        return (campaign.skuPrice, rewardTotal, split, terms.policyHash, terms.version, unallocated);
    }

    function _allocation(uint256 campaignId, uint256 nodeId, uint256 price, address buyer)
        private
        view
        returns (Allocation[] memory split, uint256 reserved, uint256 unallocated)
    {
        CommissionPolicy memory policy = _policy(campaignId).policy;
        uint256 fullReward = PolicyMath.reward(price, policy);
        if (nodeId == 0) return (new Allocation[](0), 0, fullReward);
        address[] memory recipients =
            _recipients(campaignId, nodeId, buyer, policy.maxRewardedAncestors);
        (uint256[] memory amounts, uint16[] memory weights, uint256 total) =
            PolicyMath.split(fullReward, policy, recipients.length);
        reserved = total;
        unallocated = fullReward - reserved;
        if (reserved == 0) revert ZeroReward(campaignId);
        _checkBudget(campaignId, reserved, policy.campaignLiabilityCap);
        split = new Allocation[](recipients.length);
        for (uint256 i; i < recipients.length; ++i) {
            split[i] = Allocation(recipients[i], amounts[i], uint8(i), weights[i]);
        }
    }

    function _checkBudget(uint256 campaignId, uint256 reserved, uint256 cap) private view {
        RewardLedger storage ledger = rewards[campaignId];
        if (reserved > ledger.available) {
            revert InsufficientRewardEscrow(reserved, ledger.available);
        }
        uint256 used = ledger.pendingReserved + ledger.vestedUnclaimed + ledger.rewardsClaimed;
        if (used > cap || reserved > cap - used) {
            revert LiabilityCapExceeded(reserved, used > cap ? 0 : cap - used);
        }
    }

    function _recipients(uint256 campaignId, uint256 nodeId, address buyer, uint256 maximum)
        private
        view
        returns (address[] memory recipients)
    {
        if (nodes[nodeId].campaignId != campaignId) revert InvalidReferralPath(nodeId);
        address merchant = campaigns[campaignId].merchant;
        if (buyer != address(0) && buyer == merchant) revert SelfReferral(buyer);
        address[] memory buffer = new address[](maximum);
        uint256 count;
        for (uint256 walked; nodeId != 0 && walked < MAX_NODES; ++walked) {
            address recipient = nodes[nodeId].creator;
            if (buyer != address(0) && recipient == buyer) revert SelfReferral(buyer);
            bool repeated;
            for (uint256 i; i < count; ++i) {
                if (buffer[i] == recipient) repeated = true;
            }
            if (!repeated && count < maximum && recipient != merchant) buffer[count++] = recipient;
            nodeId = nodes[nodeId].parentId;
        }
        if (nodeId != 0) revert InvalidReferralPath(nodeId);
        recipients = new address[](count);
        for (uint256 i; i < count; ++i) {
            recipients[i] = buffer[i];
        }
    }

    function _campaign(uint256 id) private view returns (Campaign storage campaign) {
        campaign = campaigns[id];
        if (campaign.merchant == address(0)) revert UnknownCampaign(id);
    }

    function _merchant(uint256 id) private view returns (Campaign storage campaign) {
        campaign = _campaign(id);
        if (campaign.merchant != msg.sender) revert NotMerchant(id, msg.sender);
    }

    function _live(uint256 id) private view returns (Campaign storage campaign) {
        campaign = _campaign(id);
        if (campaign.ended || block.timestamp >= _policy(id).policy.expiry) {
            revert CampaignIsEnded(id);
        }
        if (!campaign.active) revert CampaignNotActive(id);
        if (campaign.paused) revert CampaignIsPaused(id);
    }

    function _sale(uint256 id) private view returns (Sale storage sale) {
        sale = sales[id];
        if (sale.status == SaleStatus.None) revert UnknownSale(id);
    }

    function _pending(uint256 id, Sale storage sale) private view {
        if (sale.status == SaleStatus.Refunded) revert SaleAlreadyRefunded(id);
        if (sale.status == SaleStatus.Finalized) revert SaleAlreadyFinalized(id);
    }

    function _policy(uint256 id) private view returns (PolicyVersion storage) {
        uint32 next = scheduledVersion[id];
        return versions[
            id
        ][
            next != 0 && versions[id][next].effectiveAt <= block.timestamp
                ? next
                : currentVersion[id]
        ];
    }

    function _syncPolicy(uint256 id) private {
        uint32 next = scheduledVersion[id];
        if (next != 0 && versions[id][next].effectiveAt <= block.timestamp) {
            currentVersion[id] = next;
            scheduledVersion[id] = 0;
            campaigns[id].endsAt = versions[id][next].policy.expiry;
        }
    }

    function _storePolicy(
        uint256 id,
        uint32 version,
        CommissionPolicy calldata policy,
        uint64 effectiveAt
    ) private {
        bytes32 policyHash = keccak256(abi.encode(policy));
        versions[id][version] = PolicyVersion(policy, policyHash, version, effectiveAt);
        emit PolicyVersionRegistered(id, version, policyHash, effectiveAt, policy);
    }

    function _receive(address from, uint256 amount) private {
        uint256 beforeBalance = IERC20(paymentToken).balanceOf(address(this));
        IERC20(paymentToken).safeTransferFrom(from, address(this), amount);
        uint256 received = IERC20(paymentToken).balanceOf(address(this)) - beforeBalance;
        if (received != amount) revert UnexpectedTransferAmount(amount, received);
    }
}
