// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {ISpokeProtocol} from "../src/ISpokeProtocol.sol";
import {SpokeDemoUSD} from "../src/SpokeDemoUSD.sol";

abstract contract FixtureBase is Script {
    error WrongFixtureNetwork();
    error FixtureAssertionFailed();
    error GasTransferFailed();

    function _check(address token, address protocol) internal view {
        if (block.chainid != 31337 && block.chainid != 10143) revert WrongFixtureNetwork();
        if (block.chainid == 10143) {
            if (
                token != 0xb6279237003eD710bB4ccE6fbd126e07eD4D8E23
                    || protocol != 0x1Fa5e94e44DB2101664C0a24dBf1e52912af3eca
            ) revert WrongFixtureNetwork();
        }
        _expect(ISpokeProtocol(protocol).paymentToken() == token);
    }

    function _actor(string memory name) internal view returns (address) {
        return vm.addr(vm.envUint(name));
    }

    function _expect(bool condition) internal pure {
        if (!condition) revert FixtureAssertionFailed();
    }

    function _prepareWallet(SpokeDemoUSD token, ISpokeProtocol protocol) internal {
        token.faucet(100e6);
        token.approve(address(protocol), type(uint256).max);
    }

    function _campaign(
        SpokeDemoUSD token,
        ISpokeProtocol protocol,
        string memory merchant,
        bytes32 metadata,
        uint128 price
    ) internal returns (uint256 campaignId) {
        uint16[] memory weights = new uint16[](4);
        weights[0] = 5000;
        weights[1] = 2500;
        weights[2] = 1500;
        weights[3] = 1000;
        ISpokeProtocol.CommissionPolicy memory policy = ISpokeProtocol.CommissionPolicy({
            rewardToken: address(token),
            commissionBps: 1000,
            maxRewardedAncestors: 4,
            weightsBps: weights,
            perSaleCap: 10e6,
            campaignLiabilityCap: 100e6,
            holdSeconds: 60,
            expiry: uint64(block.timestamp + 30 days),
            shortPathMode: ISpokeProtocol.ShortPathMode.Renormalize,
            eligibilityHash: bytes32(0)
        });
        vm.startBroadcast(vm.envUint(merchant));
        _prepareWallet(token, protocol);
        campaignId = protocol.createCampaign(
            metadata,
            ISpokeProtocol.CampaignConfig(keccak256(abi.encode(metadata, price)), price),
            policy
        );
        protocol.fundCampaign(campaignId, 100e6);
        protocol.activateCampaign(campaignId);
        vm.stopBroadcast();
    }

    function _node(ISpokeProtocol protocol, uint256 campaignId, uint256 parent, string memory actor)
        internal
        returns (uint256 id)
    {
        vm.startBroadcast(vm.envUint(actor));
        id = protocol.createNode(campaignId, parent, keccak256(bytes(actor)));
        vm.stopBroadcast();
    }

    function _purchase(
        SpokeDemoUSD token,
        ISpokeProtocol protocol,
        uint256 campaignId,
        uint256 nodeId,
        string memory buyer
    ) internal returns (uint256 id) {
        bytes32 orderKey = keccak256(abi.encode(address(protocol), campaignId, _actor(buyer)));
        vm.startBroadcast(vm.envUint(buyer));
        _prepareWallet(token, protocol);
        id = protocol.purchase(campaignId, nodeId, orderKey);
        vm.stopBroadcast();
    }

    function _conservation(ISpokeProtocol protocol, uint256 id) internal view {
        ISpokeProtocol.RewardLedger memory reward = protocol.getRewardLedger(id);
        ISpokeProtocol.PriceLedger memory price = protocol.getPriceLedger(id);
        _expect(
            reward.netDeposited
                == reward.available + reward.pendingReserved + reward.vestedUnclaimed
                    + reward.rewardsClaimed + reward.surplusWithdrawn
        );
        _expect(
            price.received
                == price.proceedsPending + price.proceedsClaimable + price.proceedsClaimed
                    + price.buyerRefunded
        );
    }
}
