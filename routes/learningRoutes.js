const express = require("express");
const pool = require("../config/db");
const upload = require("../middleware/upload");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");
const { awardPoints } = require("./rewardRoutes");

const router = express.Router();

// ---------------------------------------------------------------
// GET /learning/modules   – list all available modules
// ---------------------------------------------------------------
router.get("/modules", authRequired, async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `
      SELECT m.*,
             (SELECT COUNT(*) FROM module_quiz_questions mq WHERE mq.module_id = m.id) AS quiz_questions
      FROM learning_modules m
      WHERE 1=1`;
    const params = [];

    if (category) {
      sql += " AND m.category = ?";
      params.push(category);
    }

    sql += " ORDER BY m.created_at DESC";
    const [rows] = await pool.query(sql, params);

    // If user is logged in, merge their progress
    const [progress] = await pool.query(
      "SELECT module_id, completed, quiz_score FROM learning_progress WHERE user_id = ?",
      [req.user.id]
    );
    const progressMap = {};
    progress.forEach((p) => { progressMap[p.module_id] = p; });

    const enriched = rows.map((m) => ({
      ...m,
      progress: progressMap[m.id] || null,
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch modules" });
  }
});

// ---------------------------------------------------------------
// GET /learning/modules/:id  – single module with quiz questions
// ---------------------------------------------------------------
router.get("/modules/:id", authRequired, async (req, res) => {
  try {
    const [[module]] = await pool.query(
      "SELECT * FROM learning_modules WHERE id = ?",
      [req.params.id]
    );
    if (!module) return res.status(404).json({ message: "Module not found" });

    const [questions] = await pool.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d
       FROM module_quiz_questions WHERE module_id = ?`,
      [module.id]
    );

    const [[progress]] = await pool.query(
      "SELECT * FROM learning_progress WHERE user_id = ? AND module_id = ?",
      [req.user.id, module.id]
    );

    res.json({ ...module, quiz_questions: questions, progress: progress || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch module" });
  }
});

// ---------------------------------------------------------------
// POST /learning/modules/:id/complete
// Body: { answers: [{ question_id, answer_given }] }
// Marks module complete, grades quiz, awards points & certificate
// ---------------------------------------------------------------
router.post("/modules/:id/complete", authRequired, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const moduleId = req.params.id;
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      conn.release();
      return res.status(400).json({ message: "answers array is required" });
    }

    const [[module]] = await conn.query(
      "SELECT * FROM learning_modules WHERE id = ?",
      [moduleId]
    );
    if (!module) { conn.release(); return res.status(404).json({ message: "Module not found" }); }

    // Check if already completed
    const [[existing]] = await conn.query(
      "SELECT id, completed FROM learning_progress WHERE user_id = ? AND module_id = ?",
      [req.user.id, moduleId]
    );
    if (existing && existing.completed) {
      conn.release();
      return res.status(409).json({ message: "Module already completed" });
    }

    // Grade quiz
    const [questions] = await conn.query(
      "SELECT * FROM module_quiz_questions WHERE module_id = ?",
      [moduleId]
    );
    let correct = 0;
    for (const q of questions) {
      const submitted = answers.find((a) => a.question_id === q.id);
      if (submitted && submitted.answer_given.toLowerCase() === q.correct_option.toLowerCase()) {
        correct++;
      }
    }
    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 100;
    const passed = score >= 60;

    // Certificate URL (placeholder – integrate with PDF service in production)
    const certUrl = passed
      ? `/api/learning/certificates/${req.user.id}/${moduleId}`
      : null;

    await conn.beginTransaction();

    if (existing) {
      await conn.query(
        `UPDATE learning_progress
         SET completed = ?, quiz_score = ?, certificate_url = ?, completed_at = ?
         WHERE id = ?`,
        [passed ? 1 : 0, score, certUrl, passed ? new Date() : null, existing.id]
      );
    } else {
      await conn.query(
        `INSERT INTO learning_progress
           (user_id, module_id, completed, quiz_score, certificate_url, completed_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, moduleId, passed ? 1 : 0, score, certUrl, passed ? new Date() : null]
      );
    }

    let pointsAwarded = 0;
    if (passed) {
      pointsAwarded = module.points_reward;
      await awardPoints(req.user.id, pointsAwarded, `Completed module: "${module.title}"`, conn);
    }

    await conn.commit();
    conn.release();

    res.json({
      passed,
      score,
      points_earned: pointsAwarded,
      certificate_url: certUrl,
      message: passed
        ? `Congratulations! You passed with ${score}% and earned ${pointsAwarded} points.`
        : `Score: ${score}% – you need at least 60% to pass. Try again!`,
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error(err);
    res.status(500).json({ message: "Failed to complete module" });
  }
});

// ---------------------------------------------------------------
// GET /learning/my-progress  – user's full learning history
// ---------------------------------------------------------------
router.get("/my-progress", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT lp.*, m.title, m.category, m.points_reward
       FROM learning_progress lp
       JOIN learning_modules m ON lp.module_id = m.id
       WHERE lp.user_id = ?
       ORDER BY lp.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch progress" });
  }
});

