const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const LEVEL_THRESHOLDS = { Bronze: 0, Silver: 500, Gold: 1500 };

async function recalculateLevel(userId, conn) {
  const db = conn || pool;
  const [[user]] = await db.query("SELECT points FROM users WHERE id = ?", [userId]);
  const pts = user ? user.points : 0;

  let newLevel = "Bronze";
  if (pts >= LEVEL_THRESHOLDS.Gold) newLevel = "Gold";
  else if (pts >= LEVEL_THRESHOLDS.Silver) newLevel = "Silver";

  await db.query("UPDATE users SET level = ? WHERE id = ?", [newLevel, userId]);
  return newLevel;
}

async function awardPoints(userId, points, reason, conn) {
  const db = conn || pool;
  await db.query("UPDATE users SET points = points + ? WHERE id = ?", [points, userId]);
  await db.query(
    "INSERT INTO point_transactions (user_id, points, reason) VALUES (?, ?, ?)",
    [userId, points, reason]
  );
  return recalculateLevel(userId, conn);
}

// ---------------------------------------------------------------
// GET /rewards/profile
// Returns the current user's points, level, and transaction history
// ---------------------------------------------------------------
router.get("/profile", authRequired, async (req, res) => {
  try {
    const [[user]] = await pool.query(
      "SELECT id, name, points, level FROM users WHERE id = ?",
      [req.user.id]
    );

    const [transactions] = await pool.query(
      `SELECT points, reason, created_at
       FROM point_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ ...user, transactions, level_thresholds: LEVEL_THRESHOLDS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch rewards profile" });
  }
});

// ---------------------------------------------------------------
// POST /rewards/screen-time-bonus
// Called by mobile app at end-of-day when user stayed within limits
// Body: { date? }
// ---------------------------------------------------------------
router.post("/screen-time-bonus", authRequired, async (req, res) => {
  try {
    const date = req.body.date || new Date().toISOString().split("T")[0];

    // Check if bonus already awarded for this date
    const [existing] = await pool.query(
      `SELECT id FROM point_transactions
       WHERE user_id = ? AND reason = ? AND DATE(created_at) = ?`,
      [req.user.id, `Screen-time bonus for ${date}`, date]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Bonus already claimed for this date" });
    }

    // Verify the user actually stayed within limits for all tracked apps
    const [logs] = await pool.query(
      `SELECT stl.app_name, stl.minutes_used, al.daily_limit_minutes
       FROM screen_time_logs stl
       LEFT JOIN app_limits al ON al.user_id = stl.user_id AND al.app_name = stl.app_name
       WHERE stl.user_id = ? AND stl.log_date = ?`,
      [req.user.id, date]
    );

    const exceeded = logs.some(
      (l) => l.daily_limit_minutes !== null && l.minutes_used > l.daily_limit_minutes
    );

    if (exceeded) {
      return res.status(400).json({ message: "You exceeded a limit today – no bonus awarded" });
    }

    if (logs.length === 0) {
      return res.status(400).json({ message: "No screen time data found for this date" });
    }

    const BONUS_POINTS = 20;
    const level = await awardPoints(req.user.id, BONUS_POINTS, `Screen-time bonus for ${date}`);

    res.json({ message: "Bonus awarded!", points_earned: BONUS_POINTS, new_level: level });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to award bonus" });
  }
});

// ---------------------------------------------------------------
// GET /rewards/leaderboard
// Top 20 users by points (public, first names only)
// ---------------------------------------------------------------
router.get("/leaderboard", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, points, level
       FROM users
       WHERE role = 'user'
       ORDER BY points DESC
       LIMIT 20`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

module.exports = router;
module.exports.awardPoints = awardPoints;
