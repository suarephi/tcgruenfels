-- Allow 30-minute booking starts (16:30 etc.). 60-minute booking duration
-- stays the same — overlap is enforced at the application layer
-- (see lib/db.ts getOverlappingBooking).
--
-- Run in Supabase SQL Editor before deploying the half-hour booking change.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS minute INT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_minute_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_minute_check CHECK (minute IN (0, 30));
  END IF;
END $$;

-- Old uniqueness was (date, hour). Replace with (date, hour, minute) so
-- 16:00 and 16:30 are distinct rows. Overlap conflict (16:00 vs 16:30) is
-- still enforced in the API.
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_date_hour_key;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_unique_slot;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_date_hour_minute_key'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_date_hour_minute_key UNIQUE (date, hour, minute);
  END IF;
END $$;
