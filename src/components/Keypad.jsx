import React from 'react';

export default function Keypad({ onKey, onAction, actionLabel, loading }) {
  const quickKeys = ["PL-", "B-", "S-", "H-"];
  const numKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "DEL"];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-3 shadow-2xl z-50 animate-slide-up">
      <div className="max-w-md mx-auto space-y-3">
        
        {/* Quick Prefix Keys */}
        <div className="grid grid-cols-4 gap-2">
          {quickKeys.map(k => (
            <button key={k} onClick={() => onKey(k)} className="bg-slate-800 py-2 rounded font-bold text-sky-500 border border-slate-700 active:bg-sky-900">{k}</button>
          ))}
        </div>
        
        {/* Number Pad & Action */}
        <div className="flex gap-2">
          <div className="grid grid-cols-3 gap-2 flex-1">
            {numKeys.map(k => (
              <button 
                key={k} 
                onClick={() => onKey(k)} 
                className={`py-4 rounded-xl font-bold text-xl active:scale-95 transition-all ${
                  k === 'DEL' ? 'bg-red-900/20 text-red-500' : 
                  k === 'CLR' ? 'bg-slate-700 text-slate-300' : 
                  'bg-slate-800 text-white border border-slate-700'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          
          {/* Large Vertical Action Button */}
          <button 
            onClick={onAction}
            disabled={loading}
            className="w-20 bg-sky-600 rounded-xl font-black text-white flex items-center justify-center text-vertical tracking-widest active:bg-sky-400 disabled:bg-slate-700"
          >
            {loading ? '...' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
