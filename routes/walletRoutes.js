const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /wallet  – current user's wallet
router.get("/", authRequired, async (req, res) => {
  try {
    const [[wallet]] = await pool.query(
      "SELECT * FROM wallets WHERE user_id = ?",
      [req.user.id]
    );
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    const [transactions] = await pool.query(
      "SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT 20",
      [wallet.id]
    );
    res.json({ balance: wallet.balance, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch wallet" });
  }
});

// GET /wallet/transactions  – full transaction history
router.get("/transactions", authRequired, async (req, res) => {
  try {
    const [[wallet]] = await pool.query("SELECT id FROM wallets WHERE user_id=?", [req.user.id]);
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    const [rows] = await pool.query(
      "SELECT * FROM transactions WHERE wallet_id=? ORDER BY created_at DESC",
      [wallet.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

module.exports = router;
