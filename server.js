require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/UserRoutes");
const taskRoutes = require("./routes/taskRoutes");
const walletRoutes = require("./routes/walletRoutes");
const trainingRoutes = require("./routes/trainingRoutes");
const wellnessRoutes = require("./routes/wellnessRoutes");
const matchRoutes = require("./routes/matchRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const disputeRoutes = require("./routes/disputeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Rate limiter for auth routes (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Static uploads
app.use("/uploads", express.static("uploads"));

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/tasks", apiLimiter, taskRoutes);
app.use("/api/wallet", apiLimiter, walletRoutes);
app.use("/api/training", apiLimiter, trainingRoutes);
app.use("/api/wellness", apiLimiter, wellnessRoutes);
app.use("/api/matches", apiLimiter, matchRoutes);
app.use("/api/subscriptions", apiLimiter, subscriptionRoutes);
app.use("/api/disputes", apiLimiter, disputeRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/analytics", apiLimiter, analyticsRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Drizzle backend running on port ${PORT}`);
});
