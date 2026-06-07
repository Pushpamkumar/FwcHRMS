-- Enable uuid-ossp extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20) NOT NULL,
  date            DATE NOT NULL,
  check_in        TIMESTAMPTZ,
  check_out       TIMESTAMPTZ,
  check_in_ip     VARCHAR(45),
  check_in_location JSONB,
  check_out_ip    VARCHAR(45),
  check_out_location JSONB,
  total_hours     DECIMAL(5,2),
  overtime_hours  DECIMAL(5,2) DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'present',
  regularized     BOOLEAN DEFAULT FALSE,
  regularized_by  VARCHAR(20),
  regularized_at  TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);


-- 2. Leave Balances Table
CREATE TABLE IF NOT EXISTS leave_balances (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20) NOT NULL,
  year            INTEGER NOT NULL,
  leave_type      VARCHAR(30) NOT NULL,
  total_days      DECIMAL(5,2) NOT NULL,
  used_days       DECIMAL(5,2) DEFAULT 0,
  pending_days    DECIMAL(5,2) DEFAULT 0,
  remaining_days  DECIMAL(5,2) GENERATED ALWAYS AS (total_days - used_days) STORED,
  carried_forward DECIMAL(5,2) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, year, leave_type)
);


-- 3. Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       VARCHAR(20) NOT NULL,
  leave_type        VARCHAR(30) NOT NULL,
  from_date         DATE NOT NULL,
  to_date           DATE NOT NULL,
  days              DECIMAL(5,2) NOT NULL,
  reason            TEXT NOT NULL,
  status            VARCHAR(20) DEFAULT 'pending',
  applied_at        TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by       VARCHAR(20),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notified          BOOLEAN DEFAULT FALSE
);


-- 4. Payroll Structures Table
CREATE TABLE IF NOT EXISTS payroll_structures (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       VARCHAR(20) NOT NULL,
  effective_from    DATE NOT NULL,
  ctc_annual        DECIMAL(12,2) NOT NULL,
  basic             DECIMAL(10,2) NOT NULL,
  hra               DECIMAL(10,2) NOT NULL,
  da                DECIMAL(10,2) DEFAULT 0,
  special_allowance DECIMAL(10,2) DEFAULT 0,
  pf_employee       DECIMAL(10,2) NOT NULL,
  pf_employer       DECIMAL(10,2) NOT NULL,
  esi_employee      DECIMAL(10,2) DEFAULT 0,
  esi_employer      DECIMAL(10,2) DEFAULT 0,
  professional_tax  DECIMAL(10,2) DEFAULT 200,
  tds               DECIMAL(10,2) DEFAULT 0,
  other_deductions  DECIMAL(10,2) DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_by        VARCHAR(20) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);


-- 5. Payroll Runs Table
CREATE TABLE IF NOT EXISTS payroll_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       VARCHAR(20) NOT NULL,
  month             INTEGER NOT NULL,
  year              INTEGER NOT NULL,
  working_days      INTEGER NOT NULL,
  present_days      DECIMAL(5,2) NOT NULL,
  leaves_taken      DECIMAL(5,2) DEFAULT 0,
  lop_days          DECIMAL(5,2) DEFAULT 0,
  overtime_hours    DECIMAL(5,2) DEFAULT 0,
  gross_salary      DECIMAL(12,2) NOT NULL,
  total_deductions  DECIMAL(12,2) NOT NULL,
  net_salary        DECIMAL(12,2) NOT NULL,
  payslip_url       TEXT,
  status            VARCHAR(20) DEFAULT 'draft',
  processed_at      TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  payment_ref       VARCHAR(100),
  UNIQUE(employee_id, month, year)
);


-- 6. Performance Reviews Table
CREATE TABLE IF NOT EXISTS performance_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       VARCHAR(20) NOT NULL,
  reviewer_id       VARCHAR(20) NOT NULL,
  review_period     VARCHAR(20) NOT NULL,
  review_type       VARCHAR(20) NOT NULL,
  status            VARCHAR(20) DEFAULT 'draft',
  goals_score       DECIMAL(4,2),
  skills_score      DECIMAL(4,2),
  behavior_score    DECIMAL(4,2),
  overall_score     DECIMAL(4,2),
  rating            VARCHAR(20),
  manager_comments  TEXT,
  employee_comments TEXT,
  ai_sentiment      VARCHAR(20),
  ai_summary        TEXT,
  promotion_recommended BOOLEAN DEFAULT FALSE,
  increment_recommended DECIMAL(5,2) DEFAULT 0,
  submitted_at      TIMESTAMPTZ,
  acknowledged_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);


-- 7. Goals Table
CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20) NOT NULL,
  review_period   VARCHAR(20) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  target          TEXT NOT NULL,
  progress        DECIMAL(5,2) DEFAULT 0,
  status          VARCHAR(20) DEFAULT 'in_progress',
  weight          INTEGER DEFAULT 20,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- 8. Recruitment Pipeline Table
CREATE TABLE IF NOT EXISTS recruitment_pipeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id       VARCHAR(50) NOT NULL,
  job_posting_id  VARCHAR(50) NOT NULL,
  candidate_email VARCHAR(200) NOT NULL,
  current_stage   VARCHAR(30) NOT NULL DEFAULT 'screening',
  stage_history   JSONB DEFAULT '[]',
  interview_rounds JSONB DEFAULT '[]',
  offer_details   JSONB,
  rejection_reason VARCHAR(200),
  assigned_recruiter VARCHAR(20) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 9. System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            VARCHAR(30) NOT NULL, -- 'compliance', 'payroll', 'onboarding', 'recruitment'
  title           VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'rejected'
  action_label    VARCHAR(50),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20) NOT NULL,
  employee_name   VARCHAR(200) NOT NULL,
  week_start_date DATE NOT NULL,
  hours_logged    DECIMAL(5,2) NOT NULL,
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, week_start_date)
);

-- 11. Escalations Table
CREATE TABLE IF NOT EXISTS escalations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20) NOT NULL,
  employee_name   VARCHAR(200) NOT NULL,
  issue           TEXT NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Hiring Requests Table
CREATE TABLE IF NOT EXISTS hiring_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id      VARCHAR(20) NOT NULL,
  manager_name    VARCHAR(200) NOT NULL,
  department_id   VARCHAR(50) NOT NULL DEFAULT 'ENG',
  job_title       VARCHAR(200) NOT NULL,
  headcount       INTEGER NOT NULL DEFAULT 1,
  description     TEXT,
  status          VARCHAR(20) DEFAULT 'pending',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Recognitions Table
CREATE TABLE IF NOT EXISTS recognitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20) NOT NULL,
  employee_name   VARCHAR(200) NOT NULL,
  manager_id      VARCHAR(20) NOT NULL,
  reason          TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    VARCHAR(50) NOT NULL,
  candidate_name  VARCHAR(200) NOT NULL,
  date            DATE NOT NULL,
  time            VARCHAR(20) NOT NULL,
  round           VARCHAR(50) NOT NULL,
  interviewer     VARCHAR(200) NOT NULL,
  status          VARCHAR(20) DEFAULT 'scheduled',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     VARCHAR(20) NOT NULL,
  assigned_by     VARCHAR(20) NOT NULL,
  text            VARCHAR(500) NOT NULL,
  completed       BOOLEAN DEFAULT FALSE,
  status          VARCHAR(20) DEFAULT 'review', -- 'done', 'review', 'overdue'
  due_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);



