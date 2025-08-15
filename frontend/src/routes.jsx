import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateToken from "./pages/CreateToken";
import TokenDetail from "./pages/TokenDetail";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateToken />} />
      <Route path="/token/:token_address" element={<TokenDetail />} />
    </Routes>
  );
}
