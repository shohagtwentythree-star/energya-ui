import React from 'react';
// Assuming you have an Icons object or library
// import * as Icons from './Icons'; 

const CartPalletsView = ({
  activeTab,
  searchTerm,
  setSearchTerm,
  handleSearch,
  sortType,
  setSortType,
  pallets,
  getCoordKey,
  coordKey,
  setActiveCoord,
  activeCoord,
  handleCoordChange,
  activePlates,
  getGlobalStats,
  renderPlateCard,
  jumpToMark,
  Icons = {} // Fallback if Icons are passed via props or context
}) => {
  // Guard clause to match your existing conditional rendering
  if (activeTab !== "pallets") return null;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SEARCH & SORT ROW */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleSearch} className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-500 transition-colors">
            {Icons.Search && <Icons.Search />}
          </div>
          <input 
            type="text" 
            placeholder="Filter Mark..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 placeholder-slate-600 transition-all"
          />
          {searchTerm && (
            <button 
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
            >
              ✕
            </button>
          )}
        </form>

        <div className="flex bg-slate-900 rounded-xl border border-slate-800 p-1 shrink-0">
          {['demand', 'mark'].map(s => (
            <button 
              key={s} 
              type="button" 
              onClick={() => setSortType(s)} 
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                sortType === s ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      
      {/* --- GLOBAL SEARCH RESULTS --- */}
{searchTerm && (
  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-400 mb-8 px-1">
    {/* SEARCH HEADER */}
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">Global Discovery</span>
      </div>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-amber-500/30 to-transparent"></div>
    </div>
    
    <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
      {(() => {
        const globalMatches = [];
const searchLower = searchTerm.toLowerCase();

pallets.forEach(pal => {
  pal.plates.forEach(pl => {
    const markLower = pl.mark.toLowerCase();
    if (markLower.includes(searchLower)) {
      // Calculate match type: 0 for exact, 1 for partial
      const priority = markLower === searchLower ? 0 : 1;
      globalMatches.push({ ...pl, pallet: pal, priority });
    }
  });
});

// Sort by priority (0 comes before 1)
globalMatches.sort((a, b) => a.priority - b.priority);


        if (globalMatches.length === 0) return (
          <div className="py-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em]">No Data Matches Found</p>
          </div>
        );

        return globalMatches.map((match, idx) => {
          const isCurrent = getCoordKey(match.pallet) === coordKey;
          
          return (
            <div 
              key={idx} 
              className={`group flex items-center p-1 rounded-xl border transition-all duration-300 ${
                isCurrent 
                  ? 'bg-sky-500/5 border-sky-500/30 shadow-lg shadow-sky-950/20' 
                  : 'bg-slate-900/40 border-slate-800 hover:border-amber-500/30 hover:bg-slate-900/80'
              }`}
            >
              {/* SECTION 1: PLATE MARK (The "ID") */}
              <div className={`flex flex-col justify-center px-4 py-2 min-w-[100px] border-r ${
                isCurrent ? 'border-sky-500/20' : 'border-slate-800'
              }`}>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">Plate ID</span>
                <span className={`font-mono font-black text-sm tracking-tight ${
                  isCurrent ? 'text-sky-400' : 'text-white'
                }`}>
                  {match.mark}
                </span>
              </div>

              {/* SECTION 2: TELEMETRY (Loc & Order) */}
              <div className="flex-1 px-4 grid grid-cols-2 gap-4">
                {/* Location Display */}
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">Location</span>
                  <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-sky-300' : 'text-slate-300'}`}>
                    {match.pallet.x}/{match.pallet.y}
                  </span>
                </div>

                {/* Order Number Display */}
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">Order Number</span>
                  <span className="text-xs font-black text-slate-400 group-hover:text-amber-500 transition-colors">
                    # {match.pallet.orderNumber || 'UNSET'}
                  </span>
                </div>
              </div>

              {/* SECTION 3: ACTION */}
              <div className="pr-1">
                {isCurrent ? (
                  <div className="px-3 py-2 bg-sky-500/10 rounded-lg border border-sky-500/20">
                     <span className="text-[9px] font-black text-sky-500 uppercase">Active</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setSearchTerm("");
                      setActiveCoord({ x: match.pallet.x, y: match.pallet.y});
                    }}
                    type="button"
                    className="flex items-center gap-2 bg-slate-950 text-slate-500 hover:text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-800 hover:border-amber-500 hover:bg-amber-600 group/btn"
                  >
                    Jump
                    <Icons.ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          );
        });
      })()}
    </div>
  </div>
)}


      {/* 2. COORD NAVIGATION DASHBOARD */}
      <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-4">
          {["x", "y"].map((axis) => (
            <div key={axis} className="bg-slate-950 rounded-xl p-1.5 flex items-center border border-slate-800 shadow-inner group focus-within:border-sky-500/50 transition-all">
              <button 
                type="button"
                onClick={() => handleCoordChange(axis, (Number(activeCoord[axis]) || 0) - 1)} 
                className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-sky-600 hover:text-white transition-colors flex items-center justify-center font-black text-lg active:scale-95"
              > − </button>
              
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{axis} Axis</span>
                <input 
                  type="number"
                  inputMode="numeric"
                  value={activeCoord[axis]}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleCoordChange(axis, e.target.value)}
                  className="w-full bg-transparent text-center text-xl font-mono font-bold text-sky-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>

              <button 
                type="button"
                onClick={() => handleCoordChange(axis, (Number(activeCoord[axis]) || 0) + 1)} 
                className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center font-black text-lg active:scale-95"
              > + </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LIST RENDERING */}
      {activePlates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl opacity-40">
          {Icons.Box && <Icons.Box />}
          <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">Empty Position</div>
        </div>
      ) : (() => { 
        const filteredPlates = activePlates.filter(p => 
          p.mark.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const processed = filteredPlates.map(p => ({
          ...p,
          stats: getGlobalStats(p.mark)
        })).sort((a, b) => {
          if (sortType === 'demand') return b.stats.netRemaining - a.stats.netRemaining;
          return a.mark.localeCompare(b.mark);
        });

        const priority = processed.filter(p => p.stats.netRemaining > 0);
        const other = processed.filter(p => p.stats.netRemaining <= 0);

        if (filteredPlates.length === 0) {
          return (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-slate-500 text-sm">No marks match "{searchTerm}" at this location.</p>
              <button onClick={() => setSearchTerm("")} className="text-sky-500 text-[10px] font-bold mt-2 uppercase">Clear Filter</button>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            {priority.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Priority Picks</span>
                  <div className="h-[1px] flex-1 bg-sky-500/20"></div>
                </div>
                <div className="grid gap-2">
                  {priority.map((p, i) => renderPlateCard(p, i, false))}
                </div>
              </div>
            )}

            {other.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Other Items</span>
                  <div className="h-[1px] flex-1 bg-slate-800"></div>
                </div>
                <div className="grid gap-2">
                  {other.map((p, i) => renderPlateCard(p, i, true))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default CartPalletsView;
