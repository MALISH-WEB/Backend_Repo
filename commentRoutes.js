const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /comments/:projectId
router.get("/:projectId", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT c.*, u.name AS user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.project_id = ?
      ORDER BY c.created_at DESC
      `,
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load comments" });
  }
});

// POST /comments
router.post("/", authRequired, async (req, res) => {
  try {
    const { project_id, comment } = req.body;

    const [result] = await pool.query(
      "INSERT INTO comments (project_id, user_id, comment) VALUES (?, ?, ?)",
      [project_id, req.user.id, comment]
    );

    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

module.exports = router;
