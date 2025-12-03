const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, faculty_id, role } = req.body;

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, faculty_id, role) VALUES (?,?,?,?,?)",
      [name, email, hashed, faculty_id || null, role || "student"]
    );

    res.json({ id: result.insertId, name, email, role: role || "student" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const [notifRows] = await pool.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND status = 'unread'",
      [user.id]
    );
    const unread = notifRows[0].unread || 0;

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      faculty_id: user.faculty_id,
      notifications: unread,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
