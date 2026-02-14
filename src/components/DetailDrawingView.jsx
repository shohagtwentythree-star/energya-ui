import React, { useState, useEffect, useMemo } from 'react';

// Unique key for localStorage
const STORAGE_KEY = 'detail_drawing_view_plates_sort_by';

export default function DetailDrawingView({ dwg, onBack }) {
  const dwgMultiplier = Number(dwg.dwgQty) || 1;
  const [plateLocations, setPlateLocations] = useState({});
  const [isZoomed, setIsZoomed] = useState(false);
  
  // Initialize state from localStorage, falling back to 'default'
  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'default';
  });

  // Persist sortBy changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sortBy);
  }, [sortBy]);

  useEffect(() => {
    const fetchPlateLocations = async () => {
      try {
        const res = await fetch('http://localhost:3000/pallets');
        const pallets = await res.json();
        if (pallets.status === "success") {
          const locMap = {};
          pallets.data.forEach(pallet => {
            pallet.plates.forEach(plate => {
              const mark = plate.mark;
              if (!locMap[mark]) locMap[mark] = [];
              locMap[mark].push({ x: pallet.x, y: pallet.y, z: pallet.z });
            });
          });
          setPlateLocations(locMap);
        }
      } catch (err) { console.error("Failed fetching plate locations:", err); }
    };
    fetchPlateLocations();
  }, [dwg]);

  // Logic to handle sorting
  const sortedPlates = useMemo(() => {
    if (!dwg.plates) return [];
    let list = [...dwg.plates];

    switch (sortBy) {
      case 'least':
        // Sort by completion percentage ascending
        return list.sort((a, b) => (a.foundCount / a.qty) - (b.foundCount / b.qty));
      case 'most':
        // Sort by completion percentage descending
        return list.sort((a, b) => (b.foundCount / b.qty) - (a.foundCount / a.qty));
      case 'mark':
        return list.sort((a, b) => a.mark.localeCompare(b.mark));
      default:
        return list;
    }
  }, [dwg.plates, sortBy]);

  const getDynamicStatusStyle = (found, total) => {
    const ratio = total > 0 ? Math.min(found / total, 1) : 0;
    const r = Math.floor(239 - (239 - 34) * ratio);
    const g = Math.floor(68 + (197 - 68) * ratio);
    const b = Math.floor(68 + (94 - 68) * ratio);
    return {
      color: `rgb(${r}, ${g}, ${b})`,
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
    };
  };

  const TechnicalSVG = () => (
    <svg viewBox="0 0 400 200" className="w-full h-full">
      <rect x="50" y="40" width="300" height="120" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
      <circle cx="80" cy="70" r="10" fill="none" stroke="#38bdf8" strokeWidth="2" />
      <circle cx="320" cy="70" r="10" fill="none" stroke="#38bdf8" strokeWidth="2" />
      <circle cx="80" cy="130" r="10" fill="none" stroke="#38bdf8" strokeWidth="2" />
      <circle cx="320" cy="130" r="10" fill="none" stroke="#38bdf8" strokeWidth="2" />
      <text x="200" y="105" fill="#38bdf8" fontSize="12" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
        {dwg.drawingNumber} SCHEMATIC
      </text>
    </svg>
  );

  return (
    <div className="w-full min-h-screen bg-slate-900 p-3 md:p-6">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            {dwg.drawingNumber} <span className="text-sky-500 not-italic ml-2 text-2xl">x{dwgMultiplier}</span>
          </h2>
          <button onClick={onBack} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-4 py-2 rounded-lg font-bold transition uppercase tracking-widest">
            Cancel
          </button>
        </div>

        {/* Zoom Overlay */}
        {isZoomed && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
            <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-6 right-6 text-slate-500 hover:text-white font-black" onClick={() => setIsZoomed(false)}>CLOSE [X]</button>
              <TechnicalSVG />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Schematic & Stats */}
          <div className="lg:col-span-4 space-y-6">
            <div className="group relative w-full h-64 bg-slate-800 rounded-2xl border border-slate-700/50 flex items-center justify-center overflow-hidden cursor-zoom-in hover:border-sky-500 transition-colors" onClick={() => setIsZoomed(true)}>
              <div className="absolute top-3 right-4 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-md text-[8px] text-sky-400 font-bold border border-sky-500/20 uppercase">VIEW FULL SCHEMATIC</div>
              <div className="w-3/4 h-3/4 opacity-60 group-hover:opacity-100 transition-opacity"><TechnicalSVG /></div>
            </div>

            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Batch Stats</p>
                <span className="bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full text-[10px] font-black border border-sky-500/20 uppercase">Fab #{dwg.deliverTo}</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-mono text-white font-bold">{dwg.foundCount} / {dwg.totalPlates}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Plates Found</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-300 font-bold text-sm">{dwg.deliveryDate}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Deadline</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Table & Sorting */}
          <div className="lg:col-span-8">
            
            {/* SORT SECTOR */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mr-2">Sort By:</span>
              {[
                { id: 'default', label: '➤' },
                { id: 'least', label: 'Missing' },
                { id: 'most', label: 'Completed' },
                { id: 'mark', label: 'Mark (A-Z)' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSortBy(btn.id)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all duration-200 ${
                    sortBy === btn.id 
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block w-full overflow-hidden bg-slate-800/20 rounded-2xl border border-slate-700/50">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900/50 text-slate-500 text-[9px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="p-4">Mark</th>
                    <th className="p-4">Dimensions</th>
                    <th className="p-4">Batch Qty</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Pallet</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200 divide-y divide-slate-700/30">
                  {sortedPlates.map((plate, i) => {
                    const totalReq = plate.qty * dwgMultiplier;
                    const found = plate.foundCount || 0;
                    const dynamicStyle = getDynamicStatusStyle(found, totalReq);

                    return (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono text-sky-400 font-bold">{plate.mark}</td>
                        <td className="p-4 text-xs font-medium text-slate-400">
                          {plate.l}x{plate.w}x{plate.t} <span className="text-[10px] opacity-50 ml-1">h:{plate.h}</span>
                        </td>
                        <td className="p-4 font-bold text-sm">{totalReq}</td>
                        <td className="p-4">
                          <span style={dynamicStyle} className="px-3 py-1 rounded-md text-[9px] font-black uppercase border transition-all duration-300">
                            {found} / {totalReq}
                          </span>
                        </td>
                        <td className="p-4 text-sky-400/80 font-mono text-[10px]">
                          {plateLocations[plate.mark]?.map(loc => `[${loc.x},${loc.y},${loc.z}]`).join(' ') || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {sortedPlates.map((plate, i) => {
                const totalReq = plate.qty * dwgMultiplier;
                const found = plate.foundCount || 0;
                const dynamicStyle = getDynamicStatusStyle(found, totalReq);

                return (
                  <div key={i} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono font-black text-white">{plate.mark}</span>
                      <span style={dynamicStyle} className="px-2 py-0.5 rounded text-[9px] font-black uppercase border">
                        {found} / {totalReq}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono uppercase">
                      LOC: {plateLocations[plate.mark]?.map(loc => `[${loc.x},${loc.y},${loc.z}]`).join(', ') || 'N/A'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
