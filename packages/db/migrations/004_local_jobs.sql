-- Phase 5 local scheduler and scripted runs. No integration/model authority.
ALTER TABLE app.agent_runs ADD COLUMN result_json jsonb;
ALTER TABLE app.documents ADD COLUMN action_key text;
CREATE UNIQUE INDEX document_action_identity ON app.documents(business_id,action_key) WHERE action_key IS NOT NULL;
CREATE TABLE app.notifications (
 id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, order_id uuid NOT NULL,
 action_key text NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL,
 UNIQUE(business_id,action_key), FOREIGN KEY(business_id,customer_id,order_id) REFERENCES app.orders(business_id,customer_id,id)
);
CREATE TABLE app.digests (
 id uuid PRIMARY KEY,business_id uuid NOT NULL REFERENCES app.businesses(id),action_key text NOT NULL,
 snapshot_json jsonb NOT NULL,created_at timestamptz NOT NULL,UNIQUE(business_id,action_key)
);
ALTER TABLE app.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE app.digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.digests FORCE ROW LEVEL SECURITY;
CREATE POLICY notification_read ON app.notifications FOR SELECT TO cb_runtime,cb_worker USING(app.can_customer(business_id,customer_id));
CREATE POLICY notification_write ON app.notifications FOR INSERT TO cb_runtime,cb_worker WITH CHECK(app.can_business(business_id) AND app.scope_role() IN ('owner','worker'));
CREATE POLICY digest_access ON app.digests TO cb_runtime,cb_worker USING(app.can_business(business_id) AND app.scope_role() IN ('owner','worker')) WITH CHECK(app.can_business(business_id) AND app.scope_role() IN ('owner','worker'));
GRANT SELECT ON app.notifications,app.digests TO cb_runtime,cb_worker;
GRANT INSERT ON app.notifications,app.digests TO cb_runtime,cb_worker;
GRANT INSERT,UPDATE ON app.agent_runs TO cb_runtime;
CREATE POLICY run_insert ON app.agent_runs FOR INSERT TO cb_runtime WITH CHECK(app.own_customer(business_id,customer_id));
CREATE POLICY run_update ON app.agent_runs FOR UPDATE TO cb_runtime USING(app.own_customer(business_id,customer_id)) WITH CHECK(app.own_customer(business_id,customer_id));
CREATE POLICY scripted_message_insert ON app.messages FOR INSERT TO cb_runtime WITH CHECK(app.own_customer(business_id,customer_id) AND role='assistant');
GRANT SELECT ON app.demo_settings,app.customers,app.consent_events,app.knowledge_versions,app.knowledge_entries,app.catalogue_items,app.documents,app.order_items,app.conversations,app.reservations,app.approvals TO cb_worker;
CREATE POLICY worker_settings_read ON app.demo_settings FOR SELECT TO cb_worker USING(app.can_business(business_id));
CREATE POLICY worker_customer_read ON app.customers FOR SELECT TO cb_worker USING(app.can_customer(business_id,id));
CREATE POLICY worker_knowledge_read ON app.knowledge_versions FOR SELECT TO cb_worker USING(app.can_business(business_id));
GRANT INSERT,UPDATE ON app.jobs,app.documents TO cb_runtime,cb_worker;
GRANT UPDATE ON app.outbox_events TO cb_worker;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['jobs','documents'] LOOP
 EXECUTE format('CREATE POLICY local_job_write ON app.%I FOR ALL TO cb_runtime,cb_worker USING(app.can_business(business_id) AND app.scope_role() IN (''owner'',''worker'')) WITH CHECK(app.can_business(business_id) AND app.scope_role() IN (''owner'',''worker''))',t);
 END LOOP;
END $$;
CREATE POLICY worker_outbox_update ON app.outbox_events FOR UPDATE TO cb_worker USING(app.can_business(business_id)) WITH CHECK(app.can_business(business_id));
GRANT UPDATE(base_demo_time,real_time_anchor,paused) ON app.demo_settings TO cb_runtime;
CREATE POLICY owner_clock_update ON app.demo_settings FOR UPDATE TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()='owner') WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
GRANT UPDATE(automation_paused) ON app.businesses TO cb_runtime;
-- Existing owner business UPDATE policy already enforces owner authority.
