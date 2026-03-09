const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// ---------------------------------------------------------------
// POST /auth/register
// Supports email or phone registration with optional profile fields
// ---------------------------------------------------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password, age_group, occupation, faculty_id, role } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: "name and password are required" });
    }
    if (!email && !phone) {
      return res.status(400).json({ message: "email or phone is required" });
    }

    // Check uniqueness
    if (email) {
      const [byEmail] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
      if (byEmail.length > 0) return res.status(400).json({ message: "Email already registered" });
    }
    if (phone) {
      const [byPhone] = await pool.query("SELECT id FROM users WHERE phone = ?", [phone]);
      if (byPhone.length > 0) return res.status(400).json({ message: "Phone already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const userRole = role || "user";
    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password, age_group, occupation, faculty_id, role)
       VALUES (?,?,?,?,?,?,?,?)`,
      [name, email || null, phone || null, hashed, age_group || null, occupation || null, faculty_id || null, userRole]
    );

    res.json({ id: result.insertId, name, email: email || null, phone: phone || null, role: userRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// ---------------------------------------------------------------
// POST /auth/login
// Supports email or phone login
// ---------------------------------------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!password || (!email && !phone)) {
      return res.status(400).json({ message: "password and email or phone are required" });
    }

    let rows;
    if (email) {
      [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    } else {
      [rows] = await pool.query("SELECT * FROM users WHERE phone = ?", [phone]);
    }

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
      phone: user.phone,
      role: user.role,
      age_group: user.age_group,
      occupation: user.occupation,
      points: user.points,
      level: user.level,
      faculty_id: user.faculty_id,
      notifications: unread,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

// ---------------------------------------------------------------
// POST /auth/google
// Google Sign-In: exchange google_id + profile for a JWT
// Body: { google_id, name, email }
// ---------------------------------------------------------------
router.post("/google", async (req, res) => {
  try {
    const { google_id, name, email } = req.body;

    if (!google_id || !name) {
      return res.status(400).json({ message: "google_id and name are required" });
    }

    // Find or create user
    let [rows] = await pool.query("SELECT * FROM users WHERE google_id = ?", [google_id]);

    if (rows.length === 0 && email) {
      // Try linking by email
      [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      if (rows.length > 0) {
        await pool.query("UPDATE users SET google_id = ? WHERE id = ?", [google_id, rows[0].id]);
      }
    }

    let user;
    if (rows.length > 0) {
      user = rows[0];
    } else {
      const [result] = await pool.query(
        "INSERT INTO users (name, email, google_id, role) VALUES (?,?,?,?)",
        [name, email || null, google_id, "user"]
      );
      const [[created]] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
      user = created;
    }

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
      points: user.points,
      level: user.level,
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Google sign-in failed" });
  }
});

// ---------------------------------------------------------------
// GET /auth/me  – return current user profile
// ---------------------------------------------------------------
router.get("/me", authRequired, async (req, res) => {
  try {
    const [[user]] = await pool.query(
      `SELECT id, name, email, phone, role, age_group, occupation, points, level, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// ---------------------------------------------------------------
// PUT /auth/profile  – update age_group, occupation, name
// ---------------------------------------------------------------
router.put("/profile", authRequired, async (req, res) => {
  try {
    const { name, age_group, occupation } = req.body;
    await pool.query(
      "UPDATE users SET name = COALESCE(?, name), age_group = COALESCE(?, age_group), occupation = COALESCE(?, occupation) WHERE id = ?",
      [name || null, age_group || null, occupation || null, req.user.id]
    );
    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

module.exports = router;
