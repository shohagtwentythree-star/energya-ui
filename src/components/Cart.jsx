import React, { useState, useEffect } from "react";

const PALLET_API = "http://localhost:3000/pallets";
const DRAWING_API = "http://localhost:3000/drawings";
const CART_API = "http://localhost:3000/cart";

// --- ICONS (Inline SVGs for portability) ---
const Icons = {
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Refresh: ({ spin }) => <svg className={`w-4 h-4 ${spin ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Cart: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Box: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
};

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

  const [sortType, setSortType] = useState(() => {
    return localStorage.getItem("bridge_pallet_sort_pref") || "demand";
  });

  const [pallets, setPallets] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // NEW FEATURE: Search State
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { localStorage.setItem("lastTab", activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem("lastCoord", JSON.stringify(activeCoord)); }, [activeCoord]);
  useEffect(() => { localStorage.setItem("bridge_pallet_sort_pref", sortType); }, [sortType]);
  
  useEffect(() => { fetchAll(); }, []);

  // --- API FETCHING ---
  const fetchAll = async () => {
    setIsLoading(true);
    try { await Promise.all([fetchPallets(), fetchDrawings(), fetchCart()]); } 
    finally { setIsLoading(false); }
  };

  const fetchPallets = async () => {
    try {
      const res = await fetch(PALLET_API);
      const json = await res.json();
      if (json.status === "success") setPallets(json.data || []);
    } catch (e) { console.error("API Error", e); }
  };

  const fetchDrawings = async () => {
    try {
      const res = await fetch(DRAWING_API);
      const json = await res.json();
      if (json.status === "success") setDrawings(json.data || []);
    } catch (e) { console.error("API Error", e); }
  };

  const fetchCart = async () => {
    try {
      const res = await fetch(CART_API);
      const json = await res.json();
      if (json.status === "success") setCart(json.data || []);
    } catch (e) { console.error("API Error", e); }
  };

  // --- HELPERS ---
  const getCoordKey = (obj) => `${obj?.x || 0}-${obj?.y || 0}-${obj?.z || 0}`;

  const coordKey = getCoordKey(activeCoord);
  const currentPallet = pallets.find((p) => getCoordKey(p) === coordKey);
  const activePlates = currentPallet?.plates || [];

  const getMatchedDrawings = (itemMark) => {
    return drawings
      .filter((d) => Array.isArray(d.plates) && d.plates.some((p) => p.mark === itemMark))
      .map((d) => {
        const matchedPlate = d.plates.find((p) => p.mark === itemMark);
        const multiplier = Number(d.dwgQty) || 1;
        return {
          drawingId: d._id,
          drawingNumber: d.drawingNumber,
          status: d.status, 
          requiredQty: (Number(matchedPlate?.qty) || 0) * multiplier,
          foundCount: Number(matchedPlate?.foundCount) || 0, 
        };
      });
  };

  // --- NEW FEATURE: SEARCH LOGIC ---
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // Find the first pallet that contains the searched mark
    const foundPallet = pallets.find(p => 
      p.plates.some(plate => plate.mark.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (foundPallet) {
      setActiveCoord({ x: foundPallet.x, y: foundPallet.y, z: foundPallet.z });
      setSearchTerm(""); // Clear search after finding
      // Optional: Visual cue could be added here
    } else {
      alert(`Mark "${searchTerm}" not found in current pallets.`);
    }
  };

  // --- UPDATED STATS LOGIC ---
  const getGlobalStats = (mark) => {
    const matches = getMatchedDrawings(mark);
    const totalRequired = matches.reduce((sum, m) => sum + m.requiredQty, 0);
    const totalPut = matches.reduce((sum, m) => sum + m.foundCount, 0);
    const inCart = cart.filter(c => c.mark === mark).reduce((sum, c) => sum + c.quantity, 0);
    
    // Calculate netRemaining ONLY for 'waiting' drawings
    const waitingRequired = matches
      .filter(m => m.status === "waiting")
      .reduce((sum, m) => sum + m.requiredQty, 0);
    const waitingPut = matches
      .filter(m => m.status === "waiting")
      .reduce((sum, m) => sum + m.foundCount, 0);
    
    const netRemaining = Math.max(0, (waitingRequired - waitingPut) - inCart);
    
    return { totalRequired, totalPut, inCart, netRemaining, matches };
  };

  // --- ACTIONS ---
  const addToCart = async (plate, qty) => {
    if (!qty || qty <= 0) return;
    const existing = cart.find((c) => c.mark === plate.mark && c.coord === coordKey);
    const body = existing 
      ? { ...existing, quantity: existing.quantity + qty }
      : { ...plate, coord: coordKey, quantity: qty };

    const url = existing ? `${CART_API}/${existing._id}` : CART_API;
    const method = existing ? "PUT" : "POST";
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

    await fetch(`${DRAWING_API}/${drawingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plates: updatedPlates }),
    });

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

  // --- DYNAMIC CARD RENDERER ---
  const renderPlateCard = (p, i, isFulfilled = false) => {
    const { totalRequired, totalPut, inCart, netRemaining } = p.stats;
    const isUrgent = netRemaining > 0;
    
    // Progress calculation for visual bar
    const progress = totalRequired > 0 ? (totalPut / totalRequired) * 100 : 0;
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
      <div key={i} className={`group relative p-5 rounded-2xl border transition-all duration-300 ${
        isFulfilled 
          ? 'bg-slate-900/40 border-slate-800 opacity-70 hover:opacity-100' 
          : 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-sky-500/30 shadow-lg shadow-sky-900/10 hover:shadow-sky-500/20'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-mono font-black text-white tracking-tighter group-hover:text-sky-400 transition-colors">{p.mark}</h3>
            {isUrgent && <div className="inline-flex items-center gap-1.5 bg-sky-500/10 text-sky-400 text-[10px] px-2 py-1 rounded border border-sky-500/20 font-bold uppercase tracking-wider">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                Demand: {netRemaining}
            </div>}
          </div>
          
          <div className="flex gap-4 text-right">
             <div className="flex flex-col items-end">
                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Total Req</span>
                <span className="text-sm font-mono text-white">{totalRequired}</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[9px] text-emerald-600 uppercase font-bold tracking-wider">Put</span>
                <span className="text-sm font-mono text-emerald-500">{totalPut}</span>
             </div>
             <div className="flex flex-col items-end">
                <span className="text-[9px] text-amber-600 uppercase font-bold tracking-wider">Cart</span>
                <span className="text-sm font-mono text-amber-500">{inCart}</span>
             </div>
          </div>
        </div>

        {/* Mini Progress Bar */}
        <div className="h-1 w-full bg-slate-800 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${clampedProgress}%` }}></div>
        </div>

        <div className="flex gap-2">
          <button 
              disabled={netRemaining === 0}
              onClick={() => addToCart(p, netRemaining)} 
              className={`flex-1 py-3 rounded-xl font-black text-xs transition-all uppercase tracking-widest flex justify-center items-center gap-2 relative overflow-hidden ${
                netRemaining > 0 
                  ? "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/50" 
                  : "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
              }`}
          >
              {netRemaining > 0 ? (
                <>
                  <span>Pick All</span> 
                  <span className="bg-white/20 px-2 py-0.5 rounded text-white min-w-[1.5rem]">{netRemaining}</span>
                </>
              ) : <span className="flex items-center gap-1"><Icons.Check/> Fulfilled</span>}
          </button>
          
          <button onClick={() => {
              const val = prompt("Manual Quantity:", netRemaining || 0);
              if(val) addToCart(p, Number(val));
          }} className="w-12 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-lg border border-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
            ±
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-sky-500/30">
        
        {/* TOP BAR: Search & Tabs */}
        <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 shadow-2xl">
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            
            <div className="flex gap-3">
              {/* Tabs */}
              <div className="flex-1 flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                {[
                    { id: "pallets", icon: Icons.Box, label: "Stock" }, 
                    { id: "cart", icon: Icons.Cart, label: "Cart" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-lg"
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <tab.icon />
                    {tab.label}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] min-w-[18px] ${activeTab === tab.id ? 'bg-black/20' : 'bg-slate-800 text-slate-500'}`}>
                      {tab.id === "cart" ? cart.length : activePlates.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button 
                onClick={fetchAll} 
                className="w-12 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 transition-colors"
                title="Refresh Data"
              >
                <Icons.Refresh spin={isLoading} />
              </button>
            </div>

            {/* NEW: Search Bar & Sort */}
            {activeTab === "pallets" && (
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-500 transition-colors">
                            <Icons.Search />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Find Mark location (e.g. PL-203)..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 placeholder-slate-600 transition-all"
                        />
                    </div>
                    <div className="flex bg-slate-900 rounded-xl border border-slate-800 p-1">
                        {['demand', 'mark'].map(s => (
                        <button key={s} type="button" onClick={() => setSortType(s)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${sortType === s ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
                            {s}
                        </button>
                        ))}
                    </div>
                </form>
            )}
          </div>
        </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        
        {/* COORD NAVIGATION DASHBOARD */}
        {activeTab === "pallets" && (
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Coordinate</span>
                    <span className="text-[10px] font-mono text-slate-600">{coordKey}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                {["x", "y"].map((axis) => (
                    <div key={axis} className="bg-slate-950 rounded-xl p-1.5 flex items-center border border-slate-800 shadow-inner">
                        <button onClick={() => setActiveCoord(p => ({ ...p, [axis]: Math.max(0, p[axis] - 1) }))} className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-sky-600 hover:text-white transition-colors flex items-center justify-center font-black text-lg active:scale-95 transform"> − </button>
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-[8px] text-slate-500 font-bold uppercase">{axis.toUpperCase()} AXIS</span>
                            <span className="text-xl font-mono font-bold text-sky-400 leading-none">{activeCoord[axis] || 0}</span>
                        </div>
                        <button onClick={() => setActiveCoord(p => ({ ...p, [axis]: (p[axis] || 0) + 1 }))} className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center font-black text-lg active:scale-95 transform"> + </button>
                    </div>
                ))}
                </div>
            </div>
        )}

        {/* --- VIEW: PALLETS (SPLIT & SORTED) --- */}
        {activeTab === "pallets" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activePlates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl opacity-50">
                <div className="bg-slate-900 p-4 rounded-full mb-4"><Icons.Box /></div>
                <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Empty Position</div>
              </div>
            ) : (
              <>
                {/* TO PICK SECTION */}
                <div className="space-y-4">
                    {activePlates.some(p => getGlobalStats(p.mark).netRemaining > 0) && (
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-sky-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                                Priority Picks
                            </span>
                            <div className="h-px flex-1 bg-gradient-to-r from-sky-500/20 to-transparent"></div>
                        </div>
                    )}
                  
                  <div className="grid gap-4">
                    {activePlates
                        .map(p => ({ ...p, stats: getGlobalStats(p.mark) }))
                        .filter(p => p.stats.netRemaining > 0)
                        .sort((a, b) => sortType === 'demand' ? b.stats.netRemaining - a.stats.netRemaining : a.mark.localeCompare(b.mark))
                        .map((p, i) => renderPlateCard(p, i, false))}
                  </div>
                </div>

                {/* AVAILABLE SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mt-8">
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Inventory</span>
                    <div className="h-px flex-1 bg-slate-800"></div>
                  </div>
                  <div className="grid gap-4 opacity-80 hover:opacity-100 transition-opacity">
                    {activePlates
                        .map(p => ({ ...p, stats: getGlobalStats(p.mark) }))
                        .filter(p => p.stats.netRemaining <= 0)
                        .sort((a, b) => a.mark.localeCompare(b.mark))
                        .map((p, i) => renderPlateCard(p, i, true))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* --- VIEW: CART --- */}
        {activeTab === "cart" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-3xl opacity-50">
                  <div className="bg-slate-900 p-4 rounded-full mb-4 text-slate-600"><Icons.Cart /></div>
                  <div className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cart is Empty</div>
              </div>
            ) : (
              cart.map((c) => {
                const matched = getMatchedDrawings(c.mark);
                return (
                  <div key={c._id} className="bg-slate-900/80 backdrop-blur p-5 rounded-2xl border border-slate-700 relative group shadow-xl">
                    <button onDoubleClick={() => removeFromCart(c._id)} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all p-2" title="Double click to remove">✕</button>
                    
                    <div className="flex items-end justify-between pr-12 mb-6 border-b border-slate-800 pb-4">
                      <div>
                          <span className="text-4xl font-mono font-black text-amber-400 block tracking-tighter drop-shadow-sm">{c.mark}</span>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="bg-slate-800 text-slate-400 text-[9px] px-2 py-1 rounded border border-slate-700 uppercase font-bold tracking-wider">Source: {c.coord}</span>
                          </div>
                      </div>
                      <div className="text-center bg-amber-500/10 px-5 py-3 rounded-2xl border border-amber-500/20">
                         <span className="block text-[9px] text-amber-600 font-black uppercase tracking-widest mb-1">In Hand</span>
                         <span className="text-3xl font-black text-amber-500 leading-none">{c.quantity}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {matched.map((m, mi) => {
                        const needed = Math.max(0, m.requiredQty - m.foundCount);
                        const canGive = Math.min(c.quantity, needed);
                        const progress = m.requiredQty > 0 ? (m.foundCount / m.requiredQty) * 100 : 0;
                        const isDone = needed === 0;

                        return (
                          <div key={mi} className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${isDone ? 'bg-slate-950/30 border-slate-800/30 opacity-60' : 'bg-black/30 border-slate-800'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-black text-slate-200 tracking-wide flex items-center gap-2">
                                {m.drawingNumber} 
                                <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-tighter font-bold ${isDone ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>{m.status}</span>
                              </span>
                              <div className="text-[10px] font-mono text-slate-400">
                                 <span className={isDone ? "text-emerald-500" : "text-white"}>{m.foundCount}</span> / {m.requiredQty}
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                               <div className={`h-full transition-all duration-500 ${isDone ? 'bg-emerald-600' : 'bg-sky-500'}`} style={{width: `${progress}%`}}></div>
                            </div>

                            <div className="flex justify-between items-center">
                               <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">{isDone ? "Complete" : `Missing ${needed}`}</span>
                               <button 
                                  disabled={isDone} 
                                  onClick={() => putToDrawing(c, m.drawingId, canGive)} 
                                  className="bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-900/20 px-4 py-2 rounded-lg text-[10px] font-black uppercase text-white transition-all transform active:scale-95"
                               >
                                 Put {canGive}
                               </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
