const express = require("express");
const pool = require("../config/db");
const upload = require("../middleware/upload");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");
const { awardPoints } = require("./rewardRoutes");

const router = express.Router();

// ---------------------------------------------------------------
// Middleware: business-only guard
// ---------------------------------------------------------------
function businessOrAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (req.user.role === "business" || req.user.role === "admin") return next();
  return res.status(403).json({ message: "Business or Admin only" });
}

// ---------------------------------------------------------------
// GET /ads   – list active ads (for mobile app)
// ---------------------------------------------------------------
router.get("/", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.title, a.description, a.media_url, a.media_type,
              a.points_per_view, b.business_name
       FROM advertisements a
       JOIN businesses b ON a.business_id = b.id
       WHERE a.status = 'active'
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch ads" });
  }
});

// ---------------------------------------------------------------
// GET /ads/:id  – single ad with quiz question
// ---------------------------------------------------------------
router.get("/:id", authRequired, async (req, res) => {
  try {
    const [[ad]] = await pool.query(
      `SELECT a.*, b.business_name
       FROM advertisements a
       JOIN businesses b ON a.business_id = b.id
       WHERE a.id = ? AND a.status = 'active'`,
      [req.params.id]
    );
    if (!ad) return res.status(404).json({ message: "Ad not found" });

    const [questions] = await pool.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d
       FROM ad_quiz_questions WHERE ad_id = ? LIMIT 1`,
      [ad.id]
    );

    res.json({ ...ad, quiz_question: questions[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch ad" });
  }
});

// ---------------------------------------------------------------
// POST /ads/:id/engage
// Body: { question_id, answer_given }
// User watches ad and answers quiz; earns points if correct
// ---------------------------------------------------------------
router.post("/:id/engage", authRequired, async (req, res) => {
  try {
    const { question_id, answer_given } = req.body;
    const adId = req.params.id;

    if (!question_id || !answer_given) {
      return res.status(400).json({ message: "question_id and answer_given are required" });
    }

    // Check already engaged
    const [existing] = await pool.query(
      "SELECT id FROM ad_engagements WHERE user_id = ? AND ad_id = ?",
      [req.user.id, adId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "Already engaged with this ad" });
    }

    // Get ad and question
    const [[ad]] = await pool.query(
      "SELECT * FROM advertisements WHERE id = ? AND status = 'active'",
      [adId]
    );
    if (!ad) return res.status(404).json({ message: "Ad not found or inactive" });

    const [[question]] = await pool.query(
      "SELECT * FROM ad_quiz_questions WHERE id = ? AND ad_id = ?",
      [question_id, adId]
    );
    if (!question) return res.status(404).json({ message: "Question not found" });

    const isCorrect = question.correct_option === answer_given.toLowerCase() ? 1 : 0;
    const pointsEarned = isCorrect ? ad.points_per_view : 0;

    await pool.query(
      `INSERT INTO ad_engagements
         (user_id, ad_id, question_id, answer_given, is_correct, points_earned)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, adId, question_id, answer_given.toLowerCase(), isCorrect, pointsEarned]
    );

    if (pointsEarned > 0) {
      await awardPoints(req.user.id, pointsEarned, `Ad engagement: "${ad.title}"`);
    }

    res.json({
      correct: Boolean(isCorrect),
      points_earned: pointsEarned,
      message: isCorrect
        ? `Correct! You earned ${pointsEarned} points.`
        : "Wrong answer – no points this time.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Engagement failed" });
  }
});

