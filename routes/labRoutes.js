const express = require("express");
const rateLimit = require("express-rate-limit");
const pool = require("../config/db");
const { authRequired, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// ─────────────────────────────────────────────
//  RATE LIMITERS
// ─────────────────────────────────────────────

/** General read limiter – generous since labs can be loaded frequently */
const readLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down." },
});

/** Write / mutation limiter – prevents abuse on state-changing endpoints */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down." },
});

// ─────────────────────────────────────────────
//  NETWORKING SIMULATION HELPERS (rule-based AI)
// ─────────────────────────────────────────────

/** Validate an IPv4 address string */
function isValidIP(ip) {
  if (!ip || typeof ip !== "string") return false;
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every(p => {
    const n = Number(p);
    return /^\d+$/.test(p) && n >= 0 && n <= 255;
  });
}

/** Validate a subnet mask (must be a valid prefix mask) */
function isValidSubnet(mask) {
  if (!isValidIP(mask)) return false;
  const octets = mask.split(".").map(Number);
  const bits = octets.map(o => o.toString(2).padStart(8, "0")).join("");
  return /^1*0*$/.test(bits);
}

/** Convert IP to 32-bit integer */
function ipToInt(ip) {
  return ip.split(".").reduce((acc, o) => (acc << 8) | Number(o), 0) >>> 0;
}

/** Determine whether two IP/mask pairs are in the same subnet */
function sameSubnet(ip1, mask1, ip2, mask2) {
  if (!isValidIP(ip1) || !isValidSubnet(mask1) || !isValidIP(ip2) || !isValidSubnet(mask2))
    return false;
  if (mask1 !== mask2) return false;
  const m = ipToInt(mask1);
  return (ipToInt(ip1) & m) === (ipToInt(ip2) & m);
}

/** Core rule-based feedback engine */
function analyzeAction(action, topology) {
  const { type, deviceId, ip, subnet, fromId, toId } = action;
  const devices = topology.devices || [];
  const connections = topology.connections || [];

  if (type === "assign_ip") {
    if (!isValidIP(ip)) {
      return {
        ok: false,
        feedback: `❌ "${ip}" is not a valid IPv4 address. Each octet must be between 0 and 255 (e.g. 192.168.1.1).`,
      };
    }
    if (!isValidSubnet(subnet)) {
      return {
        ok: false,
        feedback: `❌ "${subnet}" is not a valid subnet mask. Valid examples: 255.255.255.0, 255.255.0.0.`,
      };
    }
    // Check for IP conflicts with other devices
    const conflict = devices.find(d => d.id !== deviceId && d.ip === ip);
    if (conflict) {
      return {
        ok: false,
        feedback: `❌ IP address ${ip} is already assigned to ${conflict.name}. Every device must have a unique IP address.`,
      };
    }
    // Warn about loopback or broadcast
    if (ip.startsWith("127.")) {
      return {
        ok: false,
        feedback: `❌ ${ip} is a loopback address and cannot be assigned to a network device.`,
      };
    }
    const lastOctet = Number(ip.split(".")[3]);
    const maskInt = ipToInt(subnet);
    const hostBits = 32 - maskInt.toString(2).replace(/0/g, "").length;
    const maxHost = (1 << hostBits) - 2;
    if (lastOctet === 0) {
      return {
        ok: false,
        feedback: `❌ ${ip} is the network address and cannot be assigned to a host device.`,
      };
    }
    if (lastOctet === 255 && subnet === "255.255.255.0") {
      return {
        ok: false,
        feedback: `❌ ${ip} is the broadcast address for this subnet and cannot be used for a host.`,
      };
    }
    return {
      ok: true,
      feedback: `✅ IP ${ip}/${subnet} assigned successfully to ${deviceId}. The device is now addressable on the ${ip.split(".").slice(0, 3).join(".")}.0/${subnet} network (${maxHost} usable hosts).`,
    };
  }

  if (type === "connect") {
    const dev1 = devices.find(d => d.id === fromId);
    const dev2 = devices.find(d => d.id === toId);
    if (!dev1 || !dev2) {
      return { ok: false, feedback: "❌ One or both devices not found in the topology." };
    }
    const alreadyConnected = connections.some(
      c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
    );
    if (alreadyConnected) {
      return {
        ok: false,
        feedback: `❌ ${dev1.name} and ${dev2.name} are already connected by a cable.`,
      };
    }
    return {
      ok: true,
      feedback: `✅ ${dev1.name} connected to ${dev2.name} via virtual Ethernet cable.`,
    };
  }

  if (type === "ping") {
    const src = devices.find(d => d.id === fromId);
    const dst = devices.find(d => d.id === toId);
    if (!src || !dst) {
      return { ok: false, feedback: "❌ Source or destination device not found." };
    }
    if (!src.ip || !src.subnet) {
      return {
        ok: false,
        feedback: `❌ Ping failed: ${src.name} does not have an IP address configured. Assign an IP before testing connectivity.`,
      };
    }
    if (!dst.ip || !dst.subnet) {
      return {
        ok: false,
        feedback: `❌ Ping failed: ${dst.name} does not have an IP address configured.`,
      };
    }
    // Check physical connection (direct or via router)
    const directLink = connections.some(
      c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId)
    );
    if (!directLink) {
      return {
        ok: false,
        feedback: `❌ Ping failed: ${src.name} and ${dst.name} are not connected. Use a virtual cable to link them.`,
      };
    }
    // Check subnet compatibility
    if (!sameSubnet(src.ip, src.subnet, dst.ip, dst.subnet)) {
      return {
        ok: false,
        feedback: `❌ Ping failed: ${src.name} (${src.ip}/${src.subnet}) and ${dst.name} (${dst.ip}/${dst.subnet}) are on different subnets. Ensure both devices share the same network address, or configure routing.`,
      };
    }
    return {
      ok: true,
      feedback: `✅ Ping successful! ${src.name} (${src.ip}) → ${dst.name} (${dst.ip}): 4 packets transmitted, 4 received, 0% packet loss. Round-trip time: ~1ms.`,
    };
  }

  return { ok: false, feedback: "Unknown action type." };
}

