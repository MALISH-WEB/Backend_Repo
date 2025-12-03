const express = require("express");
const pool = require("../config/db");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /admin/users
router.get("/users", authRequired, adminOnly, async (req, res) => {
  const [rows] = await pool.query(
    `
    SELECT u.id, u.name, u.email, u.role,
           f.name AS faculty_name
    FROM users u
    LEFT JOIN faculties f ON u.faculty_id = f.id
    ORDER BY u.created_at DESC
    `
  );
  res.json(rows);
});

// PUT /admin/users/:id/role
router.put("/users/:id/role", authRequired, adminOnly, async (req, res) => {
  const { role } = req.body;
  await pool.query("UPDATE users SET role = ? WHERE id = ?", [
    role,
    req.params.id,
  ]);
  res.json({ message: "Role updated" });
});

// DELETE /admin/users/:id
router.delete("/users/:id", authRequired, adminOnly, async (req, res) => {
  await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
  res.json({ message: "User deleted" });
});

module.exports = router;
