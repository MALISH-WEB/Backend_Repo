const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// ---------------------------------------------------------------
// GET /wellness/tips
// Query: category (addiction|productivity|screen_health|motivation), limit
// ---------------------------------------------------------------
router.get("/tips", async (req, res) => {
  try {
    const { category, limit = 10 } = req.query;
    const params = [];
    let sql = "SELECT id, category, content FROM wellness_tips WHERE active = 1";

    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }

    // Use count-based offset for random selection (more efficient than ORDER BY RAND())
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM wellness_tips WHERE active = 1${category ? " AND category = ?" : ""}`,
      category ? [category] : []
    );
    const total = Number(countRows[0].cnt);
    const maxLimit = Math.min(Number(limit), total);
    const offset = total > maxLimit ? Math.floor(Math.random() * (total - maxLimit)) : 0;

    sql += " LIMIT ? OFFSET ?";
    params.push(maxLimit, offset);

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch tips" });
  }
});

// ---------------------------------------------------------------
// GET /wellness/daily-message
// Returns a single motivational message for the day
// ---------------------------------------------------------------
router.get("/daily-message", async (req, res) => {
  try {
    // Use day-of-year as deterministic seed so the message stays stable for the day
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );

    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM wellness_tips WHERE active = 1 AND category = 'motivation'"
    );
    const total = Number(countRow.cnt);
    const offset = total > 0 ? dayOfYear % total : 0;

    const [rows] = await pool.query(
      `SELECT id, content
       FROM wellness_tips
       WHERE active = 1 AND category = 'motivation'
       ORDER BY id ASC
       LIMIT 1 OFFSET ?`,
      [offset]
    );

    const message = rows[0]
      ? rows[0].content
      : "Keep going – every productive moment counts!";

    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch daily message" });
  }
});

// ---------------------------------------------------------------
// GET /wellness/summary
// Returns a personalised wellness summary for the logged-in user
// ---------------------------------------------------------------
router.get("/summary", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    // Last 7 days screen time
    const [screenRows] = await pool.query(
      `SELECT SUM(minutes_used) AS total_minutes_week
       FROM screen_time_logs
       WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
      [userId]
    );
    const totalMinutesWeek = Number(screenRows[0]?.total_minutes_week || 0);

    // Modules completed
    const [[modulesRow]] = await pool.query(
      "SELECT COUNT(*) AS completed FROM learning_progress WHERE user_id = ? AND completed = 1",
      [userId]
    );

    // Points & level
    const [[userRow]] = await pool.query(
      "SELECT points, level FROM users WHERE id = ?",
      [userId]
    );

    // Ad engagements
    const [[adsRow]] = await pool.query(
      "SELECT COUNT(*) AS engaged FROM ad_engagements WHERE user_id = ?",
      [userId]
    );

    // Random tip using offset (more efficient than ORDER BY RAND())
    const [[tipCountRow]] = await pool.query(
      "SELECT COUNT(*) AS cnt FROM wellness_tips WHERE active = 1"
    );
    const tipTotal = Number(tipCountRow.cnt);
    const tipOffset = tipTotal > 0 ? Math.floor(Math.random() * tipTotal) : 0;
    const [tipRows] = await pool.query(
      "SELECT content FROM wellness_tips WHERE active = 1 ORDER BY id ASC LIMIT 1 OFFSET ?",
      [tipOffset]
    );

    res.json({
      screen_time_last_7_days_minutes: totalMinutesWeek,
      modules_completed: Number(modulesRow.completed),
      total_points: userRow ? userRow.points : 0,
      current_level: userRow ? userRow.level : "Bronze",
      ads_engaged: Number(adsRow.engaged),
      tip_of_the_moment: tipRows[0]?.content || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch wellness summary" });
  }
});

// ---------------------------------------------------------------
// POST /wellness/tips  (admin) – add a new wellness tip
// Body: { category, content }
// ---------------------------------------------------------------
router.post("/tips", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { category, content } = req.body;
    if (!category || !content) {
      return res.status(400).json({ message: "category and content are required" });
    }

    const [result] = await pool.query(
      "INSERT INTO wellness_tips (category, content) VALUES (?, ?)",
      [category, content]
    );

    res.json({ id: result.insertId, message: "Tip added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add tip" });
  }
});

module.exports = router;
