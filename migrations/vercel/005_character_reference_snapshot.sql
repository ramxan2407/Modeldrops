SET search_path TO model_drops,public;
ALTER TABLE provider_requests ADD COLUMN IF NOT EXISTS character_reference TEXT;
