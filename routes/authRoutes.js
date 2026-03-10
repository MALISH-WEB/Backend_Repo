const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, location, business_name, niche } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "name, email, password and role are required" });
    }

    const allowedRoles = ["influencer", "business"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "role must be influencer or business" });
    }

    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)",
      [name, email, hashed, role]
    );
    const userId = result.insertId;

    if (role === "influencer") {
      await pool.query(
        "INSERT INTO influencer_profiles (user_id, location, niche) VALUES (?,?,?)",
        [userId, location || null, niche || null]
      );
    } else if (role === "business") {
      await pool.query(
        "INSERT INTO business_profiles (user_id, business_name, location) VALUES (?,?,?)",
        [userId, business_name || name, location || null]
      );
    }

    await pool.query("INSERT INTO wallets (user_id) VALUES (?)", [userId]);

    const token = jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET || "drizzle_secret",
      { expiresIn: "7d" }
    );

    res.status(201).json({ user: { id: userId, name, email, role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT id, name, email, role, is_verified FROM users WHERE email = ? AND is_active = TRUE", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = rows[0];
    // Fetch password hash separately for comparison
    const [[hashRow]] = await pool.query("SELECT password FROM users WHERE id=?", [user.id]);
    const match = await bcrypt.compare(password, hashRow.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const [notifRows] = await pool.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE",
      [user.id]
    );
    const unread = notifRows[0].unread || 0;

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "drizzle_secret",
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        notifications: unread,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
