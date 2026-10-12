// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface ISpokeDemoUSD is IERC20Metadata {
    error FaucetLimitExceeded(uint256 requested, uint256 limit);

    function FAUCET_LIMIT() external view returns (uint256);

    function faucet(uint256 amount) external;
}
