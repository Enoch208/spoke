// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SpokeFixture} from "./SpokeFixture.sol";
import {SpokeProtocol} from "../src/SpokeProtocol.sol";
import {ISpokeProtocol} from "../src/ISpokeProtocol.sol";

contract TransferQuirkToken is ERC20 {
    bool public chargeFee;
    bool public reenter;
    bool public reentryBlocked;
    address public vault;
    uint8 private precision;

    constructor(uint8 places) ERC20("Test asset", "TEST") {
        precision = places;
        _mint(msg.sender, 1000e6);
    }

    function decimals() public view override returns (uint8) {
        return precision;
    }

    function configure(address target, bool fee, bool callback) external {
        vault = target;
        chargeFee = fee;
        reenter = callback;
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (chargeFee && from != address(0) && to != address(0) && amount > 0) {
            super._update(from, address(0), 1);
            --amount;
        }
        super._update(from, to, amount);
        if (reenter && vault != address(0) && from == vault) {
            (bool success,) =
                vault.call(abi.encodeCall(ISpokeProtocol.claimRewards, (address(this))));
            reentryBlocked = !success;
        }
    }
}

contract SpokeSecurityTest is SpokeFixture {
    function test_noAllowanceCreatesNoSaleOrRewardLiability() public {
        vm.prank(buyer);
        token.approve(address(protocol), 0);
        vm.expectRevert();
        vm.prank(buyer);
        protocol.purchase(campaignId, leaf, bytes32(uint256(1)));
        assertEq(protocol.totalSales(), 0);
        _assertConservation();
    }

    function test_rewardAndProceedsClaimsCannotBeReplayed() public {
        uint256 id = _buy(buyer, leaf, bytes32(uint256(1)));
        vm.warp(block.timestamp + 60);
        protocol.finalizeSale(id);
        vm.prank(distributors[3]);
        protocol.claimRewards(address(token));
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.NothingToClaim.selector, distributors[3])
        );
        vm.prank(distributors[3]);
        protocol.claimRewards(address(token));
        vm.prank(merchant);
        protocol.claimMerchantProceeds(campaignId);
        vm.expectRevert(abi.encodeWithSelector(ISpokeProtocol.NothingToClaim.selector, merchant));
        vm.prank(merchant);
        protocol.claimMerchantProceeds(campaignId);
        vm.expectRevert(abi.encodeWithSelector(ISpokeProtocol.SaleAlreadyFinalized.selector, id));
        vm.prank(merchant);
        protocol.refundNativeSale(id);
        _assertConservation();
    }

    function test_buyerBeyondPaidWindowStillCannotReferThemself() public {
        vm.prank(distributors[4]);
        uint256 deepLeaf = protocol.createNode(campaignId, leaf, bytes32(0));
        _fundWallet(distributors[0]);
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.SelfReferral.selector, distributors[0])
        );
        vm.prank(distributors[0]);
        protocol.purchase(campaignId, deepLeaf, bytes32(uint256(1)));
    }

    function test_duplicateWalletNodeCannotAlterExistingParent() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                ISpokeProtocol.NodeAlreadyRegistered.selector, campaignId, distributors[3]
            )
        );
        vm.prank(distributors[3]);
        protocol.createNode(campaignId, 0, bytes32(0));
        assertEq(protocol.getNode(leaf).parentId, leaf - 1);
    }

    function test_unsupportedDecimalsAndMissingCodeCannotBeConfigured() public {
        TransferQuirkToken wrongDecimals = new TransferQuirkToken(18);
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.TokenNotAllowed.selector, address(wrongDecimals))
        );
        new SpokeProtocol(address(wrongDecimals));
        vm.expectRevert(abi.encodeWithSelector(ISpokeProtocol.TokenNotAllowed.selector, address(1)));
        new SpokeProtocol(address(1));
    }

    function test_feeOnTransferNeverInflatesTheRewardLedger() public {
        TransferQuirkToken asset = new TransferQuirkToken(6);
        SpokeProtocol vault = new SpokeProtocol(address(asset));
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        policy.rewardToken = address(asset);
        uint256 id = vault.createCampaign(
            bytes32(0), ISpokeProtocol.CampaignConfig(bytes32(0), 10_000), policy
        );
        asset.approve(address(vault), 1000);
        asset.configure(address(vault), true, false);
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.UnexpectedTransferAmount.selector, 1000, 999)
        );
        vault.fundCampaign(id, 1000);
        assertEq(vault.getRewardLedger(id).netDeposited, 0);
        assertEq(asset.balanceOf(address(vault)), 0);
    }

    function test_tokenCallbackCannotReenterAWithdrawal() public {
        TransferQuirkToken asset = new TransferQuirkToken(6);
        SpokeProtocol vault = new SpokeProtocol(address(asset));
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        policy.rewardToken = address(asset);
        uint256 id = vault.createCampaign(
            bytes32(0), ISpokeProtocol.CampaignConfig(bytes32(0), 10_000), policy
        );
        asset.approve(address(vault), 1000);
        vault.fundCampaign(id, 1000);
        vault.endCampaign(id);
        asset.configure(address(vault), false, true);
        vault.refundUnusedRewardBudget(id);
        assertTrue(asset.reentryBlocked());
        assertEq(vault.getRewardLedger(id).surplusWithdrawn, 1000);
        assertEq(asset.balanceOf(address(vault)), 0);
    }

    function test_liabilityCapIncludesAlreadyClaimedRewards() public {
        uint256 id = _buy(buyer, leaf, bytes32(uint256(1)));
        vm.warp(block.timestamp + 60);
        protocol.finalizeSale(id);
        for (uint256 i; i < 4; ++i) {
            vm.prank(distributors[i]);
            protocol.claimRewards(address(token));
        }
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        policy.perSaleCap = 1000;
        policy.campaignLiabilityCap = 1000;
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.LiabilityCapExceeded.selector, 1000, 0)
        );
        vm.prank(stranger);
        protocol.purchase(campaignId, leaf, bytes32(uint256(2)));
        _assertConservation();
    }
}
