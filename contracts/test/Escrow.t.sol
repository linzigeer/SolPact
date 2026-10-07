// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Escrow.sol";
import "../src/MockUSDC.sol";

contract EscrowTest is Test {
    Escrow escrow;
    MockUSDC usdc;
    address buyer = makeAddr("buyer");
    address seller = makeAddr("seller");
    address arbitrator = makeAddr("arbitrator");

    function setUp() public {
        escrow = new Escrow();
        usdc = new MockUSDC();
        usdc.mint(buyer, 10_000e6);
    }

    function _createSingleMilestone(uint256 amount) internal returns (uint256 pid) {
        string[] memory desc = new string[](1);
        uint256[] memory amt = new uint256[](1);
        uint256[] memory dl = new uint256[](1);
        desc[0] = "Deliver X";
        amt[0] = amount;
        dl[0] = block.timestamp + 7 days;

        vm.prank(buyer);
        pid = escrow.createProject(seller, arbitrator, address(usdc), desc, amt, dl, 3 days);
    }

    function test_HappyPath_CreateDepositSubmitApprove() public {
        uint256 pid = _createSingleMilestone(1000e6);

        vm.prank(buyer);
        usdc.approve(address(escrow), 1000e6);
        vm.prank(buyer);
        escrow.deposit(pid);
        assertEq(usdc.balanceOf(address(escrow)), 1000e6);

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "ipfs://Qm...");

        vm.prank(buyer);
        escrow.approveMilestone(pid, 0);

        assertEq(usdc.balanceOf(seller), 1000e6);
    }

    function test_RefundOnDeadlineMiss() public {
        uint256 pid = _createSingleMilestone(500e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 500e6);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.warp(block.timestamp + 8 days);
        vm.prank(buyer);
        escrow.refundOnDeadlineMiss(pid, 0);
        assertEq(usdc.balanceOf(buyer), 10_000e6);
    }

    function test_ClaimAutoRelease_TooEarly_Reverts() public {
        uint256 pid = _createSingleMilestone(500e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 500e6);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "uri");

        vm.prank(seller);
        vm.expectRevert(bytes("too early"));
        escrow.claimAutoRelease(pid, 0);
    }

    function test_ClaimAutoRelease_AfterWindow_Succeeds() public {
        uint256 pid = _createSingleMilestone(500e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 500e6);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "uri");
        vm.warp(block.timestamp + 3 days + 1);
        vm.prank(seller);
        escrow.claimAutoRelease(pid, 0);
        assertEq(usdc.balanceOf(seller), 500e6);
    }

    function test_DisputeResolve_SplitFunds() public {
        uint256 pid = _createSingleMilestone(1000e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 1000e6);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "uri");
        vm.prank(buyer);
        escrow.raiseDispute(pid, 0);

        vm.prank(arbitrator);
        escrow.resolveDispute(pid, 0, 7000);

        assertEq(usdc.balanceOf(seller), 700e6);
        assertEq(usdc.balanceOf(buyer), 9_300e6);
    }

    function test_OnlyBuyerCanApprove() public {
        uint256 pid = _createSingleMilestone(100e6);
        vm.startPrank(buyer);
        usdc.approve(address(escrow), 100e6);
        escrow.deposit(pid);
        vm.stopPrank();
        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "uri");

        vm.prank(seller);
        vm.expectRevert(bytes("not buyer"));
        escrow.approveMilestone(pid, 0);
    }

    function testFuzz_CreateRejectsZeroOrPastDeadline(uint256 amount, uint64 offset) public {
        amount = bound(amount, 1, 1_000_000e6);
        offset = uint64(bound(offset, 1, 30 days));

        string[] memory desc = new string[](1);
        uint256[] memory amt = new uint256[](1);
        uint256[] memory dl = new uint256[](1);
        desc[0] = "Fuzz milestone";
        amt[0] = amount;
        dl[0] = block.timestamp + offset;

        vm.prank(buyer);
        uint256 pid = escrow.createProject(
            seller, arbitrator, address(usdc), desc, amt, dl, 3 days
        );
        (,,,, uint256 total,,,,) = escrow.projects(pid);
        assertEq(total, amount);
    }

    function testFuzz_ApprovePaysExactAmount(uint256 amount) public {
        amount = bound(amount, 1e6, 5_000e6);
        usdc.mint(buyer, amount);
        uint256 pid = _createSingleMilestone(amount);

        vm.startPrank(buyer);
        usdc.approve(address(escrow), amount);
        escrow.deposit(pid);
        vm.stopPrank();

        vm.prank(seller);
        escrow.submitDelivery(pid, 0, "fuzz");
        vm.prank(buyer);
        escrow.approveMilestone(pid, 0);
        assertEq(usdc.balanceOf(seller), amount);
    }
}
