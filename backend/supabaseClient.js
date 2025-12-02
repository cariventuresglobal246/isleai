// supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import winston from 'winston';

// Logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.File({ filename: 'error.log', level: 'error' })]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('Missing Supabase environment variables', {
    SUPABASE_URL: process.env.SUPABASE_URL ? '[SET]' : undefined,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : undefined
  });
  throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
}

// Initialize and export client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Runtime sanity check
if (!supabase || typeof supabase.from !== 'function') {
  console.error('❌ Supabase client invalid:', supabase);
  throw new Error('Supabase client is invalid. Check version and imports.');
}

logger.info('Supabase client initialized successfully', { url: process.env.SUPABASE_URL });
