const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const PLANS = {
  basic: 8000,
  premium: 17000,
};

const router = express.Router();

// GET /subscriptions/my
router.get("/my", authRequired, async (req, res) => {
  try {
    const [[sub]] = await pool.query(
      `SELECT * FROM subscriptions WHERE business_id=? AND status='active' ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(sub || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch subscription" });
  }
});

// POST /subscriptions  – subscribe to a plan
router.post("/", authRequired, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    if (req.user.role !== "business") {
      conn.release();
      return res.status(403).json({ message: "Businesses only" });
    }
    const { plan } = req.body;
    if (!PLANS[plan]) {
      conn.release();
      return res.status(400).json({ message: "plan must be basic or premium" });
    }

    const amount = PLANS[plan];
    // Add 30 days to avoid month-boundary issues
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const expiresStr = expiresAt.toISOString().split("T")[0];

    await conn.beginTransaction();

    // Check wallet balance inside transaction to prevent race condition
    const [[wallet]] = await conn.query(
      "SELECT id, balance FROM wallets WHERE user_id=? FOR UPDATE",
      [req.user.id]
    );
    if (!wallet || parseFloat(wallet.balance) < amount) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    await conn.query("UPDATE subscriptions SET status='cancelled' WHERE business_id=? AND status='active'", [req.user.id]);

    const [result] = await conn.query(
      "INSERT INTO subscriptions (business_id, plan, amount, expires_at) VALUES (?,?,?,?)",
      [req.user.id, plan, amount, expiresStr]
    );

    await conn.query("UPDATE wallets SET balance=balance-? WHERE id=?", [amount, wallet.id]);
    await conn.query(
      "INSERT INTO transactions (wallet_id, type, amount, description) VALUES (?,?,?,?)",
      [wallet.id, "debit", amount, `${plan} plan subscription`]
    );

    await conn.commit();
    conn.release();
    res.status(201).json({ id: result.insertId, plan, amount, expires_at: expiresStr, message: "Subscribed" });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ message: "Failed to subscribe" });
  }
});

// GET /subscriptions  – admin: all subscriptions
router.get("/", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin only" });
    const [rows] = await pool.query(
      `SELECT s.*, u.name, u.email FROM subscriptions s
       JOIN users u ON s.business_id = u.id
       ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch subscriptions" });
  }
});

module.exports = router;
