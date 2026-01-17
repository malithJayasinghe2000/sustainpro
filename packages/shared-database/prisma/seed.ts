/**
 * Prisma Seeder for SustainPro
 * Best Practice: Uses Prisma client for type-safe seeding with proper password hashing
 * Run: npm run prisma:seed
 */


// if not get env 

// $env:DATABASE_URL="postgresql://sustainpro:sustainpro_dev@localhost:5432/sustainpro"; npx prisma studio

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// Default password for all demo users (should be changed in production)
const DEFAULT_PASSWORD = 'Admin@123';

async function hashPassword(password: string): Promise<string> {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });
}

async function main() {
    console.log('🌱 Starting database seeding...\n');

    const passwordHash = await hashPassword(DEFAULT_PASSWORD);

    // ==================================================================================
    // 1. SYSTEM SETTINGS & CONFIGURATION
    // ==================================================================================
    console.log('📝 Seeding system settings and configurations...');

    // Global System Settings
    await prisma.sps_system_settings.upsert({
        where: { id: 'sps_main_config' },
        update: {},
        create: {
            id: 'sps_main_config',
            system_name: 'SustainPro',
            site_title: 'SustainPro IoT Platform',
            site_tagline: 'Smart Sustainability Management',
            primary_color: '#3B82F6',
            secondary_color: '#10B981',
            default_timezone: 'Asia/Dubai',
            default_language: 'en',
            date_format: 'DD/MM/YYYY',
            time_format: 'HH:mm:ss',
            datetime_format: 'DD/MM/YYYY HH:mm:ss',
            first_day_of_week: 0,
            maintenance_mode: false,
            support_email: 'support@sustainpro.io',
            support_phone: '+971 4 123 4567',
            support_url: 'https://support.sustainpro.io',
            meta_description: 'SustainPro - IoT Platform for Smart Sustainability Management',
        },
    });

    // Password Policies
    console.log('🔑 Seeding password policies...');
    await prisma.sps_password_policies.upsert({
        where: { id: 'sps_password_policy' },
        update: {},
        create: {
            id: 'sps_password_policy',
            min_length: 8,
            max_length: 128,
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_special_chars: true,
            special_chars_allowed: '!@#$%^&*()_+-=[]{}|;:,.<>?',
            password_expires: false,
            password_expiry_days: 90,
            expiry_warning_days: 14,
            prevent_reuse: true,
            reuse_prevention_count: 5,
            require_change_on_first_login: true,
            min_password_age_hours: 0,
        },
    });

    // Session Policies
    console.log('⏱️ Seeding session policies...');
    await prisma.sps_session_policies.upsert({
        where: { id: 'sps_session_policy' },
        update: {},
        create: {
            id: 'sps_session_policy',
            session_timeout_enabled: true,
            session_timeout_minutes: 60,
            idle_timeout_enabled: true,
            idle_timeout_minutes: 30,
            max_concurrent_sessions: 5,
            enforce_single_session: false,
            access_token_expire_minutes: 60,
            refresh_token_expire_days: 7,
            remember_me_expire_days: 30,
            bind_session_to_ip: false,
            bind_session_to_user_agent: false,
            regenerate_session_on_login: true,
        },
    });

    // Login Policies
    console.log('🔐 Seeding login policies...');
    await prisma.sps_login_policies.upsert({
        where: { id: 'sps_login_policy' },
        update: {},
        create: {
            id: 'sps_login_policy',
            max_login_attempts: 5,
            lockout_duration_minutes: 30,
            progressive_lockout: true,
            progressive_lockout_multiplier: 2.0,
            max_lockout_duration_minutes: 1440,
            enable_captcha: false,
            captcha_after_attempts: 3,
            captcha_provider: 'RECAPTCHA',
            enable_ip_blocking: true,
            ip_block_threshold: 10,
            ip_block_duration_minutes: 60,
            notify_on_lockout: true,
            notify_on_new_device_login: true,
            notify_on_password_change: true,
        },
    });

    // Two-Factor Authentication Config
    console.log('📱 Seeding 2FA configuration...');
    await prisma.sps_two_factor_config.upsert({
        where: { id: 'sps_2fa_config' },
        update: {},
        create: {
            id: 'sps_2fa_config',
            enabled: true,
            enforce_globally: false,
            enforce_for_admins: true,
            grace_period_days: 7,
            email_method_enabled: true,
            sms_method_enabled: false,
            totp_method_enabled: true,
            email_otp_length: 6,
            email_otp_expiry_minutes: 10,
            email_otp_max_attempts: 3,
            sms_otp_length: 6,
            sms_otp_expiry_minutes: 5,
            sms_otp_max_attempts: 3,
            totp_issuer: 'SustainPro',
            totp_algorithm: 'SHA1',
            totp_digits: 6,
            totp_period: 30,
            recovery_codes_enabled: true,
            recovery_codes_count: 10,
        },
    });

    // API Security Config
    console.log('🛡️ Seeding API security configuration...');
    await prisma.sps_api_security_config.upsert({
        where: { id: 'sps_api_security' },
        update: {},
        create: {
            id: 'sps_api_security',
            rate_limit_enabled: true,
            rate_limit_requests: 100,
            rate_limit_window_minutes: 1,
            rate_limit_by: 'IP',
            api_key_enabled: true,
            api_key_expiry_days: 365,
            api_key_max_per_user: 5,
            api_key_require_ip_whitelist: false,
            cors_enabled: true,
            cors_allowed_origins: '*',
            cors_allowed_methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            cors_allowed_headers: 'Content-Type,Authorization,X-API-Key',
            cors_max_age_seconds: 86400,
            cors_allow_credentials: true,
            api_versioning_enabled: true,
            current_api_version: 'v1',
            supported_versions: 'v1',
            deprecation_warning_enabled: true,
            max_request_body_size_mb: 10,
            request_timeout_seconds: 30,
            enable_security_headers: true,
            hsts_enabled: true,
            hsts_max_age_seconds: 31536000,
        },
    });

    // SMTP Settings
    console.log('Seeding SMTP settings...');
    await prisma.sps_smtp_settings.upsert({
        where: { id: 'sps_smtp_config' },
        update: {},
        create: {
            id: 'sps_smtp_config',
            smtp_enabled: true,
            smtp_host: 'smtp.example.com',
            smtp_port: 587,
            smtp_username: '',
            smtp_password: '',
            smtp_encryption: 'TLS',
            smtp_timeout_seconds: 30,
            from_email: 'noreply@sustainpro.io',
            from_name: 'SustainPro',
            reply_to_email: 'support@sustainpro.io',
            max_emails_per_hour: 100,
            max_emails_per_day: 1000,
            max_recipients_per_email: 50,
            test_mode: false,
        },
    });

    // Notification Settings
    console.log('🔔 Seeding notification settings...');
    await prisma.sps_notification_settings.upsert({
        where: { id: 'sps_notification_config' },
        update: {},
        create: {
            id: 'sps_notification_config',
            email_notifications_enabled: true,
            email_frequency: 'IMMEDIATE',
            email_batch_size: 10,
            email_digest_time: '09:00',
            quiet_hours_enabled: false,
            quiet_hours_start: '22:00',
            quiet_hours_end: '07:00',
            quiet_hours_timezone: 'Asia/Dubai',
            quiet_hours_override_urgent: true,
            in_app_notifications_enabled: true,
            in_app_auto_dismiss_seconds: 5,
            in_app_max_visible: 5,
            push_notifications_enabled: false,
            retention_days: 30,
        },
    });

    // Email Templates
    console.log('📨 Seeding email templates...');
    const emailTemplates = [
        {
            code: 'WELCOME',
            name: 'Welcome Email',
            category: 'SYSTEM',
            description: 'Sent to new users upon account creation',
            subject: 'Welcome to SustainPro - {{userName}}',
            body_html: `
                <h1>Welcome to SustainPro!</h1>
                <p>Dear {{userName}},</p>
                <p>Your account has been created successfully.</p>
                <p>You can log in using your email: <strong>{{userEmail}}</strong></p>
                <p><a href="{{loginUrl}}">Click here to login</a></p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Best regards,<br>The SustainPro Team</p>
            `,
            body_text: 'Welcome to SustainPro! Your account has been created. Login at: {{loginUrl}}',
            available_variables: JSON.stringify(['userName', 'userEmail', 'loginUrl', 'organizationName']),
            is_system_template: true,
        },
        {
            code: 'PASSWORD_RESET',
            name: 'Password Reset',
            category: 'SYSTEM',
            description: 'Sent when a user requests a password reset',
            subject: 'Password Reset Request - SustainPro',
            body_html: `
                <h1>Password Reset Request</h1>
                <p>Dear {{userName}},</p>
                <p>We received a request to reset your password.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{{resetUrl}}">Reset Password</a></p>
                <p>This link will expire in {{expiryMinutes}} minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Best regards,<br>The SustainPro Team</p>
            `,
            body_text: 'Password Reset Request. Reset your password at: {{resetUrl}}. This link expires in {{expiryMinutes}} minutes.',
            available_variables: JSON.stringify(['userName', 'userEmail', 'resetUrl', 'expiryMinutes']),
            is_system_template: true,
        },
        {
            code: '2FA_OTP',
            name: '2FA OTP Email',
            category: 'SYSTEM',
            description: 'Sent for email-based two-factor authentication',
            subject: 'Your Verification Code - SustainPro',
            body_html: `
                <h1>Two-Factor Authentication</h1>
                <p>Dear {{userName}},</p>
                <p>Your verification code is:</p>
                <h2 style="font-size: 32px; letter-spacing: 5px; color: #3B82F6;">{{otpCode}}</h2>
                <p>This code will expire in {{expiryMinutes}} minutes.</p>
                <p>If you did not request this code, please secure your account immediately.</p>
                <p>Best regards,<br>The SustainPro Team</p>
            `,
            body_text: 'Your SustainPro verification code is: {{otpCode}}. This code expires in {{expiryMinutes}} minutes.',
            available_variables: JSON.stringify(['userName', 'otpCode', 'expiryMinutes']),
            is_system_template: true,
        },
        {
            code: 'ALERT_NOTIFICATION',
            name: 'Alert Notification',
            category: 'ALERT',
            description: 'Sent when a new alert is triggered',
            subject: '[{{severity}}] Alert: {{alertName}} - SustainPro',
            body_html: `
                <h1>Alert Notification</h1>
                <p>A new alert has been triggered:</p>
                <table>
                    <tr><td><strong>Alert:</strong></td><td>{{alertName}}</td></tr>
                    <tr><td><strong>Severity:</strong></td><td>{{severity}}</td></tr>
                    <tr><td><strong>Device:</strong></td><td>{{deviceName}}</td></tr>
                    <tr><td><strong>Message:</strong></td><td>{{alertMessage}}</td></tr>
                    <tr><td><strong>Time:</strong></td><td>{{alertTime}}</td></tr>
                </table>
                <p><a href="{{alertUrl}}">View Alert Details</a></p>
            `,
            body_text: '{{severity}} Alert: {{alertName}}. {{alertMessage}}. View at: {{alertUrl}}',
            available_variables: JSON.stringify(['alertName', 'severity', 'deviceName', 'alertMessage', 'alertTime', 'alertUrl']),
            is_system_template: true,
        },
        {
            code: 'TASK_ASSIGNED',
            name: 'Task Assigned',
            category: 'TASK',
            description: 'Sent when a task is assigned to a user',
            subject: 'New Task Assigned: {{taskTitle}} - SustainPro',
            body_html: `
                <h1>New Task Assigned</h1>
                <p>Dear {{userName}},</p>
                <p>A new task has been assigned to you:</p>
                <table>
                    <tr><td><strong>Task:</strong></td><td>{{taskTitle}}</td></tr>
                    <tr><td><strong>Priority:</strong></td><td>{{taskPriority}}</td></tr>
                    <tr><td><strong>Due Date:</strong></td><td>{{dueDate}}</td></tr>
                    <tr><td><strong>Assigned By:</strong></td><td>{{assignedBy}}</td></tr>
                </table>
                <p><a href="{{taskUrl}}">View Task Details</a></p>
            `,
            body_text: 'New Task: {{taskTitle}}. Due: {{dueDate}}. View at: {{taskUrl}}',
            available_variables: JSON.stringify(['userName', 'taskTitle', 'taskPriority', 'dueDate', 'assignedBy', 'taskUrl']),
            is_system_template: true,
        },
        {
            code: 'DAILY_REPORT',
            name: 'Daily Report',
            category: 'REPORT',
            description: 'Daily summary report email',
            subject: 'Daily Report: {{reportDate}} - SustainPro',
            body_html: `
                <h1>Daily Report</h1>
                <p>Here is your daily summary for {{reportDate}}:</p>
                <h2>Alerts Summary</h2>
                <ul>
                    <li>Critical: {{criticalAlerts}}</li>
                    <li>Warning: {{warningAlerts}}</li>
                    <li>Info: {{infoAlerts}}</li>
                </ul>
                <h2>Device Status</h2>
                <ul>
                    <li>Online: {{devicesOnline}}</li>
                    <li>Offline: {{devicesOffline}}</li>
                </ul>
                <p><a href="{{dashboardUrl}}">View Full Dashboard</a></p>
            `,
            body_text: 'Daily Report for {{reportDate}}. Critical: {{criticalAlerts}}, Warnings: {{warningAlerts}}. View dashboard: {{dashboardUrl}}',
            available_variables: JSON.stringify(['reportDate', 'criticalAlerts', 'warningAlerts', 'infoAlerts', 'devicesOnline', 'devicesOffline', 'dashboardUrl']),
            is_system_template: true,
        },
        {
            code: 'ACCOUNT_LOCKED',
            name: 'Account Locked',
            category: 'SYSTEM',
            description: 'Sent when user account is locked due to failed login attempts',
            subject: 'Account Security Alert - SustainPro',
            body_html: `
                <h1>Account Locked</h1>
                <p>Dear {{userName}},</p>
                <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
                <p>Your account will be automatically unlocked after {{lockoutDuration}} minutes.</p>
                <p>If this was not you, please contact support immediately.</p>
                <p>Best regards,<br>The SustainPro Team</p>
            `,
            body_text: 'Your SustainPro account has been locked. It will be unlocked after {{lockoutDuration}} minutes.',
            available_variables: JSON.stringify(['userName', 'lockoutDuration', 'lockoutTime', 'ipAddress']),
            is_system_template: true,
        },
        {
            code: 'EVENT_END_REQUEST',
            name: 'Event End Request',
            category: 'EVENT',
            description: 'Sent to org admins when an event manager requests to end an event',
            subject: 'Event End Request: {{eventName}} - Action Required',
            body_html: `
                <h1>Event End Request</h1>
                <p>Dear {{recipientName}},</p>
                <p>An event manager has requested to end the following event:</p>
                <table style="border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Event:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{eventName}}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Event Code:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{eventCode}}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Requested By:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{requestedByName}}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Request Time:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{requestTime}}</td></tr>
                </table>
                <p>Please review and take action:</p>
                <p style="margin: 20px 0;">
                    <a href="{{eventUrl}}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Event</a>
                </p>
                <p>If you approve, you can end the event from the event details page.</p>
                <p>Best regards,<br>The SustainPro Team</p>
            `,
            body_text: 'Event End Request: {{eventName}}. Requested by {{requestedByName}}. Review at: {{eventUrl}}',
            available_variables: JSON.stringify(['recipientName', 'eventName', 'eventCode', 'requestedByName', 'requestTime', 'eventUrl', 'organizationName']),
            is_system_template: true,
        },
    ];

    for (const template of emailTemplates) {
        await prisma.sps_email_templates.upsert({
            where: { code: template.code },
            update: {},
            create: template as any,
        });
    }

    // ==================================================================================
    // 2. PROVIDER ORGANIZATION
    // ==================================================================================
    console.log('🏢 Seeding provider organization...');
    await prisma.sps_organizations.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'SustainPro Platform',
            slug: 'sustainpro',
            code: 'SPS-ORG-000',
            type: 'PROVIDER',
            description: 'SustainPro IoT Platform Provider',
        },
    });

    // ==================================================================================
    // 3. DEMO CLIENT ORGANIZATION
    // ==================================================================================
    console.log('🏢 Seeding demo client organization...');
    await prisma.sps_organizations.upsert({
        where: { id: '11111111-1111-1111-1111-111111111111' },
        update: {},
        create: {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'ACME Corporation',
            slug: 'acme-corporation',
            code: 'SPS-ORG-001',
            type: 'CLIENT',
            description: 'Leading technology and innovation company',
            logo_url: 'https://via.placeholder.com/200x200?text=ACME',
            plan_tier: 'ENTERPRISE',
            max_users: 50,
            max_devices: 100,
        },
    });

    // ==================================================================================
    // 4. USERS (All with hashed password: Admin@123)
    // ==================================================================================
    console.log('👤 Seeding users with hashed passwords...');

    // Super Admin
    await prisma.sps_users.upsert({
        where: { id: '00000000-0000-0000-0000-000000000002' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000002',
            organization_id: null,
            code: 'SPS-USR-000',
            email: 'superadmin@sustainpro.io',
            password_hash: passwordHash,
            full_name: 'Platform Super Admin',
            is_super_admin: true,
            timezone: 'UTC',
            is_active: true,
        },
    });

    // Org Admin for ACME
    await prisma.sps_users.upsert({
        where: { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
        update: {},
        create: {
            id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            organization_id: '11111111-1111-1111-1111-111111111111',
            code: 'USR-001',
            email: 'admin@acme.com',
            password_hash: passwordHash,
            full_name: 'John Admin',
            is_super_admin: false,
            timezone: 'UTC',
            is_active: true,
        },
    });

    // Manager for ACME
    await prisma.sps_users.upsert({
        where: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
        update: {},
        create: {
            id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            organization_id: '11111111-1111-1111-1111-111111111111',
            code: 'USR-002',
            email: 'manager@acme.com',
            password_hash: passwordHash,
            full_name: 'Jane Manager',
            is_super_admin: false,
            timezone: 'UTC',
            is_active: true,
        },
    });

    // Operator for ACME
    await prisma.sps_users.upsert({
        where: { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
        update: {},
        create: {
            id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            organization_id: '11111111-1111-1111-1111-111111111111',
            code: 'USR-003',
            email: 'operator@acme.com',
            password_hash: passwordHash,
            full_name: 'Bob Operator',
            is_super_admin: false,
            timezone: 'UTC',
            is_active: true,
        },
    });

    // ==================================================================================
    // 5. PERMISSIONS
    // ==================================================================================
    console.log('🔐 Seeding permissions...');

    const permissions = [
        { name: 'View Dashboard', code: 'dashboard.view', description: 'View main dashboard', category: 'dashboard' },
        { name: 'View Devices', code: 'devices.view', description: 'View device list', category: 'devices' },
        { name: 'Manage Devices', code: 'devices.manage', description: 'Create, update, delete devices', category: 'devices' },
        { name: 'View Events', code: 'events.view', description: 'View events', category: 'events' },
        { name: 'Create Events', code: 'events.create', description: 'Create new events', category: 'events' },
        { name: 'Update Event Details', code: 'events.update', description: 'Update event name, location, etc.', category: 'events' },
        { name: 'Update Event Status', code: 'events.status', description: 'Change event status (Active/Archived)', category: 'events' },
        { name: 'End Event', code: 'events.end', description: 'Immediately end an active event', category: 'events' },
        { name: 'Request Event End', code: 'events.endrequest', description: 'Request to end an active event (requires approval)', category: 'events' },
        { name: 'Request Event Delete', code: 'events.deleterequest', description: 'Request to delete an event', category: 'events' },
        { name: 'Delete Events', code: 'events.delete', description: 'Delete events', category: 'events' },
        { name: 'View All Events', code: 'events.view_all', description: 'View all organization events', category: 'events' },
        { name: 'View Users', code: 'users.view', description: 'View user list', category: 'users' },
        { name: 'Manage Users', code: 'users.manage', description: 'Create, update, delete users', category: 'users' },
        { name: 'View Reports', code: 'reports.view', description: 'View analytics and reports', category: 'reports' },
        { name: 'Manage Settings', code: 'settings.manage', description: 'Manage system settings', category: 'settings' },
        { name: 'View Telemetry', code: 'telemetry.view', description: 'View telemetry data', category: 'telemetry' },
        { name: 'Manage Alerts', code: 'alerts.manage', description: 'Create and manage alert rules', category: 'alerts' },
        { name: 'View Audit Logs', code: 'audit.view', description: 'View system audit logs', category: 'audit' },
        { name: 'Export Audit Logs', code: 'audit.export', description: 'Export audit logs to CSV', category: 'audit' },
    ];

    for (const perm of permissions) {
        await prisma.sps_permissions.upsert({
            where: { code: perm.code },
            update: {},
            create: perm,
        });
    }

    // ==================================================================================
    // 5.5 ROLES - Centralized Role Definitions
    // ==================================================================================
    console.log('👔 Seeding roles...');

    const roles = [
        {
            code: 'SUPER_ADMIN',
            name: 'Super Admin',
            description: 'Platform-wide super administrator with full system access',
            level: 0,
            icon: 'ShieldAlert',
            color: '#EF4444',
            is_system: true,
        },
        {
            code: 'ORG_ADMIN',
            name: 'Organization Admin',
            description: 'Full control over a specific organization, its settings, and all sub-resources',
            level: 1,
            icon: 'Building2',
            color: '#8B5CF6',
            is_system: true,
        },
        {
            code: 'EVENT_MANAGER',
            name: 'Event Manager',
            description: 'Manages a specific event, its departments, and services',
            level: 2,
            icon: 'Calendar',
            color: '#3B82F6',
            is_system: true,
        },
        {
            code: 'DEPT_HEAD',
            name: 'Department Head',
            description: 'Oversees a specific department (e.g., Security, Sanitation) within an event',
            level: 3,
            icon: 'Users',
            color: '#14B8A6',
            is_system: true,
        },
        {
            code: 'SERVICE_SUPERVISOR',
            name: 'Service Supervisor',
            description: 'Manages specific service deployments and technicians',
            level: 4,
            icon: 'Activity',
            color: '#F97316',
            is_system: true,
        },
        {
            code: 'TECHNICIAN',
            name: 'Onsite Technician',
            description: 'Ground-level access to manage devices and view local telemetry',
            level: 5,
            icon: 'Settings',
            color: '#A855F7',
            is_system: true,
        },
        {
            code: 'SERVICE_SUPPLIER',
            name: 'Service Supplier',
            description: 'External supplier with limited access to assigned services',
            level: 5,
            icon: 'Truck',
            color: '#06B6D4',
            is_system: true,
        },
        {
            code: 'VIEWER',
            name: 'Organizer Viewer',
            description: 'Read-only access to dashboards and reports',
            level: 6,
            icon: 'Eye',
            color: '#6B7280',
            is_system: true,
        },
        {
            code: 'OPERATOR',
            name: 'Operator',
            description: 'Standard operator access',
            level: 3,
            icon: 'Activity',
            color: '#10B981',
            is_system: true,
        },
    ];

    for (const role of roles) {
        await prisma.sps_roles.upsert({
            where: { code: role.code },
            update: {
                name: role.name,
                description: role.description,
                level: role.level,
                icon: role.icon,
                color: role.color,
            },
            create: role,
        });
    }

    // ==================================================================================
    // 6. ROLE ASSIGNMENTS
    // ==================================================================================
    console.log('👥 Seeding role assignments...');

    // Clear existing role assignments for these users
    await prisma.sps_role_assignments.deleteMany({
        where: {
            user_id: {
                in: [
                    '00000000-0000-0000-0000-000000000002',
                    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                    'cccccccc-cccc-cccc-cccc-cccccccccccc',
                ]
            }
        }
    });

    // Super Admin role
    await prisma.sps_role_assignments.create({
        data: {
            user_id: '00000000-0000-0000-0000-000000000002',
            role: 'SUPER_ADMIN',
            org_id: null,
            event_id: null,
            dept_id: null,
        },
    });

    // Org Admin role for ACME admin
    await prisma.sps_role_assignments.create({
        data: {
            user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            role: 'ORG_ADMIN',
            org_id: '11111111-1111-1111-1111-111111111111',
            event_id: null,
            dept_id: null,
        },
    });

    // Manager role
    await prisma.sps_role_assignments.create({
        data: {
            user_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            role: 'EVENT_MANAGER',
            org_id: '11111111-1111-1111-1111-111111111111',
            event_id: null,
            dept_id: null,
        },
    });

    // Technician role (Operator user)
    await prisma.sps_role_assignments.create({
        data: {
            user_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
            role: 'TECHNICIAN',
            org_id: '11111111-1111-1111-1111-111111111111',
            event_id: null,
            dept_id: null,
        },
    });

    // ==================================================================================
    // 7. ROLE PERMISSIONS (Maps roles to permissions)
    // ==================================================================================
    console.log('🔗 Seeding role permissions...');

    // Get all permission IDs for mapping
    const allPermissions = await prisma.sps_permissions.findMany();
    const permissionMap = new Map(allPermissions.map(p => [p.code, p.id]));

    // Define role-permission mappings
    const rolePermissionMappings: Record<string, string[]> = {
        'ORG_ADMIN': [
            'dashboard.view', 'devices.view', 'devices.manage', 'events.view', 'events.create', 'events.view_all',
            'events.update', 'events.status', 'events.end', 'events.delete',
            'users.view', 'users.manage', 'reports.view', 'settings.manage', 'telemetry.view', 'alerts.manage',
            'audit.view', 'audit.export'
        ],
        'EVENT_MANAGER': [
            'dashboard.view', 'events.view', 'events.update', 'events.status', 'events.endrequest', 'events.deleterequest', 'devices.view', 'reports.view', 'telemetry.view', 'users.view'
        ],
        'DEPT_HEAD': [
            'dashboard.view', 'events.view', 'devices.view', 'reports.view', 'telemetry.view'
        ],
        'SERVICE_SUPERVISOR': [
            'dashboard.view', 'events.view', 'devices.view', 'devices.manage', 'telemetry.view', 'alerts.manage'
        ],
        'TECHNICIAN': [
            'dashboard.view', 'events.view', 'devices.view', 'telemetry.view'
        ],
        'SERVICE_SUPPLIER': [
            'dashboard.view', 'devices.view', 'telemetry.view'
        ],
        'VIEWER': [
            'dashboard.view', 'events.view', 'devices.view', 'reports.view', 'telemetry.view'
        ],
        'OPERATOR': [
            'dashboard.view', 'events.view', 'devices.view', 'devices.manage', 'reports.view', 'telemetry.view'
        ],
    };

    // Clear existing role permissions and insert new ones
    for (const [role, permCodes] of Object.entries(rolePermissionMappings)) {
        // Delete existing for this role
        await prisma.sps_role_permissions.deleteMany({
            where: { role }
        });

        // Insert new mappings
        for (const code of permCodes) {
            const permissionId = permissionMap.get(code);
            if (permissionId) {
                await prisma.sps_role_permissions.create({
                    data: {
                        role,
                        permission_id: permissionId,
                    },
                });
            }
        }
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('   superadmin@sustainpro.io / Admin@123 (Super Admin)');
    console.log('   admin@acme.com / Admin@123 (Org Admin)');
    console.log('   manager@acme.com / Admin@123 (Event Manager)');
    console.log('   operator@acme.com / Admin@123 (Operator)\n');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
