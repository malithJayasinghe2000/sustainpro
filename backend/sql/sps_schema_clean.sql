--
-- PostgreSQL database dump
-- Cleaned version for pgAdmin execution
--
-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1
--
-- Schema Only - No Data
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

-- End of Schema Definition
-- Use sample_data.sql to populate tables with test data

