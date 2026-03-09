const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const SUPPORTED_APPS = [
  "TikTok",
  "Instagram",
  "Facebook",
  "WhatsApp",
  "YouTube",
];

// ---------------------------------------------------------------
// POST /screen-time/log
// Body: { app_name, minutes_used, log_date? }
// Upsert daily screen time for a specific app
// ---------------------------------------------------------------
router.post("/log", authRequired, async (req, res) => {
  try {
    const { app_name, minutes_used, log_date } = req.body;

    if (!app_name || minutes_used === undefined) {
      return res.status(400).json({ message: "app_name and minutes_used are required" });
    }

    const date = log_date || new Date().toISOString().split("T")[0];

    await pool.query(
      `INSERT INTO screen_time_logs (user_id, app_name, log_date, minutes_used)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE minutes_used = ?`,
      [req.user.id, app_name, date, minutes_used, minutes_used]
    );

    res.json({ message: "Screen time logged" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to log screen time" });
  }
});

// ---------------------------------------------------------------
// GET /screen-time/today
// Returns today's usage per app for the current user
// ---------------------------------------------------------------
router.get("/today", authRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [rows] = await pool.query(
      `SELECT app_name, minutes_used
       FROM screen_time_logs
       WHERE user_id = ? AND log_date = ?`,
      [req.user.id, today]
    );

    // Merge with limits
    const [limits] = await pool.query(
      "SELECT app_name, daily_limit_minutes FROM app_limits WHERE user_id = ?",
      [req.user.id]
    );
    const limitMap = {};
    limits.forEach((l) => { limitMap[l.app_name] = l.daily_limit_minutes; });

    const result = rows.map((r) => ({
      app_name: r.app_name,
      minutes_used: r.minutes_used,
      daily_limit_minutes: limitMap[r.app_name] || null,
      limit_exceeded: limitMap[r.app_name]
        ? r.minutes_used >= limitMap[r.app_name]
        : false,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch today's usage" });
  }
});

// ---------------------------------------------------------------
// GET /screen-time/report?period=weekly|monthly
// Returns aggregated screen time report
// ---------------------------------------------------------------
router.get("/report", authRequired, async (req, res) => {
  try {
    const period = req.query.period || "weekly";
    const intervalDays = period === "monthly" ? 30 : 7;

    const [rows] = await pool.query(
      `SELECT app_name, log_date, minutes_used
       FROM screen_time_logs
       WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY log_date ASC`,
      [req.user.id, intervalDays]
    );

    // Daily totals
    const dailyMap = {};
    rows.forEach((r) => {
      if (!dailyMap[r.log_date]) dailyMap[r.log_date] = { date: r.log_date, total_minutes: 0 };
      dailyMap[r.log_date].total_minutes += r.minutes_used;
    });

    // Per-app totals
    const appMap = {};
    rows.forEach((r) => {
      appMap[r.app_name] = (appMap[r.app_name] || 0) + r.minutes_used;
    });

    res.json({
      period,
      daily_usage: Object.values(dailyMap),
      per_app_totals: Object.entries(appMap).map(([app_name, total_minutes]) => ({
        app_name,
        total_minutes,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate report" });
  }
});

// ---------------------------------------------------------------
// GET /screen-time/limits
// Returns the user's configured app limits
// ---------------------------------------------------------------
router.get("/limits", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT app_name, daily_limit_minutes FROM app_limits WHERE user_id = ?",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch limits" });
  }
});

// ---------------------------------------------------------------
// PUT /screen-time/limits
// Body: [{ app_name, daily_limit_minutes }]  OR  { app_name, daily_limit_minutes }
// Upsert limits for one or many apps
// ---------------------------------------------------------------
router.put("/limits", authRequired, async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : [req.body];

    for (const entry of payload) {
      const { app_name, daily_limit_minutes } = entry;
      if (!app_name || daily_limit_minutes === undefined) {
        return res.status(400).json({ message: "app_name and daily_limit_minutes are required" });
      }

      await pool.query(
        `INSERT INTO app_limits (user_id, app_name, daily_limit_minutes)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE daily_limit_minutes = ?`,
        [req.user.id, app_name, daily_limit_minutes, daily_limit_minutes]
      );
    }

    res.json({ message: "Limits saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save limits" });
  }
});

// ---------------------------------------------------------------
// POST /screen-time/focus
// Body: { label?, start_time, end_time }
// Start a focus session
// ---------------------------------------------------------------
router.post("/focus", authRequired, async (req, res) => {
  try {
    const { label, start_time, end_time } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({ message: "start_time and end_time are required" });
    }

    const [result] = await pool.query(
      `INSERT INTO focus_sessions (user_id, label, start_time, end_time)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, label || "Focus Session", start_time, end_time]
    );

    res.json({ id: result.insertId, message: "Focus session started" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to start focus session" });
  }
});

// ---------------------------------------------------------------
// GET /screen-time/focus
// Returns active / recent focus sessions for the user
// ---------------------------------------------------------------
router.get("/focus", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM focus_sessions
       WHERE user_id = ?
       ORDER BY start_time DESC
       LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch focus sessions" });
  }
});

// ---------------------------------------------------------------
// POST /screen-time/focus/:id/override
// Increment override count for a focus session (limited per week)
// ---------------------------------------------------------------
router.post("/focus/:id/override", authRequired, async (req, res) => {
  try {
    const MAX_OVERRIDES_PER_WEEK = 3;

    // Count overrides this week
    const [weekRows] = await pool.query(
      `SELECT SUM(overrides_used) AS total
       FROM focus_sessions
       WHERE user_id = ?
         AND start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [req.user.id]
    );
    const totalOverrides = Number(weekRows[0].total || 0);

    if (totalOverrides >= MAX_OVERRIDES_PER_WEEK) {
      return res.status(429).json({
        message: `Override limit reached (${MAX_OVERRIDES_PER_WEEK} per week)`,
      });
    }

    await pool.query(
      "UPDATE focus_sessions SET overrides_used = overrides_used + 1 WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );

    res.json({ message: "Override applied" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Override failed" });
  }
});

// ---------------------------------------------------------------
// GET /screen-time/supported-apps
// Returns the list of supported social media apps
// ---------------------------------------------------------------
router.get("/supported-apps", (req, res) => {
  res.json(SUPPORTED_APPS);
});

module.exports = router;
