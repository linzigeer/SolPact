// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Escrow.sol";
import "../src/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address demoBuyer = vm.envAddress("DEMO_BUYER");
        address demoSeller = vm.envAddress("DEMO_SELLER");

        vm.startBroadcast(pk);

        MockUSDC usdc = new MockUSDC();
        Escrow escrow = new Escrow();

        usdc.mint(demoBuyer, 10_000e6);
        usdc.mint(demoSeller, 100e6);

        console2.log("USDC:", address(usdc));
        console2.log("Escrow:", address(escrow));

        vm.stopBroadcast();
    }
}
