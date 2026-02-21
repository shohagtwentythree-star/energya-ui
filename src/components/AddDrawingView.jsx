import React, { useState, useEffect } from 'react';
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
    plates: [initialPlate]
  });

  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [existingNumbers, setExistingNumbers] = useState([]); // lowercase trimmed
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [tooltip, setTooltip] = useState({ show: false, type: '', text: '' });

  const [isDuplicate, setIsDuplicate] = useState(false);

  // Load existing data once
  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamRes, dwgRes] = await Promise.all([
          fetch(FABRICATORS_URL),
          fetch(DRAWINGS_URL)
        ]);

        if (teamRes.ok) {
          const teamData = await teamRes.json();
          if (teamData.status === "success" && Array.isArray(teamData.data)) {
            setTeams(teamData.data);
          }
        }

        if (dwgRes.ok) {
          const dwgData = await dwgRes.json();
          const numbers = (dwgData.data || [])
            .map(d => d.drawingNumber?.toString?.().trim?.().toLowerCase?.())
            .filter(Boolean);
          setExistingNumbers(numbers);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setIsDataLoaded(true);
      }
    };

    loadData();
  }, []);

  // Live duplicate visual feedback
  useEffect(() => {
    if (!isDataLoaded || !newDwg.drawingNumber?.trim()) {
      setIsDuplicate(false);
      return;
    }

    const normalized = newDwg.drawingNumber.trim().toLowerCase();
    setIsDuplicate(existingNumbers.includes(normalized));
  }, [newDwg.drawingNumber, existingNumbers, isDataLoaded]);

  // Tooltip auto-hide
  useEffect(() => {
    if (!tooltip.show) return;
    const timer = setTimeout(() => setTooltip({ ...tooltip, show: false }), 5000);
    return () => clearTimeout(timer);
  }, [tooltip.show]);

  const handlePlateChange = (index, field, value) => {
    const updated = [...newDwg.plates];
    if (['l', 'w', 't', 'qty', 'weight'].includes(field)) {
      updated[index][field] = value === '' ? 0 : Number(value);
    } else {
      updated[index][field] = value;
    }
    setNewDwg({ ...newDwg, plates: updated });
  };

  const handleJsonImport = () => {
    if (!jsonInput.trim()) return;
    setJsonError('');

    try {
      const parsed = JSON.parse(jsonInput);
      const plates = Array.isArray(parsed)
        ? parsed.map(item => ({
            mark: String(item.mark || ''),
            l: Number(item.length ?? item.l ?? 0),
            w: Number(item.width ?? 0),
            t: Number(item.thickness ?? item.t ?? 0),
            qty: Number(item.qty ?? item.count ?? 1),
            weight: Number(item.weight ?? 0),
            foundCount: 0
          })).filter(p => p.mark.trim() || p.l || p.w || p.t || p.qty > 1)
        : [];

      setNewDwg(prev => ({
        ...prev,
        plates: plates.length ? plates : [initialPlate]
      }));
      setJsonInput('');
      setTooltip({ show: true, type: 'success', text: 'Plates imported' });
    } catch (err) {
      setJsonError('Invalid JSON format');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const number = (newDwg.drawingNumber || '').trim();
    if (!number) {
      setTooltip({ show: true, type: 'error', text: 'Drawing number required' });
      return;
    }

    // Final duplicate check using latest loaded list
    const normalized = number.toLowerCase();
    if (existingNumbers.includes(normalized)) {
      setIsDuplicate(true);
      setTooltip({ show: true, type: 'error', text: 'Drawing number already exists!' });
      return;
    }

    if (!isDataLoaded) {
      setTooltip({ show: true, type: 'error', text: 'Still loading data...' });
      return;
    }

    const totalPlates = newDwg.plates.reduce(
      (acc, p) => acc + (Number(p.qty) || 0) * (Number(newDwg.dwgQty) || 1),
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

      if (!res.ok) throw new Error(await res.text() || 'Save failed');

      setTooltip({ show: true, type: 'success', text: 'Saved successfully' });
      
      // Update local list immediately
      setExistingNumbers(prev => [...new Set([...prev, normalized])]);

      // Optional: reset form
      // setNewDwg({ drawingNumber: '', dwgQty: 1, deliveryDate: '', status: 'new', deliverTo: '', plates: [initialPlate] });
      // navigate('/drawings');

    } catch (err) {
      console.error(err);
      setTooltip({ show: true, type: 'error', text: 'Failed to save' });
    }
  };

  const canSubmit = isDataLoaded && !isDuplicate && newDwg.drawingNumber?.trim();

  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-6 relative">
      {/* Tooltip */}
      {tooltip.show && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl border shadow-2xl ${
            tooltip.type === 'success'
              ? 'bg-emerald-600 border-emerald-400 text-white'
              : 'bg-red-600 border-red-400 text-white'
          }`}
        >
          <span className="font-black uppercase tracking-widest text-sm">{tooltip.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h2 className="text-3xl font-black text-white tracking-tight">ADD NEW DRAWING</h2>
          <button
            onClick={() => navigate('/drawings')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Main info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 bg-slate-800/50 p-6 rounded-xl border border-slate-700 relative">
            <div className={`absolute top-0 left-0 w-1 h-full ${isDuplicate ? 'bg-red-500' : isDataLoaded ? 'bg-sky-500' : 'bg-amber-500'}`}></div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Drawing Number
              </label>
              <input
                required
                type="text"
                placeholder="e.g. DWG-2567"
                disabled={!isDataLoaded}
                className={`w-full bg-slate-900 border ${
                  isDuplicate ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-600'
                } rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all ${
                  !isDataLoaded && 'opacity-60 cursor-wait'
                }`}
                value={newDwg.drawingNumber}
                onChange={e => setNewDwg({ ...newDwg, drawingNumber: e.target.value })}
              />
              {isDuplicate && isDataLoaded && (
                <p className="mt-1.5 text-xs text-red-400 font-medium">Already in use</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Sets (Qty)
              </label>
              <input
                required
                type="number"
                min="1"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:border-sky-500"
                value={newDwg.dwgQty}
                onChange={e => setNewDwg({ ...newDwg, dwgQty: e.target.value === '' ? '' : Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Fabricator
              </label>
              <select
                value={newDwg.deliverTo || ""}
                onChange={e => setNewDwg({ ...newDwg, deliverTo: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:border-sky-500 appearance-none"
              >
                <option value="" disabled>Select team</option>
                {teams.map((t, i) => (
                  <option key={i} value={t.teamLead}>{t.teamLead}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Delivery Date
              </label>
              <input
                type="date"
                value={newDwg.deliveryDate}
                onChange={e => setNewDwg({ ...newDwg, deliveryDate: e.target.value })}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* JSON Import */}
          <div className="bg-slate-800/50 p-5 rounded-xl border border-sky-900/40">
            <label className="block text-xs font-black text-sky-400 uppercase tracking-wider mb-2">
              JSON Auto-Fill (AI / Copy-Paste)
            </label>
            <div className="flex gap-3">
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder='[{"mark":"PL01","length":1200,"width":800,"thickness":10,"qty":5}, ...]'
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sky-200 text-sm font-mono resize-y min-h-[80px] focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleJsonImport}
                className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition"
              >
                Import
              </button>
            </div>
            {jsonError && <p className="mt-2 text-sm text-red-400">{jsonError}</p>}
          </div>

          {/* Plates */}
          <div className="space-y-5">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Plate Components</h3>

            {newDwg.plates.map((plate, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-4 bg-slate-800/40 p-5 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors items-end"
              >
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">Mark</label>
                  <input
                    required
                    value={plate.mark}
                    onChange={e => handlePlateChange(idx, 'mark', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">L × W × T (mm)</label>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      min="0"
                      placeholder="L"
                      value={plate.l || ''}
                      onChange={e => handlePlateChange(idx, 'l', e.target.value)}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-center text-white focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="W"
                      value={plate.w || ''}
                      onChange={e => handlePlateChange(idx, 'w', e.target.value)}
                      className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2.5 text-center text-white focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="T"
                      value={plate.t || ''}
                      onChange={e => handlePlateChange(idx, 't', e.target.value)}
                      className="bg-slate-800 border border-sky-600/40 rounded-lg px-3 py-2.5 text-center text-sky-300 font-medium focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="col-span-6 md:col-span-2">
                  <label className="block text-xs text-sky-400 font-bold uppercase mb-1.5">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={plate.qty || ''}
                    onChange={e => handlePlateChange(idx, 'qty', e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-600 rounded-lg px-4 py-3 text-2xl font-black text-center text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="col-span-5 md:col-span-2">
                  <label className="block text-xs text-slate-500 font-bold uppercase mb-1.5">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plate.weight || ''}
                    onChange={e => handlePlateChange(idx, 'weight', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (newDwg.plates.length > 1) {
                        setNewDwg({
                          ...newDwg,
                          plates: newDwg.plates.filter((_, i) => i !== idx)
                        });
                      }
                    }}
                    disabled={newDwg.plates.length <= 1}
                    className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-40 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setNewDwg({ ...newDwg, plates: [...newDwg.plates, { ...initialPlate }] })}
              className="w-full py-4 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-sky-400 hover:border-sky-500 transition font-medium text-sm uppercase tracking-wider"
            >
              + Add Plate Row
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full py-5 rounded-xl font-black uppercase tracking-widest text-lg transition-all ${
              canSubmit
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {!isDataLoaded
              ? 'Loading data...'
              : isDuplicate
              ? 'DUPLICATE NUMBER'
              : 'SAVE DRAWING'}
          </button>
        </form>
      </div>
    </div>
  );
}