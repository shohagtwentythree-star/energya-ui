import React, { useMemo, memo } from 'react';

const CartDrawingsView = ({
  activeTab,
  drawings = [],
  cart = [],
  putToDrawing,
  jumpToMark,
  isPlateInAnyPallet,
  Icons = {}
}) => {
  // 1. Performance Guard: Prevent execution if tab is inactive
  if (activeTab?.toLowerCase() !== "drawings") return null;

  // 2. Memoized Sorting: Prevents re-sorting the array on every minor state change
  const sortedDrawings = useMemo(() => {
    return [...drawings].sort((a, b) => Number(a.serialNumber || 0) - Number(b.serialNumber || 0));
  }, [drawings]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {sortedDrawings.length === 0 ? (
        <EmptyDrawingsView Icons={Icons} />
      ) : (
        sortedDrawings.map((dwg) => (
          <DrawingCard 
            key={dwg.id}
            dwg={dwg}
            cart={cart}
            putToDrawing={putToDrawing}
            jumpToMark={jumpToMark}
            isPlateInAnyPallet={isPlateInAnyPallet}
            Icons={Icons}
          />
        ))
      )}
    </div>
  );
};

// 3. Sub-component for individual Drawing Cards to localize re-renders
const DrawingCard = memo(({ dwg, cart, putToDrawing, jumpToMark, isPlateInAnyPallet, Icons }) => {
  const multiplier = Number(dwg.dwgQty) || 1;
  const plates = dwg.plates || [];
  
  // Calculate completion stats
  const { finishedCount, totalCount } = useMemo(() => {
    return {
      totalCount: plates.length,
      finishedCount: plates.filter(p => (Number(p.foundCount) || 0) >= (Number(p.qty || 0) * multiplier)).length
    };
  }, [plates, multiplier]);

  const isFullyComplete = totalCount > 0 && totalCount === finishedCount;

  return (
    <div className={`bg-slate-900/40 border rounded-2xl overflow-hidden transition-all duration-300 ${
      isFullyComplete ? 'border-emerald-500/30 opacity-60' : 'border-slate-800 hover:border-slate-700'
    }`}>
      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900/60 border-b border-slate-800/50">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-mono font-black text-white tracking-tight">
            {dwg.drawingNumber || "N/A"}
          </h3>
          <span className="text-sm text-slate-400 font-bold font-mono">
            SN: <span className="text-slate-100">{dwg.serialNumber || "0"}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Progress</span>
          <span className={`text-sm font-mono font-bold ${isFullyComplete ? 'text-emerald-400' : 'text-sky-400'}`}>
            {finishedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* PLATE ROWS */}
      <div className="p-2 space-y-1">
        {plates.map((plate, index) => (
          <PlateRow 
            key={`${dwg.id}-p-${index}`}
            plate={plate}
            dwgId={dwg.id}
            multiplier={multiplier}
            cart={cart}
            putToDrawing={putToDrawing}
            jumpToMark={jumpToMark}
            isPlateInAnyPallet={isPlateInAnyPallet}
            Icons={Icons}
          />
        ))}
      </div>
    </div>
  );
});

// 4. Optimized Plate Row for granular updates
const PlateRow = ({ plate, dwgId, multiplier, cart, putToDrawing, jumpToMark, isPlateInAnyPallet, Icons }) => {
  const totalReq = (Number(plate.qty) || 0) * multiplier;
  const found = Number(plate.foundCount) || 0;
  const needed = Math.max(0, totalReq - found);
  const isReady = needed === 0;

  // Cross-reference with Cart
  const itemInCart = useMemo(() => cart?.find(c => c.mark === plate.mark), [cart, plate.mark]);
  const canPut = itemInCart ? Math.min(itemInCart.quantity, needed) : 0;
  const progress = totalReq > 0 ? (found / totalReq) * 100 : 0;

  return (
    <div className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
      isReady ? 'bg-slate-950/30 opacity-50' : 'bg-slate-900/20 hover:bg-slate-800/40'
    }`}>
      {/* 1. Identity */}
      <div className="shrink-0 min-w-[100px]">
        <div className="text-sm font-black text-slate-200 font-mono tracking-tight">
          {plate.mark}
        </div>
        <div className={`text-[9px] font-bold uppercase tracking-tighter ${isReady ? 'text-emerald-500' : 'text-rose-500'}`}>
          {isReady ? 'Ready' : `Need ${needed}`}
        </div>
      </div>

      {/* 2. Visual Progress */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-mono px-1">
          <span className="text-slate-600 uppercase font-bold text-[8px]">Status</span>
          <span className={isReady ? "text-emerald-500 font-bold" : "text-slate-400"}>
            {found}<span className="text-slate-700 mx-0.5">/</span>{totalReq}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-700/30">
          <div 
            className={`h-full transition-all duration-700 ease-out ${isReady ? 'bg-emerald-500' : 'bg-sky-500'}`} 
            style={{ width: `${Math.min(100, progress)}%` }}
          ></div>
        </div>
      </div>

      {/* 3. Logic Actions */}
      <div className="shrink-0 min-w-[120px] flex justify-end">
        {itemInCart && needed > 0 ? (
          <button 
            type="button"
            onClick={() => putToDrawing?.(itemInCart, dwgId, canPut)}
            className="group relative overflow-hidden bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-emerald-900/20"
          >
            {Icons.Cart && <Icons.Cart className="w-3 h-3" />} Put {canPut}
          </button>
        ) : needed > 0 ? (
          <button 
            type="button"
            onClick={() => jumpToMark?.(plate.mark)}
            className={`flex items-center gap-2 p-2 px-3 rounded-lg text-[10px] font-black uppercase transition-all border group
              ${isPlateInAnyPallet?.(plate.mark)
                  ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600 hover:text-white"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-sky-600 hover:text-white"
              }`}
          >
            {Icons.Search ? <Icons.Search /> : <span>🔍</span>}
            <span className="group-hover:inline hidden ml-1">Find</span>
          </button>
        ) : (
          <div className="bg-emerald-500/10 p-1.5 rounded-full border border-emerald-500/20">
            {Icons.Check ? <Icons.Check className="text-emerald-500 w-4 h-4" /> : <span className="text-emerald-500">✓</span>}
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyDrawingsView = ({ Icons }) => (
  <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/10">
    <div className="opacity-20 mb-4">
      {Icons.Box ? <Icons.Box className="w-12 h-12" /> : <div className="text-4xl">📦</div>}
    </div>
    <div className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">
      No Active Drawings
    </div>
  </div>
);

export default memo(CartDrawingsView);
