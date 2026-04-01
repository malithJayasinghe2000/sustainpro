import { config } from '../config';
import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

/**
 * Clean, Professional Email Template
 * Matches Akkio design:
 * - Simple white card
 * - Blue top accent line
 * - Clean typography
 * - No colored inner boxes
 * - Divider line before footer
 */

interface BaseTemplateData {
    recipientName?: string;
    supportEmail?: string;
    title?: string;
    logoUrl?: string;
}

// System settings cache
let cachedSettings: { primaryColor: string; logoUrl: string; title: string; supportEmail: string } | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8080';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function getImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // If it's already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Special case: Default "logo.png" lives in frontend public folder
    if (url === 'logo.png' || url === '/logo.png') {
        return `${FRONTEND_URL}/logo.png`;
    }

    // If it's a relative API path, prefix with API gateway
    if (url.startsWith('/api/')) {
        return `${API_GATEWAY_URL}${url}`;
    }

    // For other relative paths (uploads), use the API gateway
    return `${API_GATEWAY_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export async function getSystemSettings(): Promise<{ primaryColor: string; logoUrl: string; title: string; supportEmail: string }> {
    const now = Date.now();

    // Default logo is strictly from frontend
    const defaultLogoUrl = `${FRONTEND_URL}/logo.png`;

    const defaults = {
        primaryColor: '#2563EB', // Akkio blue
        logoUrl: defaultLogoUrl,
        title: config.templates.title || 'SustainPro',
        supportEmail: config.templates.supportEmail || 'support@sustainpro.io'
    };

    if (cachedSettings && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return cachedSettings;
    }

    try {
        const settings = await prisma.sps_system_settings.findUnique({ where: { id: 'sps_main_config' } });
        if (settings) {
            // Logic:
            // 1. If site_logo is present, try to process it.
            // 2. If valid logo found, use it.
            // 3. Fallback to defaultLogoUrl.
            let dbLogoUrl = settings.site_logo ? getImageUrl(settings.site_logo) : null;

            cachedSettings = {
                primaryColor: settings.primary_color || defaults.primaryColor,
                logoUrl: dbLogoUrl || defaults.logoUrl,
                title: settings.system_name || defaults.title,
                supportEmail: settings.support_email || defaults.supportEmail
            };
            cacheTimestamp = now;
            return cachedSettings;
        }
    } catch (error) {
        console.log('Using default settings (DB fetch failed)');
    }

    cachedSettings = defaults;
    cacheTimestamp = now;
    return defaults;
}

function getSettingsSync() {
    return cachedSettings || {
        primaryColor: '#2563EB',
        logoUrl: `${FRONTEND_URL}/logo.png`,
        title: 'SustainPro',
        supportEmail: 'support@sustainpro.io'
    };
}

getSystemSettings().catch(() => { });

// ============================================
// BASE TEMPLATE & COMPONENTS
// ============================================

const baseTemplate = (title: string, subtitle: string, content: string, data: BaseTemplateData = {}): string => {
    const settings = getSettingsSync();
    const appTitle = data.title || settings.title;
    const supportEmail = data.supportEmail || settings.supportEmail;
    const primaryColor = settings.primaryColor;
    const logoUrl = data.logoUrl || settings.logoUrl;

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>${appTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; text-align: left;">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 40px 40px 24px 40px;">
                            ${logoUrl ? `
                            <img src="${logoUrl}" alt="${appTitle}" height="28" style="display: block;" onerror="this.style.display='none'" />
                            ` : `
                            <span style="font-size: 20px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">${appTitle}</span>
                            `}
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 500; color: #111827; letter-spacing: -0.02em;">${title}</h1>
                            ${subtitle ? `<p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563;">${subtitle}</p>` : ''}
                            
                            <!-- Body Content -->
                            <div style="font-size: 15px; color: #374151; line-height: 1.6;">
                                ${content}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; border-top: 1px solid #e5e7eb; background-color: #ffffff;">
                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">
                                Having trouble with your account? <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 4px;">Contact us</a>
                            </p>
                            <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                                Best,<br/>
                                ~ ${appTitle} team
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

