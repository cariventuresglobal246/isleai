import { supabase } from './supabaseClient.js';
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

// Validate Supabase client
if (!supabase || typeof supabase.from !== 'function') {
  logger.error('Supabase client is invalid or missing from method', {
    supabase: supabase ? JSON.stringify(Object.keys(supabase)) : 'undefined',
    SUPABASE_URL: process.env.SUPABASE_URL ? '[SET]' : undefined,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : undefined
  });
  console.error('❌ Supabase client is invalid or missing from method in sessionMemory.js');
  process.exit(1);
}

logger.info('Supabase client validated in sessionMemory.js', {
  url: process.env.SUPABASE_URL
});

// Get session messages
export async function getSessionMessages(userId, sessionId, limit = 10) {
  try {
    logger.debug('Attempting to fetch session messages', { userId, sessionId, limit });
    const { data, error } = await supabase
      .from('session_chats')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('Error fetching session messages', { userId, sessionId, error: error.message });
      throw error;
    }

    logger.info('Fetched session messages', { userId, sessionId, messageCount: data?.length || 0 });
    return data || [];
  } catch (err) {
    logger.error('getSessionMessages error', { userId, sessionId, error: err.message, stack: err.stack });
    throw err;
  }
}

// Save a message to session
export async function saveSessionMessage(userId, sessionId, role, content) {
  try {
    logger.debug('Attempting to save session message', { userId, sessionId, role });
    const { error } = await supabase
      .from('session_chats')
      .insert([{
        user_id: userId,
        session_id: sessionId,
        role,
        content,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      logger.error('Error saving session message', { userId, sessionId, role, error: error.message });
      throw error;
    }

    logger.info('Saved session message', { userId, sessionId, role });
  } catch (err) {
    logger.error('saveSessionMessage error', { userId, sessionId, error: err.message, stack: err.stack });
    throw err;
  }
}

// Keep only the last N messages
export async function pruneSessionMessages(userId, sessionId, keepLast = 10) {
  try {
    logger.debug('Attempting to prune session messages', { userId, sessionId, keepLast });
    const { data, error: selectError } = await supabase
      .from('session_chats')
      .select('id')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (selectError) {
      logger.error('Error selecting messages for pruning', { userId, sessionId, error: selectError.message });
      throw selectError;
    }

    if (!data || data.length <= keepLast) {
      logger.info('No messages to prune', { userId, sessionId, messageCount: data?.length || 0 });
      return;
    }

    const idsToDelete = data.slice(keepLast).map(d => d.id);
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('session_chats')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        logger.error('Error pruning session messages', { userId, sessionId, error: deleteError.message });
        throw deleteError;
      }

      logger.info('Pruned session messages', { userId, sessionId, deletedCount: idsToDelete.length });
    }
  } catch (err) {
    logger.error('pruneSessionMessages error', { userId, sessionId, error: err.message, stack: err.stack });
    throw err;
  }
}