import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

/**
 * Tourism Onboarding Routes
 * - Auth via Supabase JWT in Authorization header
 * - Persists onboarding into: tourism_features.tourism_onboarding
 *
 * NOTE: This file expects these columns to exist:
 *   - selected_activities jsonb default '[]'
 *   - stay_listing_id uuid (optional but supported)
 */

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ---------------------------
// Auth middleware (Supabase JWT)
// ---------------------------
const requireSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing token" });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return res.status(401).json({ error: "Invalid token" });

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ [Auth] Middleware Error:", err);
    res.status(500).json({ error: "Server Auth Error" });
  }
};

// ---------------------------
// Helpers
// ---------------------------
const parseBudgetToTotal = (budget) => {
  const b = String(budget || "").trim();
  if (!b) return 0;
  const nums = b.replace(/[^0-9\-]/g, "");
  if (!nums) return 0;
  if (nums.includes("-")) {
    const [a, c] = nums.split("-").map((x) => Number(x || 0));
    return Number.isFinite(c) ? c : Number.isFinite(a) ? a : 0;
  }
  const n = Number(nums);
  return Number.isFinite(n) ? n : 0;
};

const normalizeStayOption = (stayOption) => {
  const s = String(stayOption || "").trim();
  if (!s) return { name: "No Accommodation", sub: "Not booked yet", location: "Barbados" };
  const match = s.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) return { name: match[1].trim(), sub: `${match[2].trim()} • Booked`, location: "Barbados" };
  return { name: s.slice(0, 80), sub: "Booked • Check-in 3:00pm", location: "Barbados" };
};

const normalizeGuestName = (guestName) => {
  const name = String(guestName || "").trim();
  return name || "Guest";
};

const normalizeTime = (t) => {
  const s = String(t || "").trim();
  if (!s) return "";
  // Accept HH:MM or HH:MM:SS; trim seconds if present
  const parts = s.split(":");
  if (parts.length >= 2) return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  return s;
};

const resolveGuestName = async (userId, guestName) => {
  const direct = normalizeGuestName(guestName);
  if (direct && direct !== "Guest") return direct;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, full_name, name, email")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) return direct;
    return normalizeGuestName(data.full_name || data.name || data.username || data.email || direct);
  } catch {
    return direct;
  }
};

const curatedTasksFromOnboarding = ({ interests = [], wantBucket = false }) => {
  const tasks = [
    {
      id: "t-init-1",
      title: "Confirm accommodation details",
      priority: "Must-Do",
      column_name: "Planning",
      subtasks: ["Verify check-in", "Save address"],
      recurring: false,
      timebox_mins: 15,
    },
    {
      id: "t-init-2",
      title: "Arrange airport transfer",
      priority: "Must-Do",
      column_name: "Planning",
      subtasks: ["Compare taxi/shuttle", "Confirm pickup"],
      recurring: false,
      timebox_mins: 20,
    },
  ];

  const I = new Set((Array.isArray(interests) ? interests : []).map((x) => String(x).toLowerCase()));
  if (I.has("adventure")) tasks.push({ id: "t-adv", title: "Book adventure activity", priority: "Nice-to-Have", column_name: "Planning" });
  if (I.has("culture")) tasks.push({ id: "t-cult", title: "Visit heritage site", priority: "Nice-to-Have", column_name: "On Island" });
  if (wantBucket) tasks.push({ id: "t-buck", title: "Review Bucket List", priority: "Must-Do", column_name: "Wishlist" });

  return tasks;
};

// ---------------------------
// Routes
// ---------------------------

