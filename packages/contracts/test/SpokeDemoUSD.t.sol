// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SpokeDemoUSD} from "../src/SpokeDemoUSD.sol";
import {ISpokeDemoUSD} from "../src/ISpokeDemoUSD.sol";

contract SpokeDemoUSDTest is Test {
    SpokeDemoUSD private token;
    address private dana = makeAddr("dana");

    function setUp() public {
        token = new SpokeDemoUSD();
    }

    function test_metadataDisclosesDemoToken() public view {
        assertEq(token.name(), "SpokeDemoUSD");
        assertEq(token.symbol(), "SDUSD");
        assertEq(token.decimals(), 6);
    }

    function test_faucetMintsToCaller() public {
        vm.prank(dana);
        token.faucet(100e6);
        assertEq(token.balanceOf(dana), 100e6);
    }

    function test_faucetRejectsAboveLimit() public {
        uint256 limit = token.FAUCET_LIMIT();
        vm.expectRevert(
            abi.encodeWithSelector(ISpokeDemoUSD.FaucetLimitExceeded.selector, limit + 1, limit)
        );
        vm.prank(dana);
        token.faucet(limit + 1);
    }
}
