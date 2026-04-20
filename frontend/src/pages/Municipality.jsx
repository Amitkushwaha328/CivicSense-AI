import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/auth';

const STATUS_CONFIG = {
  resolved:       { label: 'Resolved',      color: 'text-[#4ADE80] bg-[#4ADE80]/10 border-[#4ADE80]/20' },
  pending:        { label: 'Pending',        color: 'text-secondary bg-secondary/10 border-secondary/20' },
  complaint_sent: { label: 'Complaint Sent', color: 'text-primary bg-primary/10 border-primary/20' },
  verified:       { label: 'Verified',       color: 'text-tertiary bg-tertiary/10 border-tertiary/20' },
  rejected:       { label: 'Rejected',       color: 'text-error bg-error/10 border-error/20' },
};

const SEV_COLOR = {
  high:   { bar: 'bg-error',     text: 'text-error',     badge: 'text-error bg-error/10 border-error/20' },
  medium: { bar: 'bg-secondary', text: 'text-secondary', badge: 'text-secondary bg-secondary/10 border-secondary/20' },
  low:    { bar: 'bg-tertiary',  text: 'text-tertiary',  badge: 'text-tertiary bg-tertiary/10 border-tertiary/20' },
};

// ── Photo Lightbox ─────────────────────────────────────────────
function PhotoModal({ url, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!url) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">close</span> Close (Esc)
        </button>
        <img
          src={url}
          alt="Report Photo"
          className="w-full max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
        />
      </div>
    </div>
  );
}

// ── Action Modal (Resolve / Reject with Note) ───────────────────
const ACTION_CONFIG = {
  resolved:       { title: 'Resolve Report',  icon: 'task_alt',     color: 'text-[#4ADE80]', btnClass: 'bg-[#4ADE80] text-black hover:bg-[#4ADE80]/80',   label: 'Confirm Resolve' },
  rejected:       { title: 'Reject Report',   icon: 'cancel',       color: 'text-error',      btnClass: 'bg-error text-white hover:bg-error/80',             label: 'Confirm Reject'  },
  verified:       { title: 'Verify Report',   icon: 'verified',     color: 'text-tertiary',   btnClass: 'bg-tertiary text-on-primary hover:opacity-90',      label: 'Confirm Verify'  },
  complaint_sent: { title: 'Assign to City',  icon: 'send',         color: 'text-primary',    btnClass: 'bg-primary text-on-primary hover:opacity-90',       label: 'Confirm Assign'  },
};

