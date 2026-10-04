SET search_path TO model_drops,public;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS wallet TEXT NOT NULL DEFAULT 'standard' CHECK(wallet IN ('standard','demo'));
ALTER TABLE generations ADD COLUMN IF NOT EXISTS credit_wallet TEXT NOT NULL DEFAULT 'standard' CHECK(credit_wallet IN ('standard','demo'));
ALTER TABLE character_orders ADD COLUMN IF NOT EXISTS credits_spent BIGINT NOT NULL DEFAULT 0 CHECK(credits_spent>=0);
CREATE INDEX IF NOT EXISTS ledger_wallet_user ON credit_transactions(wallet,user_id);
CREATE OR REPLACE FUNCTION ledger_balance_check() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM users WHERE id=NEW.user_id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM credit_transactions WHERE idempotency_key=NEW.idempotency_key)
  AND NEW.balance_before != (SELECT COALESCE(SUM(amount),0) FROM credit_transactions WHERE user_id=NEW.user_id AND wallet=NEW.wallet)
  THEN RAISE EXCEPTION 'Stale credit balance'; END IF;
  RETURN NEW;
END $$;
