import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/auth';

const STATUS_CONFIG = {
  resolved:       { label: 'Fixed',       color: 'bg-[#4ADE80]/10 text-[#4ADE80]', dot: 'bg-[#4ADE80]' },
  pending:        { label: 'Pending',      color: 'bg-secondary/10 text-secondary',  dot: 'bg-secondary' },
  complaint_sent: { label: 'In Progress',  color: 'bg-primary/10 text-primary',      dot: 'bg-primary' },
  verified:       { label: 'Verified',     color: 'bg-tertiary/10 text-tertiary',    dot: 'bg-tertiary' },
};

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]         = useState({ points: 0, totalReports: 0, resolved: 0, pending: 0 });
  const [feed, setFeed]           = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/reports/my').catch(() => ({ data: [] })),
      API.get('/rewards/my').catch(() => ({ data: { total_points: 0 } })),
      API.get('/reports/all').catch(() => ({ data: { items: [] } })),
    ]).then(([myRes, rewardsRes, allRes]) => {
      const myReports = Array.isArray(myRes.data) ? myRes.data : [];
      const resolved  = myReports.filter(r => r.status === 'resolved').length;
      const pending   = myReports.filter(r => r.status === 'pending').length;
      const points    = rewardsRes.data?.total_points ?? 0;

      setStats({ points, totalReports: myReports.length, resolved, pending });

      const allItems = allRes.data?.items ?? (Array.isArray(allRes.data) ? allRes.data : []);
      setFeed(allItems.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="sticky top-0 w-full bg-[#10131a]/80 backdrop-blur-md z-30 flex justify-between items-center px-6 h-16 border-b border-[#191b23] shadow-[0px_24px_40px_rgba(173,198,255,0.04)]">
        <div className="flex items-center lg:hidden gap-3">
          <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-headline font-bold">C</div>
          <h1 className="font-headline font-semibold text-primary text-xl tracking-[0.02em]">CivicSense AI</h1>
        </div>
        <div className="hidden lg:block font-headline font-semibold text-on-background text-lg tracking-tight">Citizen Dashboard</div>
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-[#32353c] hover:text-primary transition-all active:scale-95 duration-200">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-headline font-bold text-on-primary cursor-pointer text-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      <main className="flex-1 pt-8 px-6 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
        {/* Welcome Area */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-headline text-3xl text-on-background font-semibold tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'Operative'}.
            </h2>
            <p className="font-body text-on-surface-variant text-sm mt-1">Your community impact overview is ready.</p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-on-primary font-label font-semibold px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(192,193,255,0.2)] hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>add_circle</span>
            Report Issue
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* My Impact Card */}
              <div className="glass-gradient rounded-xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div>
                    <h3 className="font-headline text-lg font-medium text-primary tracking-tight">My Impact</h3>
                    <p className="font-body text-xs text-on-surface-variant mt-1">Lifetime contribution metrics</p>
                  </div>
                  <span className="material-symbols-outlined text-primary/70">insights</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                  <div className="flex flex-col">
                    <span className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-2">Community Points</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-headline text-4xl font-semibold text-on-background">{stats.points.toLocaleString()}</span>
                      <span className="text-primary text-sm font-medium">pts earned</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-2">Total Reports</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-headline text-4xl font-semibold text-on-background">{stats.totalReports}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-body text-xs text-on-surface-variant uppercase tracking-wider mb-2">Resolved</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-headline text-4xl font-semibold text-[#4ADE80]">{stats.resolved}</span>
                      <span className="text-on-surface-variant text-sm font-medium">reports fixed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Stats Bento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel rounded-xl p-6 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/my-reports')}>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-headline text-sm font-medium text-on-background">My Reports</h3>
                    <span className="material-symbols-outlined text-primary text-sm">arrow_outward</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <span className="font-headline text-xl font-semibold">{stats.totalReports}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body text-sm text-on-background">Total Submitted</span>
                      <span className="font-body text-xs text-on-surface-variant mt-1">{stats.resolved} resolved · {stats.pending} pending</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-headline text-sm font-medium text-on-background">Pending Attention</h3>
                    <span className="material-symbols-outlined text-secondary text-sm">warning</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                      <span className="font-headline text-xl font-semibold">{stats.pending}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body text-sm text-on-background">Reports in review</span>
                      <span className="font-body text-xs text-on-surface-variant mt-1">Awaiting city official action</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Community Feed */}
            <div className="lg:col-span-1">
              <div className="glass-panel rounded-xl flex flex-col h-full max-h-[600px]">
                <div className="p-6 border-b border-outline-variant/10">
                  <h3 className="font-headline text-lg font-medium text-on-background tracking-tight">Community Feed</h3>
                  <p className="font-body text-xs text-on-surface-variant mt-1">Latest reports across the city</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                  {feed.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                      <span className="material-symbols-outlined text-4xl text-outline-variant/30">feed</span>
                      <p className="text-on-surface-variant text-sm">No reports yet in the city.</p>
                    </div>
                  ) : feed.map((r, i) => {
                    const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                    return (
                      <div key={r.id || i} className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/10 hover:border-primary/20 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${s.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                            {s.label}
                          </span>
                          <span className="text-xs text-on-surface-variant">{timeAgo(r.created_at)}</span>
                        </div>
                        <h4 className="font-headline text-sm font-medium text-on-background mb-1 group-hover:text-primary transition-colors">{r.damage_type || 'Unknown issue'}</h4>
                        <p className="font-body text-xs text-on-surface-variant line-clamp-1">{r.address || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-outline-variant/10">
                  <button onClick={() => navigate('/map')} className="w-full py-2 bg-transparent border border-outline-variant/30 text-on-surface-variant hover:text-primary hover:border-primary/50 rounded-lg text-sm font-medium transition-colors">
                    View on Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}