import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/fabricators';

export default function WorkshopTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list'); 
  const [selectedTeam, setSelectedTeam] = useState(null);

  const [newTeam, setNewTeam] = useState({
    name: '',
    workspace: '', 
    phone: '',
    headcount: 1,
    shift: 'Day', 
    specialty: '', 
    status: 'Available',
    lastMonthJobs: [] 
  });

  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      const data = result.status === "success" ? result.data : (Array.isArray(result) ? result : []);
      setTeams(data);
    } catch (error) { 
      console.error("Fetch error:", error); 
    } finally { 
      setLoading(false); 
    }
  };

  const filteredTeams = teams.filter(t => 
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.workspace || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.phone || '').includes(searchTerm)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeam)
      });
      if (response.ok) {
        setNewTeam({ name: '', workspace: '', phone: '', headcount: 1, shift: 'Day', specialty: '', status: 'Available', lastMonthJobs: [] });
        setView('list');
        fetchTeams();
      }
    } catch (error) { console.error("Save error:", error); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-sky-500 font-black tracking-[0.5em] animate-pulse italic">SYNCING_CORE_DATABASE</div>
    </div>
  );

  if (view === 'add') return <AddTeamView newTeam={newTeam} setNewTeam={setNewTeam} onSubmit={handleSubmit} onCancel={() => setView('list')} />;
  if (view === 'detail') return <TeamDetailView team={selectedTeam} onBack={() => setView('list')} />;

  return (
    <div className="w-full min-h-screen bg-[#0a0f1a] p-4 md:p-8 text-slate-200 selection:bg-sky-500 selection:text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12 border-l-4 border-sky-600 pl-6 py-2">
        <div>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">Workshop<br/>Operations</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.4em] mt-3">Personnel Management & Field Logistics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 flex-1 md:max-w-3xl">
          <div className="relative flex-1">
             <input 
                type="text" placeholder="SEARCH OPERATIVE OR BAY..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900/50 border-b-2 border-slate-800 focus:border-sky-500 py-4 px-2 text-white outline-none transition-all font-mono placeholder:text-slate-700"
             />
          </div>
          <button 
            onDoubleClick={() => setView('add')}
            className="bg-sky-600 hover:bg-white hover:text-black text-white font-black px-8 py-4 transition-all uppercase text-xs tracking-widest shadow-[0_0_20px_rgba(2,132,199,0.3)]"
          >
            + Register Staff
          </button>
        </div>
      </div>

      {/* Grid view for better visual density */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTeams.map((team, idx) => (
          <div key={team.id || idx} className="group bg-slate-900/40 border border-slate-800 p-1 hover:border-sky-500/50 transition-all duration-300 relative overflow-hidden">
            {/* Shift Indicator Bar */}
            <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase ${team.shift === 'Day' ? 'bg-orange-500 text-black' : 'bg-indigo-600 text-white'}`}>
              {team.shift}
            </div>

            <div className="p-6">
               <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-white group-hover:text-sky-400 transition-colors uppercase italic">{team.name || 'UNNAMED'}</h3>
                    <p className="text-sky-600 font-bold text-[10px] tracking-widest uppercase">{team.workspace || 'FLOATING_STATION'}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-6 border-y border-slate-800/50 py-4">
                  <div>
                    <span className="block text-[10px] text-slate-600 font-black uppercase">Contact</span>
                    <span className="text-sm font-mono text-slate-300">{team.phone || 'NO_PHN'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-600 font-black uppercase">Staffing</span>
                    <span className="text-sm font-bold text-slate-300">{team.headcount} UNIT(S)</span>
                  </div>
               </div>

               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${team.status === 'Available' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{team.status}</span>
                  </div>
                  <button onClick={() => {setSelectedTeam(team); setView('detail')}} className="text-[10px] font-black text-white hover:text-sky-500 underline decoration-2 underline-offset-4 transition-all">VIEW_RECORDS</button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddTeamView({ newTeam, setNewTeam, onSubmit, onCancel }) {
  return (
    <div className="w-full min-h-screen bg-[#0a0f1a] p-4 md:p-10 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Personnel Entry</h2>
          <div className="h-1 w-24 bg-sky-600 mx-auto mt-2"></div>
        </div>

        <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 p-8 md:p-12 shadow-2xl relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Operative Name / Lead</label>
               <input required type="text" className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 p-4 text-white font-bold outline-none transition-all" 
                value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} />
            </div>
            <div>
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Phone</label>
               <input required type="tel" className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 p-4 text-white font-mono outline-none transition-all" 
                value={newTeam.phone} onChange={e => setNewTeam({...newTeam, phone: e.target.value})} />
            </div>
            <div>
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Bay / Station</label>
               <input required type="text" className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 p-4 text-white font-bold outline-none transition-all" 
                value={newTeam.workspace} onChange={e => setNewTeam({...newTeam, workspace: e.target.value})} />
            </div>
            <div className="md:col-span-2">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Specialty (e.g. CWB Class A)</label>
               <input required type="text" className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 p-4 text-white font-bold outline-none transition-all" 
                value={newTeam.specialty} onChange={e => setNewTeam({...newTeam, specialty: e.target.value})} />
            </div>
            <div>
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Shift</label>
               <select className="w-full bg-slate-950 border border-slate-800 p-4 text-white font-black outline-none appearance-none" value={newTeam.shift} onChange={e => setNewTeam({...newTeam, shift: e.target.value})}>
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
               </select>
            </div>
            <div>
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Status</label>
               <select className="w-full bg-slate-950 border border-slate-800 p-4 text-white font-black outline-none appearance-none" value={newTeam.status} onChange={e => setNewTeam({...newTeam, status: e.target.value})}>
                  <option value="Available">Available</option>
                  <option value="Busy">On Assignment</option>
               </select>
            </div>
          </div>
          
          <div className="mt-12 flex flex-col gap-4">
            <button type="submit" className="w-full bg-sky-600 hover:bg-white hover:text-black text-white font-black py-5 transition-all uppercase tracking-widest text-sm shadow-xl">
              Authorize Operative
            </button>
            <button type="button" onClick={onCancel} className="text-slate-600 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors">
              Abort Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeamDetailView({ team, onBack }) {
  const jobs = Array.isArray(team?.lastMonthJobs) ? team.lastMonthJobs : [];

  return (
    <div className="w-full min-h-screen bg-[#0a0f1a] p-4 md:p-12">
      <button onClick={onBack} className="group text-sky-500 font-black mb-12 hover:text-white transition-all flex items-center gap-4 uppercase text-xs tracking-widest">
        <span className="group-hover:-translate-x-2 transition-transform italic">← Return_Main_Registry</span>
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-sky-600"></div>
          <div className="w-24 h-24 bg-slate-950 border border-slate-800 flex items-center justify-center text-4xl font-black text-sky-500 mb-8 italic shadow-inner">
            {team.name?.charAt(0)}
          </div>
          <h2 className="text-4xl font-black text-white leading-tight uppercase italic">{team.name}</h2>
          <p className="text-sky-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 mb-8">{team.workspace}</p>
          
          <div className="space-y-6 pt-8 border-t border-slate-800/50 text-xs font-black uppercase tracking-tighter">
             <div className="flex justify-between border-b border-slate-800/30 pb-2"><span className="text-slate-500">Comm_Link:</span><span className="text-white font-mono">{team.phone}</span></div>
             <div className="flex justify-between border-b border-slate-800/30 pb-2"><span className="text-slate-500">Operation:</span><span className="text-white">{team.specialty}</span></div>
             <div className="flex justify-between border-b border-slate-800/30 pb-2"><span className="text-slate-500">Current_Shift:</span><span className="text-white">{team.shift}</span></div>
             <div className="flex justify-between border-b border-slate-800/30 pb-2"><span className="text-slate-500">Assigned_Units:</span><span className="text-white">{team.headcount}</span></div>
          </div>
        </div>

        {/* History Card */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 p-8 md:p-12">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <h3 className="text-white font-black text-3xl italic uppercase tracking-tighter">Production_Log <span className="text-slate-600 text-sm not-italic font-mono ml-4">/ LAST_30_DAYS</span></h3>
              <div className="bg-sky-950/30 border border-sky-900 px-4 py-2 rounded text-sky-400 font-mono text-xs">
                 RECORDS_FOUND: {jobs.length}
              </div>
           </div>
           
           {jobs.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {jobs.map((job, i) => (
                 <div key={i} className="bg-slate-950 p-6 border border-slate-800 group hover:border-sky-700 transition-all flex justify-between items-center shadow-inner">
                   <div>
                      <span className="text-[10px] text-slate-600 font-black block mb-1">TASKid</span>
                      <span className="text-white font-black font-mono text-lg">{job}</span>
                   </div>
                   <div className="h-2 w-2 rounded-full bg-sky-500"></div>
                 </div>
               ))}
             </div>
           ) : (
             <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 bg-slate-950/30">
               <div className="text-slate-700 font-black uppercase text-xs tracking-[0.5em]">No_Activity_Detected</div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
