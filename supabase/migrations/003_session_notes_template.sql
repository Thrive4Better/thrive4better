-- Session Notes table with full template fields
-- Adds the enhanced session note structure for NDIS support documentation

CREATE TABLE IF NOT EXISTS session_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id      uuid REFERENCES shifts(id) ON DELETE SET NULL,
  carer_id      uuid REFERENCES carers(id) ON DELETE SET NULL,
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  support_worker text NOT NULL DEFAULT '',
  start_time    time,
  finish_time   time,
  activity_completed text DEFAULT '',
  content       text DEFAULT '',
  participant_mood text NOT NULL DEFAULT 'neutral'
    CHECK (participant_mood IN ('great','good','neutral','low','distressed')),
  support_provided text DEFAULT '',
  incidents_or_concerns text DEFAULT '',
  transport_kms numeric(8,1) DEFAULT 0,
  additional_observations text DEFAULT '',
  goals_addressed text[] DEFAULT '{}',
  follow_up_required boolean DEFAULT false,
  follow_up_notes text DEFAULT '',
  invoice_id    uuid REFERENCES invoices(id) ON DELETE SET NULL,
  ai_summary    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- If the table already exists, add the new columns safely
DO $$
BEGIN
  -- date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='date') THEN
    ALTER TABLE session_notes ADD COLUMN date date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
  -- support_worker
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='support_worker') THEN
    ALTER TABLE session_notes ADD COLUMN support_worker text NOT NULL DEFAULT '';
  END IF;
  -- start_time
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='start_time') THEN
    ALTER TABLE session_notes ADD COLUMN start_time time;
  END IF;
  -- finish_time
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='finish_time') THEN
    ALTER TABLE session_notes ADD COLUMN finish_time time;
  END IF;
  -- activity_completed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='activity_completed') THEN
    ALTER TABLE session_notes ADD COLUMN activity_completed text DEFAULT '';
  END IF;
  -- support_provided
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='support_provided') THEN
    ALTER TABLE session_notes ADD COLUMN support_provided text DEFAULT '';
  END IF;
  -- incidents_or_concerns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='incidents_or_concerns') THEN
    ALTER TABLE session_notes ADD COLUMN incidents_or_concerns text DEFAULT '';
  END IF;
  -- transport_kms
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='transport_kms') THEN
    ALTER TABLE session_notes ADD COLUMN transport_kms numeric(8,1) DEFAULT 0;
  END IF;
  -- additional_observations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='additional_observations') THEN
    ALTER TABLE session_notes ADD COLUMN additional_observations text DEFAULT '';
  END IF;
  -- invoice_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='invoice_id') THEN
    ALTER TABLE session_notes ADD COLUMN invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;
  END IF;
  -- ai_summary
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session_notes' AND column_name='ai_summary') THEN
    ALTER TABLE session_notes ADD COLUMN ai_summary text;
  END IF;
END $$;

-- Index for fast lookups by client
CREATE INDEX IF NOT EXISTS idx_session_notes_client_id ON session_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_date ON session_notes(client_id, date DESC);

-- Enable RLS
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (adjust per your RLS needs)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_notes' AND policyname = 'session_notes_all') THEN
    CREATE POLICY session_notes_all ON session_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
