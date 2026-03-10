const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// POST /disputes  – raise a dispute
router.post("/", authRequired, async (req, res) => {
  try {
    const { task_id, description } = req.body;
    if (!task_id || !description) {
      return res.status(400).json({ message: "task_id and description are required" });
    }

    const [tasks] = await pool.query("SELECT * FROM tasks WHERE id=?", [task_id]);
    if (tasks.length === 0) return res.status(404).json({ message: "Task not found" });

    const [result] = await pool.query(
      "INSERT INTO disputes (task_id, raised_by, description) VALUES (?,?,?)",
      [task_id, req.user.id, description]
    );
    res.status(201).json({ id: result.insertId, message: "Dispute raised" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to raise dispute" });
  }
});

// GET /disputes/my
router.get("/my", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, t.title AS task_title FROM disputes d
       JOIN tasks t ON t.id = d.task_id
       WHERE d.raised_by=? ORDER BY d.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch disputes" });
  }
});

module.exports = router;
