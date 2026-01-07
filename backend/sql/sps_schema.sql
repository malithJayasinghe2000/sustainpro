--
-- PostgreSQL database dump
--

\restrict sexyKbtVBIwuAwBa2N678olBTqAkgLI1AKeZxJ9vmz73NDAjhO8OmzEnTsbAvp5

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-01-04 20:09:35

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 24643)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5380 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 243 (class 1259 OID 27186)
-- Name: sps_alert_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_alert_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    device_type character varying(100) NOT NULL,
    condition jsonb NOT NULL,
    severity character varying(50) DEFAULT 'HIGH'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_alert_rules OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 27203)
-- Name: sps_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    rule_id uuid,
    device_code character varying(100) NOT NULL,
    message text NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    triggered_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolved_by uuid
);


ALTER TABLE public.sps_alerts OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 26878)
-- Name: sps_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    actor_user_id uuid,
    action character varying(100) NOT NULL,
    target_resource character varying(50),
    target_id character varying(100),
    changes jsonb,
    ip_address character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_audit_logs OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 27026)
-- Name: sps_dashboard_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_dashboard_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid,
    layout jsonb DEFAULT '[]'::jsonb NOT NULL,
    widgets jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_dashboard_templates OWNER TO postgres;

--
-- TOC entry 5381 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE sps_dashboard_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sps_dashboard_templates IS 'Default dashboard layout for a service';


--
-- TOC entry 242 (class 1259 OID 27147)
-- Name: sps_department_service_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_department_service_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_service_id uuid NOT NULL,
    device_id integer NOT NULL,
    role character varying(100) DEFAULT 'primary'::character varying,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_department_service_devices OWNER TO postgres;

--
-- TOC entry 5382 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE sps_department_service_devices; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sps_department_service_devices IS 'Links devices to department service instances for monitoring';


--
-- TOC entry 241 (class 1259 OID 27097)
-- Name: sps_department_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_department_services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    service_id uuid NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_department_services OWNER TO postgres;

--
-- TOC entry 5383 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE sps_department_services; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sps_department_services IS 'Links departments to service templates with configuration';


--
-- TOC entry 236 (class 1259 OID 26938)
-- Name: sps_department_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_department_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(50),
    color character varying(20),
    suggested_services jsonb DEFAULT '[]'::jsonb,
    required_roles jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_department_templates OWNER TO postgres;

--
-- TOC entry 5384 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE sps_department_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sps_department_templates IS 'Reusable department templates at organization level';


--
-- TOC entry 5385 (class 0 OID 0)
-- Dependencies: 236
-- Name: COLUMN sps_department_templates.organization_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sps_department_templates.organization_id IS 'Organization ID. NULL = Global/Platform-wide template, Non-NULL = Organization-specific template';


--
-- TOC entry 227 (class 1259 OID 26742)
-- Name: sps_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_departments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    head_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    description text,
    icon character varying(50) DEFAULT 'Layers'::character varying,
    color character varying(20) DEFAULT '#3B82F6'::character varying,
    template_origin_id uuid
);


ALTER TABLE public.sps_departments OWNER TO postgres;

--
-- TOC entry 5386 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN sps_departments.template_origin_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sps_departments.template_origin_id IS 'ID of the template used to create this department';


--
-- TOC entry 222 (class 1259 OID 16451)
-- Name: sps_device_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_device_models (
    id character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parameters jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by character varying(50),
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sps_device_models OWNER TO postgres;

--
-- TOC entry 5387 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE sps_device_models; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sps_device_models IS 'Defines the schema/template for devices, including their data parameters.';


--
-- TOC entry 5388 (class 0 OID 0)
-- Dependencies: 222
-- Name: COLUMN sps_device_models.parameters; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sps_device_models.parameters IS 'JSON array defining the data points this model reports (key, unit, type, etc.)';


--
-- TOC entry 231 (class 1259 OID 26813)
-- Name: sps_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_devices (
    id integer NOT NULL,
    organization_id uuid NOT NULL,
    service_id uuid,
    device_code character varying(50) NOT NULL,
    api_key character varying(100),
    name character varying(100),
    type character varying(50),
    status character varying(50) DEFAULT 'OFFLINE'::character varying,
    last_seen timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    aws_thing_name character varying(255),
    aws_certificate_id character varying(255),
    aws_certificate_arn text,
    aws_provisioned_at timestamp without time zone,
    aws_certificate_status character varying(50) DEFAULT 'PENDING'::character varying,
    hardware_id character varying(255),
    location character varying(255)
);


ALTER TABLE public.sps_devices OWNER TO postgres;

--
-- TOC entry 5389 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN sps_devices.aws_thing_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sps_devices.aws_thing_name IS 'AWS IoT Thing name (usually same as device_code)';


--
-- TOC entry 5390 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN sps_devices.aws_certificate_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sps_devices.aws_certificate_id IS 'AWS IoT certificate ID';


--
-- TOC entry 5391 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN sps_devices.aws_certificate_arn; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sps_devices.aws_certificate_arn IS 'AWS IoT certificate ARN';


--
-- TOC entry 5392 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN sps_devices.aws_provisioned_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sps_devices.aws_provisioned_at IS 'Timestamp when device was provisioned to AWS IoT Core';


--
-- TOC entry 5393 (class 0 OID 0)
-- Dependencies: 231
-- Name: COLUMN sps_devices.aws_certificate_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sps_devices.aws_certificate_status IS 'Certificate status: PENDING, ACTIVE, INACTIVE, REVOKED';


--
-- TOC entry 230 (class 1259 OID 26812)
-- Name: sps_devices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sps_devices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sps_devices_id_seq OWNER TO postgres;

--
-- TOC entry 5394 (class 0 OID 0)
-- Dependencies: 230
-- Name: sps_devices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sps_devices_id_seq OWNED BY public.sps_devices.id;


--
-- TOC entry 226 (class 1259 OID 26726)
-- Name: sps_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    location character varying(255),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(50) DEFAULT 'PLANNING'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    description text,
    event_type character varying(50),
    image_url text,
    coordinates jsonb,
    actual_start_time timestamp with time zone,
    actual_end_time timestamp with time zone,
    permit_authority character varying(100),
    permit_license_number character varying(100),
    noc_status character varying(50),
    ticketing_partner character varying(100),
    protocol_level character varying(50),
    access_control character varying(50),
    arrival_gate character varying(50),
    venue_zones jsonb,
    climate_control character varying(50),
    power_requirement character varying(50),
    code character varying(50)
);


ALTER TABLE public.sps_events OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 26674)
-- Name: sps_organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(50) NOT NULL,
    code character varying(50),
    type character varying(50) DEFAULT 'CLIENT'::character varying,
    description text,
    industry character varying(100),
    website character varying(255),
    logo_url text,
    timezone character varying(100) DEFAULT 'UTC'::character varying,
    address text,
    city character varying(100),
    country character varying(100),
    phone character varying(50),
    vat_id character varying(50),
    billing_email character varying(255),
    contact_email character varying(255),
    plan_tier character varying(50) DEFAULT 'BASIC'::character varying,
    max_users integer DEFAULT 5,
    max_devices integer DEFAULT 10,
    subscription_status character varying(50) DEFAULT 'ACTIVE'::character varying,
    theme_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_organizations OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 26910)
