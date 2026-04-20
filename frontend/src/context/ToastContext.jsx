import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const success = (msg) => addToast(msg, "success");
  const error = (msg) => addToast(msg, "error");
  const info = (msg) => addToast(msg, "info");

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`
              animate-fade-in pointer-events-auto transform transition-all duration-300
              flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10
              ${t.type === "success" ? "bg-green-950/80 text-green-300 border-green-500/20" : ""}
              ${t.type === "error" ? "bg-red-950/80 text-red-300 border-red-500/20" : ""}
              ${t.type === "info" ? "bg-blue-950/80 text-blue-300 border-blue-500/20" : ""}
            `}
            style={{ maxWidth: "350px", animation: "slideInUp 0.4s ease-out forwards" }}
          >
            <div className="text-xl">
              {t.type === "success" && "✅"}
              {t.type === "error" && "⚠️"}
              {t.type === "info" && "🔔"}
            </div>
            <p className="text-sm font-semibold">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
