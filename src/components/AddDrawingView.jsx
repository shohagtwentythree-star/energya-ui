import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";

const API_BASE = 'http://localhost:3000';
const DRAWINGS_URL = `${API_BASE}/drawings`;
const FABRICATORS_URL = `${API_BASE}/fabricators`;

const initialPlate = {
  mark: '',
  l: 0,
  w: 0,
  t: 0,
  qty: 1,
  weight: 0,
  foundCount: 0
};

export default function AddDrawingView() {
  const [newDwg, setNewDwg] = useState({
    drawingNumber: '',
    dwgQty: 1,
    deliveryDate: '',
    status: 'new',
    deliverTo: '',
    plates: [{ ...initialPlate }] // Spread to ensure fresh reference
  });

  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [existingNumbers, setExistingNumbers] = useState(new Set()); // Use Set for O(1) lookups
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [tooltip, setTooltip] = useState({ show: false, type: '', text: '' });

  // 1. Memoized Duplicate Check (Performance Optimization)
  const isDuplicate = useMemo(() => {
    if (!isDataLoaded || !newDwg.drawingNumber?.trim()) return false;
    return existingNumbers.has(newDwg.drawingNumber.trim().toLowerCase());
  }, [newDwg.drawingNumber, existingNumbers, isDataLoaded]);

  // Load initial data
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadData = async () => {
      try {
        const [teamRes, dwgRes] = await Promise.all([
          fetch(FABRICATORS_URL, { signal: abortController.signal }),
          fetch(DRAWINGS_URL, { signal: abortController.signal })
        ]);

        if (teamRes.ok) {
          const teamData = await teamRes.json();
          if (teamData.status === "success") setTeams(teamData.data || []);
        }

        if (dwgRes.ok) {
          const dwgData = await dwgRes.json();
          const numbers = (dwgData.data || [])
            .map(d => d.drawingNumber?.toString().trim().toLowerCase())
            .filter(Boolean);
          setExistingNumbers(new Set(numbers)); // Set is much faster than Array.includes
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Initial load failed:", err);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadData();
    return () => abortController.abort();
  }, []);

  // Tooltip auto-hide
  useEffect(() => {
    if (!tooltip.show) return;
    const timer = setTimeout(() => setTooltip(prev => ({ ...prev, show: false })), 5000);
    return () => clearTimeout(timer);
  }, [tooltip.show]);

  // 2. Specialized Plate Change (Handles math and text separately)
  const handlePlateChange = (index, field, value) => {
    setNewDwg(prev => {
      const updatedPlates = [...prev.plates];
      const target = { ...updatedPlates[index] };
      
      if (['l', 'w', 't', 'qty', 'weight'].includes(field)) {
        target[field] = value === '' ? '' : Number(value);
      } else {
        target[field] = value;
      }
      
      updatedPlates[index] = target;
      return { ...prev, plates: updatedPlates };
    });
  };

  const handleJsonImport = () => {
    if (!jsonInput.trim()) return;
    setJsonError('');

    try {
      const parsed = JSON.parse(jsonInput);
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];
      
      const importedPlates = dataArray.map(item => ({
        mark: String(item.mark || ''),
        l: Number(item.length ?? item.l ?? 0),
        w: Number(item.width ?? item.w ?? 0),
        t: Number(item.thickness ?? item.t ?? 0),
        qty: Number(item.qty ?? item.count ?? 1),
        weight: Number(item.weight ?? 0),
        foundCount: 0
      })).filter(p => p.mark.trim());

      if (importedPlates.length === 0) throw new Error("No valid plates found");

      setNewDwg(prev => ({ ...prev, plates: importedPlates }));
      setJsonInput('');
      setTooltip({ show: true, type: 'success', text: `Imported ${importedPlates.length} plates` });
    } catch (err) {
      setJsonError('Invalid Format: Check your JSON structure');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDataLoaded || isDuplicate) return;

    const number = newDwg.drawingNumber.trim();
    const totalPlates = newDwg.plates.reduce(
      (acc, p) => acc + (Number(p.qty || 0) * (Number(newDwg.dwgQty) || 1)), 
      0
    );

    const payload = {
      ...newDwg,
      drawingNumber: number,
      dwgQty: Number(newDwg.dwgQty) || 1,
      totalPlates,
      foundCount: 0
    };

    try {
      const res = await fetch(DRAWINGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Save failed');

      setTooltip({ show: true, type: 'success', text: 'Drawing Saved' });
      setExistingNumbers(prev => new Set(prev).add(number.toLowerCase()));
      // Auto-navigate back after save
      setTimeout(() => navigate('/drawings'), 1000);

    } catch (err) {
      setTooltip({ show: true, type: 'error', text: 'System Error: Save Failed' });
    }
  };

  const canSubmit = isDataLoaded && !isDuplicate && newDwg.drawingNumber?.trim();

  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-6 text-slate-200">
      
      {/* Dynamic Feedback Tooltip */}
      {tooltip.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl border shadow-2xl transition-all animate-bounce ${
          tooltip.type === 'success' ? 'bg-emerald-600 border-emerald-400' : 'bg-red-600 border-red-400'
        }`}>
          <span className="font-black uppercase tracking-widest text-sm">{tooltip.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-3xl font-black tracking-tight">ADD NEW DRAWING</h2>
          <button onClick={() => navigate('/drawings')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition">Cancel</button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Header Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-slate-800/40 p-6 rounded-2xl border border-slate-700 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDuplicate ? 'bg-red-500' : 'bg-sky-500'}`} />
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dwg Number</label>
              <input required type="text" value={newDwg.drawingNumber}
                className={`w-full bg-slate-950 border ${isDuplicate ? 'border-red-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500/50 outline-none`}
                onChange={e => setNewDwg({...newDwg, drawingNumber: e.target.value})}
              />
              {isDuplicate && <p className="text-red-400 text-[10px] mt-1 font-bold italic">DUPLICATE DETECTED</p>}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sets (Qty)</label>
              <input required type="number" min="1" value={newDwg.dwgQty}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 outline-none"
                onChange={e => setNewDwg({...newDwg, dwgQty: e.target.value === '' ? '' : Number(e.target.value)})}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fabricator</label>
              <select value={newDwg.deliverTo} onChange={e => setNewDwg({...newDwg, deliverTo: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 outline-none">
                <option value="">Choose Lead</option>
                {teams.map((t, i) => <option key={i} value={t.teamLead}>{t.teamLead}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Date</label>
              <input type="date" value={newDwg.deliveryDate} onChange={e => setNewDwg({...newDwg, deliveryDate: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 outline-none" />
            </div>
          </div>

          {/* AI / JSON IMPORT */}
          <div className="bg-sky-900/10 p-5 rounded-2xl border border-sky-500/20">
            <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-3">Smart Import (JSON)</h4>
            <div className="flex gap-4">
              <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                placeholder='[{"mark":"PL01","l":1200,"w":800,"t":10,"qty":1}]'
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sky-300 font-mono text-xs h-20 outline-none focus:border-sky-500"
              />
              <button type="button" onClick={handleJsonImport} className="bg-sky-600 hover:bg-sky-500 px-6 rounded-xl font-bold text-white transition">Import</button>
            </div>
            {jsonError && <p className="text-red-400 text-xs mt-2">{jsonError}</p>}
          </div>

          {/* Plate List Container */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Plate Breakdown</h3>
            {newDwg.plates.map((plate, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 p-4 bg-slate-800/20 hover:bg-slate-800/40 border border-slate-700/50 rounded-2xl transition-all group items-end">
                
                <div className="col-span-12 md:col-span-3">
                  <label className="text-[9px] font-black text-slate-600 uppercase block mb-1">Mark</label>
                  <input required value={plate.mark} onChange={e => handlePlateChange(idx, 'mark', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-sky-500" />
                </div>

                <div className="col-span-12 md:col-span-4 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-slate-600 uppercase block mb-1 text-center">Length</label>
                    <input type="number" value={plate.l} onChange={e => handlePlateChange(idx, 'l', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 text-center outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-600 uppercase block mb-1 text-center">Width</label>
                    <input type="number" value={plate.w} onChange={e => handlePlateChange(idx, 'w', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 text-center outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-sky-600 uppercase block mb-1 text-center">Thick</label>
                    <input type="number" step="0.1" value={plate.t} onChange={e => handlePlateChange(idx, 't', e.target.value)}
                      className="w-full bg-sky-950/30 border border-sky-500/30 text-sky-400 font-bold rounded-lg py-2 text-center outline-none" />
                  </div>
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase block mb-1 text-center">Qty</label>
                  <div className="flex bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => handlePlateChange(idx, 'qty', Math.max(1, (plate.qty || 0) - 1))} className="px-3 hover:bg-slate-800">➖</button>
                    <input type="number" value={plate.qty} onChange={e => handlePlateChange(idx, 'qty', e.target.value)} className="w-full bg-transparent text-center font-bold" />
                    <button type="button" onClick={() => handlePlateChange(idx, 'qty', (plate.qty || 0) + 1)} className="px-3 hover:bg-slate-800">➕</button>
                  </div>
                </div>

                <div className="col-span-4 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase block mb-1">Weight</label>
                  <input type="number" step="0.01" value={plate.weight} onChange={e => handlePlateChange(idx, 'weight', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 outline-none" />
                </div>

                <div className="col-span-2 md:col-span-1 flex justify-center pb-1">
                  <button type="button" onDoubleClick={() => setNewDwg(p => ({...p, plates: p.plates.filter((_, i) => i !== idx)}))}
                    disabled={newDwg.plates.length <= 1} className="text-slate-600 hover:text-red-500 transition-colors p-2 disabled:opacity-0">
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={() => setNewDwg(p => ({...p, plates: [...p.plates, {...initialPlate}]}))}
              className="w-full py-3 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:border-sky-500 hover:text-sky-500 transition-all font-bold uppercase text-[10px] tracking-widest">
              + Insert New Plate Row
            </button>
          </div>

          <button type="submit" disabled={!canSubmit}
            className={`w-full py-5 rounded-2xl font-black tracking-[0.2em] text-lg transition-all transform active:scale-[0.98] ${
              canSubmit ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-xl shadow-sky-500/10' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
            }`}>
            {isDuplicate ? 'IDENTIFIED AS DUPLICATE' : 'INITIALIZE DRAWING'}
          </button>
        </form>
      </div>
    </div>
  );
}