-- Name: sps_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(100) NOT NULL,
    module character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.sps_permissions OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 26842)
-- Name: sps_role_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_role_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) NOT NULL,
    org_id uuid,
    event_id uuid,
    dept_id uuid,
    service_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT one_context_only CHECK ((((org_id IS NOT NULL) AND (event_id IS NULL) AND (dept_id IS NULL) AND (service_id IS NULL)) OR ((org_id IS NULL) AND (event_id IS NOT NULL) AND (dept_id IS NULL) AND (service_id IS NULL)) OR ((org_id IS NULL) AND (event_id IS NULL) AND (dept_id IS NOT NULL) AND (service_id IS NULL)) OR ((org_id IS NULL) AND (event_id IS NULL) AND (dept_id IS NULL) AND (service_id IS NOT NULL)) OR ((org_id IS NULL) AND (event_id IS NULL) AND (dept_id IS NULL) AND (service_id IS NULL))))
);


ALTER TABLE public.sps_role_assignments OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 26924)
-- Name: sps_role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_role_permissions (
    role_code character varying(50) NOT NULL,
    permission_code character varying(100) NOT NULL
);


ALTER TABLE public.sps_role_permissions OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 26762)
-- Name: sps_service_definitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_service_definitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    code_key character varying(50) NOT NULL,
    description text,
    config_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    required_permissions jsonb DEFAULT '[]'::jsonb,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_service_definitions OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 27048)
-- Name: sps_service_device_models; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_service_device_models (
    service_id uuid NOT NULL,
    device_model_id character varying(50) NOT NULL,
    role character varying(50) DEFAULT 'main'::character varying,
    min_count integer DEFAULT 1,
    max_count integer
);


ALTER TABLE public.sps_service_device_models OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 27067)
-- Name: sps_service_subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_service_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    service_id uuid,
    organization_id uuid,
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    config_override jsonb DEFAULT '{}'::jsonb,
    valid_until timestamp with time zone,
    assigned_at timestamp with time zone DEFAULT now(),
    assigned_by uuid,
    CONSTRAINT sps_service_subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['ACTIVE'::character varying, 'SUSPENDED'::character varying, 'EXPIRED'::character varying])::text[])))
);


ALTER TABLE public.sps_service_subscriptions OWNER TO postgres;

--
-- TOC entry 5395 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE sps_service_subscriptions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sps_service_subscriptions IS 'Links a service to an organization (Tenant), enabling access';


--
-- TOC entry 237 (class 1259 OID 27003)
-- Name: sps_service_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_service_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    scope character varying(50) NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    is_public_dashboard_supported boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    main_dashboard_layout jsonb DEFAULT '{"widgets": []}'::jsonb,
    public_dashboard_layout jsonb DEFAULT '{"widgets": []}'::jsonb,
    CONSTRAINT sps_service_templates_scope_check CHECK (((scope)::text = ANY ((ARRAY['GLOBAL'::character varying, 'INTERNAL'::character varying, 'ORG_SPECIFIC'::character varying])::text[])))
);


ALTER TABLE public.sps_service_templates OWNER TO postgres;

--
-- TOC entry 5396 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE sps_service_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sps_service_templates IS 'Definitions of reusable IoT services (e.g. Water Wall, Energy Monitor)';


--
-- TOC entry 229 (class 1259 OID 26782)
-- Name: sps_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_services (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    department_id uuid NOT NULL,
    definition_id uuid NOT NULL,
    name character varying(100),
    config jsonb DEFAULT '{}'::jsonb,
    status character varying(50) DEFAULT 'ACTIVE'::character varying,
    assigned_supervisor_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_services OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 26655)
-- Name: sps_system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_system_settings (
    id character varying(100) NOT NULL,
    category character varying(50) DEFAULT 'global'::character varying,
    site_title character varying(100) DEFAULT 'SustainPro'::character varying,
    site_logo text,
    maintenance_mode boolean DEFAULT false,
    default_timezone character varying(100) DEFAULT 'Asia/Colombo'::character varying,
    account_lock_duration_minutes integer DEFAULT 30,
    token_expire_minutes integer DEFAULT 60,
    max_login_attempts integer DEFAULT 5,
    session_timeout_enabled boolean DEFAULT true,
    support_email character varying(255),
    support_phone character varying(50),
    global_alert_message text,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sps_system_settings OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 27242)
-- Name: sps_task_evidence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_task_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid,
    file_url text NOT NULL,
    file_type character varying(50),
    uploaded_by uuid NOT NULL,
    notes text,
    gps_lat numeric(10,8),
    gps_lng numeric(11,8),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_task_evidence OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 27222)
-- Name: sps_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    alert_id uuid,
    title character varying(255) NOT NULL,
    description text,
    assigned_to uuid,
    status character varying(50) DEFAULT 'OPEN'::character varying,
    priority character varying(50) DEFAULT 'MEDIUM'::character varying,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_tasks OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 26700)
-- Name: sps_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sps_users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid,
    code character varying(50),
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    full_name character varying(100),
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    is_active boolean DEFAULT true,
    is_super_admin boolean DEFAULT false,
    failed_login_attempts integer DEFAULT 0,
    account_locked_until timestamp with time zone,
    last_login timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sps_users OWNER TO postgres;

--
-- TOC entry 5008 (class 2604 OID 26816)
-- Name: sps_devices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_devices ALTER COLUMN id SET DEFAULT nextval('public.sps_devices_id_seq'::regclass);


