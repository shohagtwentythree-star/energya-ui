import React, { useState, useEffect } from 'react';
import DetailDrawingView from './DetailDrawingView';
import AddDrawingView from './AddDrawingView';

const API_URL = 'http://localhost:3000/drawings';

export default function Drawings() {
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list'); 
  const [selectedDwg, setSelectedDwg] = useState(null);

  useEffect(() => {
    fetchDrawings();
  }, []);

  const fetchDrawings = async () => {
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.status === "success") setDrawings(result.data);
    } catch (error) { console.error("Fetch error:", error); }
    finally { setLoading(false); }
  };

  const filteredDrawings = drawings.filter(dwg => {
    const searchLower = searchTerm.toLowerCase();
    return dwg.drawingNumber?.toLowerCase().includes(searchLower) || 
           dwg.plates?.some(p => p.mark?.toLowerCase().includes(searchLower));
  });

  // Calculate high-level stats for the dashboard
  const stats = {
    total: drawings.length,
    completed: drawings.filter(d => d.foundCount >= d.totalPlates && d.totalPlates > 0).length,
    totalItems: drawings.reduce((acc, d) => acc + (d.totalPlates || 0), 0)
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Accessing Drawings...</p>
    </div>
  );

  if (view === 'add') return (
    <AddDrawingView 
      onCancel={() => setView('list')} 
      onSuccess={() => { setView('list'); fetchDrawings(); }} 
    />
  );

  if (view === 'detail') return (
    <DetailDrawingView 
      dwg={selectedDwg} 
      onBack={() => setView('list')} 
    />
  );

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      
      {/* INDUSTRIAL TOP BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Drawing Control</h1>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
              <span className="text-[14px] font-black text-slate-500 uppercase tracking-widest">{stats.total} Drawings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              <span className="text-[14px] font-black text-slate-500 uppercase tracking-widest">{stats.completed} Done</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative">
            <input 
              type="text" placeholder="SEARCH DWG OR PLATE MARK..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full lg:w-80 bg-slate-800/50 border border-slate-700 rounded-xl py-3 px-10 text-white text-xs font-bold outline-none focus:border-sky-500 transition-all placeholder:text-slate-600"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600">🔍</span>
          </div>
          <button 
            onClick={() => setView('add')} 
            className="bg-sky-600 hover:bg-sky-500 text-white px-6 py-3 rounded-xl font-black transition-all uppercase text-xs tracking-widest shadow-lg shadow-sky-900/20 active:scale-95"
          >
            + New Drawing
          </button>
        </div>
      </div>

      {/* MOBILE LIST: Redesigned as dense "Job Cards" */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredDrawings.map((dwg) => (
          <div 
            key={dwg._id} 
            className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 active:bg-slate-800 transition-colors"
            onClick={() => {setSelectedDwg(dwg); setView('detail')}}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-white font-black text-xl block">{dwg.drawingNumber}</span>
                <span className="text-[12px] text-slate-500 font-bold uppercase tracking-widest">Sets: {dwg.dwgQty} • Fab: {dwg.deliverTo}</span>
              </div>
              <div className="text-right">
                <span className="text-sky-400 font-mono text-s block">{dwg.foundCount}/{dwg.totalPlates}</span>
                <span className="text-[12px] text-slate-600 font-bold uppercase">Progress</span>
              </div>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${dwg.foundCount >= dwg.totalPlates ? 'bg-emerald-500' : 'bg-sky-500'}`}
                style={{ width: `${((dwg.foundCount || 0) / (dwg.totalPlates || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP TABLE: Ultra-Clean Industrial Look */}
      <div className="hidden md:block overflow-hidden bg-slate-800/20 rounded-2xl border border-slate-700/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
              <th className="p-4">Drawing Reference</th>
              <th className="p-4">Destination</th>
              <th className="p-4">Component Load</th>
              <th className="p-4 w-48">Status Progress</th>
              <th className="p-4">Delivery</th>
              <th className="p-4 text-right">Control</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 divide-y divide-slate-800/50">
            {filteredDrawings.map((dwg) => {
              const progress = (dwg.foundCount / (dwg.totalPlates || 1)) * 100;
              return (
                <tr key={dwg._id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    <span className="text-white font-black text-base block group-hover:text-sky-400 transition-colors">{dwg.drawingNumber}</span>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Batch Multiplier: x{dwg.dwgQty}</span>
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded text-[10px] font-black border border-slate-700">
                      FAB #{dwg.deliverTo}
                    </span>
                  </td>
                  <td className="p-4 font-mono">
                    <div className="text-sm">
                      <span className="text-white font-bold">{dwg.foundCount}</span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-slate-500">{dwg.totalPlates}</span>
                    </div>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">Units Tracked</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-700 ${progress >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{Math.round(progress)}%</span>
                    </div>
                  </td>
                  <td className="p-4 italic text-xs font-bold text-slate-500">
                    {dwg.deliveryDate || '---'}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => {setSelectedDwg(dwg); setView('detail')}} 
                      className="bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white px-4 py-2 rounded-lg text-[10px] font-black transition-all uppercase tracking-widest border border-slate-700 hover:border-sky-500"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {filteredDrawings.length === 0 && (
          <div className="p-20 text-center">
            <p className="text-slate-600 font-black uppercase tracking-widest text-xs italic">No matching records found in database</p>
          </div>
        )}
      </div>
    </div>
  );
}
