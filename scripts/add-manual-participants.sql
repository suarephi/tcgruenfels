-- Allow tournament participants without a profile (manual / free-text entries).
-- Run in Supabase SQL Editor before deploying the manual-participant feature.

ALTER TABLE tournament_participants
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE tournament_participants
  ADD COLUMN IF NOT EXISTS manual_name TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournament_participants_user_or_manual_name_required'
  ) THEN
    ALTER TABLE tournament_participants
      ADD CONSTRAINT tournament_participants_user_or_manual_name_required
      CHECK (user_id IS NOT NULL OR manual_name IS NOT NULL);
  END IF;
END $$;

-- Replace the (tournament_id, user_id) UNIQUE constraint with a partial index
-- so multiple manual rows (user_id IS NULL) can coexist in the same tournament.
ALTER TABLE tournament_participants
  DROP CONSTRAINT IF EXISTS tournament_participants_tournament_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS tournament_participants_tournament_user_unique
  ON tournament_participants (tournament_id, user_id)
  WHERE user_id IS NOT NULL;
