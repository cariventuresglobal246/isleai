// routes/login.js
import express from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Security: Rate Limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts, please try again later.' });
  }
});

// Custom JSON Parsing with Error Handling
router.use(
  express.json({
    limit: '10kb',
    verify: (req, res, buf, encoding) => {
      try {
        JSON.parse(buf.toString(encoding));
      } catch (e) {
        const error = new Error('Invalid JSON payload');
        error.status = 400;
        throw error;
      }
    }
  })
);

// Passport Local Strategy
passport.use(
  'local',
  new LocalStrategy(
    { 
      usernameField: 'email', 
      passwordField: 'password',
      passReqToCallback: false 
    },
    async (email, password, done) => {
      try {
        console.log('🔍 Auth attempt for:', email.substring(0, 3) + '...');

        // 1. Sign in to Supabase (Get Tokens)
        const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });

        if (authError || !authData?.user) {
          console.log('❌ Auth failed:', authError?.message || 'No user data');
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('✅ Auth success for user:', authData.user.id);

        // 2. Fetch Profile
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, username, is_first_time_user')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profileData) {
          console.error('❌ Profile fetch failed:', profileError?.message);
          return done(null, false, { message: 'Authentication failed' });
        }

        // 3. Attach tokens to user object so we can send them later
        const user = {
          id: profileData.id,
          email: profileData.email,
          username: profileData.username,
          isFirstTimeUser: profileData.is_first_time_user,
          // 👇 CAPTURE TOKENS HERE
          accessToken: authData.session?.access_token,
          refreshToken: authData.session?.refresh_token
        };

        return done(null, user);
      } catch (err) {
        console.error('💥 Strategy error:', err);
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, is_first_time_user')
      .eq('id', id)
      .single();

    if (error || !profile) {
      return done(new Error('User profile not found during session restore'));
    }

    const user = {
      id: profile.id,
      email: profile.email,
      username: profile.username,
      isFirstTimeUser: profile.is_first_time_user
    };

    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Login Route
router.post('/login', loginLimiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!user) {
      return res.status(401).json({ 
        error: 'Authentication failed', 
        message: info?.message || 'Invalid email or password' 
      });
    }

    req.login(user, (loginErr) => {
      if (loginErr) {
        return res.status(500).json({ error: 'Session creation failed' });
      }

      // 👇 SEND TOKENS TO FRONTEND
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isFirstTimeUser: user.isFirstTimeUser
        },
        // This is what your frontend is trying to destructure:
        session: {
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        },
        message: 'Login successful'
      });
    });
  })(req, res, next);
});

// Logout Route
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Session cleanup failed' });
      res.clearCookie('sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
};

router.get('/me', isAuthenticated, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      isFirstTimeUser: req.user.isFirstTimeUser
    }
  });
});

export default router;