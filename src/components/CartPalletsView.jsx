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
        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300 mb-6">
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Global Discovery</span>
            <div className="h-[1px] flex-1 bg-amber-500/20"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
            {(() => {
              const globalMatches = [];
              pallets.forEach(pal => {
                pal.plates.forEach(pl => {
                  if (pl.mark.toLowerCase().includes(searchTerm.toLowerCase())) {
                    globalMatches.push({ ...pl, pallet: pal });
                  }
                });
              });

              if (globalMatches.length === 0) return (
                <div className="py-4 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No Matches Found</span>
                </div>
              );

              return globalMatches.map((match, idx) => {
                const isCurrent = getCoordKey(match.pallet) === coordKey;
                
                return (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-1 pr-2 rounded-xl border transition-all ${
                      isCurrent 
                        ? 'bg-sky-500/10 border-sky-500/40 shadow-[inset_0_0_12px_rgba(14,165,233,0.1)]' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`px-4 py-2 rounded-l-lg font-mono font-black text-sm tracking-tight border-r ${
                        isCurrent ? 'text-sky-400 border-sky-500/20' : 'text-white border-slate-800'
                      }`}>
                        {match.mark}
                      </div>
                      
                      <div className="px-4 flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">Loc</span>
                        <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-sky-300' : 'text-slate-400'}`}>
                          {match.pallet.x}.{match.pallet.y}.{match.pallet.z}
                        </span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <div className="px-3 py-1 bg-sky-500/20 rounded-lg border border-sky-500/30">
                         <span className="text-[8px] font-black text-sky-400 uppercase">Viewing</span>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setSearchTerm("");
                          setActiveCoord({ x: match.pallet.x, y: match.pallet.y});
                        }}
                        type="button"
                        className="flex items-center gap-2 bg-slate-950 hover:bg-amber-500 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-800 hover:border-amber-400 group/btn"
                      >
                        Jump to {Icons.ArrowRight && <Icons.ArrowRight className="group-hover/btn:translate-x-0.5 transition-transform" />}
                      </button>
                    )}
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
