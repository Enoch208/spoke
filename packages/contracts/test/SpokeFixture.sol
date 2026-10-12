// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SpokeDemoUSD} from "../src/SpokeDemoUSD.sol";
import {SpokeProtocol} from "../src/SpokeProtocol.sol";
import {ISpokeProtocol} from "../src/ISpokeProtocol.sol";

abstract contract SpokeFixture is Test {
    SpokeDemoUSD internal token;
    SpokeProtocol internal protocol;
    address internal merchant = makeAddr("merchant");
    address internal buyer = makeAddr("buyer");
    address internal stranger = makeAddr("stranger");
    address[5] internal distributors;
    uint256 internal campaignId;
    uint256 internal leaf;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        token = new SpokeDemoUSD();
        protocol = new SpokeProtocol(address(token));
        _fundWallet(merchant);
        _fundWallet(buyer);
        _fundWallet(stranger);
        for (uint256 i; i < 5; ++i) {
            distributors[i] = makeAddr(string.concat("distributor", vm.toString(i)));
        }
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        vm.prank(merchant);
        campaignId = protocol.createCampaign(
            keccak256("metadata"), ISpokeProtocol.CampaignConfig(keccak256("sku"), 10_000), policy
        );
        vm.startPrank(merchant);
        protocol.fundCampaign(campaignId, 100_000);
        protocol.activateCampaign(campaignId);
        vm.stopPrank();
        for (uint256 i; i < 4; ++i) {
            vm.prank(distributors[i]);
            leaf = protocol.createNode(campaignId, leaf, keccak256(abi.encode(i)));
        }
    }

    function _policy() internal view returns (ISpokeProtocol.CommissionPolicy memory policy) {
        uint16[] memory weights = new uint16[](4);
        weights[0] = 5000;
        weights[1] = 2500;
        weights[2] = 1500;
        weights[3] = 1000;
        policy = ISpokeProtocol.CommissionPolicy(
            address(token),
            1000,
            4,
            weights,
            1_000_000,
            100_000_000,
            60,
            uint64(block.timestamp + 30 days),
            ISpokeProtocol.ShortPathMode.Renormalize,
            bytes32(0)
        );
    }

    function _fundWallet(address account) internal {
        vm.startPrank(account);
        token.faucet(1000e6);
        token.approve(address(protocol), type(uint256).max);
        vm.stopPrank();
    }

    function _buy(address account, uint256 node, bytes32 key) internal returns (uint256 saleId) {
        vm.prank(account);
        saleId = protocol.purchase(campaignId, node, key);
    }

    function _assertConservation() internal view {
        ISpokeProtocol.RewardLedger memory reward = protocol.getRewardLedger(campaignId);
        ISpokeProtocol.PriceLedger memory price = protocol.getPriceLedger(campaignId);
        assertEq(
            reward.netDeposited,
            reward.available + reward.pendingReserved + reward.vestedUnclaimed
                + reward.rewardsClaimed + reward.surplusWithdrawn
        );
        assertEq(
            price.received,
            price.proceedsPending + price.proceedsClaimable + price.proceedsClaimed
                + price.buyerRefunded
        );
        assertEq(
            token.balanceOf(address(protocol)),
            reward.available + reward.pendingReserved + reward.vestedUnclaimed
                + price.proceedsPending + price.proceedsClaimable
        );
    }
}
