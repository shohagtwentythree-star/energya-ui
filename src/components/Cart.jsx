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
  ArrowRight: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>,
};

export default function CartBridge() {
// --- STATE & PERSISTENCE ---
const [activeTab, setActiveTab] = useState(() => {
  const saved = localStorage.getItem("lastTab");
  // Simply return the saved tab if it exists, otherwise default to "pallets"
  return saved || "pallets";
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
    
    if (json.status === "success") {
      // Filter the data immediately before setting state
      const waitingDrawings = (json.data || []).filter(
        (dwg) => dwg.status === "waiting"
      );
      setDrawings(waitingDrawings);
    }
  } catch (e) { 
    console.error("API Error", e); 
  }
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

  // --- PROGRAMMATIC SEARCH ---
// --- UPDATED JUMP LOGIC ---
const jumpToMark = (mark) => {
  // 1. Find the pallet containing this mark
  const foundPallet = pallets.find(p => 
    p.plates.some(plate => plate.mark.toUpperCase() === mark.toUpperCase())
  );

  if (foundPallet) {
    // 2. Set the coordinate
    setActiveCoord({ x: foundPallet.x, y: foundPallet.y, z: foundPallet.z });
    // 3. Switch to Stock tab
    setActiveTab("pallets"); 
    // 4. Set search term so the list is filtered to exactly what you looked for
    setSearchTerm(mark); 
  } else {
    alert(`Mark "${mark}" not found in any pallet.`);
  }
};

// --- UPDATED SEARCH HANDLER (Form) ---
const handleSearch = (e) => {
  e.preventDefault();
  if (!searchTerm.trim()) return;

  const foundPallet = pallets.find(p => 
    p.plates.some(plate => plate.mark.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (foundPallet) {
    setActiveCoord({ x: foundPallet.x, y: foundPallet.y, z: foundPallet.z });
    // Keep the search term so the UI filters the specific pallet's plates
  } else {
    alert(`Mark "${searchTerm}" not found.`);
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
  
  
  
  const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedPlate, setSelectedPlate] = useState(null);
const [customQty, setCustomQty] = useState(1);

useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === "Escape") setIsModalOpen(false);
    if (e.key === "Enter" && isModalOpen) {
      addToCart(selectedPlate, customQty);
      setIsModalOpen(false);
    }
  };

  if (isModalOpen) {
    document.body.style.overflow = 'hidden';
    window.addEventListener("keydown", handleKeyDown);
  } else {
    document.body.style.overflow = 'unset';
  }
  return () => {
    document.body.style.overflow = 'unset';
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [isModalOpen, customQty, selectedPlate]);


  
  const handleCoordChange = (axis, value) => {
  // Allow empty string so user can delete the number to type a new one
  if (value === "") {
    setActiveCoord(prev => ({ ...prev, [axis]: "" }));
    return;
  }
  
  const num = parseInt(value, 10);
  if (!isNaN(num)) {
    setActiveCoord(prev => ({ ...prev, [axis]: num }));
  }
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
    // --- DYNAMIC CARD RENDERER (WITH CROSS-REFERENCE) ---
  const renderPlateCard = (p, i, isFulfilled = false) => {
    const { totalRequired, totalPut, inCart, netRemaining } = p.stats;
    const isUrgent = netRemaining > 0;
    
    // Find where else this plate exists
    const otherLocations = pallets.filter(pal => 
      pal.plates.some(pl => pl.mark === p.mark) && 
      getCoordKey(pal) !== coordKey
    );

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

        {/* --- CROSS REFERENCE SECTION --- */}
        {otherLocations.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-[1px] flex-1 bg-slate-800"></div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Other Locations</span>
              <div className="h-[1px] flex-1 bg-slate-800"></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {otherLocations.map((loc, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCoord({ x: loc.x, y: loc.y, z: loc.z })}
                  className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 px-2 py-1 rounded-md transition-all group/jump"
                >
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{loc.x}.{loc.y}.{loc.z}</span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase">#{loc.orderNumber || 'STOCK'}</span>
                  <div className="text-slate-600 group-hover/jump:text-sky-400 transition-colors">
                    <Icons.ArrowRight />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
          
<button 
  onClick={() => {
    setSelectedPlate(p);
    setCustomQty(0); // Default to demand
    setIsModalOpen(true);
  }} 
  className="w-12 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-lg border border-slate-700 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
>
  ±
</button>

        </div>
      </div>
    );
  };

  // Inside your component, before the return
const getTabCount = (tabId) => {
  switch (tabId) {
    case "cart": return cart.length;
    case "drawings": return drawings.length;
    case "pallets": return activePlates.length;
    default: return 0;
  }
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
                    { id: "cart", icon: Icons.Cart, label: "Cart" },
                    { id: "drawings", icon: Icons.Box, label: "Drawings" }
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
  {getTabCount(tab.id)}
</span>
                  </button>
                ))}
              </div>
            </div>

            {/* --- VIEW: PALLETS --- */}
{activeTab === "pallets" && (
  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    {/* 1. SEARCH & SORT ROW (Now in a single row) */}
    <div className="flex items-center gap-2">
      <form onSubmit={handleSearch} className="relative flex-1 group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-sky-500 transition-colors">
          <Icons.Search />
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
    
    {/* --- GLOBAL SEARCH RESULTS (ROBUST SINGLE ROW) --- */}
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
              {/* LEFT: Mark and Coord Side-by-Side */}
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

              {/* RIGHT: Action */}
              {isCurrent ? (
                <div className="px-3 py-1 bg-sky-500/20 rounded-lg border border-sky-500/30">
                   <span className="text-[8px] font-black text-sky-400 uppercase">Viewing</span>
                </div>
              ) : (
                <button 
                  onClick={() => setActiveCoord({ x: match.pallet.x, y: match.pallet.y, z: match.pallet.z })}
                  className="flex items-center gap-2 bg-slate-950 hover:bg-amber-500 text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-800 hover:border-amber-400 group/btn"
                >
                  Jump <Icons.ArrowRight className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          );
        });
      })()}
    </div>
  </div>
)}


    {/* 2. COORD NAVIGATION DASHBOARD (RESTORING YOUR ORIGINAL UI) */}
  {/* COORD NAVIGATION DASHBOARD */}
