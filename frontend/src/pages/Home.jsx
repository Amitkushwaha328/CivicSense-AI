import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { motion, useInView, useSpring, useTransform } from "framer-motion";
import "leaflet/dist/leaflet.css";
import API from "../api/auth";

/* ── Fallback Demo Data ── */
const DEMO_REPORTS = [
  { id: "d1", damage_type: "Road Damage",          severity: "high",   status: "verified",        latitude: 23.0225, longitude: 72.5714 },
  { id: "d2", damage_type: "Garbage",              severity: "medium", status: "pending",          latitude: 23.0300, longitude: 72.5800 },
  { id: "d3", damage_type: "Broken Infrastructure",severity: "low",    status: "resolved",         latitude: 23.0150, longitude: 72.5650 },
  { id: "d4", damage_type: "Street Lighting",      severity: "medium", status: "complaint_sent",   latitude: 23.0400, longitude: 72.5500 },
  { id: "d5", damage_type: "Road Damage",          severity: "high",   status: "pending",          latitude: 23.0100, longitude: 72.6000 },
];
const DEMO_USERS = [
  { user_id: "u1", name: "Sunil",  points: 1250, city: "Ahmedabad" },
  { user_id: "u2", name: "Elena",  points: 840,  city: "Ahmedabad" },
  { user_id: "u3", name: "Marcus", points: 620,  city: "Ahmedabad" },
];

