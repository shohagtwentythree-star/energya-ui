import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

import Keypad from './Keypad';

const API_URL = 'http://localhost:3000';
const API_PALLETS = `${API_URL}/pallets`;
const API_DRAWINGS = `${API_URL}/drawings`;

// --- ICONS (Consolidated) ---
const Icons = {
  Cube: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Search: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  ArrowRight: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>,
  Link: () => <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  Save: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
};

export default function Pallets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allPallets, setAllPallets] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [inputValue, setInputValue] = useState('');
  const [orderInput, setOrderInput] = useState('');

  // 1. Initial State Logic
  const [activeCoord, setActiveCoord] = useState(() => {
    const coordsParam = searchParams.get('coords');
    if (coordsParam) {
      const [x, y] = coordsParam.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) return { x, y };
    }
    const saved = localStorage.getItem('lastActiveCoord');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });

  const activeZ = 0;
  
  const [showKeypad, setShowKeypad] = useState(false);


  // 2. Data Fetching (useCallback to prevent redundant renders)
  const fetchPallets = useCallback(async () => {
    try {
      const [palletRes, drawingRes] = await Promise.all([
        fetch(API_PALLETS),
        fetch(API_DRAWINGS),
      ]);
      const palletJson = await palletRes.json();
      const drawingJson = await drawingRes.json();

      if (palletJson.status === "success" && drawingJson.status === "success") {
        const enriched = matchPlatesWithDrawings(palletJson.data, drawingJson.data);
        setAllPallets(enriched);
        setDrawings(drawingJson.data);
      }
    } catch (error) {
      showFeedback("API Offline", "error");
    }
  }, []);

  useEffect(() => { fetchPallets(); }, [fetchPallets]);

  // 3. Coordinate Syncing
  useEffect(() => {
    const coordsParam = searchParams.get('coords');
    if (coordsParam) {
      const [x, y] = coordsParam.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) setActiveCoord({ x, y });
    }
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem('lastActiveCoord', JSON.stringify(activeCoord));
  }, [activeCoord]);

  // Auto-dismiss messages
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);
  
  const [isEditingOrder, setIsEditingOrder] = useState(false);


  const currentPalletDoc = useMemo(() => 
    allPallets.find(p => p.x === activeCoord.x && p.y === activeCoord.y && p.z === activeZ),
    [allPallets, activeCoord, activeZ]
  );

  useEffect(() => {
    setOrderInput(currentPalletDoc?.orderNumber || '');
  }, [currentPalletDoc]);


