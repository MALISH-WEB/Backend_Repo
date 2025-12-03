const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /users/:id
router.get("/:id", authRequired, async (req, res) => {
  const id = req.params.id;

  if (req.user.id !== Number(id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  const [rows] = await pool.query(
    `
    SELECT u.id, u.name, u.email, u.role, u.faculty_id,
           f.name AS faculty_name
    FROM users u
    LEFT JOIN faculties f ON u.faculty_id = f.id
    WHERE u.id = ?
    `,
    [id]
  );

  if (rows.length === 0) return res.status(404).json({ message: "Not found" });
  res.json(rows[0]);
});

// PUT /users/:id
router.put("/:id", authRequired, async (req, res) => {
  const id = req.params.id;
  if (req.user.id !== Number(id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  const { name, email } = req.body;
  await pool.query(
    "UPDATE users SET name = ?, email = ? WHERE id = ?",
    [name, email, id]
  );

  res.json({ message: "Profile updated" });
});

// GET /users/:id/projects
router.get("/:id/projects", authRequired, async (req, res) => {
  const id = req.params.id;
  if (req.user.id !== Number(id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed" });
  }

  const [rows] = await pool.query(
    `
    SELECT p.*
    FROM projects p
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC
    `,
    [id]
  );
  res.json(rows);
});

module.exports = router;
