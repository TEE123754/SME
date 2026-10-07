CREATE SCHEMA app;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO cb_runtime, cb_worker;

CREATE FUNCTION app.scope_business() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.business_id', true), '')::uuid $$;
CREATE FUNCTION app.scope_customer() RETURNS uuid LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.customer_id', true), '')::uuid $$;
CREATE FUNCTION app.scope_role() RETURNS text LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.actor_role', true), '') $$;
CREATE FUNCTION app.can_business(b uuid) RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT b = app.scope_business() AND
    ((current_user = 'cb_runtime' AND app.scope_role() IN ('owner','customer')) OR
     (current_user = 'cb_worker' AND app.scope_role() = 'worker')) $$;
CREATE FUNCTION app.can_customer(b uuid, c uuid) RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT app.can_business(b) AND
    (app.scope_role() IN ('owner','worker') OR c = app.scope_customer()) $$;
CREATE FUNCTION app.own_customer(b uuid, c uuid) RETURNS boolean LANGUAGE sql STABLE
  AS $$ SELECT current_user = 'cb_runtime' AND app.scope_role() = 'customer'
    AND b = app.scope_business() AND c = app.scope_customer() $$;

CREATE TABLE app.businesses (
  id uuid PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur', active_knowledge_version_id uuid,
  automation_paused boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  is_synthetic boolean NOT NULL DEFAULT true CHECK(is_synthetic),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE app.memberships (
  business_id uuid NOT NULL REFERENCES app.businesses(id), auth_provider text NOT NULL,
  provider_subject text NOT NULL, role text NOT NULL CHECK(role = 'owner'), active boolean NOT NULL DEFAULT true,
  PRIMARY KEY(business_id, auth_provider, provider_subject), UNIQUE(business_id,provider_subject)
);
CREATE TABLE app.customers (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id),
  auth_provider text NOT NULL, provider_subject text NOT NULL, display_code text NOT NULL,
  display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 80),
  preferred_language text NOT NULL DEFAULT 'en' CHECK(preferred_language IN ('bm','en')),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0), is_synthetic boolean NOT NULL DEFAULT true CHECK(is_synthetic),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id,id), UNIQUE(business_id,display_code), UNIQUE(business_id,auth_provider,provider_subject)
);
CREATE TABLE app.consent_events (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL,
  event_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  purpose text NOT NULL CHECK(purpose IN ('preference_memory','operational_reminders','marketing')),
  granted boolean NOT NULL, captured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK(source IN ('seed','customer_control')), notice_version text NOT NULL,
  UNIQUE(business_id,customer_id,id), FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id)
);
CREATE TABLE app.knowledge_versions (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id),
  version_number integer NOT NULL CHECK(version_number > 0), state text NOT NULL CHECK(state IN ('draft','published','retired')),
  policy_json jsonb NOT NULL CHECK(jsonb_typeof(policy_json) = 'object'),
  published_at timestamptz, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id,id), UNIQUE(business_id,version_number)
);
ALTER TABLE app.businesses ADD FOREIGN KEY(id,active_knowledge_version_id) REFERENCES app.knowledge_versions(business_id,id);
CREATE TABLE app.knowledge_entries (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, knowledge_version_id uuid NOT NULL,
  fact_key text NOT NULL, category text NOT NULL CHECK(category IN ('FAQ','pickup','payment','ingredients')),
  content_bm text NOT NULL, content_en text NOT NULL,
  UNIQUE(business_id,id), UNIQUE(business_id,knowledge_version_id,fact_key),
  FOREIGN KEY(business_id,knowledge_version_id) REFERENCES app.knowledge_versions(business_id,id)
);
CREATE TABLE app.products (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), sku text NOT NULL,
  active boolean NOT NULL DEFAULT true, UNIQUE(business_id,id), UNIQUE(business_id,sku)
);
CREATE TABLE app.catalogue_items (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, knowledge_version_id uuid NOT NULL, product_id uuid NOT NULL,
  label text NOT NULL, description text NOT NULL, unit_price_sen bigint NOT NULL CHECK(unit_price_sen BETWEEN 0 AND 10000000),
  units_description text NOT NULL, available boolean NOT NULL DEFAULT true,
  UNIQUE(business_id,id), UNIQUE(business_id,knowledge_version_id,product_id), UNIQUE(business_id,product_id,id),
  FOREIGN KEY(business_id,knowledge_version_id) REFERENCES app.knowledge_versions(business_id,id),
  FOREIGN KEY(business_id,product_id) REFERENCES app.products(business_id,id)
);
CREATE TABLE app.pickup_slots (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), code text NOT NULL,
  start_local time NOT NULL, end_local time NOT NULL, active boolean NOT NULL DEFAULT true,
  CHECK(start_local < end_local), UNIQUE(business_id,id), UNIQUE(business_id,code)
);
CREATE TABLE app.conversations (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','waiting_owner','closed')),
  human_takeover boolean NOT NULL DEFAULT false, language text NOT NULL CHECK(language IN ('bm','en')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id,customer_id,id), FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id)
);
CREATE TABLE app.messages (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, conversation_id uuid NOT NULL,
  role text NOT NULL CHECK(role IN ('customer','assistant','owner','system')), content text NOT NULL,
  structured_payload jsonb, source_action_key text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id,customer_id,id), UNIQUE(business_id,customer_id,conversation_id,id), UNIQUE(business_id,source_action_key),
  FOREIGN KEY(business_id,customer_id,conversation_id) REFERENCES app.conversations(business_id,customer_id,id)
);
CREATE TABLE app.customer_preferences (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL,
  key text NOT NULL CHECK(key IN ('favourite_product_sku','pickup_slot_code','packaging')),
  value_json jsonb NOT NULL CHECK(jsonb_typeof(value_json)='string'), source_message_id uuid, consent_event_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id,customer_id,key), FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id),
  FOREIGN KEY(business_id,customer_id,consent_event_id) REFERENCES app.consent_events(business_id,customer_id,id),
  FOREIGN KEY(business_id,customer_id,source_message_id) REFERENCES app.messages(business_id,customer_id,id)
);
CREATE TABLE app.agent_runs (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, conversation_id uuid NOT NULL,
  input_message_id uuid NOT NULL, adapter text NOT NULL CHECK(adapter = 'scripted'), matched_intent text,
  script_version text, state text NOT NULL CHECK(state IN ('queued','running','completed','failed')),
  tool_calls jsonb NOT NULL DEFAULT '[]', started_at timestamptz, finished_at timestamptz,
  usage_json jsonb CHECK(usage_json IS NULL), error_code text,
  UNIQUE(business_id,input_message_id), FOREIGN KEY(business_id,customer_id,conversation_id) REFERENCES app.conversations(business_id,customer_id,id),
  FOREIGN KEY(business_id,customer_id,conversation_id,input_message_id) REFERENCES app.messages(business_id,customer_id,conversation_id,id)
);
CREATE UNIQUE INDEX one_running_conversation ON app.agent_runs(business_id,conversation_id) WHERE state = 'running';
CREATE TABLE app.approvals (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, order_id uuid, conversation_id uuid,
  kind text NOT NULL, proposal_json jsonb NOT NULL, proposal_hash text NOT NULL, policy_version_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected','expired','superseded')),
  expires_at timestamptz NOT NULL, decided_by text, decided_at timestamptz, decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,customer_id,id),
  FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id),
  FOREIGN KEY(business_id,customer_id,conversation_id) REFERENCES app.conversations(business_id,customer_id,id),
  FOREIGN KEY(business_id,policy_version_id) REFERENCES app.knowledge_versions(business_id,id)
);
CREATE TABLE app.quotes (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, knowledge_version_id uuid NOT NULL,
  items_json jsonb NOT NULL CHECK(jsonb_typeof(items_json) = 'array' AND jsonb_array_length(items_json) > 0),
  pickup_date date NOT NULL, pickup_slot_id uuid NOT NULL, total_sen bigint NOT NULL CHECK(total_sen BETWEEN 0 AND 10000000),
  deposit_sen bigint NOT NULL CHECK(deposit_sen >= 0 AND deposit_sen <= total_sen), proposal_hash text NOT NULL,
  approval_id uuid, expires_at timestamptz NOT NULL,
  state text NOT NULL CHECK(state IN ('active','accepted','expired','superseded')), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id,customer_id,id), FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id),
  FOREIGN KEY(business_id,knowledge_version_id) REFERENCES app.knowledge_versions(business_id,id),
  FOREIGN KEY(business_id,pickup_slot_id) REFERENCES app.pickup_slots(business_id,id),
  FOREIGN KEY(business_id,customer_id,approval_id) REFERENCES app.approvals(business_id,customer_id,id)
);
CREATE TABLE app.confirmation_challenges (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, quote_id uuid NOT NULL,
  proposal_hash text NOT NULL, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, consumed_at timestamptz,
  FOREIGN KEY(business_id,customer_id,quote_id) REFERENCES app.quotes(business_id,customer_id,id)
);
CREATE TABLE app.orders (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, display_code text NOT NULL,
  quote_id uuid NOT NULL, knowledge_version_id uuid NOT NULL, pickup_date date NOT NULL, pickup_slot_id uuid NOT NULL,
  total_sen bigint NOT NULL CHECK(total_sen BETWEEN 0 AND 10000000),
  deposit_required_sen bigint NOT NULL CHECK(deposit_required_sen >= 0 AND deposit_required_sen <= total_sen),
  state text NOT NULL CHECK(state IN ('awaiting_deposit','confirmed','ready','completed','cancelled')),
  exception_paused boolean NOT NULL DEFAULT false, version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  is_synthetic boolean NOT NULL DEFAULT true CHECK(is_synthetic),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id,customer_id,id), UNIQUE(business_id,display_code), UNIQUE(business_id,quote_id),
  FOREIGN KEY(business_id,customer_id,quote_id) REFERENCES app.quotes(business_id,customer_id,id),
  FOREIGN KEY(business_id,knowledge_version_id) REFERENCES app.knowledge_versions(business_id,id),
  FOREIGN KEY(business_id,pickup_slot_id) REFERENCES app.pickup_slots(business_id,id)
);
ALTER TABLE app.approvals ADD FOREIGN KEY(business_id,customer_id,order_id) REFERENCES app.orders(business_id,customer_id,id);
CREATE TABLE app.order_items (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, order_id uuid NOT NULL,
  product_id uuid NOT NULL, catalogue_item_id uuid NOT NULL, sku_snapshot text NOT NULL, label_snapshot text NOT NULL,
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100), unit_price_sen bigint NOT NULL CHECK(unit_price_sen BETWEEN 0 AND 10000000),
  line_total_sen bigint NOT NULL CHECK(line_total_sen = quantity * unit_price_sen),
  FOREIGN KEY(business_id,customer_id,order_id) REFERENCES app.orders(business_id,customer_id,id),
  FOREIGN KEY(business_id,product_id,catalogue_item_id) REFERENCES app.catalogue_items(business_id,product_id,id)
);
CREATE TABLE app.capacity_buckets (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, product_id uuid NOT NULL, pickup_date date NOT NULL,
  max_units integer NOT NULL CHECK(max_units BETWEEN 0 AND 10000), held_units integer NOT NULL DEFAULT 0 CHECK(held_units >= 0),
  committed_units integer NOT NULL DEFAULT 0 CHECK(committed_units >= 0), version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  CHECK(held_units + committed_units <= max_units), UNIQUE(business_id,id), UNIQUE(business_id,product_id,pickup_date),
  FOREIGN KEY(business_id,product_id) REFERENCES app.products(business_id,id)
);
CREATE TABLE app.reservations (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, order_id uuid NOT NULL,
  state text NOT NULL CHECK(state IN ('held','committed','released')), expires_at timestamptz NOT NULL,
  released_at timestamptz, committed_at timestamptz, UNIQUE(business_id,customer_id,id), UNIQUE(business_id,order_id),
  FOREIGN KEY(business_id,customer_id,order_id) REFERENCES app.orders(business_id,customer_id,id)
);
CREATE TABLE app.reservation_items (
  reservation_id uuid NOT NULL, business_id uuid NOT NULL, customer_id uuid NOT NULL, capacity_bucket_id uuid NOT NULL,
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100), PRIMARY KEY(reservation_id,capacity_bucket_id),
  FOREIGN KEY(business_id,customer_id,reservation_id) REFERENCES app.reservations(business_id,customer_id,id),
  FOREIGN KEY(business_id,capacity_bucket_id) REFERENCES app.capacity_buckets(business_id,id)
);
CREATE TABLE app.payments (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, order_id uuid NOT NULL,
  amount_sen bigint NOT NULL CHECK(amount_sen BETWEEN 1 AND 10000000), reference text NOT NULL,
  verified_by text NOT NULL, verified_at timestamptz NOT NULL, state text NOT NULL CHECK(state IN ('verified','voided')),
  is_synthetic boolean NOT NULL DEFAULT true CHECK(is_synthetic), correction_reason text,
  UNIQUE(business_id,customer_id,id), UNIQUE(business_id,customer_id,id,order_id), UNIQUE(business_id,reference),
  FOREIGN KEY(business_id,customer_id,order_id) REFERENCES app.orders(business_id,customer_id,id),
  FOREIGN KEY(business_id,verified_by) REFERENCES app.memberships(business_id,provider_subject)
);
CREATE TABLE app.jobs (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), customer_id uuid, order_id uuid,
  kind text NOT NULL, payload_json jsonb NOT NULL DEFAULT '{}', action_key text NOT NULL,
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','completed','suppressed','failed')),
  due_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 10),
  lease_owner text, lease_until timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(order_id IS NULL OR customer_id IS NOT NULL), UNIQUE(business_id,action_key),
  FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id),
  FOREIGN KEY(business_id,customer_id,order_id) REFERENCES app.orders(business_id,customer_id,id)
);
CREATE TABLE app.outbox_events (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), customer_id uuid,
  kind text NOT NULL, entity_id uuid NOT NULL, action_key text NOT NULL, payload_json jsonb NOT NULL DEFAULT '{}',
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','delivered','suppressed','failed')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id,action_key), FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id)
);
CREATE TABLE app.documents (
  id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL, order_id uuid, quote_id uuid, payment_id uuid,
  kind text NOT NULL CHECK(kind IN ('quote','invoice','summary','receipt')), revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','preparing','available','failed')),
  storage_key text, content_hash text, supersedes_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK((kind = 'quote' AND quote_id IS NOT NULL AND order_id IS NULL AND payment_id IS NULL) OR
        (kind IN ('invoice','summary') AND order_id IS NOT NULL AND payment_id IS NULL) OR
        (kind = 'receipt' AND order_id IS NOT NULL AND payment_id IS NOT NULL)),
  CHECK(state <> 'available' OR (storage_key IS NOT NULL AND content_hash IS NOT NULL)),
  UNIQUE(business_id,customer_id,id),
  FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id),
  FOREIGN KEY(business_id,customer_id,order_id) REFERENCES app.orders(business_id,customer_id,id),
  FOREIGN KEY(business_id,customer_id,quote_id) REFERENCES app.quotes(business_id,customer_id,id),
  FOREIGN KEY(business_id,customer_id,payment_id,order_id) REFERENCES app.payments(business_id,customer_id,id,order_id),
  FOREIGN KEY(business_id,customer_id,supersedes_id) REFERENCES app.documents(business_id,customer_id,id)
);
CREATE UNIQUE INDEX quote_document_identity ON app.documents(business_id,quote_id,kind,revision) WHERE kind = 'quote';
CREATE UNIQUE INDEX order_document_identity ON app.documents(business_id,order_id,kind,revision) WHERE kind IN ('invoice','summary');
CREATE UNIQUE INDEX receipt_document_identity ON app.documents(business_id,payment_id,revision) WHERE kind = 'receipt';
CREATE TABLE app.idempotency_records (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), actor_subject text NOT NULL,
  operation text NOT NULL, key text NOT NULL, request_hash text NOT NULL,
  state text NOT NULL CHECK(state IN ('pending','completed')), result_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,actor_subject,operation,key)
);
CREATE TABLE app.audit_events (
  id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), customer_id uuid,
  actor_type text NOT NULL, actor_subject text NOT NULL, action text NOT NULL,
  entity_type text NOT NULL, entity_id uuid, entity_version integer, correlation_id uuid NOT NULL,
  safe_details_json jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id)
);
CREATE TABLE app.demo_settings (
  business_id uuid PRIMARY KEY REFERENCES app.businesses(id), base_demo_time timestamptz NOT NULL,
  real_time_anchor timestamptz NOT NULL, paused boolean NOT NULL DEFAULT true
);
CREATE TABLE app.demo_accounts (
  account_key text PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), customer_id uuid,
  subject text NOT NULL, role text NOT NULL CHECK(role IN ('owner','customer')), label text NOT NULL,
  CHECK((role = 'owner' AND customer_id IS NULL) OR (role = 'customer' AND customer_id IS NOT NULL)),
  FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id)
);
CREATE TABLE app.demo_sessions (
  token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'), account_key text NOT NULL REFERENCES app.demo_accounts(account_key),
  csrf_hash text NOT NULL CHECK(csrf_hash ~ '^[a-f0-9]{64}$'), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL, revoked_at timestamptz, CHECK(expires_at > created_at)
);
CREATE INDEX demo_sessions_expiry ON app.demo_sessions(expires_at);
CREATE TABLE app.seed_history (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());

