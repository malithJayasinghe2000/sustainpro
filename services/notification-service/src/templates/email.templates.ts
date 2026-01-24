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
    companyName?: string;
    logoUrl?: string;
}

// System settings cache
let cachedSettings: { primaryColor: string; logoUrl: string; companyName: string; supportEmail: string } | null = null;
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

export async function getSystemSettings(): Promise<{ primaryColor: string; logoUrl: string; companyName: string; supportEmail: string }> {
    const now = Date.now();

    // Default logo is strictly from frontend
    const defaultLogoUrl = `${FRONTEND_URL}/logo.png`;

    const defaults = {
        primaryColor: '#2563EB', // Akkio blue
        logoUrl: defaultLogoUrl,
        companyName: config.templates.companyName || 'SustainPro',
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
                companyName: settings.system_name || defaults.companyName,
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
        companyName: 'SustainPro',
        supportEmail: 'support@sustainpro.io'
    };
}

getSystemSettings().catch(() => { });

// ============================================
// BASE TEMPLATE
// ============================================

const baseTemplate = (content: string, data: BaseTemplateData = {}): string => {
    const settings = getSettingsSync();
    const companyName = data.companyName || settings.companyName;
    const supportEmail = data.supportEmail || settings.supportEmail;
    const primaryColor = settings.primaryColor;
    const logoUrl = data.logoUrl || settings.logoUrl;

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; color: #111827;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                
                <!-- Main Card -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden; text-align: left;">
                    
                    <!-- Top Accent Bar (Thick Blue Line) -->
                    <tr>
                        <td style="height: 6px; background-color: ${primaryColor}; width: 100%;"></td>
                    </tr>
                    
                    <!-- Content Padding Container -->
                    <tr>
                        <td style="padding: 48px;">
                        
                            <!-- Logo (${logoUrl}) -->
                            <div style="margin-bottom: 40px;">
                                <img src="${logoUrl}" alt="${companyName}" height="32" style="display: block; max-height: 32px;" onerror="this.onerror=null; this.src='https://placehold.co/120x32?text=${companyName}'; " />
                            </div>
                            
                            <!-- Dynamic Content -->
                            ${content}
                            
                            <!-- Footer Divider -->
                            <div style="margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 24px;"></div>
                            
                            <!-- Footer Content -->
                            <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">
                                Having trouble with your account? <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none; border-bottom: 1px dotted ${primaryColor};">Contact us</a>
                            </p>
                            
                            <p style="margin: 0; font-size: 14px; color: #9ca3af;">
                                Best,<br/>
                                ~ ${companyName} team
                            </p>
                            
                        </td>
                    </tr>
                </table>
                
                <!-- Simple Copyright -->
                <p style="text-align: center; margin-top: 24px; font-size: 12px; color: #9ca3af;">
                    © ${new Date().getFullYear()} ${companyName}.
                </p>
                
            </td>
        </tr>
    </table>
</body>
</html>`;
};

/**
 * Primary Blue Button
 */
const button = (text: string, url: string): string => {
    const settings = getSettingsSync();
    return `
        <div style="margin: 32px 0;">
            <a href="${url}" style="display: inline-block; background-color: ${settings.primaryColor}; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 500; text-decoration: none; border-radius: 6px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                ${text}
            </a>
        </div>
    `;
};

// ============================================
// TEMPLATE FUNCTIONS
// ============================================

// 1. WELCOME EMAIL (No Info Box)
export const generateWelcomeHtml = (data: WelcomeEmailData): string => {
    const settings = getSettingsSync();
    const loginUrl = data.loginUrl || `${FRONTEND_URL}/login`;

    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">Welcome to ${settings.companyName}!</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            ${data.recipientName ? `Hi <strong>${data.recipientName}</strong>,<br/><br/>` : ''}
            Your account has been created${data.organizationName ? ` for ${data.organizationName}` : ''}. You are all set to start using the platform.
        </p>

        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
           To get started, simply click the button below to log into your dashboard.
        </p>
        
        ${button('Start Using SupportPro', loginUrl)}
    `;

    return baseTemplate(content, data);
};

// 2. WELCOME WITH CREDENTIALS (Removed Colored Boxes)
// Now displays credentials as simple text list
export const generateWelcomeCredentialsHtml = (data: WelcomeCredentialsData): string => {
    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">Welcome to the team!</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            ${data.recipientName ? `Hi <strong>${data.recipientName}</strong>,<br/><br/>` : ''}
            An administrator has created your account. Here are your temporary login details:
        </p>
        
        <div style="margin: 24px 0; padding: 0;">
            <p style="margin: 0 0 8px 0; font-size: 16px; color: #374151;">
                <strong>Email:</strong><br/>
                <span style="font-family: monospace; color: #111827;">${data.userEmail}</span>
            </p>
            <p style="margin: 0; font-size: 16px; color: #374151;">
                <strong>Temporary Password:</strong><br/>
                <span style="font-family: monospace; color: #111827;">${data.tempPassword}</span>
            </p>
        </div>

        ${data.isTemporaryPassword ? `
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280; font-style: italic;">
            Note: For security, you will be asked to set a new password when you first log in.
        </p>` : ''}
        
        ${button('Log In Now', data.loginUrl)}
    `;

    return baseTemplate(content, data);
};

// 3. OTP / VERIFICATION (Simple Text Code)
export const generateOtpEmailHtml = (data: OtpTemplateData): string => {
    const title = otpTitles[data.purpose] || 'Verification Code';
    const settings = getSettingsSync();

    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">${title}</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            Use the verification code below to complete your action:
        </p>
        
        <div style="margin: 32px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 4px; color: ${settings.primaryColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                ${data.code}
            </span>
        </div>
        
        <p style="margin: 0 0 0 0; font-size: 15px; color: #6b7280;">
            This code will expire in ${data.expiryMinutes || 10} minutes. If you didn't request this code, you can ignore this email.
        </p>
    `;

    return baseTemplate(content, data);
};