<div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
  <div className="grid grid-cols-2 gap-4">
    {["x", "y"].map((axis) => (
      <div key={axis} className="bg-slate-950 rounded-xl p-1.5 flex items-center border border-slate-800 shadow-inner group focus-within:border-sky-500/50 transition-all">
        {/* Minus Button */}
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
            onFocus={(e) => e.target.select()} // Selects text on click for easy overwriting
            onChange={(e) => handleCoordChange(axis, e.target.value)}
            className="w-full bg-transparent text-center text-xl font-mono font-bold text-sky-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Plus Button */}
        <button 
          type="button"
          onClick={() => handleCoordChange(axis, (Number(activeCoord[axis]) || 0) + 1)} 
          className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center font-black text-lg active:scale-95"
        > + </button>
      </div>
    ))}
  </div>
</div>


    {/* 3. LIST RENDERING (WITH FILTER LOGIC) */}
    {activePlates.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl opacity-40">
        <Icons.Box />
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
)}

          </div>
        </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        


{/* --- VIEW: CART (MINIMALIST) --- */}
{activeTab === "cart" && (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    {cart.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-slate-800 rounded-3xl opacity-40">
        <Icons.Cart />
        <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">Cart is Empty</div>
      </div>
    ) : (
      cart.map((c) => {
        const matched = getMatchedDrawings(c.mark);
        return (
          <div key={c._id} className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            
            {/* MINIMAL HEADER */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <span className="text-xl font-mono font-black text-white tracking-tighter">{c.mark}</span>
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
                  onDoubleClick={() => removeFromCart(c._id)} 
                  className="text-slate-600 hover:text-red-500 transition-colors p-1"
                  title="Double tap to bin"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                  <div key={mi} className={`flex items-center justify-between p-3 rounded-xl transition-all ${isDone ? 'opacity-30 grayscale' : 'hover:bg-slate-800/40'}`}>
                    
                    {/* Drawing Number & Progress mini */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-300">{m.drawingNumber}</span>
                      <div className="flex items-center gap-2">
                         <div className="w-16 bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-sky-500" 
                              style={{width: `${(m.foundCount/m.requiredQty)*100}%`}}
                            ></div>
                         </div>
                         <span className="text-[9px] font-mono text-slate-500">{m.foundCount}/{m.requiredQty}</span>
                      </div>
                    </div>

                    {/* Compact Action */}
                    <div>
                      {isDone ? (
                        <span className="text-[9px] text-emerald-500 font-bold uppercase mr-2">Matched</span>
                      ) : (
                        <button 
                          onClick={() => putToDrawing(c, m.drawingId, canGive)} 
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
)}

        
{/* --- VIEW: DRAWINGS (MINIMALIST TARGET UI) --- */}
{activeTab === "drawings" && (
  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
    {drawings.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-800 rounded-2xl opacity-40">
        <Icons.Box />
        <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-4">No Drawings found</div>
      </div>
    ) : (
      drawings
        .slice() // Create a shallow copy to avoid mutating the original state
        .sort((a, b) => Number(a.serialNumber) - Number(b.serialNumber))
       .map((dwg) => {
        const multiplier = Number(dwg.dwgQty) || 1;
        const totalPlates = dwg.plates?.length || 0;
        const finishedPlates = dwg.plates?.filter(p => (p.foundCount || 0) >= (Number(p.qty) * multiplier)).length || 0;
        const isFullyComplete = totalPlates > 0 && totalPlates === finishedPlates;

        return (
          <div key={dwg._id} className={`bg-slate-900/40 border rounded-2xl overflow-hidden transition-all ${
            isFullyComplete ? 'border-emerald-500/20 opacity-60' : 'border-slate-800'
          }`}>
            
            {/* MINIMAL HEADER */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-900/60 border-b border-slate-800/50">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-mono font-black text-white tracking-tight">{dwg.drawingNumber}</h3>
                    
                    <span className="text-[16px] text-slate-100 font-bold font-mono">- SN: {dwg.serialNumber}</span>
                
              </div>
              <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                <span className="text-[9px] text-slate-500 font-black uppercase">Done</span>
                <span className="text-sm font-mono font-bold text-sky-400">{finishedPlates}/{totalPlates}</span>
              </div>
            </div>

            {/* NESTED PLATE ROWS */}
            <div className="p-2 space-y-1">
              {dwg.plates?.map((plate, pi) => {
                const totalReq = (Number(plate.qty) || 0) * multiplier;
                const found = Number(plate.foundCount) || 0;
                const needed = Math.max(0, totalReq - found);
                const itemInCart = cart.find(c => c.mark === plate.mark);
                const canPut = itemInCart ? Math.min(itemInCart.quantity, needed) : 0;
                const progress = totalReq > 0 ? (found / totalReq) * 100 : 0;

                return (
                  <div key={pi} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                    needed === 0 ? 'bg-slate-950/30 opacity-40' : 'bg-slate-900/20 hover:bg-slate-800/40'
                  }`}>
                    
                    {/* 1. Mark & Missing */}
                    <div className="shrink-0 min-w-[90px]">
                      <div className="text-sm font-black text-slate-200 font-mono leading-none">{plate.mark}</div>
                      {needed > 0 ? (
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">Need {needed}</span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Ready</span>
                      )}
                    </div>

                    {/* 2. Progress & Ratio */}
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono px-1">
                        <span className="text-slate-500">Progress</span>
                        <span className={needed === 0 ? "text-emerald-500 font-bold" : "text-slate-300"}>{found}/{totalReq}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-700 ${needed === 0 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                          style={{ width: `${Math.min(100, progress)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* 3. Action */}
                    <div className="shrink-0 min-w-[120px] flex justify-end">
{/* 3. Action */}
<div className="shrink-0 min-w-[120px] flex justify-end">
  {itemInCart && needed > 0 ? (
    <button 
      onClick={() => putToDrawing(itemInCart, dwg._id, canPut)}
      className="w-auto bg-emerald-600 hover:bg-emerald-500 text-white py-2 px-3 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
    >
      <Icons.Cart className="w-3 h-3" /> Put {canPut}
    </button>
  ) : needed > 0 ? (
    /* 👇 NEW SEARCH BUTTON */
    <button 
      onClick={() => jumpToMark(plate.mark)}
      className="w-auto bg-slate-800 hover:bg-sky-600 text-slate-400 hover:text-white p-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-sky-400"
    >
      <Icons.Search />
    </button>
  ) : (
    <div className="bg-emerald-500/10 p-1.5 rounded-full border border-emerald-500/20">
      <Icons.Check className="text-emerald-500 w-3.5 h-3.5" />
    </div>
  )}
</div>

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
)}



      </div>
      
{isModalOpen && selectedPlate && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    
    {/* Container */}
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Manual Dispatch
          </p>
          <h2 className="text-3xl font-mono font-bold text-white">
            {selectedPlate.mark}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Loc: {activeCoord.x}.{activeCoord.y}.{activeCoord.z}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(false)}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-8 space-y-6">

        {/* Quantity Selector (UNCHANGED) */}
        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-3">
          
          <button
            onClick={() =>
              setCustomQty((prev) => Math.max(1, prev - 1))
            }
            className="w-12 h-12 rounded-xl bg-slate-800 text-lg font-bold text-sky-400 active:scale-95 transition"
          >
            −
          </button>

          <input
            type="number"
            inputMode="numeric"
            min={1}
           
            value={customQty}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (isNaN(value)) return;
              if (value < 1) return setCustomQty(1);
             
              setCustomQty(value);
            }}
            onFocus={(e) => e.target.select()}
            className="w-24 bg-transparent text-center text-4xl font-mono font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoFocus
          />

          <button
            onClick={() =>
              setCustomQty((prev) =>
                Math.min(prev + 1)
              )
            }
            className="w-12 h-12 rounded-xl bg-slate-800 text-lg font-bold text-emerald-400 active:scale-95 transition"
          >
            +
          </button>
        </div>

        {/* Presets (UPDATED TO INCREMENTAL) */}
        <div className="flex flex-wrap gap-2 justify-center">



          {/* -5 */}
          <button
            onClick={() =>
              setCustomQty((prev) => Math.max(1, prev - 5))
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 transition"
          >
            -5
          </button>

          {/* +5 */}
          <button
            onClick={() =>
              setCustomQty((prev) =>
                Math.min(prev + 5)
              )
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 transition"
          >
            +5
          </button>
          
                    {/* -10 */}
          <button
            onClick={() =>
              setCustomQty((prev) => Math.max(1, prev - 10))
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 transition"
          >
            -10
          </button>

          {/* +10 */}
          <button
            onClick={() =>
              setCustomQty((prev) =>
                Math.min(prev + 10)
              )
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 transition"
          >
            +10
          </button>

          {/* ALL */}
          <button
            onClick={() =>
              setCustomQty(selectedPlate.stats.netRemaining)
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg border bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 transition"
          >
            ALL ({selectedPlate.stats.netRemaining})
          </button>
        </div>

        {/* Remaining Info */}
        <div className="text-center text-xs text-slate-500">
          Available: {selectedPlate.stats.netRemaining}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-800 bg-slate-900">
        <button
         
          onClick={() => {
            if (
              customQty >= 1
            ) {
              addToCart(selectedPlate, customQty);
              setIsModalOpen(false);
            }
          }}
          className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition active:scale-95"
        >
          Confirm & Add
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
