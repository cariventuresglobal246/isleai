import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import passport from 'passport';
import csurf from 'csurf';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// ---------- Supabase (for prompts_count) ----------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- App ----------
const app = express();
const isDev = process.env.NODE_ENV !== 'production';
if (!isDev) app.set('trust proxy', 1);

// ---------- CORS ----------
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://isleai.pages.dev',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      console.warn(`CORS blocked request from: ${origin}`);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);
app.options('*', cors());

// ---------- Security (CSP expanded for Google Maps) ----------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: [
          "'self'",
          'data:',
          'https://*.supabase.co',
          'https://maps.googleapis.com',
          'https://www.google.com',
          'https://*.gstatic.com',
        ],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        frameSrc: [
          "'self'",
          'https://www.google.com',
          'https://www.google.com/maps',
          'https://www.google.com/maps/embed',
          'https://maps.googleapis.com',
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
      tableName: 'session',
      createTableIfMissing: true,
    }),
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: isDev
      ? { secure: false, httpOnly: true, sameSite: 'lax', maxAge: 24 * 60 * 60 * 1000 }
      : { secure: true, httpOnly: true, sameSite: 'none', maxAge: 24 * 60 * 60 * 1000 },
  })
);

// ---------- Passport ----------
app.use(passport.initialize());
app.use(passport.session());

const csrfProtection = csurf({
  cookie: isDev
    ? { httpOnly: false, secure: false, sameSite: 'lax' }
    : { httpOnly: false, secure: true, sameSite: 'none' },
});

// ---------- Rate limit ----------
const askLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many requests, please try again later.',
  keyGenerator: (req) => req.user?.id || req.sessionID || 'anonymous',
});

// ---------- Debug ----------
app.get('/debug/session', (req, res) => {
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
    const { data: promptData } = await supabase
      .from('prompts_count')
      .select('id, count')
      .eq('user_id', userId)
      .single();

    if (promptData) {
      await supabase
        .from('prompts_count')
        .update({ count: promptData.count + 1 })
        .eq('id', promptData.id);
    } else {
      await supabase
        .from('prompts_count')
        .insert({ user_id: userId, count: 1 });
    }
  } catch (analyticsErr) {
    console.error('Analytics failed (non-blocking)', analyticsErr);
  }
}

// ---------- Country code helper for geocoding ----------
const COUNTRY_CODE_MAP = {
  Barbados: 'BB',
  'Trinidad and Tobago': 'TT',
  Jamaica: 'JM',
  'Saint Lucia': 'LC',
  'Saint Kitts and Nevis': 'KN',
  Grenada: 'GD',
  Dominica: 'DM',
  'Saint Vincent and the Grenadines': 'VC',
  'Antigua and Barbuda': 'AG',
  'The Bahamas': 'BS',
  Bahamas: 'BS',
  Belize: 'BZ',
  Guyana: 'GY',
  Suriname: 'SR',
  Haiti: 'HT',
  'Dominican Republic': 'DO',
  Cuba: 'CU',
  'Puerto Rico': 'PR',
};