-- Index scoped foreign keys and the actual MVP lookup/worker paths.
CREATE INDEX consent_latest ON app.consent_events(business_id,customer_id,purpose,event_sequence DESC);
CREATE INDEX conversations_customer ON app.conversations(business_id,customer_id,created_at DESC);
CREATE INDEX messages_conversation ON app.messages(business_id,customer_id,conversation_id,created_at,id);
CREATE INDEX preferences_consent ON app.customer_preferences(business_id,customer_id,consent_event_id);
CREATE INDEX preferences_message ON app.customer_preferences(business_id,customer_id,source_message_id);
CREATE INDEX runs_message ON app.agent_runs(business_id,customer_id,input_message_id);
CREATE INDEX approvals_pending ON app.approvals(business_id,expires_at) WHERE state = 'pending';
CREATE INDEX approvals_order ON app.approvals(business_id,customer_id,order_id);
CREATE INDEX approvals_conversation ON app.approvals(business_id,customer_id,conversation_id);
CREATE INDEX approvals_policy ON app.approvals(business_id,policy_version_id);
CREATE INDEX quotes_customer ON app.quotes(business_id,customer_id,created_at DESC);
CREATE INDEX quotes_knowledge ON app.quotes(business_id,knowledge_version_id);
CREATE INDEX quotes_slot ON app.quotes(business_id,pickup_slot_id);
CREATE INDEX quotes_approval ON app.quotes(business_id,customer_id,approval_id);
CREATE INDEX challenges_quote ON app.confirmation_challenges(business_id,customer_id,quote_id);
CREATE INDEX orders_customer ON app.orders(business_id,customer_id,created_at DESC);
CREATE INDEX orders_pickup ON app.orders(business_id,pickup_date,state);
CREATE INDEX orders_knowledge ON app.orders(business_id,knowledge_version_id);
CREATE INDEX orders_slot ON app.orders(business_id,pickup_slot_id);
CREATE INDEX order_items_order ON app.order_items(business_id,customer_id,order_id);
CREATE INDEX order_items_catalogue ON app.order_items(business_id,product_id,catalogue_item_id);
CREATE INDEX reservations_expiry ON app.reservations(business_id,expires_at) WHERE state = 'held';
CREATE INDEX reservation_items_reservation ON app.reservation_items(business_id,customer_id,reservation_id);
CREATE INDEX reservation_items_bucket ON app.reservation_items(business_id,capacity_bucket_id);
CREATE INDEX payments_order ON app.payments(business_id,customer_id,order_id,verified_at);
CREATE INDEX payments_owner ON app.payments(business_id,verified_by);
CREATE INDEX jobs_due ON app.jobs(due_at,id) WHERE state = 'queued';
CREATE INDEX jobs_lease ON app.jobs(lease_until,id) WHERE state = 'running';
CREATE INDEX jobs_order ON app.jobs(business_id,customer_id,order_id);
CREATE INDEX outbox_customer ON app.outbox_events(business_id,customer_id);
CREATE INDEX documents_quote ON app.documents(business_id,customer_id,quote_id);
CREATE INDEX documents_order ON app.documents(business_id,customer_id,order_id);
CREATE INDEX documents_payment ON app.documents(business_id,customer_id,payment_id,order_id);
CREATE INDEX documents_supersedes ON app.documents(business_id,customer_id,supersedes_id);
CREATE INDEX audit_business ON app.audit_events(business_id,occurred_at DESC);
CREATE INDEX audit_customer ON app.audit_events(business_id,customer_id);
CREATE INDEX demo_accounts_customer ON app.demo_accounts(business_id,customer_id);
CREATE INDEX demo_sessions_account ON app.demo_sessions(account_key);