// ─────────────────────────────────────────────
//  LABS CRUD
// ─────────────────────────────────────────────

/** GET /api/labs */
router.get("/", readLimiter, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*, u.name AS teacher_name
       FROM labs l
       LEFT JOIN users u ON l.created_by = u.id
       ORDER BY l.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("[labs] list error:", err);
    res.status(500).json({ message: "Failed to fetch labs" });
  }
});

/** GET /api/labs/:id */
router.get("/:id", readLimiter, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT l.*, u.name AS teacher_name
       FROM labs l
       LEFT JOIN users u ON l.created_by = u.id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: "Lab not found" });

    const lab = rows[0];
    lab.topology = typeof lab.topology === "string" ? JSON.parse(lab.topology) : lab.topology;
    lab.tasks = typeof lab.tasks === "string" ? JSON.parse(lab.tasks) : lab.tasks;
    res.json(lab);
  } catch (err) {
    console.error("[labs] get error:", err);
    res.status(500).json({ message: "Failed to fetch lab" });
  }
});

/** POST /api/labs  (teacher/admin creates a lab) */
router.post("/", writeLimiter, authRequired, async (req, res) => {
  try {
    const { title, description, scenario_type, topology, tasks } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });

    const [result] = await pool.query(
      `INSERT INTO labs (title, description, scenario_type, topology, tasks, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || "",
        scenario_type || "ip_config",
        JSON.stringify(topology || { devices: [], connections: [] }),
        JSON.stringify(tasks || []),
        req.user.id,
      ]
    );
    res.json({ id: result.insertId, message: "Lab created" });
  } catch (err) {
    console.error("[labs] create error:", err);
    res.status(500).json({ message: "Failed to create lab" });
  }
});

/** PUT /api/labs/:id */
router.put("/:id", writeLimiter, authRequired, async (req, res) => {
  try {
    const { title, description, scenario_type, topology, tasks } = req.body;
    const [existing] = await pool.query("SELECT created_by FROM labs WHERE id = ?", [req.params.id]);
    if (!existing.length) return res.status(404).json({ message: "Lab not found" });
    if (existing[0].created_by !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await pool.query(
      `UPDATE labs SET title=?, description=?, scenario_type=?, topology=?, tasks=? WHERE id=?`,
      [
        title,
        description || "",
        scenario_type || "ip_config",
        JSON.stringify(topology || { devices: [], connections: [] }),
        JSON.stringify(tasks || []),
        req.params.id,
      ]
    );
    res.json({ message: "Lab updated" });
  } catch (err) {
    console.error("[labs] update error:", err);
    res.status(500).json({ message: "Failed to update lab" });
  }
});

// ─────────────────────────────────────────────
//  LAB SESSIONS
// ─────────────────────────────────────────────

/** POST /api/labs/:id/sessions  – student starts a session */
router.post("/:id/sessions", writeLimiter, authRequired, async (req, res) => {
  try {
    const labId = req.params.id;
    const [labRows] = await pool.query("SELECT * FROM labs WHERE id = ?", [labId]);
    if (!labRows.length) return res.status(404).json({ message: "Lab not found" });

    const lab = labRows[0];
    const initialTopology =
      typeof lab.topology === "string" ? JSON.parse(lab.topology) : lab.topology;

    const [result] = await pool.query(
      `INSERT INTO lab_sessions (lab_id, student_id, topology_state)
       VALUES (?, ?, ?)`,
      [labId, req.user.id, JSON.stringify(initialTopology)]
    );
    res.json({ session_id: result.insertId });
  } catch (err) {
    console.error("[lab-sessions] create error:", err);
    res.status(500).json({ message: "Failed to start session" });
  }
});

/** GET /api/labs/sessions/:sessionId */
router.get("/sessions/:sessionId", readLimiter, authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, l.title AS lab_title, l.tasks, l.description
       FROM lab_sessions s
       JOIN labs l ON s.lab_id = l.id
       WHERE s.id = ?`,
      [req.params.sessionId]
    );
    if (!rows.length) return res.status(404).json({ message: "Session not found" });
    const session = rows[0];
    if (session.student_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    session.topology_state =
      typeof session.topology_state === "string"
        ? JSON.parse(session.topology_state)
        : session.topology_state;
    session.tasks =
      typeof session.tasks === "string" ? JSON.parse(session.tasks) : session.tasks;
    res.json(session);
  } catch (err) {
    console.error("[lab-sessions] get error:", err);
    res.status(500).json({ message: "Failed to fetch session" });
  }
});

