import React, { useState, useEffect } from 'react';

export default function Profile({ user, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* USER HEADER CARD */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
           <span className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-black uppercase tracking-widest">
             {user.role}
           </span>
        </div>
        
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 flex items-center justify-center shadow-2xl">
          <span className="text-4xl font-black text-white">
            {user.username.substring(0, 2).toUpperCase()}
          </span>
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-white tracking-tight">{user.username}</h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">Terminal Session Active</p>
          <button 
            onClick={onLogout}
            className="mt-4 px-6 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-[10px] font-black uppercase transition-all"
          >
            Terminate Session
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* STATS CARDS */}
        <div className="bg-slate-900/30 border border-white/5 p-6 rounded-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Database Mode</p>
          <p className="text-xl font-bold text-emerald-500 tracking-tight text-white">Encrypted NeDB</p>
        </div>
        <div className="bg-slate-900/30 border border-white/5 p-6 rounded-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Logs</p>
          <p className="text-xl font-bold tracking-tight text-white">{logs.length} Events</p>
        </div>
        <div className="bg-slate-900/30 border border-white/5 p-6 rounded-xl">
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Security Level</p>
          <p className="text-xl font-bold tracking-tight text-sky-400 font-bold uppercase">Master-Keyed</p>
        </div>
      </div>

      {/* RECENT ACTIVITY LOGS */}
      <div className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Recent System Activity</h3>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-600 text-[10px] uppercase animate-pulse">Scanning logs.db...</div>
          ) : logs.length === 0 ? (
            <div className="p-10 text-center text-slate-600 text-[10px] uppercase">No activity recorded</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-slate-500 text-[9px] uppercase font-black tracking-widest border-b border-white/5">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Endpoint</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-3 text-[10px] font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        log.method === 'POST' ? 'bg-emerald-500/10 text-emerald-500' :
                        log.method === 'DELETE' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-sky-500/10 text-sky-400'
                      }`}>
                        {log.method}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[10px] text-slate-300 font-medium">
                      {log.path}
                    </td>
                    <td className="px-6 py-3 text-[10px] font-mono text-slate-500">
                      {log.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