-- All runtime access is explicitly granted; no implicit PUBLIC function execution.
REVOKE ALL ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.scope_business(),app.scope_customer(),app.scope_role(),app.can_business(uuid),app.can_customer(uuid,uuid),app.own_customer(uuid,uuid) TO cb_runtime,cb_worker;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['businesses','memberships','customers','consent_events','customer_preferences','knowledge_versions','knowledge_entries','products','catalogue_items','pickup_slots','conversations','messages','agent_runs','approvals','quotes','confirmation_challenges','orders','order_items','capacity_buckets','reservations','reservation_items','payments','jobs','outbox_events','documents','idempotency_records','audit_events','demo_settings','demo_accounts','demo_sessions','seed_history'] LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['consent_events','customer_preferences','conversations','messages','agent_runs','approvals','quotes','confirmation_challenges','orders','order_items','reservations','reservation_items','payments','documents'] LOOP
    EXECUTE format('CREATE POLICY scoped_read ON app.%I FOR SELECT TO cb_runtime,cb_worker USING (app.can_customer(business_id,customer_id))',t);
  END LOOP;
END $$;
CREATE POLICY customers_read ON app.customers FOR SELECT TO cb_runtime USING(app.can_customer(business_id,id));
CREATE POLICY businesses_read ON app.businesses FOR SELECT TO cb_runtime,cb_worker USING(app.can_business(id));
CREATE POLICY memberships_read ON app.memberships FOR SELECT TO cb_runtime USING(app.can_business(business_id) AND app.scope_role() = 'owner');
CREATE POLICY knowledge_read ON app.knowledge_versions FOR SELECT TO cb_runtime USING(app.can_business(business_id) AND (app.scope_role() = 'owner' OR
  (state = 'published' AND id = (SELECT b.active_knowledge_version_id FROM app.businesses b WHERE b.id = knowledge_versions.business_id))));
