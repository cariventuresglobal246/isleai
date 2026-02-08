// touristcontroller.js
// Complete controller (Express-style) for Supabase + RLS RBAC.
// ✅ Uses user's JWT (Authorization: Bearer <access_token>) so Supabase RLS enforces RBAC.
// ✅ Adds lightweight role guard (tourism_features.profiles.role) for route-level RBAC.
// ✅ ADDED: "Path 1" Realtime helpers exported from this file (client uses these directly):
//    - subscribeDecisionRealtime + applyVotePayload + voteDecision
//    - subscribeGroupExpensesRealtime + applyExpensePayload + addGroupExpense
//
// IMPORTANT:
// - Realtime replication must be enabled in Supabase Dashboard for:
//   tourism_features.group_decision_votes
//   tourism_features.group_decision_options (optional)
//   tourism_features.group_decisions (optional)
//   tourism_features.group_expenses
//   tourism_features.group_budgets (optional)

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

/* ============================================================
   ENV
============================================================ */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
}

/* ============================================================
   SUPABASE PER-REQUEST CLIENT (RLS)
============================================================ */
function getSupabaseForReq(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  return {
    supabase: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    token,
  };
}

async function requireAuth(req, res, next) {
  try {
    const { supabase, token } = getSupabaseForReq(req);
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return res.status(401).json({ error: "Invalid/expired token" });

    req.supabase = supabase;
    req.user = data.user;
    next();
  } catch {
    return res.status(500).json({ error: "Auth middleware error" });
  }
}

async function attachProfile(req, res, next) {
  try {
    const sb = req.supabase;

    const { data, error } = await sb
      .schema("tourism_features")
      .from("profiles")
      .select("user_id, role, display_name, username, avatar_url")
      .eq("user_id", req.user.id)
      .single();

    if (error) {
      req.profile = { user_id: req.user.id, role: "tourist" };
      return next();
    }

    req.profile = data;
    return next();
  } catch {
    return res.status(500).json({ error: "Profile middleware error" });
  }
}

function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const role = req.profile?.role || "tourist";
    if (!allowedRoles.includes(role)) return res.status(403).json({ error: "Forbidden (role)" });
    next();
  };
}

/* ============================================================
   REALTIME (PATH 1) CLIENT HELPERS
   Export these so your React UI can import from this file
   OR copy into /src/realtime/*.js (recommended)
============================================================ */

/**
 * Decisions Realtime Subscription:
 * - votes changes for decision_id
 * - options changes for decision_id (optional)
 * - decision status updates (optional)
 */
