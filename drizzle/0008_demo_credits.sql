ALTER TABLE credit_transactions ADD COLUMN wallet TEXT NOT NULL DEFAULT 'standard' CHECK(wallet IN ('standard','demo'));
ALTER TABLE generations ADD COLUMN credit_wallet TEXT NOT NULL DEFAULT 'standard' CHECK(credit_wallet IN ('standard','demo'));
ALTER TABLE character_orders ADD COLUMN credits_spent INTEGER NOT NULL DEFAULT 0 CHECK(credits_spent>=0);
CREATE INDEX ledger_wallet_user ON credit_transactions(wallet,user_id);
DROP TRIGGER ledger_balance_integrity;
CREATE TRIGGER ledger_balance_integrity BEFORE INSERT ON credit_transactions
WHEN NOT EXISTS(SELECT 1 FROM credit_transactions WHERE idempotency_key=NEW.idempotency_key)
AND NEW.balance_before != (SELECT COALESCE(SUM(amount),0) FROM credit_transactions WHERE user_id=NEW.user_id AND wallet=NEW.wallet)
BEGIN SELECT RAISE(ABORT, 'Stale credit balance'); END;