// 4. PASSWORD CHANGED
export const generatePasswordChangedHtml = (data: PasswordChangedData): string => {
    const changedAt = (data.changedAt || new Date()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">Security Update</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            ${data.recipientName ? `Hi <strong>${data.recipientName}</strong>,<br/><br/>` : ''}
            Your account password was successfully changed on <strong>${changedAt}</strong>.
        </p>
        
        <p style="margin: 0; font-size: 15px; color: #6b7280;">
            If you did not make this change, please contact support immediately to secure your account.
        </p>
    `;

    return baseTemplate(content, data);
};

// 5. 2FA STATUS
export const generateTwoFactorStatusHtml = (data: TwoFactorStatusData): string => {
    const title = data.enabled ? 'Two-factor Authentication Enabled' : 'Two-factor Authentication Disabled';
    const message = data.enabled
        ? 'Your account is now protected with an extra layer of security.'
        : 'Two-factor authentication has been turned off on your account.';

    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">${title}</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            ${message}
        </p>
        
        <p style="margin: 0; font-size: 15px; color: #6b7280;">
            If you didn't make this change, please contact support.
        </p>
    `;

    return baseTemplate(content, data);
};

// 6. ALERT (Clean List)
export const generateAlertHtml = (data: AlertEmailData): string => {
    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">${data.title}</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            ${data.message}
        </p>
        
        <div style="margin-bottom: 24px;">
            ${data.deviceName ? `<p style="margin: 0 0 4px 0; font-size: 15px; color: #4b5563;"><strong>Device:</strong> ${data.deviceName}</p>` : ''}
            ${data.eventName ? `<p style="margin: 0 0 4px 0; font-size: 15px; color: #4b5563;"><strong>Event:</strong> ${data.eventName}</p>` : ''}
            <p style="margin: 0; font-size: 15px; color: #4b5563;"><strong>Time:</strong> ${(data.timestamp || new Date()).toLocaleString()}</p>
        </div>
        
        ${data.actionUrl ? button('View Alert Details', data.actionUrl) : ''}
    `;

    return baseTemplate(content, data);
};

// 7. EVENT END REQUEST (Clean)
export const generateEventEndRequestHtml = (data: EventEndRequestData): string => {
    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">Event End Request</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            ${data.recipientName ? `Hi <strong>${data.recipientName}</strong>,<br/><br/>` : ''}
            An event manager has requested to end the following event:
        </p>
        
        <div style="margin-bottom: 24px; border-left: 3px solid #e5e7eb; padding-left: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${data.eventName}</p>
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">Requested by: ${data.requestedByName}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Time: ${data.requestTime}</p>
        </div>
        
        ${button('Review Event', data.eventUrl)}
    `;

    return baseTemplate(content, data);
};

// 8. EVENT DELETE REQUEST (Clean)
export const generateEventDeleteRequestHtml = (data: EventDeleteRequestData): string => {
    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">Event Delete Request</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            ${data.recipientName ? `Hi <strong>${data.recipientName}</strong>,<br/><br/>` : ''}
            An event manager has requested to delete the following event:
        </p>
        
        <div style="margin-bottom: 24px; border-left: 3px solid #e5e7eb; padding-left: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #111827;">${data.eventName}</p>
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">Requested by: ${data.requestedByName}</p>
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Time: ${data.requestTime}</p>
        </div>
        
        ${button('Review Event', data.eventUrl)}
    `;

    return baseTemplate(content, data);
};

// 9. PASSWORD RESET (Clean)
export const generatePasswordResetHtml = (data: PasswordResetData): string => {
    const content = `
        <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 600; color: #111827; letter-spacing: -0.025em;">Reset your password</h1>
        
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            ${data.recipientName ? `Hi <strong>${data.recipientName}</strong>,<br/><br/>` : ''}
            We received a request to reset your password. Click the button below to set a new one.
        </p>
        
        ${button('Reset Password', data.resetUrl)}
        
        <p style="margin: 0; font-size: 15px; color: #6b7280;">
            This link expires in ${data.expiryMinutes || 30} minutes. If you didn't request this, you can safely ignore this email.
        </p>
    `;

    return baseTemplate(content, data);
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
    return `${settings.companyName} - ${title}\n\n${data.recipientName ? `Hi ${data.recipientName},\n\n` : ''}${body}\n\nBest,\n~ ${settings.companyName} team`;
}