const clearAllPlates = async () => {
  if (!currentPalletDoc?.id) return;
  
  // Custom type-to-confirm prompt
  const userInput = window.prompt("Type '123' to DELETE ALL plates from this pallet:");
  
  if (userInput === '123') {
    try {
      const res = await fetch(`${API_PALLETS}/${currentPalletDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plates: [] })
      });
      if (res.ok) {
        showFeedback("Pallet Wiped Clean", "success");
        fetchPallets();
      }
    } catch (error) {
      showFeedback("Clear failed", "error");
    }
  } else if (userInput !== null) {
    // If they typed something else, show an error
    showFeedback("Incorrect code - Delete cancelled", "error");
  }
};


  // Command Parser Trigger
  useEffect(() => {
    const val = inputValue.toUpperCase();
    if (val.endsWith('ADD') || val.endsWith('OK') || val.endsWith('NEXT')) {
      addPlate();
    }
  }, [inputValue]);

  const showFeedback = (text, type) => setMessage({ text, type });

  const handleCoordChange = (axis, value) => {
    if (searchParams.has('coords')) setSearchParams({}, { replace: true });
    if (value === "") {
      setActiveCoord(prev => ({ ...prev, [axis]: "" }));
      return;
    }
    const num = parseInt(value, 10);
    if (!isNaN(num)) setActiveCoord(prev => ({ ...prev, [axis]: num }));
  };
  
  // Inside Pallets component
const [isMobileMode, setIsMobileMode] = useState(() => {
  const saved = localStorage.getItem('keyboardMode');
  return saved ? JSON.parse(saved) : false; // Default to Keypad mode
});

// Update localStorage when changed
useEffect(() => {
  localStorage.setItem('keyboardMode', JSON.stringify(isMobileMode));
}, [isMobileMode]);

// Toggle function
const toggleKeyboard = () => {
  setIsMobileMode(!isMobileMode);
  setShowKeypad(isMobileMode); // If switching to keypad, show it
};


  // 🔥 BUSINESS LOGIC: Plate Matching
  function matchPlatesWithDrawings(pallets, drawings) {
    const normalize = (str) => (str || '').toString().trim().toUpperCase();
    const plateLookup = {};

    drawings.forEach((drawing) => {
      if (!drawing.plates) return;
      drawing.plates.forEach((plate) => {
        const mark = normalize(plate.mark);
        if (!plateLookup[mark]) plateLookup[mark] = [];
        plateLookup[mark].push({
          id: drawing.id,
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
        return {
          ...plate,
          drawings: matchedDrawings,
          totalRequired: matchedDrawings.reduce((sum, d) => sum + d.requiredQuantity, 0)
        };
      }),
    }));
  }

  const parsePlateData = (input) => {
  const str = input.toUpperCase().trim();
  
  // 1. Extract dimensions using regex
  const extract = (letter) => {
    const match = str.match(new RegExp(`${letter}(\\d+)`));
    return match ? Number(match[1]) : 0;
  };

  // 2. Identify the Mark (Plate Number)
  // This removes segments like L100, W200, T10, H4 from the string 
  // and treats whatever is left as the Mark.
  const mark = str
    .replace(/[LWTH]\d+/g, '') // Remove dimension pairs
    .replace(/(ADD|OK|NEXT)$/, '') // Remove command keywords
    .trim();

  return {
    mark,
    length: extract('L'),
    width: extract('W'),
    thickness: extract('T'),
    numberOfHoles: extract('H')
  };
};


  const updateOrderNumber = async () => {
    if (!currentPalletDoc?.id) {
      if (orderInput.trim()) showFeedback("Add at least one plate first", "error");
      return;
    }
    const cleanOrder = orderInput.trim().toUpperCase();
    if (cleanOrder === currentPalletDoc.orderNumber) return;

    try {
      const res = await fetch(`${API_PALLETS}/${currentPalletDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: cleanOrder })
      });
      if (res.ok) {
        showFeedback("Order Updated", "success");
        fetchPallets();
      }
    } catch (error) { showFeedback("Update failed", "error"); }
  };

  const addPlate = async () => {
  const plateData = parsePlateData(inputValue);
  const activePlates = currentPalletDoc?.plates || [];

  // --- 1. VALIDATION ---
  if (!plateData.mark) {
    showFeedback("Missing Plate Number", "error");
    return;
  }

  const isDuplicate = activePlates.some(
    p => p.mark.toUpperCase() === plateData.mark.toUpperCase()
  );
  if (isDuplicate) {
    showFeedback(`Plate ${plateData.mark} already exists`, "error");
    return;
  }

  // --- 2. PREPARE ROBUST DATA ---
  setLoading(true);
  const timestamp = new Date().toISOString();
  const currentMark = plateData.mark.toUpperCase();

  try {
    const isExisting = !!currentPalletDoc?.id;
    const url = isExisting ? `${API_PALLETS}/${currentPalletDoc.id}` : API_PALLETS;
    const method = isExisting ? 'PUT' : 'POST';

    const body = isExisting 
      ? { 
          plates: [...activePlates, plateData],
          lastActivity: timestamp,
          lastPlateMark: currentMark // 👈 Store the mark name
        }
      : { 
          x: Number(activeCoord.x), 
          y: Number(activeCoord.y), 
          z: activeZ, 
          orderNumber: orderInput || "UNASSIGNED", 
          plates: [plateData],
          lastActivity: timestamp,
          lastPlateMark: currentMark
        };

    // --- 3. API CALL ---
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      showFeedback(`Added ${currentMark}`, "success");
      setInputValue('');
      fetchPallets();
    }
  } catch (err) { 
    showFeedback("Save Error", "error"); 
  } finally { 
    setLoading(false); 
  }
};




  const removePlate = async (plateMark) => {
    const updated = currentPalletDoc.plates.filter(p => p.mark !== plateMark);
    try {
      await fetch(`${API_PALLETS}/${currentPalletDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plates: updated })
      });
      fetchPallets();
    } catch { showFeedback("Remove failed", "error"); }
  };

  // Search Logic
  const getSearchQuery = (input) => input.toUpperCase().replace(/(ADD|OK|NEXT)$/, '').replace(/([LWTH])(\d+)/g, '$1:$2');
  const query = getSearchQuery(inputValue);
  const activePlates = currentPalletDoc?.plates || [];

  const filteredActivePlates = query
    ? activePlates.filter(p => `${p.mark} L:${p.length} W:${p.width} T:${p.thickness} H:${p.numberOfHoles}`.toUpperCase().includes(query))
    : activePlates;

  const globalMatches = query.length > 1
    ? allPallets.reduce((acc, pallet) => {
        if (pallet.x === activeCoord.x && pallet.y === activeCoord.y) return acc;
        const matches = pallet.plates.filter(p => `${p.mark} L:${p.length} W:${p.width} T:${p.thickness} H:${p.numberOfHoles}`.toUpperCase().includes(query));
        if (matches.length > 0) acc.push({ ...pallet, matches });
        return acc;
      }, [])
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-3 font-sans selection:bg-sky-500/30">
      <div className="max-w-2xl mx-auto space-y-3">
        
        {/* TOAST NOTIFICATION */}
        {message.text && (
          <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
            message.type === 'success' ? 'bg-sky-500 border-sky-400 text-white' : 'bg-red-500 border-red-400 text-white'
          }`}>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {message.text}
          </div>
        )}

        {/* ORDER NUMBER BAR */}
{/* ORDER NUMBER BAR (Minimalist - Bigger Input) */}
<div className="flex items-center justify-between px-2 mb-1">
  <div className="flex items-center gap-2 group">
    {/* Label & Status */}
    <div className="flex flex-col">
      <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none">Order</span>
      {!isEditingOrder ? (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-mono font-bold text-slate-300">
            {currentPalletDoc?.orderNumber || "---"}
          </span>
          <button 
            onClick={() => setIsEditingOrder(true)}
            className="p-1 text-slate-600 hover:text-sky-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1 animate-in fade-in slide-in-from-left-2 duration-200">
          <input
            autoFocus
            /* ⚡ BIGGER INPUT: increased text size (text-lg), padding (px-3 py-2), and width (w-48) */
            className="bg-slate-900 border-2 border-sky-500/50 text-sky-400 text-lg font-mono font-bold rounded-lg px-3 py-2 w-48 focus:outline-none uppercase shadow-lg shadow-sky-500/10"
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (updateOrderNumber(), setIsEditingOrder(false))}
            onBlur={() => {
              updateOrderNumber();
              setIsEditingOrder(false);
            }}
          />
          <button 
            onMouseDown={(e) => e.preventDefault()} // Prevents blur before click
            onClick={() => setIsEditingOrder(false)} 
            className="text-[10px] font-bold text-slate-500 hover:text-red-400 uppercase ml-1"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  </div>

  {/* Active Location Badge */}
  <div className="flex flex-col items-end">
    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none">Location</span>
    <span className="text-sm font-mono font-bold text-sky-500/80 mt-1">
      {activeCoord.x}.{activeCoord.y}
    </span>
  </div>
</div>


        {/* COORDINATE CONTROLS */}
        <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/50 backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-4">
            {["x", "y"].map((axis) => (
              <div key={axis} className="bg-slate-950 rounded-xl p-1.5 flex items-center border border-slate-800 focus-within:border-sky-500/50 transition-all">
                <button onClick={() => handleCoordChange(axis, (Number(activeCoord[axis]) || 0) - 1)} className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-sky-600 hover:text-white transition-all font-black text-lg"> − </button>
                <div className="flex-1 flex flex-col items-center">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{axis} Axis</span>
                  <input type="number" value={activeCoord[axis]} onFocus={(e) => e.target.select()} onChange={(e) => handleCoordChange(axis, e.target.value)} className="w-full bg-transparent text-center text-xl font-mono font-bold text-sky-400 focus:outline-none" />
                </div>
                <button onClick={() => handleCoordChange(axis, (Number(activeCoord[axis]) || 0) + 1)} className="w-10 h-10 rounded-lg bg-slate-900 text-slate-400 hover:bg-emerald-500 hover:text-white transition-all font-black text-lg"> + </button>
              </div>
            ))}
          </div>
        </div>

        {/* COMMAND BAR */}
{/* COMMAND BAR */}
{/* COMMAND BAR */}
<div className="sticky top-4 z-40 w-full space-y-2">
  <div className="relative flex items-center gap-2 p-1.5 pl-4 bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden">
    
    {/* Mode Toggle "Edge" Button */}
    <button 
      onClick={toggleKeyboard}
      className={`absolute left-0 top-0 bottom-0 w-2.5 transition-all duration-300 ${
        isMobileMode 
          ? 'bg-amber-900/50' 
          : 'bg-sky-900/50'
      }`}
      title={isMobileMode ? "Switch to Keypad" : "Switch to System Keyboard"}
    />

    <input
      type="text"
      inputMode={isMobileMode ? "text" : "none"} 
      onFocus={() => !isMobileMode && setShowKeypad(true)}
      placeholder={isMobileMode ? "MOBILE MODE" : "KEYPAD MODE"}
      className="flex-1 min-w-0 bg-transparent px-2 py-2 outline-none font-mono text-base md:text-lg text-sky-400 uppercase placeholder:text-slate-700"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value.replace(/\s/g, '').toUpperCase())}
      onKeyDown={(e) => e.key === 'Enter' && addPlate()}
    />
    
    <button
      onClick={addPlate}
      disabled={loading || !inputValue}
      className="shrink-0 px-4 py-2.5 rounded-xl font-black text-sm bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition-all"
    >
      {loading ? '...' : 'ADD'}
    </button>
  </div>
