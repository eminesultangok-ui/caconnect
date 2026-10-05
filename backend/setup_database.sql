-- ============================================
-- CAConnect — Full Database Setup
-- Re-runnable: uses IF NOT EXISTS, OR REPLACE,
-- DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING.
-- ============================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    branch TEXT,
    markets_covered TEXT[] DEFAULT '{}',
    notification_pref TEXT DEFAULT 'both',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CORPORATE_ACTIONS TABLE
CREATE TABLE IF NOT EXISTS corporate_actions (
    id TEXT PRIMARY KEY,
    issuer TEXT NOT NULL,
    isin TEXT NOT NULL,
    market TEXT NOT NULL,
    event_type TEXT NOT NULL,
    ratio TEXT NOT NULL,
    ex_date DATE NOT NULL,
    record_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Custodian-confirmed', 'Preliminary', 'Pending')),
    source TEXT NOT NULL,
    plain_english TEXT NOT NULL,
    reviewed_by_branches TEXT[] DEFAULT '{}'
);

-- 3. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES corporate_actions(id),
    affected_accounts INTEGER NOT NULL DEFAULT 0,
    election_decision TEXT,
    notes TEXT CHECK (char_length(notes) <= 200),
    contacted_operations BOOLEAN NOT NULL DEFAULT false,
    operations_reason TEXT,
    status_at_review TEXT NOT NULL,
    reference TEXT NOT NULL CHECK (reference ~ '^CA-\d{4}-\d{4}$'),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- SCHEMA MIGRATION — Add columns needed by frontend types
-- Re-runnable: IF NOT EXISTS prevents errors on re-run.
-- Placed after all CREATE TABLE blocks so the file works
-- on a fresh database (tables are created first).
-- ============================================

-- corporate_actions: security, ticker, avatar_color
ALTER TABLE corporate_actions ADD COLUMN IF NOT EXISTS security TEXT;
ALTER TABLE corporate_actions ADD COLUMN IF NOT EXISTS ticker TEXT;
ALTER TABLE corporate_actions ADD COLUMN IF NOT EXISTS avatar_color TEXT;

-- reviews: advisor_name, branch, security, event_type, event_source
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS advisor_name TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS security TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS event_source TEXT;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES — PROFILES
-- Users can SELECT, INSERT, UPDATE only their own row
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- POLICIES — CORPORATE_ACTIONS
-- Authenticated users can SELECT; nobody can write via API
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can read corporate actions" ON corporate_actions;
CREATE POLICY "Authenticated users can read corporate actions"
    ON corporate_actions FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- POLICIES — REVIEWS
-- Users can SELECT, INSERT, DELETE only their own rows
-- ============================================

DROP POLICY IF EXISTS "Users can view own reviews" ON reviews;
CREATE POLICY "Users can view own reviews"
    ON reviews FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reviews" ON reviews;
CREATE POLICY "Users can insert own reviews"
    ON reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
CREATE POLICY "Users can delete own reviews"
    ON reviews FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER — Auto-create empty profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id) VALUES (NEW.id);
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SEED DATA — 8 Corporate Actions
-- Exact match with frontend/src/data/corporateActions.ts
-- ============================================

INSERT INTO corporate_actions
  (id, security, ticker, avatar_color, issuer, isin, market, event_type,
   ratio, ex_date, record_date, payment_date, status, source,
   plain_english, reviewed_by_branches)
