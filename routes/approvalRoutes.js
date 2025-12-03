const express = require("express");
const pool = require("../config/db");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /approvals/pending
router.get("/pending", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT p.*, u.name AS user_name, f.name AS faculty_name
      FROM projects p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN faculties f ON p.faculty_id = f.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
      `
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch pending projects" });
  }
});

// PUT /approvals/approve/:id
router.put("/approve/:id", authRequired, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [projRows] = await conn.query("SELECT * FROM projects WHERE id = ?", [req.params.id]);
    if (projRows.length === 0) {
      await conn.release();
      return res.status(404).json({ message: "Project not found" });
    }
    const project = projRows[0];

    await conn.query("UPDATE projects SET status = 'approved' WHERE id = ?", [req.params.id]);
    await conn.query(
      "INSERT INTO approvals (project_id, admin_id, decision) VALUES (?,?,?)",
      [req.params.id, req.user.id, "approved"]
    );

    await conn.query(
      "INSERT INTO notifications (user_id, message) VALUES (?,?)",
      [project.user_id, `Your project "${project.title}" has been approved.`]
    );

    await conn.commit();
    conn.release();
    res.json({ message: "Approved" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ message: "Approval failed" });
  }
});

// PUT /approvals/reject/:id
router.put("/reject/:id", authRequired, adminOnly, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { comment } = req.body;

    await conn.beginTransaction();

    const [projRows] = await conn.query("SELECT * FROM projects WHERE id = ?", [req.params.id]);
    if (projRows.length === 0) {
      await conn.release();
      return res.status(404).json({ message: "Project not found" });
    }
    const project = projRows[0];

    await conn.query("UPDATE projects SET status = 'rejected' WHERE id = ?", [req.params.id]);
    await conn.query(
      "INSERT INTO approvals (project_id, admin_id, decision, message) VALUES (?,?,?,?)",
      [req.params.id, req.user.id, "rejected", comment || null]
    );

    await conn.query(
      "INSERT INTO notifications (user_id, message) VALUES (?,?)",
      [project.user_id, `Your project "${project.title}" was rejected: ${comment || "No reason given."}`]
    );

    await conn.commit();
    conn.release();
    res.json({ message: "Rejected" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ message: "Rejection failed" });
  }
});

module.exports = router;
