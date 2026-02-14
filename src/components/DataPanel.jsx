import React from "react";

export default function DataPanel({ data = {}, label = "Data", maxHeight = 300 }) {
  return (
    <div className="bg-black border border-yellow-500/30 rounded-xl p-4 text-[10px] font-mono text-yellow-400">
      {/* Label */}
      <div className="font-bold text-yellow-300 mb-2">{label}</div>

      {/* Scrollable JSON */}
      <div
        className="overflow-auto border border-yellow-600 rounded p-2 bg-black"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <pre className="whitespace-pre-wrap break-all">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/* 



<DataPanel data={{ pallets: allPallets, drawings }} label="Diagnostics" maxHeight={400} />




*/