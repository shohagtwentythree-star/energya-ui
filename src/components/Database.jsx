import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/maintenance/database';

// --- RECURSIVE DATA COMPONENT (Optimized with Memo) ---
const DataNode = memo(({ label, value, depth = 1 }) => {
  // Level 1-5: Expanded by default | Level 6-20: Collapsed by default
  const [isExpanded, setIsExpanded] = useState(depth <= 5);
  
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const maxDepth = 20;

  if (!isObject || depth > maxDepth) {
    return (
      <div className="flex gap-2 py-1 border-l border-white/5 pl-3 ml-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter shrink-0">{label}:</span>
        <span className="text-xs text-blue-300 break-all font-medium">
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
        <span className={`text-[8px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] text-slate-600 font-bold">
          {isArray ? `[${value.length}]` : '{...}'}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-3 border-l border-blue-500/20 pl-2 animate-in slide-in-from-left-1 duration-200">
          {entries.map((item, idx) => {
            const childLabel = isArray ? idx : item[0];
            const childValue = isArray ? item : item[1];
            return (
              <DataNode 
                key={`${childLabel}-${idx}`} 
                label={childLabel} 
                value={childValue} 
                depth={depth + 1} 
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

const Database = () => {
  const navigate = useNavigate();
  const [dbFiles, setDbFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(null); 
  const [isReading, setIsReading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Memoized fetcher to avoid recreation on re-renders
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      if (json.status === 'success') setDbFiles(json.data);
    } catch (err) {
      console.error("Fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const openInspector = async (fileName) => {
    setIsReading(true);
    setSearchQuery("");
    try {
      const res = await fetch(`${API_BASE}/${fileName}`);
      const json = await res.json();
      if (json.status === 'success') {
        setInspecting({ name: fileName, records: json.data });
      }
    } catch (err) {
      alert("System Stream Error");
    } finally { 
      setIsReading(false); 
    }
  };

  // Performance: Memoize filtered records to prevent heavy JSON stringify on every render
  const filteredRecords = useMemo(() => {
    if (!inspecting) return [];
    if (!searchQuery) return inspecting.records;
    
    const query = searchQuery.toLowerCase();
    return inspecting.records.filter(row => 
      JSON.stringify(row).toLowerCase().includes(query)
    );
  }, [inspecting, searchQuery]);

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-5 animate-in fade-in duration-500 selection:bg-blue-500/30">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl relative">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <h1 className="text-sm font-black text-white uppercase tracking-tighter">Live Engine</h1>
        </div>
        <button 
          onClick={() => navigate('/backup')}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase rounded-lg shadow-lg active:scale-95 transition-all"
        >
          Backups
        </button>
      </div>

      {/* STORAGE SUMMARY */}
      <div className="bg-slate-900 border border-white/5 p-5 rounded-2xl flex items-center justify-between shadow-xl">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Storage</p>
          <p className="text-xl font-black text-white">{dbFiles.length} Active Tables</p>
        </div>
        <button 
          onClick={fetchFiles} 
          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 active:rotate-180 transition-all duration-500"
        >
          🔄
        </button>
      </div>

      {/* TABLE LIST */}
      <div className="space-y-3">
        {loading ? (
            <div className="py-20 text-center text-xs font-bold text-slate-700 animate-pulse uppercase tracking-[0.2em]">Syncing Core...</div>
        ) : (
          dbFiles.map(file => (
            <div 
              key={file.name} 
              onClick={() => openInspector(file.name)}
              className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between active:bg-blue-600/10 hover:border-blue-500/30 transition-all cursor-pointer shadow-lg group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl border border-white/5 group-hover:scale-110 transition-transform">📑</div>
                <div>
                  <div className="text-sm font-black text-slate-200 uppercase tracking-tight">{file.name.replace('.db', '')}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Size: <span className="text-blue-400 font-mono">{file.size}</span></div>
                </div>
              </div>
              <div className="text-slate-700 group-hover:text-blue-500 transition-colors text-xl">›</div>
            </div>
          ))
        )}
      </div>

      {/* FULL SCREEN RECURSIVE INSPECTOR */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-5 border-b border-white/10 bg-slate-900 flex justify-between items-center shadow-xl">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tighter">{inspecting.name}</h3>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Recursive Inspector</p>
            </div>
            <button 
              onClick={() => setInspecting(null)} 
              className="w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-red-500/20 rounded-2xl text-white text-2xl font-light transition-colors"
            >
              ×
            </button>
          </div>

          <div className="p-4 bg-slate-900/50">
            <input 
              type="text"
              placeholder="Filter table content..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-700 outline-none focus:border-blue-500/40 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-12 custom-scrollbar">
            {filteredRecords.length === 0 ? (
              <div className="py-20 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">No matching records found</div>
            ) : (
              filteredRecords.map((row, i) => (
                <div key={row._id || i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 shadow-inner hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Record #{i + 1}</span>
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

      {/* LOADING OVERLAY */}
      {isReading && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Parsing Data Tree...</p>
        </div>
      )}
    </div>
  );
};

export default Database;