</div>


{/* Conditional Keypad Rendering */}
{/* Custom Keypad Overlay */}
{!isMobileMode && showKeypad && (
  <>
    {/* Updated Backdrop: 
       - Removed 'bg-black/20' 
       - Keep 'fixed inset-0' to catch clicks outside
    */}
    <div 
      className="fixed inset-0 z-40 bg-transparent" 
      onClick={() => setShowKeypad(false)} 
    />
    
    {/* The Keypad itself stays on top (z-50) */}
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Keypad 
        value={inputValue} 
        onChange={(val) => setInputValue(val.toUpperCase())} 
        onClose={() => setShowKeypad(false)} 
        onAdd={addPlate}
      />
    </div>
  </>
)}


        {/* ACTIVE LIST */}
{/* ACTIVE LIST */}
<div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
  {/* HEADER SECTION */}
  <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
    <div className="flex flex-col">
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-tight">
        Active Inventory
      </h3>
      
      {/* 🕒 ENHANCED STATUS DISPLAY */}
      {currentPalletDoc?.lastActivity && (
        <div className="flex items-center gap-2 mt-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-md">
            <span className="text-[9px] font-bold text-sky-600 uppercase tracking-tighter">Last Added</span>
            <span className="text-[11px] font-mono font-black text-sky-400 uppercase">
              {currentPalletDoc.lastPlateMark || "---"}
            </span>
          </div>
<span className="text-[10px] font-mono text-slate-500 font-bold italic">
  @ {new Date(currentPalletDoc.lastActivity).toLocaleString('en-GB', { 
      day: '2-digit',
      month: 'short',
      hour: '2-digit', 
      minute: '2-digit' 
    })}
</span>

        </div>
      )}
    </div>
    
    {/* CLEAR ALL BUTTON */}
    <button 
      onClick={clearAllPlates}
      disabled={!currentPalletDoc?.plates?.length}
      className="p-1.5 rounded-xl bg-red-800/10 text-red-800 hover:bg-red-600 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-red-800 transition-all border border-red-700/20"
      title="Clear all plates"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>

  {/* LIST SECTION */}
  <div className="divide-y divide-slate-800/50">
    {filteredActivePlates.length > 0 ? (
      filteredActivePlates.map((plate) => (
        <PlateRow 
          key={plate.mark} 
          plate={plate} 
          onRemove={removePlate} 
          allPallets={allPallets}
          activeCoord={activeCoord}
          setActiveCoord={setActiveCoord}
          setSearchParams={setSearchParams}
        />
      ))
    ) : (
      <div className="py-20 text-center">
        <div className="text-slate-800 font-black text-4xl mb-2 tracking-tighter">EMPTY</div>
        <p className="text-slate-600 text-[10px] uppercase tracking-[0.3em] font-bold">
          No plates at this location
        </p>
      </div>
    )}
  </div>

  {/* FOOTER STATS (Optional extra touch) */}
  {filteredActivePlates.length > 0 && (
    <div className="px-6 py-2 bg-slate-950/30 border-t border-slate-800/50 flex justify-end">
      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
        Total Items: {filteredActivePlates.length}
      </span>
    </div>
  )}
