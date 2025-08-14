import Navbar from "./components/Navbar";
import AppRoutes from "./routes";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <AppRoutes />
    </div>
  );
}