// ---------------------------------------------------------------
// POST /ads  (business) – create a new ad with one quiz question
// Body (multipart): title, description, points_per_view, budget,
//                   question_text, option_a, option_b, [option_c, option_d], correct_option
// File: media (video or image)
// ---------------------------------------------------------------
router.post(
  "/",
  authRequired,
  businessOrAdmin,
  upload.single("media"),
  async (req, res) => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        title,
        description,
        points_per_view,
        budget,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
      } = req.body;

      if (!title || !question_text || !option_a || !option_b || !correct_option) {
        conn.release();
        return res.status(400).json({ message: "title, question, options a/b, and correct_option are required" });
      }

      // Get business record
      const [[business]] = await conn.query(
        "SELECT id FROM businesses WHERE user_id = ? AND approved = 1",
        [req.user.id]
      );
      if (!business && req.user.role !== "admin") {
        conn.release();
        return res.status(403).json({ message: "Business account not approved" });
      }

      const ALLOWED_MIMETYPES = ["video/mp4", "video/webm", "video/ogg", "image/jpeg", "image/png", "image/gif", "image/webp"];
      if (req.file && !ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
        conn.release();
        return res.status(400).json({ message: "Unsupported file type. Only video (mp4/webm/ogg) and image (jpg/png/gif/webp) files are allowed." });
      }

      const businessId = business ? business.id : req.body.business_id;
      const mediaUrl = req.file ? req.file.filename : null;
      let mediaType = "video";
      if (req.file) {
        mediaType = req.file.mimetype.startsWith("image/") ? "image" : "video";
      }

      const [adResult] = await conn.query(
        `INSERT INTO advertisements
           (business_id, title, description, media_url, media_type, budget, points_per_view, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          businessId,
          title,
          description || null,
          mediaUrl,
          mediaType,
          parseFloat(budget) || 0,
          parseInt(points_per_view, 10) || 5,
        ]
      );

      await conn.query(
        `INSERT INTO ad_quiz_questions
           (ad_id, question_text, option_a, option_b, option_c, option_d, correct_option)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          adResult.insertId,
          question_text,
          option_a,
          option_b,
          option_c || null,
          option_d || null,
          correct_option.toLowerCase(),
        ]
      );

      await conn.commit();
      conn.release();
      res.json({ id: adResult.insertId, message: "Ad submitted for approval" });
    } catch (err) {
      await conn.rollback();
      conn.release();
      console.error(err);
      res.status(500).json({ message: "Failed to create ad" });
    }
  }
);

// ---------------------------------------------------------------
// GET /ads/business/my   – ads owned by the current business user
// ---------------------------------------------------------------
router.get("/business/my", authRequired, businessOrAdmin, async (req, res) => {
  try {
    const [[business]] = await pool.query(
      "SELECT id FROM businesses WHERE user_id = ?",
      [req.user.id]
    );
    if (!business) return res.status(404).json({ message: "Business profile not found" });

    const [rows] = await pool.query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM ad_engagements ae WHERE ae.ad_id = a.id) AS total_engagements,
              (SELECT COUNT(*) FROM ad_engagements ae WHERE ae.ad_id = a.id AND ae.is_correct = 1) AS correct_answers
       FROM advertisements a
       WHERE a.business_id = ?
       ORDER BY a.created_at DESC`,
      [business.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch business ads" });
  }
});

// ---------------------------------------------------------------
// GET /ads/:id/analytics  (business / admin) – engagement stats for one ad
// ---------------------------------------------------------------
router.get("/:id/analytics", authRequired, businessOrAdmin, async (req, res) => {
  try {
    const [[ad]] = await pool.query("SELECT * FROM advertisements WHERE id = ?", [req.params.id]);
    if (!ad) return res.status(404).json({ message: "Ad not found" });

    // Verify ownership (unless admin)
    if (req.user.role !== "admin") {
      const [[biz]] = await pool.query(
        "SELECT id FROM businesses WHERE user_id = ? AND id = ?",
        [req.user.id, ad.business_id]
      );
      if (!biz) return res.status(403).json({ message: "Not your ad" });
    }

    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*)                          AS total_views,
         SUM(is_correct)                   AS correct_answers,
         SUM(points_earned)                AS total_points_distributed
       FROM ad_engagements WHERE ad_id = ?`,
      [req.params.id]
    );

    const [daily] = await pool.query(
      `SELECT DATE(engaged_at) AS date, COUNT(*) AS views
       FROM ad_engagements WHERE ad_id = ?
       GROUP BY DATE(engaged_at) ORDER BY date ASC`,
      [req.params.id]
    );

    res.json({ ad_id: ad.id, title: ad.title, ...stats, daily_engagement: daily });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// ---------------------------------------------------------------
// PUT /ads/:id/status  (admin) – approve / pause / complete an ad
// Body: { status }
// ---------------------------------------------------------------
router.put("/:id/status", authRequired, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["pending", "active", "paused", "completed"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `status must be one of: ${allowed.join(", ")}` });
    }

    await pool.query("UPDATE advertisements SET status = ? WHERE id = ?", [
      status,
      req.params.id,
    ]);
    res.json({ message: "Ad status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update ad status" });
  }
});

module.exports = router;
