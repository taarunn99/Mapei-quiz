-- HR Colleague Feedback Survey — run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS hr_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Starting staff passcode. Change it any time from Admin > HR Settings.
INSERT INTO hr_settings (key, value) VALUES ('passcode', '482913')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS hr_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('A','B')),
  period TEXT NOT NULL,                       -- e.g. 2026-H2 (Jan–Jun = H1, Jul–Dec = H2)
  department TEXT,
  assessed_name TEXT NOT NULL,
  respondent_name TEXT NOT NULL,
  respondent_email TEXT NOT NULL,
  answers SMALLINT[] NOT NULL CHECK (array_length(answers, 1) = 10 AND 1 <= ALL(answers) AND 5 >= ALL(answers)),
  total SMALLINT NOT NULL CHECK (total BETWEEN 10 AND 50),
  kpi_score SMALLINT NOT NULL CHECK (kpi_score BETWEEN 20 AND 100),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One submission per respondent, per person rated, per survey type, per half-year
CREATE UNIQUE INDEX IF NOT EXISTS hr_responses_once
  ON hr_responses (lower(respondent_email), survey_type, lower(assessed_name), period);
CREATE INDEX IF NOT EXISTS hr_responses_report
  ON hr_responses (period, survey_type, lower(assessed_name));

ALTER TABLE hr_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_responses DISABLE ROW LEVEL SECURITY;

-- Admin account email
UPDATE users SET email = 'tarun.s@lapizblue.com', status = 'approved' WHERE role = 'admin';
