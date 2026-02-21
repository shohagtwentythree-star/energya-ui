import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const API_URL = 'http://localhost:3000';
const API_PALLETS = API_URL + "/pallets";
const API_DRAWINGS = API_URL + "/drawings";

// --- ICONS ---
const Icons = {
  Cube: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>,
  Link: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  Save: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  Refresh: ({ spin }) => <svg className={`w-4 h-4 ${spin ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
};


 // 1. Import the hook

export default function Pallets() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [allPallets, setAllPallets] = useState([]);
  const [drawings, setDrawings] = useState([]);
  
  const [activeCoord, setActiveCoord] = useState(() => {
    // 3. Priority logic: URL params > LocalStorage > Default
    const coordsParam = searchParams.get('coords'); // e.g., "5,3"
    
    if (coordsParam) {
      const [x, y] = coordsParam.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) {
        return { x, y };
      }
    }

    const saved = localStorage.getItem('lastActiveCoord');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  // 4. Update coordinates if the URL changes while the component is open
  useEffect(() => {
    const coordsParam = searchParams.get('coords');
    if (coordsParam) {
      const [x, y] = coordsParam.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) {
        setActiveCoord({ x, y });
      }
    }
  }, [searchParams]);

  // Persist to localStorage whenever activeCoord changes
  useEffect(() => {
    localStorage.setItem('lastActiveCoord', JSON.stringify(activeCoord));
  }, [activeCoord]);

  const activeZ = 0;
  const [inputValue, setInputValue] = useState('');
  const [orderInput, setOrderInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

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
  
    // Robust coordinate handler
  const handleCoordChange = (axis, value) => {
  // 1. Clear the URL parameters
  if (searchParams.has('coords')) {
    setSearchParams({}, { replace: true });
  }

  // 2. Handle the state update
  if (value === "") {
    setActiveCoord(prev => ({ ...prev, [axis]: "" }));
    return;
  }
  
  const num = parseInt(value, 10);
  if (!isNaN(num)) {
    setActiveCoord(prev => ({ ...prev, [axis]: num }));
  }
};


  
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
        _id : drawing._id,
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
    length: Number(extract('L', 0)),
    width: Number(extract('W', 0)),
    thickness: Number(extract('T', 0)),
    numberOfHoles: Number(extract('H', 0))
  };
};

  // --- HELPERS ---
  const getCoordKey = (obj) => `${obj?.x || 0}-${obj?.y || 0}-${obj?.z || 0}`;

  const coordKey = getCoordKey(activeCoord);

  // -------- ORDER UPDATE --------
  // -------- FIXED ORDER UPDATE --------
const updateOrderNumber = async () => {
  // 1. Check if we actually have a pallet to update
  if (!currentPalletDoc?._id) {
    // If the user types an order number but there are no plates, 
    // we can't update a document that doesn't exist in MongoDB yet.
    showFeedback("Add at least one plate first", "error");
    return;
  }

  const cleanOrder = orderInput.trim().toUpperCase();
  
  // 2. Optimization: Don't call API if the value hasn't actually changed
  if (cleanOrder === currentPalletDoc.orderNumber) return;

  try {
    const res = await fetch(`${API_PALLETS}/${currentPalletDoc._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: cleanOrder })
    });

    if (res.ok) {
      showFeedback("Order Updated", "success");
      // 3. Immediately update local state so the UI doesn't "flicker" back
      setAllPallets(prev => prev.map(p => 
        p._id === currentPalletDoc._id ? { ...p, orderNumber: cleanOrder } : p
      ));
      fetchPallets(); // Refresh background data
    }
  } catch (error) {
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
    <div className="min-h-screen bg-slate-950 text-slate-200 p-3 font-sans selection:bg-sky-500/30">
      <div className="max-w-2xl mx-auto space-y-3">

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
        
         {/* B. ORDER NUMBER (Integrated Style) */}
                <div className="flex-1 bg-slate-900/60 rounded-xl border border-slate-800 p-3 flex items-center gap-3">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Order No.</span>
                     <input
                        className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-sm font-mono font-bold rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500/50 uppercase placeholder-slate-700 transition-all"
                        placeholder="NO ORDER ASSIGNED"
                        value={orderInput}
                        onChange={(e) => setOrderInput(e.target.value)}
                        onBlur={updateOrderNumber}
                    />
                     <button 
                        onClick={updateOrderNumber} 
                        className="p-2 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-700"
                        title="Save Order Number"
                    >
                        <Icons.Save />
                     </button>
                </div>


<div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
  <div className="grid grid-cols-2 gap-4">
    {["x", "y"].map((axis) => (
      <div key={axis} className="bg-slate-950 rounded-xl p-1.5 flex items-center border border-slate-800 shadow-inner group focus-within:border-sky-500/50 transition-all">
        {/* Minus Button */}
        <button 
          onClick={() => handleCoordChange(axis, (Number(activeCoord[axis]) || 0) - 1)} 
          className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-sky-600 hover:text-white transition-colors flex items-center justify-center font-black text-lg active:scale-95 transform"
        > − </button>
        
        <div className="flex-1 flex flex-col items-center">
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{axis} Axis</span>
          <input 
            type="number"
            inputMode="numeric"
            value={activeCoord[axis]}
            onFocus={(e) => e.target.select()} // Selects text on click
            onChange={(e) => handleCoordChange(axis, e.target.value)}
            className="w-full bg-transparent text-center text-xl font-mono font-bold text-sky-400 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Plus Button */}
        <button 
          onClick={() => handleCoordChange(axis, (Number(activeCoord[axis]) || 0) + 1)} 
          className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center font-black text-lg active:scale-95 transform"
        > + </button>
      </div>
    ))}
  </div>
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
      <PlateRow 
        key={i} 
        index={i}
        plate={plate} 
        onRemove={removePlate} 
        // 👇 Add these new props here
        allPallets={allPallets}
        activeCoord={activeCoord}
        activeZ={activeZ}
        setActiveCoord={setActiveCoord}
        setInputValue={setInputValue}
        setSearchParams={setSearchParams}
      />
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
    setSearchParams({}, { replace: true }); // Clear URL
    setActiveCoord({ x: result.x, y: result.y });
    setInputValue('');
  }}
  className="text-[10px] font-black text-sky-500"
