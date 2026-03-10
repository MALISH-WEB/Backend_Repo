const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /training  – list all active modules with user progress
router.get("/", authRequired, async (req, res) => {
  try {
    const [modules] = await pool.query(
      `SELECT m.*,
         COALESCE(tp.completed, FALSE) AS completed,
         tp.completed_at
       FROM training_modules m
       LEFT JOIN training_progress tp ON tp.module_id = m.id AND tp.user_id = ?
       WHERE m.is_active = TRUE
       ORDER BY m.sort_order ASC`,
      [req.user.id]
    );
    res.json(modules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch modules" });
  }
});

// GET /training/progress/summary  – must be before /:id to avoid param conflict
router.get("/progress/summary", authRequired, async (req, res) => {
  try {
    const [[total]] = await pool.query("SELECT COUNT(*) AS count FROM training_modules WHERE is_active=TRUE");
    const [[completed]] = await pool.query(
      "SELECT COUNT(*) AS count FROM training_progress WHERE user_id=? AND completed=TRUE",
      [req.user.id]
    );
    const [badges] = await pool.query(
      `SELECT tm.badge_label FROM training_progress tp
       JOIN training_modules tm ON tm.id = tp.module_id
       WHERE tp.user_id=? AND tp.completed=TRUE AND tm.badge_label IS NOT NULL`,
      [req.user.id]
    );
    res.json({
      total: total.count,
      completed: completed.count,
      percentage: total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0,
      badges: badges.map(b => b.badge_label),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch progress" });
  }
});

// GET /training/:id
router.get("/:id", authRequired, async (req, res) => {
  try {
    const [[mod]] = await pool.query("SELECT * FROM training_modules WHERE id=? AND is_active=TRUE", [req.params.id]);
    if (!mod) return res.status(404).json({ message: "Module not found" });

    const [[progress]] = await pool.query(
      "SELECT * FROM training_progress WHERE user_id=? AND module_id=?",
      [req.user.id, req.params.id]
    );
    res.json({ ...mod, completed: progress?.completed || false, completed_at: progress?.completed_at || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch module" });
  }
});

// Admin: POST /training  – create module
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const { title, description, category, content, duration_mins, badge_label, sort_order } = req.body;
    if (!title) return res.status(400).json({ message: "title required" });

    const [result] = await pool.query(
      `INSERT INTO training_modules (title, description, category, content, duration_mins, badge_label, sort_order)
       VALUES (?,?,?,?,?,?,?)`,
      [title, description || null, category || null, content || null,
       duration_mins || 10, badge_label || null, sort_order || 0]
    );
    res.status(201).json({ id: result.insertId, message: "Module created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create module" });
  }
});

// Admin: PUT /training/:id
router.put("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const { title, description, category, content, duration_mins, badge_label, sort_order, is_active } = req.body;
    await pool.query(
      `UPDATE training_modules SET
         title=COALESCE(?,title), description=COALESCE(?,description),
         category=COALESCE(?,category), content=COALESCE(?,content),
         duration_mins=COALESCE(?,duration_mins), badge_label=COALESCE(?,badge_label),
         sort_order=COALESCE(?,sort_order), is_active=COALESCE(?,is_active)
       WHERE id=?`,
      [title, description, category, content, duration_mins, badge_label, sort_order, is_active, req.params.id]
    );
    res.json({ message: "Module updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update module" });
  }
});

module.exports = router;
