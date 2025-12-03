const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /notifications/:userId
router.get("/:userId", authRequired, async (req, res) => {
  const { userId } = req.params;
  if (req.user.id !== Number(userId) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  const [rows] = await pool.query(
    `
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId]
  );
  res.json(rows);
});

// PUT /notifications/read/:id
router.put("/read/:id", authRequired, async (req, res) => {
  const notifId = req.params.id;

  const [rows] = await pool.query(
    "SELECT * FROM notifications WHERE id = ?",
    [notifId]
  );
  if (rows.length === 0) return res.status(404).json({ message: "Not found" });

  const notif = rows[0];
  if (notif.user_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  await pool.query("UPDATE notifications SET status = 'read' WHERE id = ?", [
    notifId,
  ]);
  res.json({ message: "Marked as read" });
});

module.exports = router;
