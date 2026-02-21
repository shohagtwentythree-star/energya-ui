import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";

const API_URL = 'http://localhost:3000/drawings';

export default function AddDrawingView() {
  const [newDwg, setNewDwg] = useState({
    drawingNumber: '',
    dwgQty: 1,
    deliveryDate: '',
    status: 'new',
    deliverTo: '', 
    plates: [{ mark: '', l: 0, w: 0, t: 0, h: 0, qty: 1, weight: 0, foundCount: 0 }]
  });
  
  const navigate = useNavigate();
  
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true); // Added to fix your undefined setLoading error

  // --- NEW JSON IMPORT STATE ---
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handlePlateChange = (index, field, value) => {
    const updatedPlates = [...newDwg.plates];
    updatedPlates[index][field] = value;
    setNewDwg({ ...newDwg, plates: updatedPlates });
  };
  
  const fetchTeams = async () => {
    try {
      const response = await fetch('http://localhost:3000/fabricators');
      const result = await response.json();
      if (result.status === "success") setTeams(result.data);
    } catch (error) { console.error("Fetch error:", error); }
    finally { setLoading(false); }
  };
  
  useEffect(() => { fetchTeams(); }, []);

  // --- NEW JSON PARSER LOGIC ---
  const handleJsonImport = () => {
    try {
      if (!jsonInput.trim()) return;
      setJsonError('');
      const parsedData = JSON.parse(jsonInput);
      
      if (!Array.isArray(parsedData)) throw new Error("Input must be a JSON Array");

      // Filter out the total summary object
      const actualData = parsedData.filter(item => item.type !== 'TOTAL_SUMMARY');

      // Map the AI JSON to your specific plate structure
      const importedPlates = actualData.map(item => {
        let t = 0, w = 0;
        
        // Extract Thickness (T) and Width (W) from Profile (e.g., "PL30*550")
        const profileStr = item.profile ? item.profile.toUpperCase() : '';
        if (profileStr.includes('PL')) {
          const dims = profileStr.replace('PL', '').trim().split(/[*X]/);
          if (dims.length === 2) {
             t = parseFloat(dims[0]) || 0;
             w = parseFloat(dims[1]) || 0;
          }
        }

        return {
          mark: item.mark || '',
          l: parseFloat(item.length) || 0,
          w: w,
          t: t,
          h: 0,
          qty: parseInt(item.qty) || 1,
          weight: parseFloat(item.weight) || 0,
          foundCount: 0
        };
      });

      // Update state with imported plates
      setNewDwg(prev => ({
        ...prev,
        plates: importedPlates.length > 0 ? importedPlates : prev.plates
      }));
      
      setJsonInput(''); // Clear textarea on success
    } catch (err) {
      setJsonError('Invalid JSON format. Check your input.');
    }
  };

  const addPlateField = () => {
    setNewDwg({ 
      ...newDwg, 
      plates: [...newDwg.plates, { mark: '', l: 0, w: 0, t: 0, h: 0, qty: 1, weight: 0, foundCount: 0 }] 
    });
  };

  const removePlateField = (index) => {
    if (newDwg.plates.length === 1) return; // Keep at least one row
    const updatedPlates = newDwg.plates.filter((_, i) => i !== index);
    setNewDwg({ ...newDwg, plates: updatedPlates });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalPlatesCount = newDwg.plates.reduce((acc, p) => acc + (Number(p.qty) * Number(newDwg.dwgQty)), 0);
    const dataToSave = { ...newDwg, totalPlates: totalPlatesCount, foundCount: 0 };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });
      if (response.ok) onSuccess();
    } catch (error) { console.error("Save error:", error); }
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 p-3 md:p-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header - More Compact */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-3xl font-black text-white italic tracking-tighter">NEW DRAWING</h2>
          <button onClick={() => navigate('/drawings')} type="button" className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-4 py-2 rounded-lg font-bold transition uppercase tracking-widest">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info Card - Reduced Padding */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
            
            <div className="col-span-2 md:col-span-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Drawing Number</label>
              <input required type="text" placeholder="DWG-001" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-sky-500/50 transition-all" 
                value={newDwg.drawingNumber} onChange={e => setNewDwg({...newDwg, drawingNumber: e.target.value})} />
            </div>

            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Sets (Qty)</label>
              <input required type="number" min="1" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-sky-500/50" 
                value={newDwg.dwgQty} onChange={e => setNewDwg({...newDwg, dwgQty: e.target.value})} />
            </div>

            {/* Fabricator Selection */}
            <div>
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">
                Fabricator
              </label>
              <div className="relative">
                <select 
                  value={newDwg.deliverTo || ""} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none cursor-pointer"
                  onChange={e => setNewDwg({...newDwg, deliverTo: e.target.value})}
                >
                  <option value="" disabled>Select Fab Team</option>
                  {teams.map((team, index) => (
                    <option key={index} value={team.teamLead} className="bg-slate-900">
                      {team.teamLead}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="col-span-2 md:col-span-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Delivery Date</label>
              <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-sky-500/50" 
                value={newDwg.deliveryDate} onChange={e => setNewDwg({...newDwg, deliveryDate: e.target.value})} />
            </div>
          </div>

          {/* --- NEW: JSON IMPORT UI --- */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-sky-900/50 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-sky-400 tracking-[0.2em] uppercase">AI JSON Auto-Fill</label>
              {jsonError && <span className="text-[10px] text-red-400 font-bold">{jsonError}</span>}
            </div>
            <div className="flex gap-2">
              <textarea 
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-sky-300 text-xs font-mono outline-none focus:border-sky-500 resize-none h-12"
                placeholder="Paste the JSON output from the AI here..."
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleJsonImport}
                className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest px-4 rounded-lg transition-all whitespace-nowrap active:scale-95"
              >
                Auto-Fill
              </button>
            </div>
          </div>

          {/* Components List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">Plate Components</h3>
              <span className="text-[10px] text-slate-600 font-bold">{newDwg.plates.length} Items</span>
            </div>

            {newDwg.plates.map((plate, index) => (
              <div key={index} className="group grid grid-cols-4 md:grid-cols-12 gap-3 bg-slate-800/30 p-3 rounded-xl border border-slate-700/40 hover:border-slate-600 transition-colors relative">
                
                {/* Plate Mark */}
                <div className="col-span-4 md:col-span-3">
                  <label className="text-[8px] uppercase text-slate-500 font-bold mb-1 block">Plate Mark</label>
                  <input required placeholder="Mark" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm font-bold focus:border-sky-500 outline-none" 
                    value={plate.mark} onChange={e => handlePlateChange(index, 'mark', e.target.value)} />
                </div>

                {/* Dimensions Group */}
                <div className="col-span-4 md:col-span-4">
                  <label className="text-[8px] uppercase text-slate-500 font-bold mb-1 block">L x W x T (mm)</label>
                  <div className="flex gap-1">
                    <input type="number" placeholder="L" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs" 
                      value={plate.l || ''} onChange={e => handlePlateChange(index, 'l', e.target.value)} />
                    <input type="number" placeholder="W" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs" 
                      value={plate.w || ''} onChange={e => handlePlateChange(index, 'w', e.target.value)} />
                    <input type="number" placeholder="T" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs font-bold text-sky-400" 
                      value={plate.t || ''} onChange={e => handlePlateChange(index, 't', e.target.value)} />
                  </div>
                </div>

                {/* H, Qty, Weight */}
                <div className="col-span-1 md:col-span-1">
                  <label className="text-[8px] uppercase text-slate-500 font-bold mb-1 block">H</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs" 
                    value={plate.h || ''} onChange={e => handlePlateChange(index, 'h', e.target.value)} />
                </div>
                
                <div className="col-span-1 md:col-span-1">
                  <label className="text-[8px] uppercase text-slate-500 font-bold mb-1 block">Qty</label>
                  <input type="number" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs font-bold" 
                    value={plate.qty || ''} onChange={e => handlePlateChange(index, 'qty', e.target.value)} />
                </div>

                <div className="col-span-2 md:col-span-2">
                  <label className="text-[8px] uppercase text-slate-500 font-bold mb-1 block">Unit Weight (kg)</label>
                  <input type="number" step="0.01" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs font-mono" 
                    value={plate.weight || ''} onChange={e => handlePlateChange(index, 'weight', e.target.value)} />
                </div>

                {/* Remove Row Button */}
                <div className="col-span-4 md:col-span-1 flex items-end justify-end">
                  <button 
                    type="button" 
                    onClick={() => removePlateField(index)}
                    className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            <button type="button" onClick={addPlateField} className="w-full py-3 border border-dashed border-slate-700 rounded-xl text-slate-500 font-bold hover:text-sky-500 hover:border-sky-500 hover:bg-sky-500/5 transition-all uppercase tracking-[0.2em] text-[10px]">
              + Add Component Row
            </button>
          </div>

          {/* Submit Action */}
          <div className="pt-4">
            <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-4 rounded-xl shadow-lg shadow-sky-900/20 transition-all uppercase tracking-[0.3em] active:scale-[0.98]">
              Finalize & Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
