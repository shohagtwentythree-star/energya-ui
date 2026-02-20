import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '', 
    setupKey: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        localStorage.removeItem('currentUser');
        // Redirect to login upon successful registration
        navigate('/login', { state: { message: 'Account Provisioned Successfully' } });
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
      {/* Dynamic background lighting */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-emerald-500/20 rounded-3xl p-8 shadow-2xl relative z-10 overflow-hidden">
        
        <div className="flex justify-center mb-8">
          <div className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[9px] tracking-[0.3em] uppercase">
            Station Provisioning Mode
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Register User</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 opacity-60">
            Authorization key required for terminal access
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Master Setup Key Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-emerald-500/70 uppercase ml-1 tracking-[0.15em]">Master Setup Key</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              className="w-full bg-slate-950/50 border border-emerald-500/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-slate-800"
              value={formData.setupKey}
              onChange={e => setFormData({...formData, setupKey: e.target.value})}
            />
          </div>

          <div className="flex items-center gap-4 my-4">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Credentials</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* New Credentials Fields */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Operator Identity</label>
            <input 
              type="text" 
              required 
              placeholder="Unique Username"
              className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Security Token</label>
            <input 
              type="password" 
              required 
              placeholder="Create Password"
              className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
              <p className="text-rose-500 text-[10px] font-black uppercase text-center tracking-tighter animate-pulse">
                {error}
              </p>
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full group relative overflow-hidden bg-emerald-500 text-black font-black py-4 rounded-xl transition-all uppercase text-xs tracking-[0.2em] mt-4 shadow-lg shadow-emerald-500/10"
          >
            <span className="relative z-10">{loading ? 'Authorizing...' : 'Provision Account'}</span>
            <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/login')}
            className="w-full text-slate-600 hover:text-white text-[10px] font-bold uppercase tracking-[0.3em] py-2 transition-all"
          >
            ← Return to Command Center
          </button>
        </form>
      </div>
    </div>
  );
}
