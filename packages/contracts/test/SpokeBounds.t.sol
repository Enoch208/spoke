// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SpokeFixture} from "./SpokeFixture.sol";
import {ISpokeProtocol} from "../src/ISpokeProtocol.sol";

contract SpokeBoundsTest is SpokeFixture {
    function test_fiveRecipientsAndFullGraphStayWithinGasBudget() public {
        ISpokeProtocol.CommissionPolicy memory policy = _policy();
        policy.maxRewardedAncestors = 5;
        policy.weightsBps = new uint16[](5);
        for (uint256 i; i < 5; ++i) {
            policy.weightsBps[i] = 2000;
        }
        vm.prank(merchant);
        protocol.registerPolicyVersion(campaignId, policy, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 1 days);
        for (uint160 i = 4; i < 256; ++i) {
            vm.prank(address(0x10000 + i));
            leaf = protocol.createNode(campaignId, leaf, bytes32(0));
        }
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeProtocol.CampaignCapacityReached.selector, campaignId)
        );
        vm.prank(distributors[4]);
        protocol.createNode(campaignId, 0, bytes32(0));
        uint256 beforeGas = gasleft();
        uint256 saleId = _buy(buyer, leaf, bytes32(uint256(1)));
        uint256 usedGas = beforeGas - gasleft();
        emit log_named_uint("five-recipient full-graph purchase gas", usedGas);
        assertLt(usedGas, 3_000_000);
        (, ISpokeProtocol.Allocation[] memory split) = protocol.getSale(saleId);
        assertEq(split.length, 5);
        for (uint256 i; i < split.length; ++i) {
            assertEq(split[i].amount, 200);
        }
        _assertConservation();
    }

    function test_renormalizedSolidityGoldenVectors() public view {
        (, uint256[] memory amounts,) = protocol.previewAllocation(campaignId, leaf, 10_010);
        assertEq(amounts[0], 501);
        assertEq(amounts[1], 250);
        assertEq(amounts[2], 150);
        assertEq(amounts[3], 100);
        (, amounts,) = protocol.previewAllocation(campaignId, leaf, 10);
        assertEq(amounts[0], 1);
        assertEq(amounts[1], 0);
        assertEq(amounts[2], 0);
        assertEq(amounts[3], 0);
    }
}
