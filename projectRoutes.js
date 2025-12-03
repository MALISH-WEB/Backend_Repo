const express = require("express");
const pool = require("../config/db");
const upload = require("../middleware/upload");
const { authRequired } = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /projects   (with filters)
|--------------------------------------------------------------------------
*/
router.get("/", async (req, res) => {
  try {
    const { category, faculty, search, sort } = req.query;

    let sql = `
      SELECT 
        p.*, 
        u.name AS user_name
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;

    const params = [];

    // Filter by category (typed by student)
    if (category) {
      sql += " AND p.category = ?";
      params.push(category);
    }

    // Filter by faculty (typed by student)
    if (faculty) {
      sql += " AND p.faculty = ?";
      params.push(faculty);
    }

    // Search
    if (search) {
      sql += " AND (p.title LIKE ? OR p.description LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting
    if (sort === "oldest") sql += " ORDER BY p.created_at ASC";
    else if (sort === "az") sql += " ORDER BY p.title ASC";
    else if (sort === "za") sql += " ORDER BY p.title DESC";
    else sql += " ORDER BY p.created_at DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

/*
|--------------------------------------------------------------------------
| GET /projects/:id
|--------------------------------------------------------------------------
*/
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        p.*,
        u.name AS user_name
      FROM projects p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
      `,
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Project not found" });

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

/*
|--------------------------------------------------------------------------
| POST /projects   (with file upload + github_url + live_url)
|--------------------------------------------------------------------------
*/
router.post("/", authRequired, upload.single("file"), async (req, res) => {
  try {
    const { title, description, category, faculty, github_url, live_url } = req.body;
    const file_path = req.file ? req.file.filename : null;

    const [result] = await pool.query(
      `
      INSERT INTO projects 
      (user_id, title, description, category, faculty, github_url, live_url, file_path, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [
        req.user.id,
        title,
        description,
        category,
        faculty,
        github_url || null,
        live_url || null,
        file_path
      ]
    );

    res.json({ id: result.insertId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create project" });
  }
});

module.exports = router;