router.get("/status", requireSupabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { country } = req.query;

    let query = supabase
      .schema("tourism_features")
      .from("tourism_onboarding")
      .select("*")
      .eq("user_id", userId);

    if (country) query = query.eq("country", country);

    const { data, error } = await query.maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.json({ hasCompletedOnboarding: false, onboarding: null });

    // ✅ Normalize keys for frontend compatibility
    res.json({
      hasCompletedOnboarding: true,
      onboarding: {
        ...data,
        selectedActivities: data.selected_activities || [],
        stayListingId: data.stay_listing_id || null,
      },
    });
  } catch (err) {
    console.error("Server error in GET /status:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/trip", requireSupabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: obData, error } = await supabase
      .schema("tourism_features")
      .from("tourism_onboarding")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!obData) return res.json({ found: false, message: "No data" });

    const accommodation = normalizeStayOption(obData.stay_option);
    const budgetTotal = parseBudgetToTotal(obData.budget);
    const tasks = curatedTasksFromOnboarding({
      interests: obData.interests,
      wantBucket: obData.want_bucket_list,
    });

    res.json({
      found: true,
      trip: {
        id: obData.session_id || "generated-trip-id",
        destination_country: obData.country,
        start_date: obData.start_date,
        end_date: obData.end_date,
        user_id: userId,
      },
      accommodation,
      budget: { total: budgetTotal, spent: 0, categories: [] },
      tasks: tasks.map((t, i) => ({ ...t, id: `gen-task-${i}` })),
      selectedActivities: obData.selected_activities || [],
      stayListingId: obData.stay_listing_id || null,
    });
  } catch (err) {
    console.error("Server error in GET /trip:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/debug-db", requireSupabaseAuth, async (req, res) => {
  try {
    const { count } = await supabase
      .schema("tourism_features")
      .from("tourism_onboarding")
      .select("*", { count: "exact", head: true });

    res.json({ check: "DB Connected", user: req.user.id, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/fix", requireSupabaseAuth, async (req, res) => res.json({ success: true }));

router.patch("/tasks/:taskId", requireSupabaseAuth, async (req, res) => {
  // Your current implementation is a stub; left as-is.
  res.json({ success: true });
});

// ---------------------------
// ✅ Create bookings (server-side, Service Role)
// ---------------------------
router.post("/book-accommodation", requireSupabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { listingId, checkIn, checkOut, guestName } = req.body || {};
    if (!listingId || !checkIn || !checkOut) {
      return res.status(400).json({ error: "Missing listingId/checkIn/checkOut" });
    }
    const resolvedGuestName = await resolveGuestName(userId, guestName);
    const { data, error } = await supabase
      .schema("tourism_entities")
      .from("accommodationprovider_bookings")
      .insert({
        listing_id: listingId,
        guest_name: resolvedGuestName,
        check_in: checkIn,
        check_out: checkOut,
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message, details: error });
    return res.json({ success: true, data });
  } catch (e) {
    console.error("Accommodation booking error:", e);
    return res.status(500).json({ error: e.message });
  }
});

router.post("/book-activity", requireSupabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { activityId, activityDate, activityTime, guestName } = req.body || {};
    if (!activityId || !activityDate || !activityTime) {
      return res.status(400).json({ error: "Missing activityId/activityDate/activityTime" });
    }
    const resolvedGuestName = await resolveGuestName(userId, guestName);
    const { data, error } = await supabase
      .schema("tourism_entities")
      .from("activitiesprovider_bookings")
      .insert({
        activity_id: activityId,
        guest_name: resolvedGuestName,
        activity_date: activityDate,
        activity_time: activityTime,
      })
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message, details: error });
    return res.json({ success: true, data });
  } catch (e) {
    console.error("Activity booking error:", e);
    return res.status(500).json({ error: e.message });
  }
});

