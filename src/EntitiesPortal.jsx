// src/EntitiesPortal.jsx
import React, { useState, useCallback } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

// Child Components
import AccommodationProvider from "./AccommodationProvider";
import ActivitiesProvider from "./ActivitiesProvider";
import Government from "./Government";

const ROLES = {
  ACCOMMODATION: "Accommodation Provider",
  ACTIVITIES: "Activities Provider",
  GOVERNMENT: "Government",
};

const ROLE_META = {
  [ROLES.ACCOMMODATION]: {
    badge: "Entities • Accommodation",
    tabs: ["Bookings", "Calendar", "Reviews", "Advice (AI)", "Analytics", "Action Plans"],
  },
  [ROLES.ACTIVITIES]: {
    badge: "Entities • Activities",
    tabs: ["Bookings", "Calendar", "Activities", "Reviews", "Advice (AI)", "Challenges", "Collaboration", "Analytics", "Action Plans"],
  },
  [ROLES.GOVERNMENT]: {
    badge: "Entities • Government",
    tabs: ["Challenges", "Collaboration", "Directory", "Analytics", "Problems", "Action Plans"],
  },
};

export default function EntitiesPortal() {
  const { user, loading: authLoading } = useAuth();
  
  // Base URL
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const TOURISM_API = `${API_URL}/api/tourism-entities`;

  // UI State
  const [role, setRole] = useState(ROLES.ACCOMMODATION);
  const [activeTab, setActiveTab] = useState(ROLE_META[ROLES.ACCOMMODATION].tabs[0]);
  const [roleToggleOpen, setRoleToggleOpen] = useState(false);
  const [apiError, setApiError] = useState("");

  // --------- Shared API Helper ----------
  const fetchAPI = useCallback(
    async (endpoint, method = "GET", body = null) => {
      setApiError("");
      const token = localStorage.getItem('access_token');

      try {
        const response = await axios({
          url: `${TOURISM_API}${endpoint}`,
          method,
          withCredentials: true, 
          headers: { 
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` }) 
          },
          data: body,
        });
        return response.data?.data ?? [];
      } catch (err) {
        const status = err.response?.status;
        const errorMsg = err.response?.data?.error || err.message || "Request failed";
        console.error(`API Error (${method} ${endpoint})`, errorMsg);

        if (status === 401 || status === 403) {
          setApiError("Not authorized. Please log in again.");
        } else {
          setApiError(errorMsg);
        }
        return null;
      }
    },
    [TOURISM_API]
  );

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setActiveTab(ROLE_META[newRole].tabs[0]);
  };

  if (authLoading) return <div style={{...S.page, display:'flex', justifyContent:'center', alignItems:'center'}}>Loading...</div>;
  if (!user) return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ ...S.card, maxWidth: 520 }}>
        <div style={{ fontWeight: 1000, fontSize: 18 }}>You’re not logged in</div>
        <div style={{ marginTop: 8, color: "#64748b", fontWeight: 700 }}>Please sign in.</div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.badge}>{ROLE_META[role].badge}</div>
          <div style={S.muted}>Entities Portal</div>
        </div>
        <div style={S.row}>
          <button style={S.btnPrimary} onClick={() => setRoleToggleOpen((v) => !v)}>
            {roleToggleOpen ? "Hide Role Toggle" : "Switch Role"}
          </button>
        </div>
      </header>

      {/* Role Toggle Overlay */}
      {roleToggleOpen && (
        <div style={S.topToggleWrap}>
          <div style={S.topTogglePanel}>
            <div style={S.topToggleHeader}>
              <div style={{ fontWeight: 1000 }}>Role Switcher</div>
              <button style={S.btn} onClick={() => setRoleToggleOpen(false)}>Close</button>
            </div>
            <div style={S.topToggleBody}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={S.pill}>Current: {role}</span>
                <select style={S.select} value={role} onChange={(e) => handleRoleChange(e.target.value)}>
                  {Object.values(ROLES).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <div style={S.body}>
        {/* Sidebar */}
        <aside style={S.left}>
          <div style={S.card}>
            <div style={{ fontWeight: 1000 }}>{role}</div>
            <div style={S.tabs}>
              {ROLE_META[role].tabs.map((t) => (
                <button key={t} style={S.tabBtn(activeTab === t)} onClick={() => setActiveTab(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Dynamic Content */}
        <main style={S.main}>
          {apiError ? <div style={S.alert}>{apiError}</div> : null}
          
          {role === ROLES.ACCOMMODATION && (
            <AccommodationProvider fetchAPI={fetchAPI} user={user} activeTab={activeTab} S={S} />
          )}
          {role === ROLES.ACTIVITIES && (
            <ActivitiesProvider fetchAPI={fetchAPI} user={user} activeTab={activeTab} S={S} />
          )}
          {role === ROLES.GOVERNMENT && (
            <Government fetchAPI={fetchAPI} user={user} activeTab={activeTab} S={S} />
          )}
        </main>
      </div>
    </div>
  );
}

// --------- SHARED STYLES ---------
const S = {
  page: { width: "100vw", height: "100vh", background: "#ffffff", overflow: "hidden", position: "relative", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", color: "#0f172a" },
  topbar: { height: 60, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "#ffffff", position: "sticky", top: 0, zIndex: 10 },
  badge: { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f8fafc", fontWeight: 800 },
  body: { display: "grid", gridTemplateColumns: "280px 1fr", height: "calc(100vh - 60px)" },
  left: { borderRight: "1px solid #e5e7eb", padding: 12, overflowY: "auto", background: "#ffffff" },
  main: { padding: 16, overflowY: "auto", background: "#ffffff" },
  card: { border: "1px solid #e5e7eb", borderRadius: 14, background: "#ffffff", boxShadow: "0 6px 18px rgba(15,23,42,0.06)", padding: 14, marginBottom: 14 },
  h2: { margin: "0 0 10px 0", fontSize: 14, fontWeight: 900 },
  muted: { color: "#64748b", fontSize: 12 },
  row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  btn: { padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: "#ffffff", cursor: "pointer", fontWeight: 900 },
  btnPrimary: { padding: "10px 12px", borderRadius: 12, border: "1px solid #bfdbfe", background: "#eff6ff", cursor: "pointer", fontWeight: 900, color: "#1d4ed8" },
  tabs: { display: "grid", gap: 8, marginTop: 10 },
  tabBtn: (on) => ({ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", background: on ? "#eff6ff" : "#ffffff", color: on ? "#1d4ed8" : "#0f172a", fontWeight: 900, cursor: "pointer" }),
  pill: { fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid #e5e7eb", background: "#f8fafc", fontWeight: 800 },
  input: { padding: "10px 10px", borderRadius: 12, border: "1px solid #e5e7eb", fontWeight: 800, width: "100%", background: "#ffffff" },
  select: { padding: "10px 10px", borderRadius: 12, border: "1px solid #e5e7eb", fontWeight: 900, background: "#ffffff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb" },
  td: { padding: "10px 8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
  split: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  topToggleWrap: { position: "absolute", top: 60, left: 0, right: 0, zIndex: 50, pointerEvents: "none" },
  topTogglePanel: { pointerEvents: "auto", margin: "0 auto", width: "min(980px, calc(100% - 24px))", border: "1px solid #e5e7eb", borderRadius: 14, background: "#ffffff", boxShadow: "0 10px 30px rgba(15,23,42,0.12)", overflow: "hidden" },
  topToggleHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottom: "1px solid #f1f5f9", background: "#ffffff" },
  topToggleBody: { padding: 12, background: "#ffffff" },
  alert: { border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 12, padding: 12, fontWeight: 800, color: "#9f1239", marginBottom: 14 },
};