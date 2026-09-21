CREATE TRIGGER ledger_append_only_update BEFORE UPDATE ON credit_transactions BEGIN SELECT RAISE(ABORT, 'Credit ledger is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER ledger_append_only_delete BEFORE DELETE ON credit_transactions BEGIN SELECT RAISE(ABORT, 'Credit ledger is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER ledger_balance_integrity BEFORE INSERT ON credit_transactions
WHEN NOT EXISTS(SELECT 1 FROM credit_transactions WHERE idempotency_key=NEW.idempotency_key)
AND NEW.balance_before != (SELECT COALESCE(SUM(amount),0) FROM credit_transactions WHERE user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT, 'Stale credit balance'); END;
--> statement-breakpoint
CREATE TRIGGER purchase_snapshot_immutable BEFORE UPDATE OF license_snapshot,license_version,price_cents,user_id,character_id ON character_purchases BEGIN SELECT RAISE(ABORT,'License snapshot is immutable'); END;
