import React, { useState } from 'react';

export default function Register({ onBack, onRegisterSuccess }) {
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '', 
    setupKey: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const result = await res.json();

      if (result.status === 'success') {
        // Clear local storage to ensure fresh login
        localStorage.removeItem('currentUser');
        onRegisterSuccess(); 
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection to security server failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-[#05070a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[80px] pointer-events-none" />

        <div className="flex justify-center mb-6">
          <div className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[10px] tracking-[0.2em]">
            STATION PROVISIONING
          </div>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2 uppercase tracking-widest">Register User</h2>
        <p className="text-slate-500 text-[10px] text-center mb-8 uppercase tracking-tighter">
          Authorization key required for account creation
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Master Setup Key Field */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Master Setup Key</label>
            <input 
              type="password" 
              required 
              placeholder="••••"
              className="w-full bg-slate-950 border border-white/5 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-800"
              value={formData.setupKey}
              onChange={e => setFormData({...formData, setupKey: e.target.value})}
            />
          </div>

          <div className="h-px bg-white/5 my-2" />

          {/* New Credentials Fields */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">New Username</label>
            <input 
              type="text" 
              required 
              className="w-full bg-slate-950 border border-white/5 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">New Password</label>
            <input 
              type="password" 
              required 
              className="w-full bg-slate-950 border border-white/5 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded text-rose-500 text-[10px] font-bold uppercase text-center animate-pulse">
              {error}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full bg-emerald-500 text-black font-black py-4 rounded-lg hover:bg-emerald-400 transition-all uppercase text-xs tracking-widest mt-4 shadow-lg shadow-emerald-500/10"
          >
            {loading ? 'Processing...' : 'Authorize & Create'}
          </button>

          <button 
            type="button"
            onClick={onBack}
            className="w-full text-slate-600 hover:text-slate-400 text-[10px] font-bold uppercase tracking-widest py-2 transition-colors"
          >
            Cancel and Return
          </button>
        </form>
      </div>
    </div>
  );
}
