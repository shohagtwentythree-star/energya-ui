import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/maintenance/backups';

const RestoreManager = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // States
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | staging | processing | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null); // For internal rollback
  const [stagedFile, setStagedFile] = useState(null); // For ZIP restore
  const [confirmInput, setConfirmInput] = useState(""); // 🛡️ Text challenge state

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch(API_BASE);
      const d = await res.json();
      if (d.status === 'success') setHistory(d.data);
    } catch (err) {
      console.error("Vault offline");
    }
  };

  // Reset helper to clear confirmation data
  const resetConfirmation = () => {
    setConfirmTarget(null);
    setStagedFile(null);
    setConfirmInput("");
    setStatus('idle');
  };

  // --- STAGE 1: FILE SELECTION ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      alert("UNAUTHORIZED FORMAT: Only .zip archives are accepted.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert("FILE TOO LARGE: Maximum recovery size is 50MB.");
      return;
    }

    setStagedFile(file);
    setStatus('staging');
  };

  // --- STAGE 2: EXECUTION ---
  const executeZipRestore = async () => {
    if (confirmInput !== "CONFIRM") return;
    
    const formData = new FormData();
    formData.append('backupZip', stagedFile);

    setStatus('processing');
    try {
      const res = await fetch(`${API_BASE}/restore-from-zip`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) setStatus('success');
      else {
        const errData = await res.json();
        throw new Error(errData.message || "Extraction Failed");
      }
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  const handleInternalRestore = async (versionName) => {
    if (confirmInput !== "CONFIRM") return;

    setStatus('processing');
    try {
      const res = await fetch(`${API_BASE}/${versionName}/restore`, { method: 'POST' });
      if (res.ok) setStatus('success');
      else throw new Error("Vault Rollback Failed");
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  };

  // --- UI RENDER: SUCCESS STATE ---
  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[200] bg-emerald-600 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-5xl mb-6 text-white animate-bounce">✓</div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter italic">System Restored</h1>
        <p className="text-emerald-100 mt-2 font-bold uppercase text-xs tracking-[0.3em]">The database has been reconstructed.</p>
        <div className="mt-8 p-4 bg-black/10 rounded-xl border border-white/10">
            <p className="text-[10px] text-white font-black uppercase">Server has stopped. Manual restart required.</p>
        </div>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-10 py-4 bg-white text-emerald-700 font-black rounded-2xl uppercase text-xs shadow-2xl active:scale-95 transition-all">Re-initialize Application</button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
      
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-slate-900 rounded-xl text-slate-400">←</button>
        <div>
          <h1 className="text-sm font-black text-white uppercase tracking-tight">Recovery Manager</h1>
          <p className="text-[9px] text-rose-500 font-bold uppercase animate-pulse">Caution: Destructive Operations</p>
        </div>
      </div>

      {/* 1. EXTERNAL ZIP RESTORE */}
      <div className={`bg-slate-900 border-2 rounded-3xl transition-all duration-500 overflow-hidden ${status === 'staging' ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.3)]' : 'border-dashed border-sky-500/20'}`}>
        <div className="p-6">
            {status !== 'staging' ? (
                <div className="text-center">
                    <div className="text-3xl mb-3">📦</div>
                    <h3 className="text-sm font-black text-white uppercase">External Archive</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 mb-4">Upload a .zip backup</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".zip" onChange={handleFileSelect} />
                    <button onClick={() => fileInputRef.current.click()} className="w-full py-3 bg-sky-600/10 text-sky-400 border border-sky-500/30 font-black text-[10px] uppercase rounded-xl hover:bg-sky-600 hover:text-white transition-all">Select ZIP File</button>
                </div>
            ) : (
                <div className="space-y-4 animate-in zoom-in-95">
                    <div className="text-center">
                        <div className="inline-block p-2 px-4 bg-rose-500/10 border border-rose-500/20 rounded-full mb-2">
                            <span className="text-[10px] font-mono text-rose-500 font-black">{stagedFile.name}</span>
                        </div>
                        <h3 className="text-xs font-black text-white uppercase italic">Authorization Required</h3>
                    </div>

                    {/* Challenge Input */}
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                        <label className="text-[9px] text-slate-500 font-black uppercase mb-2 block">Type <span className="text-rose-500">CONFIRM</span> to overwrite all data</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-800 border border-rose-500/30 rounded-lg px-3 py-2 text-white text-sm font-mono text-center outline-none focus:border-rose-500 transition-colors"
                            placeholder="Type here..."
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button 
                            disabled={confirmInput !== "CONFIRM"}
                            onClick={executeZipRestore} 
                            className="flex-[2] py-3 bg-rose-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-[10px] uppercase rounded-xl transition-all shadow-lg shadow-rose-900/40"
                        >
                            Execute Recovery
                        </button>
                        <button onClick={resetConfirmation} className="flex-1 py-3 bg-white/5 text-slate-400 font-black text-[10px] uppercase rounded-xl">Cancel</button>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* 2. VAULT ROLLBACK SECTION */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">System Snapshots</h3>
        {history.map(item => (
          <div key={item.versionName} className={`bg-slate-900 border transition-all rounded-2xl overflow-hidden ${confirmTarget === item.versionName ? 'border-amber-500/50' : 'border-white/5'}`}>
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-200 uppercase tracking-tight">{item.versionName}</div>
                <div className="text-[9px] text-slate-500 font-bold mt-0.5 uppercase">{item.sizeFormatted} • Internal</div>
              </div>
              <button 
                onClick={() => {
                    setConfirmInput("");
                    setConfirmTarget(confirmTarget === item.versionName ? null : item.versionName);
                }}
                className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${confirmTarget === item.versionName ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-400'}`}
              >
                {confirmTarget === item.versionName ? 'Cancel' : 'Rollback'}
              </button>
            </div>

            {confirmTarget === item.versionName && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-4">
                  <p className="text-[9px] text-amber-200 font-black uppercase text-center leading-tight">Authorize system revert by typing <span className="text-amber-500">CONFIRM</span></p>
                  
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-amber-500/30 rounded-lg px-3 py-2 text-white text-sm font-mono text-center outline-none focus:border-amber-500 transition-colors"
                    placeholder="CONFIRM"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                  />

                  <button 
                    disabled={confirmInput !== "CONFIRM"}
                    onClick={() => handleInternalRestore(item.versionName)} 
                    className="w-full py-3 bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 text-black font-black text-[10px] uppercase rounded-xl active:scale-95 transition-all"
                  >
                    Confirm System Rollback
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ERROR MODAL */}
      {status === 'error' && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center">
              <p className="text-[10px] text-rose-500 font-black uppercase mb-2">CRITICAL: {errorMessage}</p>
              <button onClick={() => setStatus('idle')} className="text-[9px] text-white underline font-bold uppercase">Dismiss</button>
          </div>
      )}

      {/* PROCESSING LOCKOUT */}
      {status === 'processing' && (
        <div className="fixed inset-0 z-[300] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-8" />
          <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] italic">Reconstructing...</h2>
        </div>
      )}
    </div>
  );
};

export default RestoreManager;
