const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /matches  – suggest influencers for a business based on niche/location
router.get("/", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "business" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Businesses only" });
    }

    const { niche, location, min_followers } = req.query;

    let sql = `
      SELECT u.id, u.name, u.email, u.is_verified,
        ip.niche, ip.location, ip.follower_count, ip.engagement_rate,
        ip.instagram, ip.tiktok, ip.youtube, ip.twitter,
        (SELECT COUNT(*) FROM task_submissions ts
          JOIN tasks t ON ts.task_id = t.id
          WHERE ts.influencer_id = u.id AND ts.status = 'approved') AS completed_tasks
      FROM users u
      JOIN influencer_profiles ip ON ip.user_id = u.id
      WHERE u.role = 'influencer' AND u.is_active = TRUE
    `;
    const params = [];

    if (niche) { sql += " AND ip.niche LIKE ?"; params.push(`%${niche}%`); }
    if (location) { sql += " AND ip.location LIKE ?"; params.push(`%${location}%`); }
    if (min_followers) { sql += " AND ip.follower_count >= ?"; params.push(Number(min_followers)); }

    sql += " ORDER BY ip.follower_count DESC, ip.engagement_rate DESC LIMIT 50";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch matches" });
  }
});

module.exports = router;