--
-- TOC entry 5371 (class 0 OID 27186)
-- Dependencies: 243
-- Data for Name: sps_alert_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_alert_rules (id, organization_id, name, device_type, condition, severity, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5372 (class 0 OID 27203)
-- Dependencies: 244
-- Data for Name: sps_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_alerts (id, organization_id, rule_id, device_code, message, status, triggered_at, resolved_at, resolved_by) FROM stdin;
\.


--
-- TOC entry 5361 (class 0 OID 26878)
-- Dependencies: 233
-- Data for Name: sps_audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_audit_logs (id, organization_id, actor_user_id, action, target_resource, target_id, changes, ip_address, created_at) FROM stdin;
\.


--
-- TOC entry 5366 (class 0 OID 27026)
-- Dependencies: 238
-- Data for Name: sps_dashboard_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_dashboard_templates (id, service_id, layout, widgets, created_at, updated_at) FROM stdin;
0936281e-931a-47c3-9733-01fd195a4ad8	a9a0ed13-28fb-4233-b24e-6ba14f51dac9	[]	[{"id": "widget_1767370689986", "type": "container", "title": "Live Readings", "children": [{"id": "widget_1767370709897", "type": "parameter_card", "title": "Parameter Card", "position": {"h": 2, "w": 3, "x": 0, "y": 2}, "settings": {"showIcon": true, "showUnit": true}, "parameter_key": "flow_rate"}, {"id": "widget_1767370710681", "type": "parameter_card", "title": "Parameter Card", "position": {"h": 2, "w": 3, "x": 0, "y": 2}, "settings": {"showIcon": true, "showUnit": true}, "parameter_key": "total_liters"}, {"id": "widget_1767370762985", "type": "parameter_card", "title": "Parameter Card", "position": {"h": 2, "w": 3, "x": 0, "y": 2}, "settings": {"showIcon": true, "showUnit": true}, "parameter_key": "bottles_avoided"}, {"id": "widget_1767370763617", "type": "parameter_card", "title": "Parameter Card", "position": {"h": 2, "w": 3, "x": 0, "y": 2}, "settings": {"showIcon": true, "showUnit": true}, "parameter_key": "co2_saved"}], "position": {"h": 2, "w": 8, "x": 0, "y": 0}, "settings": {"showIcon": true, "showUnit": true}}, {"id": "widget_1767370697745", "type": "device_status", "title": "Device Status", "position": {"h": 2, "w": 3, "x": 8, "y": 0}, "settings": {"showIcon": true, "showUnit": true, "signalParameter": "wifi_strength"}}, {"id": "widget_1767426580826", "type": "parameter_card", "title": "Parameter Card", "position": {"h": 1, "w": 2, "x": 8, "y": 2}, "settings": {"showIcon": true, "showUnit": true}, "parameter_key": "wifi_strength"}]	2026-01-02 21:51:40.773307+05:30	2026-01-03 18:10:06.587512+05:30
\.


--
-- TOC entry 5370 (class 0 OID 27147)
-- Dependencies: 242
-- Data for Name: sps_department_service_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_department_service_devices (id, department_service_id, device_id, role, config, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5369 (class 0 OID 27097)
-- Dependencies: 241
-- Data for Name: sps_department_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_department_services (id, department_id, service_id, config, created_at, updated_at) FROM stdin;
6aff912d-a776-4e2a-bc10-aa9b8fc26443	52b40d56-95a5-4227-bcd7-a2ebfc8a9e6d	a9a0ed13-28fb-4233-b24e-6ba14f51dac9	{}	2026-01-02 21:59:51.956872+05:30	2026-01-02 21:59:51.956872+05:30
\.


--
-- TOC entry 5364 (class 0 OID 26938)
-- Dependencies: 236
-- Data for Name: sps_department_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_department_templates (id, organization_id, name, description, icon, color, suggested_services, required_roles, is_active, created_at, updated_at) FROM stdin;
249818c3-07fd-42cf-bb60-9cc62c859b3d	\N	Utility & Fluids Department	Mange Event Utility Services	Zap	#5c9aff	[]	[]	f	2026-01-01 18:23:34.237854+05:30	2026-01-01 18:23:34.237854+05:30
9a883df2-7dbd-400a-a173-6188ad194c3c	\N	Security Department	Mange Event Security services	Shield	#cf0707	[]	[]	f	2026-01-01 18:22:23.260567+05:30	2026-01-01 18:22:23.260567+05:30
3934d85b-ade0-4bb2-8fa1-0cbab29379fd	\N	Utility Department	Mange Utility Services	Layers	#3B82F6	[]	[]	t	2026-01-02 11:30:03.045408+05:30	2026-01-02 11:30:03.045408+05:30
1f425660-f6a5-4927-bdcc-4a956d3b8b75	\N	Security department2	sec	Shield	#f74e3b	[]	[]	t	2026-01-03 19:09:18.967941+05:30	2026-01-03 19:09:18.967941+05:30
\.


--
-- TOC entry 5355 (class 0 OID 26742)
-- Dependencies: 227
-- Data for Name: sps_departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_departments (id, event_id, name, head_user_id, created_at, description, icon, color, template_origin_id) FROM stdin;
ae111b02-6a6e-46d9-95db-488d82555363	47e99517-0253-4950-aff5-1c409114a91b	Utility Department	\N	2026-01-02 15:54:45.570544+05:30	Mange Utility Services	Layers	#3B82F6	3934d85b-ade0-4bb2-8fa1-0cbab29379fd
52b40d56-95a5-4227-bcd7-a2ebfc8a9e6d	deb075e0-4114-4bc6-8059-ea9a24b7aae0	Utility Department	\N	2026-01-02 21:38:24.879982+05:30	Mange Utility Services	Layers	#3B82F6	3934d85b-ade0-4bb2-8fa1-0cbab29379fd
0d4037af-082f-48d1-9fa6-e4686b076631	deb075e0-4114-4bc6-8059-ea9a24b7aae0	Security department2	\N	2026-01-03 19:10:08.085529+05:30	sec	Shield	#f74e3b	1f425660-f6a5-4927-bdcc-4a956d3b8b75
\.


--
-- TOC entry 5350 (class 0 OID 16451)
-- Dependencies: 222
-- Data for Name: sps_device_models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_device_models (id, name, description, parameters, created_by, updated_at, created_at) FROM stdin;
watker tank	water tank		[{"key": "volume", "icon": "Activity", "name": "Volume", "unit": "", "category": "main", "dataType": "float"}, {"key": "raw_reading", "icon": "Activity", "name": "Raw Reading", "unit": "", "category": "main", "dataType": "float"}, {"key": "battery_level", "icon": "Activity", "name": "Battery Level", "unit": "", "category": "main", "dataType": "float"}]	22222222-2222-2222-2222-222222222222	2026-01-03 18:14:03.356+05:30	2026-01-03 18:14:03.356+05:30
Disel_Tank	Disel Tank Monitor system		[{"key": "volume", "icon": "Waves", "name": "Tank Volume", "unit": "L", "category": "main", "dataType": "float"}, {"key": "battery_level", "icon": "Battery", "name": "Battery Level", "unit": "", "category": "common", "dataType": "float"}, {"key": "signal_strength", "icon": "Wifi", "name": "Signal Strength", "unit": "", "category": "main", "dataType": "float"}]	22222222-2222-2222-2222-222222222222	2026-01-02 21:57:44.852+05:30	2026-01-02 21:57:44.852+05:30
SPS_WW01	Water Wall Monitor	Water Dispenser wall monitoring device	[{"max": 100, "min": 0, "name": "flow_rate", "type": "number", "required": true}, {"min": 0, "name": "total_liters", "type": "number", "required": true}, {"min": 0, "name": "bottles_avoided", "type": "number", "required": true}, {"min": 0, "name": "co2_saved", "type": "number", "required": true}, {"max": 0, "min": -100, "name": "wifi_strength", "type": "number", "required": false}, {"name": "status", "type": "string", "required": true}]	u_001	2026-01-04 07:39:09.228189+05:30	2025-12-12 08:19:53.515+05:30
\.


--
-- TOC entry 5359 (class 0 OID 26813)
-- Dependencies: 231
-- Data for Name: sps_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_devices (id, organization_id, service_id, device_code, api_key, name, type, status, last_seen, metadata, created_at, updated_at, aws_thing_name, aws_certificate_id, aws_certificate_arn, aws_provisioned_at, aws_certificate_status, hardware_id, location) FROM stdin;
17	5ceaf041-d66d-4805-8d70-c7bf5cfade94	6aff912d-a776-4e2a-bc10-aa9b8fc26443	npm3	c9de19535d4f8656d9ef27b7c9314dad3378baa7f8be5d2675efe8c05816f89a	npm3	\N	ACTIVE	2026-01-04 17:21:56.218602+05:30	{}	2026-01-04 08:18:15.611188+05:30	2026-01-04 08:18:15.611188+05:30	\N	\N	\N	\N	PENDING	WaterWall_x9k2m5	padukka
\.


--
-- TOC entry 5354 (class 0 OID 26726)
-- Dependencies: 226
-- Data for Name: sps_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_events (id, organization_id, name, location, start_date, end_date, status, created_at, description, event_type, image_url, coordinates, actual_start_time, actual_end_time, permit_authority, permit_license_number, noc_status, ticketing_partner, protocol_level, access_control, arrival_gate, venue_zones, climate_control, power_requirement, code) FROM stdin;
317b4f5c-c2ff-4c19-9592-5cc89088e13f	63decf49-889d-4702-9daa-1e0204253f11	Running Toward UAE	Masdar PRT station Park	2026-01-01 16:08:00+05:30	2026-01-09 16:08:00+05:30	ACTIVE	2026-01-01 16:10:03.937347+05:30	held by uae sports ministry	MEGA_SPORTING		{"lat": 24.4365192, "lng": 54.6200095}	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	OUTDOOR_OPEN		SPS-EVT-001
deb075e0-4114-4bc6-8059-ea9a24b7aae0	5ceaf041-d66d-4805-8d70-c7bf5cfade94	Riding Event	Masdar City	2026-01-02 21:32:00+05:30	2026-01-04 21:32:00+05:30	PLANNING	2026-01-02 21:36:22.25802+05:30	Riding toward UAE net zero 	MEGA_SPORTING	http://localhost:5000/api/v1/images/public/img-1767369786787-109124520.jpg	{"lat": 24.425465151233062, "lng": 54.61850881576538}	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	OUTDOOR_OPEN		SPS-EVT-003
47e99517-0253-4950-aff5-1c409114a91b	63decf49-889d-4702-9daa-1e0204253f11	Dubai Marathon 2026	dubai Mall street	2026-02-01 16:40:00+05:30	2026-02-01 16:40:00+05:30	PLANNING	2026-01-01 16:41:40.282366+05:30	running accrso dubai	MEGA_SPORTING	http://localhost:5000/api/v1/images/public/img-1767265827174-382472137.jpg	{"lat": 25.202611367966746, "lng": 55.271615982055664}	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	OUTDOOR_OPEN		SPS-EVT-002
\.


--
-- TOC entry 5352 (class 0 OID 26674)
-- Dependencies: 224
-- Data for Name: sps_organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_organizations (id, name, slug, code, type, description, industry, website, logo_url, timezone, address, city, country, phone, vat_id, billing_email, contact_email, plan_tier, max_users, max_devices, subscription_status, theme_config, created_at, updated_at) FROM stdin;
63decf49-889d-4702-9daa-1e0204253f11	SustainPro Solutions	sustainpro-solutions	SPS-ORG-001	PROVIDER	sustainability solutions that help organizations reduce emissions, engage communities, and deliver measurable environmental progress across every event and operation.	Event Management	https://sustainpro.ae/	http://localhost:5000/api/v1/images/public/img-1767175325838-714541652.png	Asia/Dubai	123 Avenu	Abu Dhabi 	UAE	+971 2 445 1552			avtmadushan@gmail.com	ENTERPRISE	999999	999999	ACTIVE	{"primary": "#004737"}	2025-12-31 15:32:05.899909+05:30	2025-12-31 15:32:05.899909+05:30
5ceaf041-d66d-4805-8d70-c7bf5cfade94	ADNOC	adnoc	SPS-ORG-002	CLIENT	ADNOC is a leading diversified energy group, wholly owned by the Abu Dhabi Government. Our network of fully integrated businesses operates across the energy value chain, helping us to responsibly meet the demands of an ever-changing energy market. 	Oil & Energy	https://www.adnoc.ae/	http://localhost:5000/api/v1/images/public/img-1767369526906-714431480.avif	Asia/Dubai	123 Stree	Abu Dhabi	UAE	+971 2 7070000			miguelc@gmail.com	ENTERPRISE	999999	999999	ACTIVE	{"primary": "#1a5091"}	2026-01-02 21:28:48.792288+05:30	2026-01-02 21:28:48.792288+05:30
\.


--
-- TOC entry 5362 (class 0 OID 26910)
-- Dependencies: 234
-- Data for Name: sps_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_permissions (id, code, name, module, description) FROM stdin;
6efbc0af-b9cc-4810-8082-20b3cc1ff3e4	events:view	View Events	Events	View list and details of events
b6cc8c62-f2eb-4310-8b34-8aa1980a6518	events:create	Create Events	Events	Create new events
f91f7142-a86c-4c62-8028-80108b251095	events:edit	Edit Events	Events	Modify event details
2d022c65-c8d6-4f48-9ac3-3e096bfee7cb	events:delete	Delete Events	Events	Remove events permanently
8aa501f9-b587-4a41-8c8b-86e15cf67a19	events:manage_manager	Manage Event Manager	Events	Assign managers to events
b3bbdcc5-5639-4b72-bffc-6803edccbf04	users:view	View Users	Users	View list and profiles of users
7ba0b44e-c99f-439e-a8ac-cc7e1302957c	users:create	Create Users	Users	Invite or create new users
7ca9cb5d-fda1-48b0-8121-57b3e809ceb9	users:edit	Edit Users	Users	Modify user details and roles
c59773f2-6dc0-4d43-97e1-67a3a7d10fc6	users:delete	Delete Users	Users	Remove users
4bf093c8-f9bc-4376-af70-fe118a91f8f3	org:settings	Manage Settings	Organization	Manage main organization settings
e432886c-8e00-4599-b078-2315a2b48631	reports:view	View Reports	Reports	Access system reports and analytics
f50136cf-f9e7-4c30-9ba7-093cc01bd91e	devices:view	View Devices	Devices	View device inventory
3b903412-dfb0-41b3-b66e-407bbe864927	devices:provision	Provision Devices	Devices	Add and setup new devices
b7401097-30b9-496d-93bc-2ebd53d5505c	devices:control	Control Devices	Devices	Execute remote commands
\.


--
-- TOC entry 5360 (class 0 OID 26842)
-- Dependencies: 232
-- Data for Name: sps_role_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_role_assignments (id, user_id, role, org_id, event_id, dept_id, service_id, created_at) FROM stdin;
9f5276c4-eace-41bc-8b79-9be0cd00e16e	22222222-2222-2222-2222-222222222222	SUPER_ADMIN	\N	\N	\N	\N	2025-12-30 18:20:24.336991+05:30
bfba3743-7e65-40c3-bcc7-89eda9a2e8b7	e7457438-ff74-4d94-a45c-73247426883b	ORG_ADMIN	63decf49-889d-4702-9daa-1e0204253f11	\N	\N	\N	2025-12-31 15:32:05.899909+05:30
e74fc4db-efa3-4933-868e-721dcb8e38a3	8ff82b9f-ee08-4679-8252-9a84a015c1d6	EVENT_MANAGER	63decf49-889d-4702-9daa-1e0204253f11	\N	\N	\N	2026-01-01 15:41:19.464166+05:30
3ee3a765-6918-472d-b527-bbf1a7246568	42e505df-7221-4590-a4ca-33365e145df6	EVENT_MANAGER	63decf49-889d-4702-9daa-1e0204253f11	\N	\N	\N	2026-01-01 15:41:43.834409+05:30
12e2abc1-3653-4a31-b333-54e18ca2d019	8e9988be-8add-464a-ac5e-0c9dcb936e1e	EVENT_MANAGER	63decf49-889d-4702-9daa-1e0204253f11	\N	\N	\N	2026-01-01 16:10:03.964158+05:30
c3abfd3e-ffc8-4948-8db7-3b2dc1592d92	e661a816-85ef-421f-a942-f4ec62dc81ab	EVENT_MANAGER	63decf49-889d-4702-9daa-1e0204253f11	\N	\N	\N	2026-01-01 16:41:40.327361+05:30
e45835e3-a917-4786-8692-509f0caa74d7	56115403-a742-4519-a7da-ef2865bba2e6	ORG_ADMIN	5ceaf041-d66d-4805-8d70-c7bf5cfade94	\N	\N	\N	2026-01-02 21:28:48.792288+05:30
\.


--
-- TOC entry 5363 (class 0 OID 26924)
-- Dependencies: 235
-- Data for Name: sps_role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_role_permissions (role_code, permission_code) FROM stdin;
VIEWER	events:view
VIEWER	devices:view
VIEWER	reports:view
TECHNICIAN	devices:control
TECHNICIAN	devices:provision
TECHNICIAN	devices:view
ORG_ADMIN	org:settings
ORG_ADMIN	reports:view
ORG_ADMIN	devices:view
ORG_ADMIN	devices:provision
ORG_ADMIN	devices:control
ORG_ADMIN	users:create
ORG_ADMIN	users:delete
ORG_ADMIN	users:edit
ORG_ADMIN	users:view
ORG_ADMIN	events:delete
ORG_ADMIN	events:edit
ORG_ADMIN	events:manage_manager
ORG_ADMIN	events:create
ORG_ADMIN	events:view
EVENT_MANAGER	reports:view
EVENT_MANAGER	events:edit
EVENT_MANAGER	events:manage_manager
EVENT_MANAGER	events:view
EVENT_MANAGER	devices:control
EVENT_MANAGER	devices:provision
EVENT_MANAGER	devices:view
EVENT_MANAGER	users:create
EVENT_MANAGER	users:delete
EVENT_MANAGER	users:edit
EVENT_MANAGER	users:view
\.


--
-- TOC entry 5356 (class 0 OID 26762)
-- Dependencies: 228
-- Data for Name: sps_service_definitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_service_definitions (id, name, code_key, description, config_schema, required_permissions, is_public, created_at) FROM stdin;
2eacd859-b4fd-480f-b37a-78e4fcd13276	Water Wall Monitor	SVC_WATER_WALL	Monitor water flow and quality in real-time	{"thresholds": {"ph": "number", "flow": "number"}}	[]	t	2025-12-30 18:20:24.336991+05:30
91039c3e-8fb6-493b-94ed-b075dab061d2	AI Crowd Counter	SVC_AI_CROWD	Computer vision based people counting	{"camera_ip": "string", "max_capacity": "number"}	[]	t	2025-12-30 18:20:24.336991+05:30
91057752-7c78-4649-b2e7-efb21fbeebba	Utility Energy Tracker	SVC_ENERGY_TRACK	Smart meter reading and anomaly detection	{"voltage_limit": "number"}	[]	t	2025-12-30 18:20:24.336991+05:30
\.


--
-- TOC entry 5367 (class 0 OID 27048)
-- Dependencies: 239
-- Data for Name: sps_service_device_models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_service_device_models (service_id, device_model_id, role, min_count, max_count) FROM stdin;
a9a0ed13-28fb-4233-b24e-6ba14f51dac9	SPS_WW01	main	1	\N
\.


--
-- TOC entry 5368 (class 0 OID 27067)
-- Dependencies: 240
-- Data for Name: sps_service_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_service_subscriptions (id, service_id, organization_id, status, config_override, valid_until, assigned_at, assigned_by) FROM stdin;
\.


--
-- TOC entry 5365 (class 0 OID 27003)
-- Dependencies: 237
-- Data for Name: sps_service_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_service_templates (id, name, description, scope, config, is_public_dashboard_supported, created_by, created_at, updated_at, main_dashboard_layout, public_dashboard_layout) FROM stdin;
a9a0ed13-28fb-4233-b24e-6ba14f51dac9	water wall	Monitor water walls total liters dispense, bottles avoided , and co2 saved	INTERNAL	{}	t	22222222-2222-2222-2222-222222222222	2026-01-02 21:47:04.907504+05:30	2026-01-03 18:10:06.587512+05:30	{"widgets": []}	{"widgets": []}
\.


--
-- TOC entry 5357 (class 0 OID 26782)
-- Dependencies: 229
-- Data for Name: sps_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_services (id, department_id, definition_id, name, config, status, assigned_supervisor_id, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5351 (class 0 OID 26655)
-- Dependencies: 223
-- Data for Name: sps_system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_system_settings (id, category, site_title, site_logo, maintenance_mode, default_timezone, account_lock_duration_minutes, token_expire_minutes, max_login_attempts, session_timeout_enabled, support_email, support_phone, global_alert_message, updated_at, created_at) FROM stdin;
sps_main_config	global	SustainPro	\N	f	Asia/Colombo	15	60	5	t	help@sps.com	+94 11 234 5678	\N	2025-12-30 22:35:11.499124+05:30	2025-12-30 18:20:24.336991+05:30
\.


--
-- TOC entry 5374 (class 0 OID 27242)
-- Dependencies: 246
-- Data for Name: sps_task_evidence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_task_evidence (id, task_id, file_url, file_type, uploaded_by, notes, gps_lat, gps_lng, created_at) FROM stdin;
\.


--
-- TOC entry 5373 (class 0 OID 27222)
-- Dependencies: 245
-- Data for Name: sps_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_tasks (id, organization_id, alert_id, title, description, assigned_to, status, priority, due_date, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5353 (class 0 OID 26700)
-- Dependencies: 225
-- Data for Name: sps_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sps_users (id, organization_id, code, email, password_hash, full_name, timezone, is_active, is_super_admin, failed_login_attempts, account_locked_until, last_login, created_at, updated_at) FROM stdin;
56115403-a742-4519-a7da-ef2865bba2e6	5ceaf041-d66d-4805-8d70-c7bf5cfade94	SPS-USR-002	miguelc@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$MiWfGJM5H05UmhLhyKeZ0A$1VcdTS2HwkjCiVfAt+U1HJzFQLEr3FY2JVcoiFsF4Go	Miguel Casendro	Asia/Dubai	t	f	0	\N	2026-01-03 18:18:21.127103+05:30	2026-01-02 21:28:48.792288+05:30	2026-01-02 21:28:48.792288+05:30
8ff82b9f-ee08-4679-8252-9a84a015c1d6	63decf49-889d-4702-9daa-1e0204253f11	USR-004	qwe@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$xvcUYl7fUuTESwXJzi57WA$ooLdzG/g/+ShuH8SFU1iCgKBNC3G18PiajFg0Ms8/RY	qwe	UTC	t	f	0	\N	\N	2026-01-01 15:41:19.464166+05:30	2026-01-01 15:41:19.464166+05:30
42e505df-7221-4590-a4ca-33365e145df6	63decf49-889d-4702-9daa-1e0204253f11	USR-005	ddqe@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$8FV9XHyFFoavx15Hrc7wiA$VbwH0oYvmFzDfsi+yqyhyQavYV3qYlq066ESiMxDMV4	ddqe	UTC	t	f	0	\N	\N	2026-01-01 15:41:43.834409+05:30	2026-01-01 15:41:43.834409+05:30
8e9988be-8add-464a-ac5e-0c9dcb936e1e	63decf49-889d-4702-9daa-1e0204253f11	USR-006	sara@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$2Beed37Hn22bMUUHLKg8Nw$QMvrQbwd8kjPZJnZpHFD9eTUkL3LQWgKxhzo2UzUkbE	Sara Coner	UTC	t	f	0	\N	\N	2026-01-01 16:10:03.964158+05:30	2026-01-01 16:10:03.964158+05:30
e661a816-85ef-421f-a942-f4ec62dc81ab	63decf49-889d-4702-9daa-1e0204253f11	USR-007	khabib @gmail.com	$argon2id$v=19$m=65536,t=3,p=4$2MPh1tueRAb6Eb9y+EAsIw$SDvjnJ4HhnLJztXf9wqtvEhpSmADW70IIg9gJ5S5UBo	khabib 	UTC	t	f	0	\N	\N	2026-01-01 16:41:40.327361+05:30	2026-01-01 16:41:40.327361+05:30
22222222-2222-2222-2222-222222222222	\N	SPS-USR-000	elcoanlanka@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$WqMQDbB2v4lkpAprHRq2tg$O/PxCVphD7FwSW7TD8uaLSxf+AH6LlCUzmG7lO4b0U4	Tharindu 98	Asia/Colombo	t	t	0	\N	2026-01-04 19:04:52.198096+05:30	2025-12-30 18:20:24.336991+05:30	2025-12-30 18:20:24.336991+05:30
e7457438-ff74-4d94-a45c-73247426883b	63decf49-889d-4702-9daa-1e0204253f11	SPS-USR-001	avtmadushan@gmail.com	$argon2id$v=19$m=65536,t=3,p=4$nR4JdmLFMNeHZs53AGnw5A$el2Flt9MEC9WelKuQ5SSfhZdm3FMC9JCEGRz3xXK6Kg	Tharindu Madushan	Asia/Dubai	t	f	0	\N	2026-01-03 18:08:24.922642+05:30	2025-12-31 15:32:05.899909+05:30	2025-12-31 15:32:05.899909+05:30
\.


--
-- TOC entry 5397 (class 0 OID 0)
-- Dependencies: 230
-- Name: sps_devices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sps_devices_id_seq', 17, true);


--
-- TOC entry 5164 (class 2606 OID 27202)
-- Name: sps_alert_rules sps_alert_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_alert_rules
    ADD CONSTRAINT sps_alert_rules_pkey PRIMARY KEY (id);


--
-- TOC entry 5166 (class 2606 OID 27216)
-- Name: sps_alerts sps_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_alerts
    ADD CONSTRAINT sps_alerts_pkey PRIMARY KEY (id);


--
-- TOC entry 5124 (class 2606 OID 26889)
-- Name: sps_audit_logs sps_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_audit_logs
    ADD CONSTRAINT sps_audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5142 (class 2606 OID 27040)
-- Name: sps_dashboard_templates sps_dashboard_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_dashboard_templates
    ADD CONSTRAINT sps_dashboard_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5144 (class 2606 OID 27042)
-- Name: sps_dashboard_templates sps_dashboard_templates_service_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_dashboard_templates
    ADD CONSTRAINT sps_dashboard_templates_service_id_key UNIQUE (service_id);


--
-- TOC entry 5160 (class 2606 OID 27163)
-- Name: sps_department_service_devices sps_department_service_device_department_service_id_device__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_service_devices
    ADD CONSTRAINT sps_department_service_device_department_service_id_device__key UNIQUE (department_service_id, device_id);


--
-- TOC entry 5162 (class 2606 OID 27161)
-- Name: sps_department_service_devices sps_department_service_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_service_devices
    ADD CONSTRAINT sps_department_service_devices_pkey PRIMARY KEY (id);


--
-- TOC entry 5154 (class 2606 OID 27112)
-- Name: sps_department_services sps_department_services_department_id_service_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_services
    ADD CONSTRAINT sps_department_services_department_id_service_id_key UNIQUE (department_id, service_id);


--
-- TOC entry 5156 (class 2606 OID 27110)
-- Name: sps_department_services sps_department_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_services
    ADD CONSTRAINT sps_department_services_pkey PRIMARY KEY (id);


--
-- TOC entry 5134 (class 2606 OID 26955)
-- Name: sps_department_templates sps_department_templates_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_templates
    ADD CONSTRAINT sps_department_templates_organization_id_name_key UNIQUE (organization_id, name);


--
-- TOC entry 5136 (class 2606 OID 26953)
-- Name: sps_department_templates sps_department_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_templates
    ADD CONSTRAINT sps_department_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5099 (class 2606 OID 26751)
-- Name: sps_departments sps_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_departments
    ADD CONSTRAINT sps_departments_pkey PRIMARY KEY (id);


--
-- TOC entry 5072 (class 2606 OID 16466)
-- Name: sps_device_models sps_device_models_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_device_models
    ADD CONSTRAINT sps_device_models_name_key UNIQUE (name);


--
-- TOC entry 5074 (class 2606 OID 16464)
-- Name: sps_device_models sps_device_models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_device_models
    ADD CONSTRAINT sps_device_models_pkey PRIMARY KEY (id);


--
-- TOC entry 5114 (class 2606 OID 26831)
-- Name: sps_devices sps_devices_api_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_devices
    ADD CONSTRAINT sps_devices_api_key_key UNIQUE (api_key);


--
-- TOC entry 5116 (class 2606 OID 26829)
-- Name: sps_devices sps_devices_device_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_devices
    ADD CONSTRAINT sps_devices_device_code_key UNIQUE (device_code);


--
-- TOC entry 5118 (class 2606 OID 26827)
-- Name: sps_devices sps_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_devices
    ADD CONSTRAINT sps_devices_pkey PRIMARY KEY (id);


--
-- TOC entry 5094 (class 2606 OID 26937)
-- Name: sps_events sps_events_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_events
    ADD CONSTRAINT sps_events_code_key UNIQUE (code);


--
-- TOC entry 5096 (class 2606 OID 26736)
-- Name: sps_events sps_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_events
    ADD CONSTRAINT sps_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5078 (class 2606 OID 26699)
-- Name: sps_organizations sps_organizations_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_organizations
    ADD CONSTRAINT sps_organizations_code_key UNIQUE (code);


--
-- TOC entry 5080 (class 2606 OID 26695)
-- Name: sps_organizations sps_organizations_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_organizations
    ADD CONSTRAINT sps_organizations_name_key UNIQUE (name);


--
-- TOC entry 5082 (class 2606 OID 26693)
-- Name: sps_organizations sps_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_organizations
    ADD CONSTRAINT sps_organizations_pkey PRIMARY KEY (id);


--
-- TOC entry 5084 (class 2606 OID 26697)
-- Name: sps_organizations sps_organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_organizations
    ADD CONSTRAINT sps_organizations_slug_key UNIQUE (slug);


--
-- TOC entry 5126 (class 2606 OID 26923)
-- Name: sps_permissions sps_permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_permissions
    ADD CONSTRAINT sps_permissions_code_key UNIQUE (code);


--
-- TOC entry 5128 (class 2606 OID 26921)
-- Name: sps_permissions sps_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_permissions
    ADD CONSTRAINT sps_permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5121 (class 2606 OID 26852)
-- Name: sps_role_assignments sps_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_role_assignments
    ADD CONSTRAINT sps_role_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5130 (class 2606 OID 26930)
-- Name: sps_role_permissions sps_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_role_permissions
    ADD CONSTRAINT sps_role_permissions_pkey PRIMARY KEY (role_code, permission_code);


--
-- TOC entry 5101 (class 2606 OID 26781)
-- Name: sps_service_definitions sps_service_definitions_code_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_definitions
    ADD CONSTRAINT sps_service_definitions_code_key_key UNIQUE (code_key);


--
-- TOC entry 5103 (class 2606 OID 26779)
-- Name: sps_service_definitions sps_service_definitions_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_definitions
    ADD CONSTRAINT sps_service_definitions_name_key UNIQUE (name);


--
-- TOC entry 5105 (class 2606 OID 26777)
-- Name: sps_service_definitions sps_service_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_definitions
    ADD CONSTRAINT sps_service_definitions_pkey PRIMARY KEY (id);


--
-- TOC entry 5146 (class 2606 OID 27056)
-- Name: sps_service_device_models sps_service_device_models_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_device_models
    ADD CONSTRAINT sps_service_device_models_pkey PRIMARY KEY (service_id, device_model_id);


--
-- TOC entry 5148 (class 2606 OID 27079)
-- Name: sps_service_subscriptions sps_service_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_subscriptions
    ADD CONSTRAINT sps_service_subscriptions_pkey PRIMARY KEY (id);


--
-- TOC entry 5150 (class 2606 OID 27081)
-- Name: sps_service_subscriptions sps_service_subscriptions_service_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_subscriptions
    ADD CONSTRAINT sps_service_subscriptions_service_id_organization_id_key UNIQUE (service_id, organization_id);


--
-- TOC entry 5138 (class 2606 OID 27020)
-- Name: sps_service_templates sps_service_templates_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_templates
    ADD CONSTRAINT sps_service_templates_name_key UNIQUE (name);


--
-- TOC entry 5140 (class 2606 OID 27018)
-- Name: sps_service_templates sps_service_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_templates
    ADD CONSTRAINT sps_service_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 5108 (class 2606 OID 26796)
-- Name: sps_services sps_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_services
    ADD CONSTRAINT sps_services_pkey PRIMARY KEY (id);


--
-- TOC entry 5076 (class 2606 OID 26673)
-- Name: sps_system_settings sps_system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_system_settings
    ADD CONSTRAINT sps_system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5170 (class 2606 OID 27253)
-- Name: sps_task_evidence sps_task_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_task_evidence
    ADD CONSTRAINT sps_task_evidence_pkey PRIMARY KEY (id);


--
-- TOC entry 5168 (class 2606 OID 27236)
-- Name: sps_tasks sps_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_tasks
    ADD CONSTRAINT sps_tasks_pkey PRIMARY KEY (id);


--
-- TOC entry 5087 (class 2606 OID 26718)
-- Name: sps_users sps_users_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_users
    ADD CONSTRAINT sps_users_code_key UNIQUE (code);


--
-- TOC entry 5089 (class 2606 OID 26720)
-- Name: sps_users sps_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_users
    ADD CONSTRAINT sps_users_email_key UNIQUE (email);


--
-- TOC entry 5091 (class 2606 OID 26716)
-- Name: sps_users sps_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_users
    ADD CONSTRAINT sps_users_pkey PRIMARY KEY (id);


--
-- TOC entry 5122 (class 1259 OID 26906)
-- Name: idx_audit_org_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_org_date ON public.sps_audit_logs USING btree (organization_id, created_at DESC);


--
-- TOC entry 5157 (class 1259 OID 27174)
-- Name: idx_dept_service_devices_dept_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dept_service_devices_dept_service ON public.sps_department_service_devices USING btree (department_service_id);


--
-- TOC entry 5158 (class 1259 OID 27175)
-- Name: idx_dept_service_devices_device; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dept_service_devices_device ON public.sps_department_service_devices USING btree (device_id);


--
-- TOC entry 5151 (class 1259 OID 27123)
-- Name: idx_dept_services_dept; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dept_services_dept ON public.sps_department_services USING btree (department_id);


--
-- TOC entry 5152 (class 1259 OID 27124)
-- Name: idx_dept_services_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dept_services_service ON public.sps_department_services USING btree (service_id);


--
-- TOC entry 5131 (class 1259 OID 26962)
-- Name: idx_dept_templates_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dept_templates_active ON public.sps_department_templates USING btree (is_active);


--
-- TOC entry 5132 (class 1259 OID 26961)
-- Name: idx_dept_templates_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dept_templates_org ON public.sps_department_templates USING btree (organization_id);


--
-- TOC entry 5097 (class 1259 OID 26902)
-- Name: idx_depts_event; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_depts_event ON public.sps_departments USING btree (event_id);


--
-- TOC entry 5070 (class 1259 OID 16472)
-- Name: idx_device_models_parameters; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_device_models_parameters ON public.sps_device_models USING gin (parameters);


--
-- TOC entry 5109 (class 1259 OID 27183)
-- Name: idx_devices_aws_certificate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_aws_certificate_id ON public.sps_devices USING btree (aws_certificate_id);


--
-- TOC entry 5110 (class 1259 OID 27182)
-- Name: idx_devices_aws_thing_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_aws_thing_name ON public.sps_devices USING btree (aws_thing_name);


--
-- TOC entry 5111 (class 1259 OID 27260)
-- Name: idx_devices_hardware_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_hardware_id ON public.sps_devices USING btree (hardware_id);


--
-- TOC entry 5112 (class 1259 OID 26904)
-- Name: idx_devices_service; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_devices_service ON public.sps_devices USING btree (service_id);


--
-- TOC entry 5092 (class 1259 OID 26901)
-- Name: idx_events_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_org ON public.sps_events USING btree (organization_id);


--
-- TOC entry 5119 (class 1259 OID 26905)
-- Name: idx_role_assign_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_assign_user ON public.sps_role_assignments USING btree (user_id);


--
-- TOC entry 5106 (class 1259 OID 26903)
-- Name: idx_services_dept; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_dept ON public.sps_services USING btree (department_id);


--
-- TOC entry 5085 (class 1259 OID 26900)
-- Name: idx_users_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_org ON public.sps_users USING btree (organization_id);


--
-- TOC entry 5200 (class 2606 OID 27217)
-- Name: sps_alerts sps_alerts_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_alerts
    ADD CONSTRAINT sps_alerts_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.sps_alert_rules(id);


--
-- TOC entry 5185 (class 2606 OID 26895)
-- Name: sps_audit_logs sps_audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_audit_logs
    ADD CONSTRAINT sps_audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.sps_users(id);


--
-- TOC entry 5186 (class 2606 OID 26890)
-- Name: sps_audit_logs sps_audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_audit_logs
    ADD CONSTRAINT sps_audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.sps_organizations(id);


--
-- TOC entry 5190 (class 2606 OID 27043)
-- Name: sps_dashboard_templates sps_dashboard_templates_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_dashboard_templates
    ADD CONSTRAINT sps_dashboard_templates_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.sps_service_templates(id) ON DELETE CASCADE;


--
-- TOC entry 5198 (class 2606 OID 27164)
-- Name: sps_department_service_devices sps_department_service_devices_department_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_service_devices
    ADD CONSTRAINT sps_department_service_devices_department_service_id_fkey FOREIGN KEY (department_service_id) REFERENCES public.sps_department_services(id) ON DELETE CASCADE;


--
-- TOC entry 5199 (class 2606 OID 27169)
-- Name: sps_department_service_devices sps_department_service_devices_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_service_devices
    ADD CONSTRAINT sps_department_service_devices_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.sps_devices(id) ON DELETE CASCADE;


--
-- TOC entry 5196 (class 2606 OID 27113)
-- Name: sps_department_services sps_department_services_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_services
    ADD CONSTRAINT sps_department_services_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.sps_departments(id) ON DELETE CASCADE;


--
-- TOC entry 5197 (class 2606 OID 27118)
-- Name: sps_department_services sps_department_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_services
    ADD CONSTRAINT sps_department_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.sps_service_templates(id) ON DELETE CASCADE;


--
-- TOC entry 5188 (class 2606 OID 26956)
-- Name: sps_department_templates sps_department_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_department_templates
    ADD CONSTRAINT sps_department_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.sps_organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5173 (class 2606 OID 26752)
-- Name: sps_departments sps_departments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_departments
    ADD CONSTRAINT sps_departments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.sps_events(id) ON DELETE CASCADE;


--
-- TOC entry 5174 (class 2606 OID 26757)
-- Name: sps_departments sps_departments_head_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_departments
    ADD CONSTRAINT sps_departments_head_user_id_fkey FOREIGN KEY (head_user_id) REFERENCES public.sps_users(id);


--
-- TOC entry 5178 (class 2606 OID 26832)
-- Name: sps_devices sps_devices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_devices
    ADD CONSTRAINT sps_devices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.sps_organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5179 (class 2606 OID 27176)
-- Name: sps_devices sps_devices_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_devices
    ADD CONSTRAINT sps_devices_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.sps_department_services(id) ON DELETE SET NULL;


--
-- TOC entry 5172 (class 2606 OID 26737)
-- Name: sps_events sps_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_events
    ADD CONSTRAINT sps_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.sps_organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5180 (class 2606 OID 26868)
-- Name: sps_role_assignments sps_role_assignments_dept_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_role_assignments
    ADD CONSTRAINT sps_role_assignments_dept_id_fkey FOREIGN KEY (dept_id) REFERENCES public.sps_departments(id) ON DELETE CASCADE;


--
-- TOC entry 5181 (class 2606 OID 26863)
-- Name: sps_role_assignments sps_role_assignments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_role_assignments
    ADD CONSTRAINT sps_role_assignments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.sps_events(id) ON DELETE CASCADE;


--
-- TOC entry 5182 (class 2606 OID 26858)
-- Name: sps_role_assignments sps_role_assignments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_role_assignments
    ADD CONSTRAINT sps_role_assignments_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.sps_organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5183 (class 2606 OID 26873)
-- Name: sps_role_assignments sps_role_assignments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_role_assignments
    ADD CONSTRAINT sps_role_assignments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.sps_services(id) ON DELETE CASCADE;


--
-- TOC entry 5184 (class 2606 OID 26853)
-- Name: sps_role_assignments sps_role_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_role_assignments
    ADD CONSTRAINT sps_role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.sps_users(id) ON DELETE CASCADE;


--
-- TOC entry 5187 (class 2606 OID 26931)
-- Name: sps_role_permissions sps_role_permissions_permission_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_role_permissions
    ADD CONSTRAINT sps_role_permissions_permission_code_fkey FOREIGN KEY (permission_code) REFERENCES public.sps_permissions(code) ON DELETE CASCADE;


--
-- TOC entry 5191 (class 2606 OID 27062)
-- Name: sps_service_device_models sps_service_device_models_device_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_device_models
    ADD CONSTRAINT sps_service_device_models_device_model_id_fkey FOREIGN KEY (device_model_id) REFERENCES public.sps_device_models(id) ON DELETE CASCADE;


--
-- TOC entry 5192 (class 2606 OID 27057)
-- Name: sps_service_device_models sps_service_device_models_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_device_models
    ADD CONSTRAINT sps_service_device_models_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.sps_service_templates(id) ON DELETE CASCADE;


--
-- TOC entry 5193 (class 2606 OID 27092)
-- Name: sps_service_subscriptions sps_service_subscriptions_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_subscriptions
    ADD CONSTRAINT sps_service_subscriptions_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.sps_users(id);


--
-- TOC entry 5194 (class 2606 OID 27087)
-- Name: sps_service_subscriptions sps_service_subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_subscriptions
    ADD CONSTRAINT sps_service_subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.sps_organizations(id) ON DELETE CASCADE;


--
-- TOC entry 5195 (class 2606 OID 27082)
-- Name: sps_service_subscriptions sps_service_subscriptions_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_subscriptions
    ADD CONSTRAINT sps_service_subscriptions_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.sps_service_templates(id);


--
-- TOC entry 5189 (class 2606 OID 27021)
-- Name: sps_service_templates sps_service_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_service_templates
    ADD CONSTRAINT sps_service_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sps_users(id);


--
-- TOC entry 5175 (class 2606 OID 26807)
-- Name: sps_services sps_services_assigned_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_services
    ADD CONSTRAINT sps_services_assigned_supervisor_id_fkey FOREIGN KEY (assigned_supervisor_id) REFERENCES public.sps_users(id);


--
-- TOC entry 5176 (class 2606 OID 26802)
-- Name: sps_services sps_services_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_services
    ADD CONSTRAINT sps_services_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES public.sps_service_definitions(id);


--
-- TOC entry 5177 (class 2606 OID 26797)
-- Name: sps_services sps_services_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_services
    ADD CONSTRAINT sps_services_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.sps_departments(id) ON DELETE CASCADE;


--
-- TOC entry 5202 (class 2606 OID 27254)
-- Name: sps_task_evidence sps_task_evidence_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_task_evidence
    ADD CONSTRAINT sps_task_evidence_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.sps_tasks(id) ON DELETE CASCADE;


--
-- TOC entry 5201 (class 2606 OID 27237)
-- Name: sps_tasks sps_tasks_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_tasks
    ADD CONSTRAINT sps_tasks_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.sps_alerts(id);


--
-- TOC entry 5171 (class 2606 OID 26721)
-- Name: sps_users sps_users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sps_users
    ADD CONSTRAINT sps_users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.sps_organizations(id) ON DELETE CASCADE;


-- Completed on 2026-01-04 20:09:36

--
-- PostgreSQL database dump complete
--

\unrestrict sexyKbtVBIwuAwBa2N678olBTqAkgLI1AKeZxJ9vmz73NDAjhO8OmzEnTsbAvp5

