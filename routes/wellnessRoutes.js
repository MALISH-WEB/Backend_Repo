const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /wellness  – active alerts
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM wellness_alerts WHERE is_active=TRUE ORDER BY RAND() LIMIT 6"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch wellness alerts" });
  }
});

// GET /wellness/checkins  – current user's recent check-ins
router.get("/checkins", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM wellness_checkins WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch check-ins" });
  }
});

// POST /wellness/checkin
router.post("/checkin", authRequired, async (req, res) => {
  try {
    const { mood, notes } = req.body;
    if (!mood || mood < 1 || mood > 5) {
      return res.status(400).json({ message: "mood must be between 1 and 5" });
    }
    await pool.query(
      "INSERT INTO wellness_checkins (user_id, mood, notes) VALUES (?,?,?)",
      [req.user.id, mood, notes || null]
    );
    res.status(201).json({ message: "Check-in recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to record check-in" });
  }
});

// Admin: POST /wellness  – create alert
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const { title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ message: "title and message required" });

    const [result] = await pool.query(
      "INSERT INTO wellness_alerts (title, message, type) VALUES (?,?,?)",
      [title, message, type || "tips"]
    );
    res.status(201).json({ id: result.insertId, message: "Alert created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create alert" });
  }
});

// Admin: PUT /wellness/:id
router.put("/:id", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const { title, message, type, is_active } = req.body;
    await pool.query(
      `UPDATE wellness_alerts SET
         title=COALESCE(?,title), message=COALESCE(?,message),
         type=COALESCE(?,type), is_active=COALESCE(?,is_active)
       WHERE id=?`,
      [title, message, type, is_active, req.params.id]
    );
    res.json({ message: "Alert updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update alert" });
  }
});

module.exports = router;
