import React, { useState, useEffect } from 'react';
import Fabricators from './components/Fabricators';
import Pallets from './components/Pallets';
import Drawings from './components/Drawings';
import BOMParser from './components/BOMParser';
import Cart from './components/Cart';
import Print from './components/Print';
import Register from './components/Register';
import Profile from './components/Profile'; // Add this import

const navItems = [
    { name: 'Cart', icon: '🛒' },
    { name: 'Pallets', icon: '📦' },
    { name: 'Drawings', icon: '📜' },
    { name: 'Print', icon: '🖨️' },
    { name: 'BOM Parser', icon: '📋' },
    { name: 'Fabricators', icon: '🏗️' },
    { name: 'Profile', icon: '👤' } // Add this line
];

// --- LOGIN COMPONENT ---
function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.status === 'success') {
        onLoginSuccess(result.user);
      } else {
        setError(result.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Server connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#05070a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center font-black text-white shadow-lg shadow-sky-500/20">OS</div>
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-2 uppercase tracking-widest">System Access</h2>
        <p className="text-slate-500 text-xs text-center mb-8 uppercase tracking-tighter">Enter credentials to initialize session</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Username</label>
            <input 
              type="text" required
              className="w-full bg-slate-950 border border-white/5 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Password</label>
            <input 
              type="password" required
              className="w-full bg-slate-950 border border-white/5 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
          {error && <p className="text-rose-500 text-[10px] font-bold uppercase text-center">{error}</p>}
          <button 
            disabled={loading}
            className="w-full bg-white text-black font-black py-3 rounded-lg hover:bg-sky-400 transition-colors uppercase text-xs tracking-widest mt-4"
          >
            {loading ? 'Authenticating...' : 'Initialize Session'}
          </button>
        </form>
      </div>
      
      <button 
        onClick={onSwitchToRegister}
        className="mt-8 text-[10px] text-slate-600 hover:text-sky-500 uppercase font-bold tracking-[0.2em] transition-all"
      >
        Register New Station Account
      </button>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  // 1. AUTH & VIEW STATE
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState('login'); // 'login' or 'register'
  
  // 2. NAVIGATION & PERSISTENCE STATE
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem('lastVisitedPage') || 'Cart';
  });
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // 3. PERSISTENCE EFFECTS
  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('lastVisitedPage', activePage);
  }, [activePage]);

  // 4. INDUSTRIAL GUARDRAILS (Back Button Lock)
  useEffect(() => {
    window.history.pushState(null, null, window.location.href);
    const handlePopState = () => window.history.pushState(null, null, window.location.href);
    
    const handleKeyDown = (e) => {
      if ((e.altKey && e.key === 'ArrowLeft') || (e.metaKey && e.key === '[')) e.preventDefault();
      if (e.key === 'Backspace' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) e.preventDefault();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 5. SYSTEM CLOCK
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  // --- RENDERING LOGIC ---

  // GATEKEEPER: No User Logged In
  if (!user) {
    return view === 'login' ? (
      <Login 
        onLoginSuccess={setUser} 
        onSwitchToRegister={() => setView('register')} 
      />
    ) : (
      <Register 
        onBack={() => setView('login')} 
        onRegisterSuccess={() => setView('login')} 
      />
    );
  }

  // MAIN APPLICATION INTERFACE
  return (
    <div className="h-screen bg-[#05070a] text-slate-200 flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* INDUSTRIAL MINIMAL NAV */}
      <nav className="w-full md:w-16 lg:w-44 bg-slate-900/50 backdrop-blur-md border-b md:border-r border-white/5 flex md:flex-col items-center py-3 px-2 z-50">
        
        {/* USER IDENTITY AREA */}
        <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl mb-6 bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-white/10 shadow-inner">
          <span className="text-sky-400 font-black text-xs">
            {user.username.substring(0, 2).toUpperCase()}
          </span>
        </div>

        {/* NAV ITEMS */}
        <ul className="flex md:flex-col w-full gap-2 justify-around md:justify-start">
          {navItems.map((item) => {
            const isActive = activePage === item.name;
            return (
              <li key={item.name} className="relative group">
                <button
                  onClick={() => setActivePage(item.name)}
                  className={`flex flex-col lg:flex-row items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300 w-full ${
                    isActive 
                      ? 'bg-white/5 text-white' 
                      : 'text-slate-500 hover:bg-white/[0.02] hover:text-slate-300'
                  }`}
                >
                  <span className={`text-lg transition-all duration-500 ${isActive ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'opacity-70 group-hover:opacity-100'}`}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] hidden lg:block">
                    {item.name}
                  </span>
                  
                  {isActive && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 hidden md:block">
                      <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse shadow-[0_0_10px_#38bdf8]" />
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* SYSTEM STATUS FOOTER */}
        <div className="mt-auto hidden md:flex flex-col items-center gap-4 pb-2">
          <button 
            onClick={handleLogout}
            className="text-[9px] font-black text-rose-500/40 hover:text-rose-500 uppercase tracking-tighter transition-colors"
          >
            Logout
          </button>
          <div className="flex flex-col items-center">
             <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{time}</span>
             <div className="w-1 h-1 bg-emerald-500 rounded-full mt-1 shadow-[0_0_5px_#10b981]" title="System Online" />
          </div>
        </div>
      </nav>

      {/* CLEAN CONTENT VIEW */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="fixed top-0 right-0 w-96 h-96 bg-sky-500/5 blur-[120px] pointer-events-none" />
        
        <div className="p-3 md:p-4 max-w-[1600px] mx-auto relative z-10">
          <section className="animate-in fade-in zoom-in-[0.98] duration-500">
  {activePage === 'Fabricators' && <Fabricators />}
  {activePage === 'Pallets' && <Pallets />}
  {activePage === 'Drawings' && <Drawings />}
  {activePage === 'BOM Parser' && <BOMParser />}
  {activePage === 'Cart' && <Cart />} 
  {activePage === 'Print' && <Print />} 
  {activePage === 'Profile' && <Profile user={user} onLogout={handleLogout} />} {/* Add this line */}
</section>
        </div>
      </main>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
