import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Account");

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [geoTelemetry, setGeoTelemetry] = useState(true);
  const [anonymousReporting, setAnonymousReporting] = useState(false);

  const getClearance = (role) => {
    if (role === 'admin') return { label: "Chief Operative", lv: 10, color: "text-primary" };
    if (role === 'municipality') return { label: "Official Operative", lv: 7, color: "text-secondary" };
    return { label: "Citizen Operative", lv: 4, color: "text-tertiary" };
  };

  const clearance = getClearance(user?.role);

  return (
    <div className="p-6 lg:p-10 w-full max-w-7xl mx-auto flex flex-col pb-24 lg:pb-10 min-h-screen">
      <header className="mb-10">
        <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface mb-2">Operative Settings</h1>
        <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest opacity-80">Configuration & Identity</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3">
          <div className="flex flex-col gap-2 bg-surface-container-low rounded-xl p-3 border border-outline-variant/15 shadow-[0px_24px_48px_rgba(0,0,0,0.4)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            
            <button onClick={() => setActiveTab("Account")} className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium relative ${activeTab === 'Account' ? 'bg-surface-container-highest text-primary shadow-sm ring-1 ring-primary/20' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors'}`}>
              {activeTab === 'Account' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
              <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'Account' ? "'FILL' 1" : ""}}>person</span>
              Account
            </button>
            <button onClick={() => setActiveTab("Notifications")} className={`flex justify-start items-center gap-3 px-4 py-3 rounded-lg font-medium relative ${activeTab === 'Notifications' ? 'bg-surface-container-highest text-primary shadow-sm ring-1 ring-primary/20' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors'}`}>
              {activeTab === 'Notifications' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
              <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'Notifications' ? "'FILL' 1" : ""}}>notifications</span>
              Notifications
            </button>
            <button onClick={() => setActiveTab("Privacy")} className={`flex justify-start items-center gap-3 px-4 py-3 rounded-lg font-medium relative ${activeTab === 'Privacy' ? 'bg-surface-container-highest text-primary shadow-sm ring-1 ring-primary/20' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors'}`}>
              {activeTab === 'Privacy' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
              <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'Privacy' ? "'FILL' 1" : ""}}>lock</span>
              Privacy
            </button>
            <button onClick={() => setActiveTab("Appearance")} className={`flex justify-start items-center gap-3 px-4 py-3 rounded-lg font-medium relative ${activeTab === 'Appearance' ? 'bg-surface-container-highest text-primary shadow-sm ring-1 ring-primary/20' : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface transition-colors'}`}>
              {activeTab === 'Appearance' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>}
              <span className="material-symbols-outlined" style={{fontVariationSettings: activeTab === 'Appearance' ? "'FILL' 1" : ""}}>palette</span>
              Appearance
            </button>
          </div>
        </div>

        <div className="lg:col-span-9 space-y-8">
          {activeTab === "Account" && (
            <>
              <div className="bg-surface-variant/40 backdrop-blur-[20px] border border-outline-variant/15 rounded-xl p-8 relative overflow-hidden shadow-[0px_24px_48px_rgba(0,0,0,0.4)]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <h2 className="font-headline text-2xl font-semibold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  Profile Identity
                </h2>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer">
                      <img 
                        alt="Profile" 
                        className="w-32 h-32 rounded-full object-cover border-2 border-surface-container-highest group-hover:border-primary transition-colors" 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random&size=128`} 
                      />
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-sm">
                        <span className="material-symbols-outlined text-white">photo_camera</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-surface-container-highest p-1.5 rounded-full border border-outline-variant/20 shadow-lg">
                        <span className="material-symbols-outlined text-primary text-sm">edit</span>
                      </div>
                    </div>
                    <span className="text-xs text-on-surface-variant uppercase tracking-wider font-label">Operative Avatar</span>
                  </div>
                  <div className="flex-1 w-full space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Operative Name</label>
                      <input onChange={(e) => setName(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-on-surface focus:ring-1 focus:ring-primary focus:border-primary focus:shadow-[0_0_8px_rgba(192,193,255,0.2)] outline-none transition-all" type="text" value={name} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Comm Link (Email)</label>
                      <input onChange={(e) => setEmail(e.target.value)} className="w-full bg-surface-container-highest border border-outline-variant/30 rounded-lg px-4 py-2.5 text-on-surface focus:ring-1 focus:ring-primary focus:border-primary focus:shadow-[0_0_8px_rgba(192,193,255,0.2)] outline-none transition-all" type="email" value={email} />
                    </div>
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-on-surface-variant mb-3">Citizen Clearance Level</label>
                      <div className="inline-flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/20">
                        <span className="material-symbols-outlined text-tertiary" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
                        <span className={`font-headline font-semibold ${clearance.color} tracking-wide`}>Level {clearance.lv} - {clearance.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low rounded-xl p-8 border border-outline-variant/15 shadow-[0px_24px_48px_rgba(0,0,0,0.4)]">
                <h2 className="font-headline text-2xl font-semibold mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">tune</span>
                  System Preferences
                </h2>
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg">
                    <div>
                      <h3 className="font-medium text-on-surface">Enable Geo-Telemetry</h3>
                      <p className="text-sm text-on-surface-variant mt-0.5">Allow background location access for localized alerts.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input onChange={(e) => setGeoTelemetry(e.target.checked)} checked={geoTelemetry} className="sr-only peer" type="checkbox" />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg mt-1">
                    <div>
                      <h3 className="font-medium text-on-surface">Anonymous Reporting</h3>
                      <p className="text-sm text-on-surface-variant mt-0.5">Submit civic issues without attaching your operative ID.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input onChange={(e) => setAnonymousReporting(e.target.checked)} checked={anonymousReporting} className="sr-only peer" type="checkbox" />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button className="bg-gradient-to-r from-primary to-secondary text-on-primary font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity shadow-[0_4px_14px_0_rgba(192,193,255,0.39)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Changes
                </button>
              </div>
            </>
          )}

          {activeTab !== "Account" && (
            <div className="bg-surface-variant/40 backdrop-blur-[20px] border border-outline-variant/15 flex flex-col items-center justify-center p-10 rounded-xl text-center min-h-[400px]">
              <span className="material-symbols-outlined text-outline-variant text-6xl mb-4 opacity-50">construction</span>
              <h3 className="text-lg font-headline font-semibold text-on-surface">Module Under Construction</h3>
              <p className="text-sm text-on-surface-variant mt-2 max-w-sm">The {activeTab} subsystem is currently being upgraded by central engineering. Check back next cycle.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}