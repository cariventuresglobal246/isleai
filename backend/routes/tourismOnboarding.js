// routes/tourismOnboarding.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { isAuthenticated } from './login.js';

const router = express.Router();

// ---- SUPABASE SERVICE CLIENT ----
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// NO csurf here – we rely on server.js

router.get('/status', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const country = req.query.country || 'Barbados';

    const { data, error } = await supabase
      .from('tourism_onboarding')
      .select(
        'id, has_completed_onboarding, session_id, country, budget, start_date, end_date, want_reminder, stay_option, interests, want_bucket_list'
      )
      .eq('user_id', userId)
      .eq('country', country)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Supabase error in /status:', error);
      return res.status(500).json({ error: 'Failed to fetch onboarding status' });
    }

    if (!data) {
      return res.json({
        hasCompletedOnboarding: false,
        onboarding: null,
      });
    }

    return res.json({
      hasCompletedOnboarding: !!data.has_completed_onboarding,
      onboarding: data,
    });
  } catch (err) {
    console.error('Error in GET /api/tourism-onboarding/status:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/complete', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      sessionId,
      country,
      budget,
      startDate,
      endDate,
      wantReminder,
      stayOption,
      interests,
      wantBucket,
    } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const countryName = country || 'Barbados';

    const payload = {
      user_id: userId,
      session_id: sessionId,
      country: countryName,
      budget: budget || null,
      start_date: startDate || null,
      end_date: endDate || null,
      want_reminder: !!wantReminder,
      stay_option: stayOption || null,
      interests: Array.isArray(interests) ? interests : [],
      want_bucket_list: !!wantBucket,
      has_completed_onboarding: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tourism_onboarding')
      .upsert(payload, {
        onConflict: 'user_id,session_id,country',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error in /complete:', error);
      return res.status(500).json({ error: 'Failed to save onboarding data' });
    }

    return res.status(200).json({
      message: 'Onboarding saved successfully',
      onboarding: data,
    });
  } catch (err) {
    console.error('Error in POST /api/tourism-onboarding/complete:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
