import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/maintenance/backups';

// --- RECURSIVE DATA COMPONENT ---
const DataNode = ({ label, value, depth = 1 }) => {
  const [isExpanded, setIsExpanded] = useState(depth <= 5);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const maxDepth = 20;

  if (!isObject || depth > maxDepth) {
    return (
      <div className="flex gap-2 py-1 border-l border-white/5 pl-3 ml-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter shrink-0">{label}:</span>
        <span className="text-xs text-sky-300 break-all font-medium">
          {value === null ? 'null' : String(value)}
        </span>
      </div>
    );
  }

  const entries = isArray ? value : Object.entries(value);

  return (
    <div className="ml-1 mb-1">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full py-1.5 px-2 hover:bg-white/5 rounded-lg transition-colors text-left"
      >
        <span className={`text-[8px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] text-slate-600 font-bold">
          {isArray ? `[${value.length}]` : '{...}'}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-3 border-l border-sky-500/20 pl-2 animate-in slide-in-from-left-1">
          {entries.map((item, idx) => {
            const childLabel = isArray ? idx : item[0];
            const childValue = isArray ? item : item[1];
            return (
              <DataNode key={idx} label={childLabel} value={childValue} depth={depth + 1} />
            );
          })}
        </div>
      )}
    </div>
  );
};

const BackupManager = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('idle'); 
  const [logs, setLogs] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState(null);
  
  // INSPECTION STATES
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 3));
  };

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      if (data.status === 'success') setHistory(data.data);
    } catch (err) { addLog("Err: History fetch failed"); }
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const viewFileData = async (vName, fName) => {
    setIsPreviewLoading(true);
    setSearchQuery("");
    try {
      const res = await fetch(`${API_BASE}/${vName}/files/${fName}`);
      const result = await res.json();
      if (result.status === 'success') {
        setPreviewData({ name: fName, content: result.data });
      }
    } catch (err) { addLog("Err: Could not read archive"); }
    finally { setIsPreviewLoading(false); }
  };

  const triggerBackup = async () => {
    setStatus('loading');
    setShowConfirm(false);
    try {
      const res = await fetch(`${API_BASE}/trigger`, { method: 'POST' });
      if (res.ok) {
        setStatus('success');
        addLog("Snapshot Created");
        fetchHistory();
      }
    } catch (error) { setStatus('error'); addLog("Backup Failed"); }
  };

  const deleteVersion = async (vName) => {
    if (!window.confirm(`Permanently purge ${vName}?`)) return;
    try {
      await fetch(`${API_BASE}/${vName}`, { method: 'DELETE' });
      fetchHistory();
      if (expandedVersion === vName) setExpandedVersion(null);
    } catch (err) { addLog("Delete failed"); }
  };

  const filteredRecords = previewData?.content.filter(row => 
    JSON.stringify(row).toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-5 animate-in fade-in duration-500">
      
      {/* INDUSTRIAL HEADER */}
      <div className="flex items-center justify-between bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="flex items-center gap-3 z-10">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
            <h1 className="text-sm font-black text-white uppercase tracking-tighter">System Vault</h1>
        </div>
        
        <button 
          onClick={() => navigate('/database')}
          className="z-10 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-900/40 transition-all active:scale-95"
        >
          Live Data 📡
        </button>
      </div>

      {/* ACTION CARD */}
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          {!showConfirm && status !== 'loading' ? (
            <button onClick={() => setShowConfirm(true)} className="w-full py-4 bg-sky-600 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">
              Trigger New Snapshot
            </button>
          ) : status === 'loading' ? (
            <div className="w-full py-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-3 text-sky-400 font-bold text-xs uppercase">
              <div className="w-4 h-4 border-2 border-sky-400/20 border-t-sky-400 rounded-full animate-spin" />
              Compressing...
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={triggerBackup} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest">Confirm Sync</button>
              <button onClick={() => setShowConfirm(false)} className="px-5 py-4 bg-white/10 text-slate-400 rounded-xl font-black text-xs">X</button>
            </div>
          )}
        </div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500/20 to-transparent" />
      </div>

      {/* ARCHIVE LIST */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase text-slate-500 px-1 tracking-[0.2em]">Snapshot History</h2>
        {loadingHistory ? (
          <div className="py-20 text-center text-[10px] font-bold text-slate-700 uppercase animate-pulse">Accessing Encrypted Volumes...</div>
        ) : (
          history.map((item) => (
            <div key={item.versionName} className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-lg transition-all">
              <div 
                onClick={() => setExpandedVersion(expandedVersion === item.versionName ? null : item.versionName)}
                className="p-4 flex items-center justify-between cursor-pointer active:bg-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl border border-white/5">📦</div>
                  <div>
                    <div className="text-sm font-black text-slate-100 uppercase tracking-tight">{item.versionName}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase">
                      {item.sizeFormatted} • <span className="text-sky-500">{item.fileCount} Tables</span>
                    </div>
                  </div>
                </div>
                <div className={`text-slate-600 transition-transform ${expandedVersion === item.versionName ? 'rotate-180' : ''}`}>▼</div>
              </div>

              {expandedVersion === item.versionName && (
                <div className="p-4 pt-0 border-t border-white/5 bg-black/20 animate-in slide-in-from-top-2">
                  <div className="grid gap-2 mt-4">
                    {item.files.map(file => (
                      <button 
                        key={file} 
                        onClick={() => viewFileData(item.versionName, file)}
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-sky-500/10 transition-colors group"
                      >
                        <span className="text-xs font-mono text-slate-300 group-hover:text-sky-400">{file}</span>
                        <span className="text-[10px] text-sky-500 font-black uppercase tracking-tighter">Inspect ›</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => deleteVersion(item.versionName)} className="w-full mt-4 py-3 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl border border-rose-500/20 active:bg-rose-500/20 transition-all">
                    Purge from Vault
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* RECURSIVE DATA INSPECTOR MODAL */}
      {previewData && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-5 border-b border-white/10 bg-slate-900 flex justify-between items-center shadow-xl">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tighter">{previewData.name}</h3>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest italic">Archived Snapshot Data</p>
            </div>
            <button onClick={() => setPreviewData(null)} className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-2xl text-white text-2xl font-light">×</button>
          </div>

          <div className="p-4 bg-slate-900/50">
            <input 
              type="text"
              placeholder="Search archived records..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-sky-500/40"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12">
            {filteredRecords.length === 0 ? (
              <div className="py-20 text-center text-slate-600 text-sm italic">No data matched the query.</div>
            ) : (
              filteredRecords.map((row, i) => (
                <div key={row._id || i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Record #{i + 1}</span>
                    <span className="text-[9px] font-mono text-slate-600">ID: {row._id || '---'}</span>
                  </div>
                  
                  <div className="space-y-1">
                    {Object.entries(row).filter(([k]) => k !== '_id').map(([key, value]) => (
                      <DataNode key={key} label={key} value={value} depth={1} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PREVIEW LOADING OVERLAY */}
      {isPreviewLoading && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Decompressing Archive...</p>
        </div>
      )}
    </div>
  );
};

export default BackupManager;
