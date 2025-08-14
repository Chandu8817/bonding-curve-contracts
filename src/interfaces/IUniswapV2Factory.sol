// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {console} from "forge-std/console.sol";


/*
  Interface for Uniswap V2 Factory
  Used to create pairs for tokens
*/
interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}