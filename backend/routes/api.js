import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";
import { v4 as uuidv4 } from "uuid";
import csurf from "csurf";
import winston from "winston";
import { isAuthenticated } from "./login.js";

// ---------- Supabase ----------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.");
  process.exit(1);
}

// ---------- Logger ----------
const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.File({ filename: "error.log", level: "error" })],
});
if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

const router = Router();

// ---------- CSRF ----------
const csrfProtection = csurf({
  cookie: { httpOnly: false, secure: false, sameSite: "none" },
});

// ---------- Rate limit ----------
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many requests, please try again later.",
  keyGenerator: (req) => req.user?.id || "anonymous",
});

/* -------------------------------------------------------------------------- */
/*                             FACTS ENDPOINT                                 */
/* -------------------------------------------------------------------------- */
router.get("/facts", isAuthenticated, async (req, res) => {
  try {
    const { count, error: countError } = await supabase
      .from("sports")
      .select("*", { count: "exact", head: true });
    if (countError) throw countError;

    if (!count || count === 0) {
      const fallback = [
        { questions: "What is the capital of Barbados?", answers: "Bridgetown" },
        { questions: "What sport is most popular in Barbados?", answers: "Cricket" },
        { questions: "Who is a famous singer from Barbados?", answers: "Rihanna" },
      ];
      return res.json(fallback[Math.floor(Math.random() * fallback.length)]);
    }

    const randomOffset = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from("sports")
      .select("questions, answers")
      .range(randomOffset, randomOffset);
    if (error || !data.length) throw error || new Error("No fact data");

    res.json({ questions: data[0].questions, answers: data[0].answers });
  } catch (err) {
    logger.error("Failed to fetch fact", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to fetch fact", details: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                             TIPS ENDPOINT                                  */
/* -------------------------------------------------------------------------- */
router.get("/tips", isAuthenticated, async (req, res) => {
  try {
    const { count, error: countError } = await supabase
      .from("tourist_tips")
      .select("*", { count: "exact", head: true });
    if (countError) throw countError;

    if (!count || count === 0) {
      const defaultTip = { id: uuidv4(), tip_text: "Take a catamaran cruise to swim with turtles off the coast." };
      await supabase.from("tourist_tips").insert(defaultTip);
      return res.json(defaultTip);
    }

    const randomOffset = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from("tourist_tips")
      .select("id, tip_text")
      .range(randomOffset, randomOffset);
    if (error || !data.length) throw error || new Error("No tip data");

    res.json({ id: data[0].id, tip_text: data[0].tip_text });
  } catch (err) {
    logger.error("Failed to fetch tip", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to fetch tip", details: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                             CHAT SAVE ENDPOINT                             */
/* -------------------------------------------------------------------------- */
router.post("/chat/save", isAuthenticated, csrfProtection, async (req, res) => {
  const { sessionId, messages, title, snippet, userId } = req.body;
  try {
    if (userId !== req.user.id) {
      logger.warn("User ID mismatch", { requestUserId: userId, authUserId: req.user.id });
      return res.status(403).json({ error: "Unauthorized: User ID mismatch" });
    }

    const chatData = {
      id: sessionId,
      user_id: req.user.id,
      title: title || "Chat Session",
      snippet: snippet || "No user messages",
      messages,
      updated_at: new Date().toISOString(),
    };

    const { data: existingChat } = await supabase
      .from("saved_chats")
      .select("id")
      .eq("id", sessionId)
      .eq("user_id", req.user.id)
      .single();

    if (existingChat) {
      await supabase
        .from("saved_chats")
        .update(chatData)
        .eq("id", sessionId)
        .eq("user_id", req.user.id);
    } else {
      await supabase.from("saved_chats").insert(chatData);
    }

    logger.info("Chat saved", { sessionId, userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    logger.error("Failed to save chat", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to save chat", details: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                             UPLOAD ENDPOINTS                               */
/* -------------------------------------------------------------------------- */
router.post("/upload/request", isAuthenticated, csrfProtection, async (req, res) => {
  const { fileName, fileType, fileSize, userId } = req.body;
  const allowedTypes = ["image/jpeg", "image/png"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  if (!allowedTypes.includes(fileType))
    return res.status(400).json({ error: "Unsupported file type" });
  if (fileSize > MAX_FILE_SIZE)
    return res.status(400).json({ error: "File too large" });
  if (userId !== req.user.id)
    return res.status(403).json({ error: "Unauthorized: User ID mismatch" });

  try {
    const fileId = `${req.user.id}/${uuidv4()}-${fileName}`;
    const { data, error } = await supabase.storage
      .from("avatars")
      .createSignedUploadUrl(fileId, { expiresIn: 300 });
    if (error) throw error;

    logger.info("Avatar upload URL generated", { fileId, userId });
    res.json({ uploadUrl: data.signedUrl, fileId });
  } catch (err) {
    logger.error("Failed to generate avatar upload URL", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to generate upload URL", details: err.message });
  }
});

router.post("/upload/complete", isAuthenticated, csrfProtection, async (req, res) => {
  const { fileId, originalName, userId } = req.body;
  if (userId !== req.user.id)
    return res.status(403).json({ error: "Unauthorized: User ID mismatch" });

  try {
    const { data: publicUrl } = await supabase.storage.from("avatars").getPublicUrl(fileId);
    if (!publicUrl)
      return res.status(400).json({ error: "Avatar upload incomplete" });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: fileId })
      .eq("id", req.user.id);
    if (updateError) throw updateError;

    await supabase.from("notifications").insert({
      user_id: req.user.id,
      message: `You uploaded a new avatar: ${originalName}`,
    });

    res.json({ publicUrl: publicUrl.publicUrl, message: `Avatar uploaded: ${originalName}` });
  } catch (err) {
    logger.error("Failed to complete avatar upload", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to complete upload", details: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                          NOTIFICATIONS ENDPOINT                           */
/* -------------------------------------------------------------------------- */
router.get("/notifications", isAuthenticated, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    logger.error("Failed to fetch notifications", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to fetch notifications", details: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                             USAGE ENDPOINT                                 */
/* -------------------------------------------------------------------------- */
router.post("/usage", isAuthenticated, csrfProtection, async (req, res) => {
  const { sessionId, durationSeconds, userId } = req.body;
  if (userId !== req.user.id)
    return res.status(403).json({ error: "Unauthorized: User ID mismatch" });

  try {
    await supabase.from("chat_usage").insert({
      id: uuidv4(),
      chat_session_id: sessionId,
      user_id: req.user.id,
      usage_time: durationSeconds,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    logger.info("Usage time saved", { sessionId, userId, durationSeconds });
    res.json({ success: true });
  } catch (err) {
    logger.error("Failed to save usage time", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to save usage time", details: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/*                         GET ALL SAVED CHATS (user-specific)                */
/* -------------------------------------------------------------------------- */
router.get("/chat/saved", isAuthenticated, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("saved_chats")
      .select("id, title, snippet, updated_at, messages")
      .eq("user_id", req.user.id)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    logger.error("Failed to fetch saved chats", { error: err.message, stack: err.stack });
    res.status(500).json({ error: "Failed to fetch saved chats" });
  }
});

export default router;