</div>


        {/* GLOBAL MATCHES */}
        {globalMatches.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 px-2">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Cross-Reference Matches</span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent"></div>
            </div>
            {globalMatches.map((result, i) => (
              <div key={i} className="bg-slate-900/60 rounded-2xl border border-emerald-500/20 overflow-hidden">
                <div className="bg-emerald-500/5 p-3 flex justify-between items-center border-b border-emerald-500/10">
                  <span className="text-[10px] font-black text-emerald-500 tracking-tighter">LOC: [{result.x}, {result.y}] — #{result.orderNumber || 'NO-ORD'}</span>
                  <button onClick={() => { setSearchParams({}, { replace: true }); setActiveCoord({ x: result.x, y: result.y }); }} className="text-[10px] font-black text-sky-500 hover:underline">JUMP TO</button>
                </div>
                {result.matches.map((p) => <PlateRow key={p.mark} plate={p} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- ROW COMPONENT ----------

const PlateRow = ({ plate, onRemove, allPallets = [], activeCoord, setActiveCoord, setSearchParams }) => {
  const otherLocations = allPallets.filter(p => 
    p.plates.some(pl => pl.mark === plate.mark) && !(p.x === activeCoord.x && p.y === activeCoord.y)
  );

  return (
    <div className="group relative px-5 py-4 flex flex-col hover:bg-slate-800/40 transition-all duration-200">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-mono text-lg text-white font-bold uppercase">{plate.mark}</h3>
            {plate.totalRequired > 0 && (
              <div className="bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-[10px] font-black text-sky-400">REQ: {plate.totalRequired}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {[ ['L', plate.length], ['W', plate.width], ['T', plate.thickness], ['H', plate.numberOfHoles] ].map(([label, val]) => (
              val > 0 && (
                <div key={label} className="flex gap-1.5 bg-white/5 px-2 py-1 rounded border border-white/5 text-[11px]">
                  <span className="text-slate-500 font-bold uppercase">{label}</span>
                  <span className="text-slate-200 font-mono">{val}</span>
                </div>
              )
            ))}
          </div>
        </div>
{onRemove && (
  <button 
    /* Changed from onDoubleClick to onClick for responsiveness */
    onClick={() => {
      if(window.confirm('Delete this plate?')) onRemove(plate.mark)
    }} 
    /* Removed opacity-0 so it's visible on mobile; added shrink-0 */
    className="shrink-0 p-3 rounded-xl bg-red-500/10 text-red-800 hover:bg-red-600 hover:text-white transition-all ml-4"
  >
    <Icons.Trash className="w-5 h-5" /> 
  </button>
)}

      </div>

      {otherLocations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/50">
          <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-slate-500 uppercase tracking-widest"><Icons.Link /> Stocked Elsewhere</div>
          <div className="flex flex-wrap gap-2">
            {otherLocations.map((loc, idx) => (
              <button key={idx} onClick={() => { setSearchParams({}, { replace: true }); setActiveCoord({ x: loc.x, y: loc.y }); }} className="flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 pl-2 pr-1 py-1 rounded-md transition-all group/jump shadow-sm">
                <span className="text-[10px] font-mono text-emerald-400 font-bold">LOC: {loc.x}.{loc.y}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[70px]"># {loc.orderNumber || 'NO-ORD'}</span>
                <div className="p-1.5 bg-slate-900 group-hover/jump:bg-sky-600 text-slate-500 group-hover/jump:text-white rounded transition-colors"><Icons.ArrowRight /></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {plate.drawings?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {plate.drawings.map((d, i) => (
            <Link key={i} to={`/drawings/${d.id}`} className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-[10px] hover:bg-emerald-500/20 transition-all group/dwg">
              <span className="text-slate-400 font-mono"># {d.drawingNumber}</span>
              <span className="text-emerald-400 font-bold italic">Qty {d.requiredQuantity}</span>
              <Icons.ArrowRight />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
