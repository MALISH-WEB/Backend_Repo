require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const commentRoutes = require("./routes/commentRoutes");
const approvalRoutes = require("./routes/approvalRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const userRoutes = require("./routes/UserRoutes");
const adminRoutes = require("./routes/adminRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const metaRoutes = require("./routes/metaRoutes");

// AdEarn Wellness routes
const screenTimeRoutes = require("./routes/screenTimeRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const adsRoutes = require("./routes/adsRoutes");
const learningRoutes = require("./routes/learningRoutes");
const wellnessRoutes = require("./routes/wellnessRoutes");
const businessRoutes = require("./routes/businessRoutes");

const app = express();

// FIRST MIDDLEWARE

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// CORS FIX
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Static uploads
app.use("/uploads", express.static("uploads"));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", apiLimiter, projectRoutes);
app.use("/api/comments", apiLimiter, commentRoutes);
app.use("/api/approvals", apiLimiter, approvalRoutes);
app.use("/api/analytics", apiLimiter, analyticsRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api", apiLimiter, metaRoutes);

// AdEarn Wellness API Routes
app.use("/api/screen-time", apiLimiter, screenTimeRoutes);
app.use("/api/rewards", apiLimiter, rewardRoutes);
app.use("/api/ads", apiLimiter, adsRoutes);
app.use("/api/learning", apiLimiter, learningRoutes);
app.use("/api/wellness", apiLimiter, wellnessRoutes);
app.use("/api/business", apiLimiter, businessRoutes);

// SERVER START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});