VALUES
('CA-001', 'Apple Inc.', 'AAPL', '#1F2225', 'Apple Inc.', 'US0378331005', 'United States', 'Cash Dividend', 'USD 0.25 per share', '2026-09-10', '2026-09-11', '2026-09-15', 'Custodian-confirmed', 'Clearstream', 'Apple is paying a cash dividend of USD 0.25 per share. Shareholders on record as of 11 September will receive the payment on 15 September. If your clients hold Apple shares, the cash will be credited to their accounts automatically.', ARRAY['Melbourne']),
('CA-002', 'Nvidia Inc.', 'NVDA', '#16A34A', 'Nvidia Corporation', 'US67066G1040', 'United States', 'Stock Split', '10:1', '2026-09-22', '2026-09-23', '2026-09-30', 'Custodian-confirmed', 'Clearstream', 'Nvidia has announced a 10-for-1 stock split. Each share will become 10 shares, and the share price will adjust proportionally. The total value of holdings will not change.', ARRAY['Sydney']),
('CA-003', 'Tesla Inc.', 'TSLA', '#DC2626', 'Tesla, Inc.', 'US88160R1014', 'United States', 'Rights Issue', '1 new share for every 20 held at USD 150', '2026-09-18', '2026-09-19', '2026-10-10', 'Preliminary', 'Euroclear', 'Tesla is offering existing shareholders the right to buy 1 new share for every 20 they currently hold, at a subscription price of USD 150 per new share. Taking up all rights keeps the ownership percentage; taking up only part can still dilute it. These figures are preliminary and may change once confirmed by the custodian.', ARRAY[]::text[]),
('CA-004', 'SAP SE', 'SAP', '#2563EB', 'SAP SE', 'DE0007164600', 'Germany', 'Cash Dividend', 'EUR 2.20 per share', '2026-09-12', '2026-09-13', '2026-09-17', 'Custodian-confirmed', 'Clearstream', 'SAP is paying a cash dividend of EUR 2.20 per share. Shareholders on record as of 13 September will receive the payment on 17 September. The cash will be credited to their accounts automatically.', ARRAY['Melbourne', 'Singapore']),
('CA-005', 'Toyota Motor Corp.', 'TM', '#B45309', 'Toyota Motor Corporation', 'JP3633400001', 'Japan', 'Cash Dividend', 'JPY 75 per share', '2026-09-08', '2026-09-09', '2026-09-25', 'Custodian-confirmed', 'Saxo Bank', 'Toyota is paying a cash dividend of JPY 75 per share. Shareholders on record as of 9 September will receive the payment on 25 September. The cash will be credited to their accounts automatically.', ARRAY['Sydney']),
('CA-006', 'HSBC Holdings plc', 'HSBA', '#737373', 'HSBC Holdings plc', 'GB0005405286', 'Hong Kong', 'Merger', '0.5 HSBC shares per target share', '2026-10-05', '2026-10-06', '2026-10-20', 'Preliminary', 'Euroclear', 'HSBC Holdings has announced a merger. Under the merger terms, shares may be converted into HSBC shares, cash, or a combination of both at the exchange ratio of 0.5 HSBC shares per target share. These figures are preliminary and may change once confirmed by the custodian.', ARRAY[]::text[]),
('CA-007', 'Rio Tinto Group', 'RIO', '#7C3AED', 'Rio Tinto plc', 'GB0007188757', 'Australia', 'Cash Dividend', 'AUD 4.15 per share (special: AUD 0.60)', '2026-09-08', '2026-09-09', '2026-09-25', 'Custodian-confirmed', 'Clearstream', 'Rio Tinto is paying a cash dividend of AUD 4.15 per share, which includes a special dividend of AUD 0.60. Shareholders on record as of 9 September will receive the payment on 25 September. The cash will be credited to their accounts automatically.', ARRAY['Melbourne', 'Sydney', 'Singapore']),
('CA-008', 'LVMH Moët Hennessy', 'MC', '#D97706', 'LVMH SE', 'FR0000121014', 'France', 'Warrant Expiry', '1 warrant for every 20 shares held', '2026-10-15', '2026-10-16', '2026-10-25', 'Pending', 'Euroclear', 'LVMH warrants attached to shares are due to expire on 25 October 2026. Each warrant gives the holder the right to subscribe to 1 new share at a pre-set price. Holders may exercise or sell the warrants before the expiry date; otherwise, the warrants usually expire worthless.', ARRAY[]::text[])
ON CONFLICT (id) DO UPDATE SET
    security             = EXCLUDED.security,
    ticker               = EXCLUDED.ticker,
    avatar_color         = EXCLUDED.avatar_color,
    issuer               = EXCLUDED.issuer,
    isin                 = EXCLUDED.isin,
    market               = EXCLUDED.market,
    event_type           = EXCLUDED.event_type,
    ratio                = EXCLUDED.ratio,
    ex_date              = EXCLUDED.ex_date,
    record_date          = EXCLUDED.record_date,
    payment_date         = EXCLUDED.payment_date,
    status               = EXCLUDED.status,
    source               = EXCLUDED.source,
    plain_english        = EXCLUDED.plain_english;

-- ============================================
-- FUNCTION — Record branch review for cross-branch indicator
-- SECURITY DEFINER so it can write to corporate_actions
-- despite no write policy for authenticated users.
-- ============================================

CREATE OR REPLACE FUNCTION public.record_branch_review(p_event_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch text;
BEGIN
  SELECT branch INTO v_branch FROM profiles WHERE id = auth.uid();
  IF v_branch IS NULL OR v_branch = '' THEN
    RETURN;
  END IF;
  UPDATE corporate_actions
    SET reviewed_by_branches = array_append(
      COALESCE(reviewed_by_branches, '{}'), v_branch
    )
    WHERE id = p_event_id
      AND NOT (v_branch = ANY(COALESCE(reviewed_by_branches, '{}')));
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_branch_review(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_branch_review(text) FROM PUBLIC, anon;