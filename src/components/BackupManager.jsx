import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:3000/maintenance/backups';
const RECORDS_PER_PAGE = 20; // 🛡️ Load limit per scroll trigger

// --- RECURSIVE DATA COMPONENT (Memoized for Performance) ---
const DataNode = memo(({ label, value, depth = 1 }) => {
  const [isExpanded, setIsExpanded] = useState(depth <= 2);
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);

  if (!isObject) {
    return (
      <div className="flex gap-2 py-0.5 border-l border-white/5 pl-3 ml-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter shrink-0">{label}:</span>
        <span className="text-[11px] text-sky-300 break-all font-medium">
          {value === null ? 'null' : String(value)}
        </span>
      </div>
    );
  }

  return (
    <div className="ml-1 mb-1">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full py-1 px-2 hover:bg-white/5 rounded transition-colors text-left"
      >
        <span className={`text-[8px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <span className="text-[9px] text-slate-600 font-bold">{isArray ? `[${value.length}]` : '{...}'}</span>
      </button>

      {isExpanded && (
        <div className="ml-3 border-l border-sky-500/20 pl-2">
          {Object.entries(value).map(([childKey, childValue], idx) => (
            <DataNode key={idx} label={childKey} value={childValue} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

const BackupManager = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('idle');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // --- PAGINATION STATE ---
  const [visibleCount, setVisibleCount] = useState(RECORDS_PER_PAGE);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      if (data.status === 'success') setHistory(data.data);
    } catch (err) { setStatus('error'); } 
    finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const viewFileData = async (vName, fName) => {
    setIsPreviewLoading(true);
    setSearchQuery("");
    setVisibleCount(RECORDS_PER_PAGE); // Reset pagination for new file
    try {
      const res = await fetch(`${API_BASE}/${vName}/files/${fName}`);
      const result = await res.json();
      if (result.status === 'success') setPreviewData({ name: fName, content: result.data });
    } finally { setIsPreviewLoading(false); }
  };

  // 🛡️ MEMOIZED FILTERING (Prevents lag during typing)
  const filteredRecords = useMemo(() => {
    if (!previewData) return [];
    if (!searchQuery) return previewData.content;
    const q = searchQuery.toLowerCase();
    return previewData.content.filter(row => JSON.stringify(row).toLowerCase().includes(q));
  }, [previewData, searchQuery]);

  // 🛡️ PAGINATED SUBSET
  const paginatedRecords = useMemo(() => {
    return filteredRecords.slice(0, visibleCount);
  }, [filteredRecords, visibleCount]);

  // 🛡️ SCROLL HANDLER (Triggers loading more)
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (visibleCount < filteredRecords.length) {
        setVisibleCount(prev => prev + RECORDS_PER_PAGE);
      }
    }
  };

  // --- OTHER LOGIC (Trigger/Delete/Download) PRESERVED ---
  const triggerBackup = async () => {
    setStatus('loading');
    setShowConfirm(false);
    try {
      const res = await fetch(`${API_BASE}/trigger`, { method: 'POST' });
      if (res.ok) { setStatus('success'); fetchHistory(); setTimeout(() => setStatus('idle'), 3000); }
    } catch (error) { setStatus('error'); setTimeout(() => setStatus('idle'), 3000); }
  };

  const deleteVersion = async (vName) => {
    try {
      const res = await fetch(`${API_BASE}/${vName}`, { method: 'DELETE' });
      if (res.ok) { setDeleteConfirm(null); fetchHistory(); }
    } catch (err) { alert("Purge failed"); }
  };

  const downloadBackup = async (item) => {
    try {
      const response = await fetch(`${API_BASE}/${item.versionName}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Backup_${item.versionName}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert("Download failed"); }
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-5">
      {/* 1. VAULT HEADER */}
      <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${status === 'loading' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`} />
                <h1 className="text-sm font-black text-white uppercase tracking-widest">Vault Control</h1>
            </div>
            <div className="flex gap-2">
                <button onClick={() => navigate('/restore')} className="px-3 py-1.5 bg-amber-600/10 text-amber-500 border border-amber-600/30 text-[10px] font-black uppercase rounded-lg">Restore</button>
                <button onClick={() => navigate('/database')} className="px-3 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-600/30 text-[10px] font-black uppercase rounded-lg">Live</button>
            </div>
        </div>
      </div>

      {/* 2. GUARDED TRIGGER PANEL (Preserved) */}
      <div className="bg-slate-900 border border-white/10 rounded-3xl p-1 overflow-hidden">
        {status === 'loading' ? (
          <div className="w-full py-4 bg-slate-800 text-slate-500 font-black text-xs uppercase flex items-center justify-center gap-3 rounded-[22px]">
            <div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            Encrypting...
          </div>
        ) : !showConfirm ? (
          <button onClick={() => setShowConfirm(true)} className="w-full py-4 bg-sky-600 text-white rounded-[22px] font-black text-xs uppercase tracking-[0.2em] shadow-lg">
            Trigger New Snapshot
          </button>
        ) : (
          <div className="flex gap-1">
            <button onClick={triggerBackup} className="flex-[2] py-4 bg-emerald-600 text-white rounded-l-[22px] rounded-r-lg font-black text-xs uppercase tracking-widest shadow-xl">
              Confirm Sync Now
            </button>
            <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 bg-white/5 text-slate-400 rounded-r-[22px] rounded-l-lg font-black text-xs uppercase">
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* 3. SNAPSHOT LIST (History) */}
      <div className="space-y-3">
        <div className="flex justify-between px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <span>Archive History</span>
            <span>{history.length} Units</span>
        </div>

        {loadingHistory ? (
          <div className="py-20 text-center animate-pulse text-[10px] text-slate-600 font-bold uppercase tracking-widest">Reading Disk...</div>
        ) : (
          history.map((item) => (
            <div key={item.versionName} className={`bg-slate-900 border transition-all rounded-2xl overflow-hidden ${expandedVersion === item.versionName ? 'border-sky-500/30 shadow-lg shadow-sky-900/10' : 'border-white/5'}`}>
              <div onClick={() => setExpandedVersion(expandedVersion === item.versionName ? null : item.versionName)} className="p-4 flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${expandedVersion === item.versionName ? 'bg-sky-500/20 border-sky-500/40' : 'bg-white/5 border-white/5'}`}>
                    <span className="text-xs">📦</span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-100 uppercase italic tracking-tighter">{item.versionName}</div>
                    <div className="text-[9px] text-slate-500 font-bold mt-0.5 uppercase tracking-widest">{item.sizeFormatted} • {item.fileCount} Tables</div>
                  </div>
                </div>
                <div className={`text-slate-600 transition-transform ${expandedVersion === item.versionName ? 'rotate-180' : ''}`}>▼</div>
              </div>

              {expandedVersion === item.versionName && (
                <div className="p-4 pt-0 bg-black/20 animate-in slide-in-from-top-2">
                  <div className="grid gap-1.5 mt-2">
                    {item.files.map(file => (
                      <button key={file} onClick={() => viewFileData(item.versionName, file)} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-sky-500/10 group transition-colors">
                        <span className="text-[11px] font-mono text-slate-300 group-hover:text-sky-400">{file}</span>
                        <span className="text-[9px] text-sky-500 font-black uppercase">Inspect ›</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                    <button onClick={() => downloadBackup(item)} className="flex-1 py-3 bg-white/5 text-slate-300 text-[10px] font-black uppercase rounded-xl border border-white/5">Export ZIP</button>
                    {deleteConfirm === item.versionName ? (
                        <div className="flex gap-1 flex-1">
                            <button onClick={() => deleteVersion(item.versionName)} className="flex-1 py-3 bg-rose-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg">Confirm</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-3 bg-slate-800 text-slate-400 text-[10px] font-black uppercase rounded-xl font-bold">X</button>
                        </div>
                    ) : (
                        <button onClick={() => setDeleteConfirm(item.versionName)} className="flex-1 py-3 bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase rounded-xl border border-rose-500/20">Purge</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 4. OPTIMIZED INSPECTOR MODAL */}
      {previewData && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="p-5 border-b border-white/10 bg-slate-900 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tighter">{previewData.name}</h3>
              <p className="text-[9px] text-sky-500 font-bold uppercase tracking-widest">Showing {paginatedRecords.length} of {filteredRecords.length}</p>
            </div>
            <button onClick={() => setPreviewData(null)} className="w-10 h-10 bg-white/10 rounded-xl text-white text-xl">×</button>
          </div>

          <div className="p-4 bg-slate-900/50">
            <input 
              type="text"
              placeholder="Filter current archive..."
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-sky-500/40 outline-none placeholder:text-slate-700"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(RECORDS_PER_PAGE); // Reset count on search
              }}
            />
          </div>

          <div 
            onScroll={handleScroll} 
            className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar"
          >
            {paginatedRecords.map((row, i) => (
              <div key={row.id || i} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 shadow-sm">
                <div className="flex justify-between items-center mb-2 opacity-30">
                    <span className="text-[8px] font-black text-white uppercase">REC_{i+1}</span>
                    <span className="text-[8px] font-mono text-white">{row.id || 'NOid'}</span>
                </div>
                {Object.entries(row).filter(([k]) => k !== 'id').map(([k, v]) => (
                  <DataNode key={k} label={k} value={v} />
                ))}
              </div>
            ))}
            
            {visibleCount < filteredRecords.length && (
              <div className="py-10 text-center animate-pulse text-[10px] text-sky-500 font-black uppercase tracking-widest">
                Scroll for more records...
              </div>
            )}
            
            {filteredRecords.length === 0 && <div className="text-center py-20 text-[10px] text-slate-600 font-black uppercase tracking-widest">No Matches Found</div>}
          </div>
        </div>
      )}

      {/* 5. LOADING OVERLAY */}
      {isPreviewLoading && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Extracting...</span>
            </div>
        </div>
      )}
    </div>
  );
};

export default BackupManager;
