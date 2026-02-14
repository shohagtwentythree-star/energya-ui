import React, { useState, useEffect } from 'react'; // Added useEffect
import Fabricators from './components/Fabricators';
import Pallets from './components/Pallets';
import Drawings from './components/Drawings';
import BOMParser from './components/BOMParser';
import Cart from './components/Cart';

const navItems = [
    { name: 'Cart', icon: '🛒' },
    { name: 'Pallets', icon: '📦' },
    { name: 'Drawings', icon: '📜' },
    { name: 'BOM Parser', icon: '📋' },
    { name: 'Fabricators', icon: '🏗️' }
];

export default function App() {
  // 1. Initialize state from LocalStorage (or default to 'Cart')
  const [activePage, setActivePage] = useState(() => {
    const savedPage = localStorage.getItem('lastVisitedPage');
    return savedPage || 'Cart';
  });

  // 2. Update LocalStorage whenever activePage changes
  useEffect(() => {
    localStorage.setItem('lastVisitedPage', activePage);
  }, [activePage]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      <nav className="w-full md:w-64 bg-slate-800 border-b md:border-r border-slate-700 p-4">
        <h1 className="text-xl font-bold text-sky-400 mb-8 hidden md:block italic tracking-tighter uppercase">Workshop-OS</h1>
        <ul className="flex md:flex-col gap-2 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => (
            <li key={item.name} className="flex-shrink-0">
              <button
                onClick={() => setActivePage(item.name)}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 font-bold text-sm uppercase tracking-wider ${
                  activePage === item.name 
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/20' 
                    : 'text-slate-500 hover:bg-slate-700/50 hover:text-slate-300'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex-1 overflow-y-auto max-h-screen">
        <div className="w-full">
          {activePage === 'Fabricators' && <Fabricators />}
          {activePage === 'Pallets' && <Pallets />}
          {activePage === 'Drawings' && <Drawings />}
          {activePage === 'BOM Parser' && <BOMParser />}
          {activePage === 'Cart' && <Cart />} 
        </div>
      </main>
    </div>
  );
}
