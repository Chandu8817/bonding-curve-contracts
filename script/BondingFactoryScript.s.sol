// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {BondingFactory} from "../src/BondingFactory.sol";

contract BondingFactoryScript is Script {
    BondingFactory public bondingFactory;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        bondingFactory = new BondingFactory(0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3);
        console.log("BondingFactory deployed at:", address(bondingFactory));

        vm.stopBroadcast();
    }
}