// ✅ POST /complete: saves onboarding (manual update/insert) + selected activities
router.post("/complete", requireSupabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      sessionId,
      country,
      budget,
      startDate,
      endDate,
      wantReminder,
      stayOption,
      stayOptionLabel,
      stayListingId,
      interests,
      wantBucket,
      selectedActivities,
      guestName,
    } = req.body || {};

    const payload = {
      user_id: userId,
      session_id: sessionId || null,
      country: country || "Barbados",
      budget: budget ?? null,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      want_reminder: !!wantReminder,

      // Keep legacy field for existing UI logic
      stay_option: stayOptionLabel || stayOption || null,

      interests: Array.isArray(interests) ? interests : [],
      want_bucket_list: !!wantBucket,

      // ✅ NEW: persist activities + accommodation listing id
      selected_activities: Array.isArray(selectedActivities) ? selectedActivities : [],
      stay_listing_id: stayListingId || null,
    };

    // 1) Find existing entry (prevent duplicates per user+country)
    const { data: existing, error: findErr } = await supabase
      .schema("tourism_features")
      .from("tourism_onboarding")
      .select("id")
      .eq("user_id", userId)
      .eq("country", payload.country)
      .maybeSingle();

    if (findErr) throw findErr;

    let result;
    if (existing?.id) {
      const { data, error } = await supabase
        .schema("tourism_features")
        .from("tourism_onboarding")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .schema("tourism_features")
        .from("tourism_onboarding")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // ---------------------------
    // ✅ Create bookings from onboarding selections
    // ---------------------------
    const bookingErrors = [];
    const bookingsCreated = { accommodation: null, activities: [] };
    const resolvedGuestName = await resolveGuestName(userId, guestName);

    if (payload.stay_listing_id && payload.start_date && payload.end_date) {
      try {
        const { data: existingBooking, error: existsErr } = await supabase
          .schema("tourism_entities")
          .from("accommodationprovider_bookings")
          .select("id")
          .eq("listing_id", payload.stay_listing_id)
          .eq("guest_name", resolvedGuestName)
          .eq("check_in", payload.start_date)
          .eq("check_out", payload.end_date)
          .maybeSingle();

        if (!existsErr && !existingBooking) {
          const { data: bookingData, error: bookingErr } = await supabase
            .schema("tourism_entities")
            .from("accommodationprovider_bookings")
            .insert({
              listing_id: payload.stay_listing_id,
              guest_name: resolvedGuestName,
              check_in: payload.start_date,
              check_out: payload.end_date,
            })
            .select()
            .single();

          if (bookingErr) bookingErrors.push({ type: "accommodation", error: bookingErr.message });
          else bookingsCreated.accommodation = bookingData;
        }
      } catch (e) {
        bookingErrors.push({ type: "accommodation", error: e.message || String(e) });
      }
    }

    if (Array.isArray(payload.selected_activities) && payload.selected_activities.length) {
      for (const act of payload.selected_activities) {
        try {
          const activityId = act?.id || act?.activity_id;
          const activityDate = act?.scheduled_date || act?.activity_date;
          const activityTime = normalizeTime(act?.scheduled_time || act?.activity_time);
          if (!activityId || !activityDate || !activityTime) continue;

          const { data: existingAct, error: actExistsErr } = await supabase
            .schema("tourism_entities")
            .from("activitiesprovider_bookings")
            .select("id")
            .eq("activity_id", activityId)
            .eq("guest_name", resolvedGuestName)
            .eq("activity_date", activityDate)
            .eq("activity_time", activityTime)
            .maybeSingle();

          if (!actExistsErr && !existingAct) {
            const { data: actBooking, error: actBookingErr } = await supabase
              .schema("tourism_entities")
              .from("activitiesprovider_bookings")
              .insert({
                activity_id: activityId,
                guest_name: resolvedGuestName,
                activity_date: activityDate,
                activity_time: activityTime,
              })
              .select()
              .single();

            if (actBookingErr) bookingErrors.push({ type: "activity", activityId, error: actBookingErr.message });
            else bookingsCreated.activities.push(actBooking);
          }
        } catch (e) {
          bookingErrors.push({ type: "activity", activityId: act?.id, error: e.message || String(e) });
        }
      }
    }

    res.json({ success: true, data: result, bookings: bookingsCreated, bookingErrors });
  } catch (e) {
    console.error("Save error:", e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
