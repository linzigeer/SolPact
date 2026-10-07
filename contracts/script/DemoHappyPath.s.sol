// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Escrow.sol";
import "../src/MockUSDC.sol";

/// @notice On-chain smoke: create → deposit → submit → approve
contract DemoHappyPath is Script {
    function run() external {
        address escrowAddr = vm.envAddress("ESCROW_ADDRESS");
        address usdcAddr = vm.envAddress("USDC_ADDRESS");
        uint256 buyerPk = vm.envUint("BUYER_PRIVATE_KEY");
        uint256 sellerPk = vm.envUint("SELLER_PRIVATE_KEY");
        address seller = vm.envAddress("DEMO_SELLER");

        Escrow escrow = Escrow(escrowAddr);
        MockUSDC usdc = MockUSDC(usdcAddr);

        string[] memory desc = new string[](1);
        uint256[] memory amt = new uint256[](1);
        uint256[] memory dl = new uint256[](1);
        desc[0] = "Phase 1 UI mockup";
        amt[0] = 200e6;
        dl[0] = block.timestamp + 7 days;

        vm.startBroadcast(buyerPk);
        uint256 pid = escrow.createProject(
            seller,
            address(0),
            usdcAddr,
            desc,
            amt,
            dl,
            3 days
        );
        usdc.approve(escrowAddr, 200e6);
        escrow.deposit(pid);
        vm.stopBroadcast();

        vm.startBroadcast(sellerPk);
        escrow.submitDelivery(pid, 0, "https://figma.com/demo-phase1");
        vm.stopBroadcast();

        uint256 sellerBefore = usdc.balanceOf(seller);

        vm.startBroadcast(buyerPk);
        escrow.approveMilestone(pid, 0);
        vm.stopBroadcast();

        console2.log("projectId", pid);
        console2.log("sellerUSDC before", sellerBefore);
        console2.log("sellerUSDC after", usdc.balanceOf(seller));
    }
}
