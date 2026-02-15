import React, { useState, useEffect } from "react";

const PALLET_API = "http://localhost:3000/pallets";
const DRAWING_API = "http://localhost:3000/drawings";
const CART_API = "http://localhost:3000/cart";

export default function CartBridge() {
  // --- STATE & PERSISTENCE ---
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("lastTab");
    return (saved && saved !== "drawings") ? saved : "pallets";
  });
  
  const [activeCoord, setActiveCoord] = useState(() => {
    const saved = localStorage.getItem("lastCoord");
    return saved ? JSON.parse(saved) : { x: 0, y: 0, z: 0 };
  });

  const [pallets, setPallets] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { localStorage.setItem("lastTab", activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem("lastCoord", JSON.stringify(activeCoord)); }, [activeCoord]);
  useEffect(() => { fetchAll(); }, []);

  // --- API FETCHING ---
  const fetchAll = async () => {
    setIsLoading(true);
    try { await Promise.all([fetchPallets(), fetchDrawings(), fetchCart()]); } 
    finally { setIsLoading(false); }
  };

  const fetchPallets = async () => {
    const res = await fetch(PALLET_API);
    const json = await res.json();
    if (json.status === "success") setPallets(json.data || []);
  };

  const fetchDrawings = async () => {
    const res = await fetch(DRAWING_API);
    const json = await res.json();
    if (json.status === "success") setDrawings(json.data || []);
  };

  const fetchCart = async () => {
    const res = await fetch(CART_API);
    const json = await res.json();
    if (json.status === "success") setCart(json.data || []);
  };

  // --- HELPERS ---
  const getCoordKey = (obj) => `${obj?.x || 0}-${obj?.y || 0}-${obj?.z || 0}`;

  const coordKey = getCoordKey(activeCoord);
  const currentPallet = pallets.find((p) => getCoordKey(p) === coordKey);
  const activePlates = currentPallet?.plates || [];

  // Robust Matcher: Calculates Required (w/ Multiplier) and Found separately
  const getMatchedDrawings = (itemMark) => {
    return drawings
      .filter((d) => Array.isArray(d.plates) && d.plates.some((p) => p.mark === itemMark))
      .map((d) => {
        const matchedPlate = d.plates.find((p) => p.mark === itemMark);
        const multiplier = Number(d.dwgQty) || 1;
        return {
          drawingId: d._id,
          drawingNumber: d.drawingNumber,
          // Total needed for this batch
          requiredQty: (Number(matchedPlate?.qty) || 0) * multiplier,
          // Total already put/found
          foundCount: Number(matchedPlate?.foundCount) || 0, 
        };
      });
  };

  // --- ACTIONS ---
  const addToCart = async (plate, qty) => {
    if (!qty || qty <= 0) return;
    const existing = cart.find((c) => c.mark === plate.mark && c.coord === coordKey);

    const body = existing 
      ? { ...existing, quantity: existing.quantity + qty }
      : { ...plate, coord: coordKey, quantity: qty }; // Strip _id handled by DB usually, or robust backend

    const url = existing ? `${CART_API}/${existing._id}` : CART_API;
    const method = existing ? "PUT" : "POST";

    // Clean up body for POST to avoid ID conflicts if plate object has _id
    if (!existing) delete body._id;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    fetchAll();
  };

  const removeFromCart = async (cartId) => {
    await fetch(`${CART_API}/${cartId}`, { method: "DELETE" });
    fetchAll();
  };

  const putToDrawing = async (cartItem, drawingId, qty) => {
    const drawing = drawings.find((d) => d._id === drawingId);
    if (!drawing) return;

    const updatedPlates = drawing.plates.map((p) => {
      if (p.mark === cartItem.mark) {
        return { ...p, foundCount: (p.foundCount || 0) + qty };
      }
      return p;
    });

    // 1. Update Drawing
    await fetch(`${DRAWING_API}/${drawingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plates: updatedPlates }),
    });

    // 2. Update Cart
    const remainingInCart = cartItem.quantity - qty;
    if (remainingInCart <= 0) {
      await fetch(`${CART_API}/${cartItem._id}`, { method: "DELETE" });
    } else {
      await fetch(`${CART_API}/${cartItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cartItem, quantity: remainingInCart }),
      });
    }
    fetchAll();
  };

  // --- RENDER HELPERS ---
  // Calculates global stats for a specific Mark across all drawings
  const getGlobalStats = (mark) => {
    const matches = getMatchedDrawings(mark);
    const totalRequired = matches.reduce((sum, m) => sum + m.requiredQty, 0);
    const totalPut = matches.reduce((sum, m) => sum + m.foundCount, 0);
    const inCart = cart.filter(c => c.mark === mark).reduce((sum, c) => sum + c.quantity, 0);
    
    // Logic: (Total Needed - Already Installed) - (Already in my hands/cart)
    const netRemaining = Math.max(0, (totalRequired - totalPut) - inCart);
    
    return { totalRequired, totalPut, inCart, netRemaining, matches };
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 text-slate-200 min-h-screen bg-slate-950 font-sans">
      
      {/* TABS */}
      <div className="flex rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 shadow-xl">
        {["pallets", "cart"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 font-black text-xs tracking-[0.2em] transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-inner"
                : "text-slate-500 hover:bg-slate-700/50 hover:text-slate-300"
            }`}
          >
            {tab.toUpperCase()} 
            <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] ${activeTab === tab ? 'bg-black/20' : 'bg-slate-700'}`}>
              {tab === "cart" ? cart.length : activePlates.length}
            </span>
          </button>
        ))}
      </div>

      {/* COORD NAVIGATION (Only on Pallets Tab) */}
      {activeTab === "pallets" && (
        <div className="flex justify-center gap-6 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-sm">
          {["x", "y"].map((axis) => (
            <div key={axis} className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{axis.toUpperCase()} AXIS</span>
              <div className="flex items-center gap-3 bg-slate-950 rounded-xl p-1 border border-slate-800">
                <button onClick={() => setActiveCoord(p => ({ ...p, [axis]: Math.max(0, p[axis] - 1) }))} className="w-10 h-10 rounded-lg bg-slate-800 text-slate-400 hover:bg-sky-600 hover:text-white transition font-black">−</button>
                <span className="text-xl font-mono font-bold text-sky-400 w-8 text-center">{activeCoord[axis] || 0}</span>
                <button onClick={() => setActiveCoord(p => ({ ...p, [axis]: (p[axis] || 0) + 1 }))} className="w-10 h-10 rounded-lg bg-slate-800 text-slate-400 hover:bg-emerald-500 hover:text-white transition font-black">+</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- VIEW: PALLETS --- */}
      {activeTab === "pallets" && (
        <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activePlates.length === 0 ? (
            <div className="bg-slate-900/50 p-20 rounded-3xl border-2 border-dashed border-slate-800 text-center flex flex-col items-center justify-center gap-4">
              <div className="text-4xl">📦</div>
              <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Empty Position: {coordKey}</div>
            </div>
          ) : (
            [...activePlates]
              .map(p => ({ ...p, stats: getGlobalStats(p.mark) }))
              // Sort by highest "Net Remaining" need
              .sort((a, b) => b.stats.netRemaining - a.stats.netRemaining) 
              .map((p, i) => {
                const { totalRequired, totalPut, inCart, netRemaining } = p.stats;
                
                // Determine styling based on need
                const isUrgent = netRemaining > 0;
                const isComplete = totalRequired > 0 && totalPut >= totalRequired;

                return (
                  <div key={i} className={`bg-slate-900 p-5 rounded-2xl border transition-all ${isUrgent ? 'border-sky-500/30 shadow-lg shadow-sky-900/10' : 'border-slate-800 opacity-75'}`}>
                    
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-3xl font-mono font-black text-white tracking-tighter">{p.mark}</h3>
                          {isUrgent && <span className="bg-sky-500/10 text-sky-400 text-[9px] px-2 py-1 rounded border border-sky-500/20 font-black uppercase tracking-wider">Need {netRemaining}</span>}
                          {isComplete && <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-2 py-1 rounded border border-emerald-500/20 font-black uppercase tracking-wider">Done</span>}
                        </div>
                      </div>
                      
                      {/* Robust Stats Display */}
                      <div className="flex gap-4 text-right">
                         <div className="flex flex-col items-end">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Total Req</span>
                            <span className="text-sm font-mono font-bold text-white">{totalRequired}</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[9px] text-emerald-600 font-bold uppercase">Already Put</span>
                            <span className="text-sm font-mono font-bold text-emerald-500">{totalPut}</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[9px] text-amber-600 font-bold uppercase">In Cart</span>
                            <span className="text-sm font-mono font-bold text-amber-500">{inCart}</span>
                         </div>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="flex gap-3">
                      <button 
                          disabled={netRemaining === 0}
                          onClick={() => addToCart(p, netRemaining)} 
                          className="flex-1 bg-sky-600 disabled:bg-slate-800 disabled:text-slate-600 hover:bg-sky-500 py-4 rounded-xl font-black text-xs transition-all uppercase tracking-widest shadow-lg shadow-sky-900/20 flex justify-center items-center gap-2"
                      >
                          {netRemaining > 0 ? (
                            <><span>Add Remaining</span> <span className="bg-black/20 px-1.5 py-0.5 rounded text-white">{netRemaining}</span></>
                          ) : "Full / In Cart"}
                      </button>
                      <button onClick={() => {
                          const val = prompt("Manual Quantity:", 0);
                          if(val) addToCart(p, Number(val));
                      }} className="px-5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs border border-slate-700 text-slate-400 hover:text-white transition-colors">Custom</button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* --- VIEW: CART --- */}
      {activeTab === "cart" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {cart.length === 0 ? (
            <div className="bg-slate-900/50 p-20 rounded-3xl border-2 border-dashed border-slate-800 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
              Cart is Empty
            </div>
          ) : (
            cart.map((c) => {
              const matched = getMatchedDrawings(c.mark);
              return (
                <div key={c._id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 relative group">
                  
                  {/* Remove Button (Hover/Double Click) */}
                  <button 
                    onDoubleClick={() => removeFromCart(c._id)}
                    className="absolute top-4 right-4 text-slate-700 hover:text-red-500 transition-colors p-2"
                    title="Double Click to Remove"
                  >
                     ✕
                  </button>

                  {/* Cart Item Header */}
                  <div className="flex items-end justify-between pr-12 mb-6 border-b border-slate-800 pb-4">
                    <div>
                        <span className="text-3xl font-mono font-black text-amber-400 block tracking-tighter">{c.mark}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-0.5 rounded border border-slate-700 uppercase font-bold">From {c.coord}</span>
                        </div>
                    </div>
                    <div className="text-center bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                       <span className="block text-[9px] text-amber-600 font-black uppercase">In Hand</span>
                       <span className="text-2xl font-black text-amber-500">{c.quantity}</span>
                    </div>
                  </div>
                  
                  {/* Distribution List */}
                  <div className="space-y-3">
                    {matched.map((m, mi) => {
                      const needed = Math.max(0, m.requiredQty - m.foundCount);
                      const canGive = Math.min(c.quantity, needed);
                      const progress = m.requiredQty > 0 ? (m.foundCount / m.requiredQty) * 100 : 0;
                      
                      return (
                        <div key={mi} className="bg-black/20 p-3 rounded-xl border border-slate-800/50 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-white tracking-wide">{m.drawingNumber}</span>
                            <div className="text-[10px] font-mono text-slate-400">
                               Put: <span className="text-emerald-500 font-bold">{m.foundCount}</span> / <span className="text-slate-500">{m.requiredQty}</span>
                            </div>
                          </div>
                          
                          {/* Visual Progress */}
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500 transition-all" style={{width: `${progress}%`}}></div>
                          </div>

                          <div className="flex justify-between items-center mt-1">
                             <span className="text-[9px] text-slate-500 uppercase font-bold">{needed > 0 ? `Need ${needed} More` : "Completed"}</span>
                             <button 
                               disabled={needed === 0}
                               onClick={() => putToDrawing(c, m.drawingId, canGive)}
                               className="bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase text-white shadow-lg shadow-emerald-900/20 transition-all"
                             >
                               Put {canGive}
                             </button>
                          </div>
                        </div>
                      )
                    })}
                    {matched.length === 0 && <p className="text-center text-[10px] text-slate-600 uppercase font-bold py-2">No drawings require this part.</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
