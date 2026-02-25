import React, { useState, useEffect } from 'react';

// --- KEYPAD ICONS ---
const KIcons = {
  Back: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414A2 2 0 0010.828 19H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>,
  Clear: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Check: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
  Preset: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>,
  Alpha: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 5v14M15 7h6m-3 0v12" /></svg>,
  Num: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
};

const MAX_PRESET_LENGTH = 60;

export default function Keypad({ value, onChange, onClose, onAdd }) {
  const [view, setView] = useState('numeric');
  const [lastAlpha, setLastAlpha] = useState(() => localStorage.getItem('lastAlphabet') || '/');
  const [presets, setPresets] = useState(() => {
    try {
      const saved = localStorage.getItem('keypadPresets');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showPresets, setShowPresets] = useState(false);

  // Get the latest preset for the "Reset" functionality in header
  const latestPreset = [...presets].sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0))[0]?.text;

  useEffect(() => {
    localStorage.setItem('keypadPresets', JSON.stringify(presets));
  }, [presets]);

  const dimensions = ['L', 'W', 'T', 'H'];
  const alphaRows = ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), "ZXCVBNM".split("")];
  const numKeys = ['7', '8', '9', 'BACK', '4', '5', '6', '-', '1', '2', '3', 'PRESET', 'CLR', '0', lastAlpha, 'ADD'];

  const handlePress = (key) => {
    if (key === 'ADD') { onAdd(); } 
    else if (key === 'BACK') { onChange(value.slice(0, -1)); } 
    else if (key === 'CLR') { onChange(''); } 
    else if (key === 'PRESET') { setShowPresets(true); } 
    else {
      const isAlphabet = /^[A-Z]$/.test(key);
      if (isAlphabet && !dimensions.includes(key)) {
        setLastAlpha(key);
        localStorage.setItem('lastAlphabet', key);
      }
      onChange(value + key);
    }
  };

  

    const handleLoadPreset = (text) => {
    onChange(text);
    setPresets(prev => {
      // Update the usedAt timestamp for the one we just clicked
      const updated = prev.map(p => 
        p.text === text ? { ...p, usedAt: Date.now() } : p
      );
      // Even on load, we ensure we stay within limits (just in case)
      return updated.sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0)).slice(0, 20);
    });
    setShowPresets(false);
  };

  const handleSaveCurrent = () => {
    if (!value.trim()) return;
    
    setPresets(prev => {
      // 1. Remove if it already exists (to avoid duplicates)
      const filtered = prev.filter(p => p.text !== value);
      
      // 2. Add the new one with current timestamp
      const newList = [{ text: value, usedAt: Date.now() }, ...filtered];
      
      // 3. Sort by most recently used first
      // 4. Slice to keep only the top 20
      return newList
        .sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0))
        .slice(0, 20);
    });
    
    setShowPresets(false);
  };


  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 border-t border-slate-700 shadow-2xl select-none touch-manipulation">
        {/* Header - Kept original design with added functionality */}
        <div className="flex justify-between items-center px-4 h-10 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden mr-2">
                        <span className="text-[14px] font-mono text-sky-400 font-bold truncate">
              {value || 'READY'}
            </span>


          </div>
                      {/* Clickable Preset Reset */}
            <button 
              onClick={() => latestPreset && onChange(latestPreset)}
              className="text-[14px] text-purple-300 px-1.5 py-0.5 whitespace-nowrap"
            >
              {latestPreset ? `${latestPreset}` : 'NO PRESET'}
            </button>
          <button
            onClick={onClose}
            className="text-slate-500 font-black text-[10px] tracking-widest uppercase shrink-0"
          >
            Close
          </button>
        </div>

        <div className="flex h-[300px]">
          {/* Left Dimensions Column */}
          <div className="flex flex-col w-14 border-r border-slate-800 shrink-0">
            {dimensions.map(d => (
              <button key={d} onClick={() => handlePress(d)} className="flex-1 bg-sky-500/10 text-sky-400 border-b border-slate-800 font-black text-xl active:bg-sky-500 active:text-white transition-colors">
                {d}
              </button>
            ))}
            <button onClick={() => setView(view === 'numeric' ? 'alpha' : 'numeric')} className="flex-1 bg-amber-500/10 text-amber-500 flex items-center justify-center border-b border-slate-800 active:bg-amber-500 active:text-white">
              {view === 'numeric' ? <KIcons.Alpha /> : <KIcons.Num />}
            </button>
          </div>

          {/* Main Keys */}
          <div className="flex-1 bg-slate-900">
            {view === 'numeric' ? (
              <div className="grid grid-cols-4 h-full">
                {numKeys.map((k, i) => (
                  <button
                    key={i}
                    onClick={() => handlePress(k)}
                    className={`border-r border-b border-slate-800 flex items-center justify-center transition-colors active:bg-slate-700
                      ${k === 'BACK' || k === 'CLR' ? 'bg-red-950/20 text-red-500' : 'text-white font-bold text-2xl'}
                      ${k === 'ADD' ? 'bg-emerald-600 text-white active:bg-emerald-500' : ''}
                      ${k === lastAlpha ? 'text-amber-400' : ''}
                      ${k === 'PRESET' ? 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/40' : ''}
                    `}
                  >
                    {k === 'BACK' ? <KIcons.Back /> : k === 'CLR' ? <KIcons.Clear /> : k === 'ADD' ? <KIcons.Check /> : k === 'PRESET' ? <KIcons.Preset /> : k}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {alphaRows.map((row, idx) => (
                  <div key={idx} className="flex-1 flex">
                    {row.map(char => (
                      <button key={char} onClick={() => handlePress(char)} className="flex-1 border-r border-b border-slate-800 text-white font-bold text-sm active:bg-sky-600 transition-colors">
                        {char}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="flex-1 flex">
                  <button onClick={() => handlePress('CLR')} className="flex-1 border-r border-b border-slate-800 bg-red-950/20 text-red-500 flex items-center justify-center"><KIcons.Clear /></button>
                  <button onClick={() => handlePress('BACK')} className="flex-1 border-r border-b border-slate-800 bg-slate-800 text-white flex items-center justify-center"><KIcons.Back /></button>
                  <button onClick={() => handlePress('ADD')} className="flex-[2] border-b border-slate-800 bg-emerald-600 text-white flex items-center justify-center"><KIcons.Check /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Presets Modal */}
      {showPresets && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center text-white">
              <h3 className="text-lg font-semibold">Presets</h3>
              <button onClick={() => setShowPresets(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 border-b border-slate-800 bg-slate-950/60">
              <button onClick={handleSaveCurrent} disabled={!value.trim()} className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors">
                Save current text as preset
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-white">
              {presets.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No presets saved yet</p>
              ) : (
                [...presets].sort((a, b) => (b.usedAt || 0) - (a.usedAt || 0)).map((preset, idx) => (
                  <div key={idx} onClick={() => handleLoadPreset(preset.text)} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${idx === 0 ? 'bg-purple-900/30 border border-purple-700/50' : 'hover:bg-slate-800'}`}>
                    <span className="font-mono text-sm truncate">{idx === 0 && '★ '}{preset.text}</span>
                    <button onClick={(e) => { e.stopPropagation(); setPresets(prev => prev.filter(p => p.text !== preset.text)); }} className="text-red-400 opacity-0 group-hover:opacity-100 px-2">×</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
