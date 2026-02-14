import React, { useState, useEffect, useMemo } from "react";

const PALLET_API = "http://localhost:3000/pallets";
const DRAWING_API = "http://localhost:3000/drawings";

export default function Cart() {
  const [pallets, setPallets] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [activeCoord, setActiveCoord] = useState({ x: 0, y: 0 });

  const coordKey = `${activeCoord.x}-${activeCoord.y}-0`;

  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    fetchPallets();
    fetchDrawings();
  }, []);

  const fetchPallets = async () => {
    const res = await fetch(PALLET_API);
    const json = await res.json();
    if (json.status === "success") setPallets(json.data);
  };

  const fetchDrawings = async () => {
    const res = await fetch(DRAWING_API);
    const json = await res.json();
    if (json.status === "success") setDrawings(json.data);
  };

  /* ---------------- ACTIVE PALLET ---------------- */

  const currentPallet = pallets.find(
    (p) => `${p.x}-${p.y}-${p.z}` === coordKey
  );

  const activePalates = currentPallet?.palates || [];

  /* ---------------- MATCHING LOGIC ---------------- */

  const drawingMatches = useMemo(() => {
    if (!activePalates.length || !drawings.length) return [];

    const result = [];

    drawings.forEach((drawing) => {
      const matches = [];

      drawing.palates.forEach((dPlate) => {
        let foundQty = 0;

        activePalates.forEach((pPlate) => {
          const match =
            dPlate.mark === pPlate.mark &&
            (!dPlate.length || dPlate.length === pPlate.length) &&
            (!dPlate.width || dPlate.width === pPlate.width) &&
            (!dPlate.thickness || dPlate.thickness === pPlate.thickness);

          if (match) {
            foundQty += pPlate.quantity || 1;
          }
        });

        if (foundQty > 0) {
          matches.push({
            ...dPlate,
            foundQty,
          });
        }
      });

      if (matches.length > 0) {
        result.push({
          drawingNo: drawing.drawingNumber,
          status: drawing.status,
          fabricator: drawing.deliverTo,
          palates: matches,
        });
      }
    });

    return result;
  }, [activePalates, drawings]);

  /* ---------------- UI ---------------- */

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* COORD SELECT */}
      <div className="flex justify-center gap-6 bg-slate-800 p-3 rounded-xl border border-slate-700">
        {["x", "y"].map((axis) => (
          <div key={axis} className="flex items-center gap-2">
            <button
              onClick={() =>
                setActiveCoord((p) => ({
                  ...p,
                  [axis]: Math.max(0, p[axis] - 1),
                }))
              }
              className="px-3 py-1 bg-slate-700 rounded"
            >
              -
            </button>
            <span className="font-mono text-sky-400">
              {activeCoord[axis]}
            </span>
            <button
              onClick={() =>
                setActiveCoord((p) => ({ ...p, [axis]: p[axis] + 1 }))
              }
              className="px-3 py-1 bg-slate-700 rounded"
            >
              +
            </button>
          </div>
        ))}
      </div>

      {/* ACTIVE PALLET */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-2 text-xs font-black text-slate-400 bg-slate-900">
          ACTIVE PALLET [{activeCoord.x}, {activeCoord.y}]
        </div>

        {activePalates.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            Empty Pallet
          </div>
        ) : (
          activePalates.map((p, i) => (
            <div
              key={i}
              className="p-2 border-t border-slate-700 flex justify-between text-xs"
            >
              <span className="font-mono text-sky-400">
                {p.mark}
              </span>
              <span className="text-slate-400">
                {p.length}×{p.width}×{p.thickness}
              </span>
              <span className="text-emerald-500 font-bold">
                QTY {p.quantity || 1}
              </span>
            </div>
          ))
        )}
      </div>

      {/* DRAWING MATCH RESULT */}
      {drawingMatches.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-2 text-xs font-black text-emerald-400 bg-slate-900">
            DRAWING MATCH RESULT
          </div>

          {drawingMatches.map((d, i) => (
            <div key={i} className="border-t border-slate-700 p-3 space-y-2">
              <div className="flex justify-between text-sm font-mono">
                <span className="text-sky-400">{d.drawingNo}</span>
                <span className="text-slate-400">{d.status}</span>
              </div>

              {d.palates.map((p, pi) => (
                <div
                  key={pi}
                  className="flex justify-between bg-slate-900 px-2 py-1 rounded border border-slate-700 text-xs"
                >
                  <span className="text-slate-300">
                    {p.mark} {p.length}×{p.width}×{p.thickness}
                  </span>
                  <span className="text-emerald-500 font-bold">
                    {p.foundQty} / {p.quantity}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}