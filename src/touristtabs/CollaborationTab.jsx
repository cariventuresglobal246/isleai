import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  subscribeDecisionRealtime,
  applyVotePayload,
  voteDecision,
} from "../realtime/decisionRealtime";
import {
  subscribeGroupExpensesRealtime,
  applyExpensePayload,
  addGroupExpense,
} from "../realtime/expenseRealtime";

/* =========================================================================
   ModalCard
========================================================================= */
const ModalCard = ({ title, subtitle, children, onClose, S, btnBase }) => (
  <div
    style={S.modal}
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 1000, fontSize: 16 }}>{title}</div>
        {subtitle && <div style={S.muted}>{subtitle}</div>}
      </div>
      <button type="button" style={btnBase} onClick={onClose}>
        Close
      </button>
    </div>

    <div>{children}</div>
  </div>
);

export default function CollaborationTab({ S = {}, groupId: groupIdProp }) {
  /* =========================
     Safe Styles
  ========================= */
  const safeS = {
    card: {
      padding: 16,
      border: "1px solid #e5e7eb",
      marginBottom: 16,
      background: "#ffffff",
      borderRadius: 12,
      ...S?.card,
    },
    modal: {
      padding: 24,
      background: "white",
      borderRadius: 16,
      maxWidth: 500,
      margin: "auto",
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      ...S?.modal,
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
      ...S?.grid2,
    },
    modalBackdrop: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      ...S?.modalBackdrop,
    },
    h2: { fontSize: 18, fontWeight: 800, margin: 0, color: "#111827", ...S?.h2 },
    muted: { color: "#6b7280", fontSize: 13, ...S?.muted },
    mini: { fontSize: 12, color: "#9ca3af", ...S?.mini },
    pill: {
      padding: "4px 10px",
      borderRadius: 20,
      fontSize: 12,
      background: "#f3f4f6",
      fontWeight: 700,
      color: "#374151",
      ...S?.pill,
    },
    select: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      fontWeight: 600,
      width: "100%",
      boxSizing: "border-box",
      background: "#fff",
      ...S?.select,
    },
    table: { width: "100%", borderCollapse: "collapse", ...S?.table },
    th: {
      textAlign: "left",
      padding: "10px 8px",
      borderBottom: "1px solid #e5e7eb",
      fontSize: 13,
      color: "#6b7280",
      fontWeight: 700,
      ...S?.th,
    },
    td: {
      padding: "10px 8px",
      borderBottom: "1px solid #f3f4f6",
      fontSize: 14,
      fontWeight: 600,
      color: "#1f2937",
      ...S?.td,
    },
    toast: S?.toast || ((msg) => alert(msg)),
  };

  const toast = safeS.toast;

  const btnBase =
    S?.btn || ({
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 13,
    });

  const btnPrimary =
    S?.btnPrimary || ({
      ...btnBase,
      border: "1px solid #bfdbfe",
      background: "#eff6ff",
      color: "#1d4ed8",
      fontWeight: 800,
    });

  const avatar = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    color: "#0f172a",
    userSelect: "none",
  };

  /* =========================
     Group selection helper
  ========================= */
  const [userId, setUserId] = useState(null);
  const [groupId, setGroupId] = useState(
    groupIdProp || localStorage.getItem("activeGroupId") || null
  );

  const setActiveGroup = (gid) => {
    if (!gid) return;
    setGroupId(gid);
    localStorage.setItem("activeGroupId", gid);
  };

  useEffect(() => {
    if (groupIdProp) setActiveGroup(groupIdProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdProp]);

  /* =========================
     Auth + initial group resolution
  ========================= */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error(error);

      const uid = data?.user?.id || null;
      if (!mounted) return;
      setUserId(uid);

      // If no active group stored yet, pick most recently joined group
      if (!groupId && uid) {
        const r = await supabase
          .schema("tourism_features")
          .from("group_members")
          .select("group_id, joined_at")
          .eq("user_id", uid)
          .order("joined_at", { ascending: false })
          .limit(1);

        const gid = r.data?.[0]?.group_id || null;
        if (gid) setActiveGroup(gid);
      }
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================
     UI State
  ========================= */
  const [membersOpen, setMembersOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createChallengeOpen, setCreateChallengeOpen] = useState(false);
  const [addDecisionOpen, setAddDecisionOpen] = useState(false);
  const [voteModalOpen, setVoteModalOpen] = useState(false);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [activeLeaderboardChallenge, setActiveLeaderboardChallenge] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeDetailsChallenge, setActiveDetailsChallenge] = useState(null);

  const [groupsModalOpen, setGroupsModalOpen] = useState(false);
  const [createGroupMode, setCreateGroupMode] = useState(false);
  const [myGroups, setMyGroups] = useState([]);

  const [newGroupForm, setNewGroupForm] = useState({
    name: "",
    destination: "",
    trip_start: "",
    trip_end: "",
  });

  /* =========================
     Data State
  ========================= */
  const [members, setMembers] = useState([]);
  const [sharedActivities, setSharedActivities] = useState([]);
  const [decisions, setDecisions] = useState([]);

  const [budget, setBudget] = useState(0);
  const [expenseState, setExpenseState] = useState({ expenses: [], totalSpent: 0 });

  const totalSpent = useMemo(
    () => Number(expenseState.totalSpent || 0),
    [expenseState.totalSpent]
  );
  const remaining = useMemo(
    () => Number(budget || 0) - totalSpent,
    [budget, totalSpent]
  );

  const [expenseForm, setExpenseForm] = useState({
    who: "",
    item: "",
    amount: "",
    date: "Today",
  });

  useEffect(() => {
    if (userId) setExpenseForm((prev) => ({ ...prev, who: userId }));
  }, [userId]);

  /* =========================
     Decision State
  ========================= */
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    starts_at: "",
    location: "",
    notes: "",
  });

  const [activeDecision, setActiveDecision] = useState(null);
  const [decisionState, setDecisionState] = useState({
    me: null,
    counts: {},
    myVoteOptionId: null,
  });

  useEffect(() => {
    setDecisionState((s) => ({ ...s, me: userId || null }));
  }, [userId]);

  const decisionUnsubRef = useRef(null);

  /* =========================
     Member Search
  ========================= */
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearching, setMemberSearching] = useState(false);

  /* =========================
     Challenges State
  ========================= */
  const [groupChallenges, setGroupChallenges] = useState([]);

  const [challengeForm, setChallengeForm] = useState({
    title: "",
    reward: "",
    description: "",
    duration: "24",
  });

  /* =========================
     Timers
  ========================= */
  const [timers, setTimers] = useState({});

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const newTimers = {};

      groupChallenges.forEach((c) => {
        if (c.joined && c.expiresAt) {
          const diff = new Date(c.expiresAt).getTime() - now;
          if (diff <= 0) {
            newTimers[c.id] = "Expired";
          } else {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            newTimers[c.id] = `${h}h ${m}m left`;
          }
        }
      });

      setTimers(newTimers);
    };

    // ✅ run immediately (no 60s “delay”)
    tick();

    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [groupChallenges]);

  /* =========================
     ✅ FIXED: loadChallenges
     - Does NOT bail if userId isn't ready (prevents disappearing on refresh)
     - If userId exists, merges membership status
  ========================= */
  const loadChallenges = async (gid = groupId, uid = userId) => {
    if (!gid) return;

    const { data: cData, error: cErr } = await supabase
      .schema("tourism_features")
      .from("group_challenges")
      .select("*")
      .eq("group_id", gid)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (cErr) {
      console.error(cErr);
      return;
    }

    if (!cData || cData.length === 0) {
      setGroupChallenges([]);
      return;
    }

    // If user isn't loaded yet, show all as "Open"
    if (!uid) {
      setGroupChallenges(
        cData.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          reward: c.reward || "—",
          duration: c.duration_hours || 24,
          audience: c.audience || "Group",
          createdBy: "Member",
          status: "Open",
          joined: false,
          expiresAt: null,
        }))
      );
      return;
    }

    const cIds = cData.map((c) => c.id);
    const { data: pData, error: pErr } = await supabase
      .schema("tourism_features")
      .from("group_challenge_memberships")
      .select("*")
      .in("group_challenge_id", cIds)
      .eq("user_id", uid);

    if (pErr) console.error(pErr);

    const participationMap = new Map();
    (pData || []).forEach((p) => participationMap.set(p.group_challenge_id, p));

    // ✅ Hide challenges the user declined (so they don't reappear after refresh)
    const merged = cData
      .map((c) => {
        const myPart = participationMap.get(c.id);

        if (myPart?.status === "declined") return null;

        const isJoined = myPart?.status === "joined";

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          reward: c.reward || "—",
          duration: c.duration_hours || 24,
          audience: c.audience || "Group",
          createdBy: "Member",
          status: isJoined ? "Joined" : "Open",
          joined: isJoined,
          expiresAt: myPart?.expires_at || null,
        };
      })
      .filter(Boolean);

    setGroupChallenges(merged);
  };

  const createGroupChallenge = async () => {
    if (!groupId || !userId) return toast("Please log in.");
    if (!challengeForm.title.trim()) return toast("Title is required.");

    const { error } = await supabase
      .schema("tourism_features")
      .from("group_challenges")
      .insert({
        group_id: groupId,
        title: challengeForm.title.trim(),
        description: challengeForm.description.trim(),
        reward: challengeForm.reward.trim(),
        duration_hours: Number(challengeForm.duration) || 24,
        created_by: userId,
        status: "active",
      });

    if (error) {
      console.error(error);
      return toast(`Failed to create: ${error.message}`);
    }

    toast("Challenge created!");
    setCreateChallengeOpen(false);
    setChallengeForm({ title: "", reward: "", description: "", duration: "24" });
    loadChallenges(groupId, userId);
  };

  /* =========================
     ✅ FIXED: Join uses UPSERT so it persists and won't fail on duplicate
  ========================= */
  const handleJoinChallenge = async (challengeId) => {
    if (!userId) return toast("Please log in.");

    const challenge = groupChallenges.find((c) => c.id === challengeId);
    if (!challenge) return;

    const expires = new Date();
    expires.setHours(expires.getHours() + (challenge.duration || 24));

    // Optimistic update
    setGroupChallenges((prev) =>
      prev.map((c) =>
        c.id === challengeId
          ? { ...c, joined: true, expiresAt: expires.toISOString(), status: "Joined" }
          : c
      )
    );

    const { error } = await supabase
      .schema("tourism_features")
      .from("group_challenge_memberships")
      .upsert(
        {
          group_challenge_id: challengeId,
          user_id: userId,
          expires_at: expires.toISOString(),
          status: "joined",
        },
        { onConflict: "group_challenge_id,user_id" }
      );

    if (error) {
      console.error("Join challenge failed:", error);
      toast(`Failed to join: ${error.message}`);
      loadChallenges(groupId, userId); // revert to DB truth
      return;
    }

    toast("Joined successfully!");
    loadChallenges(groupId, userId);
  };

  const handleDeclineChallenge = async (challengeId) => {
    if (!userId) return toast("Please log in.");

    // Optimistic hide
    const prev = groupChallenges;
    setGroupChallenges((list) => list.filter((c) => c.id !== challengeId));
    toast("Challenge declined.");

    const { error } = await supabase
      .schema("tourism_features")
      .from("group_challenge_memberships")
      .upsert(
        {
          group_challenge_id: challengeId,
          user_id: userId,
          status: "declined",
          expires_at: null,
          progress: "0%",
        },
        { onConflict: "group_challenge_id,user_id" }
      );

    if (error) {
      console.error("Decline challenge failed:", error);
      toast(`Decline failed: ${error.message}`);
      setGroupChallenges(prev);
      loadChallenges(groupId, userId);
      return;
    }

    loadChallenges(groupId, userId);
  };

  const openLeaderboard = (challenge) => {
    setActiveLeaderboardChallenge(challenge);
    setLeaderboardOpen(true);
  };

  const openDetails = (challenge) => {
    setActiveDetailsChallenge(challenge);
    setDetailsOpen(true);
  };

  const friendsLeaderboard = useMemo(
    () => [
      { rank: 1, name: "Aaliyah", progress: "7/12", streak: "3 days", points: 1280 },
      { rank: 2, name: "Jordan", progress: "6/12", streak: "2 days", points: 1140 },
      { rank: 3, name: "You", progress: "5/12", streak: "1 day", points: 980 },
      { rank: 4, name: "Kyle", progress: "4/12", streak: "1 day", points: 860 },
    ],
    []
  );

  /* =========================
     Majority Threshold
  ========================= */
  const requiredMajority = useMemo(() => {
    const n = Number(members?.length || 0);
    return n ? Math.floor(n / 2) + 1 : 0;
  }, [members]);

  const activeDecisionRef = useRef(null);
  useEffect(() => {
    activeDecisionRef.current = activeDecision;
  }, [activeDecision]);

  const requiredMajorityRef = useRef(0);
  useEffect(() => {
    requiredMajorityRef.current = requiredMajority;
  }, [requiredMajority]);

  const resolvingRef = useRef(new Set());

  const encodeDecisionQuestion = (meta) => {
    const title = String(meta?.title || "").trim();
    const starts_at = String(meta?.starts_at || "");
    const location = String(meta?.location || "").trim();
    const notes = String(meta?.notes || "").trim();
    return `${title}||${starts_at}||${location}||${notes}`;
  };

  const decodeDecisionQuestion = (question) => {
    const parts = String(question || "").split("||");
    return {
      title: (parts[0] || "").trim() || String(question || "").trim() || "Decision",
      starts_at: parts[1] || "",
      location: (parts[2] || "").trim(),
      notes: (parts[3] || "").trim(),
      raw: String(question || ""),
    };
  };

  /* =========================
     Groups
  ========================= */
  const loadMyGroups = async () => {
    if (!userId) return;
    const mR = await supabase
      .schema("tourism_features")
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);

    if (mR.error) return console.error(mR.error);

    const gids = (mR.data || []).map((x) => x.group_id);
    if (!gids.length) {
      setMyGroups([]);
      return;
    }

    const gR = await supabase
      .schema("tourism_features")
      .from("groups")
      .select("*")
      .in("id", gids)
      .order("created_at", { ascending: false });

    if (gR.error) return console.error(gR.error);
    setMyGroups(gR.data || []);
  };

  const createGroup = async () => {
    const uid = userId || (await supabase.auth.getUser()).data?.user?.id || null;
    if (!uid) return toast("Please log in.");

    const { name, destination, trip_start, trip_end } = newGroupForm;
    if (!name || !name.trim()) return toast("Group Name is required.");

    const gR = await supabase
      .schema("tourism_features")
      .from("groups")
      .insert({
        name: name.trim(),
        destination: destination.trim() || null,
        trip_start: trip_start || null,
        trip_end: trip_end || null,
        created_by: uid,
      })
      .select("id")
      .single();

    if (gR.error) return toast(`Create group failed: ${gR.error.message}`);

    const gid = gR.data.id;

    const mR = await supabase
      .schema("tourism_features")
      .from("group_members")
      .insert({ group_id: gid, user_id: uid, role: "owner" });

    if (mR.error) return toast(`Join group failed: ${mR.error.message}`);

    setActiveGroup(gid);
    setCreateGroupMode(false);
    setNewGroupForm({ name: "", destination: "", trip_start: "", trip_end: "" });
    setGroupsModalOpen(false);
    toast("Group created and selected.");
    loadAll(gid, uid);
  };

  /* =========================
     Loaders
  ========================= */
  const loadMembers = async (gid = groupId) => {
    if (!gid) return;

    const mR = await supabase
      .schema("tourism_features")
      .from("group_members")
      .select("user_id, role, joined_at")
      .eq("group_id", gid);

    if (mR.error) {
      setMembers([]);
      return;
    }

    const ids = (mR.data || []).map((m) => m.user_id);

    let pData = [];
    if (ids.length) {
      const pR = await supabase
        .from("profiles")
        .select("id, username, display_name, email, avatar_url")
        .in("id", ids);

      pData = pR.data || [];
    }

    const profileBy = new Map(pData.map((p) => [p.id, p]));

    setMembers(
      (mR.data || []).map((m) => {
        const p = profileBy.get(m.user_id) || {};
        const name = p.display_name || p.username || p.email || m.user_id;
        const initials =
          String(name || "?")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join("") || "?";

        return {
          id: m.user_id,
          name,
          username: p.username || "user",
          initials,
          role: m.role,
          email: p.email || null,
          avatar_url: p.avatar_url || null,
        };
      })
    );
  };

  const loadActivities = async (gid = groupId) => {
    if (!gid) return;

    const aR = await supabase
      .schema("tourism_features")
      .from("group_activities")
      .select("*")
      .eq("group_id", gid)
      .order("created_at", { ascending: false })
      .limit(100);

    if (aR.error) {
      setSharedActivities([]);
      return;
    }

    setSharedActivities(
      (aR.data || []).map((row) => ({
        id: row.id,
        title: row.title || "Activity",
        when: row.starts_at ? new Date(row.starts_at).toLocaleString() : "—",
        where: row.location || "—",
        who: [],
        status: row.status || "proposed",
        notes: row.notes || "",
      }))
    );
  };

  const fetchVoteSnapshot = async (decisionId) => {
    const vR = await supabase
      .schema("tourism_features")
      .from("group_decision_votes")
      .select("option_id, user_id")
      .eq("decision_id", decisionId);

    if (vR.error) return null;

    const counts = (vR.data || []).reduce((acc, r) => {
      acc[r.option_id] = (acc[r.option_id] || 0) + 1;
      return acc;
    }, {});

    const myVote =
      (vR.data || []).find((r) => r.user_id === userId)?.option_id || null;

    return { counts, myVote };
  };

  const resolveDecisionIfMajority = async (decision, countsOverride) => {
    try {
      if (!decision?.id || !groupId || !userId) return;

      const maj = Number(requiredMajorityRef.current || 0);
      if (!maj) return;
      if (resolvingRef.current.has(decision.id)) return;

      const opts = decision.options || [];
      const yesOpt = opts.find(
        (o) => String(o.label || "").toLowerCase() === "yes"
      );
      const noOpt = opts.find(
        (o) => String(o.label || "").toLowerCase() === "no"
      );
      if (!yesOpt || !noOpt) return;

      const yesVotes = Number(countsOverride?.[yesOpt.id] ?? yesOpt.votes ?? 0);
      const noVotes = Number(countsOverride?.[noOpt.id] ?? noOpt.votes ?? 0);

      if (yesVotes < maj && noVotes < maj) return;

      resolvingRef.current.add(decision.id);

      const { data: row, error: readErr } = await supabase
        .schema("tourism_features")
        .from("group_decisions")
        .select("id,status,question")
        .eq("id", decision.id)
        .single();

      if (readErr || row?.status !== "open") {
        resolvingRef.current.delete(decision.id);
        return;
      }

      if (yesVotes >= maj) {
        await supabase
          .schema("tourism_features")
          .from("group_decisions")
          .update({
            status: "approved",
            approved_option_id: yesOpt.id,
            approved_by: userId,
            approved_at: new Date().toISOString(),
          })
          .eq("id", decision.id);

        const meta = decision.meta || decodeDecisionQuestion(row.question);

        await supabase
          .schema("tourism_features")
          .from("group_activities")
          .insert({
            group_id: groupId,
            title: meta.title || "Activity",
            starts_at: meta.starts_at
              ? new Date(meta.starts_at).toISOString()
              : null,
            location: meta.location || null,
            notes: meta.notes || null,
            created_by: userId,
          });

        resolvingRef.current.delete(decision.id);
        await Promise.all([loadActivities(), loadDecisions()]);
        return;
      }

      if (noVotes >= maj) {
        await supabase
          .schema("tourism_features")
          .from("group_decisions")
          .update({ status: "declined" })
          .eq("id", decision.id);

        resolvingRef.current.delete(decision.id);
        await loadDecisions();
      }
    } catch (e) {
      console.error(e);
      resolvingRef.current.delete(decision?.id);
    }
  };

  const loadDecisions = async (gid = groupId) => {
    if (!gid) return;

    const dR = await supabase
      .schema("tourism_features")
      .from("group_decisions")
      .select("id, question, status, created_at")
      .eq("group_id", gid)
      .order("created_at", { ascending: false })
      .limit(50);

    if (dR.error) {
      setDecisions([]);
      return;
    }

    const decisionIds = (dR.data || []).map((x) => x.id);
    let options = [];
    let votes = [];

    if (decisionIds.length) {
      const oR = await supabase
        .schema("tourism_features")
        .from("group_decision_options")
        .select("id, decision_id, label")
        .in("decision_id", decisionIds)
        .order("created_at", { ascending: true });

      options = oR.data || [];

      const vR = await supabase
        .schema("tourism_features")
        .from("group_decision_votes")
        .select("decision_id, option_id, user_id")
        .in("decision_id", decisionIds);

      votes = vR.data || [];
    }

    const optionVotes = votes.reduce((acc, v) => {
      acc[v.option_id] = (acc[v.option_id] || 0) + 1;
      return acc;
    }, {});

    const optionsByDecision = options.reduce((acc, o) => {
      acc[o.decision_id] = acc[o.decision_id] || [];
      acc[o.decision_id].push(o);
      return acc;
    }, {});

    const next = (dR.data || []).map((d) => {
      const meta = decodeDecisionQuestion(d.question);
      return {
        id: d.id,
        question: meta.title,
        _rawQuestion: meta.raw,
        meta,
        status: d.status,
        options: (optionsByDecision[d.id] || []).map((o) => ({
          id: o.id,
          label: o.label,
          votes: optionVotes[o.id] || 0,
        })),
      };
    });

    setDecisions(next);

    next.forEach((d) => {
      const counts = {};
      (d.options || []).forEach((o) => {
        counts[o.id] = Number(o.votes || 0);
      });
      resolveDecisionIfMajority(d, counts);
    });
  };

  /* =========================
     Budget & Expenses
  ========================= */
  const loadBudgetAndExpenses = async (gid = groupId) => {
    if (!gid) return;

    const bR = await supabase
      .schema("tourism_features")
      .from("group_budgets")
      .select("*")
      .eq("group_id", gid)
      .maybeSingle();

    if (!bR.error) {
      setBudget(Number(bR.data?.amount || 0));
    }

    const eR = await supabase
      .schema("tourism_features")
      .from("group_expenses")
      .select("*")
      .eq("group_id", gid)
      .order("created_at", { ascending: false })
      .limit(200);

    if (eR.error) {
      console.error(eR.error);
      setExpenseState({ expenses: [], totalSpent: 0 });
      return;
    }

    const rows = (eR.data || []).map((x) => ({
      id: x.id,
      paid_by: x.paid_by || "—",
      item: x.item || "—",
      amount: Number(x.amount || 0),
      occurred_on: x.occurred_on || null,
      dateLabel: x.occurred_on
        ? new Date(x.occurred_on).toLocaleDateString()
        : "—",
    }));

    setExpenseState({
      expenses: rows,
      totalSpent: rows.reduce((sum, r) => sum + Number(r.amount || 0), 0),
    });
  };

  const saveBudget = async (val) => {
    if (!groupId) return;
    const n = Number(val || 0);

    const { error } = await supabase
      .schema("tourism_features")
      .from("group_budgets")
      .upsert(
        { group_id: groupId, amount: n, updated_at: new Date().toISOString() },
        { onConflict: "group_id" }
      );

    if (error) {
      console.error(error);
      toast(`Budget save failed: ${error.message}`);
    } else {
      toast("Budget saved.");
    }
  };

  const loadAll = async (gid = groupId, uid = userId) => {
    if (!gid) return;
    await Promise.all([
      loadMembers(gid),
      loadActivities(gid),
      loadDecisions(gid),
      loadBudgetAndExpenses(gid),
      loadChallenges(gid, uid),
    ]);
  };

  /* =========================
     ✅ FIXED: Load when groupId OR userId changes
     - ensures challenges re-merge once userId loads after refresh
  ========================= */
  useEffect(() => {
    if (!groupId) return;
    loadAll(groupId, userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, userId]);

  /* =========================
     Realtime
     ✅ FIXED:
     - includes membership table so joins persist/live-update
     - depends on groupId + userId
  ========================= */
  useEffect(() => {
    if (!groupId) return;

    const unsubExpenses = subscribeGroupExpensesRealtime({
      groupId,
      onEvent: ({ payload }) => {
        setExpenseState((prev) => applyExpensePayload(payload, prev));
      },
    });

    const ch = supabase
      .channel(`collab-overview:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "tourism_features",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => loadMembers()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "tourism_features",
          table: "group_activities",
          filter: `group_id=eq.${groupId}`,
        },
        () => loadActivities()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "tourism_features",
          table: "group_decisions",
          filter: `group_id=eq.${groupId}`,
        },
        () => loadDecisions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "tourism_features", table: "group_decision_options" },
        () => loadDecisions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "tourism_features", table: "group_decision_votes" },
        () => loadDecisions()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "tourism_features",
          table: "group_challenges",
          filter: `group_id=eq.${groupId}`,
        },
        () => loadChallenges(groupId, userId)
      );

    // membership updates (so "Join" persists and refresh matches DB)
    if (userId) {
      ch.on(
        "postgres_changes",
        {
          event: "*",
          schema: "tourism_features",
          table: "group_challenge_memberships",
          filter: `user_id=eq.${userId}`,
        },
        () => loadChallenges(groupId, userId)
      );
    }

    ch.subscribe();

    return () => {
      unsubExpenses?.();
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, userId]);

  /* =========================
     Member Search
  ========================= */
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = (memberQuery || "").trim();
      if (!addMemberOpen || !q) {
        setMemberResults([]);
        return;
      }

      setMemberSearching(true);
      try {
        const existing = new Set((members || []).map((m) => m.id));

        if (q.includes("@")) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, username, display_name, email, avatar_url")
            .ilike("email", `%${q}%`)
            .limit(20);

          if (error) throw error;

          setMemberResults((data || []).filter((x) => !existing.has(x.id)));
        } else {
          const [uRes, dRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("id, username, display_name, email, avatar_url")
              .ilike("username", `%${q}%`)
              .limit(20),
            supabase
              .from("profiles")
              .select("id, username, display_name, email, avatar_url")
              .ilike("display_name", `%${q}%`)
              .limit(20),
          ]);

          const map = new Map();
          (uRes.data || []).forEach((r) => map.set(r.id, r));
          (dRes.data || []).forEach((r) => map.set(r.id, r));

          setMemberResults(
            Array.from(map.values())
              .filter((x) => !existing.has(x.id))
              .slice(0, 20)
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        setMemberSearching(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [memberQuery, addMemberOpen, members]);

  const addMember = async (targetUserId) => {
    if (!groupId) return toast("No group selected.");

    const { error } = await supabase
      .schema("tourism_features")
      .from("group_members")
      .insert({ group_id: groupId, user_id: targetUserId, role: "member" });

    if (error) return toast(`Add member failed: ${error.message}`);

    toast("Member added.");
    setAddMemberOpen(false);
    setMemberQuery("");
    setMemberResults([]);
    loadMembers();
  };

  /* =========================
     Decision Actions
  ========================= */
  const createDecision = async () => {
    if (!groupId || !userId) return toast("Please log in.");

    const title = (decisionForm.title || "").trim();
    if (!title) return toast("Activity title is required.");

    const encoded = encodeDecisionQuestion(decisionForm);

    const dR = await supabase
      .schema("tourism_features")
      .from("group_decisions")
      .insert({
        group_id: groupId,
        question: encoded,
        status: "open",
        created_by: userId,
      })
      .select("*")
      .single();

    if (dR.error) return toast(`Create decision failed: ${dR.error.message}`);

    await supabase
      .schema("tourism_features")
      .from("group_decision_options")
      .insert([
        { decision_id: dR.data.id, label: "Yes" },
        { decision_id: dR.data.id, label: "No" },
      ]);

    toast("Decision created.");
    setAddDecisionOpen(false);
    setDecisionForm({ title: "", starts_at: "", location: "", notes: "" });
    loadDecisions();
  };

  const openVote = async (decisionId) => {
    if (!userId) return toast("Please log in.");

    const d = decisions.find((x) => x.id === decisionId);
    if (!d) return;

    setActiveDecision(d);
    setDecisionState({ me: userId, counts: {}, myVoteOptionId: null });
    setVoteModalOpen(true);

    const snap = await fetchVoteSnapshot(decisionId);
    if (snap) {
      setDecisionState({
        me: userId,
        counts: snap.counts,
        myVoteOptionId: snap.myVote,
      });
      resolveDecisionIfMajority(d, snap.counts);
    }

    if (decisionUnsubRef.current) decisionUnsubRef.current();

    decisionUnsubRef.current = subscribeDecisionRealtime({
      decisionId,
      onEvent: async ({ type, payload }) => {
        if (type !== "VOTE_CHANGE") return;

        setDecisionState((prev) => applyVotePayload(payload, prev));

        const s = await fetchVoteSnapshot(decisionId);
        if (s) {
          setDecisionState((st) => ({
            ...st,
            counts: s.counts,
            myVoteOptionId: s.myVote,
          }));
          resolveDecisionIfMajority(activeDecisionRef.current, s.counts);
        }
      },
    });
  };

  const closeVote = () => {
    setVoteModalOpen(false);
    setActiveDecision(null);
    if (decisionUnsubRef.current) decisionUnsubRef.current();
    decisionUnsubRef.current = null;
  };

  const castVote = async (optionId) => {
    if (!activeDecision?.id || !userId) return;

    setDecisionState((prev) => {
      const next = { ...prev, counts: { ...(prev.counts || {}) } };
      const oldOpt = prev.myVoteOptionId;

      if (oldOpt && oldOpt !== optionId) {
        next.counts[oldOpt] = Math.max(0, (next.counts[oldOpt] || 0) - 1);
      }

      next.counts[optionId] = (next.counts[optionId] || 0) + 1;
      next.myVoteOptionId = optionId;
      return next;
    });

    try {
      await voteDecision({ decisionId: activeDecision.id, optionId, userId });
    } catch (e) {
      console.error(e);
    }
  };

  /* =========================
     Expenses
  ========================= */
  const mapDateLabelToISO = (label) => {
    const d = new Date();
    if (label === "Yesterday") d.setDate(d.getDate() - 1);
    if (label === "2 days ago") d.setDate(d.getDate() - 2);
    return d.toISOString().slice(0, 10);
  };

  const addExpense = async () => {
    if (!groupId) return toast("No group selected.");
    if (!expenseForm.item.trim()) return;
    if (!expenseForm.who) return toast("Please select a valid member.");

    const amt = Number(expenseForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) return;

    try {
      await addGroupExpense({
        groupId,
        item: expenseForm.item.trim(),
        amount: amt,
        occurred_on: mapDateLabelToISO(expenseForm.date),
        paid_by: expenseForm.who,
      });

      setExpenseForm((f) => ({ ...f, item: "", amount: "" }));
      toast("Expense added.");
    } catch (e) {
      console.error(e);
      toast(`Failed to add expense: ${e.message}`);
    }
  };

  /* =========================
     Render
  ========================= */
  return (
    <>
      {/* Header */}
      <div style={safeS.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <h2 style={safeS.h2}>Collaboration & Sharing</h2>
            <div style={safeS.muted}>
              Shared activities, decisions, group spending, and group challenges.
              {!groupId ? " (No group selected)" : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btnPrimary}
              onClick={() => {
                setGroupsModalOpen(true);
                setCreateGroupMode(false);
                loadMyGroups();
              }}
            >
              My Groups
            </button>
            <button type="button" style={btnBase} onClick={() => setMembersOpen(true)}>
              Members
            </button>
            <button
              type="button"
              style={btnBase}
              onClick={() => setAddDecisionOpen(true)}
            >
              Add Decision
            </button>
            <button
              type="button"
              style={btnPrimary}
              onClick={() => setCreateChallengeOpen(true)}
            >
              Create Group Challenge
            </button>
          </div>
        </div>
      </div>

      {/* Group Challenges */}
      <div style={safeS.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <h2 style={safeS.h2}>Group Challenges</h2>
            <div style={safeS.muted}>Members-only challenges.</div>
          </div>
          <span style={safeS.pill}>{groupChallenges.length} active</span>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {groupChallenges.map((c) => (
            <div
              key={c.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: 12,
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontWeight: 1000 }}>{c.title}</div>
                  <div style={safeS.mini}>
                    Created by <b>{c.createdBy}</b> • {c.duration}h duration
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {timers[c.id] && (
                    <span
                      style={{
                        ...safeS.pill,
                        background: "#fef3c7",
                        color: "#b45309",
                      }}
                    >
                      {timers[c.id]}
                    </span>
                  )}
                  <span style={safeS.pill}>{c.joined ? c.status : "Open"}</span>
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 13 }}>{c.description}</div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span style={safeS.pill}>Reward: {c.reward}</span>

                <button type="button" style={btnBase} onClick={() => openLeaderboard(c)}>
                  Leaderboard
                </button>

                <button type="button" style={btnBase} onClick={() => openDetails(c)}>
                  Details
                </button>

                {!c.joined ? (
                  <>
                    <button
                      type="button"
                      style={btnPrimary}
                      onClick={() => handleJoinChallenge(c.id)}
                    >
                      Join Challenge
                    </button>
                    <button
                      type="button"
                      style={{
                        ...btnBase,
                        color: "#ef4444",
                        borderColor: "#fee2e2",
                        background: "#fef2f2",
                      }}
                      onClick={() => handleDeclineChallenge(c.id)}
                    >
                      Decline
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    style={{ ...btnBase, cursor: "default", background: "#f3f4f6" }}
                    disabled
                  >
                    Joined
                  </button>
                )}
              </div>
            </div>
          ))}
          {groupChallenges.length === 0 && (
            <div style={safeS.muted}>No active challenges.</div>
          )}
        </div>
      </div>

      {/* Shared Activities + Decisions */}
      <div style={safeS.grid2}>
        <div style={safeS.card}>
          <h2 style={safeS.h2}>Shared Activities</h2>
          <div style={safeS.muted}>Approved decisions appear here.</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {sharedActivities.map((a) => (
              <div
                key={a.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  padding: 12,
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{a.title}</div>
                  <span style={safeS.pill}>{a.status}</span>
                </div>

                <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 13 }}>
                  <div>
                    <span style={safeS.pill}>When</span>{" "}
                    <span style={{ fontWeight: 800 }}>{a.when}</span>
                  </div>
                  <div>
                    <span style={safeS.pill}>Where</span>{" "}
                    <span style={{ fontWeight: 800 }}>{a.where}</span>
                  </div>
                  <div>
                    <span style={safeS.pill}>Who</span>{" "}
                    <span style={{ fontWeight: 800 }}>{(a.who || []).join(", ")}</span>
                  </div>

                  <div style={safeS.mini}>{a.notes}</div>
                </div>
              </div>
            ))}

            {!sharedActivities.length && (
              <div style={safeS.muted}>No approved activities yet.</div>
            )}
          </div>
        </div>

        <div style={safeS.card}>
          <h2 style={safeS.h2}>Decisions</h2>
          <div style={safeS.muted}>Members vote Yes/No.</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {decisions.map((d) => {
              const isApproved = d.status === "approved";
              const isDeclined = d.status === "declined";
              return (
                <div
                  key={d.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{d.question}</div>
                    <span style={safeS.pill}>
                      {isApproved ? "Approved" : isDeclined ? "Declined" : "Open"}
                    </span>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {d.options.map((o) => (
                      <div
                        key={o.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                          padding: 10,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          background: "#f8fafc",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 900 }}>{o.label}</div>
                          <div style={safeS.mini}>Votes: {o.votes}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            style={btnBase}
                            onClick={() => openVote(d.id)}
                            disabled={isApproved || isDeclined}
                          >
                            {isApproved ? "Approved" : isDeclined ? "Declined" : "Vote"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {!decisions.length && <div style={safeS.muted}>No decisions yet.</div>}
          </div>
        </div>
      </div>

      {/* Group Spending */}
      <div style={safeS.card}>
        <h2 style={safeS.h2}>Group Spending</h2>
        <div style={safeS.muted}>Budget + shared expenses.</div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={safeS.pill}>Budget: ${budget}</span>
          <span style={safeS.pill}>Spent: ${Number(totalSpent || 0)}</span>
          <span style={safeS.pill}>Remaining: ${Number(remaining || 0)}</span>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>Set Budget</div>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value || 0))}
              onBlur={(e) => saveBudget(e.target.value)}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontWeight: 800,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 900 }}>Add Expense</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <select
                value={expenseForm.who}
                onChange={(e) => setExpenseForm((f) => ({ ...f, who: e.target.value }))}
                style={safeS.select}
              >
                {!userId && <option value="">Loading...</option>}
                {userId && <option value={userId}>Paid by: You</option>}
                {members
                  .filter((m) => m.id !== userId)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      Paid by: {m.name}
                    </option>
                  ))}
              </select>

              <input
                value={expenseForm.item}
                onChange={(e) => setExpenseForm((f) => ({ ...f, item: e.target.value }))}
                placeholder="Item"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  fontWeight: 700,
                }}
              />

              <input
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="Amount"
                inputMode="decimal"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  fontWeight: 700,
                }}
              />

              <button type="button" style={btnPrimary} onClick={addExpense}>
                Add Expense
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <table style={safeS.table}>
            <thead>
              <tr>
                <th style={safeS.th}>Who</th>
                <th style={safeS.th}>Item</th>
                <th style={safeS.th}>Amount</th>
                <th style={safeS.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(expenseState.expenses || []).map((e) => (
                <tr key={e.id}>
                  <td style={safeS.td}>
                    {e.paid_by === userId
                      ? "You"
                      : members.find((m) => m.id === e.paid_by)?.name || "Unknown"}
                  </td>
                  <td style={safeS.td}>{e.item}</td>
                  <td style={safeS.td}>${Number(e.amount || 0)}</td>
                  <td style={safeS.td}>{e.dateLabel || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leaderboard Modal */}
      {leaderboardOpen && activeLeaderboardChallenge && (
        <div style={safeS.modalBackdrop} onMouseDown={() => setLeaderboardOpen(false)}>
          <ModalCard
            title="Friendship Leaderboard"
            subtitle={`Ranking for: ${activeLeaderboardChallenge.title}`}
            onClose={() => setLeaderboardOpen(false)}
            S={safeS}
            btnBase={btnBase}
          >
            <table style={{ ...safeS.table, marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={safeS.th}>Rank</th>
                  <th style={safeS.th}>Friend</th>
                  <th style={safeS.th}>Progress</th>
                  <th style={safeS.th}>Streak</th>
                  <th style={safeS.th}>Points</th>
                </tr>
              </thead>
              <tbody>
                {friendsLeaderboard.map((r) => (
                  <tr key={r.rank}>
                    <td style={safeS.td}>{r.rank}</td>
                    <td style={safeS.td}>{r.name}</td>
                    <td style={safeS.td}>{r.progress}</td>
                    <td style={safeS.td}>{r.streak}</td>
                    <td style={safeS.td}>{r.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ModalCard>
        </div>
      )}

      {/* Details Modal */}
      {detailsOpen && activeDetailsChallenge && (
        <div style={safeS.modalBackdrop} onMouseDown={() => setDetailsOpen(false)}>
          <ModalCard
            title={activeDetailsChallenge.title}
            subtitle="Challenge Details"
            onClose={() => setDetailsOpen(false)}
            S={safeS}
            btnBase={btnBase}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
                  DESCRIPTION
                </div>
                <div>{activeDetailsChallenge.description}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
                    REWARD
                  </div>
                  <div>{activeDetailsChallenge.reward}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
                    DURATION
                  </div>
                  <div>{activeDetailsChallenge.duration} Hours</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
                  CREATED BY
                </div>
                <div>{activeDetailsChallenge.createdBy}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
                  STATUS
                </div>
                <span style={safeS.pill}>{activeDetailsChallenge.status}</span>
              </div>
            </div>
          </ModalCard>
        </div>
      )}

      {/* Create Challenge Modal */}
      {createChallengeOpen && (
        <div
          style={safeS.modalBackdrop}
          onMouseDown={() => setCreateChallengeOpen(false)}
        >
          <ModalCard
            title="Create Group Challenge"
            subtitle="Members-only. Once created, everyone in the group will see it."
            onClose={() => setCreateChallengeOpen(false)}
            S={safeS}
            btnBase={btnBase}
          >
            <div style={safeS.card}>
              <div style={{ marginTop: 6, display: "grid", gap: 10 }}>
                <input
                  value={challengeForm.title}
                  onChange={(e) =>
                    setChallengeForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Challenge title"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontWeight: 700,
                  }}
                />

                <input
                  type="number"
                  value={challengeForm.duration}
                  onChange={(e) =>
                    setChallengeForm((f) => ({ ...f, duration: e.target.value }))
                  }
                  placeholder="Duration (Hours)"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontWeight: 700,
                  }}
                />

                <input
                  value={challengeForm.reward}
                  onChange={(e) =>
                    setChallengeForm((f) => ({ ...f, reward: e.target.value }))
                  }
                  placeholder="Reward / Prize"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    fontWeight: 700,
                  }}
                />

                <textarea
                  value={challengeForm.description}
                  onChange={(e) =>
                    setChallengeForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Description"
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

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    style={btnBase}
                    onClick={() => setCreateChallengeOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="button" style={btnPrimary} onClick={createGroupChallenge}>
                    Create
                  </button>
                </div>
              </div>
            </div>
          </ModalCard>
        </div>
      )}

      {/* Groups Modal */}
      {groupsModalOpen && (
        <div style={safeS.modalBackdrop} onMouseDown={() => setGroupsModalOpen(false)}>
          <ModalCard
            title={createGroupMode ? "Create New Group" : "My Groups"}
            subtitle={createGroupMode ? "Plan a new adventure" : "Select a group to manage"}
            onClose={() => setGroupsModalOpen(false)}
            S={safeS}
            btnBase={btnBase}
          >
            {!createGroupMode ? (
              <div style={{ display: "grid", gap: 10 }}>
                {myGroups.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => {
                      setActiveGroup(g.id);
                      setGroupsModalOpen(false);
                    }}
                    style={{
                      padding: 12,
                      border: g.id === groupId ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                      borderRadius: 12,
                      cursor: "pointer",
                      background: g.id === groupId ? "#eff6ff" : "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{g.name}</div>
                      <div style={safeS.mini}>{g.destination || "No destination"}</div>
                    </div>
                    {g.id === groupId && (
                      <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 900 }}>
                        Active
                      </span>
                    )}
                  </div>
                ))}
                <button
                  style={{ ...btnPrimary, marginTop: 10, width: "100%" }}
                  onClick={() => setCreateGroupMode(true)}
                >
                  + Create New Group
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Group Name"
                  style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #ddd" }}
                />
                <button style={{ ...btnPrimary, flex: 1 }} onClick={createGroup}>
                  Create Group
                </button>
              </div>
            )}
          </ModalCard>
        </div>
      )}

      {/* Members Modal */}
      {membersOpen && (
        <div style={safeS.modalBackdrop} onMouseDown={() => setMembersOpen(false)}>
          <ModalCard
            title="Group Members"
            onClose={() => setMembersOpen(false)}
            S={safeS}
            btnBase={btnBase}
          >
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {(members || []).map((m) => (
                <div
                  key={m.id}
                  style={{
                    width: 100,
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={avatar}>{m.initials}</div>
                  <div style={{ marginTop: 8, fontWeight: 900, fontSize: 13 }}>{m.name}</div>
                </div>
              ))}
              <button
                type="button"
                style={{ ...btnPrimary, width: 44, height: 44, borderRadius: "50%" }}
                onClick={() => {
                  if (!groupId) return toast("No group.");
                  setAddMemberOpen(true);
                  setMemberQuery("");
                }}
              >
                +
              </button>
            </div>
          </ModalCard>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberOpen && (
        <div style={safeS.modalBackdrop} onMouseDown={() => setAddMemberOpen(false)}>
          <ModalCard
            title="Add Member"
            onClose={() => setAddMemberOpen(false)}
            S={safeS}
            btnBase={btnBase}
          >
            <input
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Search..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
              }}
            />

            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {memberSearching && <div style={safeS.muted}>Searching…</div>}

              {memberResults.map((u) => (
                <div
                  key={u.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 900 }}>{u.display_name}</div>
                    <div style={safeS.mini}>@{u.username}</div>
                  </div>
                  <button type="button" style={btnPrimary} onClick={() => addMember(u.id)}>
                    Add
                  </button>
                </div>
              ))}

              {!memberSearching && memberResults.length === 0 && memberQuery.trim() && (
                <div style={safeS.muted}>No results.</div>
              )}
            </div>
          </ModalCard>
        </div>
      )}

      {/* Add Decision Modal */}
      {addDecisionOpen && (
        <div style={safeS.modalBackdrop} onMouseDown={() => setAddDecisionOpen(false)}>
          <ModalCard
            title="Add Decision"
            onClose={() => setAddDecisionOpen(false)}
            S={safeS}
            btnBase={btnBase}
          >
            <div style={{ display: "grid", gap: 10 }}>
              <input
                value={decisionForm.title}
                onChange={(e) => setDecisionForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Title"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
              <input
                type="datetime-local"
                value={decisionForm.starts_at}
                onChange={(e) =>
                  setDecisionForm((f) => ({ ...f, starts_at: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
              <input
                value={decisionForm.location}
                onChange={(e) =>
                  setDecisionForm((f) => ({ ...f, location: e.target.value }))
                }
                placeholder="Location"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
              <textarea
                value={decisionForm.notes}
                onChange={(e) => setDecisionForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes"
                style={{
                  width: "100%",
                  minHeight: 90,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  padding: 10,
                }}
              />
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" style={btnBase} onClick={() => setAddDecisionOpen(false)}>
                  Cancel
                </button>
                <button type="button" style={btnPrimary} onClick={createDecision}>
                  Create
                </button>
              </div>
            </div>
          </ModalCard>
        </div>
      )}

      {/* Vote Modal */}
      {voteModalOpen && activeDecision && (
        <div style={safeS.modalBackdrop} onMouseDown={closeVote}>
          <ModalCard
            title="Vote"
            subtitle={activeDecision.question}
            onClose={closeVote}
            S={safeS}
            btnBase={btnBase}
          >
            <div style={{ display: "grid", gap: 10 }}>
              {activeDecision.options.map((o) => (
                <div
                  key={o.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    background: decisionState?.myVoteOptionId === o.id ? "#eff6ff" : "#ffffff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 1000 }}>{o.label}</div>
                    <div style={safeS.mini}>
                      Votes: {Number(decisionState?.counts?.[o.id] ?? o.votes ?? 0)}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={decisionState?.myVoteOptionId === o.id ? btnPrimary : btnBase}
                    onClick={() => castVote(o.id)}
                  >
                    Vote
                  </button>
                </div>
              ))}
            </div>
          </ModalCard>
        </div>
      )}
    </>
  );
}
