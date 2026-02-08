/**
 * TourismEntities.js
 * Express router for CRUD (one + many) across tourism_entities schema tables.
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[TourismEntities] Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars.");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("[TourismEntities] Missing SUPABASE_SERVICE_ROLE_KEY env var.");
}

function getBearerToken(req) {
  const h = req.headers.authorization || req.headers.Authorization;
  if (!h) return null;
  const v = String(h);
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : null;
}

function supabaseForReq(req) {
  const token = getBearerToken(req);
  const authHeader = token ? `Bearer ${token}` : "";

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
}

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireSupabaseUser(req) {
  const token = getBearerToken(req);
  if (!token) return { error: "Missing Authorization header" };
  if (!SUPABASE_SERVICE_ROLE_KEY) return { error: "Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set" };

  const admin = supabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { error: "Invalid token" };
  return { user };
}

function send(res, status, payload) {
  return res.status(status).json(payload);
}

function requireEnv(req, res, next) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return send(res, 500, {
      error: "Server misconfigured: SUPABASE_URL / SUPABASE_ANON_KEY not set",
    });
  }
  return next();
}

function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return send(res, 401, {
      error: "Missing Authorization header. Send: Authorization: Bearer <access_token>",
    });
  }
  return next();
}

// =========================================================
// ✅ Public Endpoint for All Listings
// Matches: GET /api/listings/public
// =========================================================
router.get("/listings/public", requireEnv, async (req, res) => {
  const supabase = supabaseForReq(req);
  
  // Fetch ALL listings (ignoring owner_id if RLS Policy allows it)
  const { data, error } = await supabase
    .schema("tourism_entities")
    .from("accommodationprovider_listings")
    .select("*");

  if (error) return send(res, 400, { error: error.message, details: error });
  return send(res, 200, { data });
});

// =========================================================
// ✅ NEW: Public Endpoint for Activities
// Matches: GET /api/activities/public
// =========================================================
router.get("/activities/public", requireEnv, async (req, res) => {
  const supabase = supabaseForReq(req);
  
  // Fetch active activities
  const { data, error } = await supabase
    .schema("tourism_entities")
    .from("activitiesprovider_activities")
    .select("*")
    .eq('active', true); // Only active activities

  if (error) return send(res, 400, { error: error.message, details: error });
  return send(res, 200, { data });
});

// =========================================================
// Provider bookings (server-side with Service Role)
// =========================================================
router.get("/accommodationprovider_bookings", requireEnv, requireAuth, async (req, res) => {
  const { user, error } = await requireSupabaseUser(req);
  if (error) return send(res, 401, { error });

  try {
    const admin = supabaseAdmin();
    const { data: listings, error: listErr } = await admin
      .schema("tourism_entities")
      .from("accommodationprovider_listings")
      .select("id")
      .eq("entity_id", user.id);

    if (listErr) return send(res, 400, { error: listErr.message, details: listErr });
    const listingIds = (listings || []).map((l) => l.id).filter(Boolean);
    if (listingIds.length === 0) return send(res, 200, { data: [] });

    const { data, error: bookErr } = await admin
      .schema("tourism_entities")
      .from("accommodationprovider_bookings")
      .select("*")
      .in("listing_id", listingIds);

    if (bookErr) return send(res, 400, { error: bookErr.message, details: bookErr });
    return send(res, 200, { data });
  } catch (e) {
    return send(res, 500, { error: e.message || "Server error" });
  }
});

router.get("/activitiesprovider_bookings", requireEnv, requireAuth, async (req, res) => {
  const { user, error } = await requireSupabaseUser(req);
  if (error) return send(res, 401, { error });

  try {
    const admin = supabaseAdmin();
    const { data: activities, error: actErr } = await admin
      .schema("tourism_entities")
      .from("activitiesprovider_activities")
      .select("id")
      .eq("entity_id", user.id);

    if (actErr) return send(res, 400, { error: actErr.message, details: actErr });
    const activityIds = (activities || []).map((a) => a.id).filter(Boolean);
    if (activityIds.length === 0) return send(res, 200, { data: [] });

    const { data, error: bookErr } = await admin
      .schema("tourism_entities")
      .from("activitiesprovider_bookings")
      .select("*")
      .in("activity_id", activityIds);

    if (bookErr) return send(res, 400, { error: bookErr.message, details: bookErr });
    return send(res, 200, { data });
  } catch (e) {
    return send(res, 500, { error: e.message || "Server error" });
  }
});


// =========================================================
// Generic CRUD builder
// =========================================================
function mountCrud({ name, table, pk = "id", schema = "tourism_entities" }) {
  const base = `/${name}`;

  // LIST (many)
  router.get(base, requireEnv, requireAuth, async (req, res) => {
    const supabase = supabaseForReq(req);
    const filters = { ...req.query };
    // Ignore cache-busting or metadata query params
    delete filters.cb;
    delete filters._;
    delete filters.cache;

    let q = supabase.schema(schema).from(table).select("*");
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined) continue;
      const s = String(v);
      if (s.includes(",")) q = q.in(k, s.split(",").map((x) => x.trim()).filter(Boolean));
      else q = q.eq(k, v);
    }

    const { data, error } = await q;
    if (error) return send(res, 400, { error: error.message, details: error });
    return send(res, 200, { data });
  });

  // CREATE (one)
  router.post(base, requireEnv, requireAuth, async (req, res) => {
    const supabase = supabaseForReq(req);
    const body = req.body || {};
    const { data, error } = await supabase.schema(schema).from(table).insert(body).select("*").single();
    if (error) return send(res, 400, { error: error.message, details: error });
    return send(res, 201, { data });
  });

  // READ (one)
  router.get(`${base}/:${pk}`, requireEnv, requireAuth, async (req, res) => {
    const supabase = supabaseForReq(req);
    const id = req.params[pk];
    const { data, error } = await supabase.schema(schema).from(table).select("*").eq(pk, id).single();
    if (error) return send(res, 404, { error: error.message, details: error });
    return send(res, 200, { data });
  });

  // UPDATE (one)
  router.patch(`${base}/:${pk}`, requireEnv, requireAuth, async (req, res) => {
    const supabase = supabaseForReq(req);
    const id = req.params[pk];
    const patch = req.body || {};
    const { data, error } = await supabase.schema(schema).from(table).update(patch).eq(pk, id).select("*").single();
    if (error) return send(res, 400, { error: error.message, details: error });
    return send(res, 200, { data });
  });

  // DELETE (one)
  router.delete(`${base}/:${pk}`, requireEnv, requireAuth, async (req, res) => {
    const supabase = supabaseForReq(req);
    const id = req.params[pk];
    const { data, error } = await supabase.schema(schema).from(table).delete().eq(pk, id).select("*").single();
    if (error) return send(res, 400, { error: error.message, details: error });
    return send(res, 200, { data });
  });

  // BULK CREATE
  router.post(`${base}/bulk`, requireEnv, requireAuth, async (req, res) => {
    const supabase = supabaseForReq(req);
    const rows = Array.isArray(req.body) ? req.body : (req.body?.rows || []);
    if (!Array.isArray(rows) || rows.length === 0) return send(res, 400, { error: "Provide an array of rows" });
    const { data, error } = await supabase.schema(schema).from(table).insert(rows).select("*");
    if (error) return send(res, 400, { error: error.message, details: error });
    return send(res, 201, { data });
  });

  // BULK DELETE
  router.delete(`${base}`, requireEnv, requireAuth, async (req, res) => {
    const supabase = supabaseForReq(req);
    const ids = String(req.query.ids || "").split(",").map((x) => x.trim()).filter(Boolean);
    if (ids.length === 0) return send(res, 400, { error: "Provide query param ?ids=<comma,separated,ids>" });
    const { data, error } = await supabase.schema(schema).from(table).delete().in(pk, ids).select("*");
    if (error) return send(res, 400, { error: error.message, details: error });
    return send(res, 200, { data });
  });
}

// =========================================================
// MOUNT TABLES
// =========================================================

mountCrud({ name: "entities", table: "entities" });
mountCrud({ name: "accommodationprovider_listings", table: "accommodationprovider_listings" });
mountCrud({ name: "accommodationprovider_bookings", table: "accommodationprovider_bookings" });
mountCrud({ name: "accommodationprovider_reviews", table: "accommodationprovider_reviews" });
mountCrud({ name: "activitiesprovider_activities", table: "activitiesprovider_activities" });
mountCrud({ name: "activitiesprovider_bookings", table: "activitiesprovider_bookings" });
mountCrud({ name: "activitiesprovider_reviews", table: "activitiesprovider_reviews" });
mountCrud({ name: "entity_challenges", table: "entity_challenges" });
mountCrud({ name: "entity_collaboration", table: "entity_collaboration" });
mountCrud({ name: "government_problems", table: "government_problems" });
mountCrud({ name: "entity_ai_advice", table: "entity_ai_advice" });

// Friendly index
router.get("/", (req, res) => {
  res.json({ ok: true, schema: "tourism_entities", message: "Tourism API ready" });
});

export default router;
