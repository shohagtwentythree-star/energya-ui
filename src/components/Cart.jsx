import React, { useState, useEffect } from "react";

const PALLET_API = "http://localhost:3000/pallets";
const DRAWING_API = "http://localhost:3000/drawings";
const CART_API = "http://localhost:3000/cart";

export default function Cart() {
  const [activeTab, setActiveTab] = useState("pallets");
  const [pallets, setPallets] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCoord, setActiveCoord] = useState({ x: 0, y: 0, z: 0 });
  const [qtyModal, setQtyModal] = useState(null);

  const coordKey = `${activeCoord.x}-${activeCoord.y}-${activeCoord.z}`;

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    await Promise.all([fetchPallets(), fetchDrawings(), fetchCart()]);
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

  const currentPallet = pallets.find(
    p => `${p.x}-${p.y}-${p.z}` === coordKey
  );

  const activePlates = currentPallet?.plates || [];

  /* ---------------- MATCH DRAWINGS ---------------- */

  const getMatchedDrawings = (plate) => {
    return drawings
      .filter(d =>
        Array.isArray(d.plates) &&
        d.plates.some(p => p.mark === plate.mark)
      )
      .map(d => {
        const dp = d.plates.find(p => p.mark === plate.mark);
        const required = (dp.qty || 0) * (d.dwgQty || 1);
        const found = dp.foundCount || 0;

        return {
          drawingId: d._id,
          drawingNumber: d.drawingNumber,
          remaining: Math.max(required - found, 0),
          required,
          found
        };
      });
  };

  /* ---------------- ADD TO CART ---------------- */

  const confirmAdd = async (plate, qty) => {
    if (!qty || qty <= 0) return;

    const exists = cart.find(
      c => c.mark === plate.mark && c.coord === coordKey
    );

    if (exists) {
      await fetch(`${CART_API}/${exists._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: exists.quantity + qty
        })
      });
    } else {
      await fetch(CART_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...plate,
          coord: coordKey,
          quantity: qty
        })
      });
    }

    setQtyModal(null);
    fetchCart();
  };

  /* ---------------- PUT TO DRAWING ---------------- */

  const confirmPut = async (cartItem, drawingId, qty) => {
    if (!qty || qty <= 0) return;

    const drawing = drawings.find(d => d._id === drawingId);
    if (!drawing) return;

    const updatedPlates = [...drawing.plates];
    const dp = updatedPlates.find(p => p.mark === cartItem.mark);
    if (!dp) return;

    dp.foundCount = (dp.foundCount || 0) + qty;

    await fetch(`${DRAWING_API}/${drawingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plates: updatedPlates })
    });

    if (qty >= cartItem.quantity) {
      await fetch(`${CART_API}/${cartItem._id}`, { method: "DELETE" });
    } else {
      await fetch(`${CART_API}/${cartItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: cartItem.quantity - qty
        })
      });
    }

    setQtyModal(null);
    fetchAll();
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">

      {/* TAB SWITCH */}
      <div className="flex bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        {["pallets", "cart"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 font-bold text-sm ${
              activeTab === tab
                ? "bg-gradient-to-r from-sky-600 to-emerald-600 text-white"
                : "text-slate-400"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* COORD SELECTOR */}
      <div className="flex justify-center gap-6 bg-slate-900 p-4 rounded-2xl border border-slate-700">
        {["x","y","z"].map(axis => (
          <div key={axis} className="flex items-center gap-3">
            <button
              onClick={() =>
                setActiveCoord(p => ({
                  ...p,
                  [axis]: Math.max(0, p[axis] - 1)
                }))
              }
              className="w-8 h-8 bg-slate-700 rounded-lg font-bold"
            >−</button>

            <span className="text-sky-400 font-mono text-lg">
              {activeCoord[axis]}
            </span>

            <button
              onClick={() =>
                setActiveCoord(p => ({
                  ...p,
                  [axis]: p[axis] + 1
                }))
              }
              className="w-8 h-8 bg-slate-700 rounded-lg font-bold"
            >+</button>
          </div>
        ))}
      </div>

      {/* PALLETS TAB */}
      {activeTab === "pallets" && (
        <div className="space-y-4">
          {activePlates.map((p, i) => {
            const matches = getMatchedDrawings(p);
            const available = p.quantity || 1;

            return (
              <div key={i} className="bg-slate-900 p-4 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex justify-between">
                  <div>
                    <div className="text-sky-400 font-mono font-bold">{p.mark}</div>
                    <div className="text-xs text-slate-400">
                      {p.length}×{p.width}×{p.thickness}
                    </div>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    QTY {available}
                  </div>
                </div>

                {/* MATCHED DRAWINGS */}
                {matches.length > 0 && (
                  <div className="bg-slate-800 p-2 rounded-xl text-xs space-y-1">
                    {matches.map((m, mi) => (
                      <div key={mi} className="flex justify-between">
                        <span>{m.drawingNumber}</span>
                        <span className="text-orange-400">
                          Need {m.remaining}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => confirmAdd(p, available)}
                    className="flex-1 bg-sky-600 py-2 rounded-xl text-xs font-bold"
                  >
                    ADD ALL
                  </button>
                  <button
                    onClick={() =>
                      setQtyModal({
                        type: "add",
                        plate: p,
                        maxQty: available
                      })
                    }
                    className="flex-1 bg-emerald-600 py-2 rounded-xl text-xs font-bold"
                  >
                    ADD QTY
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CART TAB */}
      {activeTab === "cart" && (
        <div className="space-y-4">
          {cart.map((c, i) => {
            const matches = getMatchedDrawings(c);

            return (
              <div key={i} className="bg-slate-900 p-4 rounded-2xl border border-slate-700 space-y-3">
                <div className="flex justify-between">
                  <div>
                    <div className="text-sky-400 font-mono font-bold">{c.mark}</div>
                    <div className="text-xs text-slate-400">
                      {c.length}×{c.width}×{c.thickness}
                    </div>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    QTY {c.quantity}
                  </div>
                </div>

                {matches.map((m, mi) => {
                  if (m.remaining <= 0) return null;

                  const maxPut = Math.min(c.quantity, m.remaining);

                  return (
                    <div key={mi} className="bg-slate-800 p-2 rounded-xl text-xs space-y-2">
                      <div className="flex justify-between">
                        <span>{m.drawingNumber}</span>
                        <span>Need {m.remaining}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            confirmPut(c, m.drawingId, maxPut)
                          }
                          className="flex-1 bg-emerald-600 py-1 rounded text-[10px] font-bold"
                        >
                          PUT ALL
                        </button>

                        <button
                          onClick={() =>
                            setQtyModal({
                              type: "put",
                              plate: c,
                              drawingId: m.drawingId,
                              maxQty: maxPut
                            })
                          }
                          className="flex-1 bg-sky-600 py-1 rounded text-[10px] font-bold"
                        >
                          PUT QTY
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {qtyModal && (
        <QuantityModal
          max={qtyModal.maxQty}
          onClose={() => setQtyModal(null)}
          onConfirm={(qty) => {
            if (qtyModal.type === "add")
              confirmAdd(qtyModal.plate, qty);
            else
              confirmPut(qtyModal.plate, qtyModal.drawingId, qty);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- MODAL ---------------- */

function QuantityModal({ max, onClose, onConfirm }) {
  const [qty, setQty] = useState(1);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl p-6 w-72 space-y-4 border border-slate-700">
        <div className="text-center text-white font-bold">
          Select Quantity
        </div>

        <input
          type="number"
          min="1"
          max={max}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-full bg-slate-800 border border-slate-600 rounded-xl p-2 text-center text-white"
        />

        <div className="text-xs text-slate-400 text-center">
          Max Allowed: {max}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 py-2 rounded-xl text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Math.min(qty, max))}
            className="flex-1 bg-emerald-600 py-2 rounded-xl text-sm font-bold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}