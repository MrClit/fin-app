-- Issue #15: Helper functions for Enable Banking transaction sync

-- ============================================================
-- FUNCTION: refresh_monthly_summary()
-- Refreshes the materialized view used for analytics aggregation.
-- CONCURRENTLY requires the unique index idx_monthly_unique (created in initial schema).
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_monthly_summary()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY transactions_monthly_summary;
END;
$$;

-- ============================================================
-- FUNCTION: mark_internal_transfers(p_user_id UUID)
-- Marks same-day opposite-amount enablebanking transaction pairs as internal
-- transfers so they are excluded from analytics aggregation.
-- Idempotent: skips already-marked rows.
-- ============================================================
CREATE OR REPLACE FUNCTION mark_internal_transfers(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE transactions t
  SET    is_internal_transfer = true
  WHERE  t.user_id            = p_user_id
    AND  t.source             = 'enablebanking'
    AND  t.is_internal_transfer = false
    AND  EXISTS (
      SELECT 1
      FROM   transactions t2
      WHERE  t2.user_id              = p_user_id
        AND  t2.source               = 'enablebanking'
        AND  t2.is_internal_transfer = false
        AND  t2.date                 = t.date
        AND  t2.amount               = -t.amount
        AND  t2.id                  <> t.id
    );
END;
$$;
