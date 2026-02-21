import React from 'react';

const CartCartView = ({
  activeTab,
  cart = [],
  getMatchedDrawings,
  removeFromCart,
  putToDrawing,
  Icons = {}
}) => {
  // Guard clause: Only render if this tab is active
  if (activeTab !== "cart") return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-3xl opacity-40">
          {Icons.Cart && <Icons.Cart />}
          <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">
            Cart is Empty
          </div>
        </div>
      ) : (
        cart.map((c) => {
          // getMatchedDrawings should return an array of drawing requirements for this mark
          const matched = getMatchedDrawings ? getMatchedDrawings(c.mark) : [];
          
          return (
            <div key={c._id} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              
              {/* MINIMAL HEADER */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-mono font-black text-white tracking-tighter">
                    {c.mark}
                  </span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
                    {c.coord}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <span className="text-[9px] text-amber-600 font-black uppercase">On Hand</span>
                    <span className="text-sm font-mono font-black text-amber-500">{c.quantity}</span>
                  </div>
                  <button 
                    type="button"
                    onDoubleClick={() => removeFromCart && removeFromCart(c._id)} 
                    className="text-slate-600 hover:text-red-500 transition-colors p-1"
                    title="Double tap to bin"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* NESTED TARGET DRAWINGS */}
              <div className="p-2 space-y-1">
                {matched.map((m, mi) => {
                  const needed = Math.max(0, m.requiredQty - m.foundCount);
                  const canGive = Math.min(c.quantity, needed);
                  const isDone = needed === 0;

                  return (
                    <div 
                      key={mi} 
                      className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                        isDone ? 'opacity-30 grayscale' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      
                      {/* Drawing Number & Progress mini */}
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-300">
                          # {m.serialNumber || "#"} | {m.drawingNumber}
                        </span>
                        <div className="flex items-center gap-2">
                           <div className="w-16 bg-slate-800 h-1 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-sky-500" 
                                style={{ width: `${Math.min(100, (m.foundCount / m.requiredQty) * 100)}%` }}
                              ></div>
                           </div>
                           <span className="text-[9px] font-mono text-slate-500">
                             {m.foundCount}/{m.requiredQty}
                           </span>
                        </div>
                      </div>

                      {/* Compact Action */}
                      <div>
                        {isDone ? (
                          <span className="text-[9px] text-emerald-500 font-bold uppercase mr-2">Matched</span>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => putToDrawing && putToDrawing(c, m.drawingId, canGive)} 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                          >
                            Put {canGive}
                          </button>
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

export default CartCartView;
