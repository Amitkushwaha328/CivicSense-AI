import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/auth';

const STATUS_CONFIG = {
  resolved:       { label: 'Resolved',    color: 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/20',   dot: 'bg-[#4ADE80]', icon: 'check_circle' },
  pending:        { label: 'Pending',      color: 'bg-secondary/10 text-secondary border-secondary/20',    dot: 'bg-secondary',  icon: 'schedule' },
  complaint_sent: { label: 'Sent to City', color: 'bg-primary/10 text-primary border-primary/20',          dot: 'bg-primary',    icon: 'send' },
  verified:       { label: 'Verified',     color: 'bg-tertiary/10 text-tertiary border-tertiary/20',       dot: 'bg-tertiary',   icon: 'verified' },
};

const SEVERITY_COLOR = {
  high:   'text-error',
  medium: 'text-secondary',
  low:    'text-tertiary',
};

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function MyReports() {
  const { user } = useAuth();
  const [reports, setReports]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [generating, setGen]    = useState(null); // report_id being processed
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = () => {
    setLoading(true);
    API.get('/reports/my')
      .then(res => setReports(Array.isArray(res.data) ? res.data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  const handleGenerateComplaint = async (id) => {
    setGen(id);
    try {
      const res = await API.post(`/complaints/generate/${id}`);
      showToast('Complaint generated and sent to municipality!');
      // Open PDF in new tab
      if (res.data?.pdf_url) window.open(res.data.pdf_url, '_blank');
      fetchReports(); // Refresh status
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to generate complaint.', 'error');
    } finally {
      setGen(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Withdraw this report? You will lose 10 points.')) return;
    setDeleting(id);
    try {
      await API.delete(`/reports/${id}`);
      showToast('Report withdrawn.');
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      showToast(err.response?.data?.detail || 'Cannot delete this report.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <main className="flex-1 pt-8 px-6 pb-24 lg:pb-8 max-w-7xl mx-auto w-full min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg border flex items-center gap-2 ${toast.type === 'error' ? 'bg-error/10 text-error border-error/30' : 'bg-tertiary/10 text-tertiary border-tertiary/30'}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          {toast.msg}
        </div>
      )}

      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-on-background font-semibold tracking-tight">My Reports</h1>
          <p className="font-body text-on-surface-variant text-sm mt-1">History of civic issues you've submitted to CivicSense AI.</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-high px-4 py-2 rounded-xl border border-outline-variant/20 text-sm">
          <span className="text-on-surface-variant">{reports.length} total</span>
          <span className="text-outline-variant/50">·</span>
          <span className="text-[#4ADE80]">{reports.filter(r => r.status === 'resolved').length} resolved</span>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] gap-4">
          <span className="material-symbols-outlined text-6xl text-outline-variant/30">history</span>
          <p className="font-headline text-lg text-on-surface font-semibold">No reports yet</p>
          <p className="text-on-surface-variant text-sm text-center max-w-sm">You haven't submitted any civic issues. Spot a problem in your city? Report it!</p>
          <a href="/upload" className="mt-4 bg-gradient-to-r from-primary to-secondary text-on-primary font-label font-semibold px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(192,193,255,0.2)] hover:opacity-90 transition-opacity">
            Submit Your First Report
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => {
            const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
            const sevColor = SEVERITY_COLOR[r.severity] || 'text-on-surface-variant';
            return (
              <div key={r.id} className="glass-panel rounded-xl p-5 flex flex-col md:flex-row gap-5 hover:border-primary/20 transition-colors">
                {/* Thumbnail */}
                {r.image_url && (
                  <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest">
                    <img src={r.image_url} alt={r.damage_type} className="w-full h-full object-cover" />
                  </div>
                )}
                {/* Info */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${s.color}`}>
                      <span className="material-symbols-outlined text-[12px]">{s.icon}</span>
                      {s.label}
                    </span>
                    <span className={`text-xs font-bold uppercase ${sevColor}`}>{r.severity} severity</span>
                    <span className="text-xs text-on-surface-variant ml-auto">{timeAgo(r.created_at)}</span>
                  </div>
                  <h3 className="font-headline text-base font-semibold text-on-background">{r.damage_type || 'Unknown Damage Type'}</h3>
                  <p className="text-on-surface-variant text-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {r.address || `${r.latitude?.toFixed(4)}, ${r.longitude?.toFixed(4)}`}
                  </p>
                  <p className="text-xs font-mono text-outline-variant/60">ID: {r.id}</p>
                </div>
                {/* Actions */}
                <div className="flex md:flex-col gap-2 items-start md:items-end justify-end shrink-0">
                  {r.status === 'pending' || r.status === 'verified' ? (
                    <button
                      onClick={() => handleGenerateComplaint(r.id)}
                      disabled={generating === r.id}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50"
                    >
                      {generating === r.id ? (
                        <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">send</span>
                      )}
                      {generating === r.id ? 'Sending...' : 'Send to City'}
                    </button>
                  ) : r.status === 'complaint_sent' ? (
                    <span className="text-xs text-on-surface-variant px-3 py-2 bg-surface-container-highest rounded-lg border border-outline-variant/20">Awaiting City Response</span>
                  ) : null}

                  {r.status !== 'resolved' && r.status !== 'complaint_sent' && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deleting === r.id}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-error/10 text-error border border-error/20 rounded-lg hover:bg-error hover:text-on-error transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}