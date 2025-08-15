import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

import ABI from "../constant/BondingFactory.json";
import { ethers } from "ethers";
import { useContract } from "../hooks/useContract";
import { useAccount } from "wagmi";

export default function CreateToken() {
   const { address } = useAccount()
  const [form, setForm] = useState({ name: "", symbol: "" });

 
  const contractService = useContract(
    "0x5cd5ee1d426aCD69e668bb563536f607aFC3cb7A",
    ABI.abi
  );


  function extractTokenAndMarket(log) {
    const token = ethers.getAddress("0x" + log.topics[1].slice(26));
    const market = ethers.getAddress("0x" + log.topics[2].slice(26));
    return { token, market };
}

 const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    // 1. Send transaction
    const tx = await contractService.write(
      "createToken",
      0n,
      form.name,
      form.symbol,
      ethers.parseUnits("10000000000", 18),
     
    );

    console.log("Transaction sent:", tx.hash);

    // 2. Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction mined:", receipt.transactionHash);

const log = receipt.logs[1];
const { token, market } = extractTokenAndMarket(log);

console.log("Token:", token);
console.log("Market:", market);

    const tokenAddr = token;
    const marketAddr = market;

    console.log("Token Address:", tokenAddr);
    console.log("Market Address:", marketAddr);
debugger
    // 4. Store in Supabase
    const { error } = await supabase.from("token").insert([
      {
        token: tokenAddr,
        market: marketAddr,
        creator: address,
        name: form.name,
        symbol: form.symbol,
        total_supply: ethers.parseUnits("10000000000", 18).toString(),
      },
    ]);

    if (error) {
      console.error("Error saving to Supabase:", error);
    } else {
      console.log("Saved to Supabase successfully");
    }
  } catch (err) {
    console.error("Transaction failed:", err);
    if (err?.error?.message) {
      console.error("Revert reason:", err.error.message);
    }
  }
};


if (!address) {
  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Connect Wallet to Create Token</h1>
      <p className="text-gray-600">Please connect your wallet to create a token.</p>
    </div>
  );
}


  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Token</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Token Name"
          className="w-full p-2 border rounded"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Token Symbol"
          className="w-full p-2 border rounded"
          onChange={(e) => setForm({ ...form, symbol: e.target.value })}
          required
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </form>
    </div>
  );
}
