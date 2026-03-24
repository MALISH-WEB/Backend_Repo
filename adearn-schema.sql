-- =============================================================
-- AdEarn Wellness – Database Schema
-- Compatible with: MySQL 8+
-- =============================================================

-- ---------------------------------------------------------------
-- USERS  (extends the existing users table)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(120)  NOT NULL,
  email          VARCHAR(180)  UNIQUE,
  phone          VARCHAR(30)   UNIQUE,
  password       VARCHAR(255),
  google_id      VARCHAR(120)  UNIQUE,
  role           ENUM('user','business','admin') NOT NULL DEFAULT 'user',
  age_group      ENUM('15-18','19-22','23-26','27-30','31-35') DEFAULT NULL,
  occupation     VARCHAR(100)  DEFAULT NULL,
  points         INT           NOT NULL DEFAULT 0,
  level          ENUM('Bronze','Silver','Gold') NOT NULL DEFAULT 'Bronze',
  -- 2FA
  otp_secret     VARCHAR(64)   DEFAULT NULL,
  otp_enabled    TINYINT(1)    NOT NULL DEFAULT 0,
  -- legacy fields kept for backward compat
  faculty_id     INT           DEFAULT NULL,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- SCREEN TIME LOGS  – one row per app per day per user
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS screen_time_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT           NOT NULL,
  app_name      VARCHAR(80)   NOT NULL,
  log_date      DATE          NOT NULL,
  minutes_used  INT           NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_app_date (user_id, app_name, log_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- APP USAGE LIMITS  – per user, per app
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_limits (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL,
  app_name       VARCHAR(80)  NOT NULL,
  daily_limit_minutes INT     NOT NULL DEFAULT 60,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_app (user_id, app_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- FOCUS SESSIONS  – study/work periods with social media blocked
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS focus_sessions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL,
  label          VARCHAR(120) NOT NULL DEFAULT 'Focus Session',
  start_time     DATETIME     NOT NULL,
  end_time       DATETIME     NOT NULL,
  active         TINYINT(1)   NOT NULL DEFAULT 1,
  overrides_used INT          NOT NULL DEFAULT 0,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- BUSINESSES
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS businesses (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL UNIQUE,
  business_name  VARCHAR(160) NOT NULL,
  contact_email  VARCHAR(180) NOT NULL,
  approved       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- ADVERTISEMENTS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advertisements (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  business_id    INT          NOT NULL,
  title          VARCHAR(200) NOT NULL,
  description    TEXT,
  media_url      VARCHAR(255) DEFAULT NULL,
  media_type     ENUM('video','image') NOT NULL DEFAULT 'video',
  budget         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  points_per_view INT         NOT NULL DEFAULT 5,
  status         ENUM('pending','active','paused','completed') NOT NULL DEFAULT 'pending',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Quiz questions attached to each ad (at least one required)
CREATE TABLE IF NOT EXISTS ad_quiz_questions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ad_id          INT          NOT NULL,
  question_text  TEXT         NOT NULL,
  option_a       VARCHAR(255) NOT NULL,
  option_b       VARCHAR(255) NOT NULL,
  option_c       VARCHAR(255),
  option_d       VARCHAR(255),
  correct_option ENUM('a','b','c','d') NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ad_id) REFERENCES advertisements(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- AD ENGAGEMENTS  – user watches ad, answers quiz
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_engagements (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT          NOT NULL,
  ad_id           INT          NOT NULL,
  question_id     INT          NOT NULL,
  answer_given    ENUM('a','b','c','d') NOT NULL,
  is_correct      TINYINT(1)   NOT NULL DEFAULT 0,
  points_earned   INT          NOT NULL DEFAULT 0,
  engaged_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_ad (user_id, ad_id),
  FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (ad_id)      REFERENCES advertisements(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES ad_quiz_questions(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- LEARNING MODULES
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_modules (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(200) NOT NULL,
  category       ENUM('digital_marketing','graphic_design','coding_basics','entrepreneurship','other') NOT NULL DEFAULT 'other',
  description    TEXT,
  video_url      VARCHAR(255) DEFAULT NULL,
  points_reward  INT          NOT NULL DEFAULT 10,
  created_by     INT          DEFAULT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Quiz questions for learning modules
CREATE TABLE IF NOT EXISTS module_quiz_questions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  module_id      INT          NOT NULL,
  question_text  TEXT         NOT NULL,
  option_a       VARCHAR(255) NOT NULL,
  option_b       VARCHAR(255) NOT NULL,
  option_c       VARCHAR(255),
  option_d       VARCHAR(255),
  correct_option ENUM('a','b','c','d') NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- LEARNING PROGRESS  – user completion per module
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_progress (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT          NOT NULL,
  module_id       INT          NOT NULL,
  completed       TINYINT(1)   NOT NULL DEFAULT 0,
  quiz_score      INT          DEFAULT NULL,
  certificate_url VARCHAR(255) DEFAULT NULL,
  completed_at    TIMESTAMP    DEFAULT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_module (user_id, module_id),
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES learning_modules(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- WELLNESS TIPS
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wellness_tips (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  category       ENUM('addiction','productivity','screen_health','motivation') NOT NULL DEFAULT 'motivation',
  content        TEXT         NOT NULL,
  active         TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- POINT TRANSACTIONS  – audit trail
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS point_transactions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL,
  points         INT          NOT NULL,
  reason         VARCHAR(200) NOT NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- NOTIFICATIONS (reuse existing structure)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL,
  message        TEXT         NOT NULL,
  status         ENUM('unread','read') NOT NULL DEFAULT 'unread',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------
-- SEED: Wellness Tips
-- ---------------------------------------------------------------
INSERT IGNORE INTO wellness_tips (category, content) VALUES
('motivation',    'Every minute you save from mindless scrolling is a minute invested in your future.'),
('addiction',     'Try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.'),
('productivity',  'Schedule specific times to check social media instead of checking it impulsively.'),
('screen_health', 'Enable night mode on your devices to reduce eye strain in the evening.'),
('addiction',     'Turn off non-essential push notifications to reduce the urge to check your phone.'),
('productivity',  'Use the Pomodoro technique: 25 minutes of focused work followed by a 5-minute break.'),
('motivation',    'You are building digital skills today that will open doors to better opportunities tomorrow.'),
('screen_health', 'Keep your phone out of the bedroom to improve sleep quality.'),
('addiction',     'Replace one social media session per day with a learning module to earn points and grow.'),
('motivation',    'Small consistent steps lead to big achievements. Keep going!');
