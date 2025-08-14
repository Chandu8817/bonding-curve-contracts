// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {console} from "forge-std/console.sol";
import {ERC20Mintable} from "./ERC20Mintable.sol";
import {IUniswapV2Router02} from "./interfaces/IUniswapV2Router02.sol";
import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PumpFunStyleMarket
 * @notice Minimal, testable constant-product bonding curve with virtual reserves (no external ERC20).
 *         All token math uses 18 decimals (token "units" == wei-like 1e-18).
 *         Invariant: K = virtualEth * tokensAvailable (both act like virtual reserves).
 */
contract Market is ReentrancyGuard {
    // --- Config ---
    uint256 public constant SCALE = 1e18;

    // Treasury fee in basis points (e.g., 200 = 2%)
    uint256 public treasuryFeeBps = 100; // 1.00%
    address public treasury ; // Treasury address to receive fees

    // --- Virtual reserves and bookkeeping ---
    // Virtual reserves (think CPMM with seeded/virtual liquidity)
    uint256 public virtualEth = 30 ether;        // acts like ETH reserve, in wei
    uint256 public tokensAvailable =1073000191 ether;   // acts like token reserve, in 18-decimal token units

    // Supply stats (for reference/testing)
    uint256 public totalSupply = 1000000000 ether;       // total token supply configured
    uint256 public soldTokens;        // cumulative tokens sold (in circulation outside the curve)

    // Actual ETH held from net buys minus net sells (excluding un-withdrawn treasury fees)
    uint256 public actualEth;         // in wei

    // Treasury accounting
    uint256 public treasuryAccrued;   // fees (wei) waiting to withdraw

    // Simple internal ledger for testing (replace with ERC20 if needed)
    mapping(address => uint256) public balanceOf;

    address public token; // Token address (for reference, not used in math)

  

    // --- Events ---
    event Bought(address indexed buyer, uint256 ethIn, uint256 fee, uint256 tokensOut);
    event Sold(address indexed seller, uint256 tokensIn, uint256 fee, uint256 ethOut);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    event ParamsUpdated(uint256 virtualEth, uint256 tokensAvailable, uint256 feeBps);



    // /**
    //  * @param _virtualEth       Initial virtual ETH reserve (e.g., 30 ether)
    //  * @param _tokensAvailable  Initial virtual token reserve (e.g., ~1e9 * 1e18 if you seed most supply)
    //  * @param _totalSupply      Total token supply (bookkeeping only in this mock)
    //  * @param _treasury         Treasury address to receive fees
    //  * @param _feeBps           Fee in basis points (<= 10000)
    //  */
    constructor(
        // uint256 _virtualEth,
        // uint256 _tokensAvailable,
        // uint256 _totalSupply,
        // address _treasury,
        // uint256 _feeBps
        address _token
    ) {
        treasury =msg.sender;
        token = _token;
        // require(_treasury != address(0), "treasury=0");
        // require(_feeBps <= 10_000, "fee > 100%");
        // virtualEth = _virtualEth;
        // tokensAvailable = _tokensAvailable;
        // totalSupply = _totalSupply;
        // treasury = _treasury;
        // treasuryFeeBps = _feeBps;
        // emit ParamsUpdated(virtualEth, tokensAvailable, treasuryFeeBps);
    }

    // ---------- View math (quotes) ----------

    /// @notice Quote tokens out for a given ETH in (wei). Uses CPMM with virtual reserves.
    function calculateTokensBought(uint256 ethInWei) public view returns (uint256) {
        if (ethInWei == 0) return 0;
        uint256 vs = virtualEth;
        uint256 vt = tokensAvailable;

        // K = vs * vt
        uint256 k = vs * vt;

        // new_vs = vs + ΔETH
        uint256 newVs = vs + ethInWei;

        // new_vt = floor(K / new_vs)
        uint256 newVt = k / newVs;

        // Δtokens = vt - new_vt
        uint256 deltaTokens = vt - newVt;
        return deltaTokens;
    }

    /// @notice Quote ETH out (wei) for a given tokens in.
    function calculateEthPayout(uint256 tokensInUnits) public view returns (uint256) {
        if (tokensInUnits == 0) return 0;
        uint256 vs = virtualEth;
        uint256 vt = tokensAvailable;

        // K = vs * vt
        uint256 k = vs * vt;

        // new_vt = vt + Δtokens
        uint256 newVt = vt + tokensInUnits;

        // new_vs = floor(K / new_vt)
        uint256 newVs = k / newVt;

        // Δeth = vs - new_vs
        uint256 deltaEth = vs - newVs;
        return deltaEth;
    }

    // ---------- Public buy / sell ----------

    /// @notice Buy by sending ETH; tokens are credited to internal ledger for testing.
    function buy() public payable nonReentrant returns (uint256 tokensOut) {
        require(msg.value > 0, "zero ETH");
        uint256 fee = (msg.value * treasuryFeeBps) / 10_000;
        uint256 net = msg.value - fee;

        // Quote with NET ETH (fees don't move the curve)
        uint256 tokensToMint = calculateTokensBought(net);
        require(tokensToMint > 0, "zero tokens out");
        require(tokensToMint <= tokensAvailable, "not enough tokens left");

        // Update virtual reserves / state

        virtualEth = virtualEth + net;                  // vs += net
        tokensAvailable = tokensAvailable - tokensToMint; // vt -= Δtokens

        soldTokens += tokensToMint;
        actualEth += net;
        treasuryAccrued += fee;

        balanceOf[msg.sender] += tokensToMint;
        ERC20Mintable(token).transfer(msg.sender, tokensToMint); 

        
        emit Bought(msg.sender, msg.value, fee, tokensToMint);
        return tokensToMint;
    }

    /// @notice Convenience: sending ETH directly calls buy()
    receive() external payable {
        buy();
    }

    /// @notice Sell tokens back to curve (needs no ERC20—uses internal ledger for tests).
    function sell(uint256 tokenAmount) external nonReentrant returns (uint256 ethOut) {
        require(tokenAmount > 0, "zero");
        require(balanceOf[msg.sender] >= tokenAmount, "insufficient balance");
        require(tokenAmount <= soldTokens, "burn > sold");

        // Quote ETH returned BEFORE fees
        uint256 returned = calculateEthPayout(tokenAmount);
        require(returned > 0, "zero ETH out");
        require(address(this).balance >= returned, "insufficient ETH liquidity");

        uint256 fee = (returned * treasuryFeeBps) / 10_000;
        uint256 net = returned - fee;

       

        // Curve moves back: vt += tokens, vs -= returned (before fee)
        virtualEth = virtualEth - returned;
        tokensAvailable = tokensAvailable + tokenAmount;

        soldTokens -= tokenAmount;
        actualEth -= net;          // only the net leaves "actual" pool
        treasuryAccrued += fee;

        balanceOf[msg.sender] -= tokenAmount;
        ERC20Mintable(token).transferFrom(msg.sender, address(this), tokenAmount); // Burn tokens from internal ledger

        // Payout
        (bool ok, ) = msg.sender.call{value: net}("");
        require(ok, "ETH send failed");

       
        emit Sold(msg.sender, tokenAmount, fee, net);
        return net;
    }

    // ---------- Admin ----------

    function setFeeBps(uint256 newBps) external {
        require(msg.sender == treasury, "only treasury");
        require(newBps <= 10_000, "fee > 100%");
        treasuryFeeBps = newBps;
        emit ParamsUpdated(virtualEth, tokensAvailable, treasuryFeeBps);
    }

    function withdrawTreasury(address to, uint256 amount) external nonReentrant {
        require(msg.sender == treasury, "only treasury");
        require(to != address(0), "to=0");
        require(amount <= treasuryAccrued, "exceeds accrued");

        treasuryAccrued -= amount;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "withdraw failed");
        emit TreasuryWithdrawn(to, amount);
    }

    // --- Helpers for tests ---

    /// @notice Current constant product K (for debugging).
    function invariantK() external view returns (uint256) {
        return virtualEth * tokensAvailable;
    }

    /// @notice Approx instantaneous price in wei per token (vs / vt).
    function spotPrice() external view returns (uint256) {
        if (tokensAvailable == 0) return type(uint256).max;
        return (virtualEth * SCALE) / tokensAvailable;
    }
}
