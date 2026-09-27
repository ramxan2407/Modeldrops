ALTER TABLE character_controls ADD COLUMN profile TEXT;
CREATE TABLE character_permissions (
 user_id TEXT NOT NULL REFERENCES users(id),
 character_id TEXT NOT NULL,
 can_view INTEGER NOT NULL DEFAULT 1 CHECK(can_view IN (0,1)),
 can_generate INTEGER NOT NULL DEFAULT 1 CHECK(can_generate IN (0,1)),
 PRIMARY KEY(user_id,character_id)
);
