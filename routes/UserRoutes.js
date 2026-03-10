const express = require("express");
const pool = require("../config/db");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /users/me
router.get("/me", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, role, is_verified FROM users WHERE id=?", [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });

    let profile = null;
    if (rows[0].role === "influencer") {
      const [[ip]] = await pool.query("SELECT * FROM influencer_profiles WHERE user_id=?", [req.user.id]);
      profile = ip || null;
    } else if (rows[0].role === "business") {
      const [[bp]] = await pool.query("SELECT * FROM business_profiles WHERE user_id=?", [req.user.id]);
      profile = bp || null;
    }

    res.json({ ...rows[0], profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// PUT /users/me
router.put("/me", authRequired, async (req, res) => {
  try {
    const { name, bio, location, niche, instagram, tiktok, youtube, twitter, follower_count, engagement_rate, business_name, industry, website } = req.body;

    if (name) await pool.query("UPDATE users SET name=? WHERE id=?", [name, req.user.id]);

    if (req.user.role === "influencer") {
      await pool.query(
        `UPDATE influencer_profiles SET
           bio=COALESCE(?,bio), location=COALESCE(?,location), niche=COALESCE(?,niche),
           instagram=COALESCE(?,instagram), tiktok=COALESCE(?,tiktok),
           youtube=COALESCE(?,youtube), twitter=COALESCE(?,twitter),
           follower_count=COALESCE(?,follower_count), engagement_rate=COALESCE(?,engagement_rate)
         WHERE user_id=?`,
        [bio, location, niche, instagram, tiktok, youtube, twitter, follower_count, engagement_rate, req.user.id]
      );
    } else if (req.user.role === "business") {
      await pool.query(
        `UPDATE business_profiles SET
           business_name=COALESCE(?,business_name), description=COALESCE(?,description),
           location=COALESCE(?,location), industry=COALESCE(?,industry), website=COALESCE(?,website)
         WHERE user_id=?`,
        [business_name, bio, location, industry, website, req.user.id]
      );
    }
    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// GET /users/:id  – public profile
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, role, is_verified FROM users WHERE id=? AND is_active=TRUE",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });

    let profile = null;
    if (rows[0].role === "influencer") {
      const [[ip]] = await pool.query(
        "SELECT bio, location, niche, instagram, tiktok, youtube, twitter, follower_count, engagement_rate FROM influencer_profiles WHERE user_id=?",
        [req.params.id]
      );
      profile = ip || null;
    } else if (rows[0].role === "business") {
      const [[bp]] = await pool.query(
        "SELECT business_name, description, location, industry, website, is_approved FROM business_profiles WHERE user_id=?",
        [req.params.id]
      );
      profile = bp || null;
    }

    res.json({ ...rows[0], profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

module.exports = router;
