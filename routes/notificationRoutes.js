const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /notifications
router.get("/", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// PUT /notifications/read/:id
router.put("/read/:id", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM notifications WHERE id=?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });
    if (rows[0].user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }
    await pool.query("UPDATE notifications SET is_read=TRUE WHERE id=?", [req.params.id]);
    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update notification" });
  }
});

// PUT /notifications/read-all
router.put("/read-all", authRequired, async (req, res) => {
  try {
    await pool.query("UPDATE notifications SET is_read=TRUE WHERE user_id=?", [req.user.id]);
    res.json({ message: "All marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update notifications" });
  }
});

module.exports = router;
