import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
const inputRef = useRef(null);
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
  
  const [caretPos, setCaretPos] = useState({ x: 0, y: 0 });

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

// Place this function inside your Pallets component (or in a utils file

const commandWords = ['OK', 'OKAY', 'DELETE', 'ORDER', 'NUMBER', 'ORDERNUMBER', 'BACK', 'CLEAR', 'ADD', 'ON', 'X+', 'X-', 'Y+', 'Y-'];

const numberMap = {
  'ZERO': '0', 'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4', 
  'FIVE': '5', 'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9', 
  'TEN': '1', 'TWENTY': '2', 'THIRTY': '3', 'FORTY': '4', 'FIFTY': '5', 
  'SIXTY': '6', 'SEVENTY': '7', 'EIGHTY': '8', 'NINETY': '9',
  'PLUS': '+', 'MINUS': '-', 'XPLUS': 'X+', 'XMINUS': 'X-', 'YPLUS': 'Y+', 'YMINUS': 'Y-',
  'NEXT': 'X+', 'PREVIOUS': 'X-', 'UP': 'Y+', 'DOWN': 'Y-'
};

const sanitizeCommandInput = (rawValue = "") => {
  // If the user ends with a space, we must preserve it so they can keep typing
  const endsWithSpace = rawValue.endsWith(" ");
  
  if (!rawValue) return "";

  // 1. Clean: Allow A-Z, 0-9, +, - and spaces
  let text = rawValue.toUpperCase()
    .replace(/[^A-Z0-9\+\-\s]/g, '') // Remove symbols (keep spaces)
    .replace(/([0-9])([A-Z])/g, '$1 $2') // 77A -> 77 A
    .replace(/([A-Z])([0-9])/g, '$1 $2') // A77 -> A 77
    .replace(/([A-Z0-9])([\+\-])/g, '$1 $2') // X+ -> X +
    .replace(/([\+\-])([A-Z0-9])/g, '$1 $2'); // +7 -> + 7

  // 2. Split into tokens (keeping empty strings to represent spaces)
  let tokens = text.split(/\s/); 

  // 3. Map Word-Numbers/Symbols and Filter
  let mapped = tokens.map(token => {
    if (token === "") return ""; // Preserve the space-gap
    
    // If it's a number-word like "TWO", convert to "2"
    if (numberMap[token]) return numberMap[token];

    // Keep if it's a prefix of a command or a number-word
    const isCommandPrefix = commandWords.some(cmd => cmd.startsWith(token));
    const isNumPrefix = Object.keys(numberMap).some(num => num.startsWith(token));
    const isDigitOrSign = /^\d+$/.test(token) || token === '+' || token === '-';

    if (isCommandPrefix || isNumPrefix || isDigitOrSign || token.length === 1) {
      return token;
    }

    return null; // Mark for removal
  }).filter(t => t !== null);

  // 4. Merge Logic (Numbers and X+/Y-)
  let merged = [];
  for (let i = 0; i < mapped.length; i++) {
    let current = mapped[i];
    let prev = merged[merged.length - 1];

    if (current === "") {
        merged.push(""); 
        continue;
    }

    // Merge adjacent numbers: "2" "" "2" -> "22"
    if (prev !== undefined && /^\d+$/.test(current) && /^\d+$/.test(prev.replace(/\s/g,''))) {
        merged[merged.length - 1] = prev + current;
    } 
    // Merge X/Y with +/-: "X" "" "+" -> "X+"
    else if (prev !== undefined && (current === '+' || current === '-') && (prev === 'X' || prev === 'Y')) {
        merged[merged.length - 1] = prev + current;
    }
    else {
        merged.push(current);
    }
  }

  // Final join: filter out extra internal empty strings but respect the trailing space
  let result = merged.filter(t => t !== "").join(" ");
  return endsWithSpace ? result + " " : result;
};


// Example Usage:
// sanitizeCommandInput("Please ADD the order!! and then DELETE") 
// Returns: "ADD DELETE"


// Example usage:
// sanitizeCommandInput("LIGHT! and some garbage WATER") -> "LIGHTWATER

  // Command Parser Trigger
  // --- ENHANCED COMMAND PARSER (With OK Confirmation) ---