/** POST /api/labs/sessions/:sessionId/actions  – student submits an action */
router.post("/sessions/:sessionId/actions", writeLimiter, authRequired, async (req, res) => {
  try {
    const { action } = req.body; // { type, deviceId?, ip?, subnet?, fromId?, toId? }
    if (!action) return res.status(400).json({ message: "action is required" });

    const [sessionRows] = await pool.query(
      "SELECT * FROM lab_sessions WHERE id = ?",
      [req.params.sessionId]
    );
    if (!sessionRows.length) return res.status(404).json({ message: "Session not found" });
    const session = sessionRows[0];
    if (session.student_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (session.status !== "in_progress") {
      return res.status(400).json({ message: "Session is not active" });
    }

    // Parse current topology state
    let topology =
      typeof session.topology_state === "string"
        ? JSON.parse(session.topology_state)
        : session.topology_state;

    // Run rule-based feedback
    const result = analyzeAction(action, topology);

    // If the action succeeded, mutate topology
    if (result.ok) {
      if (action.type === "assign_ip") {
        const dev = topology.devices.find(d => d.id === action.deviceId);
        if (dev) {
          dev.ip = action.ip;
          dev.subnet = action.subnet;
        }
      } else if (action.type === "connect") {
        topology.connections.push({ from: action.fromId, to: action.toId });
      }
    }

    // Persist updated topology and record the action
    await pool.query(
      "UPDATE lab_sessions SET topology_state=?, attempts=attempts+1 WHERE id=?",
      [JSON.stringify(topology), session.id]
    );
    await pool.query(
      `INSERT INTO lab_actions (session_id, action_type, action_data, feedback, is_correct)
       VALUES (?, ?, ?, ?, ?)`,
      [
        session.id,
        action.type,
        JSON.stringify(action),
        result.feedback,
        result.ok ? 1 : 0,
      ]
    );

    res.json({ ok: result.ok, feedback: result.feedback, topology });
  } catch (err) {
    console.error("[lab-sessions] action error:", err);
    res.status(500).json({ message: "Failed to process action" });
  }
});

/** POST /api/labs/sessions/:sessionId/complete */
router.post("/sessions/:sessionId/complete", writeLimiter, authRequired, async (req, res) => {
  try {
    const [sessionRows] = await pool.query(
      "SELECT * FROM lab_sessions WHERE id = ?",
      [req.params.sessionId]
    );
    if (!sessionRows.length) return res.status(404).json({ message: "Session not found" });
    const session = sessionRows[0];
    if (session.student_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Calculate score based on correct actions vs total actions
    const [[counts]] = await pool.query(
      `SELECT COUNT(*) AS total, SUM(is_correct) AS correct
       FROM lab_actions WHERE session_id = ?`,
      [session.id]
    );
    const total = Number(counts.total) || 0;
    const correct = Number(counts.correct) || 0;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    await pool.query(
      `UPDATE lab_sessions SET status='completed', score=?, completed_at=NOW() WHERE id=?`,
      [score, session.id]
    );

    // Upsert competency record
    const [labRows] = await pool.query("SELECT tasks FROM labs WHERE id=?", [session.lab_id]);
    const tasks = labRows.length
      ? typeof labRows[0].tasks === "string"
        ? JSON.parse(labRows[0].tasks)
        : labRows[0].tasks
      : [];

    const skills = tasks.map(t => t.competency).filter(Boolean);
    await pool.query(
      `INSERT INTO competencies (student_id, lab_id, task_completion, accuracy, attempts, skills)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         task_completion=VALUES(task_completion),
         accuracy=VALUES(accuracy),
         attempts=VALUES(attempts),
         skills=VALUES(skills),
         assessed_at=NOW()`,
      [
        session.student_id,
        session.lab_id,
        score,
        score,
        session.attempts,
        JSON.stringify([...new Set(skills)]),
      ]
    );

    res.json({ message: "Session completed", score });
  } catch (err) {
    console.error("[lab-sessions] complete error:", err);
    res.status(500).json({ message: "Failed to complete session" });
  }
});

// ─────────────────────────────────────────────
//  STUDENT PROGRESS / COMPETENCIES
// ─────────────────────────────────────────────

/** GET /api/labs/progress/:studentId */
router.get("/progress/:studentId", readLimiter, authRequired, async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    if (req.user.id !== studentId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    const [rows] = await pool.query(
      `SELECT c.*, l.title AS lab_title, l.scenario_type
       FROM competencies c
       JOIN labs l ON c.lab_id = l.id
       WHERE c.student_id = ?
       ORDER BY c.assessed_at DESC`,
      [studentId]
    );
    const data = rows.map(r => ({
      ...r,
      skills: typeof r.skills === "string" ? JSON.parse(r.skills) : r.skills,
    }));
    res.json(data);
  } catch (err) {
    console.error("[progress] error:", err);
    res.status(500).json({ message: "Failed to fetch progress" });
  }
});

/** GET /api/labs/teacher/sessions  – teacher sees all sessions for their labs */
router.get("/teacher/sessions", readLimiter, authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.student_id, s.lab_id, s.status, s.score, s.attempts,
              s.started_at, s.completed_at,
              u.name AS student_name, l.title AS lab_title
       FROM lab_sessions s
       JOIN labs l ON s.lab_id = l.id
       JOIN users u ON s.student_id = u.id
       WHERE l.created_by = ?
       ORDER BY s.started_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[teacher] sessions error:", err);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

module.exports = router;