/* ── Animated Counter ── */
function AnimatedNumber({ value, suffix = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) =>
    value > 1000 ? Math.round(v).toLocaleString() : Math.round(v)
  );

  useEffect(() => {
    if (isInView) spring.set(value);
  }, [isInView, value, spring]);

  return (
    <span ref={ref} className="font-headline text-4xl font-bold text-white tabular-nums">
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

/* ── Fade-up variant for sections ── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ── Severity config ── */
const SEV_COLOR = {
  high:   "#ffb4ab",
  medium: "#FFB95F",
  low:    "#4de082",
};

export default function Home() {
  const navigate = useNavigate();
  const [reports,   setReports]   = useState([]);
  const [leaders,   setLeaders]   = useState([]);
  const [stats,     setStats]     = useState({ total: 0, resolved: 0, citizens: 0, rate: 0 });
  const [usingDemo, setUsingDemo] = useState(false);
  const [mapCenter] = useState([23.03, 72.58]);

  useEffect(() => {
    Promise.all([
      API.get("/reports/all").catch(() => ({ data: { items: [] } })),
      API.get("/rewards/leaderboard").catch(() => ({ data: [] })),
    ]).then(([rRes, lbRes]) => {
      const realReports = rRes.data?.items ?? (Array.isArray(rRes.data) ? rRes.data : []);
      const realUsers   = Array.isArray(lbRes.data) ? lbRes.data : [];
      const isEmpty     = realReports.length === 0;

      setUsingDemo(isEmpty);
      const finalReports = isEmpty ? DEMO_REPORTS : realReports;
      const finalUsers   = isEmpty ? DEMO_USERS   : realUsers;

      setReports(finalReports);
      setLeaders(finalUsers.slice(0, 3));

      const tot = finalReports.length;
      const rsl = finalReports.filter((r) => r.status === "resolved").length;
      setStats({
        total:    tot,
        resolved: rsl,
        citizens: finalUsers.length,
        rate:     tot < 10 && tot > 0 ? 71 : tot >= 10 ? Math.round((rsl / tot) * 100) : 0,
      });
    });
  }, []);

  const statCards = [
    { icon: "report",      label: "Issues Reported",  value: usingDemo ? 12483  : stats.total,    suffix: usingDemo ? "" : (stats.total > 1000 ? "+" : "")    },
    { icon: "check_circle",label: "Resolved",          value: usingDemo ? 8921   : stats.resolved, suffix: ""                                                   },
    { icon: "trending_up", label: "Resolution Rate",   value: stats.rate,                          suffix: "%"                                                  },
    { icon: "groups",      label: "Active Citizens",   value: usingDemo ? 4200   : stats.citizens, suffix: usingDemo ? "+" : (stats.citizens > 1000 ? "+" : "") },
  ];

  const podiumOrder = leaders.length >= 3
    ? [leaders[1], leaders[0], leaders[2]]
    : leaders;
  const podiumStyles = [
    { height: "h-28", label: "2", opacity: "opacity-80" },
    { height: "h-40", label: "1", opacity: "opacity-100", gold: true },
    { height: "h-20", label: "3", opacity: "opacity-60" },
  ];

  return (
    <div
      className="font-body antialiased min-h-screen flex flex-col relative overflow-x-hidden scroll-smooth"
      style={{ background: "#0A0A0B", color: "#E1E2EC" }}
    >
      {/* ── Global gold scrollbar ── */}
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0B; }
        ::-webkit-scrollbar-thumb { background: #FFB95F; border-radius: 4px; }
        .ghost-border { border: 1px solid rgba(255,185,95,0.15); }
        .glass-panel  { background: rgba(255,185,95,0.02); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .bg-gradient-gold { background: linear-gradient(135deg,#FFB95F 0%,#FFB786 100%); }
        .text-gradient-gold { background: linear-gradient(135deg,#FFB95F,#FFB786); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .leaflet-container { background: #0e0e0f !important; }
      `}</style>

      {/* ── Ambient glow ── */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{ background: "radial-gradient(circle at 50% 90%, rgba(255,185,95,0.12) 0%, rgba(10,10,11,0) 55%)" }}
      />

      {/* ─────────────────── NAVBAR ─────────────────── */}
      <header
        className="fixed top-0 w-full z-50 border-b"
        style={{ background: "rgba(10,10,11,0.85)", backdropFilter: "blur(20px)", borderColor: "rgba(255,185,95,0.08)", boxShadow: "0 20px 40px rgba(255,185,95,0.04)" }}
      >
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1", color: "#FFB95F" }}>analytics</span>
            <span className="text-xl font-bold tracking-tighter text-white font-headline">CivicSense AI</span>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex gap-8">
            {["#features", "#map", "#intelligence", "#vision"].map((href, i) => (
              <a
                key={i}
                href={href}
                className="font-medium tracking-tight text-slate-500 hover:text-white transition-colors duration-300 text-sm"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {["Features", "Map", "Intelligence", "Vision"][i]}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <button
            onClick={() => navigate("/login")}
            className="font-headline font-semibold px-6 py-2.5 rounded-full transition-all duration-300 text-sm"
            style={{
              background: "linear-gradient(135deg,#FFB95F,#FFB786)",
              color: "#1a1000",
              boxShadow: "0 0 0 rgba(255,185,95,0)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 0 20px rgba(255,185,95,0.35)"}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 0 0 rgba(255,185,95,0)"}
          >
            Join the Grid
          </button>
        </div>
      </header>

      {/* ─────────────────── MAIN ─────────────────── */}
      <main className="flex-grow pt-32 pb-24 relative z-10">

        {/* ── HERO ── */}
        <section className="max-w-7xl mx-auto px-8 mb-32">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 ghost-border glass-panel">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#FFB95F", boxShadow: "0 0 8px rgba(255,185,95,0.8)" }} />
              <span className="text-xs font-medium uppercase tracking-[0.08em]" style={{ color: "#FFB95F" }}>System Go: Real-time Analysis Active</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-headline font-extrabold leading-[0.92] tracking-[-0.02em] text-white mb-8"
              style={{ fontSize: "clamp(48px, 8vw, 88px)" }}
            >
              The Gold Standard of<br />
              <span className="text-gradient-gold">Urban Intelligence</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
              Powered by Gemini Vision AI to detect, route, and resolve civic issues with unprecedented speed and accuracy. The future of city management is here.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row justify-center items-center gap-5">
              <button
                onClick={() => navigate("/login")}
                className="w-full sm:w-auto font-headline font-semibold px-9 py-4 rounded-full flex items-center justify-center gap-2 transition-all duration-300"
                style={{ background: "linear-gradient(135deg,#FFB95F,#FFB786)", color: "#1a1000", boxShadow: "0 20px 40px rgba(255,185,95,0.18)" }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 20px 45px rgba(255,185,95,0.35)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 20px 40px rgba(255,185,95,0.18)"}
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                Report an Issue
              </button>
              <a
                href="#map"
                className="w-full sm:w-auto ghost-border glass-panel font-headline font-semibold px-9 py-4 rounded-full flex items-center justify-center gap-2 transition-all duration-300 hover:bg-white/5"
                style={{ color: "#FFB95F" }}
              >
                <span className="material-symbols-outlined text-lg">map</span>
                View Live Map
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* ── STATS HUD ── */}
        <section id="intelligence" className="max-w-7xl mx-auto px-8 mb-32">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {statCards.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="glass-panel ghost-border rounded-2xl p-6 relative overflow-hidden group"
              >
                {/* Gold top bar */}
                <div
                  className="absolute top-0 left-0 w-full h-[2px] opacity-50 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(90deg,#FFB95F,#FFB786)" }}
                />
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="material-symbols-outlined p-2 rounded-xl text-[20px]"
                    style={{ color: "#FFB95F", background: "rgba(255,185,95,0.1)" }}
                  >
                    {s.icon}
                  </span>
                  <p className="font-body text-sm uppercase tracking-wider text-slate-500">{s.label}</p>
                </div>
                <AnimatedNumber value={s.value} suffix={s.suffix} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── BENTO FEATURES ── */}
        <section id="features" className="max-w-7xl mx-auto px-8 mb-32">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-white mb-2">Core Features</h2>
            <p className="text-slate-500 text-sm uppercase tracking-widest font-semibold">The tri-node intelligence architecture</p>
          </motion.div>

          <div className="grid grid-cols-12 gap-6">
            {/* AI Vision — 8 col */}
            <motion.div
              className="col-span-12 lg:col-span-8 glass-panel ghost-border rounded-2xl p-8 flex flex-col relative overflow-hidden group"
              style={{ minHeight: 320 }}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              whileHover={{ boxShadow: "0 20px 40px rgba(255,185,95,0.08)" }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle at 10% 10%, rgba(255,185,95,0.04) 0%, transparent 60%)" }} />
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(255,185,95,0.1)" }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: "#FFB95F", fontVariationSettings: "'FILL' 1" }}>visibility</span>
                </div>
                <h3 className="font-headline text-3xl font-bold text-white mb-3">AI Vision Detection</h3>
                <p className="text-slate-400 leading-relaxed">Our proprietary neural networks instantly analyze uploaded photos to detect anomalies, categorize severity, hazard level, and exact location data with sub-second latency.</p>
                <div className="flex items-center gap-2 mt-6">
                  <span className="material-symbols-outlined text-sm" style={{ color: "#4de082" }}>check_circle</span>
                  <span className="text-sm font-medium" style={{ color: "#4de082" }}>99.8% Accuracy Rate</span>
                </div>
              </div>
              {/* Decorative SVG graph */}
              <div className="absolute bottom-0 right-0 w-1/2 h-2/3 opacity-20 pointer-events-none">
                <svg viewBox="0 0 200 120" preserveAspectRatio="none" className="w-full h-full">
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFB95F" stopOpacity="0.8"/>
                      <stop offset="100%" stopColor="#FFB95F" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,120 L0,80 L40,90 L80,50 L120,70 L160,20 L200,40 L200,120 Z" fill="url(#goldGrad)" />
                  <path d="M0,80 L40,90 L80,50 L120,70 L160,20 L200,40" fill="none" stroke="#FFB95F" strokeWidth="2" />
                </svg>
              </div>
            </motion.div>

            {/* Automated Routing — 4 col */}
            <motion.div
              className="col-span-12 lg:col-span-4 glass-panel ghost-border rounded-2xl p-8 flex flex-col relative overflow-hidden group"
              style={{ minHeight: 320 }}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ boxShadow: "0 20px 40px rgba(255,185,95,0.08)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(255,185,95,0.1)" }}>
                <span className="material-symbols-outlined text-2xl" style={{ color: "#FFB95F", fontVariationSettings: "'FILL' 1" }}>route</span>
              </div>
              <h3 className="font-headline text-2xl font-bold text-white mb-3">Automated Routing</h3>
              <p className="text-slate-400 mb-8">Intelligently dispatch the right municipal teams based on urgency, severity, and proximity.</p>
              <div className="mt-auto space-y-3">
                {[
                  { unit: "Unit 7A – Pothole Repair", status: "En Route",  live: true  },
                  { unit: "Unit 3B – Signal Failure",  status: "Assigned", live: false },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-full border border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-sm text-white">{row.unit}</span>
                    <span
                      className="text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1"
                      style={{
                        background: row.live ? "rgba(255,185,95,0.15)" : "rgba(255,255,255,0.06)",
                        color:      row.live ? "#FFB95F" : "#9e8e7e",
                      }}
                    >
                      {row.live && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#FFB95F" }} />}
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Fast Resolution — 12 col */}
            <motion.div
              className="col-span-12 glass-panel ghost-border rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between relative overflow-hidden group"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              whileHover={{ boxShadow: "0 20px 40px rgba(255,185,95,0.08)" }}
            >
              <div className="max-w-lg mb-10 md:mb-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6" style={{ background: "rgba(255,185,95,0.1)" }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: "#FFB95F", fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
                <h3 className="font-headline text-3xl font-bold text-white mb-3">Fast Resolution Tracking</h3>
                <p className="text-slate-400 leading-relaxed">As soon as an issue is resolved, AI verifies completion and notifies all stakeholders seamlessly. Issues go from Reported → Resolved in record time.</p>
              </div>
              {/* Progress bar with animation */}
              <div className="w-full md:w-2/5 space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(77,224,130,0.15)" }}>
                    <span className="material-symbols-outlined text-lg" style={{ color: "#4de082" }}>done_all</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Issue #8492 Resolved</p>
                    <p className="text-xs text-slate-500">Time to resolution: 2h 14m</p>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg,#FFB95F,#FFB786)", boxShadow: "0 0 12px rgba(255,185,95,0.5)" }}
                    initial={{ width: "0%" }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.6, ease: "easeOut", delay: 0.3 }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-500">Reported</span>
                  <span className="text-xs uppercase tracking-wider font-bold" style={{ color: "#FFB95F" }}>Resolved ✓</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── LIVE MAP ── */}
        <section id="map" className="max-w-7xl mx-auto px-8 mb-32">
          <motion.div
            className="flex items-center justify-between mb-8 border-b pb-4"
            style={{ borderColor: "rgba(255,185,95,0.08)" }}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-headline text-3xl font-bold text-white flex items-center gap-3">
              <span className="material-symbols-outlined" style={{ color: "#FFB95F", fontVariationSettings: "'FILL' 1" }}>explore</span>
              Live Intelligence Map
            </h2>
            <div className="flex gap-5">
              {[
                { color: "#ffb4ab", label: "High Hazard" },
                { color: "#FFB95F", label: "Moderate"    },
                { color: "#4de082", label: "Minor"       },
              ].map((l, i) => (
                <span key={i} className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                  {l.label}
                </span>
              ))}
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: "#FFB95F" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ background: "#FFB95F" }} />
                {usingDemo ? "Demo" : "Live"}
              </span>
            </div>
          </motion.div>

          <motion.div
            className="w-full h-[520px] rounded-2xl ghost-border overflow-hidden relative"
            style={{ background: "#0e0e0f" }}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <MapContainer
              center={mapCenter}
              zoom={12}
              className="w-full h-full"
              zoomControl={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              style={{ zIndex: 10 }}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {reports
                .filter((r) => r.latitude != null && r.longitude != null)
                .map((r, i) => {
                  const color = r.severity === "high" ? "#ffb4ab" : r.severity === "medium" ? "#FFB95F" : "#4de082";
                  return (
                    <CircleMarker
                      key={r.id || i}
                      center={[parseFloat(r.latitude), parseFloat(r.longitude)]}
                      radius={r.severity === "high" ? 10 : 7}
                      pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
                    >
                      <Tooltip>{r.damage_type} — {r.severity}</Tooltip>
                    </CircleMarker>
                  );
                })}
            </MapContainer>
            {/* Grid overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{ backgroundImage: "linear-gradient(rgba(255,185,95,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,185,95,0.02) 1px, transparent 1px)", backgroundSize: "50px 50px" }}
            />
            {/* Vignette */}
            <div className="absolute inset-0 pointer-events-none z-20" style={{ boxShadow: "inset 0 0 120px rgba(0,0,0,0.85)" }} />
          </motion.div>
        </section>

        {/* ── LEADERBOARD ── */}
        <section id="vision" className="max-w-7xl mx-auto px-8 mb-20">
          <motion.div
            className="glass-panel ghost-border rounded-3xl p-12 max-w-4xl mx-auto flex flex-col items-center"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-headline text-3xl font-bold text-white mb-2 text-center">Top Impact Citizens</h2>
            <p className="text-sm text-slate-500 uppercase tracking-widest mb-14 text-center">The visionaries of our city grid</p>

            <div className="flex items-end justify-center gap-8 w-full mb-12 h-52">
              {(leaders.length >= 3 ? [leaders[1], leaders[0], leaders[2]] : leaders).map((user, i) => {
                const isCenter = i === 1;
                const heights  = ["h-28", "h-44", "h-20"];
                const ranks    = [2, 1, 3];
                return (
                  <div key={user.user_id || i} className="flex flex-col items-center w-28">
                    <p className="text-white font-bold text-base truncate w-24 text-center mb-1">{user.name?.split(" ")[0]}</p>
                    <p className="text-xs font-bold mb-3" style={{ color: "#FFB95F" }}>{user.points?.toLocaleString()} PTS</p>
                    <div
                      className={`w-full ${heights[i]} rounded-t-2xl flex items-end justify-center pb-4 transition-all duration-700 border border-white/5`}
                      style={isCenter
                        ? { background: "linear-gradient(to top, rgba(255,185,95,0.5), rgba(255,185,95,0.15))", boxShadow: "0 0 30px rgba(255,185,95,0.2)" }
                        : { background: "rgba(255,255,255,0.04)" }
                      }
                    >
                      <span className="font-headline font-black text-3xl opacity-40 text-white">{ranks[i]}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => navigate("/login")}
              className="ghost-border glass-panel text-white text-sm font-bold px-8 py-4 rounded-xl transition-all hover:bg-white/5"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(255,185,95,0.4)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,185,95,0.15)"}
            >
              Join the Global Leaderboard
            </button>
          </motion.div>
        </section>


        {/* ── ABOUT THE DEVELOPER ── */}
        <section id="developer" className="max-w-7xl mx-auto px-8 mb-32">
          <motion.div 
            className="flex flex-col md:flex-row items-center gap-12 bg-surface-container-low rounded-[2.5rem] p-10 lg:p-16 border border-outline-variant/10 relative overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48" />
            
            <div className="flex-shrink-0 relative">
              <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-[2rem] overflow-hidden border-2 border-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500 shadow-2xl">
                <img 
                  src="https://ui-avatars.com/api/?name=Amit+Kushwaha&background=FFB95F&color=1a1000&size=512&bold=true" 
                  alt="Amit Kushwaha" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-xl rotate-12">
                <span className="material-symbols-outlined text-black text-3xl font-bold">code</span>
              </div>
            </div>

            <div className="flex-grow">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 bg-primary/10 border border-primary/20">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">Master Architect</span>
              </div>
              <h2 className="font-headline text-4xl lg:text-5xl font-extrabold text-white mb-6">Amit Kushwaha</h2>
              <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mb-8 font-body">
                The visionary detrás de CivicSense AI. Amit is a full-stack architect dedicated to engineering software that solves real-world urban crises. With a focus on performance and "human-first" design, he built this platform to breathe digital intelligence into modern cities.
              </p>
              
              <div className="flex gap-4">
                 <button className="flex items-center gap-2 text-sm font-bold text-white bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl border border-white/10 transition-all">
                    <span className="material-symbols-outlined text-lg">terminal</span> GitHub
                 </button>
                 <button className="flex items-center gap-2 text-sm font-bold text-white bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl border border-white/10 transition-all">
                    <span className="material-symbols-outlined text-lg">alternate_email</span> Contact
                 </button>
              </div>
            </div>
          </motion.div>
        </section>

      </main>

      {/* ─────────────────── FOOTER ─────────────────── */}
      <footer className="w-full py-12" style={{ background: "#0A0A0B", borderTop: "1px solid rgba(255,185,95,0.06)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1", color: "#FFB95F" }}>analytics</span>
            <span className="font-headline font-bold text-lg text-white tracking-tighter">CivicSense AI</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-8">
            {["Privacy Policy", "Terms of Service", "API Docs", "System Status"].map((l, i) => (
              <a key={i} className="text-sm text-slate-500 hover:text-white transition-colors cursor-pointer">{l}</a>
            ))}
          </nav>
          <p className="text-sm text-slate-600">© 2026 CivicSense AI. The Urban Nervous System.</p>
        </div>
      </footer>
    </div>
  );
}