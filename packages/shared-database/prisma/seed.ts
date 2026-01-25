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

// Helper to generate standardized email layout matching the reference design
function createEmailLayout(title: string, subtitle: string, content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); overflow: hidden;">
                    <!-- Accent Bar -->
                    <tr>
                        <td style="height: 4px; background: linear-gradient(90deg, {{primaryColor}} 0%, {{primaryColor}} 100%);"></td>
                    </tr>
                    
                    <!-- Logo Header -->
                    <tr>
                        <td style="padding: 32px 40px 0 40px;">
                            <img src="{{logoUrl}}" alt="{{organizationName}}" height="28" style="display: block;" onerror="this.style.display='none'" />
                            <span style="font-size: 20px; font-weight: 700; color: #1a1a2e; display: {{logoUrl}} ? 'none' : 'block';">{{organizationName}}</span>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 32px 40px 40px 40px;">
                            <!-- Title Section -->
                            <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.02em;">${title}</h1>
                            <p style="margin: 0 0 24px 0; font-size: 14px; color: #6b7280;">${subtitle}</p>
                            
                            <!-- Body Content -->
                            ${content}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; border-top: 1px solid #f0f0f0;">
                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">
                                Having trouble with your account? <a href="mailto:{{supportEmail}}" style="color: {{primaryColor}}; text-decoration: underline;">Contact us</a>
                            </p>
                            <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                                Best,<br/>
                                ~ {{organizationName}} team
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

