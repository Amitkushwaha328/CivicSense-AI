import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import AppShell from "./components/AppShell";

// Lazy-loaded pages for 10x faster initial loading
const Home         = lazy(() => import("./pages/Home"));
const Login        = lazy(() => import("./pages/Login"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Upload       = lazy(() => import("./pages/Upload"));
const MapPage      = lazy(() => import("./pages/Map"));
const Municipality = lazy(() => import("./pages/Municipality"));
const Admin        = lazy(() => import("./pages/Admin"));
const Settings     = lazy(() => import("./pages/Settings"));
const Leaderboard  = lazy(() => import("./pages/Leaderboard"));
const MyReports    = lazy(() => import("./pages/MyReports"));

// Premium Loading Screen component
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 border-green-500/20 border-t-green-500 animate-[spin_0.8s_linear_infinite]" />
        <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-b-cyan-500 animate-[spin_1.2s_linear_infinite]" />
      </div>
      <div className="mt-6 flex flex-col items-center">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-green-500/50 mb-1">Authenticating</span>
        <div className="h-[2px] w-32 bg-gray-900 overflow-hidden rounded-full">
           <div className="h-full bg-gradient-to-r from-green-500 to-cyan-500 animate-[loading_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" />;
}

function RoleRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/"             element={<Home />} />
        <Route path="/login"        element={<Login />} />
        
        {/* Routes powered by AppShell */}
        <Route element={<AppShell />}>
          <Route path="/map"          element={<MapPage />} />
          <Route path="/leaderboard"  element={<Leaderboard />} />

          <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/upload"       element={<ProtectedRoute><Upload /></ProtectedRoute>} />
          <Route path="/municipality" element={<RoleRoute roles={['municipality','admin']}><Municipality /></RoleRoute>} />
          <Route path="/admin"        element={<RoleRoute roles={['admin']}><Admin /></RoleRoute>} />
          <Route path="/settings"     element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/my-reports"   element={<ProtectedRoute><MyReports /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
           <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}