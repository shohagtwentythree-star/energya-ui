import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';

// Component Imports
import Fabricators from './components/Fabricators';
import Pallets from './components/Pallets';
import Drawings from './components/Drawings';
import BOMParser from './components/BOMParser';
import Cart from './components/Cart';
import Print from './components/Print';
import Register from './components/Register';
import Profile from './components/Profile';
import Login from './components/Login'; 
import Database from './components/Database'; 
import BackupManager from './components/BackupManager'; // Import the new file


const navItems = [
    { name: 'Cart', path: '/cart', icon: '🛒' },
    { name: 'Pallets', path: '/pallets', icon: '📦' },
    { name: 'Drawings', path: '/drawings', icon: '📜' },
    { name: 'Print', path: '/print', icon: '🖨️' },
    { name: 'BOM Parser', path: '/bom-parser', icon: '📋' },
    { name: 'Fabricators', path: '/fabricators', icon: '🏗️' },
        { name: 'Database', path: '/database', icon: '📜️' },
    { name: 'Profile', path: '/profile', icon: '👤' }
];

// --- PROTECTED LAYOUT COMPONENT ---
// This handles the sidebar and the common UI elements
function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen bg-[#05070a] text-slate-200 flex flex-col md:flex-row overflow-hidden font-sans">
      <nav className="w-full md:w-16 lg:w-44 bg-slate-900/50 backdrop-blur-md border-b md:border-r border-white/5 flex md:flex-col items-center py-3 px-2 z-10">
        <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl mb-6 bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-white/10 shadow-inner">
          <span className="text-sky-400 font-black text-xs">{user?.username?.substring(0, 2).toUpperCase()}</span>
        </div>

        <ul className="flex md:flex-col w-full gap-2 justify-around md:justify-start">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path} className="relative group">
                <Link
                  to={item.path}
                  className={`flex flex-col lg:flex-row items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300 w-full ${
                    isActive ? 'bg-white/5 text-white' : 'text-slate-500 hover:bg-white/[0.02] hover:text-slate-300'
                  }`}
                >
                  <span className={`text-lg transition-all duration-500 ${isActive ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'opacity-70 group-hover:opacity-100'}`}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] hidden lg:block">{item.name}</span>
                  {isActive && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 hidden md:block">
                      <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse shadow-[0_0_10px_#38bdf8]" />
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto hidden md:flex flex-col items-center gap-4 pb-2">
          <button onClick={onLogout} className="text-[9px] font-black text-rose-500/40 hover:text-rose-500 uppercase tracking-tighter">Logout</button>
          <div className="flex flex-col items-center">
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{time}</span>
             <div className="w-1 h-1 bg-emerald-500 rounded-full mt-1 shadow-[0_0_5px_#10b981]" />
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto relative">
        <div className="fixed top-0 right-0 w-96 h-96 bg-sky-500/5 blur-[120px] pointer-events-none" />
        <div className="p-3 md:p-4 max-w-[1600px] mx-auto relative z-10 animate-in fade-in zoom-in-[0.98] duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('currentUser')));

  useEffect(() => {
    if (user) localStorage.setItem('currentUser', JSON.stringify(user));
    else localStorage.removeItem('currentUser');
  }, [user]);

  const handleLogout = () => setUser(null);

  return (
    <BrowserRouter>
      <Routes>
  {/* Public Routes */}
  <Route 
    path="/login" 
    element={!user ? <Login onLoginSuccess={setUser} /> : <Navigate to="/cart" />} 
  />
  <Route path="/register" element={!user ? <Register /> : <Navigate to="/cart" />} />


        {/* Protected Routes */}
        <Route path="/" element={user ? <Navigate to="/cart" /> : <Navigate to="/login" />} />
        
        <Route path="/*" element={
          user ? (
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/cart" element={<Cart />} />
                <Route path="/backup" element={<BackupManager />} />
                <Route path="/pallets" element={<Pallets />} />
                <Route path="/drawings" element={<Drawings />} />
                                <Route path="/database" element={<Database />} />
                <Route path="/print" element={<Print />} />
                <Route path="/bom-parser" element={<BOMParser />} />
                <Route path="/fabricators" element={<Fabricators />} />
                <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}
