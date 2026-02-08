import React, { useEffect, useMemo, useState } from "react";

/**
 * AutoBookingTab
 * - Now supports pulling notifications from your Cloudflare Worker via VITE_API_URL
 *   if `notifications` prop is not provided (or is empty).
 * - Backwards compatible: if you already pass `notifications`, nothing changes.
 */

function normalizeApiBase(raw) {
  const v = String(raw || "").trim();
  if (!v) return "";
  // Add protocol if missing
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  // Remove trailing slash(es)
  return withProto.replace(/\/+$/, "");
}

export default function AutoBookingTab({
  S,
  notifications: notificationsProp,
  downloadOfflinePack,
  onOpenMood,
  // Optional: provide a shared fetch helper from parent (preferred)
  fetchAPI,
}) {
  const API_BASE = useMemo(() => normalizeApiBase(import.meta.env.VITE_API_URL), []);

  const [notifications, setNotifications] = useState(Array.isArray(notificationsProp) ? notificationsProp : []);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");

  // Keep in sync if parent provides notifications later
  useEffect(() => {
    if (Array.isArray(notificationsProp) && notificationsProp.length) {
      setNotifications(notificationsProp);
      setNotesError("");
    }
  }, [notificationsProp]);

  // If none provided, try load from Worker
  useEffect(() => {
    const hasProvided = Array.isArray(notificationsProp) && notificationsProp.length > 0;
    if (hasProvided) return;
    if (!API_BASE) return; // env not set; silently skip

    let cancelled = false;

    const run = async () => {
      try {
        setLoadingNotes(true);
        setNotesError("");

        const res = fetchAPI
          ? await fetchAPI("/api/notifications", { method: "GET" })
          : await fetch(`${API_BASE}/api/notifications`, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            });

        // fetchAPI may already return parsed json in some codebases; handle both
        const payload = typeof res?.json === "function" ? await res.json() : res;

        if (cancelled) return;

        const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setNotifications(list);
      } catch (e) {
        if (!cancelled) setNotesError(e?.message || "Failed to load notifications");
      } finally {
        if (!cancelled) setLoadingNotes(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, fetchAPI, notificationsProp]);

  return (
    <>
      <div style={S.card}>
        <h2 style={S.h2}>Autobooking & Wellness</h2>
        <div style={S.muted}>Pre-booking, reminders, safety, offline</div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Offline Access</h2>
        <button style={S.btnPrimary} onClick={downloadOfflinePack}>
          Download Offline Pack
        </button>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Smart Notifications</h2>

        {loadingNotes && <div style={S.muted}>Loading…</div>}
        {notesError && <div style={{ ...S.muted, color: "#b91c1c" }}>{notesError}</div>}

        {(notifications || []).length === 0 && !loadingNotes ? (
          <div style={S.muted}>No notifications yet.</div>
        ) : (
          (notifications || []).map((n, idx) => (
            <div key={n?.id || idx} style={{ marginBottom: 8 }}>
              <strong>{n?.type || "Info"}</strong>: {n?.text || ""}
            </div>
          ))
        )}
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>Mood-based Suggestions</h2>
        <button style={S.btnPrimary} onClick={onOpenMood}>
          Open Mood Popup
        </button>
      </div>
    </>
  );
}