CREATE POLICY entries_read ON app.knowledge_entries FOR SELECT TO cb_runtime USING(app.can_business(business_id) AND EXISTS(SELECT 1 FROM app.knowledge_versions k WHERE k.business_id = knowledge_entries.business_id AND k.id = knowledge_entries.knowledge_version_id));
CREATE POLICY catalogue_read ON app.catalogue_items FOR SELECT TO cb_runtime USING(app.can_business(business_id) AND EXISTS(SELECT 1 FROM app.knowledge_versions k WHERE k.business_id = catalogue_items.business_id AND k.id = catalogue_items.knowledge_version_id));
CREATE POLICY products_read ON app.products FOR SELECT TO cb_runtime,cb_worker USING(app.can_business(business_id));
CREATE POLICY slots_read ON app.pickup_slots FOR SELECT TO cb_runtime,cb_worker USING(app.can_business(business_id));
CREATE POLICY capacity_read ON app.capacity_buckets FOR SELECT TO cb_runtime,cb_worker USING(app.can_business(business_id));
CREATE POLICY settings_read ON app.demo_settings FOR SELECT TO cb_runtime USING(app.can_business(business_id) AND app.scope_role() = 'owner');
CREATE POLICY jobs_read ON app.jobs FOR SELECT TO cb_runtime,cb_worker USING(app.can_business(business_id) AND app.scope_role() IN ('owner','worker'));
CREATE POLICY outbox_read ON app.outbox_events FOR SELECT TO cb_runtime,cb_worker USING(app.can_business(business_id) AND app.scope_role() IN ('owner','worker'));
CREATE POLICY idempotency_read ON app.idempotency_records FOR SELECT TO cb_runtime USING(app.can_business(business_id) AND actor_subject = current_setting('app.actor_subject',true));
CREATE POLICY audit_read ON app.audit_events FOR SELECT TO cb_runtime USING(app.can_business(business_id) AND app.scope_role() = 'owner');

