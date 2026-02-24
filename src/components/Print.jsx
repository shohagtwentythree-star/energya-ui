import React, { useState, useEffect } from "react";

const DRAWING_API = "http://localhost:3000/drawings";

export default function Print() {
  const [drawings, setDrawings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch(DRAWING_API)
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") setDrawings(json.data || []);
      });
  }, []);

  // Filter based on Drawing Number, Order, or Plate Mark
  const filteredDrawings = drawings.filter((d) => {
    const search = searchTerm.toLowerCase();
    return (
      d.drawingNumber?.toLowerCase().includes(search) ||
      d.orderNumber?.toLowerCase().includes(search) ||
      d.plates?.some((p) => p.mark?.toLowerCase().includes(search))
    );
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. CONTROL PANEL (Hidden during print) */}
      <div className="print:hidden bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Search Fabrications</label>
          <input
            type="text"
            placeholder="Search Order, Drawing, or Part Mark..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={handlePrint}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <span>🖨️</span> PRINT SELECTED
        </button>
      </div>

      {/* 2. PRINTABLE AREA */}
      <div className="space-y-8">
        {filteredDrawings.map((dwg) => (
          <div 
            key={dwg.id} 
            className="bg-white text-black p-8 rounded-sm shadow-sm border border-slate-200 print:border-none print:shadow-none print:p-0 page-break-after-always"
          >
            {/* Header Section */}
            <div className="flex justify-between border-b-4 border-black pb-4 mb-6">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter">{dwg.drawingNumber}</h1>
                <p className="text-sm font-bold text-slate-600">ORDER: {dwg.orderNumber || "N/A"}</p>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase">Drawing Qty</div>
                <div className="text-4xl font-black italic">x{dwg.dwgQty || 1}</div>
              </div>
            </div>

            {/* Plates Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black">
                  <th className="py-2 px-3 text-xs font-black uppercase">Part Mark</th>
                  <th className="py-2 px-3 text-xs font-black uppercase">Dimensions (L×W×T)</th>
                  <th className="py-2 px-3 text-xs font-black uppercase">Dwg Qty</th>
                  <th className="py-2 px-3 text-xs font-black uppercase">Total Qty</th>
                  <th className="py-2 px-3 text-xs font-black uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {dwg.plates?.map((plate, idx) => (
                  <tr key={idx} className="border-b border-slate-300">
                    <td className="py-4 px-3 font-mono text-xl font-bold">{plate.mark}</td>
                    <td className="py-4 px-3 text-sm font-medium">
                      {plate.length} × {plate.width} × {plate.thickness} mm
                    </td>
                    <td className="py-4 px-3 font-bold">{plate.qty}</td>
                    <td className="py-4 px-3 text-lg font-black bg-slate-50">
                      {(plate.qty || 0) * (dwg.dwgQty || 1)}
                    </td>
                    <td className="py-4 px-3 text-right">
                      <div className="w-6 h-6 border-2 border-black ml-auto rounded-sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer / Notes */}
            <div className="mt-12 grid grid-cols-2 gap-8 text-[10px] font-bold uppercase text-slate-500 border-t pt-4">
              <div>
                <p>Checked By: ___________________</p>
                <p className="mt-2">Fabricator: ___________________</p>
              </div>
              <div className="text-right">
                <p>Generated: {new Date().toLocaleDateString()}</p>
                <p>Workshop-OS Digital Record</p>
              </div>
            </div>

            {/* CSS to force page break for actual printing */}
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                .page-break-after-always { page-break-after: always; }
                body { background: white !important; color: black !important; }
                nav, .print-hidden, button { display: none !important; }
              }
            `}} />
          </div>
        ))}

        {filteredDrawings.length === 0 && (
          <div className="text-center py-20 text-slate-500 italic">
            No drawings found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