// Helper to create info box with icon (for credentials, etc.)
function createInfoBox(iconType: 'email' | 'password' | 'key' | 'info', label: string, value: string): string {
    const icons: Record<string, string> = {
        email: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{{primaryColor}}" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>`,
        password: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{{primaryColor}}" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
        key: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{{primaryColor}}" stroke-width="2"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
        info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{{primaryColor}}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`
    };

    return `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 12px;">
            <tr>
                <td style="padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width: 44px; vertical-align: top;">
                                <div style="width: 36px; height: 36px; background-color: #e0f2fe; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                    ${icons[iconType]}
                                </div>
                            </td>
                            <td style="vertical-align: top; padding-left: 12px;">
                                <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">${label}</p>
                                <p style="margin: 0; font-size: 15px; font-weight: 600; color: #1a1a2e;">${value}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;
}

// Helper to create a notice/alert box
function createNoticeBox(message: string, type: 'info' | 'warning' | 'success' = 'info'): string {
    const colors = {
        info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
        warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '#f59e0b' },
        success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '#10b981' }
    };
    const c = colors[type];

    return `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${c.bg}; border-radius: 8px; margin: 20px 0;">
            <tr>
                <td style="padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width: 28px; vertical-align: top;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c.icon}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>
                            </td>
                            <td style="vertical-align: top; padding-left: 12px;">
                                <p style="margin: 0; font-size: 14px; color: ${c.text};">${message}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;
}

// Helper to create primary button
function createButton(text: string, url: string): string {
    return `
        <table cellpadding="0" cellspacing="0" style="margin: 24px 0;">
            <tr>
                <td style="background-color: {{primaryColor}}; border-radius: 6px;">
                    <a href="${url}" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">${text}</a>
                </td>
            </tr>
        </table>
    `;
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
            subject: 'Welcome to the Team - {{userName}}',
            body_html: createEmailLayout('WELCOME TO THE TEAM', 'Your account has been created', `
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Hello <strong style="color: #047857;">{{userName}}</strong>,
                </p>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    An administrator has created your account. Use the credentials below to access the platform.
                </p>
                
                ${createInfoBox('email', 'EMAIL', '{{userEmail}}')}
                ${createInfoBox('password', 'TEMPORARY PASSWORD', '{{tempPassword}}')}
                
                ${createNoticeBox('<strong>Password Change Required</strong><br/>You will be asked to create a new password when you first log in.', 'info')}
                
                ${createButton('Log In to Your Account', '{{loginUrl}}')}
            `),
            body_text: 'Welcome to the team! Your account has been created. Email: {{userEmail}}. Login at: {{loginUrl}}',
            available_variables: JSON.stringify(['userName', 'userEmail', 'tempPassword', 'loginUrl', 'organizationName']),
            is_system_template: true,
        },
        {
            code: 'PASSWORD_RESET',
            name: 'Password Reset',
            category: 'SYSTEM',
            description: 'Sent when a user requests a password reset',
            subject: 'Reset Your Password',
            body_html: createEmailLayout('PASSWORD RESET', 'A password reset was requested for your account', `
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Hello <strong style="color: #047857;">{{userName}}</strong>,
                </p>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    We received a request to reset your password. Click the button below to create a new password.
                </p>
                
                ${createButton('Reset Password', '{{resetUrl}}')}
                
                <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    This link will expire in <strong>{{expiryMinutes}} minutes</strong>. If you didn't request this, you can safely ignore this email.
                </p>
            `),
            body_text: 'Password Reset Request. Reset your password at: {{resetUrl}}. This link expires in {{expiryMinutes}} minutes.',
            available_variables: JSON.stringify(['userName', 'userEmail', 'resetUrl', 'expiryMinutes']),
            is_system_template: true,
        },
        {
            code: '2FA_OTP',
            name: '2FA OTP Email',
            category: 'SYSTEM',
            description: 'Sent for email-based two-factor authentication',
            subject: 'Your Verification Code',
            body_html: createEmailLayout('VERIFICATION CODE', 'Use this code to complete your login', `
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Hello <strong style="color: #047857;">{{userName}}</strong>,
                </p>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Enter the following verification code to complete your sign-in:
                </p>
                
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; border: 2px dashed #e2e8f0;">
                    <tr>
                        <td style="padding: 32px; text-align: center;">
                            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: {{primaryColor}}; font-family: monospace;">{{otpCode}}</span>
                        </td>
                    </tr>
                </table>
                
                <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    This code will expire in <strong>{{expiryMinutes}} minutes</strong>. If you didn't attempt to sign in, please secure your account immediately.
                </p>
            `),
            body_text: 'Your verification code is: {{otpCode}}. This code expires in {{expiryMinutes}} minutes.',
            available_variables: JSON.stringify(['userName', 'otpCode', 'expiryMinutes']),
            is_system_template: true,
        },
        {
            code: 'ALERT_NOTIFICATION',
            name: 'Alert Notification',
            category: 'ALERT',
            description: 'Sent when a new alert is triggered',
            subject: '[{{severity}}] Alert: {{alertName}}',
            body_html: createEmailLayout('ALERT TRIGGERED', 'A new alert requires your attention', `
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    A <strong>{{severity}}</strong> alert has been triggered on your platform.
                </p>
                
                ${createInfoBox('info', 'ALERT NAME', '{{alertName}}')}
                ${createInfoBox('info', 'DEVICE', '{{deviceName}}')}
                ${createInfoBox('info', 'TIME', '{{alertTime}}')}
                
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 8px; margin: 16px 0;">
                    <tr>
                        <td style="padding: 16px 20px;">
                            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: #991b1b; text-transform: uppercase; letter-spacing: 0.05em;">MESSAGE</p>
                            <p style="margin: 0; font-size: 14px; color: #7f1d1d;">{{alertMessage}}</p>
                        </td>
                    </tr>
                </table>
                
                ${createButton('View Alert Details', '{{alertUrl}}')}
            `),
            body_text: '{{severity}} Alert: {{alertName}}. {{alertMessage}}. View at: {{alertUrl}}',
            available_variables: JSON.stringify(['alertName', 'severity', 'deviceName', 'alertMessage', 'alertTime', 'alertUrl']),
            is_system_template: true,
        },
        {
            code: 'TASK_ASSIGNED',
            name: 'Task Assigned',
            category: 'TASK',
            description: 'Sent when a task is assigned to a user',
            subject: 'New Task: {{taskTitle}}',
            body_html: createEmailLayout('NEW TASK ASSIGNED', 'A task has been assigned to you', `
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Hello <strong style="color: #047857;">{{userName}}</strong>,
                </p>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    A new task has been assigned to you. Please review and update the status as you progress.
                </p>
                
                ${createInfoBox('info', 'TASK', '{{taskTitle}}')}
                ${createInfoBox('info', 'PRIORITY', '{{taskPriority}}')}
                ${createInfoBox('info', 'DUE DATE', '{{dueDate}}')}
                ${createInfoBox('info', 'ASSIGNED BY', '{{assignedBy}}')}
                
                ${createButton('View Task Details', '{{taskUrl}}')}
            `),
            body_text: 'New Task: {{taskTitle}}. Due: {{dueDate}}. View at: {{taskUrl}}',
            available_variables: JSON.stringify(['userName', 'taskTitle', 'taskPriority', 'dueDate', 'assignedBy', 'taskUrl']),
            is_system_template: true,
        },
        {
            code: 'DAILY_REPORT',
            name: 'Daily Report',
            category: 'REPORT',
            description: 'Daily summary report email',
            subject: 'Daily Report: {{reportDate}}',
            body_html: createEmailLayout('DAILY REPORT', 'Your daily system summary for {{reportDate}}', `
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Here's your daily overview of the platform activity:
                </p>
                
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <tr>
                        <td style="padding: 20px; background-color: #fef2f2; border-radius: 8px; text-align: center; width: 33%;">
                            <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #dc2626;">{{criticalAlerts}}</p>
                            <p style="margin: 0; font-size: 12px; color: #991b1b; text-transform: uppercase;">Critical</p>
                        </td>
                        <td style="width: 12px;"></td>
                        <td style="padding: 20px; background-color: #fffbeb; border-radius: 8px; text-align: center; width: 33%;">
                            <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #d97706;">{{warningAlerts}}</p>
                            <p style="margin: 0; font-size: 12px; color: #92400e; text-transform: uppercase;">Warning</p>
                        </td>
                        <td style="width: 12px;"></td>
                        <td style="padding: 20px; background-color: #eff6ff; border-radius: 8px; text-align: center; width: 33%;">
                            <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #2563eb;">{{infoAlerts}}</p>
                            <p style="margin: 0; font-size: 12px; color: #1e40af; text-transform: uppercase;">Info</p>
                        </td>
                    </tr>
                </table>
                
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <tr>
                        <td style="padding: 20px; background-color: #ecfdf5; border-radius: 8px; text-align: center; width: 48%;">
                            <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #059669;">{{devicesOnline}}</p>
                            <p style="margin: 0; font-size: 12px; color: #065f46; text-transform: uppercase;">Devices Online</p>
                        </td>
                        <td style="width: 4%;"></td>
                        <td style="padding: 20px; background-color: #f3f4f6; border-radius: 8px; text-align: center; width: 48%;">
                            <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #6b7280;">{{devicesOffline}}</p>
                            <p style="margin: 0; font-size: 12px; color: #4b5563; text-transform: uppercase;">Devices Offline</p>
                        </td>
                    </tr>
                </table>
                
                ${createButton('View Full Dashboard', '{{dashboardUrl}}')}
            `),
            body_text: 'Daily Report for {{reportDate}}. Critical: {{criticalAlerts}}, Warnings: {{warningAlerts}}. View dashboard: {{dashboardUrl}}',
            available_variables: JSON.stringify(['reportDate', 'criticalAlerts', 'warningAlerts', 'infoAlerts', 'devicesOnline', 'devicesOffline', 'dashboardUrl']),
            is_system_template: true,
        },
        {
            code: 'ACCOUNT_LOCKED',
            name: 'Account Locked',
            category: 'SYSTEM',
            description: 'Sent when user account is locked due to failed login attempts',
            subject: 'Account Security Alert',
            body_html: createEmailLayout('ACCOUNT LOCKED', 'Your account has been temporarily locked', `
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Hello <strong style="color: #047857;">{{userName}}</strong>,
                </p>
                
                ${createNoticeBox('Your account has been temporarily locked due to multiple consecutive failed login attempts. This is a security measure to protect your account.', 'warning')}
                
                <p style="margin: 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Your account will be automatically unlocked after <strong>{{lockoutDuration}} minutes</strong>.
                </p>
                
                <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    If you did not attempt to sign in, please contact our support team immediately as someone may be trying to access your account.
                </p>
            `),
            body_text: 'Your account has been locked due to multiple failed login attempts. It will be unlocked after {{lockoutDuration}} minutes.',
            available_variables: JSON.stringify(['userName', 'lockoutDuration', 'lockoutTime', 'ipAddress']),
            is_system_template: true,
        },
        {
            code: 'EVENT_END_REQUEST',
            name: 'Event End Request',
            category: 'EVENT',
            description: 'Sent to org admins when an event manager requests to end an event',
            subject: 'Event End Request: {{eventName}}',
            body_html: createEmailLayout('EVENT END REQUEST', 'An event manager has requested to end an event', `
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    Hello <strong style="color: #047857;">{{recipientName}}</strong>,
                </p>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                    A request has been submitted to mark the following event as <strong>ENDED</strong>. Please review and take action.
                </p>
                
                ${createInfoBox('info', 'EVENT NAME', '{{eventName}}')}
                ${createInfoBox('key', 'EVENT CODE', '{{eventCode}}')}
                ${createInfoBox('info', 'REQUESTED BY', '{{requestedByName}}')}
                ${createInfoBox('info', 'REQUEST TIME', '{{requestTime}}')}
                
                ${createButton('Review Event', '{{eventUrl}}')}
                
                <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                    If you approve this request, you can terminate the event from the event details page.
                </p>
            `),
            body_text: 'Event End Request: {{eventName}}. Requested by {{requestedByName}}. Review at: {{eventUrl}}',
            available_variables: JSON.stringify(['recipientName', 'eventName', 'eventCode', 'requestedByName', 'requestTime', 'eventUrl', 'organizationName']),
            is_system_template: true,
        },
    ];

    for (const template of emailTemplates) {
        await prisma.sps_email_templates.upsert({
            where: { code: template.code },
            update: template as any,
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
        // Service permissions
        { name: 'View Services', code: 'services.view', description: 'View service templates', category: 'services' },
        { name: 'Create Services', code: 'services.create', description: 'Create service templates', category: 'services' },
        { name: 'Update Services', code: 'services.update', description: 'Update service templates', category: 'services' },
        { name: 'Delete Services', code: 'services.delete', description: 'Delete service templates', category: 'services' },
        { name: 'Assign Services', code: 'services.assign', description: 'Assign services to departments', category: 'services' },
        // Department permissions
        { name: 'View Departments', code: 'departments.view', description: 'View departments', category: 'departments' },
        { name: 'Create Departments', code: 'departments.create', description: 'Create departments', category: 'departments' },
        { name: 'Update Departments', code: 'departments.update', description: 'Update departments', category: 'departments' },
        { name: 'Delete Departments', code: 'departments.delete', description: 'Delete departments', category: 'departments' },
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
            'audit.view', 'audit.export',
            // Service permissions
            'services.view', 'services.create', 'services.update', 'services.delete', 'services.assign',
            // Department permissions
            'departments.view', 'departments.create', 'departments.update', 'departments.delete'
        ],
        'EVENT_MANAGER': [
            'dashboard.view', 'events.view', 'events.update', 'events.status', 'events.endrequest', 'events.deleterequest',
            'devices.view', 'reports.view', 'telemetry.view', 'users.view',
            // Service permissions (view and assign only)
            'services.view', 'services.assign',
            // Department permissions
            'departments.view', 'departments.create', 'departments.update', 'departments.delete'
        ],
        'DEPT_HEAD': [
            'dashboard.view', 'events.view', 'devices.view', 'reports.view', 'telemetry.view',
            'services.view', 'departments.view'
        ],
        'SERVICE_SUPERVISOR': [
            'dashboard.view', 'events.view', 'devices.view', 'devices.manage', 'telemetry.view', 'alerts.manage',
            'services.view'
        ],
        'TECHNICIAN': [
            'dashboard.view', 'events.view', 'devices.view', 'telemetry.view',
            'services.view', 'departments.view'
        ],
        'SERVICE_SUPPLIER': [
            'dashboard.view', 'devices.view', 'telemetry.view',
            'services.view'
        ],
        'VIEWER': [
            'dashboard.view', 'events.view', 'devices.view', 'reports.view', 'telemetry.view',
            'services.view', 'departments.view'
        ],
        'OPERATOR': [
            'dashboard.view', 'events.view', 'devices.view', 'devices.manage', 'reports.view', 'telemetry.view',
            'services.view', 'departments.view'
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

    // ==================================================================================
    // 8. WIDGET CATEGORIES (For Dynamic Widget System)
    // ==================================================================================
    console.log('🎨 Seeding widget categories...');

    // Clear existing categories
    await prisma.sps_widget_presets.deleteMany({});
    await prisma.sps_widget_definitions.deleteMany({});
    await prisma.sps_widget_categories.deleteMany({});

    const widgetCategories = await Promise.all([
        prisma.sps_widget_categories.create({
            data: {
                name: 'Layout',
                description: 'Container and layout widgets for organizing dashboards',
                icon: 'LayoutGrid',
                color: '#6366F1',
                sort_order: 1,
                organization_id: null, // System category
            }
        }),
        prisma.sps_widget_categories.create({
            data: {
                name: 'Data Display',
                description: 'Widgets for displaying device parameters and status',
                icon: 'BarChart3',
                color: '#3B82F6',
                sort_order: 2,
                organization_id: null,
            }
        }),
        prisma.sps_widget_categories.create({
            data: {
                name: 'Visualization',
                description: 'Charts, gauges, and visual data representations',
                icon: 'PieChart',
                color: '#10B981',
                sort_order: 3,
                organization_id: null,
            }
        }),
        prisma.sps_widget_categories.create({
            data: {
                name: 'Control',
                description: 'Interactive widgets for device control and configuration',
                icon: 'Sliders',
                color: '#F59E0B',
                sort_order: 4,
                organization_id: null,
            }
        }),
        prisma.sps_widget_categories.create({
            data: {
                name: 'Monitoring',
                description: 'Alerts, logs, and device monitoring widgets',
                icon: 'Activity',
                color: '#EF4444',
                sort_order: 5,
                organization_id: null,
            }
        }),
        prisma.sps_widget_categories.create({
            data: {
                name: 'Decorative',
                description: 'Text, images, and branding widgets',
                icon: 'Palette',
                color: '#8B5CF6',
                sort_order: 6,
                organization_id: null,
            }
        }),
    ]);

    const categoryMap = new Map(widgetCategories.map(c => [c.name, c.id]));
    console.log(`   Created ${widgetCategories.length} widget categories`);

    // ==================================================================================
    // 9. WIDGET DEFINITIONS (Migrated from hardcoded WIDGET_TYPES)
    // ==================================================================================
    console.log('📦 Seeding widget definitions...');

    const widgetDefinitions = [
        // === Layout Widgets ===
        {
            code: 'container',
            name: 'Card Container',
            description: 'Group widgets in columns/rows',
            category_id: categoryMap.get('Layout')!,
            render_type: 'container',
            icon: 'LayoutGrid',
            default_width: 12,
            default_height: 4,
            min_width: 2,
            max_width: 12,
            min_height: 2,
            max_height: 10,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'columns', label: 'Columns', type: 'number', default_value: 2, min: 1, max: 6 },
                    { key: 'gap', label: 'Gap', type: 'number', default_value: 16, min: 0, max: 48 },
                    { key: 'padding', label: 'Padding', type: 'number', default_value: 16, min: 0, max: 48 },
                ]
            },
            default_settings: { columns: 2, gap: 16, padding: 16 },
        },
        {
            code: 'section',
            name: 'Section',
            description: 'Labeled section divider',
            category_id: categoryMap.get('Layout')!,
            render_type: 'section',
            icon: 'LayoutTemplate',
            default_width: 12,
            default_height: 1,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'text', label: 'Section Title', type: 'string', default_value: 'Section Title' },
                    { key: 'fontSize', label: 'Font Size', type: 'number', default_value: 18 },
                    { key: 'fontWeight', label: 'Font Weight', type: 'select', default_value: 'semibold', options: [
                        { value: 'normal', label: 'Normal' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'semibold', label: 'Semi Bold' },
                        { value: 'bold', label: 'Bold' },
                    ]},
                ]
            },
            default_settings: { text: 'Section Title', fontSize: 18, fontWeight: 'semibold' },
        },

        // === Data Display Widgets ===
        {
            code: 'device_status',
            name: 'Device Status',
            description: 'Online/offline status, signal strength, battery',
            category_id: categoryMap.get('Data Display')!,
            render_type: 'device_status',
            icon: 'Server',
            default_width: 6,
            default_height: 2,
            is_system: true,
            parameter_slots: [
                { key: 'status', label: 'Device Status', required: true, data_types: ['boolean', 'string'] },
                { key: 'signal', label: 'Signal Strength', required: false, data_types: ['number'] },
                { key: 'battery', label: 'Battery Level', required: false, data_types: ['number'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'showLastSeen', label: 'Show Last Seen', type: 'boolean', default_value: true },
                    { key: 'showSignalStrength', label: 'Show Signal', type: 'boolean', default_value: true },
                    { key: 'showBattery', label: 'Show Battery', type: 'boolean', default_value: true },
                ]
            },
            default_settings: { showLastSeen: true, showSignalStrength: true, showBattery: true },
        },
        {
            code: 'parameter_card',
            name: 'Parameter Card',
            description: 'Display a single parameter value with icon',
            category_id: categoryMap.get('Data Display')!,
            render_type: 'parameter_card',
            icon: 'Square',
            default_width: 3,
            default_height: 2,
            is_system: true,
            parameter_slots: [
                { key: 'value', label: 'Value', required: true, data_types: ['number', 'string'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'showIcon', label: 'Show Icon', type: 'boolean', default_value: true },
                    { key: 'showUnit', label: 'Show Unit', type: 'boolean', default_value: true },
                    { key: 'iconName', label: 'Icon', type: 'icon', default_value: 'Activity' },
                    { key: 'iconColor', label: 'Icon Color', type: 'color', default_value: '#3B82F6' },
                    { key: 'valueSize', label: 'Value Size', type: 'select', default_value: 'lg', options: [
                        { value: 'sm', label: 'Small' },
                        { value: 'md', label: 'Medium' },
                        { value: 'lg', label: 'Large' },
                        { value: 'xl', label: 'Extra Large' },
                    ]},
                    { key: 'decimals', label: 'Decimal Places', type: 'number', default_value: 2, min: 0, max: 6 },
                ]
            },
            default_settings: { showIcon: true, showUnit: true, iconName: 'Activity', valueSize: 'lg', decimals: 2 },
        },
        {
            code: 'counter',
            name: 'Big Number',
            description: 'Large numeric display with animation',
            category_id: categoryMap.get('Data Display')!,
            render_type: 'counter',
            icon: 'Hash',
            default_width: 3,
            default_height: 2,
            is_system: true,
            parameter_slots: [
                { key: 'value', label: 'Value', required: true, data_types: ['number'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'prefix', label: 'Prefix', type: 'string', default_value: '' },
                    { key: 'suffix', label: 'Suffix', type: 'string', default_value: '' },
                    { key: 'decimals', label: 'Decimals', type: 'number', default_value: 0 },
                    { key: 'animateValue', label: 'Animate', type: 'boolean', default_value: true },
                ]
            },
            default_settings: { prefix: '', suffix: '', decimals: 0, animateValue: true },
        },
        {
            code: 'status_indicator',
            name: 'Status Badge',
            description: 'Status indicator badge',
            category_id: categoryMap.get('Data Display')!,
            render_type: 'status_indicator',
            icon: 'Activity',
            default_width: 3,
            default_height: 1,
            is_system: true,
            parameter_slots: [
                { key: 'status', label: 'Status', required: true, data_types: ['boolean', 'string'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'onlineText', label: 'Online Text', type: 'string', default_value: 'Online' },
                    { key: 'offlineText', label: 'Offline Text', type: 'string', default_value: 'Offline' },
                    { key: 'onlineColor', label: 'Online Color', type: 'color', default_value: '#22C55E' },
                    { key: 'offlineColor', label: 'Offline Color', type: 'color', default_value: '#EF4444' },
                ]
            },
            default_settings: { onlineText: 'Online', offlineText: 'Offline', onlineColor: '#22C55E', offlineColor: '#EF4444' },
        },
        {
            code: 'transparent_parameter',
            name: 'Transparent Parameter',
            description: 'Minimalist parameter display',
            category_id: categoryMap.get('Data Display')!,
            render_type: 'transparent_parameter',
            icon: 'Eye',
            default_width: 2,
            default_height: 2,
            is_system: true,
            parameter_slots: [
                { key: 'value', label: 'Value', required: true, data_types: ['number', 'string'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'showIcon', label: 'Show Icon', type: 'boolean', default_value: false },
                    { key: 'backgroundColor', label: 'Background', type: 'color', default_value: 'transparent' },
                ]
            },
            default_settings: { showIcon: false, backgroundColor: 'transparent' },
        },

        // === Visualization Widgets ===
        {
            code: 'tank_gauge',
            name: 'Tank Gauge',
            description: 'Visual liquid level indicator (water, waste, diesel)',
            category_id: categoryMap.get('Visualization')!,
            render_type: 'tank_gauge',
            icon: 'Container',
            default_width: 4,
            default_height: 4,
            is_system: true,
            parameter_slots: [
                { key: 'level', label: 'Level (%)', required: true, data_types: ['number'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'tankType', label: 'Tank Type', type: 'select', default_value: 'water', options: [
                        { value: 'water', label: 'Water (Blue)' },
                        { value: 'wastewater', label: 'Wastewater (Green)' },
                        { value: 'diesel', label: 'Diesel (Amber)' },
                        { value: 'fuel', label: 'Fuel (Red)' },
                        { value: 'chemical', label: 'Chemical (Purple)' },
                    ]},
                    { key: 'showBubbles', label: 'Show Bubbles', type: 'boolean', default_value: true },
                    { key: 'showPercentage', label: 'Show Percentage', type: 'boolean', default_value: true },
                    { key: 'minValue', label: 'Min Value', type: 'number', default_value: 0 },
                    { key: 'maxValue', label: 'Max Value', type: 'number', default_value: 100 },
                ]
            },
            default_settings: { tankType: 'water', showBubbles: true, showPercentage: true, minValue: 0, maxValue: 100 },
            style_conditions: [
                { slot: 'level', operator: 'lt', value: 20, styles: { color: '#EF4444' }, priority: 1 },
                { slot: 'level', operator: 'gt', value: 80, styles: { color: '#22C55E' }, priority: 1 },
            ],
        },
        {
            code: 'gauge',
            name: 'Circular Gauge',
            description: 'Analog-style circular meter',
            category_id: categoryMap.get('Visualization')!,
            render_type: 'gauge',
            icon: 'Gauge',
            default_width: 4,
            default_height: 3,
            is_system: true,
            parameter_slots: [
                { key: 'value', label: 'Value', required: true, data_types: ['number'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'minValue', label: 'Min Value', type: 'number', default_value: 0 },
                    { key: 'maxValue', label: 'Max Value', type: 'number', default_value: 100 },
                    { key: 'showValue', label: 'Show Value', type: 'boolean', default_value: true },
                    { key: 'showNeedle', label: 'Show Needle', type: 'boolean', default_value: true },
                    { key: 'colorLow', label: 'Low Color', type: 'color', default_value: '#22C55E' },
                    { key: 'colorMid', label: 'Mid Color', type: 'color', default_value: '#F59E0B' },
                    { key: 'colorHigh', label: 'High Color', type: 'color', default_value: '#EF4444' },
                ]
            },
            default_settings: { minValue: 0, maxValue: 100, showValue: true, showNeedle: true },
        },
        {
            code: 'line_chart',
            name: 'Time Series Chart',
            description: 'Historical data visualization',
            category_id: categoryMap.get('Visualization')!,
            render_type: 'line_chart',
            icon: 'LineChart',
            default_width: 6,
            default_height: 3,
            is_system: true,
            parameter_slots: [
                { key: 'primary', label: 'Primary Series', required: true, data_types: ['number'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'timeRange', label: 'Time Range', type: 'select', default_value: '24h', options: [
                        { value: '1h', label: '1 Hour' },
                        { value: '6h', label: '6 Hours' },
                        { value: '24h', label: '24 Hours' },
                        { value: '7d', label: '7 Days' },
                    ]},
                    { key: 'showLegend', label: 'Show Legend', type: 'boolean', default_value: true },
                    { key: 'showGrid', label: 'Show Grid', type: 'boolean', default_value: true },
                    { key: 'lineColor', label: 'Line Color', type: 'color', default_value: '#3B82F6' },
                ]
            },
            default_settings: { timeRange: '24h', showLegend: true, showGrid: true, lineColor: '#3B82F6' },
        },
        {
            code: 'table_view',
            name: 'Data Table',
            description: 'Tabular data display',
            category_id: categoryMap.get('Visualization')!,
            render_type: 'table_view',
            icon: 'Table',
            default_width: 6,
            default_height: 4,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'sortable', label: 'Sortable', type: 'boolean', default_value: true },
                    { key: 'paginated', label: 'Paginated', type: 'boolean', default_value: true },
                    { key: 'pageSize', label: 'Page Size', type: 'number', default_value: 10 },
                ]
            },
            default_settings: { sortable: true, paginated: true, pageSize: 10 },
        },

        // === Control Widgets ===
        {
            code: 'threshold_editor',
            name: 'Threshold Editor',
            description: 'Set operational limits for parameters',
            category_id: categoryMap.get('Control')!,
            render_type: 'threshold_editor',
            icon: 'Sliders',
            default_width: 4,
            default_height: 3,
            is_system: true,
            parameter_slots: [
                { key: 'threshold', label: 'Threshold Value', required: true, data_types: ['number'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'allowUserEdit', label: 'Allow User Edit', type: 'boolean', default_value: true },
                    { key: 'minValue', label: 'Min Value', type: 'number', default_value: 0 },
                    { key: 'maxValue', label: 'Max Value', type: 'number', default_value: 100 },
                ]
            },
            default_settings: { allowUserEdit: true, minValue: 0, maxValue: 100 },
        },
        {
            code: 'recording_control',
            name: 'Recording Control',
            description: 'Start/stop data recording',
            category_id: categoryMap.get('Control')!,
            render_type: 'recording_control',
            icon: 'Circle',
            default_width: 3,
            default_height: 2,
            is_system: true,
            parameter_slots: [
                { key: 'recording', label: 'Recording State', required: true, data_types: ['boolean'] },
            ],
            settings_schema: {
                settings: [
                    { key: 'showDuration', label: 'Show Duration', type: 'boolean', default_value: true },
                ]
            },
            default_settings: { showDuration: true },
        },
        {
            code: 'device_config',
            name: 'Device Configuration',
            description: 'View/modify device settings',
            category_id: categoryMap.get('Control')!,
            render_type: 'device_config',
            icon: 'Settings',
            default_width: 4,
            default_height: 3,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'readOnly', label: 'Read Only', type: 'boolean', default_value: false },
                    { key: 'collapsible', label: 'Collapsible', type: 'boolean', default_value: true },
                ]
            },
            default_settings: { readOnly: false, collapsible: true },
        },

        // === Monitoring Widgets ===
        {
            code: 'alert_widget',
            name: 'Alerts Panel',
            description: 'Current and historical alerts',
            category_id: categoryMap.get('Monitoring')!,
            render_type: 'alert_widget',
            icon: 'AlertTriangle',
            default_width: 6,
            default_height: 3,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'maxAlerts', label: 'Max Alerts', type: 'number', default_value: 10 },
                    { key: 'showAcknowledged', label: 'Show Acknowledged', type: 'boolean', default_value: false },
                ]
            },
            default_settings: { maxAlerts: 10, showAcknowledged: false },
        },
        {
            code: 'audit_log',
            name: 'Audit Log',
            description: 'Device event history',
            category_id: categoryMap.get('Monitoring')!,
            render_type: 'audit_log',
            icon: 'FileText',
            default_width: 6,
            default_height: 4,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'maxEntries', label: 'Max Entries', type: 'number', default_value: 20 },
                    { key: 'showTimestamp', label: 'Show Timestamp', type: 'boolean', default_value: true },
                    { key: 'showUser', label: 'Show User', type: 'boolean', default_value: true },
                ]
            },
            default_settings: { maxEntries: 20, showTimestamp: true, showUser: true },
        },
        {
            code: 'available_devices',
            name: 'Available Devices',
            description: 'List of devices with add option',
            category_id: categoryMap.get('Monitoring')!,
            render_type: 'available_devices',
            icon: 'Cpu',
            default_width: 4,
            default_height: 4,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'showAddButton', label: 'Show Add Button', type: 'boolean', default_value: true },
                    { key: 'groupByStatus', label: 'Group By Status', type: 'boolean', default_value: false },
                    { key: 'maxDevices', label: 'Max Devices', type: 'number', default_value: 10 },
                ]
            },
            default_settings: { showAddButton: true, groupByStatus: false, maxDevices: 10 },
        },

        // === Decorative Widgets ===
        {
            code: 'text_widget',
            name: 'Text Block',
            description: 'Custom text with styling',
            category_id: categoryMap.get('Decorative')!,
            render_type: 'text_widget',
            icon: 'Type',
            default_width: 4,
            default_height: 1,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'text', label: 'Text', type: 'string', default_value: 'Enter text here...' },
                    { key: 'fontSize', label: 'Font Size', type: 'number', default_value: 16, min: 10, max: 72 },
                    { key: 'fontWeight', label: 'Font Weight', type: 'select', default_value: 'normal', options: [
                        { value: 'normal', label: 'Normal' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'bold', label: 'Bold' },
                    ]},
                    { key: 'textAlign', label: 'Alignment', type: 'select', default_value: 'left', options: [
                        { value: 'left', label: 'Left' },
                        { value: 'center', label: 'Center' },
                        { value: 'right', label: 'Right' },
                    ]},
                    { key: 'fontColor', label: 'Text Color', type: 'color', default_value: '#1F2937' },
                ]
            },
            default_settings: { text: 'Enter text here...', fontSize: 16, fontWeight: 'normal', textAlign: 'left' },
        },
        {
            code: 'logo_widget',
            name: 'Logo',
            description: 'Display a logo image',
            category_id: categoryMap.get('Decorative')!,
            render_type: 'logo_widget',
            icon: 'Image',
            default_width: 2,
            default_height: 2,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'logoUrl', label: 'Logo URL', type: 'string', default_value: '' },
                    { key: 'logoSize', label: 'Size', type: 'number', default_value: 100 },
                    { key: 'logoFit', label: 'Fit', type: 'select', default_value: 'contain', options: [
                        { value: 'contain', label: 'Contain' },
                        { value: 'cover', label: 'Cover' },
                        { value: 'fill', label: 'Fill' },
                    ]},
                ]
            },
            default_settings: { logoUrl: '', logoSize: 100, logoFit: 'contain' },
        },
        {
            code: 'icon_widget',
            name: 'Icon Display',
            description: 'Display a decorative icon',
            category_id: categoryMap.get('Decorative')!,
            render_type: 'icon_widget',
            icon: 'Smile',
            default_width: 1,
            default_height: 1,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'icon', label: 'Icon', type: 'icon', default_value: 'Star' },
                    { key: 'iconSize', label: 'Size', type: 'select', default_value: 'md', options: [
                        { value: 'sm', label: 'Small' },
                        { value: 'md', label: 'Medium' },
                        { value: 'lg', label: 'Large' },
                    ]},
                    { key: 'iconColor', label: 'Color', type: 'color', default_value: '#3B82F6' },
                    { key: 'showLabel', label: 'Show Label', type: 'boolean', default_value: false },
                    { key: 'label', label: 'Label Text', type: 'string', default_value: '' },
                ]
            },
            default_settings: { icon: 'Star', iconSize: 'md', iconColor: '#3B82F6', showLabel: false },
        },
        {
            code: 'background_image',
            name: 'Background Image',
            description: 'Background image with overlay',
            category_id: categoryMap.get('Decorative')!,
            render_type: 'background_image',
            icon: 'Image',
            default_width: 12,
            default_height: 4,
            is_system: true,
            parameter_slots: [],
            settings_schema: {
                settings: [
                    { key: 'imageUrl', label: 'Image URL', type: 'string', default_value: '' },
                    { key: 'opacity', label: 'Opacity', type: 'number', default_value: 100, min: 0, max: 100 },
                    { key: 'blur', label: 'Blur', type: 'number', default_value: 0, min: 0, max: 20 },
                    { key: 'objectFit', label: 'Fit', type: 'select', default_value: 'cover', options: [
                        { value: 'cover', label: 'Cover' },
                        { value: 'contain', label: 'Contain' },
                        { value: 'fill', label: 'Fill' },
                    ]},
                    { key: 'overlayOpacity', label: 'Overlay Opacity', type: 'number', default_value: 0, min: 0, max: 100 },
                ]
            },
            default_settings: { imageUrl: '', opacity: 100, blur: 0, objectFit: 'cover', overlayOpacity: 0 },
        },
    ];

    for (const def of widgetDefinitions) {
        await prisma.sps_widget_definitions.create({
            data: {
                code: def.code,
                name: def.name,
                description: def.description,
                category_id: def.category_id,
                render_type: def.render_type,
                icon: def.icon,
                default_width: def.default_width,
                default_height: def.default_height,
                min_width: def.min_width || 1,
                max_width: def.max_width || 12,
                min_height: def.min_height || 1,
                max_height: def.max_height || 10,
                is_system: def.is_system,
                parameter_slots: def.parameter_slots,
                settings_schema: def.settings_schema,
                default_settings: def.default_settings,
                style_conditions: (def as any).style_conditions || [],
                organization_id: null,
            }
        });
    }

    console.log(`   Created ${widgetDefinitions.length} widget definitions`);

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
