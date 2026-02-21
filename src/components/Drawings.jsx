import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";

const API_URL = 'http://localhost:3000/drawings/';

const STATUS_WORKFLOW = [
  'new', 'waiting', 'fabricating', 'welding', 'cleaning', 'inspection', 'complete', 'delivered'
];

// Key for storing the last selected status tab
const ACTIVE_STATUS_KEY = 'drawings_active_status_tab';

export default function Drawings() {
  const navigate = useNavigate();

  // Load saved status from localStorage, fallback to first status
  const [activeStatus, setActiveStatus] = useState(() => {
    const saved = localStorage.getItem(ACTIVE_STATUS_KEY);
    return saved && STATUS_WORKFLOW.includes(saved) ? saved : STATUS_WORKFLOW[0];
  });

  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [notification, setNotification] = useState(null);

  // Save active status to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(ACTIVE_STATUS_KEY, activeStatus);
  }, [activeStatus]);

  // Toast auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
  };

  useEffect(() => {
    fetchDrawings();
  }, []);

  const fetchDrawings = async () => {
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
      console.error("Fetch error:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const getNextAvailableSN = () => {
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
  };

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
      if (manualSN) {
        assignedSN = manualSN;
      } else if (!dwg.serialNumber) {
        assignedSN = getNextAvailableSN();
      }
    } else if (newStatus === 'new') {
      assignedSN = null;
    }

    const oldDrawings = [...drawings];

    try {
      setDrawings(prev => prev.map(d => 
        d._id === dwg._id ? { ...d, status: newStatus, serialNumber: assignedSN } : d
      ));

      const response = await fetch(API_URL + dwg._id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, serialNumber: assignedSN })
      });

      if (!response.ok) throw new Error("Server failed");
      
      showToast(`${dwg.drawingNumber} updated to ${newStatus.toUpperCase()}`);
    } catch (error) {
      showToast(error.message, "error");
      setDrawings(oldDrawings);
      fetchDrawings();
    }
  };

  const handleManualSNUpdate = async (dwg, inputVal) => {
    const newSN = parseInt(inputVal);
    if (isNaN(newSN) || newSN <= 0) {
        showToast("Invalid Serial Number format", "error");
        return;
    }

    const isTaken = drawings.some(d => d.status === 'waiting' && d.serialNumber === newSN && d._id !== dwg._id);
    if (isTaken) {
      showToast(`Serial Number ${newSN} is already assigned!`, "error");
      return;
    }

    try {
      setDrawings(prev => prev.map(d => d._id === dwg._id ? { ...d, serialNumber: newSN } : d));
      const response = await fetch(API_URL + dwg._id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber: newSN })
      });
      if (response.ok) showToast(`Serial Number updated to #${newSN}`);
    } catch (error) {
      showToast("Failed to update Serial Number", "error");
      fetchDrawings();
    }
  };

  const getCounts = (dwg) => {
    const multiplier = Number(dwg.dwgQty) || 1;
    if (!dwg.plates || dwg.plates.length === 0) {
      return { found: dwg.foundCount || 0, total: (dwg.totalPlates || 0) * multiplier };
    }
    const total = dwg.plates.reduce((acc, p) => acc + (Number(p.qty) * multiplier), 0);
    const found = dwg.plates.reduce((acc, p) => acc + (Number(p.foundCount) || 0), 0);
    return { found, total };
  };

  const filteredDrawings = drawings.filter(dwg => {
    const matchesSearch = dwg.drawingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          dwg.plates?.some(p => p.mark?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = dwg.status === activeStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: drawings.length,
    completed: drawings.filter(d => d.status === 'complete' || d.status === 'delivered').length
  };

  const handleRowClick = (dwg) => setExpandedId(expandedId === dwg._id ? null : dwg._id);
  const handleRowDoubleClick = (dwg) => {
    navigate(`/drawings/${dwg._id}`);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs tracking-[0.3em]">Accessing Systems...</p>
    </div>
  );

  return (
    <div className="w-full p-4 space-y-6 relative">
      
      {/* TOOLTIP WINDOW */}
      {notification && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border slide-in-from-top-10 duration-500 ${
          notification.type === 'error' 
          ? 'bg-red-950/90 border-red-500 text-red-100' 
          : 'bg-slate-900/90 border-sky-500 text-sky-100'
        }`}>
          <div className={`w-3 h-3 rounded-full animate-pulse ${notification.type === 'error' ? 'bg-red-500' : 'bg-sky-500'}`} />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">{notification.message}</span>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Drawing Control</h1>
          <div className="flex gap-4 mt-2">
            <span className="text-[11px] font-black text-sky-500 uppercase tracking-widest">● {stats.total} Total</span>
            <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">● {stats.completed} Done</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <input 
              type="text" 
              placeholder="SEARCH DWG or MARK..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:w-64 bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-10 text-white text-xs font-bold focus:border-sky-500 outline-none transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          </div>
          <button 
            onClick={() => navigate('/drawings/add')} 
            className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
          >
            + New
          </button>
        </div>
      </div>

      {/* STATUS TABS – now persistent */}
      <div className="flex overflow-x-auto pb-6 gap-3 scrollbar-hide snap-x">
        {STATUS_WORKFLOW.map((status) => {
          const isActive = activeStatus === status;
          const count = drawings.filter((d) => d.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setActiveStatus(status)}
              className={`flex items-center gap-4 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-300 snap-start whitespace-nowrap border ${
                isActive 
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 border-sky-400 text-white shadow-[0_0_20px_rgba(2,132,199,0.3)] scale-[1.02]' 
                  : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800/60'
              }`}
            >
              {status}
              <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full font-mono text-[10px] ${
                isActive ? 'bg-white text-sky-700' : 'bg-slate-800 text-slate-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* MOBILE LIST */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredDrawings.map((dwg) => {
          const { found, total } = getCounts(dwg);
          const isExpanded = expandedId === dwg._id;
          const idx = STATUS_WORKFLOW.indexOf(dwg.status);
          const nextStatus = STATUS_WORKFLOW[idx + 1];
          const prevStatus = STATUS_WORKFLOW[idx - 1] || null;

          return (
            <div 
              key={dwg._id} 
              className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-lg"
            >
              <div 
                className="p-5 cursor-pointer"
                onClick={() => handleRowClick(dwg)}
                onDoubleClick={() => handleRowDoubleClick(dwg)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-xl block tracking-tighter">
                        {dwg.drawingNumber}
                      </span>
                      {(dwg.serialNumber || activeStatus === 'waiting') && (
                        <span className="bg-sky-500 text-white text-[10px] px-2 py-0.5 rounded font-mono font-black">
                          SN: {dwg.serialNumber || '?'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                      {dwg.deliverTo} • x{dwg.dwgQty} Sets
                    </span>
                    {activeStatus === 'new' && (
                      <p className="text-[9px] text-sky-500/50 font-bold">
                        Est SN: #{getNextAvailableSN()}
                      </p>
                    )}
                  </div>
                  <div className="text-sky-400 font-mono font-black">{found}/{total}</div>
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-1.5 w-full">
                  <div className="flex justify-between items-end px-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Overall Progress
                    </span>
                    <span className={`text-xs font-mono font-black ${found >= total ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {total > 0 ? Math.round((found / total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="relative w-full bg-slate-900 rounded-full h-2.5 p-0.5 border border-slate-800 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out relative ${found >= total ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                      style={{ width: `${total > 0 ? (found / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="w-full border-t border-slate-700 bg-slate-950/40 slide-in-from-top-1 duration-200">
                  <div className="w-full flex flex-col divide-y divide-slate-800/40">
                    {dwg.plates?.map((p, i) => {
                      const multiplier = Number(dwg.dwgQty) || 1;
                      const totalRequired = (Number(p.qty) || 0) * multiplier;
                      const pfound = Number(p.foundCount) || 0;
                      const percentage = totalRequired > 0 ? (pfound / totalRequired) * 100 : 0;
                      const dynamicColor = `hsl(${Math.min(percentage * 1.2, 120)}, 80%, 50%)`;

                      return (
                        <div key={i} className="w-full flex items-center gap-3 py-3 px-5">
                          <div className="w-20 shrink-0">
                            <span className="text-sky-400 font-black text-[11px] uppercase truncate block">
                              {p.mark}
                            </span>
                          </div>
                          <div className="flex-1 flex flex-col gap-1">
                            <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden border border-slate-800/50">
                              <div 
                                className="h-full transition-all duration-700" 
                                style={{ width: `${percentage}%`, backgroundColor: dynamicColor }} 
                              />
                            </div>
                          </div>
                          <div className="w-16 shrink-0 flex justify-end items-center gap-1 font-mono">
                            <span style={{ color: dynamicColor }} className="text-[11px] font-black">
                              {pfound}
                            </span>
                            <span className="text-slate-700 text-[9px]">/</span>
                            <span className="text-slate-500 text-[11px] font-bold">
                              {totalRequired}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-800/20 flex gap-2" onClick={e => e.stopPropagation()}>
                {activeStatus === 'new' && (
                  <button 
                    onClick={() => {
                      const sn = prompt("Enter Serial Number:", getNextAvailableSN());
                      if (sn) updateStatus(null, dwg, "next", parseInt(sn));
                    }} 
                    className="flex-1 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Manual SN
                  </button>
                )}
                {prevStatus && (
                  <button 
                    onClick={(e) => updateStatus(e, dwg, "prev")} 
                    className="flex-1 py-3 bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700"
                  >
                    ←
                  </button>
                )}
                {nextStatus && (
                  <button 
                    onClick={(e) => updateStatus(e, dwg, "next")} 
                    className="flex-1 py-3 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                  >
                    {nextStatus} →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}