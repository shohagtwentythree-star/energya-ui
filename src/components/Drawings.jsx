import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";

const API_URL = 'http://localhost:3000/drawings/';

const STATUS_WORKFLOW = [
  'new', 'waiting', 'fabricating', 'welding', 'cleaning', 'inspection', 'complete', 'delivered'
];

const ACTIVE_STATUS_KEY = 'drawings_active_status_tab';

export default function Drawings() {
  const navigate = useNavigate();

  // --- STATE ---
  const [activeStatus, setActiveStatus] = useState(() => {
    const saved = localStorage.getItem(ACTIVE_STATUS_KEY);
    return saved && STATUS_WORKFLOW.includes(saved) ? saved : STATUS_WORKFLOW[0];
  });

  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [notification, setNotification] = useState(null);

  // --- PERSISTENCE & TOASTS ---
  useEffect(() => {
    localStorage.setItem(ACTIVE_STATUS_KEY, activeStatus);
  }, [activeStatus]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showToast = useCallback((message, type = 'success') => {
    setNotification({ message, type });
  }, []);

  // --- DATA FETCHING ---
  const fetchDrawings = useCallback(async () => {
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.status === "success") {
        const cleanedData = result.data.map(d => ({
          ...d,
          status: (d.status || 'new').toLowerCase()
        }));
        setDrawings(cleanedData);
      }
    } catch (error) { 
      showToast("Critical: Failed to sync with database", "error");
    } finally { 
      setLoading(false); 
    }
  }, [showToast]);

  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  // --- LOGIC HELPERS ---
  const getNextAvailableSN = useCallback(() => {
    const waitingSns = drawings
      .filter(d => d.status === 'waiting' && d.serialNumber)
      .map(d => Number(d.serialNumber))
      .sort((a, b) => a - b);
    
    let next = 1;
    for (let sn of waitingSns) {
      if (sn === next) next++;
      else if (sn > next) break;
    }
    return next;
  }, [drawings]);

  const getCounts = useCallback((dwg) => {
    const multiplier = Number(dwg.dwgQty) || 1;
    if (!dwg.plates || dwg.plates.length === 0) {
      return { found: dwg.foundCount || 0, total: (dwg.totalPlates || 0) * multiplier };
    }
    const total = dwg.plates.reduce((acc, p) => acc + (Number(p.qty) * multiplier), 0);
    const found = dwg.plates.reduce((acc, p) => acc + (Number(p.foundCount) || 0), 0);
    return { found, total };
  }, []);

  // --- MEMOIZED DATA ---
  const filteredDrawings = useMemo(() => {
    const lowerSearch = searchTerm.toLowerCase();
    return drawings.filter(dwg => {
      const matchesSearch = dwg.drawingNumber?.toLowerCase().includes(lowerSearch) || 
                            dwg.plates?.some(p => p.mark?.toLowerCase().includes(lowerSearch));
      const matchesStatus = dwg.status === activeStatus;
      return matchesSearch && matchesStatus;
    });
  }, [drawings, searchTerm, activeStatus]);

  const statusCounts = useMemo(() => {
    return STATUS_WORKFLOW.reduce((acc, status) => {
      acc[status] = drawings.filter(d => d.status === status).length;
      return acc;
    }, {});
  }, [drawings]);

  const globalStats = useMemo(() => ({
    total: drawings.length,
    completed: drawings.filter(d => d.status === 'complete' || d.status === 'delivered').length
  }), [drawings]);

  // --- ACTIONS ---
  const updateStatus = async (e, dwg, direction, manualSN = null) => {
    if (e) e.stopPropagation(); 
    const currentIndex = STATUS_WORKFLOW.indexOf(dwg.status);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (currentIndex === -1 || newIndex < 0 || newIndex >= STATUS_WORKFLOW.length) {
      showToast("Invalid status transition", "error");
      return;
    }

    const newStatus = STATUS_WORKFLOW[newIndex];
    let assignedSN = dwg.serialNumber;

    if (newStatus === 'waiting') {
      assignedSN = manualSN || dwg.serialNumber || getNextAvailableSN();
    } else if (newStatus === 'new') {
      assignedSN = null;
    }

    const oldDrawings = [...drawings];
    setDrawings(prev => prev.map(d => 
      d.id === dwg.id ? { ...d, status: newStatus, serialNumber: assignedSN } : d
    ));

    try {
      const response = await fetch(API_URL + dwg.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, serialNumber: assignedSN })
      });
      if (!response.ok) throw new Error("Server failed");
      showToast(`${dwg.drawingNumber} → ${newStatus.toUpperCase()}`);
    } catch (error) {
      showToast(error.message, "error");
      setDrawings(oldDrawings);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs tracking-[0.3em]">Syncing Drawing DB...</p>
    </div>
  );

  return (
    <div className="w-full p-4 space-y-6 relative selection:bg-sky-500/30">
      
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border animate-in fade-in slide-in-from-top-10 duration-500 ${
          notification.type === 'error' ? 'bg-red-950/90 border-red-500 text-red-100' : 'bg-slate-900/90 border-sky-500 text-sky-100'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${notification.type === 'error' ? 'bg-red-500' : 'bg-sky-500'}`} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{notification.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase leading-none">Control<span className="text-sky-500">.</span>Panel</h1>
          <div className="flex gap-5 mt-4">
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Database Size</span>
                <span className="text-lg font-mono font-bold text-white">{globalStats.total} DWG</span>
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dispatch Ready</span>
                <span className="text-lg font-mono font-bold text-emerald-500">{globalStats.completed} UNIT</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <input 
              type="text" 
              placeholder="FILTER BY MARK OR DWG..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:w-72 bg-slate-900/50 border border-slate-800 rounded-2xl py-4 px-12 text-white text-xs font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all placeholder:text-slate-600"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
          </div>
          <button 
            onClick={() => navigate('/drawings/add')} 
            className="bg-sky-600 hover:bg-sky-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 shadow-lg shadow-sky-900/20 transition-all"
          >
            + Register
          </button>
        </div>
      </div>

      {/* STATUS WORKFLOW TABS */}
      <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide snap-x">
        {STATUS_WORKFLOW.map((status) => {
          const isActive = activeStatus === status;
          const count = statusCounts[status] || 0;
          return (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 snap-start whitespace-nowrap border-2 ${
                isActive 
                  ? 'bg-sky-600 border-sky-400 text-white shadow-xl shadow-sky-900/40 translate-y-[-2px]' 
                  : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              {status}
              <span className={`px-2 py-0.5 rounded-md font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* LISTING (MOBILE OPTIMIZED) */}
      <div className="grid grid-cols-1 gap-4">
        {filteredDrawings.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-[10px]">No matches in {activeStatus} registry</p>
            </div>
        ) : (
          filteredDrawings.map((dwg) => {
            const { found, total } = getCounts(dwg);
            const isExpanded = expandedId === dwg.id;
            const progress = total > 0 ? (found / total) * 100 : 0;
            const idx = STATUS_WORKFLOW.indexOf(dwg.status);
            const nextStatus = STATUS_WORKFLOW[idx + 1];
            const prevStatus = STATUS_WORKFLOW[idx - 1];

            return (
              <div key={dwg.id} className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-all hover:border-slate-700">
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : dwg.id)}
                  onDoubleClick={() => navigate(`/drawings/${dwg.id}`)}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-black text-2xl tracking-tighter uppercase">{dwg.drawingNumber}</span>
                        {(dwg.serialNumber || activeStatus === 'waiting') && (
                          <span className="bg-slate-950 text-sky-400 text-[10px] px-3 py-1 rounded-full border border-sky-500/30 font-mono font-black">
                            SN-{dwg.serialNumber || 'PENDING'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 block">
                        Dest: {dwg.deliverTo} <span className="mx-2 text-slate-800">|</span> Qty: {dwg.dwgQty} Sets
                      </span>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono font-black text-white">{found}<span className="text-slate-700 mx-1">/</span>{total}</div>
                        <span className="text-[9px] font-black text-slate-600 uppercase">Items Processed</span>
                    </div>
                  </div>

                  {/* PROGRESS UI */}
                  <div className="space-y-2">
                    <div className="relative w-full bg-slate-950 rounded-full h-2 p-0.5 border border-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${progress >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="bg-slate-950/50 border-t border-slate-800 animate-in slide-in-from-top-2 duration-300">
                    <div className="p-2 space-y-1">
                      {dwg.plates?.map((p, i) => {
                        const totalReq = (Number(p.qty) || 0) * (Number(dwg.dwgQty) || 1);
                        const pfound = Number(p.foundCount) || 0;
                        const pPerc = totalReq > 0 ? (pfound / totalReq) * 100 : 0;
                        
                        return (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/30 transition-colors">
                            <span className="text-[11px] font-black text-slate-300 font-mono w-24">{p.mark}</span>
                            <div className="flex-1 px-4">
                                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-700 transition-all duration-500" style={{ width: `${pPerc}%` }} />
                                </div>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-slate-500">{pfound} / {totalReq}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* WORKFLOW ACTIONS */}
                <div className="p-4 bg-slate-950/20 border-t border-slate-800/50 flex gap-3">
                  {activeStatus === 'new' && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const sn = prompt("Override/Assign Serial Number:", getNextAvailableSN());
                        if (sn) updateStatus(null, dwg, "next", parseInt(sn));
                      }} 
                      className="px-4 py-3 bg-slate-800 text-slate-400 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-700 hover:text-white transition-all"
                    >
                      Assign SN
                    </button>
                  )}
                  <div className="flex-1 flex gap-2">
                    {prevStatus && (
                        <button onClick={(e) => updateStatus(e, dwg, "prev")} className="flex-1 py-3 bg-slate-800/50 text-slate-500 rounded-2xl text-[9px] font-black uppercase border border-slate-800 hover:bg-slate-800 transition-all">← Back</button>
                    )}
                    {nextStatus && (
                        <button onClick={(e) => updateStatus(e, dwg, "next")} className="flex-[2] py-3 bg-sky-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all">
                           Move to {nextStatus} →
                        </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
