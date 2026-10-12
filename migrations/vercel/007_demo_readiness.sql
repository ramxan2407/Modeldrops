SET search_path TO model_drops,public;
CREATE TABLE demo_testers (
 email TEXT PRIMARY KEY NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
 approved_by TEXT NOT NULL,
 reason TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
-- Preserve explicitly funded testers and existing demo buyers during rollout.
-- Automatic welcome grants alone must not invite previously unapproved accounts.
INSERT INTO demo_testers(email,enabled,approved_by,reason,updated_at)
 SELECT lower(trim(u.email)),1,'migration:demo-readiness','Preserved existing operator-funded demo or purchased access',to_char(statement_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
 FROM users u WHERE u.suspended=0 AND trim(u.email)<>'' AND (
   EXISTS(SELECT 1 FROM credit_transactions t WHERE t.user_id=u.id AND t.wallet='demo' AND t.amount>0 AND t.type IN ('promotion','admin_adjustment'))
   OR EXISTS(SELECT 1 FROM character_orders o WHERE o.user_id=u.id AND o.currency='demo_credits' AND o.status='test_completed')
 ) GROUP BY lower(trim(u.email));
CREATE TABLE character_versions (
 id TEXT PRIMARY KEY NOT NULL,
 character_id TEXT NOT NULL,
 profile TEXT NOT NULL,
 approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0,1)),
 reviewed_models TEXT NOT NULL DEFAULT '[]',
 reviewed_by TEXT,
 created_at TEXT NOT NULL
);
ALTER TABLE character_entitlements ADD COLUMN version_id TEXT REFERENCES character_versions(id);
ALTER TABLE character_orders ADD COLUMN version_id TEXT REFERENCES character_versions(id);
ALTER TABLE generations ADD COLUMN character_version_id TEXT REFERENCES character_versions(id);
ALTER TABLE generations ADD COLUMN purpose TEXT NOT NULL DEFAULT 'customer' CHECK(purpose IN ('customer','character_qa'));
CREATE TABLE character_quality_reviews (
 version_id TEXT NOT NULL REFERENCES character_versions(id),
 model_id TEXT NOT NULL,
 generation_id TEXT NOT NULL REFERENCES generations(id),
 reviewed_by TEXT NOT NULL,
 notes TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(version_id,model_id)
);
CREATE TABLE storage_cleanup (
 storage_key TEXT PRIMARY KEY NOT NULL,
 upload_id TEXT,
 attempts INTEGER NOT NULL DEFAULT 0,
 lease_until TEXT NOT NULL DEFAULT '',
 last_error TEXT,
 created_at TEXT NOT NULL
);
-- Historical orders did not record portraits. Preserve the currently associated
-- approved identity, without inventing QA evidence or enabling new sales.
INSERT INTO character_versions(id,character_id,profile,approved,created_at)
 SELECT id || '@asset:' || (profile::jsonb->>'referenceAssetId'),id,profile,1,to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
 FROM character_controls WHERE (profile::jsonb->>'referenceAssetId') IS NOT NULL
 AND COALESCE((profile::jsonb->>'approvalStatus'),'approved')='approved';
UPDATE character_entitlements SET version_id=(SELECT id FROM character_versions WHERE character_id=character_entitlements.character_id);
UPDATE character_orders SET version_id=(SELECT id FROM character_versions WHERE character_id=character_orders.character_id);

-- Queued jobs already recorded the exact portrait used when priced. Preserve
-- that asset, including when the current character has since changed portraits.
INSERT INTO character_versions(id,character_id,profile,approved,created_at)
 SELECT DISTINCT g.character_id || '@' || p.character_reference,g.character_id,jsonb_set(jsonb_set(c.profile::jsonb,'{referenceAssetId}',to_jsonb(a.id)),'{approvalStatus}','"approved"')::text,1,to_char(statement_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
 FROM generations g JOIN provider_requests p ON p.generation_id=g.id
 JOIN character_controls c ON c.id=g.character_id
 JOIN generation_assets a ON p.character_reference='asset:' || a.id AND a.generation_id IS NULL
 WHERE p.character_reference IS NOT NULL
 ON CONFLICT(id) DO NOTHING;
UPDATE generations SET character_version_id=(
 SELECT v.id FROM provider_requests p JOIN character_versions v
 ON v.id=generations.character_id || '@' || p.character_reference
 WHERE p.generation_id=generations.id
) WHERE character_version_id IS NULL;


REVOKE ALL ON ALL TABLES IN SCHEMA model_drops FROM PUBLIC;

CREATE OR REPLACE FUNCTION immutable_character_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Character identity is immutable'; END $$;
CREATE TRIGGER character_version_identity_immutable BEFORE UPDATE OF id,character_id,profile ON character_versions FOR EACH ROW EXECUTE FUNCTION immutable_character_identity();
CREATE TRIGGER character_order_identity_immutable BEFORE UPDATE OF version_id,user_id,character_id,license_snapshot,amount_cents,credits_spent ON character_orders FOR EACH ROW EXECUTE FUNCTION immutable_character_identity();
CREATE INDEX cleanup_due ON storage_cleanup(lease_until,created_at);
CREATE INDEX character_version_lookup ON character_versions(character_id,approved);
CREATE INDEX upload_transfers_expiry ON upload_transfers(expires_at,id);