// ---------------------------------------------------------------
// GET /learning/certificates/:userId/:moduleId
// Serve basic certificate info (PDF generation would be added in prod)
// ---------------------------------------------------------------
router.get("/certificates/:userId/:moduleId", authRequired, async (req, res) => {
  try {
    const { userId, moduleId } = req.params;

    if (req.user.id !== Number(userId) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const [[progress]] = await pool.query(
      `SELECT lp.*, m.title AS module_title, u.name AS user_name
       FROM learning_progress lp
       JOIN learning_modules m ON lp.module_id = m.id
       JOIN users u ON lp.user_id = u.id
       WHERE lp.user_id = ? AND lp.module_id = ? AND lp.completed = 1`,
      [userId, moduleId]
    );

    if (!progress) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    res.json({
      certificate: {
        user_name: progress.user_name,
        module_title: progress.module_title,
        completed_at: progress.completed_at,
        quiz_score: progress.quiz_score,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch certificate" });
  }
});

// ---------------------------------------------------------------
// POST /learning/modules  (admin) – create a new learning module
// Body (multipart): title, category, description, points_reward
// File: video (optional)
// ---------------------------------------------------------------
router.post(
  "/modules",
  authRequired,
  adminOnly,
  upload.single("video"),
  async (req, res) => {
    try {
      const { title, category, description, points_reward } = req.body;

      if (!title || !category) {
        return res.status(400).json({ message: "title and category are required" });
      }

      const videoUrl = req.file ? req.file.filename : null;

      const [result] = await pool.query(
        `INSERT INTO learning_modules (title, category, description, video_url, points_reward, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          title,
          category,
          description || null,
          videoUrl,
          parseInt(points_reward, 10) || 10,
          req.user.id,
        ]
      );

      res.json({ id: result.insertId, message: "Module created" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create module" });
    }
  }
);

// ---------------------------------------------------------------
// POST /learning/modules/:id/questions  (admin) – add a quiz question
// ---------------------------------------------------------------
router.post("/modules/:id/questions", authRequired, adminOnly, async (req, res) => {
  try {
    const { question_text, option_a, option_b, option_c, option_d, correct_option } = req.body;

    if (!question_text || !option_a || !option_b || !correct_option) {
      return res.status(400).json({ message: "question_text, option_a, option_b, correct_option required" });
    }

    const [result] = await pool.query(
      `INSERT INTO module_quiz_questions
         (module_id, question_text, option_a, option_b, option_c, option_d, correct_option)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        question_text,
        option_a,
        option_b,
        option_c || null,
        option_d || null,
        correct_option.toLowerCase(),
      ]
    );

    res.json({ id: result.insertId, message: "Question added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add question" });
  }
});

module.exports = router;
