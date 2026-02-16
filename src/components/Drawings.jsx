import React, { useState, useEffect } from 'react';
import DetailDrawingView from './DetailDrawingView';
import AddDrawingView from './AddDrawingView';

const API_URL = 'http://localhost:3000/drawings';

const STATUS_WORKFLOW = [
  'new', 'waiting', 'fabricating', 'welding', 'cleaning', 'inspection', 'complete', 'delivered'
];

export default function Drawings() {
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list'); 
  const [selectedDwg, setSelectedDwg] = useState(null);
  const [activeStatus, setActiveStatus] = useState(STATUS_WORKFLOW[0]);
  const [expandedId, setExpandedId] = useState(null);

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
    } catch (error) { console.error("Fetch error:", error); }
    finally { setLoading(false); }
  };

  // FULL RESTORE: Optimistic Update + API + Error Revert
  const updateStatus = async (e, dwg, direction) => {
    e.stopPropagation(); 
    const currentIndex = STATUS_WORKFLOW.indexOf(dwg.status);
    const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (currentIndex === -1 || newIndex < 0 || newIndex >= STATUS_WORKFLOW.length) {
      console.warn("Invalid transition");
      return;
    }

    const newStatus = STATUS_WORKFLOW[newIndex];
    const oldDrawings = [...drawings]; // Backup for revert

    try {
      // 1. Optimistic UI Update
      setDrawings(prev => prev.map(d => 
        d._id === dwg._id ? { ...d, status: newStatus } : d
      ));

      // 2. API Call
      const response = await fetch(`${API_URL}/${dwg._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error("Server failed");

    } catch (error) {
      console.error("Update failed, reverting state:", error);
      setDrawings(oldDrawings); // Revert to previous state
      fetchDrawings(); // Sync with server
    }
  };

  // FULL RESTORE: Batch-aware counting
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

  // Interaction logic
  const handleRowClick = (dwg) => setExpandedId(expandedId === dwg._id ? null : dwg._id);
  const handleRowDoubleClick = (dwg) => { setSelectedDwg(dwg); setView('detail'); };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs tracking-[0.3em]">Accessing Systems...</p>
    </div>
  );

  if (view === 'add') return <AddDrawingView onCancel={() => setView('list')} onSuccess={() => { setView('list'); fetchDrawings(); }} />;
  if (view === 'detail') return <DetailDrawingView dwg={selectedDwg} onBack={() => setView('list')} />;

  return (
    <div className="w-full p-4 space-y-6 animate-in fade-in duration-500">
      
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
              type="text" placeholder="SEARCH DWG or MARK..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:w-64 bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-10 text-white text-xs font-bold focus:border-sky-500 outline-none transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
          </div>
          <button onClick={() => setView('add')} className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
            + New
          </button>
        </div>
      </div>

{/* STATUS TABS */}
<div className="flex overflow-x-auto pb-6 gap-3 scrollbar-hide snap-x">
  {STATUS_WORKFLOW.map((status) => {
    const isActive = activeStatus === status;
    const count = drawings.filter((d) => d.status === status).length;

    return (
      <button
        key={status}
        onClick={() => setActiveStatus(status)}
        className={`
          flex items-center gap-4 px-5 py-2.5 rounded-full text-[11px] font-bold uppercase tracking-wider 
          transition-all duration-300 snap-start whitespace-nowrap border
          ${isActive 
            ? 'bg-gradient-to-r from-sky-600 to-blue-600 border-sky-400 text-white shadow-[0_0_20px_rgba(2,132,199,0.3)] scale-[1.02]' 
            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800/60'
          }
        `}
      >
        {status}
        <span 
          className={`
            flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full font-mono text-[10px]
            ${isActive ? 'bg-white text-sky-700' : 'bg-slate-800 text-slate-300'}
          `}
        >
          {count}
        </span>
      </button>
    );
  })}
</div>


      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-hidden bg-slate-900/40 rounded-2xl border border-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
              <th className="p-5 w-16 text-center">+/-</th>
              <th className="p-5">Drawing</th>
              <th className="p-5">Client/Fab</th>
              <th className="p-5">Load Progress</th>
              <th className="p-5 text-right">Step Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredDrawings.map((dwg) => {
              const { found, total } = getCounts(dwg);
              const progress = total > 0 ? (found / total) * 100 : 0;
              const isExpanded = expandedId === dwg._id;
              const idx = STATUS_WORKFLOW.indexOf(dwg.status);
              const nextStatus = STATUS_WORKFLOW[idx + 1];
              const prevStatus = STATUS_WORKFLOW[idx - 1];

              return (
                <React.Fragment key={dwg._id}>
                  <tr 
                    onClick={() => handleRowClick(dwg)}
                    onDoubleClick={() => handleRowDoubleClick(dwg)}
                    className={`group cursor-pointer transition-all ${isExpanded ? 'bg-sky-500/10' : 'hover:bg-white/[0.02]'}`}
                  >
                    <td className="p-5 text-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${isExpanded ? 'bg-sky-500 border-sky-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 group-hover:text-sky-400'}`}>
                        {isExpanded ? '−' : '+'}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="text-white font-black text-lg block tracking-tighter group-hover:text-sky-400">{dwg.drawingNumber}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">x{dwg.dwgQty} BATCH</span>
                    </td>
                    <td className="p-5">
                      <span className="bg-slate-800 text-slate-400 px-3 py-1 rounded-md text-[11px] font-black border border-slate-700 uppercase">{dwg.deliverTo}</span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm text-white font-bold">{found}/{total}</span>
                        <div className="flex-1 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800 max-w-[150px]">
                          <div className={`h-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {prevStatus && (
                          <button onClick={(e) => updateStatus(e, dwg, "prev")} className="p-2 bg-slate-800 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded-lg border border-slate-700 transition-colors">↺</button>
                        )}
                        {nextStatus ? (
                          <button onClick={(e) => updateStatus(e, dwg, "next")} className="bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-[10px] font-black border border-slate-700 uppercase transition-all shadow-sm">
                            {nextStatus} →
                          </button>
                        ) : (
                          <span className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Complete ✓</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-black/20 border-l-4 border-sky-500 animate-in slide-in-from-top-1">
                      <td colSpan="5" className="p-8">
                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {dwg.plates?.map((plate, i) => {
                            const pTotal = plate.qty * (Number(dwg.dwgQty) || 1);
                            const pFound = plate.foundCount || 0;
                            return (
                              <div key={i} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 group/item hover:border-sky-500/50 transition-colors">
                                <div className="flex justify-between items-start mb-1">
                                  <span className="text-sky-400 font-mono font-black text-sm">{plate.mark}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">{pFound}/{pTotal}</span>
                                </div>
                                <p className="text-[9px] text-slate-600 font-bold uppercase">{plate.l}x{plate.w}x{plate.t}</p>
                                <div className="mt-2 w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                                  <div className={`h-full ${pFound >= pTotal ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${(pFound/pTotal)*100}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE LIST */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredDrawings.map((dwg) => {
          const { found, total } = getCounts(dwg);
          const isExpanded = expandedId === dwg._id;
          const idx = STATUS_WORKFLOW.indexOf(dwg.status);
          const nextStatus = STATUS_WORKFLOW[idx + 1];
          const prevStatus = STATUS_WORKFLOW[idx - 1];

          return (
            <div key={dwg._id} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-5" onClick={() => handleRowClick(dwg)} onDoubleClick={() => handleRowDoubleClick(dwg)}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-white font-black text-xl block tracking-tighter">{dwg.drawingNumber}</span>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">{dwg.deliverTo} • x{dwg.dwgQty} Sets</span>
                  </div>
                  <div className="text-sky-400 font-mono font-black">{found}/{total}</div>
                </div>
               <div className="space-y-1.5 w-full">
  {/* Label Row: Left for title/stat, Right for Percentage */}
  <div className="flex justify-between items-end px-0.5">
    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
      Overall Progress
    </span>
    <span className={`text-xs font-mono font-black ${found >= total ? 'text-emerald-400' : 'text-sky-400'}`}>
      {Math.round((found / total) * 100)}%
    </span>
  </div>

  {/* Progress Bar Container */}
  <div className="relative w-full bg-slate-900 rounded-full h-2.5 p-0.5 border border-slate-800 shadow-inner">
    <div 
      className={`h-full rounded-full transition-all duration-700 ease-out relative ${
        found >= total 
          ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
          : 'bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
      }`} 
      style={{ width: `${(found / total) * 100}%` }}
    >
      {/* Subtle shine effect on the bar */}
      <div className="absolute inset-0 bg-white/10 w-full h-0.5 rounded-full"></div>
    </div>
  </div>
</div>

              </div>

              {isExpanded && (
  <div className="w-full border-t border-slate-700 bg-slate-950/40 animate-in slide-in-from-top-1 duration-200">
    <div className="w-full flex flex-col divide-y divide-slate-800/40">
      {dwg.plates?.map((p, i) => {
        const multiplier = Number(dwg.dwgQty) || 1;
        const totalRequired = (Number(p.qty) || 0) * multiplier;
        const found = Number(p.foundCount) || 0;
        const percentage = totalRequired > 0 ? (found / totalRequired) * 100 : 0;
        const hue = Math.min(percentage * 1.2, 120);
        const dynamicColor = `hsl(${hue}, 80%, 50%)`;

        return (
          <div key={i} className="w-full flex items-center gap-3 py-3 px-5">
            {/* Mark */}
            <div className="w-20 shrink-0">
              <span className="text-sky-400 font-black text-[11px] uppercase truncate block">{p.mark}</span>
            </div>

            {/* Progress */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                 <span style={{ color: dynamicColor }} className="text-[9px] font-mono font-black">{Math.round(percentage)}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden border border-slate-800/50">
                <div className="h-full transition-all duration-700" style={{ width: `${percentage}%`, backgroundColor: dynamicColor }} />
              </div>
            </div>

            {/* Qty */}
            <div className="w-16 shrink-0 flex justify-end items-center gap-1 font-mono">
              <span style={{ color: dynamicColor }} className="text-[11px] font-black">{found}</span>
              <span className="text-slate-700 text-[9px]">/</span>
              <span className="text-slate-500 text-[11px] font-bold">{totalRequired}</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}


              <div className="p-3 bg-slate-800/20 flex gap-2" onClick={e => e.stopPropagation()}>
                {prevStatus && <button onClick={(e) => updateStatus(e, dwg, "prev")} className="flex-1 py-3 bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700">←</button>}
                {nextStatus && <button onClick={(e) => updateStatus(e, dwg, "next")} className="flex-1 py-3 bg-sky-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">{nextStatus} →</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