function getCountryCodeFromName(name) {
  if (!name || typeof name !== 'string') return null;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(COUNTRY_CODE_MAP)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

// ---------- Routes imports ----------
import profileRoutes from './routes/profile.js';
import apiRoutes from './routes/api.js';
import loginRoutes, { isAuthenticated } from './routes/login.js';
import paymentRoutes from './routes/payment.js';
import notificationsRoutes from './routes/notify.js';
// ✅ NEW: tourism onboarding routes
import tourismOnboardingRoutes from './routes/tourismOnboarding.js';

// ---------- /ask (AI core) ----------
app.post('/ask', isAuthenticated, askLimiter, csrfProtection, async (req, res) => {
  try {
    const { prompt, userId, countryName } = req.body;

    // ---- validation -------------------------------------------------
    if (!userId || userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: User ID mismatch' });
    }
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY missing in .env');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    // count every prompt (map or text)
    incrementPromptsCount(req.user.id).catch(() => {});

    // ---- Tourism Map Intent detection (with strict country lock) ----
    const lowerPrompt = prompt.toLowerCase();
    const isTourism = lowerPrompt.includes('tourism:');
    const isMapIntent =
      /\bmap\b/.test(lowerPrompt) ||
      /where is\b/.test(lowerPrompt) ||
      /location of\b/.test(lowerPrompt) ||
      /directions to\b/.test(lowerPrompt) ||
      /show me\b.*\bmap\b/.test(lowerPrompt);

    if (isTourism && isMapIntent) {
      // Extract "user text" after the last colon
      const lastColonIndex = prompt.lastIndexOf(':');
      const rawUser =
        lastColonIndex !== -1 ? prompt.slice(lastColonIndex + 1).trim() : prompt.trim();

      let placeQuery = null;

      const tryExtract = (regex) => {
        if (placeQuery) return;
        const m = regex.exec(rawUser);
        if (m && m[1]) {
          placeQuery = m[1].split(/[?.!,]/)[0].trim();
        }
      };

      tryExtract(/map of (.+)/i);
      tryExtract(/map for (.+)/i);
      tryExtract(/where is (.+)/i);
      tryExtract(/location of (.+)/i);
      tryExtract(/directions to (.+)/i);
      tryExtract(/show me (.+) on the map/i);

      if (!placeQuery) {
        placeQuery = rawUser;
      }

      const countryLabel =
        countryName && typeof countryName === 'string' ? countryName.trim() : null;

      // e.g. "Folkestone, Barbados"
      if (countryLabel) {
        const lowerPlace = placeQuery.toLowerCase();
        const lowerCountry = countryLabel.toLowerCase();
        if (!lowerPlace.includes(lowerCountry)) {
          placeQuery = `${placeQuery}, ${countryLabel}`;
        }
      }

      const countryCode = getCountryCodeFromName(countryLabel);

      // Use either GOOGLE_MAPS_EMBED_API_KEY or fall back to GOOGLE_API_KEY for geocoding
      const geocodeKey =
        process.env.GOOGLE_MAPS_EMBED_API_KEY || process.env.GOOGLE_API_KEY;

      let mapEmbedUrl = null;
      let resolvedLat = null;
      let resolvedLng = null;

      // Try precise geocoding restricted to the flag country
      if (geocodeKey && countryCode) {
        try {
          const geoResp = await axios.get(
            'https://maps.googleapis.com/maps/api/geocode/json',
            {
              params: {
                address: placeQuery,
                components: `country:${countryCode}`,
                key: geocodeKey,
              },
              timeout: 10000,
            }
          );

          const firstResult = geoResp.data?.results?.[0];
          const location = firstResult?.geometry?.location;

          if (location?.lat != null && location?.lng != null) {
            resolvedLat = location.lat;
            resolvedLng = location.lng;
          }
        } catch (geoErr) {
          console.error('Geocoding failed, falling back to simple query', geoErr?.message || geoErr);
        }
      }

      // If we got lat/lng, lock the embed to those coordinates
      if (resolvedLat != null && resolvedLng != null) {
        if (process.env.GOOGLE_MAPS_EMBED_API_KEY) {
          const mapsKey = encodeURIComponent(process.env.GOOGLE_MAPS_EMBED_API_KEY);
          mapEmbedUrl = `https://www.google.com/maps/embed/v1/view?key=${mapsKey}&center=${resolvedLat},${resolvedLng}&zoom=15`;
        } else {
          // No Embed API key: still lock to lat/lng with a basic embed
          mapEmbedUrl = `https://www.google.com/maps?q=${resolvedLat},${resolvedLng}&z=15&output=embed`;
        }
      }

      // Fallback if geocoding failed
      if (!mapEmbedUrl) {
        const q = encodeURIComponent(placeQuery);
        if (process.env.GOOGLE_MAPS_EMBED_API_KEY) {
          const mapsKey = encodeURIComponent(process.env.GOOGLE_MAPS_EMBED_API_KEY);
          mapEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=${mapsKey}&q=${q}`;
        } else {
          mapEmbedUrl = `https://www.google.com/maps?q=${q}&output=embed`;
        }
      }

      return res.json({
        responseType: 'map',
        title: placeQuery,
        mapEmbedUrl,
        text: `Here’s ${placeQuery} on the map.`,
      });
    }

    // ---- Gemini normal text mode ------------------------------------
    const MODEL = 'gemini-2.0-flash';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(
      process.env.GOOGLE_API_KEY
    )}`;

    const payload = {
      contents: [{ parts: [{ text: prompt.trim() }] }],
    };

    const aiResp = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    const text =
      aiResp?.data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      'No response from Gemini';

    return res.json({ responseType: 'text', response: text });
  } catch (err) {
    const status = err.response?.status ?? 500;
    const detail =
      err.response?.data?.error?.message ??
      err.response?.data ??
      err.message ??
      'Unknown error';

    console.error('Gemini call failed', { status, detail });
    return res.status(status).json({
      error: 'LLM call failed',
      detail,
    });
  }
});

// ---------- CSRF token ----------
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ---------- Routes ----------
app.use('/auth', loginRoutes);
app.use('/api', profileRoutes);
app.use('/api', apiRoutes);
app.use('/api', paymentRoutes);
app.use('/api', notificationsRoutes);
// ✅ NEW: mount tourism onboarding routes
// final endpoints: /api/tourism-onboarding/status, /api/tourism-onboarding/complete
app.use('/api/tourism-onboarding', csrfProtection, tourismOnboardingRoutes);

// ---------- Global error ----------
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// ---------- Start ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
