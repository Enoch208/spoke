// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISpokeProtocol} from "./ISpokeProtocol.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

library PolicyMath {
    function validate(ISpokeProtocol.CommissionPolicy calldata policy, address token)
        internal
        pure
    {
        if (policy.rewardToken != token) {
            revert ISpokeProtocol.TokenNotAllowed(policy.rewardToken);
        }
        if (policy.commissionBps == 0 || policy.commissionBps > 10_000) {
            revert ISpokeProtocol.InvalidCommission(policy.commissionBps);
        }
        uint256 count = policy.maxRewardedAncestors;
        if (count == 0 || count > 5 || policy.weightsBps.length != count) {
            revert ISpokeProtocol.InvalidWeights();
        }
        uint256 total;
        for (uint256 i; i < count; ++i) {
            if (policy.weightsBps[i] == 0) revert ISpokeProtocol.InvalidWeights();
            total += policy.weightsBps[i];
        }
        if (total != 10_000) revert ISpokeProtocol.InvalidWeights();
        if (
            policy.perSaleCap > policy.campaignLiabilityCap || policy.holdSeconds < 60
                || policy.holdSeconds > 90 days
        ) {
            revert ISpokeProtocol.InvalidPolicy();
        }
    }

    function reward(uint256 price, ISpokeProtocol.CommissionPolicy memory policy)
        internal
        pure
        returns (uint256)
    {
        return Math.min(Math.mulDiv(price, policy.commissionBps, 10_000), policy.perSaleCap);
    }

    function split(uint256 amount, ISpokeProtocol.CommissionPolicy memory policy, uint256 count)
        internal
        pure
        returns (uint256[] memory amounts, uint16[] memory weights, uint256 reserved)
    {
        amounts = new uint256[](count);
        weights = new uint16[](count);
        if (count == 0) return (amounts, weights, 0);
        uint256 weightTotal;
        for (uint256 i; i < count; ++i) {
            weightTotal += policy.weightsBps[i];
        }
        bool normalize = policy.shortPathMode == ISpokeProtocol.ShortPathMode.Renormalize;
        reserved = normalize ? amount : Math.mulDiv(amount, weightTotal, 10_000);
        uint256 otherWeights;
        uint256 otherAmounts;
        for (uint256 i = 1; i < count; ++i) {
            uint256 weight = normalize
                ? uint256(policy.weightsBps[i]) * 10_000 / weightTotal
                : policy.weightsBps[i];
            weights[i] = uint16(weight);
            amounts[i] = Math.mulDiv(amount, weight, 10_000);
            otherWeights += weight;
            otherAmounts += amounts[i];
        }
        weights[0] = uint16(normalize ? 10_000 - otherWeights : policy.weightsBps[0]);
        amounts[0] = reserved - otherAmounts;
    }
}
