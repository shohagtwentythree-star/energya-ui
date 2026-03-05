import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";

// Standard Icons (assuming lucide-react or similar, but using SVG for zero-dependency)
const Icons = {
  Plus: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Cpu: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
};

const API_BASE = 'http://localhost:3000';
const DRAWINGS_URL = `${API_BASE}/drawings`;
const FABRICATORS_URL = `${API_BASE}/fabricators`;

const initialPlate = { mark: '', l: 0, w: 0, t: 0, qty: 1, weight: 0, foundCount: 0 };

export default function AddDrawingView() {
  const navigate = useNavigate();
  const [newDwg, setNewDwg] = useState({
    drawingNumber: '', orderNumber: '', dwgQty: 1, deliveryDate: '', status: 'new', deliverTo: '', plates: [{ ...initialPlate }] 
  });

  const [teams, setTeams] = useState([]);
  const [existingNumbers, setExistingNumbers] = useState(new Set());
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [tooltip, setTooltip] = useState({ show: false, type: '', text: '' });

  const isDuplicate = useMemo(() => {
    if (!isDataLoaded || !newDwg.drawingNumber?.trim()) return false;
    return existingNumbers.has(newDwg.drawingNumber.trim().toLowerCase());
  }, [newDwg.drawingNumber, existingNumbers, isDataLoaded]);

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
          const numbers = (dwgData.data || []).map(d => d.drawingNumber?.toString().trim().toLowerCase()).filter(Boolean);
          setExistingNumbers(new Set(numbers));
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error("Load failed", err);
      } finally { setIsDataLoaded(true); }
    };
    loadData();
    return () => abortController.abort();
  }, []);

  const handlePlateChange = (index, field, value) => {
    setNewDwg(prev => {
      const updatedPlates = [...prev.plates];
      const target = { ...updatedPlates[index] };
      target[field] = ['l', 'w', 't', 'qty', 'weight'].includes(field) ? (value === '' ? '' : Number(value)) : value;
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
      const imported = dataArray.map(item => ({
        mark: String(item.mark || ''),
        l: Number(item.length ?? item.l ?? 0),
        w: Number(item.width ?? item.w ?? 0),
        t: Number(item.thickness ?? item.t ?? 0),
        qty: Math.max(1, Number(item.qty ?? item.count ?? 1)),
        weight: Number(item.weight ?? 0),
        foundCount: 0
      })).filter(p => p.mark.trim());
      setNewDwg(prev => ({ ...prev, plates: imported }));
      setJsonInput('');
      setTooltip({ show: true, type: 'success', text: `Imported ${imported.length} plates` });
    } catch (err) { setJsonError('Invalid JSON format'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDataLoaded || isDuplicate || isSubmitting) return;
    setIsSubmitting(true);
    const totalPlates = newDwg.plates.reduce((acc, p) => acc + (Number(p.qty || 0) * (Number(newDwg.dwgQty) || 1)), 0);
    const payload = { ...newDwg, totalPlates, foundCount: 0 };
    try {
      const res = await fetch(DRAWINGS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      setTooltip({ show: true, type: 'success', text: 'Drawing Saved!' });
      setTimeout(() => navigate('/drawings'), 1000);
    } catch (err) {
      setTooltip({ show: true, type: 'error', text: 'Save Failed' });
      setIsSubmitting(false);
    }
  };

  const noArrows = "appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield]";
  const canSubmit = isDataLoaded && !isDuplicate && newDwg.drawingNumber?.trim() && newDwg.orderNumber?.trim() && !isSubmitting;

  return (
    <div className="w-full min-h-screen bg-[#0a0f1a] text-slate-300 p-4 font-sans selection:bg-emerald-500/30">
      
      {/* TOOLTIP */}
      {tooltip.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl border shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all animate-in slide-in-from-top-4 ${
          tooltip.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'
        }`}>
          <p className="font-black uppercase tracking-widest text-xs">{tooltip.text}</p>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto">
        {/* HEADER */}
        <header className="flex justify-between items-end mb-8 px-2">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-1 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">System.Initialize</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Add Drawing</h1>
          </div>
          <button onClick={() => navigate('/drawings')} className="px-6 py-2 bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl transition-all text-xs font-bold uppercase tracking-widest">
            Back
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* MAIN METADATA - 5 Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-slate-800 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900/80 p-5 space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dwg Number</label>
              <input required value={newDwg.drawingNumber} onChange={e => setNewDwg({...newDwg, drawingNumber: e.target.value})}
                className={`w-full bg-transparent text-xl font-black outline-none transition-colors ${isDuplicate ? 'text-red-500' : 'text-emerald-400 focus:text-white'}`} placeholder="DWG-000" />
              {isDuplicate && <span className="text-[9px] font-bold text-red-500 animate-pulse uppercase">Duplicate ID Found</span>}
            </div>

            <div className="bg-slate-900/80 p-5 space-y-1 border-l border-slate-800">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Order / LPO</label>
              <input required value={newDwg.orderNumber} onChange={e => setNewDwg({...newDwg, orderNumber: e.target.value})}
                className="w-full bg-transparent text-xl font-black text-sky-400 focus:text-white outline-none" placeholder="REF-000" />
            </div>

            <div className="bg-slate-900/80 p-5 space-y-1 border-l border-slate-800">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center block">Sets Qty</label>
              <div className="flex items-center justify-center gap-4 pt-1">
                <button type="button" onClick={() => setNewDwg(p => ({...p, dwgQty: Math.max(1, p.dwgQty - 1)}))} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xl font-bold">−</button>
                <span className="text-2xl font-black font-mono w-12 text-center text-white">{newDwg.dwgQty}</span>
                <button type="button" onClick={() => setNewDwg(p => ({...p, dwgQty: p.dwgQty + 1}))} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-xl font-bold">+</button>
              </div>
            </div>

            <div className="bg-slate-900/80 p-5 space-y-1 border-l border-slate-800">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lead Fabricator</label>
              <select value={newDwg.deliverTo} onChange={e => setNewDwg({...newDwg, deliverTo: e.target.value})}
                className="w-full bg-transparent text-lg font-black text-white outline-none cursor-pointer pt-1">
                <option value="" className="bg-slate-900">Select...</option>
                {teams.map((t, i) => <option key={i} value={t.teamLead} className="bg-slate-900">{t.teamLead}</option>)}
              </select>
            </div>

            <div className="bg-slate-900/80 p-5 space-y-1 border-l border-slate-800">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Due Date</label>
              <input type="date" value={newDwg.deliveryDate} onChange={e => setNewDwg({...newDwg, deliveryDate: e.target.value})}
                className="w-full bg-transparent text-lg font-black text-white outline-none pt-1 uppercase" />
            </div>
          </div>

          {/* SMART IMPORT - Terminal Style */}
<details className="group mb-6">
  {/* THE HEADER / TRIGGER */}
  <summary className="flex items-center gap-3 px-1 py-2 text-slate-500 hover:text-sky-400 cursor-pointer list-none outline-none select-none [&::-webkit-details-marker]:hidden">
    {/* Plain text arrow instead of an Icon component */}
    <span className="text-xs transition-transform duration-200 group-open:rotate-90 block">
      ▶
    </span>
    
    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Smart Import</span>
    
    <span className="group-open:hidden text-[9px] text-slate-600 font-mono italic">
      {"{ JSON }"}
    </span>
  </summary>

  {/* THE CONTENT */}
  <div className="mt-2">
    <div className="bg-slate-950/50 border border-sky-500/20 rounded-2xl p-4 flex gap-4 items-center shadow-2xl">
      {/* Plain text placeholder for CPU icon */}
      <div className="w-10 h-10 bg-sky-500/10 rounded-xl text-sky-500 flex items-center justify-center font-mono text-xs border border-sky-500/20">
        CPU
      </div>
      
      <textarea 
        value={jsonInput || ""} 
        onChange={e => setJsonInput(e.target.value)}
        placeholder='Paste JSON Data here...'
        className="flex-1 bg-transparent border-none focus:ring-0 font-mono text-xs text-sky-400 h-14 resize-none pt-2 placeholder:text-sky-900/50" 
      />
      
      <button 
        type="button" 
        onClick={handleJsonImport} 
        className="bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 px-6 py-2 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap"
      >
        Parse Data
      </button>
    </div>
  </div>
</details>


          {/* PLATES LIST */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-4 mb-2">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Plate Registry</span>
            </div>

     {newDwg.plates.map((plate, idx) => (
  <div
    key={idx}
    className="group bg-slate-900/70 border border-slate-700 hover:border-slate-600 rounded-2xl p-4 mb-4 transition-all"
  >
    {/* ROW 1: Mark + Dimensions */}
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mark</span>
        <input
          required
          value={plate.mark}
          onChange={e => handlePlateChange(idx, 'mark', e.target.value)}
          className="mt-1 block w-full bg-transparent font-mono font-black text-lg text-emerald-400 outline-none"
          placeholder="PL-001"
        />
      </div>

      <div className="flex-shrink-0 bg-slate-950/80 border border-slate-700 rounded-xl px-2 py-2 flex gap-2 shadow-inner">
        {['l', 'w', 't'].map((dim, i) => (
          <div key={dim} className={`flex flex-col items-center ${i < 2 ? 'pr-2 border-r border-slate-800' : ''}`}>
            <span className="text-[9px] font-black text-slate-500">{dim.toUpperCase()}</span>
            <input
              type="number"
              step={dim === 't' ? '0.1' : '1'}
              value={plate[dim]}
              onChange={e => handlePlateChange(idx, dim, e.target.value)}
              className={`w-12 bg-transparent text-center font-mono font-bold text-base outline-none ${dim === 't' ? 'text-sky-400' : 'text-slate-200'} ${noArrows}`}
            />
          </div>
        ))}
      </div>
    </div>

    {/* ROW 2: Qty + Weight + Delete */}
    <div className="flex items-end gap-4">
      
      {/* IMPROVED QUANTITY STEPPER */}
      <div className="flex-1">
        <span className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Quantity</span>
        <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl overflow-hidden h-11 shadow-lg group/stepper focus-within:border-slate-500 transition-colors">
          
          <button
            type="button"
            onClick={() => handlePlateChange(idx, 'qty', Math.max(1, plate.qty - 1))}
            disabled={plate.qty <= 1}
            className="w-10 h-full flex items-center justify-center text-xl text-slate-400 hover:bg-slate-800 active:bg-red-950 active:text-red-400 disabled:opacity-20 disabled:hover:bg-transparent transition-all border-r border-slate-800"
          >
            −
          </button>

          <input
            type="number"
            value={plate.qty}
            onChange={e => handlePlateChange(idx, 'qty', parseInt(e.target.value) || 0)}
            className={`flex-1 bg-transparent text-center font-black text-xl text-slate-100 outline-none w-full ${noArrows}`}
          />

          <button
            type="button"
            onClick={() => handlePlateChange(idx, 'qty', (parseInt(plate.qty) || 0) + 1)}
            className="w-10 h-full flex items-center justify-center text-xl text-slate-400 hover:bg-slate-800 active:bg-emerald-950 active:text-emerald-400 transition-all border-l border-slate-800"
          >
            +
          </button>
        </div>
      </div>

      {/* Weight Display */}
      <div className="w-24 border-l border-slate-800 pl-4">
        <span className="text-[10px] font-black text-slate-500 uppercase block">Unit KG</span>
        <input
          type="number"
          step="0.01"
          value={plate.weight}
          onChange={e => handlePlateChange(idx, 'weight', e.target.value)}
          className={`mt-1 block w-full bg-transparent font-mono font-bold text-xl text-slate-300 outline-none ${noArrows}`}
        />
      </div>

      {/* Delete Action */}
      <button
        type="button"
        onClick={() => setNewDwg(p => ({ ...p, plates: p.plates.filter((_, i) => i !== idx) }))}
        disabled={newDwg.plates.length <= 1}
        className="h-11 w-11 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 active:scale-90 transition-all disabled:opacity-10"
      >
        <Icons.Trash className="w-5 h-5" />
      </button>
    </div>
  </div>
))}


            <button type="button" onClick={() => setNewDwg(p => ({...p, plates: [...p.plates, {...initialPlate}]}))}
              className="w-full py-3 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-2xl text-slate-600 hover:text-emerald-500 transition-all font-black uppercase text-[10px] tracking-widest">
              <span className="flex items-center justify-center gap-2"><Icons.Plus /> Append New Plate Entry</span>
            </button>
          </div>

          {/* SUBMIT */}
 <button 
  type="submit" 
  disabled={!canSubmit}
  className={`
    w-full py-6 rounded-2xl font-black tracking-[0.3em] text-lg uppercase transition-all duration-300 relative overflow-hidden group
    ${canSubmit 
      ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]' 
      : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
    }
  `}
>
  {/* Inner Glow/Shine Effect */}
  {canSubmit && (
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
  )}

  <div className="flex items-center justify-center gap-3 relative z-10">
    {isSubmitting ? (
      <>
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span className="animate-pulse">Uploading to LocalDB...</span>
      </>
    ) : isDuplicate ? (
      <>
        <span className="text-amber-400">⚠️ Duplicate Entry Detected</span>
      </>
    ) : (
      <>
        <span>Commit to Database</span>
        <span className="opacity-50 group-hover:translate-x-1 transition-transform">→</span>
      </>
    )}
  </div>

  {/* Progress Bar (Visible during submission) */}
  {isSubmitting && (
    <div className="absolute bottom-0 left-0 h-1 bg-white/40 animate-[progress_2s_ease-in-out_infinite] w-full" />
  )}
</button>

{/* Add these to your global CSS or Tailwind config if not present */}
<style jsx>{`
  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }
  @keyframes progress {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`}</style>

        </form>
      </div>
    </div>
  );
}
