import React, { useEffect, useState, useCallback } from "react";
import API from "../api/auth";

const TABS = ["Overview", "SLA Tracking", "All Reports", "User Management"];

// ── Photo Lightbox ──────────────────────────────────────────────
function PhotoModal({ url, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">close</span> Close (Esc)
        </button>
        <img src={url} alt="Report" className="w-full max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl" />
      </div>
    </div>
  );
}

// ── Delete Modal ─────────────────────────────────────────────────
function DeleteModal({ report, onConfirm, onClose, loading }) {
  if (!report) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-2xl border border-error/30 p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-3">
          <span className="material-symbols-outlined text-error text-[28px]">delete_forever</span>
          <h3 className="font-headline font-bold text-on-surface text-lg">Delete Report?</h3>
        </div>
        <p className="text-on-surface-variant text-sm mb-1">Report <span className="font-mono font-bold text-on-surface">#{report.id?.slice(-6).toUpperCase()}</span> will be permanently deleted.</p>
        <p className="text-xs text-on-surface-variant mb-6">📍 {report.address || 'Unknown'} · {report.damage_type}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-outline-variant/20 text-on-surface-variant text-sm hover:bg-surface-container-high transition">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2 rounded-xl bg-error text-white font-bold text-sm hover:bg-error/80 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action Modal (with note for resolve/reject) ─────────────────
const ACTION_CONFIG = {
  resolved:       { title: 'Resolve Report',  icon: 'task_alt',  color: 'text-[#4ADE80]', btnClass: 'bg-[#4ADE80] text-black hover:bg-[#4ADE80]/80',  label: 'Confirm Resolve' },
  rejected:       { title: 'Reject Report',   icon: 'cancel',    color: 'text-error',      btnClass: 'bg-error text-white hover:bg-error/80',            label: 'Confirm Reject'  },
  verified:       { title: 'Verify Report',   icon: 'verified',  color: 'text-tertiary',   btnClass: 'bg-tertiary text-on-primary hover:opacity-90',     label: 'Confirm Verify'  },
  complaint_sent: { title: 'Assign to City',  icon: 'send',      color: 'text-primary',    btnClass: 'bg-primary text-on-primary hover:opacity-90',      label: 'Confirm Assign'  },
};

function ActionModal({ report, action, onConfirm, onClose, loading }) {
  const [note, setNote] = React.useState('');
  const cfg = ACTION_CONFIG[action];
  if (!report || !cfg) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1a1d27] rounded-2xl border border-outline-variant/20 p-6 max-w-md w-full shadow-2xl">
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
        <div className="bg-surface-container-low rounded-xl p-3 mb-4 flex items-center gap-3 border border-outline-variant/10">
          {report.image_url && (
            <img src={report.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-outline-variant/20" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-on-surface truncate">{report.address || 'No address'}</p>
            <p className="text-xs text-on-surface-variant capitalize">{report.severity} severity · {report.damage_type}</p>
          </div>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            {action === 'resolved' || action === 'rejected' ? '📝 Official Note' : '📝 Note (Optional)'}
            {action === 'rejected' && <span className="text-error ml-1">*</span>}
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
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high text-sm font-medium transition">Cancel</button>
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

function KpiCard({ icon, label, value, sub, color = "text-primary" }) {

  return (
    <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/15 shadow flex flex-col gap-3 relative overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-surface-container-high rounded-lg border border-outline-variant/15">
          <span className={`material-symbols-outlined ${color} text-[20px]`}>{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
        <p className="font-outfit text-3xl font-bold text-on-surface">{value ?? "—"}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function Admin() {
  const [tab,          setTab]          = useState("Overview");
  const [stats,        setStats]        = useState(null);
  const [zones,        setZones]        = useState([]);
  const [sla,          setSla]          = useState(null);
  const [reports,      setReports]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [updating,     setUpdating]     = useState(null);
  const [toast,        setToast]        = useState(null);
  const [photoUrl,     setPhotoUrl]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionModal,  setActionModal]  = useState(null); // { report, action }
  const [newUser,      setNewUser]      = useState({ name: '', email: '', password: '', role: 'municipality' });
  const [creatingUser, setCreatingUser] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOverview = useCallback(() => {
    setLoading(true);
    Promise.all([
      API.get("/admin/stats").catch(() => ({ data: null })),
      API.get("/admin/worst-zones").catch(() => ({ data: [] })),
    ]).then(([s, wz]) => {
      setStats(s.data);
      setZones(Array.isArray(wz.data) ? wz.data : []);
    }).finally(() => setLoading(false));
  }, []);

  const fetchSLA = useCallback(() => {
    setLoading(true);
    API.get("/admin/sla-tracking")
      .then(r => setSla(r.data))
      .catch(() => setSla(null))
      .finally(() => setLoading(false));
  }, []);

  const fetchReports = useCallback(() => {
    setLoading(true);
    API.get("/reports/all?limit=100")
      .then(r => {
        const items = r.data?.items ?? (Array.isArray(r.data) ? r.data : []);
        setReports(items);
      }).catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "Overview")    fetchOverview();
    if (tab === "SLA Tracking") fetchSLA();
    if (tab === "All Reports") fetchReports();
  }, [tab, fetchOverview, fetchSLA, fetchReports]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await API.post("/admin/users", newUser);
      showToast(`User ${newUser.email} created successfully!`);
      setNewUser({ name: '', email: '', password: '', role: 'municipality' });
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to create user", "error");
    } finally {
      setCreatingUser(false);
    }
  };

  const updateStatus = async (id, status, note = '') => {
    setUpdating(id);
    try {
      await API.patch(`/reports/${id}/status`, { status, note });
      showToast(`Status → ${status}`);
      setActionModal(null);
      fetchReports();
    } catch (e) {
      showToast(e.response?.data?.detail || "Update failed", "error");
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
      showToast('Report deleted.');
      setDeleteTarget(null);
      fetchReports();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Delete failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || r.address?.toLowerCase().includes(q) || r.damage_type?.toLowerCase().includes(q) || r.id?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const zoneStyle = (idx) => {
    if (idx === 0) return { dot: "bg-error",     text: "text-error" };
    if (idx === 1) return { dot: "bg-secondary",  text: "text-secondary" };
    return              { dot: "bg-primary",     text: "text-primary" };
  };

  const severityClass = (s) =>
    s === "high" ? "text-error bg-error/10 border-error/20" :
    s === "medium" ? "text-secondary bg-secondary/10 border-secondary/20" :
    "text-primary bg-primary/10 border-primary/20";

  const statusClass = (s) =>
    s === "resolved"       ? "text-[#4ADE80] bg-[#4ADE80]/10 border-[#4ADE80]/20" :
    s === "complaint_sent" ? "text-primary bg-primary/10 border-primary/20" :
    s === "verified"       ? "text-tertiary bg-tertiary/10 border-tertiary/20" :
    s === "rejected"       ? "text-error bg-error/10 border-error/20" :
                             "text-secondary bg-secondary/10 border-secondary/20";

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8 pb-24 lg:pb-10 min-h-screen">

      <PhotoModal url={photoUrl} onClose={() => setPhotoUrl(null)} />
      <DeleteModal report={deleteTarget} onConfirm={handleDelete} onClose={() => setDeleteTarget(null)} loading={deleting} />
      <ActionModal
        report={actionModal?.report}
        action={actionModal?.action}
        onConfirm={(note) => updateStatus(actionModal.report.id, actionModal.action, note)}
        onClose={() => setActionModal(null)}
        loading={updating === actionModal?.report?.id}
      />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl border flex items-center gap-2 ${toast.type === "error" ? "bg-error/10 text-error border-error/30" : "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30"}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === "error" ? "error" : "check_circle"}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="font-outfit text-2xl lg:text-3xl font-bold text-on-surface tracking-tight">Admin Command Centre</h2>
          <p className="text-on-surface-variant text-sm mt-1">Full system analytics, SLA monitoring, and report management</p>
        </div>
        <button
          onClick={() => window.open("http://127.0.0.1:8000/admin/export/csv", "_blank")}
          className="px-4 py-2 text-sm font-bold bg-primary text-on-primary rounded-lg hover:opacity-90 transition flex items-center gap-2 shadow"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/15 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-primary text-on-primary shadow" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (

        /* ── OVERVIEW TAB ── */
        tab === "Overview" ? (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard icon="assignment"     label="Total Reports"    value={stats?.total_reports?.toLocaleString()} color="text-primary" />
              <KpiCard icon="group"          label="Total Users"      value={stats?.total_users?.toLocaleString()} color="text-secondary" />
              <KpiCard icon="check_circle"   label="Resolution Rate"  value={`${stats?.resolution_rate ?? 0}%`} color="text-[#4ADE80]" />
              <KpiCard icon="pending"        label="Pending Reports"  value={stats?.pending?.toLocaleString()} color="text-error" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard icon="task_alt"       label="Resolved"         value={stats?.resolved?.toLocaleString()} color="text-[#4ADE80]" />
              <KpiCard icon="send"           label="Complaint Sent"   value={stats?.complaint_sent?.toLocaleString()} color="text-tertiary" />
              <KpiCard icon="description"    label="Total Complaints" value={stats?.total_complaints?.toLocaleString()} color="text-secondary" />
              <KpiCard icon="analytics"      label="Active Issues"    value={((stats?.total_reports ?? 0) - (stats?.resolved ?? 0)).toLocaleString()} color="text-primary" />
            </div>

            {/* Category breakdown */}
            {stats?.categories?.length > 0 && (
              <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15 mb-6">
                <h3 className="font-outfit font-bold text-on-surface mb-4">Report Categories</h3>
                <div className="flex flex-col gap-3">
                  {stats.categories.sort((a,b)=>b.count-a.count).map(c => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-sm text-on-surface-variant w-44 truncate">{c.name}</span>
                      <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.round(c.count / (stats?.total_reports || 1) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-on-surface w-8 text-right">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worst Zones Table */}
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 overflow-hidden">
              <div className="p-5 border-b border-outline-variant/15">
                <h3 className="font-outfit font-bold text-on-surface">High-Risk Zones</h3>
                <p className="text-xs text-on-surface-variant mt-1">AI-scored zones requiring immediate attention</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase text-on-surface-variant border-b border-outline-variant/10 bg-surface-container-highest/40">
                      <th className="p-4 font-medium">Zone</th>
                      <th className="p-4 font-medium">Top Issue</th>
                      <th className="p-4 font-medium">Reports</th>
                      <th className="p-4 font-medium">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/10">
                    {zones.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-on-surface-variant">No zone data yet.</td></tr>
                    )}
                    {zones.map((z, i) => {
                      const s = zoneStyle(i);
                      return (
                        <tr key={i} className="hover:bg-surface-container-high/30 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                              <span className="font-medium text-on-surface">{z.zone_label || `${z.lat?.toFixed(3)}, ${z.lng?.toFixed(3)}`}</span>
                            </div>
                          </td>
                          <td className="p-4 text-on-surface-variant">{z.top_issue}</td>
                          <td className="p-4 font-medium text-on-surface">{z.report_count}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                                <div className={`h-full ${s.dot}`} style={{ width: `${z.risk_score}%` }} />
                              </div>
                              <span className={`text-xs font-bold ${s.text}`}>{z.risk_score}/100</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>

        /* ── SLA TRACKING TAB ── */
        ) : tab === "SLA Tracking" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <KpiCard icon="schedule"      label="Total Overdue (>5 days)" value={sla?.total_overdue ?? 0} color="text-error" />
              <KpiCard icon="priority_high" label="Critical Overdue (High)" value={sla?.critical_overdue_count ?? 0} color="text-error" />
            </div>
            <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 overflow-hidden">
              <div className="p-5 border-b border-outline-variant/15 flex justify-between items-center">
                <h3 className="font-outfit font-bold text-on-surface">Overdue Reports</h3>
                <button onClick={fetchSLA} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase text-on-surface-variant border-b border-outline-variant/10 bg-surface-container-highest/40">
                      <th className="p-4 font-medium">Address / Location</th>
                      <th className="p-4 font-medium">Issue Type</th>
                      <th className="p-4 font-medium">Severity</th>
                      <th className="p-4 font-medium">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/10">
                    {(!sla?.overdue_reports?.length) && (
                      <tr><td colSpan={4} className="p-6 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-3xl text-[#4ADE80] block mb-2">check_circle</span>
                        No overdue reports — all within SLA!
                      </td></tr>
                    )}
                    {sla?.overdue_reports?.map(r => (
                      <tr key={r.id} className="hover:bg-surface-container-high/30 transition-colors">
                        <td className="p-4 text-on-surface max-w-[200px] truncate">{r.address || r.id?.slice(0,8)}</td>
                        <td className="p-4 text-on-surface-variant">{r.damage_type || "—"}</td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border capitalize ${severityClass(r.severity)}`}>{r.severity}</span>
                        </td>
                        <td className="p-4">
                          <span className={`font-bold text-sm ${r.days_overdue > 14 ? "text-error" : "text-secondary"}`}>{r.days_overdue}d</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>

        /* ── ALL REPORTS TAB ── */
        ) : tab === "All Reports" ? (
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="p-5 border-b border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-outfit font-bold text-on-surface">All Reports</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">{filteredReports.length} of {reports.length} reports</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {/* Search */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">search</span>
                  <input
                    type="text" placeholder="Search..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="bg-surface-container border border-outline-variant/20 rounded-lg pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder:text-outline/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
                {/* Filter */}
                <select
                  value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="bg-surface-container border border-outline-variant/20 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="complaint_sent">Complaint Sent</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={fetchReports} className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase text-on-surface-variant border-b border-outline-variant/10 bg-surface-container-highest/40">
                    <th className="p-4 font-medium w-14">Photo</th>
                    <th className="p-4 font-medium">Address</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 font-medium">Severity</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-outline-variant/10">
                  {filteredReports.length === 0 && (
                    <tr><td colSpan={6} className="p-6 text-center text-on-surface-variant">No reports match your filters.</td></tr>
                  )}
                  {filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-surface-container-high/30 transition-colors group">
                      <td className="p-4">
                        {r.image_url ? (
                          <button onClick={() => setPhotoUrl(r.image_url)} className="w-10 h-10 rounded-lg overflow-hidden border border-outline-variant/20 hover:border-primary/50 transition">
                            <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-container-high border border-outline-variant/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-outline text-[14px]">image_not_supported</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-on-surface max-w-[160px] truncate" title={r.address}>{r.address || r.id?.slice(0,8)}</td>
                      <td className="p-4 text-on-surface-variant">{r.damage_type || "—"}</td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border capitalize ${severityClass(r.severity)}`}>{r.severity}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border capitalize ${statusClass(r.status)}`}>{r.status?.replace("_"," ")}</span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {r.status !== "verified" && r.status !== "rejected" && (
                            <button onClick={() => openAction(r, "verified")}
                              className="text-xs px-2 py-1 rounded bg-tertiary/10 text-tertiary border border-tertiary/20 hover:bg-tertiary hover:text-on-primary transition-all"
                            >Verify</button>
                          )}
                          {r.status !== "complaint_sent" && r.status !== "rejected" && (
                            <button onClick={() => openAction(r, "complaint_sent")}
                              className="text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-on-primary transition-all"
                            >Assign</button>
                          )}
                          {r.status !== "resolved" && r.status !== "rejected" && (
                            <button onClick={() => openAction(r, "resolved")}
                              className="text-xs px-2 py-1 rounded bg-[#4ADE80]/10 text-[#4ADE80] border border-[#4ADE80]/20 hover:bg-[#4ADE80] hover:text-[#10131a] transition-all"
                            >Resolve</button>
                          )}
                          {r.status !== "rejected" && r.status !== "resolved" && (
                            <button onClick={() => openAction(r, "rejected")}
                              className="text-xs px-2 py-1 rounded bg-error/10 text-error border border-error/20 hover:bg-error hover:text-white transition-all"
                            >✗ Reject</button>
                          )}
                          <button onClick={() => setDeleteTarget(r)}
                            className="text-xs px-2 py-1 rounded bg-surface-container-highest text-on-surface-variant border border-outline-variant/20 hover:bg-error/10 hover:text-error hover:border-error/30 transition-all"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── USER MANAGEMENT TAB ── */
          <div className="bg-surface-container-low rounded-2xl border border-outline-variant/15 p-8 max-w-2xl mx-auto shadow-xl">
             <div className="mb-8">
               <h3 className="font-outfit text-xl font-bold text-on-surface">Create Official Account</h3>
               <p className="text-on-surface-variant text-sm mt-1">Assign a new Admin or Municipal Official ID and secure pass.</p>
             </div>
             
             <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Full Name</label>
                    <input 
                      type="text" required
                      value={newUser.name}
                      onChange={e => setNewUser({...newUser, name: e.target.value})}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary transition"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Role Type</label>
                    <select 
                      value={newUser.role} 
                      onChange={e => setNewUser({...newUser, role: e.target.value})}
                      className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary transition"
                    >
                      <option value="municipality">Municipality Official</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Comm Link (Email)</label>
                  <input 
                    type="email" required
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary transition"
                    placeholder="official@civicsense.ai"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Security Pass (Password)</label>
                  <input 
                    type="password" required minLength={6}
                    value={newUser.password}
                    onChange={e => setNewUser({...newUser, password: e.target.value})}
                    className="w-full bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:border-primary transition"
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={creatingUser}
                    className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                  >
                    {creatingUser ? (
                      <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">verified_user</span>
                        Generate Official Identity
                      </>
                    )}
                  </button>
                </div>
             </form>
          </div>
        )
      )}
    </main>
  );
}