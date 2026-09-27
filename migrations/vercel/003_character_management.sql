SET search_path TO model_drops,public;
ALTER TABLE character_controls ADD COLUMN IF NOT EXISTS profile TEXT;
CREATE TABLE IF NOT EXISTS character_permissions (
 user_id TEXT NOT NULL REFERENCES users(id),
 character_id TEXT NOT NULL,
 can_view BIGINT NOT NULL DEFAULT 1 CHECK(can_view IN (0,1)),
 can_generate BIGINT NOT NULL DEFAULT 1 CHECK(can_generate IN (0,1)),
 PRIMARY KEY(user_id,character_id)
);
