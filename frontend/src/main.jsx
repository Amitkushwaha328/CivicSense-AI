import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import App from "./App.jsx";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!clientId || clientId === "YOUR_GOOGLE_CLIENT_ID") {
  console.warn("⚠️ Google Client ID is missing! Login will fail. Set VITE_GOOGLE_CLIENT_ID in your environment.");
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId || "empty"}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);