export function subscribeDecisionRealtime({ supabase, decisionId, onEvent }) {
  const channel = supabase
    .channel(`decision:${decisionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "tourism_features",
        table: "group_decision_votes",
        filter: `decision_id=eq.${decisionId}`,
      },
      (payload) => onEvent({ type: "VOTE_CHANGE", payload })
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "tourism_features",
        table: "group_decision_options",
        filter: `decision_id=eq.${decisionId}`,
      },
      (payload) => onEvent({ type: "OPTION_CHANGE", payload })
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "tourism_features",
        table: "group_decisions",
        filter: `id=eq.${decisionId}`,
      },
      (payload) => onEvent({ type: "DECISION_UPDATE", payload })
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Apply vote payload to your local UI state
 * state shape expected:
 * {
 *   me: "<user_id>",
 *   counts: { [optionId]: number },
 *   myVoteOptionId: "<option_id>" | null
 * }
 */
export function applyVotePayload(payload, state) {
  const { eventType, new: newRow, old: oldRow } = payload;

  // Avoid structuredClone issues in some environments
  const next = {
    ...state,
    counts: { ...(state.counts || {}) },
  };

  const inc = (optId, delta) => {
    if (!optId) return;
    next.counts[optId] = (next.counts[optId] || 0) + delta;
    if (next.counts[optId] < 0) next.counts[optId] = 0;
  };

  if (eventType === "INSERT") {
    inc(newRow?.option_id, 1);
    if (newRow?.user_id === next.me) next.myVoteOptionId = newRow.option_id;
  }

  if (eventType === "UPDATE") {
    const oldOpt = oldRow?.option_id;
    const newOpt = newRow?.option_id;
    if (oldOpt && newOpt && oldOpt !== newOpt) {
      inc(oldOpt, -1);
      inc(newOpt, 1);
    }
    if (newRow?.user_id === next.me) next.myVoteOptionId = newRow.option_id;
  }

  if (eventType === "DELETE") {
    inc(oldRow?.option_id, -1);
    if (oldRow?.user_id === next.me) next.myVoteOptionId = null;
  }

  return next;
}

/**
 * Voting action (client-side)
 * NOTE: userId is optional if you want to pass it; RLS enforces auth.uid()
 */
export async function voteDecision({ supabase, decisionId, optionId, userId }) {
  const { data, error } = await supabase
    .schema("tourism_features")
    .from("group_decision_votes")
    .upsert(
      { decision_id: decisionId, option_id: optionId, user_id: userId },
      { onConflict: "decision_id,user_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Group Expenses Realtime Subscription
 */
export function subscribeGroupExpensesRealtime({ supabase, groupId, onEvent }) {
  const channel = supabase
    .channel(`group-expenses:${groupId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "tourism_features",
        table: "group_expenses",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => onEvent({ type: "EXPENSE_CHANGE", payload })
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Apply expense payload to UI state
 * state shape expected:
 * {
 *   expenses: [],
 *   totalSpent: number
 * }
 */
export function applyExpensePayload(payload, state) {
  const { eventType, new: newRow, old: oldRow } = payload;
  const next = {
    ...state,
    expenses: Array.isArray(state.expenses) ? [...state.expenses] : [],
    totalSpent: Number(state.totalSpent || 0),
  };

  if (eventType === "INSERT") {
    next.expenses = [newRow, ...next.expenses];
    next.totalSpent = next.totalSpent + Number(newRow?.amount || 0);
  }

  if (eventType === "UPDATE") {
    next.expenses = next.expenses.map((e) => (e.id === newRow.id ? newRow : e));
    const oldAmt = Number(oldRow?.amount || 0);
    const newAmt = Number(newRow?.amount || 0);
    next.totalSpent = next.totalSpent + (newAmt - oldAmt);
  }

  if (eventType === "DELETE") {
    next.expenses = next.expenses.filter((e) => e.id !== oldRow.id);
    next.totalSpent = next.totalSpent - Number(oldRow?.amount || 0);
    if (next.totalSpent < 0) next.totalSpent = 0;
  }

  return next;
}

/**
 * Add expense (client-side)
 */
export async function addGroupExpense({ supabase, groupId, item, amount, occurred_on, paid_by }) {
  const { data, error } = await supabase
    .schema("tourism_features")
    .from("group_expenses")
    .insert({
      group_id: groupId,
      item,
      amount,
      occurred_on: occurred_on || null,
      paid_by: paid_by || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/* ============================================================
   REST ROUTES (same as before)
============================================================ */

router.get("/me", requireAuth, attachProfile, async (req, res) => {
  return res.json({
    user: { id: req.user.id, email: req.user.email },
    profile: req.profile,
  });
});

/* -------------------------
   CHALLENGES
-------------------------- */
router.get("/challenges", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const { creator_type, challenge_type, audience, region, q } = req.query;

  let query = sb
    .schema("tourism_features")
    .from("challenges")
    .select(
      "id, creator_type, title, description, challenge_type, audience, region, reward, points, status, starts_at, ends_at, created_at"
    )
    .order("created_at", { ascending: false });

  if (creator_type) query = query.eq("creator_type", creator_type);
  if (challenge_type) query = query.eq("challenge_type", challenge_type);
  if (audience) query = query.eq("audience", audience);
  if (region) query = query.eq("region", region);

  if (q) {
    const qq = `%${String(q)}%`;
    query = query.or(`title.ilike.${qq},description.ilike.${qq}`);
  }

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });

  return res.json({ data });
});

router.post("/challenges/:id/join", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const challengeId = req.params.id;

  const { data, error } = await sb
    .schema("tourism_features")
    .from("challenge_memberships")
    .upsert(
      { challenge_id: challengeId, user_id: req.user.id, status: "joined" },
      { onConflict: "challenge_id,user_id" }
    )
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

router.post("/challenges/:id/leave", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const challengeId = req.params.id;

  const { error } = await sb
    .schema("tourism_features")
    .from("challenge_memberships")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("user_id", req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ ok: true });
});

router.get("/leaderboard/creators", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;

  const { data, error } = await sb
    .schema("tourism_features")
    .from("leaderboard_creators")
    .select("*")
    .order("rank", { ascending: true })
    .limit(100);

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

/* -------------------------
   TRIPS
-------------------------- */
router.get("/trips", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const { data, error } = await sb
    .schema("tourism_features")
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

router.post("/trips", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const { destination_country, destination_region, start_date, end_date } = req.body || {};

  const { data, error } = await sb
    .schema("tourism_features")
    .from("trips")
    .insert({
      user_id: req.user.id,
      destination_country: destination_country || null,
      destination_region: destination_region || null,
      start_date: start_date || null,
      end_date: end_date || null,
    })
    .select("*")
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

router.get("/trips/:tripId/overview", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const tripId = req.params.tripId;

  const [tripR, accomR, tasksR, budgetR, notifsR] = await Promise.all([
    sb.schema("tourism_features").from("trips").select("*").eq("id", tripId).single(),
    sb
      .schema("tourism_features")
      .from("trip_accommodations")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb
      .schema("tourism_features")
      .from("trip_tasks")
      .select("*")
      .eq("trip_id", tripId)
      .order("sort_order", { ascending: true }),
    sb.schema("tourism_features").from("trip_budgets").select("*").eq("trip_id", tripId).maybeSingle(),
    sb
      .schema("tourism_features")
      .from("trip_notifications")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const anyError = tripR.error || accomR.error || tasksR.error || budgetR.error || notifsR.error;
  if (anyError) {
    return res.status(400).json({
      error: (tripR.error || accomR.error || tasksR.error || budgetR.error || notifsR.error).message,
    });
  }

  return res.json({
    data: {
      trip: tripR.data,
      accommodation: accomR.data || null,
      tasks: tasksR.data || [],
      budget: budgetR.data || null,
      notifications: notifsR.data || [],
    },
  });
});

/* -------------------------
   GROUPS / COLLAB
-------------------------- */
router.get("/groups", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;

  const { data, error } = await sb
    .schema("tourism_features")
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.json({ data });
});

router.post("/groups", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const { name, trip_id = null } = req.body || {};
  if (!name) return res.status(400).json({ error: "name is required" });

  const { data: group, error: gErr } = await sb
    .schema("tourism_features")
    .from("groups")
    .insert({ name, created_by: req.user.id, trip_id })
    .select("*")
    .single();

  if (gErr) return res.status(400).json({ error: gErr.message });

  const { error: mErr } = await sb
    .schema("tourism_features")
    .from("group_members")
    .insert({ group_id: group.id, user_id: req.user.id, role: "owner" });

  if (mErr) return res.status(400).json({ error: mErr.message });

  return res.json({ data: group });
});

router.get("/groups/:groupId/overview", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const groupId = req.params.groupId;

  const [groupR, membersR, actsR, decisionsR, budgetR, expensesR, gChallengesR] =
    await Promise.all([
      sb.schema("tourism_features").from("groups").select("*").eq("id", groupId).single(),
      sb
        .schema("tourism_features")
        .from("group_members")
        .select("group_id, user_id, role, joined_at")
        .eq("group_id", groupId),
      sb
        .schema("tourism_features")
        .from("group_activities")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(100),
      sb
        .schema("tourism_features")
        .from("group_decisions")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(50),
      sb.schema("tourism_features").from("group_budgets").select("*").eq("group_id", groupId).maybeSingle(),
      sb
        .schema("tourism_features")
        .from("group_expenses")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(200),
      sb
        .schema("tourism_features")
        .from("group_challenges")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const anyError =
    groupR.error ||
    membersR.error ||
    actsR.error ||
    decisionsR.error ||
    budgetR.error ||
    expensesR.error ||
    gChallengesR.error;

  if (anyError) {
    return res.status(400).json({
      error:
        (groupR.error ||
          membersR.error ||
          actsR.error ||
          decisionsR.error ||
          budgetR.error ||
          expensesR.error ||
          gChallengesR.error).message,
    });
  }

  return res.json({
    data: {
      group: groupR.data,
      members: membersR.data || [],
      activities: actsR.data || [],
      decisions: decisionsR.data || [],
      budget: budgetR.data || null,
      expenses: expensesR.data || [],
      group_challenges: gChallengesR.data || [],
    },
  });
});

/* -------------------------
   DECISIONS REST HELPERS (initial load)
   (Realtime handles live updates; these help load initial state)
-------------------------- */

// GET /tourist/decisions/:decisionId/init  -> options + votes (counts) + myVoteOptionId
router.get("/decisions/:decisionId/init", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const decisionId = req.params.decisionId;

  const { data: options, error: oErr } = await sb
    .schema("tourism_features")
    .from("group_decision_options")
    .select("*")
    .eq("decision_id", decisionId);

  if (oErr) return res.status(400).json({ error: oErr.message });

  const { data: votes, error: vErr } = await sb
    .schema("tourism_features")
    .from("group_decision_votes")
    .select("option_id, user_id")
    .eq("decision_id", decisionId);

  if (vErr) return res.status(400).json({ error: vErr.message });

  const counts = (votes || []).reduce((a, v) => {
    a[v.option_id] = (a[v.option_id] || 0) + 1;
    return a;
  }, {});

  const myVote = (votes || []).find((v) => v.user_id === req.user.id);

  return res.json({
    data: {
      options: options || [],
      counts,
      myVoteOptionId: myVote?.option_id || null,
    },
  });
});

/* -------------------------
   EXPENSES REST HELPERS (initial load)
-------------------------- */

// GET /tourist/groups/:groupId/expenses/init -> expenses + totalSpent
router.get("/groups/:groupId/expenses/init", requireAuth, attachProfile, async (req, res) => {
  const sb = req.supabase;
  const groupId = req.params.groupId;

  const { data: expenses, error } = await sb
    .schema("tourism_features")
    .from("group_expenses")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return res.status(400).json({ error: error.message });

  const totalSpent = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return res.json({ data: { expenses: expenses || [], totalSpent } });
});


// PATCH move task column (kanban)
router.patch("/trips/:tripId/tasks/:taskId", async (req, res) => {
  try {
    const { tripId, taskId } = req.params;
    const { column_name } = req.body || {};

    if (!column_name) return res.status(400).json({ error: "column_name is required" });

    const { data, error } = await supabase
      .schema("tourism_features")
      .from("trip_tasks")
      .update({ column_name })
      .eq("id", taskId)
      .eq("trip_id", tripId)
      .select("*")
      .single();

    if (error) return res.status(500).json({ error: "Failed to update task" });
    return res.json({ data });
  } catch (e) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST budget spend (spent/remaining/categories)
router.post("/trips/:tripId/budget/spend", async (req, res) => {
  try {
    const { tripId } = req.params;
    const { amount, category } = req.body || {};
    const amt = Number(amount);

    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "amount must be a number > 0" });

    const { data: budgetRow, error: bErr } = await supabase
      .schema("tourism_features")
      .from("trip_budgets")
      .select("*")
      .eq("trip_id", tripId)
      .single();

    if (bErr) return res.status(500).json({ error: "Failed to fetch budget" });

    const categories = Array.isArray(budgetRow.categories) ? budgetRow.categories : [];
    const cat = String(category || "Other");

    const nextCategories = (() => {
      const idx = categories.findIndex((c) => c?.name === cat);
      if (idx === -1) return [...categories, { name: cat, amount: amt }];
      const copy = [...categories];
      copy[idx] = { ...copy[idx], amount: Number(copy[idx].amount || 0) + amt };
      return copy;
    })();

    const nextSpent = Number(budgetRow.spent || 0) + amt;

    const { data: updated, error: uErr } = await supabase
      .schema("tourism_features")
      .from("trip_budgets")
      .update({
        spent: nextSpent,
        categories: nextCategories,
        updated_at: new Date().toISOString(),
      })
      .eq("trip_id", tripId)
      .select("*")
      .single();

    if (uErr) return res.status(500).json({ error: "Failed to update budget" });
    return res.json({ data: updated });
  } catch (e) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* ============================================================
   EXPORT
============================================================ */
export default router;

/**
 * USAGE (Express):
 *   import touristController from "./touristcontroller.js";
 *   app.use("/tourist", touristController);
 *
 * CLIENT REALTIME:
 *   import { subscribeDecisionRealtime, voteDecision, applyVotePayload } from "<wherever>";
 *   import { subscribeGroupExpensesRealtime, addGroupExpense, applyExpensePayload } from "<wherever>";
 *
 * NOTE:
 * It’s better to move the realtime exports into /src/realtime/*.js on the frontend.
 * But you asked to “add all updates to touristcontroller.js”, so they’re included here.
 */
