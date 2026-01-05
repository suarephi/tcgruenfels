-- Tournament Tables for TC Grünfels
-- Run this in Supabase SQL Editor

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('singles', 'doubles')),
  format TEXT NOT NULL CHECK (format IN ('round_robin', 'single_elimination', 'group_knockout')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration', 'in_progress', 'completed')),
  settings JSONB DEFAULT '{"groups_count": 2, "advance_per_group": 2, "sets_to_win": 2}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament participants (players or teams)
CREATE TABLE IF NOT EXISTS tournament_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  group_number INT,
  seed INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- Tournament matches
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INT NOT NULL,
  match_number INT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'knockout' CHECK (stage IN ('group', 'knockout')),
  group_number INT,
  participant1_id UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
  participant2_id UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
  score TEXT,
  winner_id UUID REFERENCES tournament_participants(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  scheduled_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_participants ON tournament_matches(participant1_id, participant2_id);

-- Row Level Security Policies

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Tournaments: Anyone can read, only admins can write
CREATE POLICY "Anyone can view tournaments" ON tournaments
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tournaments" ON tournaments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update tournaments" ON tournaments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete tournaments" ON tournaments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Tournament participants: Anyone can read, only admins can write
CREATE POLICY "Anyone can view tournament participants" ON tournament_participants
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tournament participants" ON tournament_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update tournament participants" ON tournament_participants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can delete tournament participants" ON tournament_participants
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Tournament matches: Anyone can read, participants can update their own matches, admins can do everything
CREATE POLICY "Anyone can view tournament matches" ON tournament_matches
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert tournament matches" ON tournament_matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Participants and admins can update matches" ON tournament_matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    OR EXISTS (
      SELECT 1 FROM tournament_participants tp
      WHERE (tp.id = tournament_matches.participant1_id OR tp.id = tournament_matches.participant2_id)
      AND (tp.user_id = auth.uid() OR tp.partner_id = auth.uid())
    )
  );

CREATE POLICY "Admins can delete tournament matches" ON tournament_matches
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
