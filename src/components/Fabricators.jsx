import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3000/fabricators';

export default function WorkshopTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('list'); 
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Form State for Internal Workshop Group
  const [newTeam, setNewTeam] = useState({
    teamLead: '',
    groupName: '', // e.g., "Bay 1 Team" or "Team Alpha"
    headcount: 1,
    shift: 'Day', // Day, Night
    specialty: '', // e.g., "Main Girders", "Small Brackets"
    currentDrawings: 0,
    status: 'Available'
  });

  useEffect(() => { fetchTeams(); }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.status === "success") setTeams(result.data);
    } catch (error) { console.error("Fetch error:", error); }
    finally { setLoading(false); }
  };

  const filteredTeams = teams.filter(t => 
    t.teamLead?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
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
        setNewTeam({ teamLead: '', groupName: '', headcount: 1, shift: 'Day', specialty: '', currentDrawings: 0, status: 'Available' });
        setView('list');
        fetchTeams();
      }
    } catch (error) { console.error("Save error:", error); }
  };

  if (loading) return <div className="p-10 text-center text-slate-400 font-mono italic">Loading Workshop Teams...</div>;
  if (view === 'add') return <AddTeamView newTeam={newTeam} setNewTeam={setNewTeam} onSubmit={handleSubmit} onCancel={() => setView('list')} />;
  if (view === 'detail') return <TeamDetailView team={selectedTeam} onBack={() => setView('list')} />;

  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-8 text-slate-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Workshop Teams</h1>
          <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.2em] mt-1">Internal Fabricators & Personnel</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 flex-1 md:max-w-2xl">
          <input 
            type="text" placeholder="Search Lead or Group Name..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-sky-500 transition-all"
          />
          {/* Hidden Admin Access */}
<div className="flex justify-end pr-2">
  <button 
    onDoubleClick={() => setView('add')}
    className="text-slate-800 hover:text-slate-700 transition-colors cursor-default select-none p-2"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  </button>
