// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {FixtureBase} from "./FixtureBase.s.sol";
import {ISpokeProtocol} from "../src/ISpokeProtocol.sol";
import {SpokeDemoUSD} from "../src/SpokeDemoUSD.sol";

contract Fixture is FixtureBase {
    function fundGas() external {
        if (block.chainid != 31337 && block.chainid != 10143) revert WrongFixtureNetwork();
        string[10] memory names = [
            "FIXTURE_MERCHANT_A_KEY",
            "FIXTURE_MERCHANT_B_KEY",
            "FIXTURE_A_KEY",
            "FIXTURE_B_KEY",
            "FIXTURE_C_KEY",
            "FIXTURE_D_KEY",
            "FIXTURE_BRANCH_KEY",
            "FIXTURE_BUYER_A_KEY",
            "FIXTURE_BUYER_B_KEY",
            "FIXTURE_REFUND_BUYER_KEY"
        ];
        address[10] memory actors;
        address station = _actor("GAS_STATION_PRIVATE_KEY");
        for (uint256 i; i < names.length; ++i) {
            actors[i] = _actor(names[i]);
            _expect(actors[i] != station);
            for (uint256 j; j < i; ++j) {
                _expect(actors[i] != actors[j]);
            }
        }
        vm.startBroadcast(vm.envUint("GAS_STATION_PRIVATE_KEY"));
        for (uint256 i; i < actors.length; ++i) {
            if (actors[i].balance < 0.25 ether) {
                (bool sent,) = payable(actors[i]).call{value: 0.25 ether - actors[i].balance}("");
                if (!sent) revert GasTransferFailed();
            }
        }
        vm.stopBroadcast();
    }

    function seed(address tokenAddress, address protocolAddress)
        external
        returns (
            uint256 campaignA,
            uint256 campaignB,
            uint256 saleA,
            uint256 saleB,
            uint256 refundedSale
        )
    {
        _check(tokenAddress, protocolAddress);
        SpokeDemoUSD token = SpokeDemoUSD(tokenAddress);
        ISpokeProtocol protocol = ISpokeProtocol(protocolAddress);
        campaignA = _campaign(
            token, protocol, "FIXTURE_MERCHANT_A_KEY", keccak256("spoke-v3-proof-campaign-a"), 10e6
        );
        campaignB = _campaign(
            token, protocol, "FIXTURE_MERCHANT_B_KEY", keccak256("spoke-v3-proof-campaign-b"), 5e6
        );
        uint256 a = _node(protocol, campaignA, 0, "FIXTURE_A_KEY");
        uint256 b = _node(protocol, campaignA, a, "FIXTURE_B_KEY");
        uint256 c = _node(protocol, campaignA, b, "FIXTURE_C_KEY");
        uint256 d = _node(protocol, campaignA, c, "FIXTURE_D_KEY");
        _node(protocol, campaignA, b, "FIXTURE_BRANCH_KEY");
        uint256 secondRoot = _node(protocol, campaignB, 0, "FIXTURE_D_KEY");
        saleA = _purchase(token, protocol, campaignA, d, "FIXTURE_BUYER_A_KEY");
        saleB = _purchase(token, protocol, campaignB, secondRoot, "FIXTURE_BUYER_B_KEY");
        refundedSale = _purchase(token, protocol, campaignA, d, "FIXTURE_REFUND_BUYER_KEY");
        vm.startBroadcast(vm.envUint("FIXTURE_MERCHANT_A_KEY"));
        protocol.refundNativeSale(refundedSale);
        vm.stopBroadcast();
        (, ISpokeProtocol.Allocation[] memory allocations) = protocol.getSale(saleA);
        _expect(allocations.length == 4);
        uint256[4] memory expected = [uint256(500_000), 250_000, 150_000, 100_000];
        for (uint256 i; i < allocations.length; ++i) {
            _expect(allocations[i].amount == expected[i]);
        }
        _expect(token.balanceOf(_actor("FIXTURE_REFUND_BUYER_KEY")) == 100e6);
        _conservation(protocol, campaignA);
        _conservation(protocol, campaignB);
    }

    function settle(
        address tokenAddress,
        address protocolAddress,
        uint256 saleA,
        uint256 saleB,
        uint256 refundedSale
    ) external {
        _check(tokenAddress, protocolAddress);
        ISpokeProtocol protocol = ISpokeProtocol(protocolAddress);
        (ISpokeProtocol.Sale memory first,) = protocol.getSale(saleA);
        (ISpokeProtocol.Sale memory second,) = protocol.getSale(saleB);
        (ISpokeProtocol.Sale memory refunded,) = protocol.getSale(refundedSale);
        _expect(first.buyer == _actor("FIXTURE_BUYER_A_KEY"));
        _expect(second.buyer == _actor("FIXTURE_BUYER_B_KEY"));
        _expect(refunded.buyer == _actor("FIXTURE_REFUND_BUYER_KEY"));
        _expect(refunded.status == ISpokeProtocol.SaleStatus.Refunded);
        _expect(block.timestamp >= first.unlockAt && block.timestamp >= second.unlockAt);
        vm.startBroadcast(vm.envUint("FIXTURE_BUYER_A_KEY"));
        protocol.finalizeSale(saleA);
        protocol.finalizeSale(saleB);
        vm.stopBroadcast();
        _withdraw(protocol, first.campaignId, "FIXTURE_MERCHANT_A_KEY");
        _withdraw(protocol, second.campaignId, "FIXTURE_MERCHANT_B_KEY");
        _claimDistributors(SpokeDemoUSD(tokenAddress), protocol);
        _claimProceeds(protocol, first.campaignId, "FIXTURE_MERCHANT_A_KEY", 10e6);
        _claimProceeds(protocol, second.campaignId, "FIXTURE_MERCHANT_B_KEY", 5e6);
        _expect(protocol.getRewardLedger(first.campaignId).rewardsClaimed == 1e6);
        _expect(protocol.getRewardLedger(second.campaignId).rewardsClaimed == 500_000);
        _expect(protocol.getPriceLedger(first.campaignId).buyerRefunded == 10e6);
        _conservation(protocol, first.campaignId);
        _conservation(protocol, second.campaignId);
    }

    function _claimDistributors(SpokeDemoUSD token, ISpokeProtocol protocol) internal {
        string[4] memory names =
            ["FIXTURE_A_KEY", "FIXTURE_B_KEY", "FIXTURE_C_KEY", "FIXTURE_D_KEY"];
        uint256[4] memory expected = [uint256(100_000), 150_000, 250_000, 1_000_000];
        for (uint256 i; i < names.length; ++i) {
            vm.startBroadcast(vm.envUint(names[i]));
            _expect(protocol.claimRewards(address(token)) == expected[i]);
            vm.stopBroadcast();
            _expect(token.balanceOf(_actor(names[i])) == expected[i]);
        }
    }

    function _withdraw(ISpokeProtocol protocol, uint256 id, string memory merchant) internal {
        _expect(protocol.getCampaign(id).merchant == _actor(merchant));
        vm.startBroadcast(vm.envUint(merchant));
        protocol.pauseCampaign(id);
        protocol.refundUnusedRewardBudget(id);
        vm.stopBroadcast();
        _expect(protocol.getRewardLedger(id).available == 0);
        _expect(protocol.getRewardLedger(id).vestedUnclaimed > 0);
    }

    function _claimProceeds(
        ISpokeProtocol protocol,
        uint256 id,
        string memory merchant,
        uint256 amount
    ) internal {
        vm.startBroadcast(vm.envUint(merchant));
        _expect(protocol.claimMerchantProceeds(id) == amount);
        vm.stopBroadcast();
        _expect(protocol.getPriceLedger(id).proceedsClaimable == 0);
    }
}
