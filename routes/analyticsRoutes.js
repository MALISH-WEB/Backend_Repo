const express = require("express");
const pool = require("../config/db");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /analytics/dashboard  – admin overview
router.get("/dashboard", authRequired, adminOnly, async (req, res) => {
  try {
    const [[counts]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='influencer') AS influencers,
        (SELECT COUNT(*) FROM users WHERE role='business') AS businesses,
        (SELECT COUNT(*) FROM tasks) AS total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status='completed') AS completed_tasks,
        (SELECT COALESCE(SUM(commission),0) FROM payments WHERE status='completed') AS total_commission,
        (SELECT COALESCE(SUM(net_amount),0) FROM payments WHERE status='completed') AS total_paid_out,
        (SELECT COUNT(*) FROM subscriptions WHERE status='active') AS active_subscriptions
    `);

    const [tasksByStatus] = await pool.query(
      `SELECT status AS label, COUNT(*) AS value FROM tasks GROUP BY status ORDER BY value DESC`
    );

    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS tasks
       FROM tasks GROUP BY month ORDER BY month ASC`
    );

    const [topInfluencers] = await pool.query(
      `SELECT u.name, COUNT(ts.id) AS completed_tasks,
         COALESCE(SUM(p.net_amount),0) AS earnings
       FROM users u
       LEFT JOIN task_submissions ts ON ts.influencer_id=u.id AND ts.status='approved'
       LEFT JOIN payments p ON p.influencer_id=u.id AND p.status='completed'
       WHERE u.role='influencer'
       GROUP BY u.id ORDER BY completed_tasks DESC LIMIT 10`
    );

    res.json({
      counts,
      tasksByStatus: tasksByStatus.map(r => ({ label: r.label, value: Number(r.value) })),
      monthly,
      topInfluencers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics failed" });
  }
});

// GET /analytics/business  – business campaign analytics
router.get("/business", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "business" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Businesses only" });
    }
    const bId = req.user.role === "admin" ? (req.query.business_id || req.user.id) : req.user.id;

    const [[stats]] = await pool.query(
      `SELECT
         COUNT(t.id) AS total_tasks,
         COUNT(CASE WHEN t.status='completed' THEN 1 END) AS completed,
         COUNT(CASE WHEN t.status='open' THEN 1 END) AS open,
         COALESCE(SUM(p.gross_amount),0) AS total_spend,
         COALESCE(SUM(p.commission),0) AS commission_paid,
         COALESCE(AVG(p.gross_amount),0) AS avg_cost_per_task
       FROM tasks t
       LEFT JOIN payments p ON p.task_id = t.id AND p.status='completed'
       WHERE t.business_id=?`,
      [bId]
    );

    const [taskTrend] = await pool.query(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS tasks
       FROM tasks WHERE business_id=? GROUP BY month ORDER BY month ASC`,
      [bId]
    );

    res.json({ stats, taskTrend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics failed" });
  }
});

// GET /analytics/influencer  – influencer earnings analytics
router.get("/influencer", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "influencer" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Influencers only" });
    }
    const iId = req.user.role === "admin" ? (req.query.influencer_id || req.user.id) : req.user.id;

    const [[stats]] = await pool.query(
      `SELECT
         COUNT(DISTINCT ta.task_id) AS applied_tasks,
         COUNT(CASE WHEN ta.status='accepted' THEN 1 END) AS accepted_tasks,
         COUNT(CASE WHEN ts.status='approved' THEN 1 END) AS completed_tasks,
         COALESCE(SUM(p.net_amount),0) AS total_earnings
       FROM task_applications ta
       LEFT JOIN task_submissions ts ON ts.task_id=ta.task_id AND ts.influencer_id=ta.influencer_id
       LEFT JOIN payments p ON p.task_id=ta.task_id AND p.influencer_id=ta.influencer_id AND p.status='completed'
       WHERE ta.influencer_id=?`,
      [iId]
    );

    const [earningsTrend] = await pool.query(
      `SELECT DATE_FORMAT(p.created_at,'%Y-%m') AS month, SUM(p.net_amount) AS earnings
       FROM payments p WHERE p.influencer_id=? AND p.status='completed'
       GROUP BY month ORDER BY month ASC`,
      [iId]
    );

    const [[wallet]] = await pool.query("SELECT balance FROM wallets WHERE user_id=?", [iId]);

    res.json({ stats, earningsTrend, wallet_balance: wallet?.balance || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Analytics failed" });
  }
});

module.exports = router;
