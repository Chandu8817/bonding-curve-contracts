import TokenCard from "../components/TokenCard";
import { useEffect, useState } from 'react';
import { supabase } from "../utils/supabaseClient";
import {ethers} from "ethers";


import { Contract } from 'ethers';
import  erc20ABI  from '../constant/erc20.json';


export default function Home() {
  const PAGE_SIZE = 10;
    const [tokens, setTokens] = useState([]);
    const [page, setPage] = useState(0);
    const [provider, setProvider] = useState(null);
    
  

    async function fetchTokenData(tokenAddress) {
      const contract = new Contract(tokenAddress, erc20ABI,provider);
      const [name, symbol, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply()
      ]);
      return { name, symbol, totalSupply:(ethers.formatUnits(totalSupply, 18)) };
    }

     useEffect(() => {
      async function loadProvider() {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(provider);
        } else {
          alert("Please install MetaMask");
        }
      }

      loadProvider();
     
    }, []);

    useEffect(() => {
      async function loadTokens() {
        const { data, error } = await supabase
          .from('tokens')
          .select('*')
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading tokens:', error);
          return;
        }


        
        const tokensWithData = await Promise.all(
          data.map(async (token) => {
            const tokenData = await fetchTokenData(token.token_address);
            return {
              id: token.id,
              address: token.token_address,
              market: token.market_address,
              creator: token.creator,
              ...tokenData
            };
          })
        );

        setTokens(tokensWithData);
      }

      loadTokens();
    }, [page, supabase,provider]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">All Tokens</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tokens.map((t) => (
          <TokenCard key={t.id} token={t} />
        ))}
      </div>
    </div>
  );
}
