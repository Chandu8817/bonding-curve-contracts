




import ProgressBar from "./ProgressBar";
import { Link } from "react-router-dom";

export default function TokenCard({ token }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-200 dark:border-gray-700">
     
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{token.name}</h2>
          <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">({token.symbol})</span>
        </div>
      </div>
        
        <div className="space-y-3 mb-4">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Address:</span>
            <span className="ml-2 font-medium text-primary-600 dark:text-primary-400 text-sm break-all">
              {token.address}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Supply:</span>
              <span className="ml-2 font-medium text-primary-600 dark:text-primary-400">
                {token.totalSupply}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Progress
            </div>
          </div>
        </div>

        <ProgressBar progress={token.progress} />
          <Link
          to={`/token/${token.address}`}
          className="mt-4 inline-flex items-center w-full justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-black bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
        >
          <span>View Details</span>
          <svg className="ml-2 h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    
  );
}
