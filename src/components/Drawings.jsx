import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/drawings';

export default function Drawings() {
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list'); // 'list', 'detail', 'add'
  const [selectedDwg, setSelectedDwg] = useState(null);
  const [allPallets, setAllPallets] = useState([]); // <- added to track all pallets

  // Form State for New Drawing - "deliverTo" is now at top level
  const [newDwg, setNewDwg] = useState({
    drawingNumber: '',
    dwgQty: 1,
    deliveryDate: '',
    deliverTo: '', 
    plates: [{ mark: '', l: 0, w: 0, t: 0, h: 0, qty: 1, weight: 0, foundCount: 0 }]
  });

  useEffect(() => {
    fetchDrawings();
    fetchPallets();
  }, []);

  const fetchDrawings = async () => {
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.status === "success") setDrawings(result.data);
    } catch (error) { console.error("Fetch error:", error); }
    finally { setLoading(false); }
  };

  const fetchPallets = async () => {
    try {
      const response = await fetch('http://localhost:3000/pallets');
      const result = await response.json();
      if (result.status === "success") setAllPallets(result.data);
    } catch (error) { console.error("Fetch pallets error:", error); }
  };

  const filteredDrawings = drawings.filter(dwg => {
    const searchLower = searchTerm.toLowerCase();
    return dwg.drawingNumber?.toLowerCase().includes(searchLower) || 
           dwg.plates?.some(p => p.mark?.toLowerCase().includes(searchLower));
  });

  const addPlateField = () => {
    setNewDwg({ ...newDwg, plates: [...newDwg.plates, { mark: '', l: 0, w: 0, t: 0, h: 0, qty: 1, weight: 0, foundCount: 0 }] });
  };

  const handlePlateChange = (index, field, value) => {
    const updatedPlates = [...newDwg.plates];
    updatedPlates[index][field] = value;
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
      if (response.ok) {
        setNewDwg({ drawingNumber: '', dwgQty: 1, deliveryDate: '', deliverTo: '', plates: [{ mark: '', l: 0, w: 0, t: 0, h: 0, qty: 1, weight: 0, foundCount: 0 }] });
        setView('list');
        fetchDrawings();
      }
    } catch (error) { console.error("Save error:", error); }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-mono italic">Syncing with Database...</div>;
  if (view === 'add') return <AddDrawingView newDwg={newDwg} setNewDwg={setNewDwg} onPlateChange={handlePlateChange} onAddPlate={addPlateField} onSubmit={handleSubmit} onCancel={() => setView('list')} />;
  if (view === 'detail') return <DetailView dwg={selectedDwg} onBack={() => setView('list')} allPallets={allPallets} />;

  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Drawing Control</h1>
          <p className="text-slate-500 font-bold">Records: {drawings.length}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 flex-1 md:max-w-2xl">
          <input 
            type="text" placeholder="Search Dwg or Plate..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button onClick={() => setView('add')} className="bg-sky-600 hover:bg-sky-500 text-white px-8 py-3 rounded-xl font-black transition uppercase text-sm">New Drawing</button>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredDrawings.map((dwg) => (
          <div key={dwg._id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg" onClick={() => {setSelectedDwg(dwg); setView('detail')}}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-white font-bold text-xl">{dwg.drawingNumber} <span className="text-sky-400">x{dwg.dwgQty}</span></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-2 py-1 bg-slate-900 rounded-md">Fab: {dwg.deliverTo || 'N/A'}</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 mt-4">
              <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${((dwg.foundCount || 0) / (dwg.totalPlates || 1)) * 100}%` }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Full Table */}
      <div className="hidden md:block w-full overflow-hidden bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-700/40 text-slate-400 text-[10px] uppercase font-black tracking-widest">
            <tr>
              <th className="p-5">Drawing #</th>
              <th className="p-5">Deliver To</th>
              <th className="p-5 text-center">Req/Found</th>
              <th className="p-5">Progress</th>
              <th className="p-5">Delivery</th>
              <th className="p-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-slate-200 divide-y divide-slate-700/50">
            {filteredDrawings.map((dwg) => (
              <tr key={dwg._id} className="hover:bg-slate-700/20 transition-colors">
                <td className="p-5 font-bold text-lg">{dwg.drawingNumber} <span className="text-sky-400 text-sm ml-2">x{dwg.dwgQty}</span></td>
                <td className="p-5 font-bold text-slate-400">Fab #{dwg.deliverTo}</td>
                <td className="p-5 text-center font-mono">{dwg.totalPlates} / <span className="text-green-400">{dwg.foundCount}</span></td>
                <td className="p-5 w-1/6">
                  <div className="w-full bg-slate-900 rounded-full h-2.5">
                    <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: `${(dwg.foundCount / (dwg.totalPlates || 1)) * 100}%` }}></div>
                  </div>
                </td>
                <td className="p-5 text-slate-400 font-bold uppercase text-xs">{dwg.deliveryDate}</td>
                <td className="p-5 text-right">
                  <button onClick={() => {setSelectedDwg(dwg); setView('detail')}} className="bg-slate-700 hover:bg-sky-600 px-5 py-2 rounded-lg font-bold transition">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- DetailView ----------
function DetailView({ dwg, onBack }) {
  const dwgMultiplier = Number(dwg.dwgQty) || 1;

  // Flatten all plate locations for easy lookup
  const [plateLocations, setPlateLocations] = useState({});

  useEffect(() => {
    const fetchPlateLocations = async () => {
      try {
        const res = await fetch('http://localhost:3000/pallets');
        const pallets = await res.json();
        if (pallets.status === "success") {
          const locMap = {};
          pallets.data.forEach(pallet => {
            pallet.plates.forEach(plate => {
              const mark = plate.mark;
              if (!locMap[mark]) locMap[mark] = [];
              locMap[mark].push({ x: pallet.x, y: pallet.y, z: pallet.z });
            });
          });
          setPlateLocations(locMap);
        }
      } catch (err) {
        console.error("Failed fetching plate locations:", err);
      }
    };
    fetchPlateLocations();
  }, [dwg]);

  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-8">
      <button onClick={onBack} className="text-sky-400 font-black mb-8 hover:tracking-widest transition-all">← BACK TO LIST</button>
      
      <div className="w-full h-64 md:h-80 bg-slate-800 rounded-3xl border border-slate-700 mb-8 flex items-center justify-center overflow-hidden">
        <img src="https://via.placeholder.com/1200x400/1e293b/64748b?text=TECHNICAL+SCHEMATIC" className="w-full h-full object-contain opacity-60" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-slate-700 pb-8">
        <div>
          <h2 className="text-5xl font-black text-white tracking-tighter">{dwg.drawingNumber} <span className="text-sky-400">x{dwgMultiplier}</span></h2>
          <div className="flex gap-4 mt-4">
            <span className="bg-sky-500/10 text-sky-400 px-4 py-1 rounded-full text-xs font-black border border-sky-500/20 uppercase">Deliver To: Fab #{dwg.deliverTo}</span>
            <span className="bg-slate-800 text-slate-400 px-4 py-1 rounded-full text-xs font-black uppercase border border-slate-700">Due: {dwg.deliveryDate}</span>
          </div>
        </div>
        <div className="mt-6 md:mt-0 bg-slate-800 p-5 rounded-2xl border border-slate-700 text-right">
          <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Batch Progress</p>
          <p className="text-3xl font-mono text-white font-bold">{dwg.foundCount} / {dwg.totalPlates}</p>
        </div>
      </div>

      {/* Plate Table / Mobile Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
  {dwg.plates?.map((plate, i) => (
    <div key={i} className="bg-slate-800 rounded-2xl p-4 border border-slate-700/50 shadow-md space-y-2">
      
      <div className="flex justify-between items-center">
        <span className="font-mono font-black text-white text-lg">{plate.mark}</span>
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${plate.foundCount >= (plate.qty * dwgMultiplier) ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'}`}>
          {plate.foundCount} / {plate.qty * dwgMultiplier}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-slate-300 text-[12px]">
        <span>L: {plate.l}</span>
        <span>W: {plate.w}</span>
        <span>T: {plate.t}</span>
        <span>H: {plate.h}</span>
        <span>Qty/Dwg: {plate.qty}</span>
      </div>

      {plateLocations[plate.mark]?.length > 0 && (
        <div className="text-sky-400 text-[12px] font-mono">
          <span className="font-bold">Pallets:</span> {plateLocations[plate.mark].map(loc => `[${loc.x},${loc.y},${loc.z}]`).join(', ')}
        </div>
      )}
    </div>
  ))}
