const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

const COMMISSION_RATE = 0.07;

// GET /tasks  – browse open tasks (influencers)
router.get("/", async (req, res) => {
  try {
    const { niche, platform, search } = req.query;
    let sql = `
      SELECT t.*, bp.business_name, u.name AS business_owner
      FROM tasks t
      JOIN users u ON t.business_id = u.id
      LEFT JOIN business_profiles bp ON bp.user_id = u.id
      WHERE t.status = 'open'
    `;
    const params = [];

    if (niche) { sql += " AND t.niche = ?"; params.push(niche); }
    if (platform) { sql += " AND t.platform = ?"; params.push(platform); }
    if (search) {
      sql += " AND (t.title LIKE ? OR t.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += " ORDER BY t.created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// GET /tasks/my  – tasks related to the current user
router.get("/my", authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let rows;
    if (role === "business") {
      [rows] = await pool.query(
        `SELECT t.*,
           (SELECT COUNT(*) FROM task_applications ta WHERE ta.task_id = t.id AND ta.status='accepted') AS assigned_count,
           (SELECT COUNT(*) FROM task_submissions ts WHERE ts.task_id = t.id AND ts.status='pending') AS pending_submissions
         FROM tasks t
         WHERE t.business_id = ?
         ORDER BY t.created_at DESC`,
        [userId]
      );
    } else {
      [rows] = await pool.query(
        `SELECT t.*, bp.business_name,
           ta.status AS application_status,
           ts.status AS submission_status,
           ts.id AS submission_id
         FROM task_applications ta
         JOIN tasks t ON ta.task_id = t.id
         LEFT JOIN business_profiles bp ON bp.user_id = t.business_id
         LEFT JOIN task_submissions ts ON ts.task_id = t.id AND ts.influencer_id = ta.influencer_id
         WHERE ta.influencer_id = ?
         ORDER BY ta.applied_at DESC`,
        [userId]
      );
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// GET /tasks/:id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, bp.business_name, u.name AS business_owner
       FROM tasks t
       JOIN users u ON t.business_id = u.id
       LEFT JOIN business_profiles bp ON bp.user_id = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Task not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch task" });
  }
});

// POST /tasks  – business creates a task
router.post("/", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "business" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only businesses can post tasks" });
    }
    const { title, description, requirements, niche, budget, platform, deadline } = req.body;
    if (!title || !budget) return res.status(400).json({ message: "title and budget are required" });

    const [result] = await pool.query(
      `INSERT INTO tasks (business_id, title, description, requirements, niche, budget, platform, deadline)
       VALUES (?,?,?,?,?,?,?,?)`,
      [req.user.id, title, description || null, requirements || null,
       niche || null, budget, platform || null, deadline || null]
    );
    res.status(201).json({ id: result.insertId, message: "Task created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// PUT /tasks/:id – business updates own task
router.put("/:id", authRequired, async (req, res) => {
  try {
    const [tasks] = await pool.query("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
    if (tasks.length === 0) return res.status(404).json({ message: "Task not found" });
    const task = tasks[0];

    if (task.business_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { title, description, requirements, niche, budget, platform, deadline, status } = req.body;
    await pool.query(
      `UPDATE tasks SET title=COALESCE(?,title), description=COALESCE(?,description),
       requirements=COALESCE(?,requirements), niche=COALESCE(?,niche),
       budget=COALESCE(?,budget), platform=COALESCE(?,platform),
       deadline=COALESCE(?,deadline), status=COALESCE(?,status)
       WHERE id=?`,
      [title, description, requirements, niche, budget, platform, deadline, status, req.params.id]
    );
    res.json({ message: "Task updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// DELETE /tasks/:id
router.delete("/:id", authRequired, async (req, res) => {
  try {
    const [tasks] = await pool.query("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
    if (tasks.length === 0) return res.status(404).json({ message: "Task not found" });
    if (tasks[0].business_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }
    await pool.query("DELETE FROM tasks WHERE id = ?", [req.params.id]);
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// POST /tasks/:id/apply  – influencer applies for a task
router.post("/:id/apply", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "influencer") {
      return res.status(403).json({ message: "Only influencers can apply" });
    }
    const [tasks] = await pool.query("SELECT * FROM tasks WHERE id = ? AND status='open'", [req.params.id]);
    if (tasks.length === 0) return res.status(404).json({ message: "Task not found or not open" });

    const { message } = req.body;
    await pool.query(
      "INSERT INTO task_applications (task_id, influencer_id, message) VALUES (?,?,?)",
      [req.params.id, req.user.id, message || null]
    );
    res.status(201).json({ message: "Application submitted" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Already applied to this task" });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to apply" });
  }
});

// GET /tasks/:id/applications  – business views applications
router.get("/:id/applications", authRequired, async (req, res) => {
  try {
    const [tasks] = await pool.query("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
    if (tasks.length === 0) return res.status(404).json({ message: "Task not found" });
    if (tasks[0].business_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }
    const [rows] = await pool.query(
      `SELECT ta.*, u.name AS influencer_name, u.email AS influencer_email,
         ip.niche, ip.follower_count, ip.engagement_rate, ip.location
       FROM task_applications ta
       JOIN users u ON ta.influencer_id = u.id
       LEFT JOIN influencer_profiles ip ON ip.user_id = u.id
       WHERE ta.task_id = ?
       ORDER BY ta.applied_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

// PUT /tasks/:id/applications/:appId  – business accepts/rejects application
router.put("/:id/applications/:appId", authRequired, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [tasks] = await conn.query("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
    if (tasks.length === 0) { conn.release(); return res.status(404).json({ message: "Task not found" }); }
    if (tasks[0].business_id !== req.user.id && req.user.role !== "admin") {
      conn.release(); return res.status(403).json({ message: "Not allowed" });
    }

    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      conn.release(); return res.status(400).json({ message: "status must be accepted or rejected" });
    }

    await conn.beginTransaction();
    const [apps] = await conn.query(
      "SELECT * FROM task_applications WHERE id = ? AND task_id = ?",
      [req.params.appId, req.params.id]
    );
    if (apps.length === 0) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: "Application not found" });
    }

    await conn.query("UPDATE task_applications SET status=? WHERE id=?", [status, req.params.appId]);

    if (status === "accepted") {
      await conn.query("UPDATE tasks SET status='assigned' WHERE id=?", [req.params.id]);
      await conn.query(
        "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
        [apps[0].influencer_id, `Your application for a task has been accepted!`, "task"]
      );
    } else {
      await conn.query(
        "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
        [apps[0].influencer_id, `Your task application was not selected this time.`, "task"]
      );
    }

    await conn.commit();
    conn.release();
    res.json({ message: `Application ${status}` });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ message: "Failed to update application" });
  }
});

// POST /tasks/:id/submit  – influencer submits proof
router.post("/:id/submit", authRequired, async (req, res) => {
  try {
    if (req.user.role !== "influencer") {
      return res.status(403).json({ message: "Only influencers can submit proof" });
    }
    const [apps] = await pool.query(
      "SELECT * FROM task_applications WHERE task_id=? AND influencer_id=? AND status='accepted'",
      [req.params.id, req.user.id]
    );
    if (apps.length === 0) return res.status(403).json({ message: "No accepted application found" });

    const { proof_url, description } = req.body;
    if (!proof_url) return res.status(400).json({ message: "proof_url is required" });

    await pool.query(
      "INSERT INTO task_submissions (task_id, influencer_id, proof_url, description) VALUES (?,?,?,?)",
      [req.params.id, req.user.id, proof_url, description || null]
    );
    await pool.query("UPDATE tasks SET status='submitted' WHERE id=?", [req.params.id]);

    const [tasks] = await pool.query("SELECT * FROM tasks WHERE id=?", [req.params.id]);
    await pool.query(
      "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
      [tasks[0].business_id, `Influencer has submitted proof for your task "${tasks[0].title}"`, "task"]
    );

    res.status(201).json({ message: "Proof submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to submit proof" });
  }
});

// PUT /tasks/:id/review-submission  – business approves/rejects submission
router.put("/:id/review-submission", authRequired, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [tasks] = await conn.query("SELECT * FROM tasks WHERE id=?", [req.params.id]);
    if (tasks.length === 0) { conn.release(); return res.status(404).json({ message: "Task not found" }); }
    const task = tasks[0];

    if (task.business_id !== req.user.id && req.user.role !== "admin") {
      conn.release(); return res.status(403).json({ message: "Not allowed" });
    }

    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      conn.release(); return res.status(400).json({ message: "status must be approved or rejected" });
    }

    await conn.beginTransaction();

    const [subs] = await conn.query(
      "SELECT * FROM task_submissions WHERE task_id=? ORDER BY submitted_at DESC LIMIT 1",
      [req.params.id]
    );
    if (subs.length === 0) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ message: "No submission found" });
    }
    const sub = subs[0];

    await conn.query(
      "UPDATE task_submissions SET status=?, reviewed_at=NOW() WHERE id=?",
      [status, sub.id]
    );

    if (status === "approved") {
      await conn.query("UPDATE tasks SET status='completed' WHERE id=?", [req.params.id]);

      const gross = parseFloat(task.budget);
      const commission = parseFloat((gross * COMMISSION_RATE).toFixed(2));
      const net = parseFloat((gross - commission).toFixed(2));

      await conn.query(
        `INSERT INTO payments (task_id, business_id, influencer_id, gross_amount, commission, net_amount, status)
         VALUES (?,?,?,?,?,?,'completed')`,
        [task.id, task.business_id, sub.influencer_id, gross, commission, net]
      );

      const [[wallet]] = await conn.query("SELECT id FROM wallets WHERE user_id=?", [sub.influencer_id]);
      await conn.query("UPDATE wallets SET balance = balance + ? WHERE id=?", [net, wallet.id]);
      await conn.query(
        "INSERT INTO transactions (wallet_id, type, amount, description, reference_id) VALUES (?,?,?,?,?)",
        [wallet.id, "credit", net, `Payment for task: ${task.title}`, task.id]
      );

      await conn.query(
        "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
        [sub.influencer_id, `Payment of UGX ${net.toLocaleString()} credited for task "${task.title}"`, "payment"]
      );
    } else {
      await conn.query("UPDATE tasks SET status='assigned' WHERE id=?", [req.params.id]);
      await conn.query(
        "INSERT INTO notifications (user_id, message, type) VALUES (?,?,?)",
        [sub.influencer_id, `Your submission for "${task.title}" was not approved. Please resubmit.`, "task"]
      );
    }

    await conn.commit();
    conn.release();
    res.json({ message: `Submission ${status}` });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ message: "Failed to review submission" });
  }
});

module.exports = router;