// Helper to create info box with icon (for credentials, etc.)
function createInfoBox(iconType: 'email' | 'password' | 'key' | 'info', label: string, value: string): string {
    const settings = getSettingsSync();
    const primaryColor = settings.primaryColor;
    
    // Minimalistic line icons
    const icons: Record<string, string> = {
        email: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5"><path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="5" width="18" height="14" rx="2" stroke-linecap="round"/></svg>`,
        password: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
        key: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
        info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`
    };

    return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
            <tr>
                <td style="padding: 12px 0;">
                    <table cellpadding="0" cellspacing="0">
                        <tr>
                            <td style="width: 32px; vertical-align: middle;">
                                ${icons[iconType]}
                            </td>
                            <td style="vertical-align: middle;">
                                <p style="margin: 0; font-size: 14px; color: #4B5563;">
                                    <span style="font-weight: 500; color: #111827; margin-right: 8px;">${label}:</span> ${value}
                                </p>
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
        info: { bg: '#ffffff', border: '#e5e7eb', text: '#374151', icon: '#3b82f6' },
        warning: { bg: '#ffffff', border: '#e5e7eb', text: '#374151', icon: '#f59e0b' },
        success: { bg: '#ffffff', border: '#e5e7eb', text: '#374151', icon: '#10b981' }
    };
    const c = colors[type];

    return `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${c.bg}; border: 1px solid ${c.border}; border-left: 3px solid ${c.icon}; border-radius: 4px; margin: 20px 0;">
            <tr>
                <td style="padding: 12px 16px;">
                    <p style="margin: 0; font-size: 14px; color: ${c.text};">${message}</p>
                </td>
            </tr>
        </table>
    `;
}

/**
 * Primary Blue Button
 */
const button = (text: string, url: string, iconHtml?: string): string => {
    const settings = getSettingsSync();
    return `
        <table cellpadding="0" cellspacing="0" style="margin: 24px 0;">
            <tr>
                <td style="background-color: ${settings.primaryColor}; border-radius: 4px;">
                    <a href="${url}" style="display: flex; align-items: center; padding: 12px 20px; font-size: 15px; font-weight: 500; color: #ffffff; text-decoration: none;">
                        ${iconHtml ? `<span style="margin-right: 8px; display: flex; align-items: center;">${iconHtml}</span>` : ''}
                        <span>${text}</span>
                    </a>
                </td>
            </tr>
        </table>
    `;
};

// ============================================
// TEMPLATE FUNCTIONS
// ============================================

// 1. WELCOME EMAIL
export const generateWelcomeHtml = (data: WelcomeEmailData): string => {
    const settings = getSettingsSync();
    const loginUrl = data.loginUrl || `${FRONTEND_URL}/login`;

    const content = `
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            ${data.recipientName ? `Hello <strong style="color: #047857;">${data.recipientName}</strong>,` : `Hello,`}
        </p>

        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
           Your account has been created${data.organizationName ? ` for ${data.organizationName}` : ''}. You are all set to start using the platform.
        </p>
        
        ${button('Start Using SupportPro', loginUrl)}
    `;

    return baseTemplate('WELCOME TO THE TEAM', 'Your account has been created', content, data);
};

// 2. WELCOME WITH CREDENTIALS
export const generateWelcomeCredentialsHtml = (data: WelcomeCredentialsData): string => {
    const content = `
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            ${data.recipientName ? `Hello <strong style="color: #047857;">${data.recipientName}</strong>,` : `Hello,`}
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            An administrator has created your account. Use the credentials below to access the platform.
        </p>
        
        ${createInfoBox('email', 'EMAIL', data.userEmail)}
        ${createInfoBox('password', 'TEMPORARY PASSWORD', data.tempPassword)}

        ${data.isTemporaryPassword ? createNoticeBox('<strong>Password Change Required</strong><br/>You will be asked to create a new password when you first log in.', 'info') : ''}
        
        ${button('Log In to Your Account', data.loginUrl)}
    `;

    return baseTemplate('WELCOME TO THE TEAM', 'Your account has been created', content, data);
};

// 3. OTP / VERIFICATION
export const generateOtpEmailHtml = (data: OtpTemplateData): string => {
    const title = otpTitles[data.purpose] || 'VERIFICATION CODE';
    const settings = getSettingsSync();

    const content = `
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            Enter the following verification code to complete your action:
        </p>
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; margin: 24px 0; border: 2px dashed #e2e8f0;">
            <tr>
                <td style="padding: 32px; text-align: center;">
                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${settings.primaryColor}; font-family: monospace;">
                        ${data.code}
                    </span>
                </td>
            </tr>
        </table>
        
        <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
            This code will expire in <strong>${data.expiryMinutes || 10} minutes</strong>. If you didn't attempt this action, please secure your account immediately.
        </p>
    `;

    return baseTemplate(title, 'Use this code to complete your verification', content, data);
};

// 4. PASSWORD CHANGED
export const generatePasswordChangedHtml = (data: PasswordChangedData): string => {
    const changedAt = (data.changedAt || new Date()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const content = `
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            ${data.recipientName ? `Hello <strong style="color: #047857;">${data.recipientName}</strong>,` : 'Hello,'}
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            Your account password was successfully changed on <strong>${changedAt}</strong>.
        </p>
        
        ${createNoticeBox('If you did not make this change, please contact support immediately to secure your account.', 'warning')}
    `;

    return baseTemplate('SECURITY UPDATE', 'Your password was changed', content, data);
};

// 5. 2FA STATUS
export const generateTwoFactorStatusHtml = (data: TwoFactorStatusData): string => {
    const title = data.enabled ? 'Two-factor Authentication Enabled' : 'Two-factor Authentication Disabled';
    const message = data.enabled
        ? 'Your account is now protected with an extra layer of security.'
        : 'Two-factor authentication has been turned off on your account.';

    const content = `
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            ${message}
        </p>
        
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
            If you didn't make this change, please contact support immediately.
        </p>
    `;

    return baseTemplate(title.toUpperCase(), 'Security settings updated', content, data);
};

// 6. ALERT (Clean List)
export const generateAlertHtml = (data: AlertEmailData): string => {
    const severityTitles: Record<string, string> = { critical: 'CRITICAL ALERT', warning: 'WARNING ALERT', info: 'SYSTEM INFO' };
    const title = severityTitles[data.alertType] || 'ALERT TRIGGERED';

    const content = `
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            A <strong>${data.alertType.toUpperCase()}</strong> alert has been triggered on your platform.
        </p>
        
        ${createInfoBox('info', 'ALERT NAME', data.title)}
        ${data.deviceName ? createInfoBox('info', 'DEVICE', data.deviceName) : ''}
        ${data.eventName ? createInfoBox('info', 'EVENT', data.eventName) : ''}
        ${createInfoBox('info', 'TIME', (data.timestamp || new Date()).toLocaleString())}
        
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${data.alertType === 'critical' ? '#fef2f2' : data.alertType === 'warning' ? '#fffbeb' : '#eff6ff'}; border-radius: 8px; margin: 16px 0;">
            <tr>
                <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 600; color: ${data.alertType === 'critical' ? '#991b1b' : data.alertType === 'warning' ? '#92400e' : '#1e40af'}; text-transform: uppercase; letter-spacing: 0.05em;">MESSAGE</p>
                    <p style="margin: 0; font-size: 14px; color: ${data.alertType === 'critical' ? '#7f1d1d' : data.alertType === 'warning' ? '#92400e' : '#1e40af'};">${data.message}</p>
                </td>
            </tr>
        </table>
        
        ${data.actionUrl ? button('View Alert Details', data.actionUrl) : ''}
    `;

    return baseTemplate(title, 'A new alert requires your attention', content, data);
};

// 7. EVENT END REQUEST
export const generateEventEndRequestHtml = (data: EventEndRequestData): string => {
    const content = `
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            ${data.recipientName ? `Hello <strong style="color: #047857;">${data.recipientName}</strong>,` : 'Hello,'}
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            A request has been submitted to mark the following event as <strong>ENDED</strong>. Please review and take action.
        </p>
        
        ${createInfoBox('info', 'EVENT NAME', data.eventName)}
        ${data.eventCode ? createInfoBox('key', 'EVENT CODE', data.eventCode) : ''}
        ${createInfoBox('info', 'REQUESTED BY', data.requestedByName)}
        ${createInfoBox('info', 'REQUEST TIME', data.requestTime)}
        
        ${button('Review Event', data.eventUrl)}
        
        <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
            If you approve this request, you can terminate the event from the event details page.
        </p>
    `;

    return baseTemplate('EVENT END REQUEST', 'An event manager requested to end an event', content, data);
};

// 8. EVENT DELETE REQUEST
export const generateEventDeleteRequestHtml = (data: EventDeleteRequestData): string => {
    const content = `
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            ${data.recipientName ? `Hello <strong style="color: #047857;">${data.recipientName}</strong>,` : 'Hello,'}
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            A request has been submitted to <strong>DELETE</strong> the following event. Please review and take action.
        </p>
        
        ${createInfoBox('info', 'EVENT NAME', data.eventName)}
        ${data.eventCode ? createInfoBox('key', 'EVENT CODE', data.eventCode) : ''}
        ${createInfoBox('info', 'REQUESTED BY', data.requestedByName)}
        ${createInfoBox('info', 'REQUEST TIME', data.requestTime)}
        
        ${button('Review Event', data.eventUrl)}
        
        <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
            Deleting an event is irreversible. Ensure you verify the details before approving.
        </p>
    `;

    return baseTemplate('EVENT DELETE REQUEST', 'An event manager requested to delete an event', content, data);
};

// 9. PASSWORD RESET
export const generatePasswordResetHtml = (data: PasswordResetData): string => {
    const content = `
        <p style="margin: 0 0 20px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            ${data.recipientName ? `Hello <strong style="color: #047857;">${data.recipientName}</strong>,` : 'Hello,'}
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
        </p>
        
        ${button('Reset Password', data.resetUrl)}
        
        <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
            This link will expire in <strong>${data.expiryMinutes || 30} minutes</strong>. If you didn't request this, you can safely ignore this email.
        </p>
    `;

    return baseTemplate('PASSWORD RESET', 'A password reset was requested for your account', content, data);
};

// ============================================
// TEXT VERSIONS (Unchanged - they are already simple)
// ============================================

export interface WelcomeEmailData extends BaseTemplateData { loginUrl?: string; organizationName?: string; }
export const generateWelcomeText = (data: WelcomeEmailData) => generateSimpleText(data, 'Welcome', `Your account has been created. Login at: ${data.loginUrl || `${FRONTEND_URL}/login`}`);

export interface WelcomeCredentialsData extends BaseTemplateData { userName: string; userEmail: string; tempPassword: string; loginUrl: string; isTemporaryPassword: boolean; }
export const generateWelcomeCredentialsText = (data: WelcomeCredentialsData) => generateSimpleText(data, 'Welcome to the Team', `Your account has been created.\n\nEmail: ${data.userEmail}\nPassword: ${data.tempPassword}\n\nLogin at: ${data.loginUrl}`);

export interface OtpTemplateData extends BaseTemplateData { code: string; expiryMinutes?: number; purpose: 'email_verification' | 'password_reset' | 'login_2fa' | 'phone_verification'; }
const otpTitles = { email_verification: 'Verify Email', password_reset: 'Reset Password', login_2fa: 'Verification Code', phone_verification: 'Verify Phone' };
export const generateOtpEmailText = (data: OtpTemplateData) => generateSimpleText(data, otpTitles[data.purpose], `Code: ${data.code}\nExpires in ${data.expiryMinutes || 10} minutes.`);

export interface PasswordChangedData extends BaseTemplateData { changedAt?: Date; ipAddress?: string; userAgent?: string; }
export const generatePasswordChangedText = (data: PasswordChangedData) => generateSimpleText(data, 'Password Changed', `Your password was changed on ${(data.changedAt || new Date()).toLocaleString()}.`);

export interface TwoFactorStatusData extends BaseTemplateData { enabled: boolean; method?: string; }
export const generateTwoFactorStatusText = (data: TwoFactorStatusData) => generateSimpleText(data, `2FA ${data.enabled ? 'Enabled' : 'Disabled'}`, `Two-factor authentication has been ${data.enabled ? 'enabled' : 'disabled'}.`);

export interface AlertEmailData extends BaseTemplateData { alertType: 'critical' | 'warning' | 'info'; title: string; message: string; deviceName?: string; eventName?: string; timestamp?: Date; actionUrl?: string; }
export const generateAlertText = (data: AlertEmailData) => generateSimpleText(data, data.title, `${data.message}\n\n${data.actionUrl ? `View: ${data.actionUrl}` : ''}`);

export interface EventEndRequestData extends BaseTemplateData { eventName: string; eventCode?: string; requestedByName: string; requestTime: string; eventUrl: string; organizationName?: string; }
export const generateEventEndRequestText = (data: EventEndRequestData) => generateSimpleText(data, 'Event End Request', `Event: ${data.eventName}\nRequested by: ${data.requestedByName}\nReview: ${data.eventUrl}`);

export interface EventDeleteRequestData extends BaseTemplateData { eventName: string; eventCode?: string; requestedByName: string; requestTime: string; eventUrl: string; organizationName?: string; }
export const generateEventDeleteRequestText = (data: EventDeleteRequestData) => generateSimpleText(data, 'Event Delete Request', `Event: ${data.eventName}\nRequested by: ${data.requestedByName}\nReview: ${data.eventUrl}`);

export interface PasswordResetData extends BaseTemplateData { resetUrl: string; expiryMinutes?: number; }
export const generatePasswordResetText = (data: PasswordResetData) => generateSimpleText(data, 'Reset Password', `Reset link: ${data.resetUrl}\nExpires in ${data.expiryMinutes || 30} minutes.`);

// Text Helper
function generateSimpleText(data: BaseTemplateData, title: string, body: string): string {
    const settings = getSettingsSync();
    return `${settings.title} - ${title}\n\n${data.recipientName ? `Hi ${data.recipientName},\n\n` : ''}${body}\n\nBest,\n~ ${settings.title} team`;
}



