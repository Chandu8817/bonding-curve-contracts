import { useParams } from "react-router-dom";
import { useState, useEffect, use } from "react";
import { supabase } from "../utils/supabaseClient";
import ProgressBar from "../components/ProgressBar";
import { Contract, ethers, getAddress } from "ethers";
import erc20ABI from "../constant/erc20.json";
import MarketABI from "../constant/Market.json";
import toast from "react-hot-toast";
import { useWallet } from "../hooks/useWallet";
import { useAccount } from "wagmi";

export default function TokenDetails() {
  const { token_address } = useParams();
   const { address } = useAccount()

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

    const tokenContract = new Contract(tokenData.token, erc20ABI, signer);
    // const marketContract = new Contract(tokenData.market, MarketABI.abi, signer);

    const [tokenBal, ethBal, marketBal] = await Promise.all([
      tokenContract.balanceOf(userAddress),
      provider.getBalance(userAddress),
      provider.getBalance(tokenData.market),
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
    if (!provider || !token_address) return;
    
    async function fetchToken() {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("token")
          .select("*")
          .eq("token", token_address)
          .single();

        if (error) {
          console.error("Error fetching token:", error);
          return;
        }

        // const tokenData = await fetchTokenData(token_address, provider);
        // const mergedData = { data};
        setToken(data);

        const { data: tradesData, error: tradesError } = await supabase
          .from("trades")
          .select("*")
          .eq("token_address", token_address)
          .order("trade_time", { ascending: false })
          .limit(10);

        if (!tradesError) {
          setTrades(tradesData);
          setMarket(data.market);
        }

        await fetchBalances(data);
       
      } catch (err) {
        console.error("Error loading token:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [provider, token_address]);

  const handleBuy = async (e) => {
  e.preventDefault();
  const signer = await provider.getSigner();
  const contract = new Contract(token.market, MarketABI.abi, signer);
 let ethIn, fee, tokensOut;

  contract
    .buy({ value: ethers.parseUnits(buyAmount, 18) })
    .then(async (tx) => { const receipt=  await tx.wait()
debugger;
     const boughtEventTopic = ethers.id("Bought(address,uint256,uint256,uint256)");
   for (const log of receipt.logs) {
  // Check if the event matches the Bought topic
  if (log.topics[0] === boughtEventTopic) {
    // topics[1] is indexed (msg.sender)
    const buyerAddress = ethers.getAddress("0x" + log.topics[1].slice(26));

    // Decode the data (non-indexed params: msg.value, fee, tokensToMint)
     [ethIn, fee, tokensOut] = ethers.AbiCoder.defaultAbiCoder().decode(
      ["uint256", "uint256", "uint256"],
      log.data
    );

    console.log("Buyer:", buyerAddress);
    console.log("ETH In (wei):", ethIn.toString());
    console.log("Fee (wei):", fee.toString());
    console.log("Tokens Out:", tokensOut.toString());
  }
}
    


    })
    .then(async () => {
      toast.success(`Bought ${buyAmount} ETH worth of ${token.symbol}`);
      fetchBalances(token);

      // Insert trade record into Supabase
      const { error } = await supabase.from("trades").insert([
        {
          user_address: account,
          trade_type: "buy",
          amount_sent: buyAmount,
          amount_received: ethers.formatEther(tokensOut.toString(),18).toString(), // optional
          token_address: token.token,
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
    const contract = new Contract(token.market, MarketABI.abi, signer);
    const tokenContract = new Contract(token.token, erc20ABI, signer);
    const userAddress = await signer.address;

    const marketBal = await provider.getBalance(token.market);
    const sellValueEth = Number(ethers.parseEther(marketBal.toString()));

    if (sellValueEth <= 0) {
      toast.error("Market has no ETH for redemption");
      return;
    }

    let sellAmt = (ethers.parseEther(sellAmount));
    // if (sellAmt > sellValueEth) {
    //   toast(`Reducing sell amount to ${sellValueEth} due to low market funds`);
    //   sellAmt = sellValueEth;
    // }

    const allowance = await tokenContract.allowance(userAddress, token.market);
    

   const doSell = () => {
   let tokensIn, fee, ethOut;
  contract
    .sell(sellAmt)
    .then(async (tx) => { const receipt=  await tx.wait()

      debugger;
     const sellEventTopic = ethers.id("Sold(address,uint256,uint256,uint256)");
   for (const log of receipt.logs) {
  // Check if the event matches the Bought topic
  if (log.topics[0] === sellEventTopic) {
    // topics[1] is indexed (msg.sender)
    const sellerAddress = ethers.getAddress("0x" + log.topics[1].slice(26));

    // Decode the data (non-indexed params: msg.value, fee, tokensToMint)
     [tokensIn, fee, ethOut] = ethers.AbiCoder.defaultAbiCoder().decode(
      ["uint256", "uint256", "uint256"],
      log.data
    );

    console.log("Seller:", sellerAddress);
    console.log("Tokens In (wei):", tokensIn.toString());
    console.log("Fee (wei):", fee.toString());
    console.log("Tokens Out:", ethOut.toString());
  }
}
    
   
    })
    .then(async () => {
      toast.success(`Sold ${sellAmount} ${token.symbol}`);
      fetchBalances(token);

      // Insert trade record into Supabase
      const { error } = await supabase.from("trades").insert([
        {
          user_address: account ,
          trade_type: "sell",
          amount_sent: sellAmount,
          amount_received: ethers.formatEther(ethOut.toString(), 18).toString(),// update if you know the received token amount
          token_address: token.token,
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
        .approve(token.market, sellAmt)
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




if (!address) {
  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Connect Wallet to Create Token</h1>
      <p className="text-gray-600">Please connect your wallet to create a token.</p>
    </div>
  );
}

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-black text-3xl font-bold">{token.name} ({token.symbol})</h1>
        <p>Token Address: {token.token}</p>
        <p>Total Supply: {ethers.formatEther(token.total_supply,18)}</p>
        <p>Your Token Balance: {userTokenBal} {token.symbol}</p>
        <p>Your ETH Balance: {userEthBal} ETH</p>
        <p>Market ETH Remaining: {marketEthBal} ETH</p>
        <ProgressBar progress={token?.progress} />
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
