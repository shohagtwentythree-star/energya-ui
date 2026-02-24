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
import Admin from './components/Admin';
import FactoryReset from './components/FactoryReset';
import Login from './components/Login'; 
import AddDrawingView from './components/AddDrawingView'; 
import DetailDrawingView from './components/DetailDrawingView'; 
import Database from './components/Database'; 
import BackupManager from './components/BackupManager'; // Import the new file
import RestoreManager from './components/RestoreManager'; // Import the new file

const navItems = [
  {
    name: 'Cart',
    path: '/cart',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
        <path d="M3 4h2l2.2 10.5a2 2 0 0 0 2 1.5h7.6a2 2 0 0 0 2-1.6L21 7H6" />
      </svg>
    )
  },
  {
    name: 'Pallets',
    path: '/pallets',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="8" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
        <rect x="13" y="13" width="8" height="8" rx="2" />
      </svg>
    )
  },
  {
    name: 'Drawings',
    path: '/drawings',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 3h12l4 4v14H4z" />
        <path d="M16 3v4h4" />
        <path d="M8 13h8" />
      </svg>
    )
  },
  /* {
    name: 'Print',
    path: '/print',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V4h12v5" />
        <rect x="6" y="14" width="12" height="6" rx="2" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      </svg>
    )
  }, */
  {
    name: 'BOM Parser',
    path: '/bom-parser',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
      </svg>
    )
  },
  {
    name: 'Fabricators',
    path: '/fabricators',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V9l7-4 7 4v12" />
        <path d="M9 21v-6h6v6" />
      </svg>
    )
  },
  {
    name: 'Database',
    path: '/database',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </svg>
    )
  },
  {
    name: 'Profile',
    path: '/profile',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    )
  }
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
                <Route path="/restore" element={<RestoreManager />} />
                <Route path="/pallets" element={<Pallets />} />
             <Route path="/drawings" element={<Drawings />} />
<Route path="/drawings/add" element={<AddDrawingView />} />
<Route path="/drawings/:id" element={<DetailDrawingView />} />
                                <Route path="/database" element={<Database />} />
                <Route path="/print" element={<Print />} />
           <Route path="/admin" element={<Admin />} />
       <Route path="/factory-reset" element={<FactoryReset />} />
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
