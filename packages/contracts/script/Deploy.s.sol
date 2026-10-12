// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {SpokeDemoUSD} from "../src/SpokeDemoUSD.sol";
import {SpokeProtocol} from "../src/SpokeProtocol.sol";

contract Deploy is Script {
    error UnsupportedChain(uint256 chainId);

    function run() external returns (SpokeDemoUSD token, SpokeProtocol protocol) {
        if (block.chainid != 10143 && block.chainid != 31337) {
            revert UnsupportedChain(block.chainid);
        }
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        token = new SpokeDemoUSD();
        protocol = new SpokeProtocol(address(token));
        vm.stopBroadcast();
    }
}