useEffect(() => {
  const val = inputValue.toUpperCase().trim();
  if (!val) return;

  // 1. Listen for "ON" or "ORDERNUMBER" followed by [Number] and [Status]
  // Matches: "ON 575 OK", "ORDERNUMBER 12345 ADD", "ON99 OKAY"
  const orderMatch = val.match(/^(?:ON|ORDERNUMBER|ORDER NUMBER)\s*(\d+)\s*(OK|OKAY|ADD)$/);
  
  if (orderMatch) {
    const newOrder = orderMatch[1]; // This is the digits (\d+)
    setOrderInput(newOrder); 
    updateOrderNumberViaValue(newOrder);
    setInputValue(''); 
    return;
  }
  
  

  // 2. Listen for Coordinate Shorthand (Instant trigger)
  const coordMatch = val.match(/^([XY])\s*(\+|-|PLUS|MINUS)$/);
  if (coordMatch) {
    const axis = coordMatch[1].toLowerCase();
    const op = coordMatch[2];
    const increment = (op === '+' || op === 'PLUS') ? 1 : -1;
    
    handleCoordChange(axis, (Number(activeCoord[axis]) || 0) + increment);
    setInputValue('');
    return;
  }

  // 3. Listen for "DELETE" (Instant trigger)
  if (val === 'DELETE') {
    const lastPlate = currentPalletDoc?.plates?.[currentPalletDoc.plates.length - 1];
    if (lastPlate) {
        removePlate(lastPlate.mark);
    } else {
      showFeedback("Nothing to delete", "error");
    }
    setInputValue('');
    return;
  }

  // 4. Standard Plate Add (Existing logic)
  if (val.endsWith('ADD') || val.endsWith('OK') || val.endsWith('OKAY')) {
    // We check if it's NOT an "Order Command" before adding a plate
    const isOrderCommand = val.startsWith('ON') || val.startsWith('ORDERNUMBER');
    
    if (!isOrderCommand) {
      addPlate();
    }
  }
  
  if (val.endsWith("BACK")) {
  setInputValue((prev) => prev.slice(0, -6));
  }
  
  if (val.endsWith("CLEAR")) {
    setInputValue("");
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

// --- API HELPER FOR COMMAND BAR ---
const updateOrderNumberViaValue = async (newOrder) => {
  // If no pallet exists at these coords yet, we can't update it.
  if (!currentPalletDoc?.id) {
    showFeedback("Add a plate first to create the pallet", "error");
    return;
  }

  const cleanOrder = newOrder.trim().toUpperCase();
  
  try {
    const res = await fetch(`${API_PALLETS}/${currentPalletDoc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: cleanOrder })
    });

    if (res.ok) {
      showFeedback(`Order updated to: ${cleanOrder}`, "success");
      // Refresh the list so the UI reflects the Lowdb change
      fetchPallets();
    } else {
      showFeedback("Server rejected update", "error");
    }
  } catch (error) {
    showFeedback("Network error - Update failed", "error");
    console.error("Order Update Error:", error);
  }
};

// prevent backspace
useEffect(() => {
    // Push initial dummy history state
    window.history.pushState(null, "", window.location.href);

    const handleBackButton = (e) => {
      const active = document.activeElement;
      const isInput =
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable;

      // Only block if not typing
      if (!isInput && e.key === "Backspace") {
        window.history.pushState(null, "", window.location.href);
        e.preventDefault();
        e.stopPropagation();
        console.log("Backspace prevented");
      }
    };

    // Listen for keydown
    document.addEventListener("keydown", handleBackButton, true);

    // Catch popstate (browser back button / mobile swipe back)
    const popStateHandler = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", popStateHandler);

    // Cleanup on unmount
    return () => {
      document.removeEventListener("keydown", handleBackButton, true);
      window.removeEventListener("popstate", popStateHandler);
    };
  }, []);


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
    .replace(/(ADD|OK|OKAY)$/, '') // Remove command keywords
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
   setInputValue("");
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

const updateCaretPosition = () => {
  const input = inputRef.current;
  if (!input) return;

  const rect = input.getBoundingClientRect();
  const caretIndex = input.selectionStart;

  // Create temporary span to measure text width
  const dummy = document.createElement("span");
  dummy.style.position = "absolute";
  dummy.style.visibility = "hidden";
  dummy.style.whiteSpace = "pre";
  dummy.style.font = window.getComputedStyle(input).font;
  dummy.textContent = input.value.substring(0, caretIndex);

  document.body.appendChild(dummy);
  const textWidth = dummy.getBoundingClientRect().width;
  document.body.removeChild(dummy);

  setCaretPos({
    x: rect.left + textWidth + 10,
    y: rect.top - 8
  });
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
  const getSearchQuery = (input) => input.toUpperCase().replace(/(ADD|OK|OKAY)$/, '').replace(/([LWTH])(\d+)/g, '$1:$2');
  const query = getSearchQuery(inputValue);
  const activePlates = currentPalletDoc?.plates || [];

  const filteredActivePlates = query
    ? activePlates.filter(p => `${p.mark} L:${p.length} W:${p.width} T:${p.thickness} H:${p.numberOfHoles}`.toUpperCase().includes(query))
    : activePlates;

  const globalMatches = query.length > 0
  ? allPallets.reduce((acc, pallet) => {
      // 1. Skip active pallet
      if (pallet.x === activeCoord.x && pallet.y === activeCoord.y) return acc;

      const upperQuery = query.toUpperCase();

      // 2. Separate plates into priority buckets
      const exactMarkMatches = [];
      const partialMatches = [];

      pallet.plates.forEach(p => {
        const mark = p.mark.toUpperCase();
        const fullString = `${mark} L:${p.length} W:${p.width} T:${p.thickness} H:${p.numberOfHoles}`.toUpperCase();

        if (mark === upperQuery) {
          // Priority 1: The Mark matches exactly what they typed
          exactMarkMatches.push(p);
        } else if (fullString.includes(upperQuery)) {
          // Priority 2: The query is found somewhere in the dimensions or mark
          partialMatches.push(p);
        }
      });

      // 3. Combine them (Exacts first)
      const combined = [...exactMarkMatches, ...partialMatches];

      if (combined.length > 0) {
        acc.push({ 
          ...pallet, 
          matches: combined,
          // Flag this pallet if it contains a top-tier match
          priority: exactMarkMatches.length > 0 ? 2 : 1 
        });
      }
      return acc;
    }, [])
    // 4. Sort the pallets so the ones with exact matches are at the top of the list
    .sort((a, b) => b.priority - a.priority)
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
  ref={inputRef}
  type="text"
  inputMode={isMobileMode ? "text" : "none"}
  onFocus={() => {
    if (!isMobileMode) setShowKeypad(true);
    updateCaretPosition();
  }}
  placeholder={isMobileMode ? "MOBILE MODE" : "KEYPAD MODE"}
  className="flex-1 min-w-0 bg-transparent px-2 py-2 outline-none font-mono text-base md:text-lg text-sky-400 uppercase placeholder:text-slate-700 transition-all"
  value={inputValue}
  onChange={(e) => {
    const sanitized = sanitizeCommandInput(e.target.value);
    setInputValue(sanitized);

    // Wait for state update before measuring caret
    setTimeout(updateCaretPosition, 0);
  }}
  onClick={updateCaretPosition}
  onKeyUp={(e) => {
    updateCaretPosition();

    if (e.key === "Enter") {
      addPlate();
    }
  }}
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
 <div className="px-5 py-3 bg-slate-900/40 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between gap-6 group">
  
  {/* LEFT: ICON & COUNT */}
  <div className="flex items-center gap-3">
    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
      {/* PLATE ICON (Simplified SVG) */}
      <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 12h10M7 9h2m6 0h2m-8 6h6" strokeLinecap="round" />
      </svg>
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-emerald-500/50 uppercase tracking-[0.2em] leading-none">Status</span>
      <span className="text-sm font-mono font-bold text-slate-200">{filteredActivePlates.length} <span className="text-[10px] text-slate-500">UNIT(S)</span></span>
    </div>
  </div>

  {/* MIDDLE: LAST ACTIVITY (Single Row Telemetry) */}
  {currentPalletDoc?.lastActivity && (
    <div className="flex-1 flex items-center gap-4 border-l border-slate-800 pl-6 animate-in fade-in slide-in-from-left-4 duration-500">
      
      {/* Last Mark Badge */}
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-sky-500/60 uppercase tracking-widest mb-0.5">Last Entry</span>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 font-mono text-xs font-black rounded border border-sky-500/20">
            {currentPalletDoc.lastPlateMark || "---"}
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            {new Date(currentPalletDoc.lastActivity).toLocaleTimeString('en-GB', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>

      {/* Subtle Date Vertical Divider */}
      <div className="h-8 w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent" />

      {/* Date */}
      <div className="hidden sm:flex flex-col">
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Session Date</span>
        <span className="text-[11px] font-mono text-slate-400 font-bold">
           {new Date(currentPalletDoc.lastActivity).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
        </span>
      </div>
    </div>
  )}

  {/* RIGHT: ACTION BUTTONS */}
  <div className="flex items-center gap-2">
    <button 
      onClick={clearAllPlates}
      disabled={!currentPalletDoc?.plates?.length}
      className="group/btn p-2 rounded-lg bg-slate-800/40 text-slate-500 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-10 transition-all border border-slate-700/50 hover:border-red-500/30"
      title="Format / Clear All"
    >
      <svg className="w-5 h-5 transition-transform group-hover/btn:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
</div>


{/* LIST SECTION */}
<div className="divide-y divide-slate-800/50">
  {filteredActivePlates.length > 0 ? (
    [...filteredActivePlates].reverse().map((plate, index) => (
      <div 
        key={plate.mark} 
        className={`${
          index % 2 === 0 
            ? 'bg-transparent' 
            : 'bg-slate-700/20'
        } transition-colors hover:bg-slate-800/40`}
      >
        <PlateRow 
          plate={plate} 
          onRemove={removePlate} 
          allPallets={allPallets}
          activeCoord={activeCoord}
          setActiveCoord={setActiveCoord}
          setSearchParams={setSearchParams}
        />
      </div>
    ))
  ) : (
    /* Empty state if needed */
    <div className="p-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
      No plates found
    </div>
  )}
</div>




</div>


        {/* GLOBAL MATCHES */}
        {globalMatches.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4 px-2">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Cross-Reference Matches</span>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent"></div>
            </div>
            {globalMatches.map((result, i) => (
<div key={i} className="group bg-slate-900/40 backdrop-blur-sm rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden shadow-lg">
  {/* Header Section */}
  <div className="bg-emerald-500/10 px-4 py-2.5 flex justify-between items-center border-b border-emerald-500/10">
    <div className="flex items-center gap-3">
      {/* Visual Coordinate Badge */}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-emerald-500/60 leading-none mb-1">Coordinates</span>
        <span className="text-sm font-mono font-bold text-emerald-400 tracking-tight">
          {result.x}<span className="text-emerald-800 mx-1">/</span>{result.y}
        </span>
      </div>
      
      {/* Order Divider */}
      <div className="h-6 w-[1px] bg-emerald-500/20 mx-1" />
      
      {/* Order Number */}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold text-emerald-500/60 leading-none mb-1">Order</span>
        <span className="text-xs font-black text-slate-300">
          #{result.orderNumber || 'PENDING'}
        </span>
      </div>
    </div>

    {/* Action Button */}
    <button 
      onClick={() => { setSearchParams({}, { replace: true }); setActiveCoord({ x: result.x, y: result.y }); }} 
      className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-[11px] font-bold transition-colors border border-sky-500/20 flex items-center gap-1"
    >
      JUMP TO
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </button>
  </div>

  {/* Content Section */}
  <div className="p-1">
    {result.matches.map((p) => (
      <PlateRow key={p.mark} plate={p} />
    ))}
  </div>
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
  onClick={() => {
    if(window.confirm('Delete this plate?')) onRemove(plate.mark)
  }} 
  className="group/btn shrink-0 p-2 rounded-lg bg-slate-800/40 text-slate-500 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-10 transition-all border border-slate-700/50 hover:border-red-500/30 ml-4"
  title="Delete Plate"
>
  <Icons.Trash className="w-5 h-5 transition-transform group-hover/btn:rotate-12" /> 
</button>

)}

      </div>

{otherLocations.length > 0 && (
  <div className="mt-4 flex flex-wrap items-center gap-2">
    
    {/* 1. STATUS INDICATOR (Minimal Header) */}
    <div className="flex items-center gap-1.5 mr-1">
      <div className="p-1 bg-emerald-500/10 rounded border border-emerald-500/20">
        <Icons.Link size={10} className="text-emerald-500" />
      </div>
      <span className="text-[10px] font-black text-slate-500 font-mono tracking-tighter">
        {otherLocations.length}
      </span>
    </div>

    {/* 2. LOCATION CHIPS */}
    {otherLocations.map((loc, idx) => (
      <button 
        key={idx} 
        onClick={() => { setSearchParams({}, { replace: true }); setActiveCoord({ x: loc.x, y: loc.y }); }} 
        className="group flex items-center bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-md transition-all duration-200 overflow-hidden shadow-sm"
      >
        {/* Coordinate Area */}
        <div className="px-2 py-1 border-r border-slate-800 bg-slate-950/30 group-hover:border-sky-500/20">
          <span className="text-[11px] font-mono font-bold text-emerald-400 group-hover:text-emerald-300">
            {loc.x}/{loc.y}
          </span>
        </div>

        {/* Info Area */}
        <div className="px-2 py-1 flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
            #{loc.orderNumber || '---'}
          </span>
          
          <div className="text-slate-600 group-hover:text-sky-400 transition-colors">
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </button>
    ))}
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
