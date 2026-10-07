ALTER TABLE app.products ADD COLUMN image_key text NOT NULL DEFAULT 'parcel'
 CHECK(image_key IN ('parcel','brownie','cupcake','flower','service'));
GRANT UPDATE(image_key) ON app.products TO cb_runtime;
UPDATE app.products SET image_key=CASE sku WHEN 'brownie-tray' THEN 'brownie' WHEN 'cupcake-box' THEN 'cupcake' ELSE 'parcel' END;
CREATE TABLE app.loyalty_programs (
 business_id uuid PRIMARY KEY REFERENCES app.businesses(id), enabled boolean NOT NULL DEFAULT true,
 discount_basis_points integer NOT NULL DEFAULT 500 CHECK(discount_basis_points BETWEEN 0 AND 1500),
 version integer NOT NULL DEFAULT 1
);
INSERT INTO app.loyalty_programs(business_id) SELECT id FROM app.businesses;
CREATE TABLE app.customer_loyalty (
 business_id uuid NOT NULL, customer_id uuid NOT NULL, active boolean NOT NULL,
 version integer NOT NULL DEFAULT 1, joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(business_id,customer_id), FOREIGN KEY(business_id,customer_id) REFERENCES app.customers(business_id,id)
);
ALTER TABLE app.quotes ADD COLUMN member_benefit jsonb;
ALTER TABLE app.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.loyalty_programs FORCE ROW LEVEL SECURITY;
ALTER TABLE app.customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.customer_loyalty FORCE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON app.loyalty_programs,app.customer_loyalty TO cb_runtime;
CREATE POLICY program_read ON app.loyalty_programs FOR SELECT TO cb_runtime USING(app.can_business(business_id));
CREATE POLICY program_owner ON app.loyalty_programs FOR ALL TO cb_runtime USING(app.can_business(business_id) AND app.scope_role()='owner') WITH CHECK(app.can_business(business_id) AND app.scope_role()='owner');
CREATE POLICY loyalty_read ON app.customer_loyalty FOR SELECT TO cb_runtime USING(app.can_customer(business_id,customer_id));
CREATE POLICY loyalty_join ON app.customer_loyalty FOR INSERT TO cb_runtime WITH CHECK(app.own_customer(business_id,customer_id));
CREATE POLICY loyalty_update ON app.customer_loyalty FOR UPDATE TO cb_runtime USING(app.own_customer(business_id,customer_id)) WITH CHECK(app.own_customer(business_id,customer_id));

-- Only public catalogue fields; never customer data, stock ledger or private policies.
CREATE FUNCTION app.public_store(store_slug text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$
 SELECT jsonb_build_object('business',jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'sector',COALESCE(bp.sector,'Retail'),'fulfilment',COALESCE(bp.fulfilment,'pickup')),
 'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id',p.id,'sku',p.sku,'kind',p.kind,'image_key',p.image_key,'label',i.label,'description',i.description,'units_description',i.units_description,'unit_price_sen',i.unit_price_sen,'knowledge_version_id',i.knowledge_version_id) ORDER BY p.sku) FROM app.products p JOIN app.catalogue_items i ON i.business_id=p.business_id AND i.product_id=p.id WHERE p.business_id=b.id AND p.active AND i.available AND i.knowledge_version_id=b.active_knowledge_version_id),'[]'::jsonb))
 FROM app.businesses b LEFT JOIN app.business_profiles bp ON bp.business_id=b.id WHERE b.slug=store_slug AND b.is_synthetic
