import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
        navigate('/cart'); // Redirect to main app after login
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
      {/* Visual background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center font-black text-white shadow-lg shadow-sky-500/20 text-xl">
            OS
          </div>
        </div>
        
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em]">System Access</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 opacity-60">
            Initialize secure terminal session
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Identification</label>
            <input 
              type="text" 
              placeholder="Username"
              required
              autocomplete="username"
              className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Security Token</label>
            <input 
              type="password" 
              placeholder="Password"
              required
              className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-sky-500/50 transition-all placeholder:text-slate-700"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 py-3 rounded-xl">
              <p className="text-rose-500 text-[10px] font-black uppercase text-center tracking-tighter">{error}</p>
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full group relative overflow-hidden bg-white text-black font-black py-4 rounded-xl transition-all uppercase text-xs tracking-[0.2em] mt-4 active:scale-95"
          >
            <span className="relative z-10">{loading ? 'Verifying...' : 'Establish Connection'}</span>
            <div className="absolute inset-0 bg-sky-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </form>
      </div>
      
      <button 
        onClick={() => navigate('/register')}
        className="mt-8 text-[10px] text-slate-600 hover:text-sky-400 uppercase font-black tracking-[0.3em] transition-all"
      >
        Request New Station Account
      </button>
    </div>
  );
}
