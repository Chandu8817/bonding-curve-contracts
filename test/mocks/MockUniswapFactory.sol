// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract MockUniswapFactory {
    address public lastTokenA;
    address public lastTokenB;
    address public pair;

    constructor() {
        pair = address(0xBEEF);
    }

    function createPair(address tokenA, address tokenB) external returns (address) {
        lastTokenA = tokenA;
        lastTokenB = tokenB;
        return pair;
    }
}
