import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/auth";
import { useToast } from "../context/ToastContext";

// Indian cities for quick-select suggestions
const INDIAN_CITIES = [
  "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Mumbai",
  "Delhi", "Bengaluru", "Chennai", "Hyderabad", "Pune",
  "Kolkata", "Jaipur", "Lucknow", "Kanpur", "Nagpur"
];

export default function Upload() {
  const navigate  = useNavigate();
  const fileRef   = useRef(null);
  const cameraRef = useRef(null);

  const [image,       setImage]       = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [gps,         setGps]         = useState(null);
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [stage,       setStage]       = useState("idle");
  const [result,      setResult]      = useState(null);
  const [submitError, setSubmitError] = useState("");

  // Location fields
  const [city,        setCity]        = useState("Ahmedabad");
  const [area,        setArea]        = useState("");
  const [cityInput,   setCityInput]   = useState("Ahmedabad");
  const [showCitySug, setShowCitySug] = useState(false);

  // Problem description
  const [description, setDescription] = useState("");

  const toast = useToast();

  useEffect(() => { getGPS(); }, []);

  const getGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false); },
      ()    => { setGps({ lat: 23.0225, lng: 72.5714 }); setGpsLoading(false); } // Default: Ahmedabad
    );
  };

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setStage("idle");
    setSubmitError("");
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  // Build address string from structured inputs
  const buildAddress = () => {
    const parts = [];
    if (area.trim())        parts.push(area.trim());
    if (city.trim())        parts.push(city.trim());
    if (description.trim()) parts.push(`— ${description.trim()}`);
    return parts.join(", ") || `${gps?.lat?.toFixed(4)}, ${gps?.lng?.toFixed(4)}`;
  };

  const handleSubmit = async () => {
    if (!image || !gps) return;
    if (!area.trim()) {
      setSubmitError("Please enter the specific area (e.g. CG Road, Satellite).");
      return;
    }

    setStage("scanning");
    setSubmitError("");
    try {
      const form = new FormData();
      form.append("image",       image);
      form.append("latitude",    gps.lat);
      form.append("longitude",   gps.lng);
      form.append("address",     buildAddress());
      form.append("description", description.trim());

      const res = await API.post("/reports/submit", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      setStage("result");
      toast.success("Issue submitted! +" + res.data.points_earned + " pts");
    } catch (err) {
      setStage("error");
      const detail = err.response?.data?.detail || "Submission failed.";
      setSubmitError(detail);
      toast.error("Submission failed");
    }
  };

  const filteredCities = INDIAN_CITIES.filter(c =>
    c.toLowerCase().includes(cityInput.toLowerCase())
  );

  return (
    <main className="flex-1 min-h-screen bg-surface flex flex-col relative pb-20 lg:pb-0 overflow-x-hidden">
      {/* Header */}
      <header className="px-6 lg:px-12 py-6 lg:py-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 z-10 relative">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Intelligence Studio</span>
            <span className="text-outline-variant text-xs">•</span>
            <span className="text-xs font-medium text-on-surface-variant">Civic Issue Reporter</span>
          </div>
          <h1 className="font-headline text-3xl lg:text-4xl tracking-[0.02em] font-semibold text-on-background">Report an Incident</h1>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/20 shadow-sm">
          <div className={`w-2 h-2 rounded-full ${stage === 'result' ? 'bg-[#4ADE80] shadow-[0_0_10px_#4ADE80]' : 'bg-secondary shadow-[0_0_10px_#ffb95f]'}`}></div>
          <span className="text-sm font-medium text-on-surface-variant">
            {stage === 'result' ? 'Report Logged' : 'Awaiting Confirmation'}
          </span>
        </div>
      </header>

      {/* Studio Layout */}
      <div className="px-6 lg:px-12 pb-12 flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 z-10 relative">

        {/* Left Column: Image Upload Canvas */}
        <div className="flex-[3] flex flex-col gap-6">
          <div
            className={`glass-panel rounded-xl overflow-hidden flex flex-col relative min-h-[360px] lg:min-h-[440px] transition-all duration-300 ${dragging ? "border-primary bg-primary/5" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {/* Toolbar */}
            <div className="px-4 py-3 bg-surface-container-lowest/80 border-b border-outline-variant/20 flex justify-between items-center backdrop-blur-md">
              <div className="flex gap-2">
                <button onClick={() => cameraRef.current.click()} className="p-1.5 rounded-md hover:bg-surface-variant text-on-surface-variant transition-colors flex items-center gap-1 text-xs">
                  <span className="material-symbols-outlined text-lg">photo_camera</span> Camera
                </button>
                <button onClick={() => fileRef.current.click()} className="p-1.5 rounded-md hover:bg-surface-variant text-on-surface-variant transition-colors flex items-center gap-1 text-xs">
                  <span className="material-symbols-outlined text-lg">image</span> Gallery
                </button>
              </div>
              <span className="text-xs font-mono text-outline">{image ? `${image.name} • ${(image.size/1024/1024).toFixed(1)}MB` : 'AWAITING INPUT'}</span>
              <button onClick={() => handleFile(null)} className="p-1.5 rounded-md hover:bg-surface-variant text-error transition-colors">
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>

            {/* Image Area */}
            <div className="flex-1 bg-[#0b0e15] relative flex items-center justify-center p-4 overflow-hidden">
              {preview ? (
                <>
                  <img src={preview} alt="Analyzed image" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl relative z-0" />

                  {stage === "scanning" && (
                    <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] z-10 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-mono text-primary font-bold tracking-widest animate-pulse">ANALYZING IMAGE...</span>
                      </div>
                    </div>
                  )}

                  {stage === "result" && result && (
                    <div className="absolute border-2 border-secondary bg-secondary/10 rounded-sm z-20 pointer-events-none" style={{top: '30%', left: '20%', width: '50%', height: '40%'}}>
                      <div className="absolute -top-6 left-0 bg-secondary text-on-secondary px-2 py-0.5 text-xs font-bold rounded-t-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        {result.ai_result?.issue_category?.toUpperCase()}
                      </div>
                      <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-secondary"></div>
                      <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-secondary"></div>
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-secondary"></div>
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-secondary"></div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center text-on-surface-variant/50 gap-4 cursor-pointer" onClick={() => fileRef.current.click()}>
                  <span className="material-symbols-outlined text-6xl">cloud_upload</span>
                  <span className="font-headline tracking-widest text-sm uppercase">Drop Image or Click to Upload</span>
                  <span className="text-xs text-on-surface-variant/30">JPG, PNG, WEBP supported</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Location Panel ── */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
            <h3 className="font-headline text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>location_on</span>
              Incident Location
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* City Field */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">City *</label>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setCity(e.target.value);
                    setShowCitySug(true);
                  }}
                  onBlur={() => setTimeout(() => setShowCitySug(false), 150)}
                  onFocus={() => setShowCitySug(true)}
                  placeholder="e.g. Ahmedabad"
                  className="bg-surface-container-low border border-outline-variant/20 hover:border-outline-variant/40 focus:border-primary focus:outline-none rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-colors"
                />
                {showCitySug && filteredCities.length > 0 && cityInput && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-surface-container-high border border-outline-variant/20 rounded-xl shadow-2xl overflow-hidden">
                    {filteredCities.slice(0, 5).map(c => (
                      <button
                        key={c}
                        onMouseDown={() => { setCity(c); setCityInput(c); setShowCitySug(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-on-surface hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">location_city</span>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Area / Locality Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Area / Locality *</label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. CG Road, Satellite, Maninagar"
                  className="bg-surface-container-low border border-outline-variant/20 hover:border-outline-variant/40 focus:border-primary focus:outline-none rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-colors"
                />
              </div>
            </div>

            {/* GPS Status */}
            <div className="flex items-center justify-between bg-surface-container-lowest/60 rounded-lg px-4 py-2.5 border border-outline-variant/10">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${gpsLoading ? 'bg-secondary animate-pulse' : gps ? 'bg-tertiary' : 'bg-error'}`}></div>
                <span className="text-xs font-mono text-on-surface-variant">
                  {gpsLoading ? 'Acquiring GPS...' : gps ? `${gps.lat.toFixed(4)}°N, ${gps.lng.toFixed(4)}°E` : 'GPS unavailable'}
                </span>
              </div>
              <button onClick={getGPS} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">refresh</span> Re-sync
              </button>
            </div>

            {/* Address Preview */}
            {(area || city) && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
                <span className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold block mb-1">Will be saved as:</span>
                <span className="text-sm text-primary font-medium">{buildAddress()}</span>
              </div>
            )}
          </div>

          {/* ── Problem Description Panel ── */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
            <h3 className="font-headline text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>edit_note</span>
              Problem Description
              <span className="text-xs text-on-surface-variant font-normal ml-auto">(optional but recommended)</span>
            </h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in your own words...&#10;e.g. 'Deep pothole near the school gate on CG Road causing accidents at night. Water gets filled in it during rain.'"
              rows={4}
              className="bg-surface-container-low border border-outline-variant/20 hover:border-outline-variant/40 focus:border-secondary focus:outline-none rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-colors resize-none leading-relaxed"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-on-surface-variant/50">This gives the AI and municipality better context for your report.</span>
              <span className={`text-xs font-mono ${description.length > 400 ? 'text-error' : 'text-on-surface-variant/40'}`}>{description.length}/500</span>
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis + Submit */}
        <div className="flex-[1.2] flex flex-col gap-6">
          {/* AI Analysis Card */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-5">
            <div className="flex justify-between items-center">
              <h2 className="font-headline text-lg font-semibold tracking-[0.02em] text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">memory</span>
                AI Diagnostics
              </h2>
              <span className="text-xs font-mono text-secondary bg-secondary/10 px-2 py-1 rounded">GEMINI</span>
            </div>

            {result ? (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant font-medium">Detection Confidence</span>
                    <span className="text-primary font-bold">{result.ai_result?.hazard_level ? `${Math.round(result.ai_result.hazard_level * 10)}%` : '94%'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-lowest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{width: result.ai_result?.hazard_level ? `${result.ai_result.hazard_level * 10}%` : '94%'}}>
                      <div className="w-full h-full bg-gradient-to-r from-transparent to-white/30"></div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-xs uppercase font-bold text-outline-variant tracking-wider">Detected Category</span>
                  <div className="bg-surface-container-low border border-outline-variant/20 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-secondary/20 text-secondary rounded-md">
                        <span className="material-symbols-outlined text-sm">warning</span>
                      </div>
                      <span className="text-sm font-medium text-on-surface">{result.ai_result?.issue_category}</span>
                    </div>
                    <span className="material-symbols-outlined text-tertiary text-sm">check_circle</span>
                  </div>
                  <p className="text-sm text-on-surface-variant border-t border-outline-variant/20 pt-2">{result.ai_result?.issue_detail}</p>
                </div>

                {/* Severity Badge */}
                <div className="flex items-center justify-between bg-surface-container-lowest rounded-lg px-4 py-2.5 border border-outline-variant/15">
                  <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">AI Severity</span>
                  <span className={`text-sm font-bold capitalize px-3 py-1 rounded-full border ${
                    result.severity === 'high'   ? 'text-error bg-error/10 border-error/20' :
                    result.severity === 'medium' ? 'text-secondary bg-secondary/10 border-secondary/20' :
                                                   'text-tertiary bg-tertiary/10 border-tertiary/20'
                  }`}>{result.severity}</span>
                </div>

                {/* Points Earned */}
                <div className="bg-tertiary/5 border border-tertiary/20 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-on-surface font-semibold">Points Earned</span>
                  <span className="text-tertiary font-headline font-bold text-lg">+{result.points_earned} pts</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-32 flex-col gap-2">
                <span className="material-symbols-outlined text-4xl text-outline-variant/30">analytics</span>
                <span className="text-sm text-on-surface-variant/50">Submit image to activate AI analysis</span>
              </div>
            )}
          </div>

          {/* Checklist before submit */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
            <h3 className="font-headline text-sm font-semibold text-on-surface">Submission Checklist</h3>
            {[
              { done: !!image,      label: "Photo attached" },
              { done: !!city.trim(), label: "City selected" },
              { done: !!area.trim(), label: "Area / locality filled" },
              { done: !!gps,        label: "GPS coordinates locked" },
              { done: !!description.trim(), label: "Problem described (optional)" },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 text-sm ${item.done ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
                <span className={`material-symbols-outlined text-[18px] ${item.done ? 'text-tertiary' : 'text-outline-variant/30'}`}>
                  {item.done ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                {item.label}
              </div>
            ))}
          </div>

          {/* Action Area */}
          <div className="mt-auto flex flex-col gap-3">
            {stage === 'result' ? (
              <button onClick={() => navigate('/my-reports')} className="w-full bg-[#4ADE80]/80 text-[#10131a] py-3.5 px-4 rounded-xl font-semibold text-sm flex justify-center items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Done — View My Reports
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!image || stage === 'scanning' || !area.trim()}
                className="w-full bg-gradient-to-r from-primary to-primary-container text-on-primary py-3.5 px-4 rounded-xl font-semibold text-sm flex justify-center items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(173,198,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stage === 'scanning' ? (
                  <>
                    <span className="material-symbols-outlined text-lg animate-spin">refresh</span>
                    Analyzing with Gemini AI...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">send</span>
                    Confirm & Route Report
                  </>
                )}
              </button>
            )}

            {!area.trim() && image && stage === 'idle' && (
              <p className="text-xs text-center text-secondary">⚠ Please fill in the area/locality before submitting.</p>
            )}

            <input ref={fileRef}   type="file" accept="image/*"              className="hidden" onChange={e => handleFile(e.target.files[0])} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files[0])} />

            {submitError && (
              <div className="bg-error/10 border border-error/20 rounded-lg px-4 py-3 text-error text-xs leading-relaxed">
                <span className="font-bold block mb-1">Submission Failed</span>
                {submitError}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}