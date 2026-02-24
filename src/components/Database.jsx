import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/maintenance/database';
const RECORDS_PER_PAGE = 20; // 🛡️ Limits DOM nodes to prevent crashes

// --- RECURSIVE DATA NODE (Memoized) ---
const DataNode = memo(({ label, value, depth = 1 }) => {
  const [isExpanded, setIsExpanded] = useState(depth <= 2);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  if (!isObject || depth > 10) {
    return (
      <div className="flex gap-2 py-0.5 border-l border-white/5 pl-3 ml-1">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter shrink-0">{label}:</span>
        <span className="text-[11px] text-blue-300 break-all font-medium">
          {value === null ? 'null' : String(value)}
        </span>
      </div>
    );
  }

  return (
    <div className="ml-1 mb-0.5">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 py-1 px-1.5 hover:bg-white/5 rounded transition-colors text-left"
      >
        <span className={`text-[7px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </button>

      {isExpanded && (
        <div className="ml-2 border-l border-blue-500/20 pl-2">
          {Object.entries(value).map(([k, v], idx) => (
            <DataNode key={idx} label={k} value={v} depth={depth + 1} />
          ))}
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
  
  // --- PAGINATION STATE ---
  const [visibleCount, setVisibleCount] = useState(RECORDS_PER_PAGE);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      if (json.status === 'success') setDbFiles(json.data);
    } catch (err) { console.error("Vault offline"); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const openInspector = async (fileName) => {
    setIsReading(true);
    setSearchQuery("");
    setVisibleCount(RECORDS_PER_PAGE); // Reset pagination
    try {
      const res = await fetch(`${API_BASE}/${fileName}`);
      const json = await res.json();
      if (json.status === 'success') {
        setInspecting({ name: fileName, records: json.data });
      }
    } finally { setIsReading(false); }
  };

  // 🛡️ MEMOIZED FILTERING
  const filteredRecords = useMemo(() => {
    if (!inspecting) return [];
    if (!searchQuery) return inspecting.records;
    const q = searchQuery.toLowerCase();
    return inspecting.records.filter(row => 
      JSON.stringify(row).toLowerCase().includes(q)
    );
  }, [inspecting, searchQuery]);

  // 🛡️ SLICED DATA FOR RENDERING
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(0, visibleCount);
  }, [filteredRecords, visibleCount]);

  // 🛡️ INFINITE SCROLL HANDLER
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredRecords.length) {
        setVisibleCount(prev => prev + RECORDS_PER_PAGE);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-5">
      
      {/* HEADER */}
      <div className="flex items-center justify-between bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
            <h1 className="text-sm font-black text-white uppercase tracking-tighter">Live Engine</h1>
        </div>
        <button onClick={() => navigate('/backup')} className="px-4 py-2 bg-sky-600 text-white text-[10px] font-black uppercase rounded-lg">Backups</button>
      </div>

      {/* TABLE LIST */}
      <div className="space-y-3">
        {loading ? (
            <div className="py-20 text-center text-[10px] font-black text-slate-700 animate-pulse uppercase tracking-widest">Accessing Tables...</div>
        ) : (
          dbFiles.map(file => (
            <div key={file.name} onClick={() => openInspector(file.name)} className="bg-slate-900 border border-white/10 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="text-xl">📑</div>
                <div>
                  <div className="text-sm font-black text-slate-200 uppercase tracking-tight">{file.name.replace('.db', '')}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Size: <span className="text-blue-400">{file.size}</span></div>
                </div>
              </div>
              <div className="text-slate-700">›</div>
            </div>
          ))
        )}
      </div>

      {/* RECURSIVE INSPECTOR WITH INFINITE SCROLL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-5 border-b border-white/10 bg-slate-900 flex justify-between items-center shadow-xl">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-tighter">{inspecting.name}</h3>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                Showing {paginatedRecords.length} of {filteredRecords.length}
              </p>
            </div>
            <button onClick={() => setInspecting(null)} className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-2xl text-white text-2xl">×</button>
          </div>

          <div className="p-4 bg-slate-900/50">
            <input 
              type="text"
              placeholder="Filter current table..."
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(RECORDS_PER_PAGE); // Reset pagination on search
              }}
            />
          </div>

          {/* 🛡️ SCROLLABLE AREA */}
          <div 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar"
          >
            {paginatedRecords.map((row, i) => (
              <div key={row.id || i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 shadow-inner">
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Record #{i + 1}</span>
                  <span className="text-[9px] font-mono text-slate-600">ID: {row.id || '---'}</span>
                </div>
                
                <div className="space-y-1">
                  {Object.entries(row).filter(([k]) => k !== 'id').map(([key, value]) => (
                    <DataNode key={key} label={key} value={value} depth={1} />
                  ))}
                </div>
              </div>
            ))}

            {visibleCount < filteredRecords.length && (
              <div className="py-10 text-center">
                <div className="inline-block px-6 py-2 bg-blue-600/10 border border-blue-500/20 text-blue-500 text-[10px] font-black uppercase rounded-full animate-pulse">
                  Scroll to load more units...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* READING OVERLAY */}
      {isReading && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
            <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Parsing Engine Data...</p>
        </div>
      )}
    </div>
  );
};

export default Database;
