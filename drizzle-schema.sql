-- ============================================================
-- Drizzle Platform - Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS drizzle;
USE drizzle;

-- Users (all roles)
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         ENUM('influencer','business','admin') NOT NULL DEFAULT 'influencer',
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Influencer profiles
CREATE TABLE IF NOT EXISTS influencer_profiles (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL UNIQUE,
  bio              TEXT,
  location         VARCHAR(100),
  niche            VARCHAR(100),
  instagram        VARCHAR(100),
  tiktok           VARCHAR(100),
  youtube          VARCHAR(100),
  twitter          VARCHAR(100),
  follower_count   INT DEFAULT 0,
  engagement_rate  DECIMAL(5,2) DEFAULT 0.00,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Business profiles
CREATE TABLE IF NOT EXISTS business_profiles (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL UNIQUE,
  business_name VARCHAR(150) NOT NULL,
  description   TEXT,
  location      VARCHAR(100),
  industry      VARCHAR(100),
  website       VARCHAR(255),
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Promotion tasks posted by businesses
CREATE TABLE IF NOT EXISTS tasks (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  business_id     INT NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  requirements    TEXT,
  niche           VARCHAR(100),
  budget          DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  platform        VARCHAR(50),
  status          ENUM('open','assigned','submitted','completed','cancelled') NOT NULL DEFAULT 'open',
  deadline        DATE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Task applications by influencers
CREATE TABLE IF NOT EXISTS task_applications (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  task_id        INT NOT NULL,
  influencer_id  INT NOT NULL,
  message        TEXT,
  status         ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
  applied_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (influencer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_task_influencer (task_id, influencer_id)
);

-- Task submissions (proof of completion)
CREATE TABLE IF NOT EXISTS task_submissions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  task_id        INT NOT NULL,
  influencer_id  INT NOT NULL,
  proof_url      VARCHAR(500),
  description    TEXT,
  status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  submitted_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at    TIMESTAMP NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (influencer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL UNIQUE,
  balance    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS transactions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  wallet_id    INT NOT NULL,
  type         ENUM('credit','debit') NOT NULL,
  amount       DECIMAL(12,2) NOT NULL,
  description  VARCHAR(300),
  reference_id INT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- Payments (task completion payouts)
CREATE TABLE IF NOT EXISTS payments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  task_id        INT NOT NULL,
  business_id    INT NOT NULL,
  influencer_id  INT NOT NULL,
  gross_amount   DECIMAL(12,2) NOT NULL,
  commission     DECIMAL(12,2) NOT NULL,
  net_amount     DECIMAL(12,2) NOT NULL,
  status         ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (business_id) REFERENCES users(id),
  FOREIGN KEY (influencer_id) REFERENCES users(id)
);

-- Subscriptions (business plans)
CREATE TABLE IF NOT EXISTS subscriptions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  business_id INT NOT NULL,
  plan        ENUM('basic','premium') NOT NULL DEFAULT 'basic',
  amount      DECIMAL(10,2) NOT NULL,
  status      ENUM('active','cancelled','expired') NOT NULL DEFAULT 'active',
  expires_at  DATE NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Digital skills training modules
CREATE TABLE IF NOT EXISTS training_modules (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  category      VARCHAR(100),
  content       LONGTEXT,
  duration_mins INT DEFAULT 10,
  badge_label   VARCHAR(100),
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User training progress
CREATE TABLE IF NOT EXISTS training_progress (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  module_id    INT NOT NULL,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  UNIQUE KEY uq_user_module (user_id, module_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES training_modules(id) ON DELETE CASCADE
);

-- Wellness alerts
CREATE TABLE IF NOT EXISTS wellness_alerts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(200) NOT NULL,
  message    TEXT NOT NULL,
  type       ENUM('screen_time','mental_health','tips','checkin') NOT NULL DEFAULT 'tips',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily wellness check-ins
CREATE TABLE IF NOT EXISTS wellness_checkins (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  mood       TINYINT NOT NULL COMMENT '1=terrible 2=bad 3=ok 4=good 5=great',
  notes      TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  message    TEXT NOT NULL,
  type       VARCHAR(50) DEFAULT 'general',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  task_id     INT NOT NULL,
  raised_by   INT NOT NULL,
  description TEXT NOT NULL,
  status      ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  resolution  TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (raised_by) REFERENCES users(id)
);

-- ---------------------------------------------------------------
-- Seed: Default admin account (password: admin123)
-- ---------------------------------------------------------------
INSERT IGNORE INTO users (name, email, password, role, is_verified)
VALUES ('Admin', 'admin@drizzle.app',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lkcO',
  'admin', TRUE);

-- Seed: Training modules
INSERT IGNORE INTO training_modules (title, description, category, content, duration_mins, badge_label, sort_order)
VALUES
  ('Content Creation 101', 'Learn the basics of creating engaging content for social media.', 'Content Creation',
   'Module 1: Understanding Your Audience\nModule 2: Content Formats & Platforms\nModule 3: Storytelling Techniques\nModule 4: Tools & Apps', 20, 'Content Creator', 1),
  ('Personal Branding', 'Build a strong personal brand online that attracts followers and opportunities.', 'Branding',
   'Module 1: What is Personal Branding?\nModule 2: Defining Your Niche\nModule 3: Consistency & Aesthetics\nModule 4: Building Trust', 15, 'Brand Builder', 2),
  ('Digital Marketing Fundamentals', 'Understand how digital marketing works and how to leverage it.', 'Digital Marketing',
   'Module 1: Digital Marketing Overview\nModule 2: SEO & SEM Basics\nModule 3: Social Media Ads\nModule 4: Email Marketing', 25, 'Digital Marketer', 3),
  ('Entrepreneurship for Creators', 'Turn your creativity into a sustainable income stream.', 'Entrepreneurship',
   'Module 1: Mindset of an Entrepreneur\nModule 2: Monetization Strategies\nModule 3: Managing Finances\nModule 4: Pitching & Partnerships', 30, 'Creator Entrepreneur', 4);

-- Seed: Wellness alerts
INSERT IGNORE INTO wellness_alerts (title, message, type)
VALUES
  ('Take a Screen Break', 'You''ve been online for a while. Step away from the screen for 10 minutes — your eyes and mind will thank you! 👀', 'screen_time'),
  ('Hydrate Yourself', 'Remember to drink water. Staying hydrated keeps you focused and energized. 💧', 'tips'),
  ('Mental Health Reminder', 'It''s okay to not feel okay. Reach out to a friend or counsellor if you need support. 💙', 'mental_health'),
  ('Social Media Boundaries', 'Limit scrolling to 30-minute sessions. Use a timer to stay accountable! ⏱️', 'screen_time'),
  ('Celebrate Small Wins', 'Did you complete a task today? You are making progress. Be proud of yourself! 🎉', 'mental_health'),
  ('Offline Time Is Valuable', 'Spend at least 1 hour each day completely offline. Read, exercise, or chat with family. 🌿', 'tips');
