-- Phase 3: scoped commercial writes. The application API remains the authority boundary.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['quotes','confirmation_challenges','orders','order_items','reservations','reservation_items','conversations'] LOOP
    EXECUTE format('GRANT INSERT ON app.%I TO cb_runtime',t);
    EXECUTE format('CREATE POLICY commerce_insert ON app.%I FOR INSERT TO cb_runtime WITH CHECK(app.own_customer(business_id,customer_id))',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['quotes','confirmation_challenges','orders','reservations','conversations'] LOOP
    EXECUTE format('GRANT UPDATE ON app.%I TO cb_runtime',t);
    EXECUTE format('CREATE POLICY commerce_update ON app.%I FOR UPDATE TO cb_runtime USING(app.can_customer(business_id,customer_id)) WITH CHECK(app.can_customer(business_id,customer_id))',t);
  END LOOP;
END $$;
DROP POLICY commerce_insert ON app.quotes;
CREATE POLICY commerce_insert ON app.quotes FOR INSERT TO cb_runtime WITH CHECK(app.can_customer(business_id,customer_id));
GRANT INSERT ON app.messages TO cb_runtime;
CREATE POLICY messages_insert ON app.messages FOR INSERT TO cb_runtime WITH CHECK(app.can_customer(business_id,customer_id) AND
 ((app.scope_role()='customer' AND role='customer') OR (app.scope_role()='owner' AND role='owner')));
GRANT INSERT,UPDATE ON app.approvals TO cb_runtime;
CREATE POLICY approval_insert ON app.approvals FOR INSERT TO cb_runtime WITH CHECK(app.can_customer(business_id,customer_id) AND state='pending');
CREATE POLICY approval_update ON app.approvals FOR UPDATE TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()='owner') WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
GRANT INSERT ON app.payments TO cb_runtime;
CREATE POLICY payment_insert ON app.payments FOR INSERT TO cb_runtime WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner' AND verified_by=current_setting('app.actor_subject',true));
GRANT UPDATE(held_units,committed_units,max_units,version) ON app.capacity_buckets TO cb_runtime;
CREATE POLICY capacity_update ON app.capacity_buckets FOR UPDATE TO cb_runtime USING(app.can_business(business_id)) WITH CHECK(app.can_business(business_id));
GRANT INSERT ON app.outbox_events TO cb_runtime;
CREATE POLICY outbox_insert ON app.outbox_events FOR INSERT TO cb_runtime WITH CHECK(app.can_customer(business_id,customer_id));
GRANT INSERT,UPDATE ON app.idempotency_records TO cb_runtime;
CREATE POLICY idem_insert ON app.idempotency_records FOR INSERT TO cb_runtime WITH CHECK(app.can_business(business_id) AND actor_subject=current_setting('app.actor_subject',true));
CREATE POLICY idem_update ON app.idempotency_records FOR UPDATE TO cb_runtime USING(app.can_business(business_id) AND actor_subject=current_setting('app.actor_subject',true)) WITH CHECK(app.can_business(business_id) AND actor_subject=current_setting('app.actor_subject',true));