</div>

      <div className="hidden md:block w-full overflow-x-auto bg-slate-800 rounded-3xl border border-slate-700">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="bg-slate-900/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="p-6">Plate Mark</th>
              <th className="p-6">Specs (L/W/T/H)</th>
              <th className="p-6">Batch Qty</th>
              <th className="p-6">Batch Weight</th>
              <th className="p-6">Status</th>
              <th className="p-6">Locations</th>
            </tr>
          </thead>
          <tbody className="text-slate-200 divide-y divide-slate-700/50">
            {dwg.plates?.map((plate, i) => (
              <tr key={i} className="hover:bg-slate-700/20">
                <td className="p-6 font-mono text-sky-400 font-black text-xl">{plate.mark}</td>
                <td className="p-6 font-bold">{plate.l} × {plate.w} × {plate.t} <span className="text-slate-500 text-xs ml-2">h={plate.h}</span></td>
                <td className="p-6"><span className="text-xl font-black">{(Number(plate.qty) * dwgMultiplier)}</span> <span className="text-slate-500 text-xs block">({plate.qty} per dwg)</span></td>
                <td className="p-6 font-mono font-bold text-lg">{(Number(plate.weight) * dwgMultiplier).toFixed(2)} kg</td>
                <td className="p-6">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${plate.foundCount >= (plate.qty * dwgMultiplier) ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'}`}>
                    {plate.foundCount || 0} / {(plate.qty * dwgMultiplier)}
                  </span>
                </td>
                <td className="p-6 text-sky-400 font-bold text-xs">
                  {plateLocations[plate.mark]?.map(loc => `[${loc.x},${loc.y},${loc.z}]`).join(', ') || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- AddDrawingView (unchanged) ----------
function AddDrawingView({ newDwg, setNewDwg, onPlateChange, onAddPlate, onSubmit, onCancel }) {
  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-between items-end mb-10">
          <h2 className="text-5xl font-black text-white italic tracking-tighter">NEW DRAWING</h2>
          <button onClick={onCancel} className="text-slate-500 font-bold hover:text-white transition">CANCEL</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-800 p-8 rounded-[2.5rem] border border-slate-700 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-sky-500"></div>
            <div className="md:col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Drawing Number</label>
              <input required type="text" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-sky-500" 
                onChange={e => setNewDwg({...newDwg, drawingNumber: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Multiplier (Sets)</label>
              <input required type="number" min="1" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-sky-500" 
                value={newDwg.dwgQty} onChange={e => setNewDwg({...newDwg, dwgQty: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Deliver To (Fabricator)</label>
              <input required type="text" placeholder="Fab #01" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-sky-500" 
                onChange={e => setNewDwg({...newDwg, deliverTo: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Delivery Date</label>
              <input required type="date" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-sky-500" 
                onChange={e => setNewDwg({...newDwg, deliveryDate: e.target.value})} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 tracking-[0.3em] uppercase ml-4">Components List</h3>{newDwg.plates.map((plate, index) => (
              <div key={index} className="grid grid-cols-2 md:grid-cols-6 gap-4 bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-[8px] uppercase text-slate-500 font-black mb-2 block">Plate Mark</label>
                  <input required placeholder="PL-XXX" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm font-bold" 
                    onChange={e => onPlateChange(index, 'mark', e.target.value)} />
                </div>
                <div>
                  <label className="text-[8px] uppercase text-slate-500 font-black mb-2 block">L x W x T</label>
                  <div className="flex gap-1">
                    <input type="number" placeholder="L" className="w-1/3 bg-slate-900 border border-slate-700 rounded p-2 text-white text-[10px]" onChange={e => onPlateChange(index, 'l', e.target.value)} />
                    <input type="number" placeholder="W" className="w-1/3 bg-slate-900 border border-slate-700 rounded p-2 text-white text-[10px]" onChange={e => onPlateChange(index, 'w', e.target.value)} />
                    <input type="number" placeholder="T" className="w-1/3 bg-slate-900 border border-slate-700 rounded p-2 text-white text-[10px]" onChange={e => onPlateChange(index, 't', e.target.value)} />
                  </div>
                </div>
                <div>
                   <label className="text-[8px] uppercase text-slate-500 font-black mb-2 block">Height (H)</label>
                   <input type="number" placeholder="H" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm" 
                    onChange={e => onPlateChange(index, 'h', e.target.value)} />
                </div>
                <div>
                  <label className="text-[8px] uppercase text-slate-500 font-black mb-2 block">Qty/Dwg</label>
                  <input type="number" placeholder="1" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm font-black" 
                    onChange={e => onPlateChange(index, 'qty', e.target.value)} />
                </div>
                <div>
                  <label className="text-[8px] uppercase text-slate-500 font-black mb-2 block">Weight (Unit)</label>
                  <input type="number" step="0.01" placeholder="0.00" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-sm font-black" 
                    onChange={e => onPlateChange(index, 'weight', e.target.value)} />
                </div>
              </div>
            ))}
            <button type="button" onClick={onAddPlate} className="w-full py-4 border-2 border-dashed border-slate-700 rounded-2xl text-slate-600 font-black hover:text-sky-500 hover:border-sky-500 uppercase tracking-widest text-[10px]">+ Add Row</button>
          </div>

          <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-6 rounded-3xl shadow-2xl transition uppercase tracking-[0.4em] active:scale-95">
            Submit Record
          </button>
        </form>
      </div>
    </div>
  );
}