-- Phase 2 only writes profile/consent/preferences/audit. Commercial grants are Phase 3 work.
GRANT SELECT ON app.businesses,app.memberships,app.customers,app.consent_events,app.customer_preferences,
  app.knowledge_versions,app.knowledge_entries,app.products,app.catalogue_items,app.pickup_slots,
  app.conversations,app.messages,app.agent_runs,app.approvals,app.quotes,app.confirmation_challenges,
  app.orders,app.order_items,app.capacity_buckets,app.reservations,app.reservation_items,app.payments,
  app.jobs,app.outbox_events,app.documents,app.idempotency_records,app.audit_events,app.demo_settings TO cb_runtime;
GRANT SELECT ON app.businesses,app.products,app.pickup_slots,app.capacity_buckets,app.orders,app.payments,app.jobs,app.outbox_events TO cb_worker;
GRANT UPDATE(display_name,preferred_language,version,updated_at) ON app.customers TO cb_runtime;
CREATE POLICY profile_update ON app.customers FOR UPDATE TO cb_runtime USING(app.own_customer(business_id,id)) WITH CHECK(app.own_customer(business_id,id));
GRANT INSERT ON app.consent_events,app.audit_events TO cb_runtime;
GRANT USAGE ON SEQUENCE app.consent_events_event_sequence_seq TO cb_runtime;
CREATE POLICY consent_insert ON app.consent_events FOR INSERT TO cb_runtime WITH CHECK(app.own_customer(business_id,customer_id) AND source = 'customer_control');
CREATE POLICY audit_insert ON app.audit_events FOR INSERT TO cb_runtime WITH CHECK(app.can_customer(business_id,customer_id) AND actor_subject = current_setting('app.actor_subject',true));
GRANT INSERT,UPDATE,DELETE ON app.customer_preferences TO cb_runtime;
CREATE POLICY preference_insert ON app.customer_preferences FOR INSERT TO cb_runtime WITH CHECK(app.own_customer(business_id,customer_id));
CREATE POLICY preference_update ON app.customer_preferences FOR UPDATE TO cb_runtime USING(app.own_customer(business_id,customer_id)) WITH CHECK(app.own_customer(business_id,customer_id));
CREATE POLICY preference_delete ON app.customer_preferences FOR DELETE TO cb_runtime USING(app.own_customer(business_id,customer_id));

