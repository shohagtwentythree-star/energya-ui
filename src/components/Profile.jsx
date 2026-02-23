import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Profile({ user, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  // --- 1. DEFINE FETCH LOGIC ---
  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Assuming your Express server is on the same host or proxied
      const response = await fetch('/logs');
      const result = await response.json();
      
      if (result.status === "success") {
        setLogs(result.data);
      }
    } catch (error) {
      console.error("Log Fetch Error:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // --- 2. TRIGGER INITIAL LOAD ---
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle Logout
  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#18191a] text-[#e4e6eb] pb-12 font-sans">
      
      {/* --- HEADER SECTION --- */}
      <div className="bg-[#242526] shadow-md border-b border-[#3e4042]">
        <div className="h-44 md:h-72 bg-gradient-to-br from-[#1c1e21] via-[#242526] to-[#0866ff] w-full relative">
          <div className="absolute -bottom-16 left-4 md:left-10 flex items-end gap-5">
            <div className="relative">
              <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-[#242526] bg-[#3a3b3c] overflow-hidden flex items-center justify-center shadow-2xl">
                <span className="text-5xl font-bold text-white">
                  {user?.username?.substring(0, 1).toUpperCase()}
                </span>
              </div>
              <div className="absolute bottom-4 right-4 w-6 h-6 bg-green-500 border-4 border-[#242526] rounded-full"></div>
            </div>
            
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {user?.username}
              </h1>
              <p className="text-[#b0b3b8] font-semibold text-sm mt-1">
                {user?.role || 'Senior System Administrator'}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-10 mt-16 flex justify-between items-center py-1">
          <div className="flex gap-2 md:gap-4 text-[#b0b3b8] font-bold text-[15px]">
            <span className="border-b-4 border-[#0866ff] py-4 text-[#0866ff] px-2 cursor-pointer">Activity Logs</span>
            <span className="py-4 hover:bg-[#3a3b3c] px-4 rounded-lg cursor-pointer transition-colors mt-1 mb-1">About</span>
          </div>
          <button 
            onClick={handleLogout}
            className="bg-[#4e4f50] hover:bg-[#5f6162] text-white font-bold py-2 px-5 rounded-lg transition-all text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      <div className="max-w-5xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#242526] p-4 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Intro</h2>
            <div className="space-y-4 text-[15px]">
              <div className="flex items-center gap-3">
                <span className="text-xl">📡</span>
                <span>Status: <b className="text-green-400">Node Online</b></span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <span>Access Level: <span className="bg-[#3a3b3c] px-2 py-0.5 rounded text-xs">Tier 3</span></span>
              </div>
            </div>
          </div>

          <div className="bg-[#242526] p-4 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">System Health</h2>
            <div className="grid grid-cols-3 gap-2">
                {[
                  { l: 'Logs', v: logs.length, c: 'text-blue-400' },
                  { l: 'CPU', v: '12%', c: 'text-green-400' },
                  { l: 'Latency', v: '24ms', c: 'text-purple-400' }
                ].map((item, i) => (
                  <div key={i} className="bg-[#1c1e21] aspect-square rounded-lg flex flex-col items-center justify-center border border-[#3e4042]">
                    <span className={`text-lg font-black ${item.c}`}>{item.v}</span>
                    <span className="text-[10px] uppercase text-[#b0b3b8] font-bold tracking-tighter">{item.l}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#242526] p-4 rounded-xl shadow-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#3a3b3c] flex items-center justify-center font-bold text-xs">
                {user?.username?.substring(0, 1).toUpperCase()}
            </div>
            <button 
                onClick={fetchLogs}
                disabled={isRefreshing}
                className={`flex-1 text-left bg-[#3a3b3c] hover:bg-[#4e4f50] py-2.5 px-5 rounded-full text-[#b0b3b8] transition duration-200 ${isRefreshing ? 'opacity-50' : ''}`}
            >
                {isRefreshing ? 'Updating feed...' : `Sync system logs, ${user?.username}?`}
            </button>
          </div>

          {loading ? (
             <div className="bg-[#242526] p-12 rounded-xl text-center">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-[#0866ff] border-t-transparent rounded-full mb-4"></div>
                <p className="text-[#b0b3b8] font-bold uppercase tracking-widest text-xs">Synchronizing Activity...</p>
             </div>
          ) : (
            logs.map((log) => (
              <div key={log._id || Math.random()} className="bg-[#242526] rounded-xl shadow-lg border border-[#3e4042] overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-black ${
                        log.method === 'POST' ? 'bg-emerald-600' : 
                        log.method === 'DELETE' ? 'bg-rose-600' : 'bg-[#0866ff]'
                    }`}>
                      {log.method ? log.method[0] : 'G'}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#e4e6eb]">
                        Action: <span className="text-[#0866ff]">{log.method}</span>
                      </h4>
                      <p className="text-xs text-[#b0b3b8]">
                        {new Date(log.timestamp).toLocaleDateString()} • {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded ${
                    log.status < 400 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    STATUS {log.status}
                  </span>
                </div>

                <div className="px-4 pb-4">
                  <div className="bg-[#1c1e21] rounded-lg p-3 border border-[#3e4042]">
                    <p className="text-sm font-mono text-[#b0b3b8] break-all">
                      <span className="text-emerald-500">path:</span> {log.path}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
