import React, { useState, useEffect } from 'react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('config');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const MASTER_KEY = "Shohag4750";

  // Standard Configuration Template
  const DEFAULT_CONFIG = [
    { 
      id: "sys_network", 
      key: "API_ENDPOINT", 
      value: "http://localhost:3000", 
      description: "Primary backend gateway" 
    },
    { 
      id: "sys_safety", 
      key: "MAINTENANCE_MODE", 
      value: "OFF", 
      description: "Global system lock (ON/OFF)" 
    },
    { 
      id: "sys_storage", 
      key: "BACKUP_RETENTION_DAYS", 
      value: "30", 
      description: "Auto-purge age for snapshots" 
    },
    { 
      id: "sys_ui", 
      key: "THEME_ACCENT", 
      value: "#0ea5e9", 
      description: "Primary UI color hex" 
    }
  ];

  const fetchData = async (tab) => {
    setLoading(true);
    const endpoint = tab === 'config' ? 'raw-config' : 'users-list';
    try {
      const res = await fetch(`http://localhost:3000/maintenance/database/${endpoint}`);
      const d = await res.json();
      setData(d.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const handleSave = async () => {
    if (activeTab === 'users') {
      try {
        const promises = data.map(user => 
          fetch('http://localhost:3000/auth/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentUsername: user.username,
              newUsername: user.username,
              newPassword: user.password || null,
              key: MASTER_KEY
            })
          })
        );
        await Promise.all(promises);
        alert("User data synchronized.");
      } catch (err) { alert("User update failed."); }
    } else {
      const res = await fetch(`http://localhost:3000/maintenance/database/config-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configData: data, key: MASTER_KEY })
      });
      if (res.ok) alert("System Configuration updated.");
    }
  };

  const initDefaults = () => {
    if (window.confirm("Initialize with standard system defaults?")) {
      setData(DEFAULT_CONFIG);
    }
  };

  const updateField = (index, key, val) => {
    const newData = [...data];
    newData[index][key] = val;
    setData(newData);
  };

  const deleteEntry = (index) => {
    if (window.confirm("Delete this entry?")) {
      setData(data.filter((_, i) => i !== index));
    }
  };

  const addNewItem = () => {
    const newItem = activeTab === 'users' 
      ? { id: `user_${Date.now()}`, username: "new_user", role: "admin", password: "" }
      : { id: `cfg_${Date.now()}`, key: "NEW_KEY", value: "VALUE", description: "" };
    setData([newItem, ...data]);
  };

  if (loading) return (
    <div className="p-20 text-center text-white font-mono text-[10px] uppercase">Reading Database...</div>
  );

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-slate-900 p-4 border border-white/10 rounded-xl">
        <h1 className="text-xs font-bold text-white uppercase tracking-widest">Admin Control</h1>
        <button 
          onClick={handleSave} 
          className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded-md"
        >
          Save All
        </button>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-900 border border-white/5 p-1 rounded-xl">
        <button onClick={() => setActiveTab('config')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg ${activeTab === 'config' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Config</button>
        <button onClick={() => setActiveTab('users')} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg ${activeTab === 'users' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Users</button>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2">
        <button onClick={addNewItem} className="flex-1 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase rounded-lg">+ Add Entry</button>
        {activeTab === 'config' && data.length === 0 && (
          <button onClick={initDefaults} className="flex-1 py-2 bg-amber-600/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase rounded-lg">Reset Defaults</button>
        )}
      </div>

      {/* DATA CARDS */}
      <div className="space-y-4">
        {data.map((item, i) => (
          <div key={item.id || i} className="bg-slate-900 border border-white/5 p-4 rounded-xl relative">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
              <span className="text-[8px] font-mono text-slate-600 uppercase">ID: {item.id}</span>
              <button onClick={() => deleteEntry(i)} className="text-rose-500 text-[10px] font-bold">REMOVE</button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(item).filter(([k]) => k !== 'id' && k !== 'type').map(([key, value]) => (
                <div key={key}>
                  <label className="text-[7px] text-slate-500 font-bold uppercase block mb-1 tracking-widest">{key}</label>
                  <input 
                    type={(key === 'password' || key === 'secret') ? 'password' : 'text'}
                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2.5 text-xs text-blue-300 font-mono outline-none focus:border-blue-500"
                    value={value || ""}
                    onChange={(e) => updateField(i, key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPanel;