CREATE FUNCTION app.enforce_memory_consent() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog,app,pg_temp AS $$
DECLARE latest app.consent_events;
BEGIN
  SELECT * INTO latest FROM app.consent_events WHERE business_id = NEW.business_id AND customer_id = NEW.customer_id
    AND purpose = 'preference_memory' ORDER BY event_sequence DESC LIMIT 1;
  IF latest.id IS NULL OR NOT latest.granted OR latest.id <> NEW.consent_event_id THEN
    RAISE EXCEPTION 'Active memory consent required' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preference_consent BEFORE INSERT OR UPDATE ON app.customer_preferences FOR EACH ROW EXECUTE FUNCTION app.enforce_memory_consent();

CREATE FUNCTION app.immutable_record() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog,app,pg_temp AS $$
BEGIN
  RAISE EXCEPTION 'Immutable record' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON app.audit_events FOR EACH ROW EXECUTE FUNCTION app.immutable_record();
CREATE TRIGGER consent_immutable BEFORE UPDATE OR DELETE ON app.consent_events FOR EACH ROW EXECUTE FUNCTION app.immutable_record();
CREATE TRIGGER message_immutable BEFORE UPDATE OR DELETE ON app.messages FOR EACH ROW EXECUTE FUNCTION app.immutable_record();

