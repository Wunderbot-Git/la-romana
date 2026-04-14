-- Fix timing_factor and risk_factor constraints to match ×2 scale used in code
-- timing_factor: 4 (pre-match), 3 (early), 2 (late)  → range 1-4
-- risk_factor: 2 (even), 4 (1-up underdog), 6 (2-up underdog) → range 1-6

ALTER TABLE bets DROP CONSTRAINT IF EXISTS chk_bets_timing_factor;
ALTER TABLE bets ADD CONSTRAINT chk_bets_timing_factor CHECK (timing_factor BETWEEN 1 AND 4);

ALTER TABLE bets DROP CONSTRAINT IF EXISTS chk_bets_risk_factor;
ALTER TABLE bets ADD CONSTRAINT chk_bets_risk_factor CHECK (risk_factor BETWEEN 1 AND 6);
