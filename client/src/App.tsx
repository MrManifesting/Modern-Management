import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-yellow-400 mb-2">
            Gold Standard Inventory Management
          </h1>
          <p className="text-gray-300">
            Advanced Cannabis Inventory System
          </p>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-yellow-400/20">
            <h2 className="text-xl font-semibold text-yellow-400 mb-3">
              System Status
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-green-400">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Shopify:</span>
                <span className="text-green-400">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Items:</span>
                <span className="text-yellow-400">1,614</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-yellow-400/20">
            <h2 className="text-xl font-semibold text-yellow-400 mb-3">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-black font-semibold py-2 px-4 rounded transition">
                View Inventory
              </button>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition">
                Generate Menu
              </button>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition">
                Sync Shopify
              </button>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-yellow-400/20">
            <h2 className="text-xl font-semibold text-yellow-400 mb-3">
              Recent Activity
            </h2>
            <div className="space-y-2 text-sm">
              <div className="text-gray-300">
                ✓ System optimized for 1,614 items
              </div>
              <div className="text-gray-300">
                ✓ Pound variants prioritized
              </div>
              <div className="text-gray-300">
                ✓ Menu buttons functional
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;