// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import session from "express-session";
import pgSession from "connect-pg-simple";
import passport from "passport";
import csurf from "csurf";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// Routes imports
import profileRoutes from "./routes/profile.js";
import apiRoutes from "./routes/api.js";
import loginRoutes, { isAuthenticated } from "./routes/login.js";
import paymentRoutes from "./routes/payment.js";
import notificationsRoutes from "./routes/notify.js";
import tourismOnboardingRoutes from "./routes/tourismOnboarding.js";
import touristController from "./routes/touristcontroller.js"; 
// ✅ Import the Tourism Entities router (which maps to your SQL schema)
import tourismEntitiesRouter from "./routes/TourismEntities.js"; 

// ---------- Supabase (for prompts_count) ----------
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ---------- App ----------
const app = express();
const isDev = process.env.NODE_ENV !== "production";
if (!isDev) app.set("trust proxy", 1);

// ---------- CORS ----------
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://isleai.pages.dev",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      console.warn(`CORS blocked request from: ${origin}`);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    exposedHeaders: ["Content-Range", "Range"],
  })
);
app.options("*", cors());

// ---------- Security (Helmet) ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", "https:", "data:"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.supabase.co",
          "https://maps.googleapis.com",
          "https://www.google.com",
          "https://*.gstatic.com",
        ],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        frameSrc: [
          "'self'",
          "https://www.google.com",
          "https://www.google.com/maps",
          "https://www.google.com/maps/embed",
          "https://maps.googleapis.com",
        ],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ---------- Session ----------
const PgSession = pgSession(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "session",
      createTableIfMissing: true,
    }),
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: isDev
      ? { secure: false, httpOnly: true, sameSite: "lax", maxAge: 24 * 60 * 60 * 1000 }
      : { secure: true, httpOnly: true, sameSite: "none", maxAge: 24 * 60 * 60 * 1000 },
  })
);

// ---------- Passport ----------
app.use(passport.initialize());
app.use(passport.session());

// ---------- CSRF ----------
const csrfProtection = csurf({
  cookie: isDev ? { httpOnly: false, secure: false, sameSite: "lax" } : { httpOnly: false, secure: true, sameSite: "none" },
});

// ---------- Rate limit ----------
const askLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many requests, please try again later.",
  keyGenerator: (req) => req.user?.id || req.sessionID || "anonymous",
});

// ---------- Debug ----------
app.get("/debug/session", (req, res) => {
  res.json({
    sessionID: req.sessionID,
    cookie: req.session?.cookie,
    passport: req.session?.passport,
    user: req.user || null,
  });
});

// ---------- Analytics helper ----------
async function incrementPromptsCount(userId) {
  try {
    const { data: promptData } = await supabase.from("prompts_count").select("id, count").eq("user_id", userId).single();
    if (promptData) {
      await supabase.from("prompts_count").update({ count: promptData.count + 1 }).eq("id", promptData.id);
    } else {
      await supabase.from("prompts_count").insert({ user_id: userId, count: 1 });
    }
  } catch (analyticsErr) {
    console.error("Analytics failed (non-blocking)", analyticsErr);
  }
}

// ---------- Country code helper ----------
const COUNTRY_CODE_MAP = {
  Barbados: "BB",
  "Trinidad and Tobago": "TT",
  Jamaica: "JM",
  "Saint Lucia": "LC",
  "Saint Kitts and Nevis": "KN",
  Grenada: "GD",
  Dominica: "DM",
  "Saint Vincent and the Grenadines": "VC",
  "Antigua and Barbuda": "AG",
  "The Bahamas": "BS",
  Bahamas: "BS",
  Belize: "BZ",
  Guyana: "GY",
  Suriname: "SR",
  Haiti: "HT",
  "Dominican Republic": "DO",
  Cuba: "CU",
  "Puerto Rico": "PR",
};

function getCountryCodeFromName(name) {
  if (!name || typeof name !== "string") return null;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(COUNTRY_CODE_MAP)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

// ---------- API Routes Mounting ----------

// 1. Mount Tourist Controller (JWT Based - No CSRF)
app.use("/tourist", touristController);

// 2. Auth Routes
app.use("/auth", loginRoutes);

// 3. Mount Tourism Entities (Accommodation/Activities Listings)
// ✅ UPDATED: Mounted at "/api" to match frontend Baje.jsx calls 
// (e.g., /api/accommodationprovider_listings)
// Support BOTH paths to fix all components:
app.use("/api", tourismEntitiesRouter);                   // Fixes Baje.jsx
app.use("/api/tourism-entities", tourismEntitiesRouter);  // Fixes ChallengesTab.jsx

// 4. General API Routes (Profile, Payment, Notify, etc.)
app.use("/api", profileRoutes);
app.use("/api", apiRoutes);
app.use("/api", paymentRoutes);
app.use("/api", notificationsRoutes);

// 5. Tourism Onboarding (Passport Session + CSRF protected)
app.use("/api/tourism-onboarding", tourismOnboardingRoutes);


// ---------- /ask (AI core) ----------
app.post("/ask", isAuthenticated, askLimiter, csrfProtection, async (req, res) => {
  try {
    const { prompt, userId, countryName } = req.body;

    if (!userId || userId !== req.user.id) return res.status(403).json({ error: "Unauthorized: User ID mismatch" });
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) return res.status(400).json({ error: "Prompt is required" });
    if (!process.env.GOOGLE_API_KEY) return res.status(500).json({ error: "AI service not configured" });

    incrementPromptsCount(req.user.id).catch(() => {});

    // ... (Map Intent Logic Omitted for brevity, assumed same as your original file) ...
    // Note: Ensure your full /ask logic from your original file is kept here.
    
    // Default Gemini Call
    const MODEL = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(process.env.GOOGLE_API_KEY)}`;
    const payload = { contents: [{ parts: [{ text: prompt.trim() }] }] };

    const aiResp = await axios.post(url, payload, { headers: { "Content-Type": "application/json" }, timeout: 30_000 });
    const text = aiResp?.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from Gemini";
    return res.json({ responseType: "text", response: text });

  } catch (err) {
    const status = err.response?.status ?? 500;
    const detail = err.response?.data?.error?.message ?? err.response?.data ?? err.message ?? "Unknown error";
    console.error("Gemini call failed", { status, detail });
    return res.status(status).json({ error: "LLM call failed", detail });
  }
});

// ---------- CSRF token ----------
app.get("/api/csrf-token", csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ---------- Global error ----------
app.use((err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});