CREATE FUNCTION app.commerce_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,app,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='quotes' AND (to_jsonb(NEW)-'state') IS DISTINCT FROM (to_jsonb(OLD)-'state') THEN RAISE EXCEPTION 'Immutable quote' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='orders' AND (to_jsonb(NEW)-ARRAY['state','exception_paused','version','updated_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','exception_paused','version','updated_at']) THEN RAISE EXCEPTION 'Immutable order snapshot' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='approvals' AND (to_jsonb(NEW)-ARRAY['state','version','decided_by','decided_at','decision_note']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version','decided_by','decided_at','decision_note']) THEN RAISE EXCEPTION 'Immutable approval proposal' USING ERRCODE='23514'; END IF;
 IF TG_TABLE_NAME='capacity_buckets' AND NEW.max_units<>OLD.max_units AND app.scope_role()<>'owner' THEN RAISE EXCEPTION 'Owner capacity configuration required' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER quote_snapshot BEFORE UPDATE ON app.quotes FOR EACH ROW EXECUTE FUNCTION app.commerce_immutable();
CREATE TRIGGER order_snapshot BEFORE UPDATE ON app.orders FOR EACH ROW EXECUTE FUNCTION app.commerce_immutable();
CREATE TRIGGER approval_snapshot BEFORE UPDATE ON app.approvals FOR EACH ROW EXECUTE FUNCTION app.commerce_immutable();
CREATE TRIGGER capacity_config BEFORE UPDATE ON app.capacity_buckets FOR EACH ROW EXECUTE FUNCTION app.commerce_immutable();

-- Read persisted business clock without exposing mutable clock settings to customers.
CREATE FUNCTION app.business_now() RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$
 SELECT CASE WHEN d.paused THEN d.base_demo_time ELSE d.base_demo_time+(clock_timestamp()-d.real_time_anchor) END
 FROM app.demo_settings d WHERE d.business_id=app.scope_business() AND
 ((session_user='cb_runtime' AND app.scope_role() IN ('customer','owner')) OR (session_user='cb_worker' AND app.scope_role()='worker'))
$$;

-- Expiry must reconcile other customers' due holds before a competing booking.
-- This narrow definer operation accepts only a date, uses trusted business and clock,
-- and cannot release an unexpired or committed reservation.
CREATE FUNCTION app.expire_date(p_date date) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$
DECLARE b uuid := app.scope_business(); instant timestamptz; r record; a record; n integer:=0;
BEGIN
 IF session_user<>'cb_runtime' OR app.scope_role() NOT IN ('customer','owner') OR b IS NULL THEN RAISE EXCEPTION 'Scope required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(b::text,3003));
 PERFORM pg_advisory_xact_lock(hashtextextended(b::text||':'||p_date::text,3004));
 instant:=app.business_now();
 IF instant IS NULL THEN RAISE EXCEPTION 'Clock unavailable' USING ERRCODE='23514'; END IF;
 FOR r IN SELECT rs.* FROM app.reservations rs JOIN app.orders o ON o.id=rs.order_id AND o.business_id=rs.business_id
   WHERE rs.business_id=b AND o.pickup_date=p_date AND rs.state='held' AND rs.expires_at<=instant ORDER BY rs.id FOR UPDATE OF rs,o LOOP
   FOR a IN SELECT * FROM app.reservation_items WHERE reservation_id=r.id ORDER BY capacity_bucket_id LOOP
     UPDATE app.capacity_buckets SET held_units=held_units-a.quantity,version=version+1 WHERE id=a.capacity_bucket_id AND business_id=b;
   END LOOP;
   UPDATE app.reservations SET state='released',released_at=instant WHERE id=r.id;
   UPDATE app.orders SET state='cancelled',version=version+1,updated_at=instant WHERE id=r.order_id;
   UPDATE app.jobs SET state='suppressed' WHERE business_id=b AND order_id=r.order_id AND kind='deposit_reminder' AND state='queued';
   UPDATE app.outbox_events SET state='suppressed',updated_at=instant WHERE business_id=b AND entity_id=r.order_id AND kind='deposit_reminder' AND state='queued';
   INSERT INTO app.audit_events(id,business_id,customer_id,actor_type,actor_subject,action,entity_type,entity_id,correlation_id,occurred_at)
   VALUES(gen_random_uuid(),b,r.customer_id,'system','local-expiry','hold_expired','order',r.order_id,gen_random_uuid(),instant);
   n:=n+1;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION app.commerce_immutable(),app.business_now(),app.expire_date(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.business_now() TO cb_runtime,cb_worker;
GRANT EXECUTE ON FUNCTION app.expire_date(date) TO cb_runtime;

GRANT INSERT ON app.knowledge_versions,app.knowledge_entries,app.catalogue_items,app.capacity_buckets TO cb_runtime;
CREATE POLICY version_insert ON app.knowledge_versions FOR INSERT TO cb_runtime WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
CREATE POLICY entry_insert ON app.knowledge_entries FOR INSERT TO cb_runtime WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
CREATE POLICY item_insert ON app.catalogue_items FOR INSERT TO cb_runtime WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
CREATE POLICY bucket_insert ON app.capacity_buckets FOR INSERT TO cb_runtime WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
GRANT UPDATE(state) ON app.knowledge_versions TO cb_runtime;
CREATE POLICY version_update ON app.knowledge_versions FOR UPDATE TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()='owner') WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
GRANT UPDATE(active_knowledge_version_id,version,updated_at) ON app.businesses TO cb_runtime;
CREATE POLICY business_update ON app.businesses FOR UPDATE TO cb_runtime USING(app.can_business(id) AND app.scope_role()='owner') WITH CHECK(app.can_business(id) AND app.scope_role()='owner');
GRANT UPDATE(state) ON app.jobs TO cb_runtime;
CREATE POLICY job_update ON app.jobs FOR UPDATE TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()='owner') WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
GRANT UPDATE(state,updated_at) ON app.outbox_events TO cb_runtime;
CREATE POLICY outbox_update ON app.outbox_events FOR UPDATE TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()='owner') WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
