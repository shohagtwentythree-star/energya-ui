import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from "react-router-dom";

// Unique key for localStorage
const STORAGE_KEY = 'detail_drawing_view_plates_sort_by';

export default function DetailDrawingView() {

  const { id } = useParams();
  const navigate = useNavigate();

  // =========================
  // STATE
  // =========================
  const [dwg, setDwg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [plateLocations, setPlateLocations] = useState({});
  const [isZoomed, setIsZoomed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [sortBy, setSortBy] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'default';
  });

  // =========================
  // EFFECTS
  // =========================

  // Fetch drawing
  useEffect(() => {
    const fetchDrawing = async () => {
      try {
        const res = await fetch(`http://localhost:3000/drawings/${id}`);
        const data = await res.json();
        if (data.status === "success") {
          setDwg(data.data);
        }
      } catch (err) {
        console.error("Failed fetching drawing:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDrawing();
  }, [id]);

  // Persist sort setting
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, sortBy);
  }, [sortBy]);

  // Fetch pallet locations
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
      } catch (err) {
        console.error("Failed fetching plate locations:", err);
      }
    };
    fetchPlateLocations();
  }, []);

  // =========================
  // MEMOS
  // =========================

  const dwgMultiplier = Number(dwg?.dwgQty) || 1;

  const batchStats = useMemo(() => {
    if (!dwg?.plates) return { found: 0, total: 0, percent: 0 };

    const totals = dwg.plates.reduce((acc, plate) => {
      acc.found += (plate.foundCount || 0);
      acc.total += (plate.qty * dwgMultiplier);
      return acc;
    }, { found: 0, total: 0 });

    totals.percent = totals.total > 0 ? (totals.found / totals.total) * 100 : 0;
    return totals;
  }, [dwg?.plates, dwgMultiplier]);

  const sortedPlates = useMemo(() => {
    if (!dwg?.plates) return [];
    let list = [...dwg.plates];

    switch (sortBy) {
      case 'least':
        return list.sort((a, b) => (a.foundCount / a.qty) - (b.foundCount / b.qty));
      case 'most':
        return list.sort((a, b) => (b.foundCount / b.qty) - (a.foundCount / a.qty));
      case 'mark':
        return list.sort((a, b) => a.mark.localeCompare(b.mark));
      default:
        return list;
    }
  }, [dwg?.plates, sortBy]);

  const canDelete = dwg?.status?.toLowerCase() !== 'waiting';

  // =========================
  // DELETE HANDLER
  // =========================

  const handleDelete = async () => {
    if (!window.confirm("Delete this drawing permanently?")) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`http://localhost:3000/drawings/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert("Drawing deleted");
        navigate('/drawings');
      } else {
        const err = await res.json();
        alert("Delete failed: " + (err.message || "Server error"));
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Something went wrong while deleting");
    } finally {
      setDeleting(false);
    }
  };

  // =========================
  // EARLY RETURNS
  // =========================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        Loading drawing...
      </div>
    );
  }

  if (!dwg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-red-400">
        Drawing not found
        <button
          onClick={() => navigate('/drawings')}
          className="mt-4 px-4 py-2 bg-slate-800 rounded"
        >
          Back
        </button>
      </div>
    );
  }

  // =========================
  // UTILITIES
  // =========================

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

  // =========================
  // JSX
  // =========================

  return (
    <div className="w-full min-h-screen bg-slate-900 p-3 md:p-6 text-slate-200">
      <div className="max-w-[1400px] mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            {dwg.drawingNumber} <span className="text-sky-500 not-italic ml-2 text-2xl">x{dwgMultiplier}</span>
          </h2>
          <div className="flex items-center gap-4">
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/60 hover:bg-red-800/80 text-red-300 hover:text-red-100 rounded-lg border border-red-700/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete drawing (only available for New status)"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button 
              onClick={() => navigate('/drawings')} 
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-6 py-2 rounded-lg font-bold transition uppercase tracking-widest border border-slate-700"
            >
              Back to List
            </button>
          </div>
        </div>

        {/* ZOOM OVERLAY */}
        {isZoomed && (
          <div className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setIsZoomed(false)}>
            <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button className="absolute top-6 right-6 text-slate-500 hover:text-white font-black" onClick={() => setIsZoomed(false)}>CLOSE [X]</button>
              <TechnicalSVG />
            </div>
          </div>
        )}

        {/* Rest of your component remains exactly the same */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: VISUALS & LIVE STATS */}
          <div className="lg:col-span-4 space-y-6">
            <div className="group relative w-full h-64 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center justify-center overflow-hidden cursor-zoom-in hover:border-sky-500/50 transition-colors" onClick={() => setIsZoomed(true)}>
              <div className="absolute top-3 right-4 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-md text-[8px] text-sky-400 font-bold border border-sky-500/20 uppercase">Click to Expand</div>
              <div className="w-3/4 h-3/4 opacity-60 group-hover:opacity-100 transition-opacity"><TechnicalSVG /></div>
            </div>

            {/* REAL-TIME BATCH STATS CARD */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Real-Time Batch Progress</p>
                  <h3 className="text-3xl font-mono text-white font-bold mt-1">
                    {batchStats.found} <span className="text-slate-600">/</span> {batchStats.total}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="bg-sky-500/10 text-sky-400 px-3 py-1 rounded-full text-[10px] font-black border border-sky-500/20 uppercase tracking-tighter">
                    Fab #{dwg.deliverTo}
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-950 h-3 rounded-full border border-slate-800 overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-sky-600 to-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${batchStats.percent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Completion</p>
                  <p className="text-lg font-mono font-bold text-emerald-400">{batchStats.percent.toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Target Date</p>
                  <p className="text-sm font-bold text-slate-300">{dwg.deliveryDate || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PLATE LISTING */}
          <div className="lg:col-span-8">
            
            {/* SORTING CONTROLS */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mr-2">Filter View:</span>
              {[
                { id: 'default', label: 'Default' },
                { id: 'least', label: 'Missing First' },
                { id: 'most', label: 'Done First' },
                { id: 'mark', label: 'Name (A-Z)' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSortBy(btn.id)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all duration-200 border ${
                    sortBy === btn.id 
                    ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/20' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* MOBILE LIST */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {sortedPlates.map((plate, i) => {
                const totalReq = plate.qty * dwgMultiplier;
                const found = plate.foundCount || 0;
                const dynamicStyle = getDynamicStatusStyle(found, totalReq);

                return (
                  <div key={i} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-mono font-black text-white text-lg">{plate.mark}</span>
                      <span style={dynamicStyle} className="px-3 py-1 rounded text-[10px] font-black uppercase border">
                        {found} / {totalReq}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-bold uppercase">Locations:</span>
                      
                      {plateLocations[plate.mark]?.map(l => (
<Link key={`${l.x}-${l.y}`} to={`/pallets?coords=${l.x},${l.y}`}>
  {`${l.x}.${l.y}`}
</Link>

                      )) || 'NONE'}
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