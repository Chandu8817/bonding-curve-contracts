import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { config } from './config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
const queryClient = new QueryClient()
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
   <WagmiProvider config={config}>
     <QueryClientProvider client={queryClient}>
    <App />
    </QueryClientProvider>
    </WagmiProvider>
  </BrowserRouter>
);
