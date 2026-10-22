BEGIN;

SET search_path TO tashuo, public;

-- Shared baseline articles contain no player input, per-instance replies, or private account memory.
CREATE TABLE IF NOT EXISTS publications (
  case_id text NOT NULL,
  case_version text NOT NULL,
  content_id text NOT NULL,
  prompt_version text NOT NULL,
  publication jsonb NOT NULL CHECK (jsonb_typeof(publication) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id, case_version, content_id, prompt_version),
  CHECK (publication ->> 'caseVersion' = case_version),
  CHECK (publication ->> 'contentId' = content_id),
  CHECK (publication ->> 'promptVersion' = prompt_version)
);

COMMIT;
