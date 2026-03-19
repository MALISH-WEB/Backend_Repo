-- UCU Innovators Database Schema
-- Run this script to create and initialise the database.
-- Default DB name: ucu_innovators  (override with DB_NAME in .env)

CREATE DATABASE IF NOT EXISTS ucu_innovators
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ucu_innovators;

-- ─────────────────────────────────────────────
-- Reference tables
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faculties (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS categories (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- ─────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150)  NOT NULL UNIQUE,
  password   VARCHAR(255)  NOT NULL,
  faculty_id INT UNSIGNED  NULL,
  role       ENUM('student','admin') NOT NULL DEFAULT 'student',
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_faculty FOREIGN KEY (faculty_id) REFERENCES faculties (id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Projects
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED  NOT NULL,
  title       VARCHAR(200)  NOT NULL,
  description TEXT          NULL,
  -- category and faculty are stored as free-text strings because the API
  -- routes use them directly in queries (search/filter/insert).
  -- faculty_id is a nullable FK used only by the approvals query JOIN.
  category    VARCHAR(100)  NULL,
  faculty     VARCHAR(100)  NULL,
  faculty_id  INT UNSIGNED  NULL,
  github_url  VARCHAR(300)  NULL,
  live_url    VARCHAR(300)  NULL,
  file_path   VARCHAR(300)  NULL,
  status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_user    FOREIGN KEY (user_id)    REFERENCES users     (id) ON DELETE CASCADE,
  CONSTRAINT fk_projects_faculty FOREIGN KEY (faculty_id) REFERENCES faculties (id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Comments
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comments (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  user_id    INT UNSIGNED NOT NULL,
  comment    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user    FOREIGN KEY (user_id)    REFERENCES users    (id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Approvals
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approvals (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id INT UNSIGNED NOT NULL,
  admin_id   INT UNSIGNED NOT NULL,
  decision   ENUM('approved','rejected') NOT NULL,
  message    TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_approvals_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_approvals_admin   FOREIGN KEY (admin_id)   REFERENCES users    (id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  message    TEXT         NOT NULL,
  status     ENUM('unread','read') NOT NULL DEFAULT 'unread',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- Seed data – faculties
-- ─────────────────────────────────────────────

INSERT IGNORE INTO faculties (name) VALUES
  ('Faculty of Engineering'),
  ('Faculty of Business'),
  ('Faculty of Science'),
  ('Faculty of Arts & Social Sciences'),
  ('Faculty of Education'),
  ('Faculty of Health Sciences'),
  ('Faculty of Law');

-- ─────────────────────────────────────────────
-- Seed data – categories
-- ─────────────────────────────────────────────

INSERT IGNORE INTO categories (name) VALUES
  ('Web Development'),
  ('Mobile App'),
  ('AI / Machine Learning'),
  ('Data Science'),
  ('IoT'),
  ('Game Development'),
  ('Cybersecurity'),
  ('Other');

-- ─────────────────────────────────────────────
-- Seed data – admin account
-- No default admin is seeded here to avoid shipping a known password.
-- After running this schema, create your admin account:
--
--   1. Register via POST /api/auth/register with any strong password.
--   2. Promote to admin with:
--        UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
-- ─────────────────────────────────────────────
