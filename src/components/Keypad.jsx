import React, { useState, useEffect } from 'react';

// --- KEYPAD ICONS ---
const KIcons = {
  Back: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414A2 2 0 0010.828 19H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" /></svg>,
  Clear: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Check: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
  Alpha: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 5v14M15 7h6m-3 0v12" /></svg>,
  Num: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
};

export default function Keypad({ value, onChange, onClose, onAdd }) {
  const [view, setView] = useState('numeric');
  const [lastAlpha, setLastAlpha] = useState(() => localStorage.getItem('lastAlphabet') || '/');

  const dimensions = ['L', 'W', 'T', 'H'];
  const alphaRows = ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), "ZXCVBNM".split("")];

  // Numeric Mapping including the dynamic lastAlpha
  const numKeys = [
    '7', '8', '9', 'BACK',
    '4', '5', '6', '-',
    '1', '2', '3', '.',
    'CLR', '0', lastAlpha, 'ADD'
  ];

  const handlePress = (key) => {
    if (key === 'ADD') { onAdd(); onClose(); }
    else if (key === 'BACK' || key === '←') { onChange(value.slice(0, -1)); }
    else if (key === 'CLR') { onChange(''); }
    else {
      const isAlphabet = /^[A-Z]$/.test(key);
      if (isAlphabet && !dimensions.includes(key)) {
        setLastAlpha(key);
        localStorage.setItem('lastAlphabet', key);
      }
      onChange(value + key);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-slate-900 border-t border-slate-700 shadow-2xl select-none touch-manipulation">
      {/* Header */}
      <div className="flex justify-between items-center px-4 h-10 bg-slate-950 border-b border-slate-800">
        <span className="text-xs font-mono text-sky-400 font-bold truncate">{value || 'READY'}</span>
        <button onClick={onClose} className="text-slate-500 font-black text-[10px] tracking-widest uppercase">Close</button>
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

        {/* Dynamic Area */}
        <div className="flex-1 bg-slate-900">
          {view === 'numeric' ? (
            <div className="grid grid-cols-4 h-full">
              {numKeys.map((k, i) => (
                <button key={i} onClick={() => handlePress(k)} 
                  className={`border-r border-b border-slate-800 flex items-center justify-center transition-colors active:bg-slate-700
                    ${k === 'BACK' || k === 'CLR' ? 'bg-red-950/20 text-red-500' : 'text-white font-bold text-2xl'}
                    ${k === 'ADD' ? 'bg-emerald-600 text-white active:bg-emerald-500' : ''}
                    ${k === lastAlpha ? 'text-amber-400' : ''}
                  `}>
                  {k === 'BACK' ? <KIcons.Back /> : k === 'CLR' ? <KIcons.Clear /> : k === 'ADD' ? <KIcons.Check /> : k}
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
              {/* Alpha Control Row */}
              <div className="flex-1 flex">
                <button onClick={() => handlePress('CLR')} className="flex-1 border-r border-b border-slate-800 bg-red-950/20 text-red-500 flex items-center justify-center active:bg-red-900/40">
                  <KIcons.Clear />
                </button>
                <button onClick={() => handlePress('BACK')} className="flex-1 border-r border-b border-slate-800 bg-slate-800 text-white flex items-center justify-center active:bg-slate-700">
                  <KIcons.Back />
                </button>
                <button onClick={() => handlePress('ADD')} className="flex-[2] border-b border-slate-800 bg-emerald-600 text-white flex items-center justify-center active:bg-emerald-500">
                  <KIcons.Check />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
