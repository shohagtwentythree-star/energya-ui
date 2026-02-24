import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const FactoryReset = () => {
  const navigate = useNavigate();
  const [securityKey, setSecurityKey] = useState(""); // Changed from confirmText
  const [acknowledged, setAcknowledged] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // 🔑 Define the required key
  const MASTER_KEY = "Shohag4750";

  const handlePurge = async () => {
    // Client-side guard
    if (securityKey !== MASTER_KEY || !acknowledged) return;
    
    setIsWiping(true);
    try {
      const res = await fetch('http://localhost:3000/maintenance/database/factory-reset', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: securityKey }) // 🛡️ Send key to backend
      });

      const result = await res.json();

      if (res.ok) {
        alert("CRITICAL: SYSTEM PURGED. RELOADING ENVIRONMENT.");
        window.location.href = '/';
      } else {
        alert(`ACCESS DENIED: ${result.message}`);
      }
    } catch (err) { 
      alert("SYSTEM OFFLINE: Connection to engine failed."); 
    } finally { 
      setIsWiping(false); 
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      
      {/* 💀 DANGER HEADER */}
      <div className="text-center space-y-2">
        <div className="text-5xl animate-bounce drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">💀</div>
        <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Nuclear Reset</h1>
        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-[0.2em] animate-pulse">
            Deletes all pallets, users, and logs.
        </p>
      </div>

      <div className="bg-slate-900 border-2 border-rose-500/30 rounded-3xl p-6 space-y-6 shadow-2xl">
        
        {/* 1. ACKNOWLEDGMENT BOX */}
        <div className="flex items-start gap-4 bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
          <input 
            type="checkbox" 
            id="ack"
            checked={acknowledged} 
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 w-5 h-5 accent-rose-600 cursor-pointer"
          />
          <label htmlFor="ack" className="text-[10px] text-rose-200 font-bold uppercase leading-tight cursor-pointer select-none">
            I understand that this action is irreversible. All table data will be destroyed except for <span className="text-white underline">application.db</span>.
          </label>
        </div>

        {/* 2. SECURITY KEY INPUT */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Security Authorization Key</label>
            {securityKey === MASTER_KEY && (
                <span className="text-[8px] text-emerald-500 font-bold uppercase animate-pulse">Key Validated</span>
            )}
          </div>
          <input 
            type="password" // 🛡️ Use password type to hide the key while typing
            className={`w-full bg-black/40 border ${securityKey === MASTER_KEY ? 'border-emerald-500/50' : 'border-rose-500/30'} rounded-xl px-4 py-4 text-white text-center font-mono text-lg focus:border-rose-500 outline-none transition-all`}
            placeholder="••••••••"
            value={securityKey}
            onChange={(e) => setSecurityKey(e.target.value)}
          />
        </div>

        {/* 3. EXECUTE BUTTON */}
        <button 
          disabled={securityKey !== MASTER_KEY || !acknowledged || isWiping}
          onClick={handlePurge}
          className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all transform active:scale-95 shadow-xl ${
            securityKey === MASTER_KEY && acknowledged 
            ? 'bg-rose-600 text-white shadow-rose-900/40' 
            : 'bg-slate-800 text-slate-600'
          }`}
        >
          {isWiping ? "Executing Purge..." : "Confirm Factory Reset"}
        </button>

        <button 
            onClick={() => navigate(-1)}
            className="w-full py-2 text-[9px] text-slate-500 font-bold uppercase hover:text-white transition-colors"
        >
            Abort and Return
        </button>
      </div>
    </div>
  );
};

export default FactoryReset;