</div>

        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block w-full overflow-hidden bg-slate-800/50 rounded-[2rem] border border-slate-700 shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800 text-slate-500 text-[10px] uppercase font-black tracking-[0.3em]">
            <tr>
              <th className="p-6">Group / Team Lead</th>
              <th className="p-6">Specialty</th>
              <th className="p-6 text-center">Headcount</th>
              <th className="p-6 text-center">Shift</th>
              <th className="p-6 text-center">Status</th>
              <th className="p-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredTeams.map((team) => (
              <tr key={team._id} className="hover:bg-slate-700/20 transition-all group">
                <td className="p-6">
                  <div className="font-black text-xl text-white group-hover:text-sky-400 transition-colors">{team.groupName || 'Individual'}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Lead: {team.teamLead}</div>
                </td>
                <td className="p-6 text-slate-400 font-bold uppercase text-xs">{team.specialty}</td>
                <td className="p-6 text-center font-mono font-bold text-lg text-white">{team.headcount}</td>
                <td className="p-6 text-center">
                   <span className="bg-slate-900 border border-slate-700 px-3 py-1 rounded text-[10px] font-bold text-slate-400 uppercase">{team.shift}</span>
                </td>
                <td className="p-6 text-center">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border ${team.status === 'Available' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-orange-500/10 text-orange-400 border-orange-500/30'}`}>
                    {team.status}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <button onClick={() => {setSelectedTeam(team); setView('detail')}} className="bg-slate-700 hover:bg-white hover:text-slate-900 px-6 py-2 rounded-xl font-black transition uppercase text-[10px]">Workload</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filteredTeams.map((team) => (
          <div key={team._id} onClick={() => {setSelectedTeam(team); setView('detail')}} className="bg-slate-800 border border-slate-700 rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h3 className="text-2xl font-black text-white">{team.groupName || team.teamLead}</h3>
                  <p className="text-sky-500 text-[10px] font-black uppercase">{team.specialty}</p>
               </div>
               <span className="bg-slate-900 text-slate-400 text-[8px] px-2 py-1 rounded font-bold uppercase border border-slate-700">{team.shift}</span>
            </div>
            <div className="flex justify-between border-t border-slate-700 pt-4">
               <span className="text-[10px] text-slate-500 uppercase font-black">Headcount: {team.headcount}</span>
               <span className="text-[10px] text-sky-400 uppercase font-black">{team.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddTeamView({ newTeam, setNewTeam, onSubmit, onCancel }) {
  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-10">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Team Registration</h2>
          <button onClick={onCancel} className="text-slate-500 font-bold hover:text-white transition text-xs uppercase">Back</button>
        </div>

        <form onSubmit={onSubmit} className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-sky-500"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Group/Team Name</label>
              <input required type="text" placeholder="e.g. Bay 1 Main Team" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-sky-500" 
                onChange={e => setNewTeam({...newTeam, groupName: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Team Lead Name</label>
              <input required type="text" placeholder="Full Name" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-sky-500" 
                onChange={e => setNewTeam({...newTeam, teamLead: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Specialty / Machine</label>
              <input required type="text" placeholder="e.g. Arc Welding, CNC Operator" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-sky-500" 
                onChange={e => setNewTeam({...newTeam, specialty: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Headcount</label>
                <input required type="number" min="1" className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none focus:border-sky-500" 
                  value={newTeam.headcount} onChange={e => setNewTeam({...newTeam, headcount: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Shift</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white font-bold outline-none" onChange={e => setNewTeam({...newTeam, shift: e.target.value})}>
                  <option value="Day">Day Shift</option>
                  <option value="Night">Night Shift</option>
                </select>
              </div>
            </div>
          </div>
          
          <button type="submit" className="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-6 rounded-[2rem] shadow-2xl transition uppercase tracking-[0.4em] text-lg">
            Register for Operations
          </button>
        </form>
      </div>
    </div>
  );
}

function TeamDetailView({ team, onBack }) {
  return (
    <div className="w-full min-h-screen bg-slate-900 p-4 md:p-8">
      <button onClick={onBack} className="text-sky-400 font-black mb-8 hover:tracking-widest transition-all">← ALL TEAMS</button>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl">
          <div className="w-20 h-20 bg-sky-600 rounded-3xl flex items-center justify-center text-3xl font-black text-white mb-8">
            {team.teamLead?.charAt(0)}
          </div>
          <h2 className="text-4xl font-black text-white leading-tight">{team.groupName || team.teamLead}</h2>
          <p className="text-sky-500 font-bold uppercase tracking-widest text-xs mt-2">{team.specialty}</p>
          
          <div className="mt-10 pt-10 border-t border-slate-700 space-y-4">
             <div className="flex justify-between">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Shift</span>
                <span className="text-white font-bold uppercase">{team.shift}</span>
             </div>
             <div className="flex justify-between">
                <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Total Staff</span>
                <span className="text-white font-bold">{team.headcount} Persons</span>
             </div>
          </div>
        </div>

        {/* Load Card */}
        <div className="md:col-span-2 bg-slate-800 p-10 rounded-[3rem] border border-slate-700">
           <h3 className="text-white font-black text-2xl italic uppercase mb-8">Workload Dashboard</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-700">
                 <p className="text-slate-500 text-[10px] font-black uppercase mb-2">Active Assigned Drawings</p>
                 <p className="text-6xl font-black text-white">{team.currentDrawings || 0}</p>
              </div>
              <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-700">
                 <p className="text-slate-500 text-[10px] font-black uppercase mb-2">Availability Status</p>
                 <p className="text-2xl font-black text-green-400 uppercase tracking-tighter">{team.status}</p>
              </div>
           </div>

           <div className="mt-10 p-10 bg-slate-900/50 rounded-[2rem] border border-slate-700 border-dashed -center">
              <p className="text-slate-500 font-bold uppercase -widest text-xs italic">Current Jobs list will populate here based on assigned drawing numbers.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
