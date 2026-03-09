const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// ---------------------------------------------------------------
// POST /business/register
// Register a business profile for the currently logged-in user
// Body: { business_name, contact_email }
// ---------------------------------------------------------------
router.post("/register", authRequired, async (req, res) => {
  try {
    const { business_name, contact_email } = req.body;

    if (!business_name || !contact_email) {
      return res.status(400).json({ message: "business_name and contact_email are required" });
    }

    // Check if already registered
    const [existing] = await pool.query(
      "SELECT id FROM businesses WHERE user_id = ?",
      [req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Business already registered" });
    }

    const [result] = await pool.query(
      "INSERT INTO businesses (user_id, business_name, contact_email) VALUES (?, ?, ?)",
      [req.user.id, business_name, contact_email]
    );

    // Update user role to business
    await pool.query("UPDATE users SET role = 'business' WHERE id = ?", [req.user.id]);

    res.json({ id: result.insertId, message: "Business registered – awaiting admin approval" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to register business" });
  }
});

// ---------------------------------------------------------------
// GET /business/profile
// Returns the business profile for the current user
// ---------------------------------------------------------------
router.get("/profile", authRequired, async (req, res) => {
  try {
    const [[biz]] = await pool.query(
      "SELECT * FROM businesses WHERE user_id = ?",
      [req.user.id]
    );
    if (!biz) return res.status(404).json({ message: "Business profile not found" });
    res.json(biz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch business profile" });
  }
});

// ---------------------------------------------------------------
// GET /business/dashboard
// Aggregated analytics for the business's campaigns
// ---------------------------------------------------------------
router.get("/dashboard", authRequired, async (req, res) => {
  try {
    const [[biz]] = await pool.query(
      "SELECT id, business_name, approved FROM businesses WHERE user_id = ?",
      [req.user.id]
    );
    if (!biz) return res.status(404).json({ message: "Business profile not found" });

    const [ads] = await pool.query(
      `SELECT a.id, a.title, a.status, a.budget, a.points_per_view,
              COUNT(ae.id) AS total_views,
              COALESCE(SUM(ae.is_correct), 0) AS correct_answers,
              COALESCE(SUM(ae.points_earned), 0) AS total_points_distributed
       FROM advertisements a
       LEFT JOIN ad_engagements ae ON ae.ad_id = a.id
       WHERE a.business_id = ?
       GROUP BY a.id
       ORDER BY a.created_at DESC`,
      [biz.id]
    );

    const totals = ads.reduce(
      (acc, ad) => {
        acc.total_views += Number(ad.total_views);
        acc.total_points_distributed += Number(ad.total_points_distributed);
        acc.total_budget += Number(ad.budget);
        return acc;
      },
      { total_views: 0, total_points_distributed: 0, total_budget: 0 }
    );

    res.json({
      business: { id: biz.id, name: biz.business_name, approved: biz.approved === 1 },
      totals,
      ads,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch dashboard" });
  }
});

module.exports = router;
