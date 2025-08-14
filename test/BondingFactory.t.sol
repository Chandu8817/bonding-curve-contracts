// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BondingFactory.sol";
import "./mocks/MockUniswapRouter.sol";
import "./mocks/MockUniswapFactory.sol";

contract BondingFactoryTest is Test {
    BondingFactory factory;
    Market market;
    ERC20Mintable token;
    MockUniswapRouter mockRouter;
    MockUniswapFactory mockFactory;
    address admin = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address buyer = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address seller = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address weth = address(0xEEEE);

    function setUp() public {
        // Deploy mocks
        mockFactory = new MockUniswapFactory();
        mockRouter = new MockUniswapRouter(weth, address(mockFactory));

        // Deploy factory
        factory = new BondingFactory(address(mockRouter));

        // Create token & market
        (address tokenAddr, address marketAddr) = factory.createToken(
            "Bonding Token",
            "BND",
            1_000_000_000 ether      // tokens allocated to sale
            // 1e15,              // slope a
            // 1e15,              // intercept b
            // 5 ether,           // targetEth
            // 200,                // 2% fee
            // admin              // admin address
        );

        token = ERC20Mintable(tokenAddr);
        market = Market(payable(marketAddr));

        // Fund buyer & seller
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 100 ether);
    }

    function testCreateTokenAndMarket() public view {
        assertEq(token.totalSupply(), 1_000_000_000 ether);
        assertEq(token.balanceOf(address(market)), 1_000_000_000 ether);
    }

    function testBuyTokens() public {
        vm.startPrank(buyer);
        
        uint256 beforeBal = token.balanceOf(buyer);


        market.buy{value: 1 ether}();

        uint256 afterBal = token.balanceOf(buyer);
        assertGt(afterBal, beforeBal, "Buyer should get tokens");
        assertGt(market.soldTokens(), 0, "Sold tokens should increase");
        assertEq(address(market).balance, 1 ether, "Market should hold ETH");
        vm.stopPrank();
    }

    function testSellTokens() public {
        // Buyer buys tokens
        vm.startPrank(buyer);
        market.buy{value: 1 ether}();
        uint256 tokensBought = token.balanceOf(buyer);
        token.approve(address(market), tokensBought);
        vm.stopPrank();

        // Seller sells tokens (same address)
        vm.startPrank(buyer);
        uint256 ethBefore = buyer.balance;
        market.sell(tokensBought / 2);
        uint256 ethAfter = buyer.balance;
        assertGt(ethAfter, ethBefore, "ETH should be returned");
        vm.stopPrank();
    }

    function testTreasuryFeeDeduction() public {
        vm.startPrank(buyer);
        market.buy{value: 1 ether}();
        uint256 cost = 1 ether;
        uint256 fee = (cost * market.treasuryFeeBps()) / 10000;
        assertEq(address(market).balance, cost, "ETH stays in market");
        assertEq(fee, 0.02 ether, "2% fee calculation");
        vm.stopPrank();
    }

  

    // function testAddLiquidityAfterTargetReached() public {
    //     // Raise ETH to hit target
    //     vm.startPrank(buyer);
    //     market.buy{value: 6 ether}();
    //     vm.stopPrank();

    //     uint256 tokenBal = token.balanceOf(address(market));

    //     vm.prank(admin);
    //     address pair = market.addLiquidityToUniswap(
    //         tokenBal / 2, // tokens
    //         0,
    //         0,
    //         block.timestamp + 100
    //     );

    //     assertEq(pair, mockFactory.pair(), "Pair address should match mock");
    // }

 
}
