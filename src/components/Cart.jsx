import React, { useState, useEffect, useCallback, useMemo } from "react";
import CartPalletsView from './CartPalletsView';
import CartCartView from './CartCartView';
import CartDrawingsView from './CartDrawingsView';

const PALLET_API = "http://localhost:3000/pallets";
const DRAWING_API = "http://localhost:3000/drawings";
const CART_API = "http://localhost:3000/cart";

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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("lastTab") || "pallets");
  const [activeCoord, setActiveCoord] = useState(() => {
    const saved = localStorage.getItem("lastCoord");
    return saved ? JSON.parse(saved) : { x: 0, y: 0, z: 0 };
  });
  const [sortType, setSortType] = useState(() => localStorage.getItem("bridge_pallet_sort_pref") || "demand");
  const [pallets, setPallets] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlate, setSelectedPlate] = useState(null);
  const [customQty, setCustomQty] = useState(1);

  // Persistence Sync
  useEffect(() => { localStorage.setItem("lastTab", activeTab); }, [activeTab]);
  useEffect(() => { localStorage.setItem("lastCoord", JSON.stringify(activeCoord)); }, [activeCoord]);
  useEffect(() => { localStorage.setItem("bridge_pallet_sort_pref", sortType); }, [sortType]);

  // --- API FETCHING ---
  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pRes, dRes, cRes] = await Promise.all([
        fetch(PALLET_API).then(r => r.json()),
        fetch(DRAWING_API).then(r => r.json()),
        fetch(CART_API).then(r => r.json())
      ]);

      if (pRes.status === "success") setPallets(pRes.data || []);
      if (dRes.status === "success") {
        setDrawings((dRes.data || []).filter(dwg => dwg.status === "waiting"));
      }
      if (cRes.status === "success") setCart(cRes.data || []);
    } catch (e) { console.error("Refresh Error", e); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- HELPERS (Memoized for Performance) ---
  const getCoordKey = useCallback((obj) => `${obj?.x || 0}-${obj?.y || 0}-${obj?.z || 0}`, []);

  const coordKey = useMemo(() => getCoordKey(activeCoord), [activeCoord, getCoordKey]);
  
  const activePlates = useMemo(() => {
    return pallets.find((p) => getCoordKey(p) === coordKey)?.plates || [];
  }, [pallets, coordKey, getCoordKey]);

  const getMatchedDrawings = useCallback((itemMark) => {
    return drawings
      .filter((d) => Array.isArray(d.plates) && d.plates.some((p) => p.mark === itemMark))
      .map((d) => {
        const matchedPlate = d.plates.find((p) => p.mark === itemMark);
        return {
          ...d,
          drawingId: d._id,
          requiredQty: (Number(matchedPlate?.qty) || 0) * (Number(d.dwgQty) || 1),
          foundCount: Number(matchedPlate?.foundCount) || 0,
        };
      });
  }, [drawings]);

  const getGlobalStats = useCallback((mark) => {
    const matches = getMatchedDrawings(mark);
    const totalRequired = matches.reduce((sum, m) => sum + m.requiredQty, 0);
    const totalPut = matches.reduce((sum, m) => sum + m.foundCount, 0);
    const inCart = cart.filter(c => c.mark === mark).reduce((sum, c) => sum + c.quantity, 0);
    
    const waitingStats = matches.filter(m => m.status === "waiting").reduce((acc, m) => {
        acc.req += m.requiredQty;
        acc.put += m.foundCount;
        return acc;
    }, { req: 0, put: 0 });

    const netRemaining = Math.max(0, (waitingStats.req - waitingStats.put) - inCart);
    return { totalRequired, totalPut, inCart, netRemaining, matches };
  }, [getMatchedDrawings, cart]);

  const isPlateInAnyPallet = useCallback((mark) => {
    return pallets.some(pal => pal.plates?.some(pl => pl.mark === mark));
  }, [pallets]);

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

  const putToDrawing = async (cartItem, drawingId, qty) => {
    const drawing = drawings.find((d) => d._id === drawingId);
    if (!drawing) return;

    const updatedPlates = drawing.plates.map((p) => 
      p.mark === cartItem.mark ? { ...p, foundCount: (p.foundCount || 0) + qty } : p
    );

    // Optimized sequential updates
    await fetch(`${DRAWING_API}/${drawingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plates: updatedPlates }),
    });

    const remainingInCart = cartItem.quantity - qty;
    const cartRequest = remainingInCart <= 0 
        ? fetch(`${CART_API}/${cartItem._id}`, { method: "DELETE" })
        : fetch(`${CART_API}/${cartItem._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...cartItem, quantity: remainingInCart }),
          });
    
    await cartRequest;
    fetchAll();
  };

  // --- UI HANDLERS ---
  const jumpToMark = (mark) => {
    const found = pallets.find(p => p.plates.some(pl => pl.mark.toUpperCase() === mark.toUpperCase()));
    if (found) {
      setActiveCoord({ x: found.x, y: found.y, z: found.z });
      setActiveTab("pallets");
      setSearchTerm(mark);
    } else alert(`Mark "${mark}" not found.`);
  };

  const handleCoordChange = (axis, value) => {
    if (value === "") {
      setActiveCoord(prev => ({ ...prev, [axis]: "" }));
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num)) setActiveCoord(prev => ({ ...prev, [axis]: num }));
  };

  const getTabCount = useCallback((tabId) => {
    if (tabId === "cart") return cart.length;
    if (tabId === "drawings") return drawings.length;
    if (tabId === "pallets") return activePlates.length;
    return 0;
  }, [cart.length, drawings.length, activePlates.length]);

  // --- MODAL & SCROLL LOCK ---
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => {
        if (e.key === "Escape") setIsModalOpen(false);
        if (e.key === "Enter") { addToCart(selectedPlate, customQty); setIsModalOpen(false); }
      };
      window.addEventListener("keydown", handleEsc);
      return () => {
        window.removeEventListener("keydown", handleEsc);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isModalOpen, customQty, selectedPlate, addToCart]);

  // --- RENDERING ---
  const renderPlateCard = (p, i, isFulfilled = false) => {
    const stats = p.stats || getGlobalStats(p.mark);
    const { totalRequired, totalPut, inCart, netRemaining } = stats;
    const isUrgent = netRemaining > 0;
    const progress = totalRequired > 0 ? (totalPut / totalRequired) * 100 : 0;

    const otherLocations = pallets.filter(pal => 
      pal.plates.some(pl => pl.mark === p.mark) && getCoordKey(pal) !== coordKey
    );

    return (
      <div key={p.mark || i} className={`group relative p-5 rounded-2xl border transition-all duration-300 ${
        isFulfilled ? 'bg-slate-900/40 border-slate-800 opacity-70' : 'bg-slate-900 border-sky-500/30 shadow-lg'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-mono font-black text-white">{p.mark}</h3>
            {isUrgent && (
              <div className="inline-flex items-center gap-1.5 bg-sky-500/10 text-sky-400 text-[10px] px-2 py-1 rounded border border-sky-500/20 font-bold uppercase">
                Demand: {netRemaining}
              </div>
            )}
          </div>
          <div className="flex gap-4 text-right">
             {[
               { label: 'Req', val: totalRequired, color: 'text-slate-500' },
               { label: 'Put', val: totalPut, color: 'text-emerald-500' },
               { label: 'Cart', val: inCart, color: 'text-amber-500' }
             ].map(s => (
               <div key={s.label} className="flex flex-col items-end">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">{s.label}</span>
                  <span className={`text-sm font-mono ${s.color}`}>{s.val}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="h-1 w-full bg-slate-800 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.min(100, progress)}%` }}></div>
        </div>

        {otherLocations.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2"><div className="h-[px] flex-1 bg-slate-800"></div><span className="text-[8px] font-black text-slate-500 uppercase">Other Stacks</span><div className="h-[1px] flex-1 bg-slate-800"></div></div>
            <div className="flex flex-wrap gap-2">
              {otherLocations.map((loc, idx) => (
                <button key={idx} onClick={() => setActiveCoord({ x: loc.x, y: loc.y, z: loc.z })} className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 px-2 py-1 rounded-md transition-all">
                  <span className="text-[10px] font-mono text-emerald-400">{loc.x}.{loc.y}.{loc.z}</span>
                  <Icons.ArrowRight />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button disabled={netRemaining === 0} onClick={() => addToCart(p, netRemaining)} 
            className={`flex-1 py-3 rounded-xl font-black text-xs transition-all uppercase flex justify-center items-center gap-2 ${
              netRemaining > 0 ? "bg-sky-600 text-white shadow-lg" : "bg-slate-800 text-slate-600"
            }`}>
              {netRemaining > 0 ? <>Pick All <span className="bg-white/20 px-2 py-0.5 rounded">{netRemaining}</span></> : <><Icons.Check/> Fulfilled</>}
          </button>
          <button onClick={() => { setSelectedPlate({ ...p, stats }); setCustomQty(netRemaining || 1); setIsModalOpen(true); }} 
            className="w-12 bg-slate-800 rounded-xl font-bold border border-slate-700 text-slate-400 flex items-center justify-center">±</button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            <div className="flex-1 flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
                {[
                    { id: "pallets", icon: Icons.Box, label: "Stock" }, 
                    { id: "cart", icon: Icons.Cart, label: "Cart" },
                    { id: "drawings", icon: Icons.Box, label: "Drawings" }
                ].map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black uppercase transition-all ${
                      activeTab === tab.id ? "bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-lg" : "text-slate-500 hover:bg-slate-800"
                    }`}>
                    <tab.icon />{tab.label}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === tab.id ? 'bg-black/20' : 'bg-slate-800'}`}>
                      {getTabCount(tab.id)}
                    </span>
                  </button>
                ))}
            </div>

            <CartPalletsView 
              activeTab={activeTab} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              handleSearch={(e) => { e.preventDefault(); jumpToMark(searchTerm); }}
              sortType={sortType} setSortType={setSortType} pallets={pallets}
              activePlates={activePlates} activeCoord={activeCoord} setActiveCoord={setActiveCoord}
              handleCoordChange={handleCoordChange} coordKey={coordKey} getCoordKey={getCoordKey}
              getGlobalStats={getGlobalStats} renderPlateCard={renderPlateCard} Icons={Icons}
            />
          </div>
        </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
        <CartCartView activeTab={activeTab} cart={cart} putToDrawing={putToDrawing} removeFromCart={async (id) => { await fetch(`${CART_API}/${id}`, { method: "DELETE" }); fetchAll(); }} getMatchedDrawings={getMatchedDrawings} Icons={Icons} />
        <CartDrawingsView activeTab={activeTab} drawings={drawings} cart={cart} putToDrawing={putToDrawing} jumpToMark={jumpToMark} isPlateInAnyPallet={isPlateInAnyPallet} Icons={Icons} />
      </div>
      
      {isModalOpen && selectedPlate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
              <div><p className="text-[10px] font-bold text-slate-500 uppercase">Manual Dispatch</p><h2 className="text-3xl font-mono font-bold text-white">{selectedPlate.mark}</h2></div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400">✕</button>
            </div>
            <div className="px-6 py-8 space-y-6">
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl p-3">
                <button onClick={() => setCustomQty(q => Math.max(1, q - 1))} className="w-12 h-12 rounded-xl bg-slate-800 text-sky-400">−</button>
                <input type="number" value={customQty} onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value)))} className="w-24 bg-transparent text-center text-4xl font-mono font-bold text-white outline-none" autoFocus />
                <button onClick={() => setCustomQty(q => q + 1)} className="w-12 h-12 rounded-xl bg-slate-800 text-emerald-400">+</button>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {[-10, -5, 5, 10].map(v => (
                  <button key={v} onClick={() => setCustomQty(q => Math.max(1, q + v))} className="px-4 py-2 text-xs rounded-lg border bg-slate-800 border-slate-700 text-slate-400">{v > 0 ? `+${v}` : v}</button>
                ))}
                <button onClick={() => setCustomQty(selectedPlate.stats.netRemaining)} className="px-4 py-2 text-xs rounded-lg border bg-slate-800 border-slate-700 text-slate-400">ALL ({selectedPlate.stats.netRemaining})</button>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800"><button onClick={() => { addToCart(selectedPlate, customQty); setIsModalOpen(false); }} className="w-full py-4 rounded-xl bg-sky-600 text-white font-bold transition active:scale-95">Confirm & Add</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