$$;
REVOKE ALL ON FUNCTION app.public_store(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.public_store(text) TO cb_runtime;
CREATE FUNCTION app.store_demo_accounts(store_slug text) RETURNS TABLE(account_key text,label text,role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$ SELECT d.account_key,d.label,d.role FROM app.demo_accounts d JOIN app.businesses b ON b.id=d.business_id WHERE b.slug=store_slug AND b.is_synthetic ORDER BY d.role,d.label $$;
REVOKE ALL ON FUNCTION app.store_demo_accounts(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.store_demo_accounts(text) TO cb_runtime;

-- Loopback-only demo bootstrap. It creates new identities, never grants authority in an existing business.
CREATE FUNCTION app.create_demo_business(request_id uuid,business_name text,store_slug text,industry text,method text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,app,pg_temp AS $$
DECLARE b uuid:=request_id; k uuid:=gen_random_uuid(); cid uuid:=gen_random_uuid(); owner_key text:='owner-'||replace(b::text,'-',''); customer_key text:='shopper-'||replace(b::text,'-',''); existing record;
BEGIN
 IF session_user<>'cb_runtime' THEN RAISE EXCEPTION 'Restricted caller' USING ERRCODE='42501'; END IF;
 IF length(business_name) NOT BETWEEN 1 AND 100 OR store_slug !~ '^[a-z0-9-]{3,60}$' OR length(industry) NOT BETWEEN 1 AND 80 OR method NOT IN ('pickup','delivery','appointment') THEN RAISE EXCEPTION 'Invalid business' USING ERRCODE='23514'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(b::text,3003));
 SELECT bs.name,bs.slug,bp.sector,bp.fulfilment INTO existing FROM app.businesses bs JOIN app.business_profiles bp ON bp.business_id=bs.id WHERE bs.id=b;
 IF FOUND THEN
  IF existing.name<>business_name OR existing.slug<>store_slug OR existing.sector<>industry OR existing.fulfilment<>method OR NOT EXISTS(SELECT 1 FROM app.demo_accounts WHERE account_key=owner_key AND business_id=b) THEN RAISE EXCEPTION 'Request identity conflict' USING ERRCODE='23514'; END IF;
  RETURN jsonb_build_object('businessId',b,'ownerKey',owner_key,'customerKey',customer_key);
 END IF;
 INSERT INTO app.businesses(id,name,slug) VALUES(b,business_name,store_slug);
 INSERT INTO app.memberships(business_id,auth_provider,provider_subject,role) VALUES(b,'demo','demo:'||owner_key,'owner');
 INSERT INTO app.demo_accounts(account_key,business_id,subject,role,label) VALUES(owner_key,b,'demo:'||owner_key,'owner',business_name||' · synthetic owner');
 INSERT INTO app.customers(id,business_id,auth_provider,provider_subject,display_code,display_name,preferred_language) VALUES(cid,b,'demo','demo:'||customer_key,'C-001','Demo shopper','en');
 INSERT INTO app.demo_accounts(account_key,business_id,customer_id,subject,role,label) VALUES(customer_key,b,cid,'demo:'||customer_key,'customer',business_name||' · synthetic shopper');
 INSERT INTO app.knowledge_versions(id,business_id,version_number,state,policy_json,published_at,created_by) VALUES(k,b,1,'published','{"leadTimeHours":48,"depositBasisPoints":5000,"quoteLifetimeMinutes":30,"holdLifetimeHours":24,"reminderDelayHours":12,"quietHoursStart":"09:00","quietHoursEnd":"20:00","allowedExceptionTypes":["discount","custom_order","complaint","refund_request"]}',now(),'demo:'||owner_key);
 UPDATE app.businesses SET active_knowledge_version_id=k WHERE id=b;
 INSERT INTO app.business_profiles(business_id,sector,fulfilment) VALUES(b,industry,method);
 INSERT INTO app.loyalty_programs(business_id) VALUES(b);
 INSERT INTO app.demo_settings(business_id,base_demo_time,real_time_anchor) VALUES(b,'2026-10-08T01:00:00Z',now());
 INSERT INTO app.pickup_slots(id,business_id,code,start_local,end_local) VALUES(gen_random_uuid(),b,'midday','12:00','14:00'),(gen_random_uuid(),b,'afternoon','16:00','18:00');
 RETURN jsonb_build_object('businessId',b,'ownerKey',owner_key,'customerKey',customer_key);
END $$;
REVOKE ALL ON FUNCTION app.create_demo_business(uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.create_demo_business(uuid,text,text,text,text) TO cb_runtime;
