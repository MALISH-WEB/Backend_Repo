const express = require("express");
const pool = require("../config/db");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// ---------------------------------------------------------------
// Users
// ---------------------------------------------------------------

// GET /admin/users
router.get("/users", authRequired, adminOnly, async (req, res) => {
  const [rows] = await pool.query(
    `
    SELECT u.id, u.name, u.email, u.phone, u.role, u.age_group,
           u.occupation, u.points, u.level,
           f.name AS faculty_name
    FROM users u
    LEFT JOIN faculties f ON u.faculty_id = f.id
    ORDER BY u.created_at DESC
    `
  );
  res.json(rows);
});

// PUT /admin/users/:id/role
router.put("/users/:id/role", authRequired, adminOnly, async (req, res) => {
  const { role } = req.body;
  await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
  res.json({ message: "Role updated" });
});

// DELETE /admin/users/:id
router.delete("/users/:id", authRequired, adminOnly, async (req, res) => {
  await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.json({ message: "User deleted" });
});

// ---------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------

// GET /admin/businesses – list all business registrations
router.get("/businesses", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, u.name AS owner_name, u.email AS owner_email
       FROM businesses b
       JOIN users u ON b.user_id = u.id
       ORDER BY b.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch businesses" });
  }
});

// PUT /admin/businesses/:id/approve
router.put("/businesses/:id/approve", authRequired, adminOnly, async (req, res) => {
  try {
    await pool.query("UPDATE businesses SET approved = 1 WHERE id = ?", [req.params.id]);
    res.json({ message: "Business approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to approve business" });
  }
});

// DELETE /admin/businesses/:id
router.delete("/businesses/:id", authRequired, adminOnly, async (req, res) => {
  try {
    await pool.query("DELETE FROM businesses WHERE id = ?", [req.params.id]);
    res.json({ message: "Business removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove business" });
  }
});

// ---------------------------------------------------------------
// Advertisements management
// ---------------------------------------------------------------

// GET /admin/ads – list all ads with engagement counts
router.get("/ads", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.*, b.business_name,
              COUNT(ae.id) AS total_engagements
       FROM advertisements a
       JOIN businesses b ON a.business_id = b.id
       LEFT JOIN ad_engagements ae ON ae.ad_id = a.id
       GROUP BY a.id
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch ads" });
  }
});

// ---------------------------------------------------------------
// Learning content management
// ---------------------------------------------------------------

// GET /admin/learning/modules – list all modules
router.get("/learning/modules", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*,
              (SELECT COUNT(*) FROM module_quiz_questions mq WHERE mq.module_id = m.id) AS quiz_count,
              (SELECT COUNT(*) FROM learning_progress lp WHERE lp.module_id = m.id AND lp.completed = 1) AS completions
       FROM learning_modules m
       ORDER BY m.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch modules" });
  }
});

// DELETE /admin/learning/modules/:id
router.delete("/learning/modules/:id", authRequired, adminOnly, async (req, res) => {
  try {
    await pool.query("DELETE FROM learning_modules WHERE id = ?", [req.params.id]);
    res.json({ message: "Module deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete module" });
  }
});

// ---------------------------------------------------------------
// System analytics dashboard
// ---------------------------------------------------------------

// GET /admin/system-analytics
router.get("/system-analytics", authRequired, adminOnly, async (req, res) => {
  try {
    const [[userStats]] = await pool.query(`
      SELECT
        COUNT(*)                                       AS total_users,
        SUM(role = 'business')                         AS business_users,
        SUM(level = 'Bronze')                          AS bronze_users,
        SUM(level = 'Silver')                          AS silver_users,
        SUM(level = 'Gold')                            AS gold_users
      FROM users`);

    const [[adStats]] = await pool.query(`
      SELECT
        COUNT(*)                      AS total_ads,
        SUM(status = 'active')        AS active_ads,
        SUM(status = 'pending')       AS pending_ads
      FROM advertisements`);

    const [[engagementStats]] = await pool.query(`
      SELECT COUNT(*) AS total_engagements,
             SUM(is_correct) AS correct_answers,
             SUM(points_earned) AS total_points_distributed
      FROM ad_engagements`);

    const [[learningStats]] = await pool.query(`
      SELECT COUNT(*) AS total_completions,
             COUNT(DISTINCT user_id) AS unique_learners
      FROM learning_progress WHERE completed = 1`);

    const [screenTimeStats] = await pool.query(`
      SELECT app_name, SUM(minutes_used) AS total_minutes
      FROM screen_time_logs
      GROUP BY app_name ORDER BY total_minutes DESC`);

    res.json({
      users: userStats,
      ads: adStats,
      engagements: engagementStats,
      learning: learningStats,
      screen_time_by_app: screenTimeStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch system analytics" });
  }
});

module.exports = router;
