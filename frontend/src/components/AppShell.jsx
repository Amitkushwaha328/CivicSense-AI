import React from 'react';
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppShell() {
  const location = useLocation();
  const path = location.pathname;
  const { user, logout } = useAuth();

  const isAuthorized = user?.role === 'admin' || user?.role === 'municipality';
  const isAdmin = user?.role === 'admin';
  const isCitizen = user?.role === 'citizen' || !user?.role;

  // Redirect official users away from citizen-only pages
  const citizenOnlyPaths = ['/dashboard', '/upload', '/my-reports', '/leaderboard', '/settings'];
  if (isAuthorized && citizenOnlyPaths.includes(path)) {
    return <Navigate to={isAdmin ? '/admin' : '/municipality'} replace />;
  }

  const NavLink = ({ to, icon, label, active }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
        active
          ? 'bg-[#adc6ff]/10 text-primary font-semibold border-r-4 border-primary'
          : 'text-on-surface-variant hover:bg-[#272a31] hover:text-on-background'
      }`}
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: active ? "'FILL' 1" : "" }}>
        {icon}
      </span>
      {label}
    </Link>
  );

  return (
    <div className="bg-background text-on-background antialiased flex min-h-screen w-full">
      {/* SideNavBar (Desktop) */}
      <nav className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-[#191b23] border-r border-[#ffffff15] py-8 z-40">
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-headline font-bold text-xl">C</div>
          <div>
            <h1 className="font-headline font-bold text-primary text-lg tracking-tight">CivicSense AI</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#4ADE80] ai-pulse"></div>
              <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">AI CORE: ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 px-3">
          {/* ── CITIZEN NAV ── */}
          {isCitizen && (
            <>
              <Link to="/upload" className="mx-3 mb-4 bg-primary text-on-primary font-label font-medium rounded-xl py-3 px-4 flex items-center justify-center gap-2 hover:bg-primary-fixed-dim transition-colors shadow-[0_0_20px_rgba(173,198,255,0.15)]">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                Report Issue
              </Link>
              <NavLink to="/dashboard"   icon="dashboard"   label="Dashboard"    active={path === '/dashboard'} />
              <NavLink to="/map"         icon="map"         label="Maps"         active={path === '/map'} />
              <NavLink to="/my-reports"  icon="campaign"    label="My Reports"   active={path === '/my-reports'} />
              <NavLink to="/leaderboard" icon="leaderboard" label="Leaderboard"  active={path === '/leaderboard'} />
              <NavLink to="/settings"    icon="settings"    label="Settings"     active={path === '/settings'} />
            </>
          )}

          {/* ── OFFICIAL NAV ── */}
          {isAuthorized && (
            <>
              <div className="px-3 mb-2">
                <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">
                  {isAdmin ? '⚡ Admin Access' : '🏛️ Official Access'}
                </span>
              </div>
              <NavLink to="/municipality" icon="account_balance"    label="Command View"   active={path === '/municipality'} />
              {isAdmin && (
                <NavLink to="/admin" icon="admin_panel_settings" label="Admin Centre"   active={path === '/admin'} />
              )}
              <NavLink to="/map" icon="map" label="Live Map" active={path === '/map'} />
            </>
          )}
        </div>

        {/* User info + logout */}
        <div className="mt-auto px-3 flex flex-col gap-2">
          {user && (
            <div className="px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/10 mb-2">
              <p className="text-xs font-semibold text-on-surface truncate">{user.name}</p>
              <p className="text-[10px] text-on-surface-variant capitalize">{user.role} · {user.city || 'No city'}</p>
            </div>
          )}
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer">
            <span className="material-symbols-outlined">logout</span>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        <Outlet />
      </div>

      {/* BottomNavBar (Mobile) */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-[#10131a]/90 backdrop-blur-lg rounded-t-xl border-t border-[#ffffff10] shadow-[0_-10px_30px_rgba(0,0,0,0.5)] pb-safe">
        {isCitizen && (
          <>
            <Link to="/dashboard" className={`flex flex-col items-center justify-center p-2 rounded-xl duration-150 ${path === '/dashboard' ? 'text-primary bg-primary/10 scale-110' : 'text-[#a9abb0]'}`}>
              <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: path === '/dashboard' ? "'FILL' 1" : "" }}>dashboard</span>
              <span className="font-label text-[10px] uppercase font-bold">Home</span>
            </Link>
            <Link to="/map" className={`flex flex-col items-center justify-center p-2 rounded-xl duration-150 ${path === '/map' ? 'text-primary bg-primary/10 scale-110' : 'text-[#a9abb0]'}`}>
              <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: path === '/map' ? "'FILL' 1" : "" }}>map</span>
              <span className="font-label text-[10px] uppercase font-bold">Maps</span>
            </Link>
            <Link to="/upload" className={`flex flex-col items-center justify-center p-2 rounded-xl duration-150 ${path === '/upload' ? 'text-primary bg-primary/10 scale-110' : 'text-[#a9abb0]'}`}>
              <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: path === '/upload' ? "'FILL' 1" : "" }}>add_circle</span>
              <span className="font-label text-[10px] uppercase font-bold">Report</span>
            </Link>
            <Link to="/leaderboard" className={`flex flex-col items-center justify-center p-2 rounded-xl duration-150 ${path === '/leaderboard' ? 'text-primary bg-primary/10 scale-110' : 'text-[#a9abb0]'}`}>
              <span className="material-symbols-outlined mb-1">leaderboard</span>
              <span className="font-label text-[10px] uppercase font-bold">Rank</span>
            </Link>
          </>
        )}
        {isAuthorized && (
          <>
            <Link to="/municipality" className={`flex flex-col items-center justify-center p-2 rounded-xl duration-150 ${path === '/municipality' ? 'text-primary bg-primary/10 scale-110' : 'text-[#a9abb0]'}`}>
              <span className="material-symbols-outlined mb-1">account_balance</span>
              <span className="font-label text-[10px] uppercase font-bold">Portal</span>
            </Link>
            <Link to="/map" className={`flex flex-col items-center justify-center p-2 rounded-xl duration-150 ${path === '/map' ? 'text-primary bg-primary/10 scale-110' : 'text-[#a9abb0]'}`}>
              <span className="material-symbols-outlined mb-1">map</span>
              <span className="font-label text-[10px] uppercase font-bold">Map</span>
            </Link>
            {isAdmin && (
              <Link to="/admin" className={`flex flex-col items-center justify-center p-2 rounded-xl duration-150 ${path === '/admin' ? 'text-primary bg-primary/10 scale-110' : 'text-[#a9abb0]'}`}>
                <span className="material-symbols-outlined mb-1">admin_panel_settings</span>
                <span className="font-label text-[10px] uppercase font-bold">Admin</span>
              </Link>
            )}
            <button onClick={logout} className="flex flex-col items-center justify-center p-2 rounded-xl text-[#a9abb0]">
              <span className="material-symbols-outlined mb-1">logout</span>
              <span className="font-label text-[10px] uppercase font-bold">Out</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
