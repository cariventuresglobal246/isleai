import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ✅ FRONTEND Supabase client (anon key)
import { supabase } from "./lib/supabaseClient";

// Tabs
import ChallengesTab from "./touristtabs/ChallengesTab";
import AutoBookingTab from "./touristtabs/AutoBookingTab"; 
import TasksTab from "./touristtabs/TasksTab"; 
import ProgressTab from "./touristtabs/ProgressTab";
import CollaborationTab from "./touristtabs/CollaborationTab";
import AutomationTab from "./touristtabs/AutomationTab";
import MotivationTab from "./touristtabs/MotivationTab";
import SurveyTab from "./touristtabs/SurveyTab";
import MyTrip from "./touristtabs/MyTrip"; 

export default function TouristDashboard() {
  const navigate = useNavigate();

  // ----- UI State -----
  const [activeTab, setActiveTab] = useState("Challenges");
  const [moodOpen, setMoodOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState("chill");
  const [surveyOpen, setSurveyOpen] = useState(false);

  // ✅ Supabase access token (JWT) for Axios -> backend -> Supabase RLS
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    let alive = true;

    // Initial load
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setAccessToken(data?.session?.access_token ?? null);
      })
      .catch((err) => {
        console.error("Supabase getSession error:", err);
      });

    // Listen for login / refresh / logout
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });

    return () => {
      alive = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // ----- Fake Data: Challenges (Kept for reference/fallback) -----
  const challenges = useMemo(
    () => ({
      government: [
        {
          id: "gov-1",
          title: "Clean Coastline Challenge",
          type: "Incentive (Reward)",
          audience: "All",
          region: "Barbados",
          reward: "Free museum pass",
          points: 250,
          description: "Join a beach cleanup, check in, and upload a photo. Earn points + a reward voucher.",
        },
        // ... (rest of your original dummy data kept intact)
      ],
      // ... (other categories)
    }),
    []
  );

  const incentiveLeaderboard = useMemo(
    () => [
      { rank: 1, name: "Barbados Tourism Authority", creatorType: "Gov", points: 8120 },
      { rank: 2, name: "CVG Challenges", creatorType: "CVG", points: 7450 },
      { rank: 3, name: "Island Adventures Co.", creatorType: "Tourism Entity", points: 7010 },
      { rank: 4, name: "Local Eats Collective", creatorType: "Tourism Entity", points: 6220 },
    ],
    []
  );

  const shoppingHunt = useMemo(
    () => [
      {
        item: "Handmade Pottery",
        authenticSpots: [
          { name: "Craft Market (Bridgetown)", price: "$35–$60", note: "Certified local artisans" },
          { name: "St. Lawrence Craft Row", price: "$30–$70", note: "More variety, bargain friendly" },
        ],
        bestValue: "Craft Market (Bridgetown)",
      },
      // ... (rest of shopping data)
    ],
    []
  );

  // ----- Fake Data: Tasks / Kanban -----
  const [tasks, setTasks] = useState(() => [
    {
      id: "t1",
      title: "Book Airport Transfer",
      priority: "Must-Do",
      column: "Planning",
      subtasks: ["Compare options", "Confirm payment", "Save reservation number"],
      recurring: false,
      timeboxMins: 20,
    },
    {
      id: "t2",
      title: "Try Cou-Cou & Flying Fish",
      priority: "Nice-to-Have",
      column: "On Island",
      subtasks: ["Pick restaurant", "Go before 7pm", "Rate meal"],
      recurring: false,
      timeboxMins: 90,
    },
    // ... (rest of tasks)
  ]);

  const kanbanColumns = useMemo(() => ["Planning", "On Island", "Completed", "Wishlist"], []);

  const tripProgress = useMemo(() => {
    const total = tasks.length || 1;
    const done = tasks.filter((t) => t.column === "Completed").length;
    return Math.round((done / total) * 100);
  }, [tasks]);

  // ----- Budget Tracker (Fake) -----
  const [budget] = useState(() => ({
    total: 2500,
    spent: 980,
    categories: [
      { name: "Food", amount: 320 },
      { name: "Transport", amount: 180 },
      { name: "Activities", amount: 410 },
      { name: "Shopping", amount: 70 },
    ],
  }));

  const budgetStatus = useMemo(() => {
    const remaining = budget.total - budget.spent;
    return {
      remaining,
      pct: Math.min(100, Math.round((budget.spent / budget.total) * 100)),
      underOver: remaining >= 0 ? "Under budget" : "Over budget",
    };
  }, [budget]);

  const [notifications, setNotifications] = useState(() => [
    { id: "n1", type: "smart", text: "It’s sunset near the beach you liked — want to go now?" },
    { id: "n2", type: "culture", text: "Tipping prompt: many places appreciate 10% if service isn’t included." },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const samples = [
        "Wellness: Hydrate—today looks warm and active.",
        "Wellness: Re-apply sunscreen if you’ve been outside.",
        "Wellness: Take a rest break—high-activity day detected.",
      ];
      const pick = samples[Math.floor(Math.random() * samples.length)];
      setNotifications((prev) => [{ id: `n-${Date.now()}`, type: "wellness", text: pick }, ...prev].slice(0, 8));
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  const moveTask = (taskId, nextColumn) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, column: nextColumn } : t)));
  };

  const downloadOfflinePack = () => {
    const pack = {
      itinerary: [
        { day: 1, plan: ["Check-in", "Beach walk", "Dinner"] },
        { day: 2, plan: ["Snorkeling", "Local lunch", "Sunset spot"] },
      ],
      tasks,
      maps: ["Offline map placeholder: Barbados hotspots"],
      createdAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "isleai_offline_pack.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ----- UI Styles (Original) -----
  const S = {
    page: {
      width: "100vw",
      height: "100vh",
      background: "#ffffff",
      overflow: "hidden",
      position: "relative",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
      color: "#0f172a",
    },
    topbar: {
      height: 60,
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      background: "#ffffff",
      position: "sticky",
      top: 0,
      zIndex: 10,
    },
    brand: { display: "flex", alignItems: "center", gap: 10 },
    badge: {
      fontSize: 12,
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#f8fafc",
    },
    body: { display: "grid", gridTemplateColumns: "260px 1fr", height: "calc(100vh - 60px)" },
    left: {
      borderRight: "1px solid #e5e7eb",
      padding: 12,
      overflowY: "auto",
      background: "#ffffff",
    },
    main: { padding: 16, overflowY: "auto", background: "#ffffff" },
    card: {
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      background: "#ffffff",
      boxShadow: "0 6px 18px rgba(15,23,42,0.06)",
      padding: 14,
      marginBottom: 14,
    },
    h1: { margin: 0, fontSize: 16, fontWeight: 800 },
    h2: { margin: "0 0 10px 0", fontSize: 14, fontWeight: 800 },
    muted: { color: "#64748b", fontSize: 12 },
    tabs: { display: "grid", gap: 8, marginTop: 10 },
    tabBtn: (on) => ({
      width: "100%",
      textAlign: "left",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: on ? "#eff6ff" : "#ffffff",
      color: on ? "#1d4ed8" : "#0f172a",
      fontWeight: 800,
      cursor: "pointer",
    }),
    row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
    pill: {
      fontSize: 12,
      padding: "4px 10px",
      borderRadius: 999,
      border: "1px solid #e5e7eb",
      background: "#f8fafc",
      fontWeight: 700,
    },
    btn: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      cursor: "pointer",
      fontWeight: 800,
    },
    btnPrimary: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #bfdbfe",
      background: "#eff6ff",
      cursor: "pointer",
      fontWeight: 900,
      color: "#1d4ed8",
    },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.35)",
      display: "grid",
      placeItems: "center",
      zIndex: 5000,
      padding: 16,
    },
    modal: {
      width: "min(720px, 100%)",
      borderRadius: 16,
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
      padding: 16,
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #e5e7eb" },
    td: { padding: "10px 8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
    mini: { fontSize: 12, color: "#64748b" },
    kanban: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
    col: {
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      padding: 10,
      background: "#ffffff",
      minHeight: 220,
    },
    task: {
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 10,
      background: "#f8fafc",
      marginBottom: 10,
    },
    select: {
      padding: "8px 10px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      fontWeight: 700,
    },
  };

  const moodRecommendations = useMemo(() => {
    const base = {
      chill: ["Beach lounge + light snorkeling", "Spa / wellness hour", "Sunset viewpoint + quiet dinner"],
      explore: ["Heritage site tour + local museum", "North coast scenic drive", "Craft market + authentic shopping hunt"],
      party: ["Night market / street food", "Live music venue", "Late-night beach walk (safe zones)"],
    };
    return base[selectedMood] || base.chill;
  }, [selectedMood]);

  const [survey, setSurvey] = useState({
    accommodation: 5,
    activities: 4,
    countryOverall: 5,
    notes: "",
  });

  const renderContent = () => {
    switch (activeTab) {
      case "Challenges":
        return (
          // ✅ FIX: Pass accessToken so real data loads
          <ChallengesTab
            S={S}
            accessToken={accessToken}
            apiBase="/api/tourist"
            // (Old props kept in case you revert to dummy data later)
            challenges={challenges}
            incentiveLeaderboard={incentiveLeaderboard}
            shoppingHunt={shoppingHunt}
          />
        );

      case "My Trip":
        return <MyTrip S={S} accessToken={accessToken} apiBase="/tourist" />;

      case "Autobooking":
        return (
          <AutoBookingTab
            S={S}
            notifications={notifications}
            downloadOfflinePack={downloadOfflinePack}
            onOpenMood={() => setMoodOpen(true)}
          />
        );

      case "Tasks":
        return <TasksTab S={S} tasks={tasks} kanbanColumns={kanbanColumns} moveTask={moveTask} />;

      case "Progress":
        return <ProgressTab S={S} tripProgress={tripProgress} budget={budget} budgetStatus={budgetStatus} />;

      case "Collaboration":
        return <CollaborationTab S={S} />;

      case "Automation":
        return (
          <AutomationTab
            S={S}
            onAddNotification={() =>
              setNotifications((prev) =>
                [
                  { id: `n-${Date.now()}`, type: "smart", text: "Automation: Suggested a new task based on context (demo)." },
                  ...prev,
                ].slice(0, 8)
              )
            }
          />
        );

      case "Motivation":
        return <MotivationTab S={S} />;

      case "Survey":
        return <SurveyTab S={S} onOpenSurvey={() => setSurveyOpen(true)} />;

      default:
        return (
          // ✅ FIX: Default case updated too
          <ChallengesTab
            S={S}
            accessToken={accessToken}
            apiBase="/api/tourist"
            challenges={challenges}
            incentiveLeaderboard={incentiveLeaderboard}
            shoppingHunt={shoppingHunt}
          />
        );
    }
  };

  return (
    <div style={S.page}>
      <header style={S.topbar}>
        <div style={S.brand}>
          <button
            onClick={() => navigate("/baje")}
            title="Return to Baje"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            ←
          </button>
        </div>

        <div style={S.row}>
          <button style={S.btn} onClick={() => setMoodOpen(true)}>
            Mood Suggestions
          </button>

          <button style={S.btnPrimary} onClick={() => setSurveyOpen(true)}>
            End-of-Trip Survey
          </button>
        </div>
      </header>

      <div style={S.body}>
        <aside style={S.left}>
          <div style={S.card}>
            <div style={S.tabs}>
              {[
                ["My Trip", "Autobooking + Tasks + Calendar (combined)"],
                ["Challenges", "Incentives + territory + leaderboards"],
                ["Collaboration", "Groups + approvals + decisions + spending + group challenges"],
              ].map(([key, desc]) => (
                <button
                  key={key}
                  style={S.tabBtn(activeTab === key)}
                  onClick={() => setActiveTab(key)}
                  title={desc}
                >
                  {key}
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginTop: 4 }}>{desc}</div>
                </button>
              ))}
            </div>

            <div style={{ marginTop: 10, ...S.muted }}>
              Auth: {accessToken ? "✅ session active" : "— not logged in"}
            </div>
          </div>
        </aside>

        <main style={S.main}>{renderContent()}</main>
      </div>

      {/* Mood Popup */}
      {moodOpen && (
        <div style={S.modalBackdrop} onClick={() => setMoodOpen(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>Mood-based Suggestions</div>
                <div style={S.muted}>Choose a mood and get instant recommendations (fake data).</div>
              </div>

              <button style={S.btn} onClick={() => setMoodOpen(false)}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["chill", "explore", "party"].map((m) => (
                <button key={m} style={m === selectedMood ? S.btnPrimary : S.btn} onClick={() => setSelectedMood(m)}>
                  {m === "chill" ? "Chill day" : m === "explore" ? "Explore day" : "Party night"}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, ...S.card }}>
              <h2 style={S.h2}>Recommendations</h2>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {moodRecommendations.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 10, ...S.muted }}>Later: hook these into your itinerary + maps + booking engine.</div>
          </div>
        </div>
      )}

      {/* End-of-Trip Survey Modal */}
      {surveyOpen && (
        <div style={S.modalBackdrop} onClick={() => setSurveyOpen(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>Trip Survey</div>
                <div style={S.muted}>Rate accommodations, activities, and the country overall.</div>
              </div>

              <button style={S.btn} onClick={() => setSurveyOpen(false)}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div style={S.card}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Accommodations</div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={survey.accommodation}
                  onChange={(e) => setSurvey((s) => ({ ...s, accommodation: Number(e.target.value) }))}
                  style={{ width: "100%" }}
                />
                <div style={S.muted}>Rating: {survey.accommodation}/5</div>
              </div>

              <div style={S.card}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Activities</div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={survey.activities}
                  onChange={(e) => setSurvey((s) => ({ ...s, activities: Number(e.target.value) }))}
                  style={{ width: "100%" }}
                />
                <div style={S.muted}>Rating: {survey.activities}/5</div>
              </div>

              <div style={S.card}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Country Overall</div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={survey.countryOverall}
                  onChange={(e) => setSurvey((s) => ({ ...s, countryOverall: Number(e.target.value) }))}
                  style={{ width: "100%" }}
                />
                <div style={S.muted}>Rating: {survey.countryOverall}/5</div>
              </div>

              <div style={S.card}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Notes</div>
                <textarea
                  value={survey.notes}
                  onChange={(e) => setSurvey((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Tell us what you loved, what could improve, and any safety notes..."
                  style={{
                    width: "100%",
                    minHeight: 90,
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    padding: 10,
                    fontWeight: 600,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button style={S.btn} onClick={() => setSurveyOpen(false)}>
                  Cancel
                </button>
                <button style={S.btnPrimary} onClick={() => setSurveyOpen(false)}>
                  Submit Survey
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
