const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/categories", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM categories ORDER BY name ASC");
  res.json(rows);
});

router.get("/faculties", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM faculties ORDER BY name ASC");
  res.json(rows);
});

module.exports = router;
