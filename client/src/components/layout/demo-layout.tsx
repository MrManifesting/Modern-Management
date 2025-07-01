import React from "react";
import { Link } from "wouter";

type DemoLayoutProps = {
  children: React.ReactNode;
};

export default function DemoLayout({ children }: DemoLayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black/90 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-8 w-8 text-yellow-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              />
            </svg>
            <h1 className="text-xl font-semibold text-white">MrLister - Demo Mode</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/auth">
              <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
      
      <footer className="bg-gray-900 border-t border-gray-800 py-2 px-4 text-center text-sm text-gray-500">
        <p>This is a demo showcase of the inventory management system. Sign in for full access.</p>
      </footer>
    </div>
  );
}