-- Small, explicitly permitted bootstrap functions. They expose no token hashes or raw sessions.
CREATE FUNCTION app.list_demo_accounts() RETURNS TABLE(account_key text,label text,role text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog,app,pg_temp AS $$
  SELECT d.account_key,d.label,d.role FROM app.demo_accounts d
  JOIN app.businesses b ON b.id=d.business_id WHERE b.is_synthetic ORDER BY d.role DESC,d.account_key
$$;
CREATE FUNCTION app.create_demo_session(account text,token text,csrf text,expiry timestamptz) RETURNS boolean
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,app,pg_temp AS $$
DECLARE a app.demo_accounts;
BEGIN
  IF token !~ '^[a-f0-9]{64}$' OR csrf !~ '^[a-f0-9]{64}$' OR expiry <= clock_timestamp()
    OR expiry > clock_timestamp() + interval '8 hours 1 minute' THEN RETURN false; END IF;
  SELECT * INTO a FROM app.demo_accounts WHERE account_key=account;
  IF a.account_key IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM app.businesses WHERE id=a.business_id AND is_synthetic) THEN RETURN false; END IF;
  IF a.role='customer' AND NOT EXISTS(SELECT 1 FROM app.customers WHERE business_id=a.business_id AND id=a.customer_id AND provider_subject=a.subject AND auth_provider='demo' AND status='active') THEN RETURN false; END IF;
  IF a.role='owner' AND NOT EXISTS(SELECT 1 FROM app.memberships WHERE business_id=a.business_id AND provider_subject=a.subject AND auth_provider='demo' AND active) THEN RETURN false; END IF;
  INSERT INTO app.demo_sessions(token_hash,account_key,csrf_hash,expires_at) VALUES(token,account,csrf,expiry);
  RETURN true;
