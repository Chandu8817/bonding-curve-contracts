// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockUniswapFactory.sol";

contract MockUniswapRouter {
    MockUniswapFactory public factoryContract;
    address public weth;

    constructor(address _weth, address _factory) {
        weth = _weth;
        factoryContract = MockUniswapFactory(_factory);
    }

    function factory() external view returns (address) {
        return address(factoryContract);
    }

    function WETH() external view returns (address) {
        return weth;
    }

    // function addLiquidityETH(
    //     address token,
    //     uint256 amountTokenDesired,
    //     uint256 amountTokenMin,
    //     uint256 amountETHMin,
    //     address to,
    //     uint256 deadline
    // ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
    //     // For testing, just return inputs as outputs
    //     return (amountTokenDesired, msg.value, 1e18);
    // }
}
