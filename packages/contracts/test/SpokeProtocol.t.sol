// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SpokeFixture} from "./SpokeFixture.sol";
import {ISpokeProtocol} from "../src/ISpokeProtocol.sol";
import {PolicyMath} from "../src/PolicyMath.sol";

contract SpokeProtocolTest is SpokeFixture {
    function test_nativePurchaseSnapshotsFourLevelsAndPolicy() public {
        uint256 saleId = _buy(buyer, leaf, keccak256("order"));
        (ISpokeProtocol.Sale memory sale, ISpokeProtocol.Allocation[] memory split) =
            protocol.getSale(saleId);
        assertEq(sale.price, 10_000);
        assertEq(sale.rewardReserved, 1000);
        assertEq(sale.policyHash, keccak256(abi.encode(_policy())));
        assertEq(sale.policyVersion, 1);
        assertEq(split.length, 4);
        assertEq(split[0].recipient, distributors[3]);
        assertEq(split[0].amount, 500);
        assertEq(split[1].amount, 250);
        assertEq(split[2].amount, 150);
        assertEq(split[3].amount, 100);
        assertEq(protocol.saleIdForOrder(campaignId, keccak256("order")), saleId);
        _assertConservation();
    }

    function test_refundRestoresRewardsAndBuyerPayment() public {
        uint256 beforeBalance = token.balanceOf(buyer);
        uint256 saleId = _buy(buyer, leaf, bytes32(uint256(1)));
        vm.prank(merchant);
        protocol.refundNativeSale(saleId);
        assertEq(token.balanceOf(buyer), beforeBalance);
        assertEq(protocol.getRewardLedger(campaignId).available, 100_000);
        vm.warp(block.timestamp + 60);
        vm.expectRevert(abi.encodeWithSelector(ISpokeProtocol.SaleAlreadyRefunded.selector, saleId));
        protocol.finalizeSale(saleId);
        _assertConservation();
    }

    function test_onlyMerchantCanRefundBeforeTheBoundary() public {
        uint256 saleId = _buy(buyer, leaf, bytes32(uint256(1)));
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.NotAuthorizedToRefund.selector, saleId, buyer)
        );
        vm.prank(buyer);
        protocol.refundNativeSale(saleId);
        vm.warp(block.timestamp + 60);
        vm.expectRevert(
            abi.encodeWithSelector(
                ISpokeProtocol.RefundWindowClosed.selector, saleId, uint64(block.timestamp)
            )
        );
        vm.prank(merchant);
        protocol.refundNativeSale(saleId);
    }

    function test_finalizeThenClaimConservesSeparateVaults() public {
        uint256 saleId = _buy(buyer, leaf, bytes32(uint256(1)));
        vm.expectRevert(
            abi.encodeWithSelector(
                ISpokeProtocol.SaleNotMature.selector, saleId, uint64(block.timestamp + 60)
            )
        );
        protocol.finalizeSale(saleId);
        vm.warp(block.timestamp + 60);
        protocol.finalizeSale(saleId);
        assertEq(token.balanceOf(merchant), 1000e6 - 100_000);
        assertEq(protocol.claimableRewards(address(token), distributors[3]), 500);
        assertFalse(protocol.allocationClaimed(saleId, distributors[3]));
        for (uint256 i; i < 4; ++i) {
            vm.prank(distributors[i]);
            protocol.claimRewards(address(token));
        }
        assertTrue(protocol.allocationClaimed(saleId, distributors[3]));
        vm.prank(merchant);
        assertEq(protocol.claimMerchantProceeds(campaignId), 10_000);
        assertEq(protocol.getRewardLedger(campaignId).rewardsClaimed, 1000);
        _assertConservation();
    }

    function test_directPurchasesRemainAvailableWithNoBudget() public {
        vm.startPrank(merchant);
        protocol.pauseCampaign(campaignId);
        protocol.refundUnusedRewardBudget(campaignId);
        protocol.resumeCampaign(campaignId);
        vm.stopPrank();
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.InsufficientRewardEscrow.selector, 1000, 0)
        );
        vm.prank(buyer);
        protocol.purchase(campaignId, leaf, bytes32(uint256(1)));
        uint256 saleId = _buy(buyer, 0, bytes32(uint256(1)));
        (ISpokeProtocol.Sale memory sale, ISpokeProtocol.Allocation[] memory split) =
            protocol.getSale(saleId);
        assertEq(sale.rewardReserved, 0);
        assertEq(split.length, 0);
        _assertConservation();
    }

    function test_selfReferralCanOnlyBecomeAnExplicitDirectPurchase() public {
        _fundWallet(distributors[0]);
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.SelfReferral.selector, distributors[0])
        );
        vm.prank(distributors[0]);
        protocol.purchase(campaignId, leaf, bytes32(uint256(1)));
        _buy(distributors[0], 0, bytes32(uint256(1)));
        _assertConservation();
    }

    function test_duplicateOrderAndBuyerCannotCreateAnotherLiability() public {
        _buy(buyer, leaf, bytes32(uint256(1)));
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.OrderAlreadyUsed.selector, bytes32(uint256(1)))
        );
        vm.prank(stranger);
        protocol.purchase(campaignId, leaf, bytes32(uint256(1)));
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.BuyerAlreadyPurchased.selector, campaignId, buyer)
        );
        vm.prank(buyer);
        protocol.purchase(campaignId, 0, bytes32(uint256(2)));
        _assertConservation();
    }

    function test_unusedWithdrawalRequiresPausedEndedOrExpired() public {
        vm.expectRevert(abi.encodeWithSelector(ISpokeProtocol.CampaignActive.selector, campaignId));
        vm.prank(merchant);
        protocol.refundUnusedRewardBudget(campaignId);
        _buy(buyer, leaf, bytes32(uint256(1)));
        vm.prank(merchant);
        protocol.endCampaign(campaignId);
        vm.prank(merchant);
        assertEq(protocol.refundUnusedRewardBudget(campaignId), 99_000);
        assertEq(protocol.getRewardLedger(campaignId).pendingReserved, 1000);
        _assertConservation();
    }

    function test_expiredWithdrawalLeavesPendingSalesFinalizable() public {
        uint256 saleId = _buy(buyer, leaf, bytes32(uint256(1)));
        vm.warp(block.timestamp + 30 days);
        vm.prank(merchant);
        protocol.refundUnusedRewardBudget(campaignId);
        protocol.finalizeSale(saleId);
        _assertConservation();
    }

    function test_policyVersionRequiresNoticeAndOnlyOneUpcoming() public {
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        vm.expectRevert(
            abi.encodeWithSelector(
                ISpokeProtocol.PolicyNoticeTooShort.selector, uint64(block.timestamp + 1 days)
            )
        );
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 1 days - 1));
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 1 days));
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.PolicyVersionPending.selector, campaignId)
        );
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 2 days));
        assertEq(protocol.getCurrentPolicy(campaignId).version, 1);
        assertEq(protocol.getScheduledPolicy(campaignId).version, 2);
    }

    function test_futurePolicyNeverChangesAnAcceptedSale() public {
        uint256 first = _buy(buyer, leaf, bytes32(uint256(1)));
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        policy.commissionBps = 2000;
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 1 days);
        uint256 second = _buy(stranger, leaf, bytes32(uint256(2)));
        (ISpokeProtocol.Sale memory oldSale,) = protocol.getSale(first);
        (ISpokeProtocol.Sale memory newSale,) = protocol.getSale(second);
        assertEq(oldSale.policyVersion, 1);
        assertEq(oldSale.rewardReserved, 1000);
        assertEq(newSale.policyVersion, 2);
        assertEq(newSale.rewardReserved, 2000);
        assertEq(protocol.getScheduledPolicy(campaignId).version, 0);
        policy.commissionBps = 3000;
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 1 days));
        assertEq(protocol.getScheduledPolicy(campaignId).version, 3);
        _assertConservation();
    }

    function test_policyRewardTokenCannotChange() public {
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        policy.rewardToken = address(1);
        vm.expectRevert(ISpokeProtocol.PolicyTokenImmutable.selector);
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 1 days));
    }

    function test_pauseNeverBlocksRefundFinalizeOrClaim() public {
        uint256 saleId = _buy(buyer, leaf, bytes32(uint256(1)));
        vm.prank(merchant);
        protocol.pauseCampaign(campaignId);
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.CampaignIsPaused.selector, campaignId)
        );
        vm.prank(stranger);
        protocol.purchase(campaignId, 0, bytes32(uint256(2)));
        vm.warp(block.timestamp + 60);
        protocol.finalizeSale(saleId);
        vm.prank(distributors[3]);
        protocol.claimRewards(address(token));
        _assertConservation();
    }

    function test_crossCampaignParentsAndLeavesAreRejected() public {
        vm.prank(stranger);
        uint256 other = protocol.createCampaign(
            bytes32(0), ISpokeProtocol.CampaignConfig(bytes32(0), 1), _policy()
        );
        vm.startPrank(stranger);
        protocol.fundCampaign(other, 10);
        protocol.activateCampaign(other);
        vm.stopPrank();
        vm.expectRevert(abi.encodeWithSelector(ISpokeProtocol.InvalidParent.selector, other, leaf));
        vm.prank(distributors[4]);
        protocol.createNode(other, leaf, bytes32(0));
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.InvalidReferralPath.selector, uint256(999))
        );
        vm.prank(buyer);
        protocol.purchase(campaignId, 999, bytes32(uint256(1)));
    }

    function test_twoPayeeRenormalizationAndReturnedInventory() public {
        (, uint256[] memory amounts, uint256 total) =
            protocol.previewAllocation(campaignId, 2, 10_000);
        assertEq(amounts[0], 667);
        assertEq(amounts[1], 333);
        assertEq(total, 1000);
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        policy.shortPathMode = ISpokeProtocol.ShortPathMode.ReturnUnused;
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 1 days);
        (, amounts, total) = protocol.previewAllocation(campaignId, 2, 10_000);
        assertEq(amounts[0], 500);
        assertEq(amounts[1], 250);
        assertEq(total, 750);
    }

    function test_lastBudgetUnitCannotBeReservedTwice() public {
        vm.startPrank(merchant);
        protocol.pauseCampaign(campaignId);
        protocol.refundUnusedRewardBudget(campaignId);
        protocol.fundCampaign(campaignId, 1000);
        protocol.resumeCampaign(campaignId);
        vm.stopPrank();
        _buy(buyer, leaf, bytes32(uint256(1)));
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.InsufficientRewardEscrow.selector, 1000, 0)
        );
        vm.prank(stranger);
        protocol.purchase(campaignId, leaf, bytes32(uint256(2)));
        _assertConservation();
    }

    function testFuzz_rewardMathAndRounding(
        uint128 price,
        uint16 rate,
        uint128 cap,
        uint8 path,
        bool returnUnused
    ) public view {
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        policy.commissionBps = uint16(bound(rate, 1, 10_000));
        policy.perSaleCap = cap;
        policy.shortPathMode = returnUnused
            ? ISpokeProtocol.ShortPathMode.ReturnUnused
            : ISpokeProtocol.ShortPathMode.Renormalize;
        uint256 count = bound(path, 0, 4);
        uint256 full = PolicyMath.reward(price, policy);
        (uint256[] memory amounts,, uint256 reserved) = PolicyMath.split(full, policy, count);
        uint256 sum;
        for (uint256 i; i < amounts.length; ++i) {
            sum += amounts[i];
        }
        assertEq(sum, reserved);
        assertLe(reserved, full);
        assertLe(full, cap);
        if (count != 0 && !returnUnused) assertEq(reserved, full);
    }

    function testFuzz_refundOrFinalizeKeepsBothLedgers(uint256 delay, bool refund) public {
        delay = bound(delay, 0, 90 days);
        uint256 saleId = _buy(buyer, leaf, bytes32(uint256(1)));
        vm.warp(block.timestamp + delay);
        if (refund && delay < 60) {
            vm.prank(merchant);
            protocol.refundNativeSale(saleId);
        } else if (delay >= 60) {
            protocol.finalizeSale(saleId);
        }
        _assertConservation();
    }
}
