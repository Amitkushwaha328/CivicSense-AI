import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { registerUser, loginUser, forgotPassword, resetPassword } from "../api/auth";
import API from "../api/auth"; // Need raw API for google endpoint
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetModal, setResetModal] = useState({ isOpen: false, step: 1, email: "", code: "", newPassword: "", error: "", loading: false, successMsg: "" });
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let res;
      if (isRegister) {
        res = await registerUser(form);
      } else {
        res = await loginUser({ email: form.email, password: form.password });
      }

      const role = res.data.user?.role;

      // Role ↔ tab mismatch check
      if (isOfficial && role === "citizen") {
        setError("This account does not have official access. Please use Citizen login.");
        setLoading(false);
        return;
      }
      if (!isOfficial && !isRegister && (role === "admin" || role === "municipality")) {
        setError("Official accounts must use the Authorized Official tab.");
        setLoading(false);
        return;
      }

      login(res.data.access_token, res.data.user);

      if (role === "admin")          navigate("/admin");
      else if (role === "municipality") navigate("/municipality");
      else                           navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError("");
    try {
      // Send the Google JWT to our backend
      const res = await API.post("/auth/google", { token: credentialResponse.credential });
      const role = res.data.user?.role;

      // Role check
      if (isOfficial && role === "citizen") {
        setError("This Google account does not have official access. Please use Citizen login.");
        setLoading(false);
        return;
      }
      if (!isOfficial && (role === "admin" || role === "municipality")) {
        setError("Official accounts must use the Authorized Official tab.");
        setLoading(false);
        return;
      }

      login(res.data.access_token, res.data.user);

      if (role === "admin")          navigate("/admin");
      else if (role === "municipality") navigate("/municipality");
      else                           navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setResetModal(prev => ({ ...prev, loading: true, error: "" }));
    try {
      const res = await forgotPassword({ email: resetModal.email });
      setResetModal(prev => ({ 
        ...prev, 
        step: 2, 
        loading: false, 
        successMsg: res.data.mock_email_content || "Code sent to email." 
      }));
    } catch (err) {
      setResetModal(prev => ({ ...prev, loading: false, error: "Failed to generate reset code." }));
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetModal(prev => ({ ...prev, loading: true, error: "" }));
    try {
      await resetPassword({ 
        email: resetModal.email, 
        code: resetModal.code, 
        new_password: resetModal.newPassword 
      });
      // Success
      setResetModal({ isOpen: false, step: 1, email: "", code: "", newPassword: "", error: "", loading: false, successMsg: "" });
      setError("");
      alert("Password reset successfully. Please login with your new password.");
    } catch (err) {
      setResetModal(prev => ({ ...prev, loading: false, error: err.response?.data?.detail || "Invalid code or reset failed." }));
    }
  };

  return (
    <main className="flex-grow flex w-full min-h-screen bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container">
      {/* Left Side: Visual Representation (Hidden on smaller screens) */}
      <div className="hidden lg:flex w-1/2 relative bg-surface-container-lowest overflow-hidden items-center justify-center">
        {/* Abstract City Network Graphic */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        {/* Decorative glowing orbs */}
        <div className="absolute w-64 h-64 bg-primary/20 rounded-full blur-[80px] top-1/4 left-1/4"></div>
        <div className="absolute w-96 h-96 bg-secondary/15 rounded-full blur-[100px] bottom-1/4 right-1/4"></div>
        <div className="absolute w-48 h-48 bg-tertiary/10 rounded-full blur-[60px] top-1/2 right-1/3"></div>
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdHRlcm4gaWQ9InNtYWxsR3JpZCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNMTAgMEwwIDBMMCAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDE5MiwgMTkzLCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InVybCgjc21hbGxHcmlkKSIvPjxwYXRoIGQ9Ik00MCAwTDAgMEwwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoMTkyLCAxOTMsIDI1NSwgMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
        {/* Core Brand Mark */}
        <div className="z-10 text-center">
          <h1 className="font-headline text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent drop-shadow-lg tracking-tighter mb-4">CivicSense AI</h1>
          <p className="text-on-surface-variant font-body text-lg max-w-md mx-auto">The living nervous system for modern urban intelligence.</p>
        </div>
      </div>

      {/* Right Side: Login Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10 bg-background/80 backdrop-blur-3xl">
        {/* Back home */}
        <button
          onClick={() => navigate("/")}
          className="absolute top-8 left-8 text-on-surface-variant hover:text-on-surface text-sm font-medium flex items-center gap-2 transition-colors z-20"
        >
          <span className="material-symbols-outlined text-[18px]">home</span>
        </button>

        {/* Glassmorphic Login Card */}
        <div className="w-full max-w-md bg-surface-variant/40 backdrop-blur-2xl rounded-[1.5rem] p-8 border border-outline-variant/15 shadow-[0_24px_48px_rgba(0,0,0,0.4)] relative overflow-hidden">
          {/* Subtle top glow on card */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          
          <div className="text-center mb-8">
            <h2 className="font-headline text-3xl font-bold text-on-surface mb-2">
              {isRegister ? "Create Identity" : "Welcome Back"}
            </h2>
            <p className="text-on-surface-variant text-sm font-label">
              {isRegister ? "Register to connect to the intelligence grid." : "Authenticate to access the intelligence grid."}
            </p>
          </div>

          {/* Segmented Toggle - Only show on Login for semantic splitting */}
          {!isRegister && (
            <div className="flex p-1 bg-surface-container-lowest rounded-lg mb-8 border border-outline-variant/10 relative">
               <button 
                onClick={() => setIsOfficial(false)}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${!isOfficial ? 'bg-surface-container-high text-primary shadow-sm border border-outline-variant/20' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Citizen Access
              </button>
              <button 
                onClick={() => setIsOfficial(true)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isOfficial ? 'bg-surface-container-high text-primary shadow-sm border border-outline-variant/20' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Authorized Official
              </button>
            </div>
          )}

          {error && (
            <div className="bg-error/10 border border-error/20 text-error rounded-xl px-4 py-3 mb-6 flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              {error}
            </div>
          )}

          {/* Google Login Section */}
          <div className="mb-6 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google Sign In was unsuccessful. Try again.")}
              theme="filled_black"
              shape="pill"
              text="continue_with"
            />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <hr className="flex-1 border-t border-outline-variant/30" />
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
              Or continue with email
            </span>
            <hr className="flex-1 border-t border-outline-variant/30" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegister && (
               <div className="space-y-2">
                 <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider" htmlFor="name">Operative Name</label>
                 <div className="relative group">
                   <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-outline group-focus-within:text-primary transition-colors">
                     <span className="material-symbols-outlined text-[20px]">badge</span>
                   </span>
                   <input 
                     name="name" 
                     id="name"
                     value={form.name} 
                     onChange={handleChange} 
                     required
                     className="w-full bg-surface-container-highest/50 border border-outline-variant/30 text-on-surface text-sm rounded-xl focus:ring-1 focus:ring-primary focus:border-primary block pl-11 p-3.5 transition-all outline-none placeholder:text-outline/50 hover:border-outline-variant/60" 
                     placeholder="John Doe" 
                     type="text" 
                   />
                 </div>
               </div>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider" htmlFor="email">
                {isOfficial && !isRegister ? "Official ID / Email" : "Citizen ID / Email"}
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </span>
                <input 
                  name="email"
                  id="email" 
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full bg-surface-container-highest/50 border border-outline-variant/30 text-on-surface text-sm rounded-xl focus:ring-1 focus:ring-primary focus:border-primary block pl-11 p-3.5 transition-all outline-none placeholder:text-outline/50 hover:border-outline-variant/60" 
                  placeholder="Enter your credentials" 
                  type="email" 
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider" htmlFor="password">Access Token</label>
                {!isRegister && (
                  <button 
                    type="button" 
                    onClick={() => setResetModal({ ...resetModal, isOpen: true, step: 1 })}
                    className="text-xs text-primary hover:text-secondary transition-colors font-medium"
                  >
                    Reset Token?
                  </button>
                )}
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-outline group-focus-within:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </span>
                <input 
                  name="password"
                  id="password" 
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="w-full bg-surface-container-highest/50 border border-outline-variant/30 text-on-surface text-sm rounded-xl focus:ring-1 focus:ring-primary focus:border-primary block pl-11 pr-11 p-3.5 transition-all outline-none placeholder:text-outline/50 hover:border-outline-variant/60" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-outline hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-primary/90 to-secondary/90 hover:from-primary hover:to-secondary text-on-primary font-headline font-bold rounded-xl shadow-[0_0_20px_rgba(192,193,255,0.2)] hover:shadow-[0_0_30px_rgba(192,193,255,0.3)] transition-all duration-300 transform active:scale-[0.98] mt-4 flex justify-center items-center gap-2 disabled:opacity-50 disabled:active:scale-100" 
              type="submit"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-on-primary/30 border-t-on-primary animate-spin" />
              ) : isRegister ? (
                <>Establish Connection <span className="material-symbols-outlined text-[18px]">add_circle</span></>
              ) : (
                <>Initialize Sequence <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="mt-8 text-center">
            <p className="text-xs text-on-surface-variant font-label">
              {isRegister ? "Valid Citizen ID exists?" : "Don't have a Citizen ID?"} 
              <button 
                onClick={() => { setIsRegister(!isRegister); setError(""); setIsOfficial(false); }}
                className="text-tertiary font-semibold hover:text-tertiary-fixed-dim transition-colors ml-1"
              >
                {isRegister ? "Authenticate Here" : "Register Here"}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container rounded-[1.5rem] p-6 max-w-sm w-full border border-outline-variant/20 shadow-2xl">
            <h3 className="text-xl font-bold font-headline text-on-surface mb-2">Password Recovery</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {resetModal.step === 1 ? "Enter your registered email to receive a recovery code." : "Enter your recovery code and your new password."}
            </p>

            {resetModal.error && (
              <div className="bg-error/10 text-error text-xs p-3 rounded-lg mb-4 border border-error/20">
                {resetModal.error}
              </div>
            )}
            {resetModal.successMsg && (
              <div className="bg-[#4ADE80]/10 text-[#4ADE80] text-xs p-3 rounded-lg mb-4 border border-[#4ADE80]/20">
                {resetModal.successMsg}
              </div>
            )}

            {resetModal.step === 1 ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Email</label>
                  <input type="email" required
                    value={resetModal.email}
                    onChange={e => setResetModal({ ...resetModal, email: e.target.value })}
                    className="w-full bg-background border border-outline-variant/30 rounded-xl p-3 text-sm focus:border-primary outline-none"
                    placeholder="name@example.com"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setResetModal({ isOpen: false, step: 1, email: "", code: "", newPassword: "", error: "", loading: false, successMsg: "" })} className="flex-1 py-2 rounded-xl border border-outline-variant/30 text-sm font-medium hover:bg-surface-variant transition">Cancel</button>
                  <button type="submit" disabled={resetModal.loading} className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold hover:opacity-90 transition disabled:opacity-50">
                    {resetModal.loading ? "Sending..." : "Send Code"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">6-Digit Code</label>
                  <input type="text" required maxLength={6}
                    value={resetModal.code}
                    onChange={e => setResetModal({ ...resetModal, code: e.target.value })}
                    className="w-full bg-background border border-outline-variant/30 rounded-xl p-3 text-sm focus:border-primary outline-none tracking-[0.3em] font-mono"
                    placeholder="------"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">New Password</label>
                  <input type="password" required minLength={6}
                    value={resetModal.newPassword}
                    onChange={e => setResetModal({ ...resetModal, newPassword: e.target.value })}
                    className="w-full bg-background border border-outline-variant/30 rounded-xl p-3 text-sm focus:border-primary outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setResetModal({ ...resetModal, step: 1, error: "", successMsg: "" })} className="flex-1 py-2 rounded-xl border border-outline-variant/30 text-sm font-medium hover:bg-surface-variant transition">Back</button>
                  <button type="submit" disabled={resetModal.loading} className="flex-1 py-2 rounded-xl bg-[#4ADE80] text-black text-sm font-bold hover:opacity-90 transition disabled:opacity-50">
                    {resetModal.loading ? "Saving..." : "Change Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}