END $$;
CREATE FUNCTION app.resolve_demo_session(token text) RETURNS TABLE(business_id uuid,customer_id uuid,subject text,role text,csrf_hash text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog,app,pg_temp AS $$
  SELECT a.business_id,a.customer_id,a.subject,a.role,s.csrf_hash FROM app.demo_sessions s
  JOIN app.demo_accounts a ON a.account_key=s.account_key
  JOIN app.businesses b ON b.id=a.business_id AND b.is_synthetic
  WHERE s.token_hash=token AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp()
    AND ((a.role='owner' AND EXISTS(SELECT 1 FROM app.memberships m WHERE m.business_id=a.business_id AND m.provider_subject=a.subject AND m.auth_provider='demo' AND m.active))
      OR (a.role='customer' AND EXISTS(SELECT 1 FROM app.customers c WHERE c.business_id=a.business_id AND c.id=a.customer_id AND c.provider_subject=a.subject AND c.auth_provider='demo' AND c.status='active')))
$$;
CREATE FUNCTION app.revoke_demo_session(token text) RETURNS void
  LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog,app,pg_temp AS $$
  UPDATE app.demo_sessions SET revoked_at=clock_timestamp() WHERE token_hash=token AND revoked_at IS NULL
$$;
REVOKE ALL ON FUNCTION app.list_demo_accounts(),app.create_demo_session(text,text,text,timestamptz),app.resolve_demo_session(text),app.revoke_demo_session(text),app.enforce_memory_consent(),app.immutable_record() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.list_demo_accounts(),app.create_demo_session(text,text,text,timestamptz),app.resolve_demo_session(text),app.revoke_demo_session(text) TO cb_runtime;
