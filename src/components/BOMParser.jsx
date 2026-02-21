import React, { useState } from 'react';

export default function BOMParser() {
  const [rawData, setRawData] = useState('');
  const [cleanedPreview, setCleanedPreview] = useState(''); 
  const [parsedData, setParsedData] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRawData(text);
      setStatus({ type: 'info', message: 'Data pasted. Click Execute to format.' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to read clipboard.' });
    }
  };

  const handleClear = () => {
    setRawData('');
    setCleanedPreview('');
    setParsedData([]);
    setStatus({ type: '', message: '' });
  };

  const processJsonData = () => {
    try {
      if (!rawData.trim()) return;
      
      const data = JSON.parse(rawData);
      
      if (Array.isArray(data)) {
        setParsedData(data);
        // We use stringify for the preview to show the "Cleaned" version of the JSON
        setCleanedPreview(JSON.stringify(data, null, 2));
        setStatus({ type: 'success', message: `Successfully loaded ${data.length} entries` });
      } else {
        throw new Error("Not an array");
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Invalid JSON. Ensure you copied the full array from the prompt output.' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 p-4 md:p-8 text-slate-200 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header & Main Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white">BOM<span className="text-sky-500">ENGINE</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Advanced JSON Extraction</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePaste} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 transition-colors">PASTE</button>
              <button onClick={handleClear} className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 text-xs font-bold rounded-lg border border-red-900/50 transition-colors">CLEAR</button>
            </div>
          </div>

          <div className="bg-slate-900 p-2 rounded-3xl border border-slate-800 shadow-2xl">
            <textarea
              className="w-full h-40 bg-slate-950 border-none rounded-2xl p-4 font-mono text-sm text-sky-400 outline-none focus:ring-1 focus:ring-sky-500/50 resize-none"
              placeholder="Paste the JSON output from the AI prompt here..."
              value={rawData}
              onChange={(e) => setRawData(e.target.value)}
            />
            <button 
              onClick={processJsonData}
              className="mt-2 w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-sm transition-all active:scale-[0.98]"
            >
              Execute & Build Cards
            </button>
          </div>
        </div>

        {/* Restore: Cleaned Preview Section */}
        {cleanedPreview && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
            <p className="text-[9px] text-slate-500 font-bold uppercase mb-2 tracking-widest text-center">Validated JSON Stream</p>
            <pre className="text-[10px] font-mono text-emerald-400/80 leading-relaxed bg-slate-950/50 p-3 rounded-xl max-h-32 overflow-y-auto scrollbar-hide">
              {cleanedPreview}
            </pre>
          </div>
        )}

        {/* Status Message */}
        {status.message && (
          <div className={`text-[11px] font-bold uppercase p-3 rounded-xl border flex items-center gap-3 ${status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
            <div className={`w-2 h-2 rounded-full ${status.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`} />
            {status.message}
          </div>
        )}

        {/* Data Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-10">
          {parsedData.map((item, idx) => (
            item.type === 'TOTAL_SUMMARY' ? (
              <div key={idx} className="col-span-full bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl flex justify-between items-center shadow-lg shadow-amber-900/10">
                <div>
                  <span className="text-amber-500 font-black text-xs tracking-[0.3em] uppercase block mb-1">Grand Total</span>
                  <span className="text-white font-bold text-xs opacity-50 uppercase">Verified BOM Summary</span>
                </div>
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-[10px] text-amber-500/50 uppercase font-black">Total Area</p>
                    <p className="text-white font-mono font-bold text-2xl leading-none">{item.total_area}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-amber-500/50 uppercase font-black">Total Weight</p>
                    <p className="text-white font-mono font-bold text-2xl leading-none">{item.total_weight} <span className="text-xs text-amber-500">KG</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-sky-500/50 hover:bg-slate-900/80 transition-all group">
                 <div className="flex justify-between items-start mb-3 border-b border-slate-800 pb-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Mark Number</span>
                    <span className="font-black text-white text-lg leading-none group-hover:text-sky-400 transition-colors">{item.mark}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block tracking-tighter mb-1">Profile Section</span>
                    <span className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-xs font-mono font-bold text-sky-400 shadow-inner">
                      {item.profile}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                        <p className="text-[7px] text-slate-500 uppercase font-bold">Material</p>
                        <p className="text-[10px] font-bold text-slate-300">{item.material || 'S355JR'}</p>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                        <p className="text-[7px] text-slate-500 uppercase font-bold">Qty</p>
                        <p className="text-[10px] font-bold text-orange-500">{item.qty}</p>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                        <p className="text-[7px] text-slate-500 uppercase font-bold">Len</p>
                        <p className="text-[10px] font-bold">{item.length}</p>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                        <p className="text-[7px] text-slate-500 uppercase font-bold">Weight</p>
                        <p className="text-[10px] font-bold text-emerald-400">{item.weight}</p>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/30">
                   <span className="text-[8px] text-slate-600 font-bold uppercase">Area (sqm)</span>
                   <span className="text-[10px] font-mono text-slate-400">{item.area}</span>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
