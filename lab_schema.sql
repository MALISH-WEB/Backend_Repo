-- AI-Powered Virtual Networking Lab: Database Schema
-- Run this file against your existing application database to add
-- the tables required for the networking lab feature.

-- Labs created by teachers
CREATE TABLE IF NOT EXISTS labs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(255)    NOT NULL,
  description     TEXT,
  scenario_type   ENUM('ip_config','subnetting','connectivity') NOT NULL DEFAULT 'ip_config',
  topology        JSON            NOT NULL DEFAULT (JSON_OBJECT()),
  tasks           JSON            NOT NULL DEFAULT (JSON_ARRAY()),
  created_by      INT,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_labs_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- A student's work-in-progress for a specific lab
CREATE TABLE IF NOT EXISTS lab_sessions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  lab_id          INT             NOT NULL,
  student_id      INT             NOT NULL,
  status          ENUM('in_progress','completed','abandoned') NOT NULL DEFAULT 'in_progress',
  topology_state  JSON            NOT NULL DEFAULT (JSON_OBJECT()),
  score           DECIMAL(5,2)    NOT NULL DEFAULT 0,
  attempts        INT             NOT NULL DEFAULT 0,
  started_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at    TIMESTAMP       NULL,
  CONSTRAINT fk_sessions_lab     FOREIGN KEY (lab_id)     REFERENCES labs(id)  ON DELETE CASCADE,
  CONSTRAINT fk_sessions_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Individual actions taken by a student within a session
CREATE TABLE IF NOT EXISTS lab_actions (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  session_id      INT             NOT NULL,
  action_type     VARCHAR(100)    NOT NULL,
  action_data     JSON,
  feedback        TEXT,
  is_correct      TINYINT(1)      NOT NULL DEFAULT 0,
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_actions_session  FOREIGN KEY (session_id) REFERENCES lab_sessions(id) ON DELETE CASCADE
);

-- Competency summary per student per lab (upserted on session completion)
CREATE TABLE IF NOT EXISTS competencies (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  student_id      INT             NOT NULL,
  lab_id          INT             NOT NULL,
  task_completion DECIMAL(5,2)    NOT NULL DEFAULT 0,
  accuracy        DECIMAL(5,2)    NOT NULL DEFAULT 0,
  attempts        INT             NOT NULL DEFAULT 0,
  skills          JSON,
  assessed_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_lab (student_id, lab_id),
  CONSTRAINT fk_comp_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_comp_lab     FOREIGN KEY (lab_id)     REFERENCES labs(id)  ON DELETE CASCADE
);

-- ─── Seed data: one sample IP-configuration lab ───────────────────────────────
INSERT IGNORE INTO labs (id, title, description, scenario_type, topology, tasks, created_by)
VALUES (
  1,
  'IP Configuration & Connectivity Lab',
  'Assign IP addresses to two PCs and a router, connect them with virtual cables, then verify connectivity using the ping tool.',
  'ip_config',
  JSON_OBJECT(
    'devices', JSON_ARRAY(
      JSON_OBJECT('id','pc1','type','pc','name','PC 1','x',80,'y',200,'ip',NULL,'subnet',NULL),
      JSON_OBJECT('id','pc2','type','pc','name','PC 2','x',520,'y',200,'ip',NULL,'subnet',NULL),
      JSON_OBJECT('id','router1','type','router','name','Router 1','x',300,'y',120,'ip',NULL,'subnet',NULL)
    ),
    'connections', JSON_ARRAY()
  ),
  JSON_ARRAY(
    JSON_OBJECT(
      'id','t1','description','Assign IP 192.168.1.1 / 255.255.255.0 to PC 1',
      'type','assign_ip','device','pc1',
      'expectedIp','192.168.1.1','expectedSubnet','255.255.255.0',
      'competency','ip_configuration'
    ),
    JSON_OBJECT(
      'id','t2','description','Assign IP 192.168.1.2 / 255.255.255.0 to PC 2',
      'type','assign_ip','device','pc2',
      'expectedIp','192.168.1.2','expectedSubnet','255.255.255.0',
      'competency','ip_configuration'
    ),
    JSON_OBJECT(
      'id','t3','description','Assign IP 192.168.1.254 / 255.255.255.0 to Router 1',
      'type','assign_ip','device','router1',
      'expectedIp','192.168.1.254','expectedSubnet','255.255.255.0',
      'competency','ip_configuration'
    ),
    JSON_OBJECT(
      'id','t4','description','Connect PC 1 to Router 1',
      'type','connect','from','pc1','to','router1',
      'competency','network_topology'
    ),
    JSON_OBJECT(
      'id','t5','description','Connect PC 2 to Router 1',
      'type','connect','from','pc2','to','router1',
      'competency','network_topology'
    ),
    JSON_OBJECT(
      'id','t6','description','Ping PC 2 from PC 1 to verify connectivity',
      'type','ping','from','pc1','to','pc2',
      'competency','connectivity_testing'
    )
  ),
  NULL
);
