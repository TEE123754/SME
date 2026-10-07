-- Local expanded demo. No managed AI or external integration credentials.
ALTER TABLE app.products ADD COLUMN kind text NOT NULL DEFAULT 'product' CHECK(kind IN ('product','service'));
ALTER TABLE app.orders DROP CONSTRAINT orders_state_check;
ALTER TABLE app.orders ADD CONSTRAINT orders_state_check CHECK(state IN ('awaiting_deposit','confirmed','preparing','ready','delivering','completed','cancelled'));
GRANT UPDATE(name,slug) ON app.businesses TO cb_runtime;
GRANT INSERT,UPDATE(active,kind) ON app.products TO cb_runtime;
CREATE POLICY products_write ON app.products FOR ALL TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()='owner') WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');

CREATE TABLE app.business_profiles (
 business_id uuid PRIMARY KEY REFERENCES app.businesses(id), sector text NOT NULL DEFAULT 'Retail',
 fulfilment text NOT NULL DEFAULT 'pickup' CHECK(fulfilment IN ('pickup','delivery','appointment')),
 ethics jsonb NOT NULL DEFAULT '{"personalisation":true,"marketingEnabled":true,"dailyContactLimit":1,"maxDiscountPercent":15,"maxIncreasePercent":10}',
 version integer NOT NULL DEFAULT 1
);
CREATE TABLE app.inventory_movements (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), product_id uuid NOT NULL,
 order_id uuid, quantity integer NOT NULL CHECK(quantity<>0), kind text NOT NULL CHECK(kind IN ('receipt','adjustment','fulfilment','return')),
 note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(business_id,product_id) REFERENCES app.products(business_id,id),
 FOREIGN KEY(order_id) REFERENCES app.orders(id), UNIQUE(business_id,order_id,product_id,kind)
);
CREATE TABLE app.price_proposals (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), product_id uuid NOT NULL,
 knowledge_version_id uuid NOT NULL, old_price_sen integer NOT NULL, new_price_sen integer NOT NULL CHECK(new_price_sen>0),
 reason text NOT NULL, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(business_id,product_id) REFERENCES app.products(business_id,id)
);
CREATE TABLE app.marketing_campaigns (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), title text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('announcement','recommendation','promotion','after_sales')),
 content text NOT NULL, product_id uuid, discount_percent integer NOT NULL DEFAULT 0 CHECK(discount_percent BETWEEN 0 AND 50),
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','sent')), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(business_id,product_id) REFERENCES app.products(business_id,id)
);
CREATE TABLE app.campaign_deliveries (
 id uuid PRIMARY KEY, business_id uuid NOT NULL, customer_id uuid NOT NULL,
 campaign_id uuid NOT NULL REFERENCES app.marketing_campaigns(id), content text NOT NULL, reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz,
 FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id), UNIQUE(campaign_id,customer_id)
);
CREATE TABLE app.content_drafts (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), product_id uuid NOT NULL,
 channel text NOT NULL, language text NOT NULL CHECK(language IN ('en','bm','zh')),
 title text NOT NULL, body text NOT NULL, visual_json jsonb NOT NULL,
 state text NOT NULL DEFAULT 'draft' CHECK(state IN ('draft','approved')), created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(business_id,product_id) REFERENCES app.products(business_id,id)
);
CREATE TABLE app.risk_cases (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), order_id uuid NOT NULL REFERENCES app.orders(id),
 reference text NOT NULL, amount_sen integer NOT NULL CHECK(amount_sen>0), reasons jsonb NOT NULL,
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','cleared','blocked')), decision_note text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,order_id,reference)
);
CREATE TABLE app.calendar_events (
 id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES app.businesses(id), title text NOT NULL,
 event_date date NOT NULL, start_local time NOT NULL, kind text NOT NULL CHECK(kind IN ('task','campaign','appointment')),
 note text NOT NULL, done boolean NOT NULL DEFAULT false
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['business_profiles','inventory_movements','price_proposals','marketing_campaigns','campaign_deliveries','content_drafts','risk_cases','calendar_events'] LOOP
  EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON app.%I TO cb_runtime',t);
  EXECUTE format('CREATE POLICY owner_access ON app.%I FOR ALL TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()=''owner'') WITH CHECK(app.can_business(business_id) AND app.scope_role()=''owner'')',t);
 END LOOP;
END $$;
CREATE POLICY profile_read ON app.business_profiles FOR SELECT TO cb_runtime USING(app.can_business(business_id));
CREATE POLICY inbox_read ON app.campaign_deliveries FOR SELECT TO cb_runtime USING(app.own_customer(business_id,customer_id));
CREATE POLICY inbox_ack ON app.campaign_deliveries FOR UPDATE TO cb_runtime USING(app.own_customer(business_id,customer_id)) WITH CHECK(app.own_customer(business_id,customer_id));
CREATE TRIGGER stock_immutable BEFORE UPDATE OR DELETE ON app.inventory_movements FOR EACH ROW EXECUTE FUNCTION app.immutable_record();

-- Trusted scoped stock reads are needed for customer reservations; customers cannot read the owner ledger.
CREATE FUNCTION app.inventory_available(pid uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM app.inventory_movements WHERE business_id=app.scope_business() AND product_id=pid)
 THEN (SELECT COALESCE(sum(quantity),0)::integer FROM app.inventory_movements WHERE business_id=app.scope_business() AND product_id=pid)
 - (SELECT COALESCE(sum(i.quantity),0)::integer FROM app.order_items i JOIN app.orders o ON o.id=i.order_id
 JOIN app.reservations r ON r.order_id=o.id WHERE i.business_id=app.scope_business() AND i.product_id=pid
 AND o.state IN ('awaiting_deposit','confirmed','preparing') AND (r.state='committed' OR (r.state='held' AND r.expires_at>app.business_now())))
 ELSE NULL END WHERE session_user='cb_runtime' AND app.scope_role() IN ('owner','customer') AND EXISTS(SELECT 1 FROM app.products WHERE id=pid AND business_id=app.scope_business() AND kind='product')
$$;
REVOKE ALL ON FUNCTION app.inventory_available(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.inventory_available(uuid) TO cb_runtime;

-- Consume tracked inventory once when goods become ready; restore on cancellation.
CREATE FUNCTION app.fulfilment_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$
DECLARE item record; balance integer; BEGIN
 IF NEW.state=OLD.state THEN RETURN NEW; END IF;
 FOR item IN SELECT i.product_id,i.quantity FROM app.order_items i JOIN app.products p ON p.id=i.product_id WHERE i.order_id=NEW.id AND p.kind='product' ORDER BY i.product_id LOOP
  IF EXISTS(SELECT 1 FROM app.inventory_movements WHERE business_id=NEW.business_id AND product_id=item.product_id) THEN
   IF NEW.state='ready' AND NOT EXISTS(SELECT 1 FROM app.inventory_movements WHERE order_id=NEW.id AND product_id=item.product_id AND kind='fulfilment') THEN
    SELECT COALESCE(sum(quantity),0) INTO balance FROM app.inventory_movements WHERE business_id=NEW.business_id AND product_id=item.product_id;
    IF balance<item.quantity THEN RAISE EXCEPTION 'Insufficient stock' USING ERRCODE='23514'; END IF;
    INSERT INTO app.inventory_movements VALUES(gen_random_uuid(),NEW.business_id,item.product_id,NEW.id,-item.quantity,'fulfilment','Order prepared',app.business_now());
   ELSIF NEW.state='cancelled' AND EXISTS(SELECT 1 FROM app.inventory_movements WHERE order_id=NEW.id AND product_id=item.product_id AND kind='fulfilment') THEN
    INSERT INTO app.inventory_movements VALUES(gen_random_uuid(),NEW.business_id,item.product_id,NEW.id,item.quantity,'return','Cancelled order restored',app.business_now()) ON CONFLICT DO NOTHING;
   END IF;
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER order_stock BEFORE UPDATE ON app.orders FOR EACH ROW EXECUTE FUNCTION app.fulfilment_stock();
REVOKE ALL ON FUNCTION app.fulfilment_stock() FROM PUBLIC;

CREATE TABLE app.order_tracking (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL, customer_id uuid NOT NULL,
 order_id uuid NOT NULL, state text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(business_id,customer_id,order_id) REFERENCES app.orders(business_id,customer_id,id)
);
ALTER TABLE app.order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.order_tracking FORCE ROW LEVEL SECURITY;
GRANT SELECT ON app.order_tracking TO cb_runtime;
CREATE POLICY tracking_read ON app.order_tracking FOR SELECT TO cb_runtime USING(app.can_customer(business_id,customer_id));
CREATE FUNCTION app.record_tracking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.state IS DISTINCT FROM OLD.state THEN
  INSERT INTO app.order_tracking(business_id,customer_id,order_id,state,created_at) VALUES(NEW.business_id,NEW.customer_id,NEW.id,NEW.state,GREATEST(COALESCE(app.business_now(),NEW.updated_at,NEW.created_at),COALESCE((SELECT max(created_at)+interval '1 millisecond' FROM app.order_tracking WHERE order_id=NEW.id),NEW.created_at)));
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER tracking_changed AFTER INSERT OR UPDATE ON app.orders FOR EACH ROW EXECUTE FUNCTION app.record_tracking();
REVOKE ALL ON FUNCTION app.record_tracking() FROM PUBLIC;

CREATE FUNCTION app.create_demo_member(member_name text,lang text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$
DECLARE b uuid:=app.scope_business(); cid uuid:=gen_random_uuid(); BEGIN
 IF current_setting('role',true) IS NOT NULL AND current_setting('role',true) NOT IN ('none','cb_runtime') THEN RAISE EXCEPTION 'Restricted caller' USING ERRCODE='42501'; END IF;
 IF app.scope_role()<>'owner' OR NOT EXISTS(SELECT 1 FROM app.businesses WHERE id=b AND is_synthetic) OR NOT EXISTS(SELECT 1 FROM app.memberships WHERE business_id=b AND provider_subject=current_setting('app.actor_subject',true) AND active) THEN RAISE EXCEPTION 'Owner only' USING ERRCODE='42501'; END IF;
 IF length(member_name) NOT BETWEEN 1 AND 80 OR lang NOT IN ('en','bm') THEN RAISE EXCEPTION 'Invalid member' USING ERRCODE='23514'; END IF;
 INSERT INTO app.customers(id,business_id,auth_provider,provider_subject,display_code,display_name,preferred_language) VALUES(cid,b,'demo','demo:'||cid,'M-'||left(cid::text,8),member_name,lang);
 INSERT INTO app.demo_accounts(account_key,business_id,customer_id,subject,role,label) VALUES('member-'||replace(cid::text,'-',''),b,cid,'demo:'||cid,'customer',member_name||' (synthetic member)');
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION app.create_demo_member(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_demo_member(text,text) TO cb_runtime;
CREATE POLICY owner_customer_lock ON app.customers FOR UPDATE TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()='owner') WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
CREATE INDEX stock_business_product ON app.inventory_movements(business_id,product_id,created_at);
CREATE INDEX delivery_customer_time ON app.campaign_deliveries(business_id,customer_id,created_at);
CREATE INDEX tracking_order_time ON app.order_tracking(business_id,customer_id,order_id,created_at);
