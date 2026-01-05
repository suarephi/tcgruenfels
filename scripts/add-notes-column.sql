-- Add notes column to bookings table for tournament match info
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes TEXT;
