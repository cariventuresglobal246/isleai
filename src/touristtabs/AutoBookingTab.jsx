import React from "react";

export default function AutoBookingTab({ S, notifications, downloadOfflinePack, onOpenMood }) {
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
        {notifications.map((n) => (
          <div key={n.id} style={{ marginBottom: 8 }}>
            <strong>{n.type}</strong>: {n.text}
          </div>
        ))}
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
