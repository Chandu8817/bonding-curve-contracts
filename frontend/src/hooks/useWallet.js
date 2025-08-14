import { useState } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [account, setAccount] = useState(null);

  const connect = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      window.localStorage.setItem("walletAddress", accounts[0]);
    } else {
      alert("Please install MetaMask");
    }
  };

  const disconnect = () =>{ setAccount(null)
    window.localStorage.removeItem("walletAddress");
  };

  return { connect, disconnect, account };
}
