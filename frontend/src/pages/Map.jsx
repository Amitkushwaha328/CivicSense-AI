import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import API from "../api/auth";

// Map tile layers
const TILES = {
  dark: {
    label: "Dark",
    icon: "dark_mode",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    label: "Satellite",
    icon: "satellite_alt",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
  street: {
    label: "Street",
    icon: "map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
};

const STATUS_MAP = {
  resolved:       { label: "Fixed",       color: "#4ADE80", tailwind: "bg-[#4ADE80]/20 text-[#4ADE80] border-[#4ADE80]/30", icon: "check_circle" },
  pending:        { label: "Pending",      color: "#ffb95f", tailwind: "bg-secondary/20 text-secondary border-secondary/30",   icon: "schedule" },
  complaint_sent: { label: "In Progress",  color: "#adc6ff", tailwind: "bg-primary/20 text-primary border-primary/30",         icon: "send" },
  high:           { label: "High Risk",    color: "#ffb4ab", tailwind: "bg-error/20 text-error border-error/30",               icon: "warning" },
};

function createMarker(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};box-shadow:0 0 10px ${color},0 0 20px ${color}44;border:2px solid rgba(255,255,255,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Component to change tile layer dynamically
function TileController({ tileKey }) {
  return (
    <TileLayer
      key={tileKey}
      url={TILES[tileKey].url}
      attribution={TILES[tileKey].attribution}
      maxZoom={19}
    />
  );
}

export default function MapPage() {
  const [reports,      setReports]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [tileKey,      setTileKey]      = useState("dark");

  useEffect(() => {
    API.get("/reports/all?limit=200")
      .then(res => {
        const items = res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
        setReports(items);
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reports.filter(r => {
    if (activeFilter === "all")         return true;
    if (activeFilter === "severe")      return r.severity === "high";
    return r.status === activeFilter;
  });

  const getMarkerIcon = (r) => {
    if (r.severity === "high" && r.status !== "resolved") return createMarker("#ffb4ab");
    const s = STATUS_MAP[r.status] || STATUS_MAP.pending;
    return createMarker(s.color);
  };

  const getStatusCfg = (r) => {
    if (r.severity === "high" && r.status !== "resolved") return STATUS_MAP.high;
    return STATUS_MAP[r.status] || STATUS_MAP.pending;
  };

  return (
    <main className="flex-1 relative w-full" style={{ height: "calc(100vh - 64px)" }}>

      {/* Floating Filter Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] flex gap-2 p-2 bg-[#10131a]/90 backdrop-blur-md rounded-full border border-[#424754]/40 shadow-2xl flex-wrap justify-center">
        {[
          { key: "all",     label: "All",      dot: "bg-primary" },
          { key: "severe",  label: "Severe",   dot: "bg-error" },
          { key: "pending", label: "Pending",  dot: "bg-secondary" },
          { key: "resolved",label: "Fixed",    dot: "bg-[#4ADE80]" },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all ${
              activeFilter === f.key
                ? "bg-white/10 text-white border border-white/20"
                : "text-[#c2c6d6] hover:bg-white/5"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${f.dot}`}></span>
            {f.label}
            {activeFilter === f.key && (
              <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{filtered.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tile Layer Toggle — top right */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        {Object.entries(TILES).map(([key, tile]) => (
          <button
            key={key}
            onClick={() => setTileKey(key)}
            title={tile.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${
              tileKey === key
                ? "bg-primary text-[#002e6a]"
                : "bg-[#10131a]/90 text-[#c2c6d6] border border-[#424754]/40 hover:bg-white/10"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tile.icon}</span>
          </button>
        ))}
      </div>

      {/* Stats pill — bottom left */}
      {!loading && (
        <div className="absolute bottom-6 left-4 z-[400] flex gap-2 flex-wrap">
          <div className="bg-[#10131a]/90 backdrop-blur-md border border-[#424754]/40 rounded-xl px-4 py-2 flex items-center gap-3 text-sm shadow-xl">
            <span className="text-[#c2c6d6]">{reports.length} total</span>
            <span className="text-[#424754]">·</span>
            <span className="text-error">{reports.filter(r => r.severity === "high").length} high risk</span>
            <span className="text-[#424754]">·</span>
            <span className="text-[#4ADE80]">{reports.filter(r => r.status === "resolved").length} resolved</span>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[#10131a]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-[#c2c6d6]">Loading city data...</span>
          </div>
        </div>
      )}

      <MapContainer
        center={[23.0225, 72.5714]}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        zoomControl={false}
      >
        <TileController tileKey={tileKey} />

        {filtered.map((r) => (
          <Marker
            key={r.id}
            position={[parseFloat(r.latitude), parseFloat(r.longitude)]}
            icon={getMarkerIcon(r)}
          >
            <Popup className="custom-popup" maxWidth={280}>
              <div className="w-64 rounded-xl overflow-hidden" style={{ background: "#1d2027", border: "1px solid rgba(66,71,84,0.5)" }}>
                {r.image_url && (
                  <img src={r.image_url} alt={r.damage_type} className="w-full h-32 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${getStatusCfg(r).tailwind}`}>
                      <span className="material-symbols-outlined text-[12px]">{getStatusCfg(r).icon}</span>
                      {getStatusCfg(r).label}
                    </span>
                    <span className="text-xs" style={{ color: "#c2c6d6" }}>{timeAgo(r.created_at)}</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: "#e1e2ec", fontFamily: "Outfit, sans-serif" }}>
                    {r.damage_type || "Civic Issue"}
                  </h3>
                  <p className="text-xs mb-1" style={{ color: "#c2c6d6" }}>
                    {r.address || `${parseFloat(r.latitude).toFixed(4)}°N, ${parseFloat(r.longitude).toFixed(4)}°E`}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="text-xs font-semibold uppercase" style={{ color: "#8c909f" }}>Severity:</span>
                    <span className={`text-xs font-bold capitalize ${r.severity === "high" ? "text-error" : r.severity === "medium" ? "text-secondary" : "text-primary"}`}>
                      {r.severity}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        .leaflet-container { background: #0b0e15 !important; }
        .custom-popup .leaflet-popup-content-wrapper,
        .custom-popup .leaflet-popup-tip {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-popup .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-close-button { display: none !important; }
        .leaflet-control-zoom { display: none; }
      `}</style>
    </main>
  );
}