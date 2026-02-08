import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

export default function ChallengesTab({ S, accessToken, apiBase = "/api/tourist" }) {
  // ✅ 1. Define API URL for the direct table connection
  // We use the TourismEntities router we set up in server.js
  const ENTITIES_API = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api/tourism-entities` 
    : "http://localhost:3000/api/tourism-entities";

  // ✅ 2. Updated Filters to match REAL columns in your 'entity_challenges' table
  // (The generic router filters by matching column names, e.g. ?status=Live)
  const FILTERS = useMemo(
    () => [
      { key: "all", label: "All", params: {} },
      { key: "live", label: "Live Now", params: { status: "Live" } },
      { key: "draft", label: "Drafts", params: { status: "Draft" } },
      { key: "barbados", label: "Barbados", params: { country: "Barbados" } },
    ],
    []
  );

  const [activeFilter, setActiveFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  
  // UI States
  const [modal, setModal] = useState({ open: false, mode: "details", challenge: null });
  const [joined, setJoined] = useState(() => new Set()); 

  // Axios Config with Auth Header
  const axiosConfig = useMemo(() => ({
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  }), [accessToken]);

  // Styles helper
  const filterBtn = (on) => ({
    ...(S.btn || {}),
    ...(on ? S.btnPrimary : {}),
    padding: "10px 12px",
    borderRadius: 12,
  });

  const openModal = (mode, challenge) => setModal({ open: true, mode, challenge });
  const closeModal = () => setModal({ open: false, mode: "details", challenge: null });

  // ✅ 3. Load Data directly from the 'entity_challenges' table
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!accessToken) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const filterObj = FILTERS.find((f) => f.key === activeFilter) || FILTERS[0];
        
        // Build Params
        const params = { ...filterObj.params };
        // If query exists, specific columns must be targeted. 
        // Note: Generic CRUD usually needs specific 'ilike' logic for search.
        // For now, we'll fetch list and filter client-side if needed, 
        // or rely on exact matches if the backend supports it.

        const { data } = await axios.get(`${ENTITIES_API}/entity_challenges`, {
          ...axiosConfig,
          params: params
        });

        if (mounted) {
          // The TourismEntities.js router returns { data: [...] }
          setItems(data.data || []);
        }
      } catch (err) {
        console.error("Failed to load challenges:", err);
        if (mounted) setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => { mounted = false; };
  }, [activeFilter, accessToken, axiosConfig, ENTITIES_API, FILTERS]);

  // ✅ 4. Join/Leave Actions (Keep these on the Tourist Controller)
  // The generic table router doesn't know how to "join" a challenge (business logic).
  const handleAction = async (action, challengeId) => {
    if (!accessToken) return;
    try {
      // e.g. POST /api/tourist/challenges/:id/join
      await axios.post(`${apiBase}/challenges/${challengeId}/${action}`, {}, axiosConfig);
      
      setJoined((prev) => {
        const next = new Set(prev);
        if (action === "join") next.add(challengeId);
        else next.delete(challengeId);
        return next;
      });
    } catch (err) {
      console.error(`${action} failed:`, err);
      alert(`Failed to ${action} challenge. Check console for details.`);
    }
  };

  const renderModalBody = () => {
    const c = modal.challenge;
    if (!c) return null;
    const isJoined = joined.has(c.id);

    if (modal.mode === "details") {
      return (
        <div style={S.modal} onClick={(e) => e.stopPropagation()}>
           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 15 }}>
            <h3 style={{ margin: 0 }}>{c.title}</h3>
            <button style={S.btn} onClick={closeModal}>Close</button>
          </div>
          
          <div style={S.card}>
            {c.image && (
              <img 
                src={c.image} 
                alt={c.title} 
                style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 12, marginBottom: 15 }} 
              />
            )}
            
            <p style={{ ...S.muted, fontSize: 14, lineHeight: 1.5 }}>{c.details || "No details provided."}</p>
            
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "15px 0" }}>
              {c.country && <span style={S.pill}>📍 {c.country}</span>}
              {c.status && <span style={S.pill}>Status: {c.status}</span>}
              {c.prize && <span style={S.pill}>🏆 {c.prize}</span>}
              {c.start_date && <span style={S.pill}>📅 {new Date(c.start_date).toLocaleDateString()}</span>}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {!isJoined ? (
                <button style={S.btnPrimary} onClick={() => handleAction("join", c.id)}>Join Challenge</button>
              ) : (
                <button style={S.btn} onClick={() => handleAction("leave", c.id)}>Leave Challenge</button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const filterLabel = FILTERS.find((f) => f.key === activeFilter)?.label;

  return (
    <>
      {/* HEADER CARD */}
      <div style={S.card}>
        <div style={S.row}>
          <div>
            <h2 style={S.h2}>Challenges</h2>
            <div style={S.muted}>Explore challenges directly from the database.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button 
                key={f.key} 
                style={filterBtn(activeFilter === f.key)} 
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SEARCH & COUNT */}
      <div style={{ margin: "15px 0", display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter local results..."
          style={{ flex: 1, padding: 10, borderRadius: 12, border: "1px solid #e5e7eb" }}
        />
        <span style={S.pill}>{loading ? "Loading..." : `${filterLabel}: ${items.length}`}</span>
      </div>

      {/* CHALLENGE LIST */}
      <div style={{ display: "grid", gap: 15 }}>
        {!loading && items.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: "#888" }}>No challenges found.</div>
        )}

        {items.map((c) => {
          // Client-side simple search filter
          if (query && !c.title.toLowerCase().includes(query.toLowerCase())) return null;

          const isJoined = joined.has(c.id);

          return (
            <div key={c.id} style={S.card}>
              <div style={{ display: "flex", gap: 15 }}>
                {/* Thumbnail */}
                <div style={{ width: 100, height: 100, flexShrink: 0, background: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                  {c.image ? (
                    <img src={c.image} alt="Thumb" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏆</div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{c.title}</div>
                      {c.status && (
                        <span style={{ 
                          fontSize: 11, fontWeight: 700, 
                          color: c.status === 'Live' ? '#166534' : '#64748b',
                          background: c.status === 'Live' ? '#dcfce7' : '#f1f5f9',
                          padding: "2px 8px", borderRadius: 10 
                        }}>
                          {c.status}
                        </span>
                      )}
                    </div>
                    <div style={{ ...S.muted, fontSize: 13, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.details || "No details provided."}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {c.country && <span style={S.pill}>📍 {c.country}</span>}
                      {c.prize && <span style={S.pill}>🎁 {c.prize}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={S.btn} onClick={() => openModal("details", c)}>Details</button>
                      {!isJoined ? (
                        <button style={S.btnPrimary} onClick={() => handleAction("join", c.id)}>Join</button>
                      ) : (
                        <button style={S.btn} onClick={() => handleAction("leave", c.id)}>Leave</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {modal.open && (
        <div style={S.modalBackdrop} onClick={closeModal}>
          {renderModalBody()}
        </div>
      )}
    </>
  );
}