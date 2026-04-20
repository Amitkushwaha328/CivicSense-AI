import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * CivicSense AI — Shared Navbar Component
 *
 * Props:
 *  - title:        string  — Page title shown next to logo (default: "CivicSense AI")
 *  - showBack:     boolean — Show ← Back button
 *  - backPath:     string  — Path for back button (default: "/dashboard")
 *  - transparent:  boolean — Use transparent/glassmorphism background (for landing page)
 */
export default function Navbar({
  title = "CivicSense AI",
  showBack = false,
  backPath = "/dashboard",
  transparent = false,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav
      className={`px-6 py-4 flex justify-between items-center flex-shrink-0 z-50 ${
        transparent
          ? "bg-transparent"
          : "bg-gray-900/80 backdrop-blur-md border-b border-white/5"
      }`}
    >
      {/* Logo + Title */}
      <div
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => navigate(user ? "/dashboard" : "/")}
      >
        <div className="relative">
          <div className="bg-gradient-to-br from-emerald-400 to-green-600 text-black font-black text-sm w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
            CS
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-gray-950 animate-pulse" />
        </div>
        <div>
          <span className="font-bold text-white tracking-tight">{title}</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={() => navigate(backPath)}
            className="text-sm text-gray-400 hover:text-white transition flex items-center gap-1"
          >
            ← Back
          </button>
        ) : user ? (
          <>
            <span className="text-gray-400 text-sm hidden md:block">
              {user.email}
            </span>
            <span className="text-green-400 text-sm font-bold bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
              {user.points ?? 0} pts
            </span>
            <button
              onClick={handleLogout}
              className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition text-white"
            >
              Logout
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-gray-300 hover:text-white transition px-4 py-2"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-sm bg-green-500 hover:bg-green-400 text-black font-semibold px-4 py-2 rounded-lg transition"
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
