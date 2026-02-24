import React, { useMemo, memo } from 'react';

const CartCartView = ({
  activeTab,
  cart = [],
  getMatchedDrawings,
  removeFromCart,
  putToDrawing,
  Icons = {}
}) => {
  // 1. Performance Guard: Prevent any logic execution if tab is inactive
  if (activeTab !== "cart") return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {cart.length === 0 ? (
        <EmptyCartView Icons={Icons} />
      ) : (
        // Sort cart by mark name for a stable, predictable UI list
        [...cart].sort((a, b) => a.mark.localeCompare(b.mark)).map((item) => (
          <CartItem 
            key={item.id || item.mark} // Fallback key for safety
            item={item}
            matched={getMatchedDrawings ? getMatchedDrawings(item.mark) : []}
            removeFromCart={removeFromCart}
            putToDrawing={putToDrawing}
          />
        ))
      )}
    </div>
  );
};

// 2. Sub-component for individual items
const CartItem = memo(({ item, matched, removeFromCart, putToDrawing }) => {
  // Memoize matched count to avoid unnecessary header re-renders
  const openRequirementsCount = useMemo(() => 
    matched.filter(m => (m.requiredQty - m.foundCount) > 0).length,
    [matched]
  );

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-slate-700 group">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60 group-hover:bg-slate-900/80 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl font-mono font-black text-white tracking-tighter">
            {item.mark}
          </span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest px-2 py-0.5 bg-slate-950 rounded border border-slate-800">
            {item.coord || 'NO COORD'}
          </span>
          {openRequirementsCount > 0 && (
            <span className="animate-pulse flex h-2 w-2 rounded-full bg-sky-500" title="Active Requirements"></span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
            <span className="text-[9px] text-amber-600 font-black uppercase">On Hand</span>
            <span className="text-sm font-mono font-black text-amber-500">{item.quantity || 0}</span>
          </div>
          <button 
            type="button"
            onDoubleClick={() => removeFromCart && removeFromCart(item.id)} 
            className="text-slate-600 hover:text-red-500 transition-colors p-1 active:scale-90"
            title="Double tap to bin"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* TARGET DRAWINGS LIST */}
      <div className="p-2 space-y-1 bg-slate-950/20">
        {matched.length === 0 ? (
          <div className="text-[10px] text-slate-600 italic p-4 text-center border border-dashed border-slate-800/50 rounded-xl m-1">
            No matching waiting drawings for this mark.
          </div>
        ) : (
          matched.map((m, mi) => (
            <DrawingRow 
              key={`${m.drawingId}-${mi}`} 
              m={m} 
              item={item} 
              putToDrawing={putToDrawing} 
            />
          ))
        )}
      </div>
    </div>
  );
});

// 3. Optimized Drawing Row
const DrawingRow = ({ m, item, putToDrawing }) => {
  const needed = Math.max(0, (Number(m.requiredQty) || 0) - (Number(m.foundCount) || 0));
  const canGive = Math.min(Number(item.quantity) || 0, needed);
  const isDone = needed === 0;

  const progressPercent = useMemo(() => {
    const total = Number(m.requiredQty) || 1;
    const found = Number(m.foundCount) || 0;
    return Math.min(100, (found / total) * 100);
  }, [m.foundCount, m.requiredQty]);

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 ${
      isDone 
        ? 'opacity-30 grayscale bg-slate-900/20' 
        : 'hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50'
    }`}>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
            {m.serialNumber || "SN-???"}
          </span>
          <span className="text-xs font-bold text-slate-200">
            {m.drawingNumber}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700/30">
              <div 
                className={`h-full transition-all duration-700 ease-out ${isDone ? 'bg-emerald-500' : 'bg-sky-500'}`}
                style={{ width: `${progressPercent}%` }}
              ></div>
           </div>
           <span className="text-[10px] font-mono font-bold text-slate-500">
             {m.foundCount}<span className="text-slate-700 mx-0.5">/</span>{m.requiredQty}
           </span>
        </div>
      </div>

      <div className="flex items-center">
        {isDone ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Matched</span>
            <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <button 
            type="button"
            disabled={canGive <= 0}
            onClick={() => putToDrawing && putToDrawing(item, m.drawingId, canGive)} 
            className="group/btn relative overflow-hidden bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center gap-2"
          >
            <span>Put {canGive}</span>
            <svg className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

const EmptyCartView = ({ Icons }) => (
  <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
    <div className="p-4 rounded-full bg-slate-900/50 border border-slate-800 mb-4">
      {Icons.Cart ? <Icons.Cart className="w-8 h-8 text-slate-700" /> : <div className="w-8 h-8 bg-slate-800 rounded-full" />}
    </div>
    <div className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
      Inventory Cart Empty
    </div>
    <p className="text-slate-700 text-[9px] mt-1 uppercase font-bold">Add plates from stock to begin dispatch</p>
  </div>
);

export default memo(CartCartView);
