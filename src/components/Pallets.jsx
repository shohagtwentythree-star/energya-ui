import React, { useState, useEffect } from 'react';
import DataPanel from "./DataPanel";

const API_URL = 'http://localhost:3000';
const API_PALLETS = API_URL + "/pallets";
const API_DRAWINGS = API_URL + "/drawings";

export default function Pallets() {
  const [allPallets, setAllPallets] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [activeCoord, setActiveCoord] = useState(() => {
    const saved = localStorage.getItem('lastActiveCoord');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  const activeZ = 0;

  const [inputValue, setInputValue] = useState('');
  const [orderInput, setOrderInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // -------- FIND CURRENT PALLET --------
  const currentPalletDoc = allPallets.find(
    p =>
      p.x === activeCoord.x &&
      p.y === activeCoord.y &&
      p.z === activeZ
  );

  const activePlates = currentPalletDoc ? currentPalletDoc.plates : [];

  // -------- EFFECTS --------
  useEffect(() => {
    localStorage.setItem('lastActiveCoord', JSON.stringify(activeCoord));
  }, [activeCoord]);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => { fetchPallets(); }, []);

  useEffect(() => {
    setOrderInput(currentPalletDoc?.orderNumber || '');
  }, [currentPalletDoc]);

  useEffect(() => {
    const val = inputValue.toUpperCase();
    if (val.endsWith('ADD') || val.endsWith('OK') || val.endsWith('NEXT')) {
      addPlate();
    }
  }, [inputValue]);
  
  // 🔥 FIXED MATCHING FUNCTION
  // 🔥 MATCHING FUNCTION
const matchPlatesWithDrawings = (pallets, drawings) => {
  const normalize = (str) => (str || '').toString().trim().toUpperCase();

  const plateLookup = {};

  drawings.forEach((drawing) => {
    if (!drawing.plates) return;

    drawing.plates.forEach((plate) => {
      const mark = normalize(plate.mark);
      if (!plateLookup[mark]) plateLookup[mark] = [];

      plateLookup[mark].push({
  drawingNumber: drawing.drawingNumber,
  requiredQuantity: Number(plate.qty || 0) * Number(drawing.dwgQty || 0),
  length: Number(plate.l || 0),
  width: Number(plate.w || 0),
  thickness: Number(plate.t || 0),
  numberOfHoles: Number(plate.h || 0),
});
    });
  });

  return pallets.map((pallet) => ({
    ...pallet,
    plates: pallet.plates.map((plate) => {
      const markNormalized = normalize(plate.mark);
      const matchedDrawings = plateLookup[markNormalized] || [];

      const totalRequired = matchedDrawings.reduce(
        (sum, d) => sum + d.requiredQuantity,
        0
      );

      return {
        ...plate,
        drawings: matchedDrawings,
        totalRequired
      };
    }),
  }));
};



  // -------- API --------
  const fetchPallets = async () => {
   try {
      const [palletRes, drawingRes] = await Promise.all([
        fetch(API_PALLETS),
        fetch(API_DRAWINGS),
      ]);

      const palletJson = await palletRes.json();
      const drawingJson = await drawingRes.json();

      if (
        palletJson.status === "success" &&
        drawingJson.status === "success"
      ) {
        const pallets = palletJson.data;
        const drawings = drawingJson.data;

        const enrichedPallets = matchPlatesWithDrawings(
          pallets,
          drawings
        );

        setAllPallets(enrichedPallets);
        setDrawings(drawings);
      }
    } catch (error) {
      showFeedback("API Offline", "error");
    }
  };

  const showFeedback = (text, type) => setMessage({ text, type });

  // -------- PARSER --------
  // -------- PARSER --------
const parsePlateData = (input) => {
  const str = input.toUpperCase();

  const markMatch = str.match(/^[^LWTHOKADN]+/);
  const mark = markMatch ? markMatch[0] : str.replace(/(ADD|OK|NEXT)$/, '');

  const extract = (letter, def) => {
    const match = str.match(new RegExp(`${letter}(\\d+)`));
    return match ? match[1] : def;
  };

  return {
    mark: mark.trim(),
    length: Number(extract('L', 1200)),
    width: Number(extract('W', 800)),
    thickness: Number(extract('T', 12)),
    numberOfHoles: Number(extract('H', 4))
  };
};

  // -------- ORDER UPDATE --------
  const updateOrderNumber = async () => {
    if (!currentPalletDoc) {
      showFeedback("Add plate first to create pallet", "error");
      return;
    }

    try {
      const res = await fetch(`${API_PALLETS}/${currentPalletDoc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: orderInput.toUpperCase() })
      });

      if (res.ok) {
        showFeedback("Order Updated", "success");
        fetchPallets();
      }
    } catch {
      showFeedback("Update failed", "error");
    }
  };

  // -------- ADD --------
  const addPlate = async () => {
    if (!inputValue) return;

    const plateData = parsePlateData(inputValue);

    if (activePlates.some(p => p.mark === plateData.mark)) {
      showFeedback("Duplicate Plate", "error");
      return;
    }

    setLoading(true);

    const updatedPlates = [...activePlates, plateData];

    try {
      const method = currentPalletDoc ? 'PUT' : 'POST';
      const url = currentPalletDoc
        ? `${API_PALLETS}/${currentPalletDoc._id}`
        : API_PALLETS;

      const body = currentPalletDoc
        ? { plates: updatedPlates }
        : {
            x: activeCoord.x,
            y: activeCoord.y,
            z: activeZ,
            orderNumber: '',
            plates: updatedPlates
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        showFeedback(`Added ${plateData.mark}`, "success");
        setInputValue('');
        fetchPallets();
      }
    } catch {
      showFeedback("Save Error", "error");
    } finally {
      setLoading(false);
    }
  };

  // -------- REMOVE --------
  const removePlate = async (plateId) => {
    const updated = activePlates.filter(p => p.mark !== plateId);

    try {
      await fetch(`${API_PALLETS}/${currentPalletDoc._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plates: updated })
      });
      fetchPallets();
    } catch {
      showFeedback("Remove failed", "error");
    }
  };

  // -------- SEARCH --------
  const getSearchQuery = (input) => {
    let q = input.toUpperCase().replace(/(ADD|OK|NEXT)$/, '');
    return q.replace(/([LWTH])(\d+)/g, '$1:$2');
  };

  const query = getSearchQuery(inputValue);

  const filteredActivePlates = query
    ? activePlates.filter(p =>
        `${p.mark} LENGTH:${p.length} WIDTH:${p.width} THICKNESS:${p.thickness} HOLES:${p.numberOfHoles}`
          .toUpperCase()
          .includes(query)
      )
    : activePlates;

  const globalMatches =
    query.length > 1
      ? allPallets.reduce((acc, pallet) => {
          if (
            pallet.x === activeCoord.x &&
            pallet.y === activeCoord.y &&
            pallet.z === activeZ
          ) return acc;

          const matches = pallet.plates.filter(p =>
            `${p.mark} LENGTH:${p.length} WIDTH:${p.width} THICKNESS:${p.thickness} HOLES:${p.numberOfHoles}`
              .toUpperCase()
              .includes(query)
          );

          if (matches.length > 0)
            acc.push({ ...pallet, matches });

          return acc;
        }, [])
      : [];

  const adjust = (axis, delta) => {
    setActiveCoord(prev => ({
      ...prev,
      [axis]: Math.max(0, prev[axis] + delta)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 font-sans selection:bg-sky-500/30">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* TOAST */}
        {message.text && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-sky-500 border-sky-400 text-white'
              : 'bg-red-500 border-red-400 text-white'
          }`}>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {message.text}
          </div>
        )}

        {/* ORDER HEADER */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
              Current Pallet
            </span>
            <input
              className="bg-transparent text-xl font-black text-white outline-none placeholder:text-slate-700 w-32"
              placeholder="NO ORDER"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              onBlur={updateOrderNumber}
            />
          </div>

          <button
            onClick={updateOrderNumber}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg font-bold border border-slate-700"
          >
            UPDATE ORDER
          </button>
        </div>

        {/* COORD SELECTOR */}
        <div className="grid grid-cols-2 gap-4">
          {['x', 'y'].map((axis) => (
            <div key={axis} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <span className="font-black text-slate-500 uppercase">{axis}</span>
              <div className="flex items-center gap-4">
                <button onClick={() => adjust(axis, -1)} className="w-8 h-8 rounded-full bg-slate-800">-</button>
                <span className="text-2xl font-mono font-black text-sky-400">
                  {activeCoord[axis]}
                </span>
                <button onClick={() => adjust(axis, 1)} className="w-8 h-8 rounded-full bg-slate-800">+</button>
              </div>
            </div>
          ))}
        </div>

{/* COMMAND BAR */}
<div className="sticky top-4 z-40">
  <div className="flex gap-2 p-2 bg-slate-900 rounded-2xl border-2 border-slate-800">
    <input
      type="text"
      placeholder="77373L1200W800T12H4ADD"
      className="flex-1 bg-transparent px-4 py-3 outline-none font-mono text-lg text-sky-400 uppercase"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && addPlate()}
    />
    
    {/* Add Button */}
    <button
      onClick={addPlate}
      disabled={
        loading || !inputValue || activePlates.some(p => p.mark === inputValue.toUpperCase().replace(/(ADD|OK|NEXT)$/, ''))
      }
      className={`px-8 py-3 rounded-xl font-black text-sm ${
        activePlates.some(p => p.mark === inputValue.toUpperCase().replace(/(ADD|OK|NEXT)$/, ''))
          ? 'bg-green-600 text-white cursor-not-allowed'
          : 'bg-sky-600 text-white'
      }`}
    >
      {loading ? '...' : 'ADD'}
    </button>
  </div>
</div>

        {/* ACTIVE LIST */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
          <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Active Inventory
            </h3>
            <span className="px-2 py-1 bg-slate-900 rounded text-[10px] text-sky-500 font-mono">
              LOC: {activeCoord.x}.{activeCoord.y}.{activeZ}
            </span>
          </div>

          <div className="divide-y divide-slate-800/50">
            {filteredActivePlates.length > 0 ? (
              filteredActivePlates.map((plate, i) => (
                <PlateRow key={i} plate={plate} onRemove={removePlate} />
              ))
            ) : (
              <div className="py-20 text-center">
                <div className="text-slate-700 font-black text-4xl mb-2">EMPTY</div>
                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                  No plates found in this coordinate
                </p>
              </div>
            )}
          </div>
        </div>

        {/* GLOBAL MATCHES */}
        {globalMatches.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 px-2">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                Cross-Reference Matches
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent"></div>
            </div>

            {globalMatches.map((result, i) => (
              <div key={i} className="bg-slate-900/60 rounded-2xl border border-emerald-500/20 overflow-hidden">
                <div className="bg-emerald-500/5 p-3 flex justify-between items-center border-b border-emerald-500/10">
                  <div className="flex gap-4 items-center">
                    <span className="text-[10px] font-black text-emerald-500 tracking-tighter">
                      LOC: [{result.x}, {result.y}, {result.z}]
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 italic">
                      #{result.orderNumber || 'NO-ORD'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveCoord({ x: result.x, y: result.y });
                      setInputValue('');
                    }}
                    className="text-[10px] font-black text-sky-500"
                  >
                    JUMP TO
                  </button>
                </div>

                {result.matches.map((plate, pi) => (
                  <PlateRow key={pi} plate={plate} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- ROW ----------
const Spec = ({ label, value }) => (
  <div className="flex items-center gap-1 bg-slate-950/50 px-1.5 py-0.5 rounded border border-white/5">
    <span className="text-[9px] font-black text-slate-500 uppercase">{label}</span>
    <span className="text-[10px] font-bold text-slate-300">{value}</span>
  </div>
);

const PlateRow = ({ plate, onRemove }) => (
  <div className="relative px-4 py-3 flex justify-between items-center group hover:bg-white/[0.02] border-b border-white/5 transition-all">
    {/* Active Accent Bar */}
    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-sky-500/0 group-hover:bg-sky-500 transition-all rounded-r shadow-[0_0_8px_#0ea5e9]" />

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="font-mono text-lg text-slate-100 font-black tracking-tighter group-hover:text-sky-400 transition-colors">
          {plate.mark}
        </div>
        {/* Quick Badge for Total */}
        <div className="bg-sky-500/10 text-sky-400 text-[10px] px-2 py-0.5 rounded font-black border border-sky-500/20">
          REQ: {plate.totalRequired}
        </div>
      </div>

      {/* Primary Specs */}
      <div className="flex flex-wrap gap-1.5">
        <Spec label="L" value={plate.length} />
        <Spec label="W" value={plate.width} />
        <Spec label="T" value={plate.thickness} />
        <Spec label="H" value={plate.numberOfHoles || 0} />
      </div>

      {/* Drawing Breakdown - Compact Grid */}
      {plate.drawings && plate.drawings.length > 0 && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {plate.drawings.map((d, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded-md text-[10px] font-mono"
            >
              <span className="text-slate-400 font-bold"># {d.drawingNumber}</span>
              <span className="text-emerald-400 font-black italic">Qty {d.requiredQuantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Actions */}
    {onRemove && (
      <div className="ml-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
        <button
          onClick={() => onRemove(plate.mark)} // Removed doubleClick for better mobile feel, but you can revert
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/5 text-red-500/50 hover:bg-red-500/20 hover:text-red-500 border border-red-500/10 transition-all"
          title="Remove Item"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    )}
  </div>
);
