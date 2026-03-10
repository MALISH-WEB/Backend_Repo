const express = require("express");
const pool = require("../config/db");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /admin/users
router.get("/users", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_verified, u.is_active, u.created_at
       FROM users u ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// PUT /admin/users/:id/verify
router.put("/users/:id/verify", authRequired, adminOnly, async (req, res) => {
  try {
    const { verified } = req.body;
    await pool.query("UPDATE users SET is_verified=? WHERE id=?", [!!verified, req.params.id]);

    const [users] = await pool.query("SELECT * FROM users WHERE id=?", [req.params.id]);
    if (users.length > 0) {
      const msg = verified ? "Your account has been verified on Drizzle! ✅" : "Your account verification has been removed.";
      await pool.query("INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)", [req.params.id, msg, "account"]);
    }
    res.json({ message: "Verification updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update verification" });
  }
});

// PUT /admin/users/:id/activate
router.put("/users/:id/activate", authRequired, adminOnly, async (req, res) => {
  try {
    const { active } = req.body;
    await pool.query("UPDATE users SET is_active=? WHERE id=?", [!!active, req.params.id]);
    res.json({ message: "User status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user" });
  }
});

// DELETE /admin/users/:id
router.delete("/users/:id", authRequired, adminOnly, async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id=?", [req.params.id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// GET /admin/businesses  – businesses awaiting approval
router.get("/businesses", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.is_verified, u.created_at,
         bp.business_name, bp.industry, bp.location, bp.website, bp.is_approved
       FROM users u
       JOIN business_profiles bp ON bp.user_id = u.id
       WHERE u.role = 'business'
       ORDER BY u.created_at DESC`
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
    const { approved } = req.body;
    await pool.query("UPDATE business_profiles SET is_approved=? WHERE user_id=?", [!!approved, req.params.id]);
    await pool.query("UPDATE users SET is_verified=? WHERE id=?", [!!approved, req.params.id]);

    const msg = approved ? "Your business account has been approved on Drizzle! 🎉" : "Your business approval has been revoked.";
    await pool.query("INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)", [req.params.id, msg, "account"]);

    res.json({ message: "Business approval updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update business" });
  }
});

// GET /admin/tasks
router.get("/tasks", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, bp.business_name, u.name AS business_owner
       FROM tasks t
       JOIN users u ON t.business_id = u.id
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       ORDER BY t.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// GET /admin/payments
router.get("/payments", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, t.title AS task_title,
         ub.name AS business_name, ui.name AS influencer_name
       FROM payments p
       JOIN tasks t ON t.id = p.task_id
       JOIN users ub ON ub.id = p.business_id
       JOIN users ui ON ui.id = p.influencer_id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

// GET /admin/disputes
router.get("/disputes", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, t.title AS task_title, u.name AS raised_by_name
       FROM disputes d
       JOIN tasks t ON t.id = d.task_id
       JOIN users u ON u.id = d.raised_by
       ORDER BY d.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch disputes" });
  }
});

// PUT /admin/disputes/:id/resolve
router.put("/disputes/:id/resolve", authRequired, adminOnly, async (req, res) => {
  try {
    const { status, resolution } = req.body;
    if (!["resolved", "dismissed"].includes(status)) {
      return res.status(400).json({ message: "status must be resolved or dismissed" });
    }
    await pool.query(
      "UPDATE disputes SET status=?, resolution=? WHERE id=?",
      [status, resolution || null, req.params.id]
    );
    res.json({ message: "Dispute updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update dispute" });
  }
});

module.exports = router;
