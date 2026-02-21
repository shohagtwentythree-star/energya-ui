import React from 'react';

const CartDrawingsView = ({
  activeTab,
  drawings = [],
  cart = [],
  putToDrawing,
  jumpToMark,
  isPlateInAnyPallet,
  Icons = {}
}) => {
  // Defensive check for active tab
  if (activeTab?.toLowerCase() !== "drawings") return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!drawings || drawings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800 rounded-2xl opacity-40">
          {Icons.Box ? <Icons.Box /> : <div className="text-2xl">📦</div>}
          <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">
            No Drawings found
          </div>
        </div>
      ) : (
        drawings
          .slice() // Avoid mutating original state
          .sort((a, b) => Number(a.serialNumber || 0) - Number(b.serialNumber || 0))
          .map((dwg) => {
            const multiplier = Number(dwg.dwgQty) || 1;
            const totalPlates = dwg.plates?.length || 0;
            const finishedPlates = dwg.plates?.filter(p => 
              (Number(p.foundCount) || 0) >= (Number(p.qty || 0) * multiplier)
            ).length || 0;
            const isFullyComplete = totalPlates > 0 && totalPlates === finishedPlates;

            return (
              <div 
                key={dwg._id} 
                className={`bg-slate-900/40 border rounded-2xl overflow-hidden transition-all ${
                  isFullyComplete ? 'border-emerald-500/20 opacity-60' : 'border-slate-800'
                }`}
              >
                {/* MINIMAL HEADER */}
                <div className="flex items-center justify-between px-5 py-3 bg-slate-900/60 border-b border-slate-800/50">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-mono font-black text-white tracking-tight">
                      {dwg.drawingNumber || "N/A"}
                    </h3>
                    <span className="text-[16px] text-slate-100 font-bold font-mono">
                      - SN: {dwg.serialNumber || "0"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 font-black uppercase">Done</span>
                    <span className="text-sm font-mono font-bold text-sky-400">
                      {finishedPlates}/{totalPlates}
                    </span>
                  </div>
                </div>

                {/* NESTED PLATE ROWS */}
                <div className="p-2 space-y-1">
                  {dwg.plates?.map((plate, pi) => {
                    const totalReq = (Number(plate.qty) || 0) * multiplier;
                    const found = Number(plate.foundCount) || 0;
                    const needed = Math.max(0, totalReq - found);
                    
                    // Logic to find if this mark is in the user's cart
                    const itemInCart = cart?.find(c => c.mark === plate.mark);
                    const canPut = itemInCart ? Math.min(itemInCart.quantity, needed) : 0;
                    const progress = totalReq > 0 ? (found / totalReq) * 100 : 0;

                    return (
                      <div 
                        key={pi} 
                        className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                          needed === 0 ? 'bg-slate-950/30 opacity-40' : 'bg-slate-900/20 hover:bg-slate-800/40'
                        }`}
                      >
                        {/* 1. Mark & Missing */}
                        <div className="shrink-0 min-w-[90px]">
                          <div className="text-sm font-black text-slate-200 font-mono leading-none">
                            {plate.mark}
                          </div>
                          {needed > 0 ? (
                            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">
                              Need {needed}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">
                              Ready
                            </span>
                          )}
                        </div>

                        {/* 2. Progress Bar */}
                        <div className="flex-1 flex flex-col gap-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono px-1">
                            <span className="text-slate-500">Progress</span>
                            <span className={needed === 0 ? "text-emerald-500 font-bold" : "text-slate-300"}>
                              {found}/{totalReq}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-700 ${needed === 0 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                              style={{ width: `${Math.min(100, progress)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* 3. Action Buttons */}
                        <div className="shrink-0 min-w-[120px] flex justify-end">
                          {itemInCart && needed > 0 ? (
                            <button 
                              type="button"
                              onClick={() => putToDrawing && putToDrawing(itemInCart, dwg._id, canPut)}
                              className="w-auto bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                            >
                              {Icons.Cart && <Icons.Cart className="w-3 h-3" />} Put {canPut}
                            </button>
                          ) : needed > 0 ? (
                            <button 
                              type="button"
                              onClick={() => jumpToMark && jumpToMark(plate.mark)}
                              className={`w-auto p-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 border
                                ${
                                  isPlateInAnyPallet && isPlateInAnyPallet(plate.mark)
                                    ? "bg-green-600/20 text-green-400 border-green-500/40 hover:bg-green-600 hover:text-white"
                                    : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-sky-600 hover:text-white hover:border-sky-400"
                                }
                              `}
                            >
                              {Icons.Search ? <Icons.Search /> : <span>🔍</span>}
                            </button>
                          ) : (
                            <div className="bg-emerald-500/10 p-1.5 rounded-full border border-emerald-500/20">
                              {Icons.Check ? <Icons.Check className="text-emerald-500 w-3.5 h-3.5" /> : <span className="text-emerald-500">✓</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
      )}
    </div>
  );
};

export default CartDrawingsView;
