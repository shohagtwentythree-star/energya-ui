import React, { useState, useEffect } from "react";

const PALLET_API = "http://localhost:3000/pallets";
const DRAWING_API = "http://localhost:3000/drawings";
const CART_API = "http://localhost:3000/cart";

export default function CartBridge() {
  // Load initial state from LocalStorage or use defaults
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem("lastTab");
    // Default to pallets if nothing is saved or if "drawings" was saved previously
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

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem("lastTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("lastCoord", JSON.stringify(activeCoord));
  }, [activeCoord]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchPallets(), fetchDrawings(), fetchCart()]);
    } finally {
      setIsLoading(false);
    }
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

  const getCoordKey = (obj) => {
    if (!obj) return "0-0-0";
    return `${obj.x || 0}-${obj.y || 0}-${obj.z || 0}`;
  };

  const coordKey = getCoordKey(activeCoord);
  const currentPallet = pallets.find((p) => getCoordKey(p) === coordKey);
  const activePlates = currentPallet?.plates || [];

  const getMatchedDrawings = (item) => {
    return drawings
      .filter((d) =>
        Array.isArray(d.plates) && d.plates.some((p) => p.mark === item.mark)
      )
      .map((d) => {
        const matchedPlate = d.plates.find((p) => p.mark === item.mark);
        return {
          drawingId: d._id,
          drawingNumber: d.drawingNumber,
          requiredQty: (Number(matchedPlate?.qty) || 0) * (Number(d.dwgQty) || 1),
          foundCount: Number(matchedPlate?.foundCount) || 0,
        };
      });
  };

  /* ---------------- ACTIONS ---------------- */

  const addToCart = async (plate, qty) => {
    if (!qty || qty <= 0) return;

    const existing = cart.find(
      (c) => c.mark === plate.mark && c.coord === coordKey
    );

    if (existing) {
      await fetch(`${CART_API}/${existing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...existing, quantity: existing.quantity + qty }),
      });
    } else {
      const { _id, ...cleanPlateData } = plate;
      await fetch(CART_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cleanPlateData, coord: coordKey, quantity: qty }),
      });
    }
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 text-slate-200 min-h-screen bg-slate-950">
      
      {/* TABS (Drawings Removed) */}
      <div className="flex rounded-2xl overflow-hidden border border-slate-700 bg-slate-800 shadow-xl">
        {["pallets", "cart"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 font-bold text-xs tracking-widest transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-sky-600 to-emerald-600 text-white shadow-inner"
                : "text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            {tab.toUpperCase()} ({tab === "cart" ? cart.length : activePlates.length})
          </button>
        ))}
      </div>

      {/* COORD NAVIGATION */}
      {activeTab === "pallets" && (
        <div className="flex justify-center gap-8 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
          {["x", "y"].map((axis) => (
            <div key={axis} className="flex flex-col items-center gap-1">
              <span className="text-[12px] text-slate-500 uppercase font-black">{axis}</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveCoord(p => ({ ...p, [axis]: Math.max(0, p[axis] - 1) }))} className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 hover:border-sky-500 active:scale-95 transition flex items-center justify-center">−</button>
                <span className="text-xl font-mono font-bold text-sky-400 min-w-[1.5ch] text-center">{activeCoord[axis] || 0}</span>
                <button onClick={() => setActiveCoord(p => ({ ...p, [axis]: (p[axis] || 0) + 1 }))} className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 hover:border-emerald-500 active:scale-95 transition flex items-center justify-center">+</button>
              </div>
            </div>
          ))}
        </div>
      )}

{/* VIEW: PALLETS */}
{activeTab === "pallets" && (
  <div className="grid gap-4">
    {activePlates.length === 0 ? (
      <div className="bg-slate-900/50 p-20 rounded-3xl border border-dashed border-slate-800 text-center text-slate-500">
        Empty position: {coordKey}
      </div>
    ) : (
      // --- SORTING ADDED HERE ---
      [...activePlates]
        .sort((a, b) => {
          const demandA = getMatchedDrawings(a).reduce((sum, m) => sum + m.requiredQty, 0);
          const demandB = getMatchedDrawings(b).reduce((sum, m) => sum + m.requiredQty, 0);
          return demandB - demandA; // Highest demand first
        })
        .map((p, i) => {
          const matched = getMatchedDrawings(p);
          
          // Calculate Demand minus what's already in the cart
          const totalDemand = matched.reduce((sum, m) => sum + m.requiredQty, 0);
          const inCart = cart
            .filter(c => c.mark === p.mark)
            .reduce((sum, c) => sum + c.quantity, 0);
          
          const remainingDemand = Math.max(0, totalDemand - inCart);
          const qtyToMove = remainingDemand > 0 ? remainingDemand : 0;

          return (
            <div key={i} className={`bg-slate-900 p-5 rounded-2xl border ${qtyToMove === 0 ? 'border-slate-800 opacity-60' : 'border-sky-900/50'} flex flex-col gap-4`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-mono font-black text-white">{p.mark}</h3>
                    {totalDemand > 0 && (
                      <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase">
                        High Demand
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">In Cart: {inCart} | Total Needed: {totalDemand}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">To Pick</div>
                  <div className={`text-2xl font-black ${qtyToMove > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>{qtyToMove}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                    disabled={qtyToMove === 0}
                    onClick={() => addToCart(p, qtyToMove)} 
                    className="flex-1 bg-sky-600 disabled:bg-slate-800 hover:bg-sky-500 py-3 rounded-xl font-black text-xs transition-all uppercase shadow-lg shadow-sky-900/20"
                >
                    {qtyToMove > 0 ? `Add All (${qtyToMove})` : "Already In Cart"}
                </button>
                <button onClick={() => {
                    const val = prompt("Manual Quantity:", qtyToMove);
                    if(val) addToCart(p, Number(val));
                }} className="px-6 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-xs border border-slate-700">Custom</button>
              </div>
            </div>
          );
        })
    )}
  </div>
)}


      {/* VIEW: CART */}
      {activeTab === "cart" && (
        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="bg-slate-900/50 p-20 rounded-3xl border border-dashed border-slate-800 text-center text-slate-500">Cart is Empty</div>
          ) : (
            cart.map((c) => {
              const matched = getMatchedDrawings(c);
              return (
                <div key={c._id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 relative overflow-hidden">
                  {/* Remove Button */}
                  <button 
                    onClick={() => removeFromCart(c._id)}
                    className="absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-colors p-2"
                    title="Remove from Cart"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>

                  <div className="flex justify-between pr-10">
                    <div>
                        <span className="text-xl font-mono font-black text-sky-400">{c.mark}</span>
                        <p className="text-[10px] text-slate-500">From {c.coord}</p>
                    </div>
                    <span className="text-2xl font-black text-white">{c.quantity}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {matched.map((m, mi) => {
                      const needed = Math.max(0, m.requiredQty - m.foundCount);
                      const canGive = Math.min(c.quantity, needed);
                      return (
                        <div key={mi} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">{m.drawingNumber} (Need {needed})</span>
                          <button 
                            disabled={needed === 0}
                            onClick={() => putToDrawing(c, m.drawingId, canGive)}
                            className="bg-emerald-600 disabled:bg-slate-800 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase text-white"
                          >
                            Put {canGive}
                          </button>
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
  );
}
