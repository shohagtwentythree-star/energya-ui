import React, { useState } from 'react';

export default function BOMParser() {
  const [rawData, setRawData] = useState('');
  const [parsedData, setParsedData] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });

  const parseBOM = () => {
    if (!rawData.trim()) return setStatus({ type: 'error', message: 'Input is empty' });

    // Flatten everything into a single word stream
    const stream = rawData.split(/\s+/).filter(w => w.length > 0);
    const markIndex = stream.findIndex(w => w.toUpperCase() === 'MARK');
    
    if (markIndex === -1) return setStatus({ type: 'error', message: '"MARK" header not found' });

    const dataStream = stream.slice(markIndex + 1);
    const results = [];

    for (let i = 0; i < dataStream.length; i++) {
      const word = dataStream[i];
      const upperWord = word.toUpperCase();

      // 1. Detect SUB TOTAL or TOTAL rows
      if (upperWord.includes('TOTAL')) {
        results.push({
          type: 'TOTAL',
          label: upperWord,
          value: dataStream[i + 1] || ''
        });
        i += 1; // Skip the value word
        continue;
      }

      // 2. Detect Standard Data Row (Anchor with *)
      if (word.includes('*')) {
        results.push({
          type: 'DATA',
          mark: (dataStream[i - 1] || '???').toUpperCase(),
          description: word,
          length: dataStream[i + 1] || '-',
          qty: dataStream[i + 2] || '-',
          weight: dataStream[i + 3] || '-',
          grade: (dataStream[i + 4] || '-').toUpperCase(),
          remark: (dataStream[i + 5] || '-').toUpperCase()
        });
        i += 5; // Advance past consumed values
      }
    }

    setParsedData(results);
    setStatus({ type: 'success', message: `Processed ${results.length} entries` });
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-8 text-slate-200">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* Input Section */}
        <div className="bg-slate-800 p-5 rounded-3xl border border-slate-700 shadow-xl">
          <textarea
            className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-sm text-sky-400 outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Paste BOM Data (Ensure MARK header included)..."
            value={rawData}
            onChange={(e) => setRawData(e.target.value)}
          />
          <button 
            onClick={parseBOM}
            className="mt-3 w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-3 rounded-xl uppercase tracking-widest text-sm transition-all active:scale-95"
          >
            Clean & Parse
          </button>
        </div>

        {/* Results View */}
        <div className="space-y-2">
          {parsedData.map((item, idx) => (
            item.type === 'TOTAL' ? (
              // Subtotal Row
              <div key={idx} className="bg-slate-800/50 border border-amber-500/30 p-3 rounded-xl flex justify-between items-center px-6">
                <span className="text-amber-500 font-black text-xs tracking-widest">{item.label}</span>
                <span className="text-white font-mono font-bold">{item.value} kg</span>
              </div>
            ) : (
              // Standard Data Card (Mobile Friendly Grid)
              <div key={idx} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 hover:border-sky-500/50 transition-colors">
                <div className="flex justify-between items-start mb-2 border-b border-slate-700/50 pb-2">
                  <span className="font-black text-white text-lg leading-none">{item.mark}</span>
                  <span className="bg-slate-900 px-2 py-1 rounded text-[10px] font-mono text-sky-400">{item.description}</span>
                </div>
                
                {/* Compact Grid for Values */}
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                  <div className="bg-slate-900/50 p-1 rounded-lg">
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Len</p>
                    <p className="text-xs font-mono">{item.length}</p>
                  </div>
                  <div className="bg-slate-900/50 p-1 rounded-lg">
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Qty</p>
                    <p className="text-xs font-bold text-orange-500">{item.qty}</p>
                  </div>
                  <div className="bg-slate-900/50 p-1 rounded-lg">
                    <p className="text-[8px] text-slate-500 font-bold uppercase">Weight</p>
                    <p className="text-xs font-mono text-emerald-400">{item.weight}</p>
                  </div>
                </div>

                {/* Footer details */}
                <div className="flex justify-between items-center text-[10px] pt-1">
                  <span className="text-slate-400 font-bold uppercase">{item.grade}</span>
                  <span className="text-slate-600 italic truncate ml-4 uppercase">{item.remark}</span>
                </div>
              </div>
            )
          ))}
        </div>

        {status.message && (
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
