// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import {console} from "forge-std/console.sol";
import  "./Market.sol";
/*
  Factory that deploys ERC20 and Market
*/
contract BondingFactory {
    address public owner;
    address public router; // UniswapV2 router address
    mapping(address => address) public tokenToMarket;
    event TokenAndMarketCreated(address indexed token, address indexed market, address indexed creator);

    constructor(address _router) {
        owner = msg.sender;
        router = _router;
    }

    // createToken deploys ERC20Mintable and Market
    // _initialMint: number of tokens minted initially to market (with token decimals)
    // _a, _b: bonding curve params scaled by 1e18
    // _targetEth: e.g. 5 ether = 5 * 1e18
    // _treasuryFeeBps: fee in bps
    function createToken(
        string memory name,
        string memory symbol,
        uint256 _initialMint,
        uint256 _a,
        uint256 _b,
        uint256 _targetEth,
        uint256 _treasuryFeeBps,
        address _admin
    ) external returns (address tokenAddr, address marketAddr) {
        // deploy token with initial mint to address(0) for now; we'll mint to market after its creation.
        ERC20Mintable token = new ERC20Mintable(name, symbol, 0, address(this));
        tokenAddr = address(token);

        // deploy market with placeholder tokensAllocated; tokensAllocated = _initialMint
        Market market = new Market(
            tokenAddr,
            router,
            _a,
            _b,
            _initialMint,
            _targetEth,
            _treasuryFeeBps,
            _admin // admin
        );
        marketAddr = address(market);

        // mint initial supply to market
        token.mint(marketAddr, _initialMint);

        tokenToMarket[tokenAddr] = marketAddr;

        emit TokenAndMarketCreated(tokenAddr, marketAddr, msg.sender);
        return (tokenAddr, marketAddr);
    }

    // owner functions
    function setRouter(address _router) external {
        require(msg.sender == owner, "only owner");
        router = _router;
    }
}
 
 