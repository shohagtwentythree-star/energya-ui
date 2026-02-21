import React, { useState, useEffect } from "react";
import CartPalletsView from './CartPalletsView';
import CartCartView from './CartCartView';
import CartDrawingsView from './CartDrawingsView';
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
  
  const isPlateInAnyPallet = (mark) => {
  return pallets.some(pal =>
    pal.plates?.some(pl => pl.mark === mark)
  );
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
          ...d,
          drawingId: d._id,
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
{/* --- CALLING THE COMPONENT --- */}
<CartPalletsView 
  activeTab={activeTab}
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
  handleSearch={handleSearch}
  sortType={sortType}
  setSortType={setSortType}
  pallets={pallets}        // Empty array is fine
  activePlates={activePlates}    // This will trigger the "Empty Position" UI
  activeCoord={activeCoord}
  setActiveCoord={setActiveCoord}
  handleCoordChange={handleCoordChange}
  getCoordKey={getCoordKey}
  getGlobalStats={getGlobalStats}
  renderPlateCard={renderPlateCard}
  Icons={Icons}
/>


          </div>
        </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        


<CartCartView 
  activeTab={activeTab}
  cart={cart}
  putToDrawing={putToDrawing}
  removeFromCart={removeFromCart}
  getMatchedDrawings={getMatchedDrawings}
  Icons={Icons}
/>


        
<CartDrawingsView 
  activeTab={activeTab} // Ensure this is exactly "drawings"
  drawings={drawings}
  cart={cart}
  putToDrawing={putToDrawing}
  jumpToMark={jumpToMark}
  isPlateInAnyPallet={isPlateInAnyPallet} // Dummy return for now
  Icons={Icons}
/>




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
