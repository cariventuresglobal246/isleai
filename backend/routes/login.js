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
      persistSession: false,
      persistSessionCallback: () => null
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

        const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });

        if (authError || !authData?.user) {
          console.log('❌ Auth failed:', authError?.message || 'No user data');
          return done(null, false, { message: 'Invalid email or password' });
        }

        console.log('✅ Auth success for user:', authData.user.id);

        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, email, username, is_first_time_user')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profileData) {
          console.error('❌ Profile fetch failed:', profileError?.message);
          return done(null, false, { message: 'Authentication failed' });
        }

        console.log('✅ Profile loaded for:', profileData.username);

        const user = {
          id: profileData.id,
          email: profileData.email,
          username: profileData.username,
          isFirstTimeUser: profileData.is_first_time_user
        };

        return done(null, user);
      } catch (err) {
        console.error('💥 Strategy error:', err);
        return done(err);
      }
    }
  )
);

// Passport Serialization
passport.serializeUser((user, done) => {
  console.log('🔄 Serializing user:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('🔄 Deserializing user ID:', id);
    
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, username, is_first_time_user')
      .eq('id', id)
      .single();

    if (error || !profile) {
      console.error('❌ Deserialize failed:', error?.message);
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
    console.error('💥 Deserialize error:', err);
    done(err);
  }
});

// Login Route
router.post('/login', loginLimiter, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('💥 Passport authentication error:', err);
      return res.status(500).json({ 
        error: 'Internal server error', 
        message: 'Authentication process failed' 
      });
    }

    if (!user) {
      console.log('❌ Login failed:', info?.message);
      return res.status(401).json({ 
        error: 'Authentication failed', 
        message: info?.message || 'Invalid email or password' 
      });
    }

    console.log('✅ Preparing session for user:', user.id);

    req.login(user, (loginErr) => {
      if (loginErr) {
        console.error('💥 Session creation error:', loginErr);
        return res.status(500).json({ 
          error: 'Session creation failed', 
          message: 'Unable to create user session' 
        });
      }

      console.log('✅ Login successful, session created for:', user.id);

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isFirstTimeUser: user.isFirstTimeUser
        },
        message: 'Login successful'
      });
    });
  })(req, res, next);
});

// Logout Route
router.post('/logout', (req, res) => {
  console.log('🔓 Logout requested for user:', req.user?.id || 'anonymous');
  
  req.logout((err) => {
    if (err) {
      console.error('💥 Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.clearCookie('sid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
    });

    req.session.destroy((err) => {
      if (err) {
        console.error('💥 Session destroy error:', err);
        return res.status(500).json({ error: 'Session cleanup failed' });
      }
      
      res.clearCookie('sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

// Authentication Check Middleware
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log('✅ Auth middleware passed for:', req.user?.id);
    return next();
  }
  
  console.log('❌ Auth middleware failed - no session');
  res.status(401).json({ 
    error: 'Unauthorized', 
    message: 'Authentication required' 
  });
};

// Get Current User
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

// Global Error Handler
router.use((err, req, res, next) => {
  console.error('💥 Global error handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

export default router;