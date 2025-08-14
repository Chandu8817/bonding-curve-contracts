import { useParams } from "react-router-dom";
import { useState, useEffect, use } from "react";
import { supabase } from "../utils/supabaseClient";
import ProgressBar from "../components/ProgressBar";
import { Contract, ethers, getAddress } from "ethers";
import erc20ABI from "../constant/erc20.json";
import MarketABI from "../constant/Market.json";
import toast from "react-hot-toast";
import { useWallet } from "../hooks/useWallet";

export default function TokenDetails() {
  const { address } = useParams();
  const [token, setToken] = useState(null);
  const [trades, setTrades] = useState([]);
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [market, setMarket] = useState(null);
  const [userTokenBal, setUserTokenBal] = useState("0");
  const [userEthBal, setUserEthBal] = useState("0");
  const [marketEthBal, setMarketEthBal] = useState("0");
  const { connect, disconnect, account } = useWallet();
  
   useEffect(() => {
    const savedAddress = window.localStorage.getItem("walletAddress");
    if (savedAddress) {
        connect()
        
    }
  }, [ ]);

  async function fetchTokenData(tokenAddress, providerInstance) {
    const signer = await providerInstance.getSigner();
    const contract = new Contract(tokenAddress, erc20ABI, signer);

    const [name, symbol, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.totalSupply(),
    ]);



    return {
      name,
      symbol,
      totalSupply: ethers.formatUnits(totalSupply, 18),
    };
  }




  async function fetchBalances(tokenData) {
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    const tokenContract = new Contract(tokenData.token_address, erc20ABI, signer);
    const marketContract = new Contract(tokenData.market_address, MarketABI.abi, signer);

    const [tokenBal, ethBal, marketBal] = await Promise.all([
      tokenContract.balanceOf(userAddress),
      provider.getBalance(userAddress),
      provider.getBalance(tokenData.market_address),
    ]);

    setUserTokenBal(ethers.formatUnits(tokenBal, 18));
    setUserEthBal(ethers.formatUnits(ethBal, 18));
    setMarketEthBal(ethers.formatUnits(marketBal, 18));
  }

  // Load provider
  useEffect(() => {
    async function loadProvider() {
      if (window.ethereum) {
        const providerInstance = new ethers.BrowserProvider(window.ethereum);
        setProvider(providerInstance);
      } else {
        alert("Please install MetaMask");
      }
    }
    loadProvider();
  }, []);

  // Fetch token & trades
  useEffect(() => {
    if (!provider || !address) return;
    
    async function fetchToken() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("tokens")
          .select("*")
          .eq("token_address", address)
          .single();

        if (error) {
          console.error("Error fetching token:", error);
          return;
        }

        const tokenData = await fetchTokenData(address, provider);
        const mergedData = { ...data, ...tokenData };
        setToken(mergedData);

        const { data: tradesData, error: tradesError } = await supabase
          .from("trades")
          .select("*")
          .eq("token_address", address)
          .order("trade_time", { ascending: false })
          .limit(10);
debugger
        if (!tradesError) {
          setTrades(tradesData);
          setMarket(mergedData.market_address);
        }

        await fetchBalances(mergedData);
       
      } catch (err) {
        console.error("Error loading token:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [provider, address]);

  const handleBuy = async (e) => {
  e.preventDefault();
  const signer = await provider.getSigner();
  const contract = new Contract(token.market_address, MarketABI.abi, signer);

  contract
    .buy({ value: ethers.parseUnits(buyAmount, 18) })
    .then((tx) => tx.wait())
    .then(async () => {
      toast.success(`Bought ${buyAmount} ETH worth of ${token.symbol}`);
      fetchBalances(token);

      // Insert trade record into Supabase
      const { error } = await supabase.from("trades").insert([
        {
          user_address: account,
          trade_type: "buy",
          amount_sent: buyAmount,
          amount_received: 0, // optional
          token_address: token.token_address,
          trade_time: new Date().toISOString()
        }
      ]);
      if (error) console.error("Error inserting trade:", error);
    })
    .catch((error) => {
      console.error("Error buying token:", error);
      toast.error("Buy failed");
    });
};

    // id bigint generated always as identity primary key,
    // trade_time timestamptz default now() not null,
    // user_address text not null,
    // trade_type text check (trade_type in ('buy', 'sell')) not null,
    // amount_sent numeric(38, 18) not null,
    // amount_received numeric(38, 18) not null,
    // token_address  text not null
  const handleSell = async (e) => {
    e.preventDefault();
    const signer = await provider.getSigner();
    const contract = new Contract(token.market_address, MarketABI.abi, signer);
    const tokenContract = new Contract(token.token_address, erc20ABI, signer);
    const userAddress = await signer.address;

    const marketBal = await provider.getBalance(token.market_address);
    const sellValueEth = Number(ethers.parseEther(marketBal.toString()));

    if (sellValueEth <= 0) {
      toast.error("Market has no ETH for redemption");
      return;
    }
debugger
    let sellAmt = (ethers.parseEther(sellAmount));
    // if (sellAmt > sellValueEth) {
    //   toast(`Reducing sell amount to ${sellValueEth} due to low market funds`);
    //   sellAmt = sellValueEth;
    // }

    const allowance = await tokenContract.allowance(userAddress, token.market_address);
    

   const doSell = () => {
  contract
    .sell(sellAmt)
    .then((tx) => tx.wait())
    .then(async () => {
      toast.success(`Sold ${sellAmount} ${token.symbol}`);
      fetchBalances(token);
debugger
      // Insert trade record into Supabase
      const { error } = await supabase.from("trades").insert([
        {
          user_address: account ,
          trade_type: "sell",
          amount_sent: sellAmount,
          amount_received: 0, // update if you know the received token amount
          token_address: token.token_address,
          trade_time: new Date().toISOString()
        }
      ]);
      if (error) console.error("Error inserting trade:", error);
    })
    .catch((error) => {
      console.error("Error selling token:", error);
      toast.error("Sell failed");
    });
};


    if (allowance < sellAmt) {
      tokenContract
        .approve(token.market_address, sellAmt)
        .then((tx) => tx.wait())
        .then(doSell)
        .catch((error) => {
          console.error("Approval failed:", error);
          toast.error("Approval failed");
        });
    } else {
      doSell();
    }
  };

  if (loading) {
    return <div className="p-6">Loading token details...</div>;
  }

  if (!token) {
    return <div className="p-6">Token not found.</div>;
  }




  if (!account) {
  return (
    <div className="p-6 text-center">
      <p className="mb-4">Please connect your wallet to view token details.</p>
      <button
        onClick={connect}
        className="bg-blue-600 text-black px-4 py-2 rounded-lg"
      >
        Connect Wallet
      </button>
    </div>
  );
}

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-black text-3xl font-bold">{token.name} ({token.symbol})</h1>
        <p>Token Address: {token.token_address}</p>
        <p>Total Supply: {token.totalSupply}</p>
        <p>Your Token Balance: {userTokenBal} {token.symbol}</p>
        <p>Your ETH Balance: {userEthBal} ETH</p>
        <p>Market ETH Remaining: {marketEthBal} ETH</p>
        <ProgressBar progress={token.progress} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <form onSubmit={handleBuy} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-600">Buy</h2>
          <input type="number" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} placeholder="ETH Amount" className="w-full px-3 py-2 border rounded-lg mb-4" />
          <button type="submit" className="w-full bg-green-600 text-black py-2 rounded-lg">
            Buy {token.symbol}
          </button>
        </form>

        <form onSubmit={handleSell} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Sell</h2>
          <input type="number" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} placeholder="Amount" className="w-full px-3 py-2 border rounded-lg mb-4" />
          <button type="submit" className="w-full bg-red-600 text-black py-2 rounded-lg">
            Sell {token.symbol}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Trades</h2>
        {trades.length === 0 ? <p>No trades yet.</p> : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Type</th>
                <th>Amount sent</th>
                <th>Amount received</th>
              
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr key={idx}>
                  <td>{trade.trade_type}</td>
                  <td>{trade.amount_sent}</td>
                  <td>{trade.amount_received}</td>
                  <td>{new Date(trade.trade_time).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
