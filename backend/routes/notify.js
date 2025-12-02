// routes/notify.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { isAuthenticated } from './login.js';

const router = express.Router();

// Validate required env var
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/notifications — fetch user's notifications
router.get('/notifications', isAuthenticated, async (req, res) => {
  try {
    console.log(`Fetching notifications for user: ${req.user.id}`); // Debug log

    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, description, type, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Found ${data?.length || 0} notifications`); // Debug log

    // Optional: If no user-specific results, log a warning (remove in prod)
    if (!data || data.length === 0) {
      console.warn(`No notifications for user ${req.user.id}. Check if user_id is backfilled in DB.`);
    }

    return res.json(data || []);
  } catch (err) {
    console.error('Supabase GET error:', err);
    return res.status(500).json({
      error: 'Failed to fetch notifications',
      details: err.message,
    });
  }
});

// POST /api/notifications — create a new notification
router.post('/notifications', isAuthenticated, async (req, res) => {
  const { title, description, type = 'ai' } = req.body;

  // Validation
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const cleanTitle = title.trim();
  const cleanDesc = description?.trim() || '';
  const cleanType = type.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: req.user.id,
        title: cleanTitle,
        description: cleanDesc,
        type: cleanType,
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Created notification for user ${req.user.id}: ${cleanTitle}`); // Debug log

    return res.status(201).json(data);
  } catch (err) {
    console.error('Supabase POST error:', err);
    return res.status(500).json({
      error: 'Failed to create notification',
      details: err.message,
    });
  }
});

export default router;