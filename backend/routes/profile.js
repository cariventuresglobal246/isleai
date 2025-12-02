// routes/profile.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { isAuthenticated } from './login.js';
import rateLimit from 'express-rate-limit';
import csurf from 'csurf';
import multer from 'multer';

const router = express.Router();

// ——— SUPABASE CLIENT ———
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ——— MULTER CONFIG ———
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG/PNG images are allowed'));
    }
  },
});

// ——— MIDDLEWARE ———
const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests' },
});

const csrfProtection = csurf({
  cookie: { httpOnly: false, secure: false, sameSite: 'lax' },
});

// ——— GET /api/profile ———
router.get(
  '/profile',
  isAuthenticated,
  profileLimiter,
  csrfProtection,
  async (req, res) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, username, avatar_url')
        .eq('id', req.user.id)
        .single();

      if (error || !profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({
        id: profile.id,
        name: profile.username || 'User',
        email: profile.email || '',
        initials: profile.username
          ? profile.username.charAt(0).toUpperCase()
          : 'JD',
        avatarUrl: profile.avatar_url || null,
      });
    } catch (err) {
      console.error('Profile fetch error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ——— POST /api/profile/avatar ———
router.post(
  '/profile/avatar',
  isAuthenticated,
  profileLimiter,
  csrfProtection,
  upload.single('file'), // ← expects <input name="file">
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;

      // ——— GENERATE SAFE FILENAME ———
      const ext = file.originalname.split('.').pop().toLowerCase();
      const fileName = `${req.user.id}_${Date.now()}.${ext}`;
      const filePath = `avatars/${req.user.id}/${fileName}`;

      // ——— UPLOAD TO SUPABASE ———
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image' });
      }

      // ——— GET PUBLIC URL ———
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = data.publicUrl;

      // ——— UPDATE DB ———
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', req.user.id);

      if (dbError) {
        console.error('DB update error:', dbError);
        return res.status(500).json({ error: 'Failed to save avatar' });
      }

      res.json({ avatarUrl });
    } catch (err) {
      console.error('Avatar upload error:', err);
      res.status(500).json({ error: err.message || 'Upload failed' });
    }
  }
);

export default router;