function ActionModal({ report, action, onConfirm, onClose, loading }) {
  const [note, setNote] = React.useState('');
  const cfg = ACTION_CONFIG[action];
  if (!report || !cfg) return null;

  const needsNote = action === 'resolved' || action === 'rejected';

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1d27] rounded-2xl border border-outline-variant/20 p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`material-symbols-outlined text-[26px] ${cfg.color}`}>{cfg.icon}</span>
          <div>
            <h3 className="font-headline font-bold text-on-surface text-lg">{cfg.title}</h3>
            <p className="text-xs text-on-surface-variant">
              Report <span className="font-mono font-bold text-on-surface">#{report.id?.slice(-6).toUpperCase()}</span>
              {' · '}{report.damage_type || 'Unknown'}
            </p>
          </div>
        </div>

        {/* Report details strip */}
        <div className="bg-surface-container-low rounded-xl p-3 mb-4 flex items-center gap-3 border border-outline-variant/10">
          {report.image_url && (
            <img src={report.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-outline-variant/20" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-on-surface truncate">{report.address || 'No address'}</p>
            <p className="text-xs text-on-surface-variant capitalize">{report.severity} severity · {report.damage_type}</p>
          </div>
        </div>

        {/* Note field */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            {needsNote ? '📝 Official Note ' : '📝 Note (Optional)'}
            {action === 'rejected' && <span className="text-error">*</span>}
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={action === 'resolved'
              ? 'e.g. Road repaired by municipal team on Apr 20'
              : action === 'rejected'
              ? 'Reason for rejection (required)...'
              : 'Optional note for this action...'}
            rows={3}
            className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-outline/40 focus:outline-none focus:border-primary/50 resize-none"
          />
          {action === 'rejected' && !note.trim() && (
            <p className="text-xs text-error mt-1">A rejection reason is required.</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={loading || (action === 'rejected' && !note.trim())}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 ${cfg.btnClass}`}
          >
            {loading && <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
            {loading ? 'Saving...' : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete Modal ────────────────────────────────────────
function DeleteModal({ report, onConfirm, onClose, loading }) {
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-2xl border border-error/30 p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-error text-[28px]">delete_forever</span>
          <h3 className="font-headline font-bold text-on-surface text-lg">Delete Report?</h3>
        </div>
        <p className="text-on-surface-variant text-sm mb-2">
          This will permanently delete report <span className="font-mono text-on-surface font-bold">#{report.id?.slice(-6).toUpperCase()}</span>.
        </p>
        <p className="text-xs text-on-surface-variant mb-6">📍 {report.address || 'Unknown location'} · {report.damage_type}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-error text-white font-bold text-sm hover:bg-error/80 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {loading ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Municipality() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [updating, setUpdating]         = useState(null);
  const [toast, setToast]               = useState(null);
  const [photoUrl, setPhotoUrl]         = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch]             = useState('');
  const [actionModal, setActionModal]   = useState(null); // { report, action }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = useCallback(() => {
    setLoading(true);
    API.get('/reports/all?limit=100')
      .then(res => {
        const items = res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
        const order = { high: 0, medium: 1, low: 2 };
        items.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
        setReports(items);
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleStatusUpdate = async (id, newStatus, note = '') => {
    setUpdating(id);
    try {
      await API.patch(`/reports/${id}/status`, { status: newStatus, note });
      showToast(`Status updated to "${newStatus}".`);
      setActionModal(null);
      fetchReports();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Update failed.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  const openAction = (report, action) => setActionModal({ report, action });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await API.delete(`/reports/${deleteTarget.id}`);
      showToast('Report deleted successfully.');
      setDeleteTarget(null);
      fetchReports();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered & searched reports
  const displayedReports = reports.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.address?.toLowerCase().includes(q) ||
      r.damage_type?.toLowerCase().includes(q) ||
      r.id?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const stats = {
    total:    reports.length,
    pending:  reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    high:     reports.filter(r => r.severity === 'high' && r.status !== 'resolved').length,
  };

  return (
    <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-10 min-h-screen w-full max-w-7xl mx-auto">

      {/* Photo Modal */}
      <PhotoModal url={photoUrl} onClose={() => setPhotoUrl(null)} />

      {/* Action Modal (resolve / reject / etc with note) */}
      <ActionModal
        report={actionModal?.report}
        action={actionModal?.action}
        onConfirm={(note) => handleStatusUpdate(actionModal.report.id, actionModal.action, note)}
        onClose={() => setActionModal(null)}
        loading={updating === actionModal?.report?.id}
      />

      {/* Delete Modal */}
      <DeleteModal
        report={deleteTarget}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border flex items-center gap-2 transition-all ${
          toast.type === 'error'
            ? 'bg-error/10 text-error border-error/30'
            : 'bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-headline font-bold text-2xl lg:text-3xl text-on-surface tracking-tight mb-1">
            Municipal Command View
          </h2>
          <p className="text-on-surface-variant text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">shield</span>
            Access Level: {user?.role === 'admin' ? '⚡ Admin Override' : '🏛️ Sentinel-1'} · {user?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchReports}
            className="p-2 rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high transition"
            title="Refresh"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
          </button>
          <button
            onClick={() => window.open('http://127.0.0.1:8000/admin/export/csv', '_blank')}
            className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-xl text-sm font-medium border border-outline-variant/20 hover:bg-surface-variant transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export CSV
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Reports', value: stats.total,    icon: 'assignment',  color: 'text-primary' },
          { label: 'Pending',       value: stats.pending,  icon: 'schedule',    color: 'text-secondary' },
          { label: 'Resolved',      value: stats.resolved, icon: 'task_alt',    color: 'text-[#4ADE80]' },
          { label: 'High Severity', value: stats.high,     icon: 'warning',     color: 'text-error' },
        ].map(c => (
          <div key={c.label} className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/15 flex flex-col gap-2">
            <span className={`material-symbols-outlined ${c.color} text-[22px]`}>{c.icon}</span>
            <p className={`font-headline font-bold text-2xl ${c.color}`}>{c.value}</p>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            type="text"
            placeholder="Search by address, type, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'complaint_sent', label: 'Sent' },
            { key: 'verified', label: 'Verified' },
            { key: 'resolved', label: 'Resolved' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                filterStatus === f.key
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Count */}
      <p className="text-xs text-on-surface-variant mb-3">
        Showing <span className="text-on-surface font-semibold">{displayedReports.length}</span> of {reports.length} reports
      </p>

      {/* Main Table */}
      <div className="bg-surface-container/50 backdrop-blur-md rounded-2xl border border-outline-variant/15 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayedReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3">
            <span className="material-symbols-outlined text-5xl text-outline-variant/30">search_off</span>
            <p className="text-on-surface-variant text-sm">No reports match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low/80 text-on-surface-variant text-xs uppercase tracking-wider border-b border-outline-variant/15">
                <tr>
                  <th className="px-4 py-3 w-16">Photo</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {displayedReports.map(r => {
                  const sev = SEV_COLOR[r.severity] || SEV_COLOR.low;
                  const st  = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : '—';
                  return (
                    <tr key={r.id} className="hover:bg-surface-container-low/60 transition-colors group">

                      {/* Photo thumb */}
                      <td className="px-4 py-3">
                        {r.image_url ? (
                          <button
                            onClick={() => setPhotoUrl(r.image_url)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-outline-variant/20 hover:border-primary/50 transition flex-shrink-0"
                            title="View photo"
                          >
                            <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-outline text-[16px]">image_not_supported</span>
                          </div>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-on-surface-variant">#{r.id?.slice(-6).toUpperCase()}</span>
                        <p className="text-on-surface text-xs mt-0.5 max-w-[160px] truncate" title={r.address}>
                          {r.address || `${r.latitude?.toFixed(3)}, ${r.longitude?.toFixed(3)}`}
                        </p>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="bg-surface-container-highest px-2 py-1 rounded-md text-xs text-on-surface">
                          {r.damage_type || 'Unknown'}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border capitalize ${sev.badge}`}>
                          {r.severity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${st.color}`}>
                          {st.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{date}</td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === 'pending' && (
                            <button
                              onClick={() => openAction(r, 'verified')}
                              className="text-xs px-2 py-1 rounded-lg bg-tertiary/10 text-tertiary border border-tertiary/20 hover:bg-tertiary hover:text-on-primary transition"
                            >Verify</button>
                          )}
                          {(r.status === 'pending' || r.status === 'verified') && (
                            <button
                              onClick={() => openAction(r, 'complaint_sent')}
                              className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-on-primary transition"
                            >Assign</button>
                          )}
                          {r.status !== 'resolved' && r.status !== 'rejected' && (
                            <button
                              onClick={() => openAction(r, 'resolved')}
                              className="text-xs px-2 py-1 rounded-lg bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20 hover:bg-[#4ADE80] hover:text-black transition"
                            >✓ Resolve</button>
                          )}
                          {r.status !== 'rejected' && r.status !== 'resolved' && (
                            <button
                              onClick={() => openAction(r, 'rejected')}
                              className="text-xs px-2 py-1 rounded-lg bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition"
                            >✗ Reject</button>
                          )}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="text-xs px-2 py-1 rounded-lg bg-surface-container-highest text-on-surface-variant border border-outline-variant/20 hover:bg-error hover:text-white hover:border-error transition"
                              title="Delete report"
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Hotspot quick-link */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => navigate('/map')}
          className="flex items-center gap-2 text-primary hover:text-secondary text-sm font-medium transition"
        >
          <span className="material-symbols-outlined text-[18px]">map</span>
          View Live Map
        </button>
      </div>
    </main>
  );
}