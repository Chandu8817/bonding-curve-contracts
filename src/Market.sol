// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import {console} from "forge-std/console.sol";
import {ERC20Mintable} from "./ERC20Mintable.sol";
import {IUniswapV2Router02} from "./interfaces/IUniswapV2Router02.sol";
import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";

/*
  Market contract that implements bonding curve sale and pool creation
*/
contract Market {
    // --- Market fields (mapped from your Solana struct)
    address public token;            // token address (ERC20Mintable)
    uint8 public bump;               // not used in EVM; kept for parity
    uint256 public virtualEth;       // virtual ETH backing (scaled to wei)
    uint256 public tokensAvailable;  // tokens allocated to sale (token units with decimals)
    uint256 public totalSupply;      // total token supply (for bookkeeping)
    uint256 public actualEth;        // ETH actually held from sales (wei)
    uint256 public soldTokens;       // total tokens sold
    uint256 public marketCap;        // stored market cap (optional)
    uint256 public treasuryFee;      // fee in basis points (bps), e.g. 200 = 2%
    bool public isBlacklisted;
    bool public isPaused;

    // bonding curve params (linear): price(s) = a * s + b
    // 'a' and 'b' are fixed-point scaled by 1e18
    uint256 public a; // slope (wei per token unit scaled)
    uint256 public b; // intercept (wei per token scaled)

    address public admin;
    uint256 public targetEth;        // when reached, optionally create Uniswap pool
    uint256 public ethRaised;        // ETH raised (wei)

    IUniswapV2Router02 public router;
    address public weth;
    address public uniswapFactory;

    uint256 constant SCALE = 1e18;

    event Bought(address indexed buyer, uint256 ethSpent, uint256 tokensBought);
    event Sold(address indexed seller, uint256 tokensBurned, uint256 ethReturned);
    event LiquidityAdded(address indexed pair, uint256 tokenAmount, uint256 ethAmount);
    event TreasuryWithdrawn(address indexed to, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    modifier live() {
        require(!isPaused, "paused");
        require(!isBlacklisted, "blacklisted");
        _;
    }

    constructor(
        address _token,
        address _router,
        uint256 _a,
        uint256 _b,
        uint256 _tokensAllocated,
        uint256 _targetEth,
        uint256 _treasuryFeeBps,
        address _admin
    ) {
        token = _token;
        router = IUniswapV2Router02(_router);
        weth = router.WETH();
        uniswapFactory = router.factory();
        a = _a;
        b = _b;
        tokensAvailable = _tokensAllocated;
        targetEth = _targetEth;
        treasuryFee = _treasuryFeeBps; // e.g., 200 = 2%
        admin = _admin;
        totalSupply = ERC20Mintable(_token).totalSupply();
    }

    receive() external payable {
        // allow direct buys
        buy();
    }

    // --------- Bonding curve math ----------

     /// Buy tokens with ETH (wei)
    function calculateTokensBought(uint256 ethInWei) public view returns (uint256) {
        uint256 vs = virtualEth;
        uint256 vt = tokensAvailable;
        uint256 dx = ethInWei;

        // K = vs * vt
        uint256 k = vs * vt;

        // new_vs = vs + ΔETH
        uint256 newVs = vs + dx;

        // new_vt = floor(K / new_vs)
        uint256 newVt = k / newVs;

        // Δtokens = vt - new_vt
        uint256 deltaTokens = vt - newVt;
        return deltaTokens;
    }

    /// Sell tokens for ETH (wei)
    function calculateEthPayout(uint256 tokensInUnits) public view returns (uint256) {
        uint256 vs = virtualEth;
        uint256 vt = tokensAvailable;
        uint256 dy = tokensInUnits;

        // K = vs * vt
        uint256 k = vs * vt;

        // new_vt = vt + Δtokens
        uint256 newVt = vt + dy;

        // new_vs = floor(K / new_vt)
        uint256 newVs = k / newVt;

        // Δeth = vs - new_vs
        uint256 deltaEth = vs - newVs;
        return deltaEth;
    }

    

    // --------- Public buy / sell ----------

    // Buy tokens by sending ETH
    function buy() public payable live returns (uint256 tokensBought) {
        require(msg.value > 0, "send ETH");
        uint256 ethIn = msg.value;
        // compute tokens buyer will receive based on current soldTokens (s)
        uint256 s = soldTokens;
        uint256 delta = calculateTokensBought( ethIn);
        console.log("buy: s=%s, delta=%s, ethIn=%s", s, delta, ethIn);
        require(delta > 0, "zero tokens");
        require(delta <= tokensAvailable, "not enough tokens left");



        // fee to treasury
        uint256 fee = (ethIn * treasuryFee) / 10000;
        uint256 net = ethIn - fee;

        // update bookkeeping
        virtualEth += net;
        actualEth += net;
        soldTokens += delta;
        tokensAvailable -= delta;

      

        // transfer tokens to buyer
        require(ERC20Mintable(token).transfer(msg.sender, delta), "transfer failed");

        emit Bought(msg.sender, ethIn, delta);

        // if target reached, attempt to add liquidity (admin can call too)
        if (ethRaised >= targetEth) {
            // attempt to create pool and add liquidity (wrap in try/catch if router may revert)
            // we don't auto-add a large amount — expose function that admin can call with params.
        }

        return delta;
    }

    // Sell tokens back to the market: user must approve tokens first.
    function sell(uint256 tokenAmount) external live returns (uint256 ethOut) {
        require(tokenAmount > 0, "zero");
        // current supply s = soldTokens (tokens in circulation from sale)
        uint256 s = soldTokens;
        require(tokenAmount <= s, "burn > sold");

        // compute ETH returned for burning tokenAmount
        uint256 returned = calculateEthPayout( tokenAmount);

        // collect fee
        uint256 fee = (returned * treasuryFee) / 10000;
        uint256 net = returned - fee;

        // update bookkeeping
        soldTokens = s - tokenAmount;
        actualEth -= net;
        virtualEth -= returned; // reflect full returned amount

        // pull tokens and burn
        require(ERC20Mintable(token).transferFrom(msg.sender, address(this), tokenAmount), "transferFrom");
        // burn tokens by calling internal burn (token must allow admin burn). Simplify: token had been minted to market initially; to "burn", we'll keep tokens in market (or call token burn if implemented).
        // For now, market keeps tokens (effectively removes from circulation)
        // (Alternative: if token exposes burn, call it. We didn't implement burn in ERC20Mintable externally)
        // send ETH to seller
        (bool sOk,) = msg.sender.call{value: net}("");
        require(sOk, "ETH send failed");

        emit Sold(msg.sender, tokenAmount, net);
        return net;
    }

    // Admin can add liquidity to Uniswap V2 pair when sale target achieved.
    // This will approve tokens from Market to router and call addLiquidityETH.
    function addLiquidityToUniswap(uint256 tokenAmountDesired, uint256 amountTokenMin, uint256 amountETHMin, uint256 deadline) external onlyAdmin returns (address pair) {
        require(ethRaised >= targetEth, "target not reached"); //100 80
        uint256 ethBalance = address(this).balance;
        require(ethBalance > 0, "no ETH");
        require(tokenAmountDesired > 0, "no tokens requested");

        // approve router to take tokens
        require(ERC20Mintable(token).approve(address(router), tokenAmountDesired), "approve failed");

        // add liquidity (sends ETH from this contract)
        (uint256 amountToken, uint256 amountETH, ) = router.addLiquidityETH{value: ethBalance}(
            token,
            tokenAmountDesired,
            amountTokenMin,
            amountETHMin,
            admin, // liquidity recipient to admin
            deadline
        );

        // create pair address
        address pairAddr = IUniswapV2Factory(uniswapFactory).createPair(token, weth);

        emit LiquidityAdded(pairAddr, amountToken, amountETH);
        return pairAddr;
    }

    // Admin withdraw collected treasury fees (ETH)
    function withdrawTreasury(address payable to) external onlyAdmin {
        uint256 bal = address(this).balance;
        require(bal > 0, "no eth");
        (bool ok,) = to.call{value: bal}("");
        require(ok, "withdraw failed");
        emit TreasuryWithdrawn(to, bal);
    }

    // Admin controls
    function setPaused(bool p) external onlyAdmin {
        isPaused = p;
    }

    function setBlacklisted(bool bflag) external onlyAdmin {
        isBlacklisted = bflag;
    }

    function setTreasuryFee(uint256 bps) external onlyAdmin {
        require(bps <= 2000, "max 20%");
        treasuryFee = bps;
    }
}