>
  JUMP TO
</button>

                </div>

                {result.matches.map((plate, i) => (
                  <PlateRow key={i} plate={plate} />
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
  <div className="flex items-center gap-1.5 bg-slate-400/5 px-2 py-1 rounded border border-white/5 group-hover:border-white/10 transition-colors">
    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{label}</span>
    <span className="text-xs font-mono font-medium text-slate-200 leading-none">{value}</span>
  </div>
);

// Added the missing state variables and functions as props here
const PlateRow = ({ 
  index,
  plate, 
  onRemove, 
  allPallets = [], 
  activeCoord = { x: 0, y: 0 }, 
  activeZ = 0, 
  setActiveCoord, 
  setInputValue, 
  setSearchParams
}) => {
  
  const isEven = index % 2 === 0;
  
  // Now these references will work correctly via props
  const otherLocations = allPallets?.filter(p => 
    p.plates.some(pl => pl.mark.toUpperCase() === plate.mark.toUpperCase()) && 
    !(p.x === activeCoord.x && p.y === activeCoord.y && p.z === activeZ)
  ) || [];

  return (
        <div className={`${isEven ? 'bg-green-700/20' : 'bg-transparent'}`}>
    <div className="group relative px-5 py-4 flex flex-col bg-slate-900/20 hover:bg-slate-800/40 border-b border-white/5 transition-all duration-200">
      
      {/* Side Indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-mono text-lg text-white font-bold tracking-tight uppercase">
              {plate.mark}
            </h3>
            {plate.totalRequired > 0 && (
              <div className="bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-[10px] font-black text-sky-400 uppercase">
                REQ: {plate.totalRequired}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
  {[
    ['L', plate.length],
    ['W', plate.width],
    ['T', plate.thickness],
    ['H', plate.numberOfHoles]
  ]
    .filter(([_, val]) => val !== undefined && val > 0 && val !== null && val !== '') // Keeps 0, hides missing
    .map(([label, val]) => (
      <div key={label} className="flex gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/5 text-[11px]">
        <span className="text-slate-500 font-bold uppercase">{label}</span>
        <span className="text-slate-200 font-mono">{val}</span>
      </div>
    ))}
</div>

        </div>

        {/* Delete Action */}
        {onRemove && (
          <div className="ml-4 shrink-0">
            <button
              onDoubleClick={() => onRemove(plate.mark)}
              className="p-3 rounded-lg bg-red-500/10 text-red-200 sm:opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all duration-200"
            >
              <Icons.Trash />
            </button>
          </div>
        )}
      </div>

      {/* --- CROSS REFERENCE SECTION --- */}
      {otherLocations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Icons.Link />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Stocked Elsewhere</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {otherLocations.map((loc, idx) => (
              <button
                key={idx}
                onClick={() => {
                   // Ensure these are called safely
                   setSearchParams({}, { replace: true }); 
                   if (setActiveCoord) setActiveCoord({ x: loc.x, y: loc.y });
                   if (setInputValue) setInputValue(''); 
                }}
                className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 pl-2 pr-1 py-1 rounded-md transition-all group/jump shadow-sm"
              >
                <div className="flex flex-row gap-2 items-start leading-none">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    LOC: {loc.x}.{loc.y}.{loc.z}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[70px]"># 
                    {loc.orderNumber || 'NO-ORD'}
                  </span>
                </div>
                <div className="p-1.5 bg-slate-900 group-hover/jump:bg-sky-600 text-slate-500 group-hover/jump:text-white rounded transition-colors">
                  <Icons.ArrowRight />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

{/* Drawing Info */}
{plate.drawings?.length > 0 && (
  <div className="mt-3 flex flex-wrap gap-2">
    {plate.drawings.map((d, i) => (
      <Link 
        key={i} 
        to={`/drawings/${d._id}`} // Or d._id depending on your route setup
        className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[10px] hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all group/dwg"
      >
        <span className="text-slate-400 font-mono group-hover/dwg:text-slate-200">
          # {d.drawingNumber}
        </span>
        <span className="text-emerald-400 font-bold italic">
          Qty {d.requiredQuantity}
        </span>
        {/* Subtle arrow to indicate it's a link */}
        <div className="text-emerald-500/50 group-hover/dwg:text-emerald-400">
          <Icons.ArrowRight /> 
        </div>
      </Link>
    ))}
  </div>
)}
    </div></div>
  );
};
