-- Correct shared-trigger field access without modifying applied migration 002.
CREATE OR REPLACE FUNCTION app.commerce_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='quotes' AND (to_jsonb(NEW)-'state') IS DISTINCT FROM (to_jsonb(OLD)-'state') THEN RAISE EXCEPTION 'Immutable quote' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='orders' AND (to_jsonb(NEW)-ARRAY['state','exception_paused','version','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','exception_paused','version','updated_at']) THEN RAISE EXCEPTION 'Immutable order snapshot' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='approvals' AND (to_jsonb(NEW)-ARRAY['state','version','decided_by','decided_at','decision_note']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version','decided_by','decided_at','decision_note']) THEN RAISE EXCEPTION 'Immutable approval proposal' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='capacity_buckets' AND (to_jsonb(NEW)->'max_units') IS DISTINCT FROM (to_jsonb(OLD)->'max_units') AND app.scope_role()<>'owner' THEN RAISE EXCEPTION 'Owner capacity configuration required' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
