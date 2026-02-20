import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Profile({ user, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('http://localhost:3000/logs');
      const data = await res.json();
      // Sort newest first and limit to 20
      const sortedLogs = (data.data || [])
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);
      setLogs(sortedLogs);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleLogout = () => {
    onLogout(); // Clears user state and localStorage
    navigate('/login'); // Redirects to login route
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative w-20 h-20 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shadow-2xl">
              <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-500">
                {user?.username?.substring(0, 2).toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              {user?.username} <span className="text-sky-500 text-sm not-italic ml-2">v2.4.0</span>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator Active</span>
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                {user?.role || 'Access Level: 1'}
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="group relative px-8 py-3 bg-white text-black font-black rounded-xl text-xs uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-lg shadow-white/5"
        >
          <span className="relative z-10">Logout Session</span>
          <div className="absolute inset-0 bg-rose-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-xl"></div>
        </button>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Network Status', val: 'Connected', color: 'text-emerald-500' },
          { label: 'Logs Analyzed', val: `${logs.length} / 20`, color: 'text-white' },
          { label: 'Auth Protocol', val: 'JWT-Bcrypt', color: 'text-sky-400' },
          { label: 'Uptime', val: '99.9%', color: 'text-emerald-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl backdrop-blur-sm">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <p className={`text-xl font-bold tracking-tight ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      {/* --- LOGS SECTION --- */}
      <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md">
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">System Event Ledger</h3>
            <p className="text-[9px] text-slate-500 uppercase mt-1">Real-time traffic monitor</p>
          </div>
          <button 
            onClick={fetchLogs}
            disabled={isRefreshing}
            className={`p-2 rounded-lg border border-white/5 hover:bg-white/5 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
          >
            🔄
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-8 h-8 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Initializing Data Stream...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 text-[9px] uppercase font-black tracking-[0.2em] bg-slate-950/50">
                  <th className="px-8 py-4">Timeline</th>
                  <th className="px-8 py-4">Operation</th>
                  <th className="px-8 py-4">Resource Path</th>
                  <th className="px-8 py-4 text-right">Node Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {logs.map((log, idx) => (
                  <tr key={idx} className="group hover:bg-sky-500/[0.02] transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono text-slate-300">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                        </span>
                        <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                        log.method === 'POST' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' :
                        log.method === 'DELETE' ? 'bg-rose-500/5 text-rose-400 border-rose-500/20' :
                        'bg-sky-500/5 text-sky-400 border-sky-500/20'
                      }`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-[11px] font-mono text-slate-400 group-hover:text-sky-300 transition-colors">
                      {log.path}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <span className={`text-[11px] font-mono ${
                        log.status < 400 ? 'text-emerald-500/70' : 'text-rose-500/70'
                      }`}>
                        [{log.status}]
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {!loading && logs.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">No terminal activity logged in current buffer</p>
          </div>
        )}
      </div>
    </div>
  );
}
