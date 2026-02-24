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
    plates: [{ ...initialPlate }] 
  });

  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [existingNumbers, setExistingNumbers] = useState(new Set());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Safeguard against double submits
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [tooltip, setTooltip] = useState({ show: false, type: '', text: '' });

  // Memoized Duplicate Check
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
          setExistingNumbers(new Set(numbers));
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

  // Handle Plate Math/Text changes
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
        qty: Math.max(1, Number(item.qty ?? item.count ?? 1)),
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
    if (!isDataLoaded || isDuplicate || isSubmitting) return;

    setIsSubmitting(true); // Lock the form
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

      setTooltip({ show: true, type: 'success', text: 'Drawing Saved Successfully!' });
      setExistingNumbers(prev => new Set(prev).add(number.toLowerCase()));
      
      setTimeout(() => navigate('/drawings'), 1000);
    } catch (err) {
      setTooltip({ show: true, type: 'error', text: 'System Error: Save Failed. Please try again.' });
      setIsSubmitting(false); // Unlock if failed
    }
  };

  // Shared CSS utility for hiding native number arrows
  const noArrows = "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]";

  const canSubmit = isDataLoaded && !isDuplicate && newDwg.drawingNumber?.trim() && !isSubmitting;

  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-6 text-slate-200">
      
      {/* Dynamic Feedback Tooltip */}
      {tooltip.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl border shadow-2xl transition-all animate-bounce ${
          tooltip.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-600 border-red-400 text-white'
        }`}>
          <span className="font-black uppercase tracking-widest text-sm">{tooltip.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-3xl font-black tracking-tight">ADD NEW DRAWING</h2>
          <button onClick={() => navigate('/drawings')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition font-semibold text-sm">Cancel</button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Header Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-slate-800/40 p-6 rounded-2xl border border-slate-700 relative overflow-hidden shadow-lg">
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isDuplicate ? 'bg-red-500' : 'bg-sky-500'}`} />
            
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Dwg Number</label>
              <input required type="text" value={newDwg.drawingNumber}
                className={`w-full bg-slate-950 border ${isDuplicate ? 'border-red-500' : 'border-slate-700'} rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-sky-500/50 outline-none transition-all`}
                onChange={e => setNewDwg({...newDwg, drawingNumber: e.target.value})}
              />
              {isDuplicate && <p className="text-red-400 text-[10px] mt-1 font-bold italic">DUPLICATE DETECTED</p>}
            </div>

            {/* Improved Sets (Qty) Input */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Sets (Qty)</label>
              <div className="flex bg-slate-950 border border-slate-700 rounded-xl overflow-hidden h-[46px]">
                <button type="button" 
                  onClick={() => setNewDwg(p => ({...p, dwgQty: Math.max(1, (p.dwgQty || 1) - 1)}))}
                  className="px-4 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center font-bold text-lg border-r border-slate-700/50">
                  −
                </button>
                <input required type="number" min="1" value={newDwg.dwgQty}
                  className={`w-full bg-transparent text-center font-bold outline-none ${noArrows}`}
                  onChange={e => setNewDwg({...newDwg, dwgQty: e.target.value === '' ? '' : Math.max(1, Number(e.target.value))})}
                />
                <button type="button" 
                  onClick={() => setNewDwg(p => ({...p, dwgQty: (p.dwgQty || 0) + 1}))}
                  className="px-4 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center font-bold text-lg border-l border-slate-700/50">
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Fabricator</label>
              <select value={newDwg.deliverTo} onChange={e => setNewDwg({...newDwg, deliverTo: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 transition-all">
                <option value="">Choose Lead</option>
                {teams.map((t, i) => <option key={i} value={t.teamLead}>{t.teamLead}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Date</label>
              <input type="date" value={newDwg.deliveryDate} onChange={e => setNewDwg({...newDwg, deliveryDate: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 transition-all text-sm" />
            </div>
          </div>

          {/* AI / JSON IMPORT */}
          <div className="bg-sky-900/10 p-5 rounded-2xl border border-sky-500/20 shadow-inner">
            <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-3">Smart Import (JSON)</h4>
            <div className="flex flex-col md:flex-row gap-4">
              <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)}
                placeholder='[{"mark":"PL01","l":1200,"w":800,"t":10,"qty":1}]'
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sky-300 font-mono text-xs h-20 outline-none focus:border-sky-500 transition-all"
              />
              <button type="button" onClick={handleJsonImport} className="bg-sky-600 hover:bg-sky-500 px-6 py-3 md:py-0 rounded-xl font-bold text-white transition-all shadow-lg shadow-sky-500/20 active:scale-95 text-sm">
                Import Data
              </button>
            </div>
            {jsonError && <p className="text-red-400 text-xs mt-2 font-semibold">{jsonError}</p>}
          </div>

          {/* Plate List Container */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Plate Breakdown</h3>
            {newDwg.plates.map((plate, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 p-4 bg-slate-800/20 hover:bg-slate-800/40 border border-slate-700/50 rounded-2xl transition-all group items-end shadow-sm">
                
                <div className="col-span-12 md:col-span-3">
                  <label className="text-[9px] font-black text-slate-600 uppercase block mb-1">Mark</label>
                  <input required value={plate.mark} onChange={e => handlePlateChange(idx, 'mark', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-sky-500 transition-colors" />
                </div>

                <div className="col-span-12 md:col-span-4 grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-slate-600 uppercase block mb-1 text-center">Length</label>
                    <input type="number" value={plate.l} onChange={e => handlePlateChange(idx, 'l', e.target.value)}
                      className={`w-full bg-slate-950 border border-slate-700 rounded-lg py-2 text-center outline-none focus:border-slate-500 ${noArrows}`} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-600 uppercase block mb-1 text-center">Width</label>
                    <input type="number" value={plate.w} onChange={e => handlePlateChange(idx, 'w', e.target.value)}
                      className={`w-full bg-slate-950 border border-slate-700 rounded-lg py-2 text-center outline-none focus:border-slate-500 ${noArrows}`} />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-sky-600 uppercase block mb-1 text-center">Thick</label>
                    <input type="number" step="0.1" value={plate.t} onChange={e => handlePlateChange(idx, 't', e.target.value)}
                      className={`w-full bg-sky-950/30 border border-sky-500/30 text-sky-400 font-bold rounded-lg py-2 text-center outline-none focus:border-sky-400 ${noArrows}`} />
                  </div>
                </div>

                {/* Improved Plate Qty Input */}
                <div className="col-span-6 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase block mb-1 text-center">Qty</label>
                  <div className="flex bg-slate-950 border border-slate-700 rounded-lg overflow-hidden h-[38px]">
                    <button type="button" 
                      onClick={() => handlePlateChange(idx, 'qty', Math.max(1, (plate.qty || 1) - 1))} 
                      className="w-10 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border-r border-slate-700/50">
                      −
                    </button>
                    <input type="number" min="1" value={plate.qty} 
                      onChange={e => handlePlateChange(idx, 'qty', e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))} 
                      className={`w-full bg-transparent text-center font-bold outline-none ${noArrows}`} />
                    <button type="button" 
                      onClick={() => handlePlateChange(idx, 'qty', (plate.qty || 0) + 1)} 
                      className="w-10 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border-l border-slate-700/50">
                      +
                    </button>
                  </div>
                </div>

                <div className="col-span-4 md:col-span-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase block mb-1">Weight</label>
                  <input type="number" step="0.01" value={plate.weight} onChange={e => handlePlateChange(idx, 'weight', e.target.value)}
                    className={`w-full bg-slate-950 border border-slate-700 rounded-lg py-2 px-3 outline-none focus:border-slate-500 ${noArrows}`} />
                </div>

                {/* Fixed Single-Click Delete Button */}
                <div className="col-span-2 md:col-span-1 flex justify-center pb-1">
                  <button type="button" 
                    onClick={() => setNewDwg(p => ({...p, plates: p.plates.filter((_, i) => i !== idx)}))}
                    disabled={newDwg.plates.length <= 1} 
                    className="text-slate-500 hover:text-red-400 bg-slate-900/50 hover:bg-red-950/30 rounded-lg h-[38px] w-full flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={() => setNewDwg(p => ({...p, plates: [...p.plates, {...initialPlate}]}))}
              className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:border-sky-500 hover:text-sky-400 hover:bg-sky-950/10 transition-all font-bold uppercase text-[10px] tracking-widest mt-2">
              + Insert New Plate Row
            </button>
          </div>

          {/* Submit Button with Loading State */}
          <button type="submit" disabled={!canSubmit}
            className={`w-full py-5 rounded-2xl font-black tracking-[0.2em] text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 ${
              canSubmit ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-xl shadow-sky-500/20' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
            }`}>
            {isDuplicate ? 'IDENTIFIED AS DUPLICATE' : isSubmitting ? 'INITIALIZING...' : 'INITIALIZE DRAWING'}
            {isSubmitting && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
