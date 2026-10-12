// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {SpokeFixture} from "./SpokeFixture.sol";
import {SpokeProtocol} from "../src/SpokeProtocol.sol";
import {SpokeDemoUSD} from "../src/SpokeDemoUSD.sol";
import {ISpokeProtocol} from "../src/ISpokeProtocol.sol";

contract SettlementHandler is Test {
    SpokeProtocol private protocol;
    SpokeDemoUSD private token;
    address private merchant;
    address[5] private distributors;
    uint256 private campaignId;
    uint256 private leaf;
    uint160 private buyerNonce = 0x1000;

    constructor(
        SpokeProtocol instance,
        SpokeDemoUSD asset,
        address owner,
        address[5] memory recipients,
        uint256 campaign,
        uint256 node
    ) {
        protocol = instance;
        token = asset;
        merchant = owner;
        distributors = recipients;
        campaignId = campaign;
        leaf = node;
    }

    function buy(bool direct) external {
        address buyer = address(++buyerNonce);
        vm.startPrank(buyer);
        token.faucet(10_000);
        token.approve(address(protocol), 10_000);
        protocol.purchase(campaignId, direct ? 0 : leaf, bytes32(uint256(buyerNonce)));
        vm.stopPrank();
    }

    function refund(uint256 seed) external {
        uint256 id = bound(seed, 1, protocol.totalSales() + 1);
        vm.prank(merchant);
        protocol.refundNativeSale(id);
    }

    function finalize(uint256 seed) external {
        protocol.finalizeSale(bound(seed, 1, protocol.totalSales() + 1));
    }

    function advance(uint256 secondsForward) external {
        vm.warp(block.timestamp + bound(secondsForward, 0, 1 days));
    }

    function claim(uint256 seed) external {
        vm.prank(distributors[bound(seed, 0, 3)]);
        protocol.claimRewards(address(token));
    }

    function claimProceeds() external {
        vm.prank(merchant);
        protocol.claimMerchantProceeds(campaignId);
    }

    function pause() external {
        vm.prank(merchant);
        protocol.pauseCampaign(campaignId);
    }

    function resume() external {
        vm.prank(merchant);
        protocol.resumeCampaign(campaignId);
    }

    function withdraw() external {
        vm.prank(merchant);
        protocol.refundUnusedRewardBudget(campaignId);
    }

    function fund(uint256 amount) external {
        amount = bound(amount, 1, 100_000);
        vm.startPrank(merchant);
        token.faucet(amount);
        protocol.fundCampaign(campaignId, amount);
        vm.stopPrank();
    }
}

contract SpokeInvariantTest is StdInvariant, SpokeFixture {
    function setUp() public override {
        super.setUp();
        SettlementHandler handler =
            new SettlementHandler(protocol, token, merchant, distributors, campaignId, leaf);
        targetContract(address(handler));
    }

    function invariant_separateLedgersMatchTheAssetsHeld() public view {
        _assertConservation();
    }

    function invariant_noRewardClaimableBeforeFinalization() public view {
        uint256 claimable;
        for (uint256 i; i < 4; ++i) {
            claimable += protocol.claimableRewards(address(token), distributors[i]);
        }
        ISpokeProtocol.RewardLedger memory ledger = protocol.getRewardLedger(campaignId);
        assertEq(claimable, ledger.vestedUnclaimed);
    }
}
