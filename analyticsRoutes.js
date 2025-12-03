const express = require("express");
const pool = require("../config/db");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", authRequired, adminOnly, async (req, res) => {
  try {
    // counts
    const [[countsRow]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM projects) AS total,
        (SELECT COUNT(*) FROM projects WHERE status = 'approved') AS approved,
        (SELECT COUNT(*) FROM projects WHERE status = 'pending') AS pending,
        (SELECT COUNT(*) FROM projects WHERE status = 'rejected') AS rejected
    `);

    const counts = {
      total: Number(countsRow.total || 0),
      approved: Number(countsRow.approved || 0),
      pending: Number(countsRow.pending || 0),
      rejected: Number(countsRow.rejected || 0),
    };

    // per category
    const [perCategoryRows] = await pool.query(`
      SELECT COALESCE(category, 'Unspecified') AS label, COUNT(*) AS value
      FROM projects
      GROUP BY label
      ORDER BY value DESC
    `);
    const perCategory = perCategoryRows.map(r => ({ label: r.label, value: Number(r.value) }));

    // per faculty
    const [perFacultyRows] = await pool.query(`
      SELECT COALESCE(faculty, 'Unspecified') AS label, COUNT(*) AS value
      FROM projects
      GROUP BY label
      ORDER BY value DESC
    `);
    const perFaculty = perFacultyRows.map(r => ({ label: r.label, value: Number(r.value) }));

    // monthly trend
    const [monthlyRows] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS value
      FROM projects
      GROUP BY month
      ORDER BY month ASC
    `);
    const monthly = monthlyRows.map(r => ({ month: r.month, value: Number(r.value) }));

    // top creators
    const [topCreatorsRows] = await pool.query(`
      SELECT u.name AS label, COUNT(p.id) AS value
      FROM users u
      LEFT JOIN projects p ON p.user_id = u.id
      GROUP BY u.id
      ORDER BY value DESC
      LIMIT 10
    `);
    const topCreators = topCreatorsRows.map(r => ({ label: r.label, value: Number(r.value) }));

    const payload = { counts, perCategory, perFaculty, monthly, topCreators };

    console.log("[analytics] payload ready");
    res.json(payload);
  } catch (err) {
    console.error("[analytics] error:", err);
    res.status(500).json({ message: "Analytics failed" });
  }
});

module.exports = router;

