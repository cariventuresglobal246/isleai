import React, { useEffect, useMemo, useState } from "react";
import { Instagram } from "lucide-react";

/**
 * Profile.jsx
 * - Works with your Worker endpoints:
 *   GET  /api/auth/facebook/login
 *   GET  /api/auth/facebook/discover-pages?temp_id=...
 *   POST /api/auth/facebook/connect-page   { temp_id, page_id } OR { temp_id, page_url }
 *   GET  /api/auth/facebook/accounts
 *   DELETE /api/auth/facebook/disconnect?page_id=...
 *
 * - No static PAGE_ID
 * - If Meta won't return /me/accounts, user can paste Page URL to connect.
 */

function getApiBase() {
  return (
    (import.meta?.env?.VITE_API_URL ||
      import.meta?.env?.VITE_BACKEND_URL ||
      "").replace(/\/+$/, "") || window.location.origin
  );
}

// Try to find Supabase access token from localStorage
function findSupabaseAccessToken() {
  try {
    const direct =
      localStorage.getItem("access_token") ||
      localStorage.getItem("supabase_access_token") ||
      localStorage.getItem("token");
    if (direct && direct.split(".").length === 3) return direct;

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const token = parsed?.access_token;
        if (token && token.split(".").length === 3) return token;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return data;
}

export default function Profile() {
  const API_BASE = useMemo(() => getApiBase(), []);
  const [token, setToken] = useState(null);

  const [tempId, setTempId] = useState(null);

  const [connected, setConnected] = useState([]);
  const [loadingConnected, setLoadingConnected] = useState(false);

  const [discovering, setDiscovering] = useState(false);
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState("");

  const [pageUrl, setPageUrl] = useState("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  // Init: token + tempId from URL
  useEffect(() => {
    const t = findSupabaseAccessToken();
    setToken(t);

    const params = new URL(window.location.href).searchParams;
    const fbConnect = params.get("fb_connect");
    const error = params.get("error");

    if (error) setErr(`Meta connect error: ${error}`);

    if (fbConnect) {
      setTempId(fbConnect);
      setStatus(`Meta connected. Session: ${fbConnect}`);

      // clean URL (optional)
      params.delete("fb_connect");
      const clean = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", clean);
    }
  }, []);

  const loadConnected = async () => {
    if (!token) return;
    setLoadingConnected(true);
    setErr("");
    try {
      const data = await fetchJson(`${API_BASE}/api/auth/facebook/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConnected(Array.isArray(data?.accounts) ? data.accounts : []);
    } catch (e) {
      setErr(
        `Failed to load connected accounts. ${
          String(e?.message || "").includes("Unauthorized")
            ? "Your session token may be expired — login again."
            : e?.message || ""
        }`
      );
    } finally {
      setLoadingConnected(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadConnected();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Discover pages after OAuth redirect
  const discoverPages = async () => {
    if (!token || !tempId) return;
    setDiscovering(true);
    setErr("");
    setStatus("Discovering Pages from Meta...");
    try {
      const data = await fetchJson(
        `${API_BASE}/api/auth/facebook/discover-pages?temp_id=${encodeURIComponent(tempId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const list = Array.isArray(data?.pages) ? data.pages : [];
      setPages(list);

      if (list.length === 0) {
        setStatus(
          "Meta returned 0 pages for auto-discovery. Paste your Facebook Page URL below to connect manually."
        );
      } else if (list.length === 1) {
        setSelectedPageId(list[0].id);
        setStatus(`Found 1 Page (“${list[0].name || list[0].id}”). Connecting...`);
        await connectByPageId(list[0].id);
      } else {
        setSelectedPageId(list[0].id);
        setStatus(`Found ${list.length} Pages. Select one to connect.`);
      }
    } catch (e) {
      setErr(`Discover failed: ${e?.message || "Unknown error"}`);
    } finally {
      setDiscovering(false);
    }
  };

  useEffect(() => {
    if (!token || !tempId) return;
    discoverPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tempId]);

  const connectByPageId = async (page_id) => {
    if (!token || !tempId) return;
    setBusy(true);
    setErr("");
    try {
      setStatus(`Connecting Page ID: ${page_id} ...`);
      const out = await fetchJson(`${API_BASE}/api/auth/facebook/connect-page`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ temp_id: tempId, page_id }),
      });
      console.log("[connect-page id] result:", out);
      setStatus("Connected successfully. Refreshing...");
      await loadConnected();
      setStatus("Done.");
    } catch (e) {
      setErr(`Connect failed: ${e?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const connectByPageUrl = async () => {
    if (!token || !tempId) return;
    const url = pageUrl.trim();
    if (!url) return;

    setBusy(true);
    setErr("");
    try {
      setStatus("Resolving Page URL and connecting...");
      const out = await fetchJson(`${API_BASE}/api/auth/facebook/connect-page`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ temp_id: tempId, page_url: url }),
      });
      console.log("[connect-page url] result:", out);
      setStatus("Connected successfully. Refreshing...");
      await loadConnected();
      setStatus("Done.");
    } catch (e) {
      setErr(`Connect by URL failed: ${e?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async (pageId) => {
    if (!token) return;
    if (!window.confirm("Disconnect this Page?")) return;

    setBusy(true);
    setErr("");
    try {
      setStatus("Disconnecting...");
      await fetchJson(
        `${API_BASE}/api/auth/facebook/disconnect?page_id=${encodeURIComponent(pageId)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      await loadConnected();
      setStatus("Disconnected.");
    } catch (e) {
      setErr(`Disconnect failed: ${e?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const startConnect = () => {
    window.location.href = `${API_BASE}/api/auth/facebook/login`;
  };

  return (
    <div className="tab-content active" id="profile">
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar-large">A</div>
          <div className="profile-info">
            <h2>Profile</h2>
            <div className="profile-username">Connect Accounts</div>
            <p className="profile-bio">
              Connect your Facebook Page + Instagram business account to enable publishing, analytics, and message
              management.
            </p>
          </div>
        </div>

        {(status || err) && (
          <div style={{ marginTop: "1rem" }}>
            {status && (
              <div
                style={{
                  background: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  padding: "0.75rem",
                  borderRadius: 10,
                  marginBottom: "0.5rem",
                  color: "#1e3a8a",
                }}
              >
                {status}
              </div>
            )}
            {err && (
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  padding: "0.75rem",
                  borderRadius: 10,
                  color: "#9f1239",
                }}
              >
                {err}
              </div>
            )}
          </div>
        )}

        <div className="profile-sections">
          <div className="profile-section">
            <h3>Meta (Facebook + Instagram)</h3>

            {!token && (
              <div style={{ marginBottom: "0.75rem", opacity: 0.85 }}>
                No Supabase session token found. Please login again, then return here.
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={startConnect} disabled={!token || busy}>
                Connect Meta Account
              </button>

              {(busy || discovering || loadingConnected) && (
                <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>Working...</span>
              )}
            </div>

            {/* Multi-page selector */}
            {token && tempId && pages.length > 1 && (
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem" }}>
                  Select a Facebook Page to connect
                </label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    className="profile-input"
                    style={{ maxWidth: 460 }}
                    value={selectedPageId}
                    onChange={(e) => setSelectedPageId(e.target.value)}
                    disabled={busy}
                  >
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name ? `${p.name} (${p.id})` : p.id}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-secondary"
                    onClick={() => connectByPageId(selectedPageId)}
                    disabled={!selectedPageId || busy}
                  >
                    Connect Selected Page
                  </button>
                </div>
              </div>
            )}

            {/* Manual Page URL fallback */}
            {token && tempId && pages.length === 0 && (
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem" }}>
                  Paste your Facebook Page URL (example: https://facebook.com/YourPageName)
                </label>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    className="profile-input"
                    type="text"
                    value={pageUrl}
                    onChange={(e) => setPageUrl(e.target.value)}
                    placeholder="https://facebook.com/YourPageName"
                    style={{ minWidth: 320, maxWidth: 560 }}
                    disabled={busy}
                  />
                  <button className="btn btn-secondary" onClick={connectByPageUrl} disabled={!pageUrl.trim() || busy}>
                    Connect by URL
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={discoverPages}
                    disabled={busy || discovering}
                    title="Try discovery again"
                  >
                    Retry Discovery
                  </button>
                </div>

                <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", opacity: 0.75 }}>
                  If Meta doesn’t return Pages via API, connecting by URL still works and supports all users.
                </div>
              </div>
            )}

            {/* Connected list */}
            <div style={{ marginTop: "1.25rem" }}>
              <h4 style={{ marginBottom: "0.5rem" }}>Connected Accounts</h4>

              {loadingConnected ? (
                <div style={{ opacity: 0.8 }}>Loading...</div>
              ) : connected.length === 0 ? (
                <div style={{ opacity: 0.85 }}>No connected accounts yet.</div>
              ) : (
                <div className="social-accounts">
                  {connected.map((acc) => (
                    <div
                      key={acc.id}
                      className="social-account"
                      style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
                    >
                      <Instagram size={20} color="#667eea" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {acc.name}
                        </div>
                        <div style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                          Page ID: {acc.facebook_page_id}
                          {acc.instagram_username ? ` • IG: @${acc.instagram_username}` : ""}
                        </div>
                      </div>

                      <span className="status connected">Connected</span>

                      <button
                        className="btn btn-secondary"
                        onClick={() => disconnect(acc.facebook_page_id)}
                        style={{ marginLeft: "0.25rem", padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
                        disabled={busy}
                      >
                        Disconnect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Keep your existing Personal Information section if you want */}
          <div className="profile-section">
            <h3>Personal Information</h3>
            <div className="form-group">
              <label>Full Name</label>
              <input className="profile-input" type="text" placeholder="Full Name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="profile-input" type="email" placeholder="Email" />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="profile-input" type="tel" placeholder="Phone" />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input className="profile-input" type="text" placeholder="Location" />
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn btn-primary">Save Changes</button>
          <button className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}
