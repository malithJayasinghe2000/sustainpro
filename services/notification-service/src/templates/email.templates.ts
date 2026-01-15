import { config } from '../config';

/**
 * Email Template Generator
 * Matches SustainPro Dashboard UI Design Pattern
 * - Clean white cards with borders
 * - Icon containers with colored backgrounds (matching profile page)
 * - Section-based layout
 * - Professional typography
 */

interface BaseTemplateData {
    recipientName?: string;
    supportEmail?: string;
    companyName?: string;
    logoUrl?: string;
}

// System Colors (matches globals.css / dashboard)
const COLORS = {
    background: '#f8fafc',      // Page background
    card: '#ffffff',            // Card background
    border: '#e2e8f0',          // Border color
    primary: '#004737',         // Primary brand (teal)
    primaryLight: '#e6f2ef',    // Primary background (10% opacity equivalent)
    foreground: '#0f172a',      // Main text
    muted: '#64748b',           // Secondary text
    mutedBg: '#f1f5f9',         // Muted background
    success: '#16a34a',
    successLight: '#f0fdf4',
    successBorder: '#bbf7d0',
    warning: '#d97706',
    warningLight: '#fffbeb',
    warningBorder: '#fde68a',
    error: '#dc2626',
    errorLight: '#fef2f2',
    errorBorder: '#fecaca',
    info: '#2563eb',
    infoLight: '#eff6ff',
    infoBorder: '#bfdbfe',
};

// Base HTML template - matches dashboard card layout
const baseHtmlTemplate = (content: string, data: BaseTemplateData = {}): string => {
    const companyName = data.companyName || config.templates.companyName;
    const supportEmail = data.supportEmail || config.templates.supportEmail;

    let logoUrl = data.logoUrl || config.templates.logoUrl;
    if (logoUrl === 'https://sustainpro.io/logo.png') {
        logoUrl = '';
    }

    const year = new Date().getFullYear();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.background};">
        <tr>
            <td style="padding: 32px 16px;">
                <!-- Main Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; margin: 0 auto;">
                    
                    <!-- Header Section (like breadcrumb area) -->
                    <tr>
                        <td style="padding: 0 0 24px;">
                            ${logoUrl
            ? `<img src="${logoUrl}" alt="${companyName}" style="height: 32px; width: auto;">`
            : `<span style="font-size: 18px; font-weight: 700; color: ${COLORS.foreground}; letter-spacing: -0.3px;">${companyName}</span>`
        }
                        </td>
                    </tr>
                    
                    <!-- Main Card (matches bg-card border border-border rounded-xl) -->
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden;">
                                <tr>
                                    <td style="padding: 32px;">
                                        ${content}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 0 0; text-align: center;">
                            <p style="margin: 0 0 6px; font-size: 12px; color: ${COLORS.muted};">&copy; ${year} ${companyName}. All rights reserved.</p>
                            <p style="margin: 0; font-size: 12px; color: ${COLORS.muted};">
                                Questions? <a href="mailto:${supportEmail}" style="color: ${COLORS.primary}; text-decoration: none;">${supportEmail}</a>
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

// Helper: Create an icon box (matches the dashboard pattern: w-10 h-10 bg-primary/10 rounded-lg)
const iconBox = (bgColor: string, iconSvg: string) => `
    <td style="width: 40px; height: 40px; background-color: ${bgColor}; border-radius: 8px; text-align: center; vertical-align: middle;">
        ${iconSvg}
    </td>
`;

// Helper: Create a section header (matches header-section class)
const sectionHeader = (title: string, subtitle?: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
        <tr>
            <td>
                <h2 style="margin: 0; font-size: 15px; font-weight: 600; color: ${COLORS.foreground}; text-transform: uppercase; letter-spacing: 0.5px;">${title}</h2>
                ${subtitle ? `<p style="margin: 6px 0 0; font-size: 13px; color: ${COLORS.muted};">${subtitle}</p>` : ''}
            </td>
        </tr>
    </table>
`;

// Helper: Create an info row (matches the account info display)
const infoRow = (icon: string, iconBg: string, label: string, value: string, isLast: boolean = false) => `
    <tr>
        <td style="padding: 16px; ${!isLast ? `border-bottom: 1px solid ${COLORS.border};` : ''}">
            <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                    ${iconBox(iconBg, icon)}
                    <td style="padding-left: 16px; vertical-align: middle;">
                        <p style="margin: 0; font-size: 11px; color: ${COLORS.muted}; text-transform: uppercase; letter-spacing: 0.3px;">${label}</p>
                        <p style="margin: 4px 0 0; font-size: 14px; font-weight: 500; color: ${COLORS.foreground};">${value}</p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
`;

// SVG Icons
const ICONS = {
    shield: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    key: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
    check: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    alert: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    info: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    mail: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    user: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    clock: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    server: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>`,
};

// ============================================
// OTP / Verification Code Templates
// ============================================

export interface OtpTemplateData extends BaseTemplateData {
    code: string;
    expiryMinutes?: number;
    purpose: 'email_verification' | 'password_reset' | 'login_2fa' | 'phone_verification';
}

const otpConfig = {
    email_verification: { title: 'Email Verification', subtitle: 'Verify your email address to continue' },
    password_reset: { title: 'Password Reset', subtitle: 'Use this code to reset your password' },
    login_2fa: { title: 'Two-Factor Authentication', subtitle: 'Complete your login with this verification code' },
    phone_verification: { title: 'Phone Verification', subtitle: 'Verify your phone number' },
};

export const generateOtpEmailHtml = (data: OtpTemplateData): string => {
    const purpose = data.purpose && otpConfig[data.purpose] ? data.purpose : 'login_2fa';
    const cfg = otpConfig[purpose];
    const expiryMinutes = data.expiryMinutes || config.templates.otpExpiryMinutes;

    const content = `
        <!-- Section Header -->
        ${sectionHeader(cfg.title, cfg.subtitle)}
        
        <!-- Greeting -->
        <p style="margin: 0 0 20px; font-size: 14px; color: ${COLORS.muted};">
            Hello${data.recipientName ? ` <strong style="color: ${COLORS.foreground};">${data.recipientName}</strong>` : ''},
        </p>
        
        <!-- Code Box (matches the card section style) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px; background-color: ${COLORS.mutedBg}; border: 1px solid ${COLORS.border}; border-radius: 8px;">
            <tr>
                <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 12px; font-size: 12px; color: ${COLORS.muted}; text-transform: uppercase; letter-spacing: 0.5px;">Your verification code</p>
                    <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: ${COLORS.primary}; font-family: 'Courier New', monospace;">${data.code}</p>
                    <p style="margin: 16px 0 0; font-size: 13px; color: ${COLORS.muted};">
                        Expires in <strong style="color: ${COLORS.foreground};">${expiryMinutes} minutes</strong>
                    </p>
                </td>
            </tr>
        </table>
        
        <!-- Warning Box (matches info box pattern from profile page) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.warningLight}; border: 1px solid ${COLORS.warningBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(217, 119, 6, 0.15)', ICONS.alert(COLORS.warning))}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; font-weight: 500; color: #92400e;">Security Notice</p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #a16207;">Never share this code with anyone. We will never ask for it.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return baseHtmlTemplate(content, data);
};

export const generateOtpEmailText = (data: OtpTemplateData): string => {
    const purpose = data.purpose && otpConfig[data.purpose] ? data.purpose : 'login_2fa';
    const cfg = otpConfig[purpose];
    const expiryMinutes = data.expiryMinutes || config.templates.otpExpiryMinutes;
    const companyName = data.companyName || config.templates.companyName;

    return `
${companyName} - ${cfg.title}

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

Your verification code: ${data.code}

This code expires in ${expiryMinutes} minutes.

Security: Never share this code with anyone.

---
${new Date().getFullYear()} ${companyName}
`.trim();
};

// ============================================
// Password Changed Notification
// ============================================

export interface PasswordChangedData extends BaseTemplateData {
    changedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
}

export const generatePasswordChangedHtml = (data: PasswordChangedData): string => {
    const changedAt = (data.changedAt || new Date()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const content = `
        <!-- Section Header -->
        ${sectionHeader('Password Changed', 'Your account password has been updated')}
        
        <!-- Greeting -->
        <p style="margin: 0 0 20px; font-size: 14px; color: ${COLORS.muted};">
            Hello${data.recipientName ? ` <strong style="color: ${COLORS.foreground};">${data.recipientName}</strong>` : ''},
        </p>
        
        <!-- Success Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px; background-color: ${COLORS.successLight}; border: 1px solid ${COLORS.successBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(22, 163, 74, 0.15)', ICONS.check(COLORS.success))}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; font-weight: 500; color: #166534;">Password updated successfully</p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #15803d;">Changed at: ${changedAt}</p>
                                ${data.ipAddress ? `<p style="margin: 2px 0 0; font-size: 11px; color: #16a34a;">IP: ${data.ipAddress}</p>` : ''}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Warning Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.warningLight}; border: 1px solid ${COLORS.warningBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(217, 119, 6, 0.15)', ICONS.alert(COLORS.warning))}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; font-weight: 500; color: #92400e;">Wasn't you?</p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #a16207;">Contact support immediately to secure your account.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return baseHtmlTemplate(content, data);
};

export const generatePasswordChangedText = (data: PasswordChangedData): string => {
    const changedAt = (data.changedAt || new Date()).toLocaleString();
    const companyName = data.companyName || config.templates.companyName;

    return `
${companyName} - Password Changed

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

Your password was changed on ${changedAt}.

If this wasn't you, contact support immediately.

---
${new Date().getFullYear()} ${companyName}
`.trim();
};

// ============================================
// 2FA Enabled/Disabled Notification
// ============================================

export interface TwoFactorStatusData extends BaseTemplateData {
    enabled: boolean;
    method?: string;
}

export const generateTwoFactorStatusHtml = (data: TwoFactorStatusData): string => {
    const method = data.method || 'email';

    const enabledContent = `
        <!-- Section Header -->
        ${sectionHeader('Two-Factor Authentication', 'Security settings updated')}
        
        <!-- Greeting -->
        <p style="margin: 0 0 20px; font-size: 14px; color: ${COLORS.muted};">
            Hello${data.recipientName ? ` <strong style="color: ${COLORS.foreground};">${data.recipientName}</strong>` : ''},
        </p>
        
        <!-- Status Box (Success) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px; background-color: ${COLORS.successLight}; border: 1px solid ${COLORS.successBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(22, 163, 74, 0.15)', ICONS.shield(COLORS.success))}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; font-weight: 500; color: #166534;">2FA is now enabled</p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #15803d;">Your account is protected with ${method} verification.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Info Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.infoLight}; border: 1px solid ${COLORS.infoBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(37, 99, 235, 0.15)', ICONS.info(COLORS.info))}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; font-weight: 500; color: #1e40af;">How it works</p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #1d4ed8;">You'll receive a 6-digit code via email for every login. Codes expire after 10 minutes.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    const disabledContent = `
        <!-- Section Header -->
        ${sectionHeader('Two-Factor Authentication', 'Security settings updated')}
        
        <!-- Greeting -->
        <p style="margin: 0 0 20px; font-size: 14px; color: ${COLORS.muted};">
            Hello${data.recipientName ? ` <strong style="color: ${COLORS.foreground};">${data.recipientName}</strong>` : ''},
        </p>
        
        <!-- Status Box (Warning) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px; background-color: ${COLORS.warningLight}; border: 1px solid ${COLORS.warningBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(217, 119, 6, 0.15)', ICONS.shield(COLORS.warning))}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; font-weight: 500; color: #92400e;">2FA has been disabled</p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #a16207;">Your account is now less secure. We recommend re-enabling 2FA.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <p style="margin: 0; font-size: 13px; color: ${COLORS.muted};">
            If you didn't make this change, please contact support immediately.
        </p>
    `;

    return baseHtmlTemplate(data.enabled ? enabledContent : disabledContent, data);
};

export const generateTwoFactorStatusText = (data: TwoFactorStatusData): string => {
    const companyName = data.companyName || config.templates.companyName;
    const status = data.enabled ? 'Enabled' : 'Disabled';

    return `
${companyName} - 2FA ${status}

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

Two-factor authentication has been ${data.enabled ? 'enabled' : 'disabled'}.

${data.enabled ? 'Your account is now more secure.' : 'Warning: Your account is less secure.'}

---
${new Date().getFullYear()} ${companyName}
`.trim();
};

// ============================================
// Welcome Email
// ============================================

export interface WelcomeEmailData extends BaseTemplateData {
    loginUrl?: string;
    organizationName?: string;
}

export const generateWelcomeHtml = (data: WelcomeEmailData): string => {
    const loginUrl = data.loginUrl || 'https://app.sustainpro.io/login';
    const companyName = data.companyName || config.templates.companyName;

    const content = `
        <!-- Section Header -->
        ${sectionHeader('Welcome to ' + companyName, 'Your account is ready')}
        
        <!-- Greeting -->
        <p style="margin: 0 0 20px; font-size: 14px; color: ${COLORS.muted};">
            Hello${data.recipientName ? ` <strong style="color: ${COLORS.foreground};">${data.recipientName}</strong>` : ''},
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; color: ${COLORS.muted};">
            Your account has been successfully created${data.organizationName ? ` for <strong style="color: ${COLORS.foreground};">${data.organizationName}</strong>` : ''}.
        </p>
        
        <!-- CTA Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
            <tr>
                <td>
                    <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${COLORS.primary}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px;">
                        Access Dashboard
                    </a>
                </td>
            </tr>
        </table>
        
        <!-- Getting Started Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.infoLight}; border: 1px solid ${COLORS.infoBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(37, 99, 235, 0.15)', ICONS.info(COLORS.info))}
                            <td style="padding-left: 16px; vertical-align: top;">
                                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 500; color: #1e40af;">Getting Started</p>
                                <p style="margin: 0 0 4px; font-size: 12px; color: #1d4ed8;">1. Complete your profile setup</p>
                                <p style="margin: 0 0 4px; font-size: 12px; color: #1d4ed8;">2. Enable two-factor authentication</p>
                                <p style="margin: 0; font-size: 12px; color: #1d4ed8;">3. Explore the dashboard</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return baseHtmlTemplate(content, data);
};

export const generateWelcomeText = (data: WelcomeEmailData): string => {
    const companyName = data.companyName || config.templates.companyName;
    const loginUrl = data.loginUrl || 'https://app.sustainpro.io/login';

    return `
Welcome to ${companyName}

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

Your account has been created${data.organizationName ? ` for ${data.organizationName}` : ''}.

Login: ${loginUrl}

Getting Started:
1. Complete your profile
2. Enable 2FA
3. Explore the dashboard

---
${new Date().getFullYear()} ${companyName}
`.trim();
};

// ============================================
// Alert Notification
// ============================================

export interface AlertEmailData extends BaseTemplateData {
    alertType: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    deviceName?: string;
    eventName?: string;
    timestamp?: Date;
    actionUrl?: string;
}

export const generateAlertHtml = (data: AlertEmailData): string => {
    const timestamp = (data.timestamp || new Date()).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const alertStyles = {
        critical: { bg: COLORS.errorLight, border: COLORS.errorBorder, color: '#991b1b', iconBg: 'rgba(220, 38, 38, 0.15)', icon: ICONS.alert(COLORS.error) },
        warning: { bg: COLORS.warningLight, border: COLORS.warningBorder, color: '#92400e', iconBg: 'rgba(217, 119, 6, 0.15)', icon: ICONS.alert(COLORS.warning) },
        info: { bg: COLORS.infoLight, border: COLORS.infoBorder, color: '#1e40af', iconBg: 'rgba(37, 99, 235, 0.15)', icon: ICONS.info(COLORS.info) },
    };

    const style = alertStyles[data.alertType];

    const content = `
        <!-- Section Header -->
        ${sectionHeader(data.alertType.toUpperCase() + ' Alert', data.title)}
        
        <!-- Greeting -->
        <p style="margin: 0 0 20px; font-size: 14px; color: ${COLORS.muted};">
            Hello${data.recipientName ? ` <strong style="color: ${COLORS.foreground};">${data.recipientName}</strong>` : ''},
        </p>
        
        <!-- Alert Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px; background-color: ${style.bg}; border: 1px solid ${style.border}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox(style.iconBg, style.icon)}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; color: ${style.color};">${data.message}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        
        <!-- Details (matches info row pattern) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.mutedBg}; border: 1px solid ${COLORS.border}; border-radius: 8px; margin: 0 0 20px;">
            ${data.deviceName ? infoRow(ICONS.server(COLORS.primary), COLORS.primaryLight, 'Device', data.deviceName) : ''}
            ${data.eventName ? infoRow(ICONS.clock(COLORS.primary), COLORS.primaryLight, 'Event', data.eventName) : ''}
            ${infoRow(ICONS.clock(COLORS.primary), COLORS.primaryLight, 'Time', timestamp, true)}
        </table>
        
        ${data.actionUrl ? `
        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
                <td>
                    <a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${COLORS.primary}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; border-radius: 8px;">
                        View Details
                    </a>
                </td>
            </tr>
        </table>` : ''}
    `;

    return baseHtmlTemplate(content, data);
};

export const generateAlertText = (data: AlertEmailData): string => {
    const companyName = data.companyName || config.templates.companyName;
    const timestamp = (data.timestamp || new Date()).toLocaleString();

    return `
${companyName} - ${data.alertType.toUpperCase()} Alert

${data.title}

${data.message}

${data.deviceName ? `Device: ${data.deviceName}` : ''}
${data.eventName ? `Event: ${data.eventName}` : ''}
Time: ${timestamp}

${data.actionUrl ? `View: ${data.actionUrl}` : ''}

---
${new Date().getFullYear()} ${companyName}
`.trim();
};

// ============================================
// Welcome Credentials Email (Admin-Created Users)
// ============================================

export interface WelcomeCredentialsData extends BaseTemplateData {
    userName: string;
    userEmail: string;
    tempPassword: string;
    loginUrl: string;
    isTemporaryPassword: boolean;
}

export const generateWelcomeCredentialsHtml = (data: WelcomeCredentialsData): string => {
    const content = `
        ${sectionHeader('Welcome to the Team', 'Your account has been created')}
        
        <!-- Greeting -->
        <p style="margin: 0 0 20px; font-size: 14px; color: ${COLORS.muted};">
            Hello <strong style="color: ${COLORS.foreground};">${data.userName}</strong>,
        </p>
        
        <p style="margin: 0 0 24px; font-size: 14px; color: ${COLORS.muted}; line-height: 1.6;">
            An administrator has created your account. Use the credentials below to access the platform.
        </p>
        
        <!-- Credentials Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px; background-color: ${COLORS.mutedBg}; border: 1px solid ${COLORS.border}; border-radius: 8px;">
            ${infoRow(ICONS.mail(COLORS.primary), COLORS.primaryLight, 'Email', data.userEmail, false)}
            ${infoRow(ICONS.key(COLORS.primary), COLORS.primaryLight, 'Temporary Password', `<code style="font-family: 'Courier New', monospace; font-size: 15px; font-weight: 600; letter-spacing: 1px; color: ${COLORS.primary};">${data.tempPassword}</code>`, true)}
        </table>
        
        ${data.isTemporaryPassword ? `
        <!-- Notice Box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px; background-color: ${COLORS.infoLight}; border: 1px solid ${COLORS.infoBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(37, 99, 235, 0.15)', ICONS.info(COLORS.info))}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; font-weight: 500; color: #1e40af;">Password Change Required</p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #1d4ed8;">You will be asked to create a new password when you first log in.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        ` : ''}
        
        <!-- CTA Button -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
            <tr>
                <td>
                    <a href="${data.loginUrl}" style="display: inline-block; padding: 14px 28px; background-color: ${COLORS.primary}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px;">
                        Log In to Your Account
                    </a>
                </td>
            </tr>
        </table>
        
        <!-- Security Warning -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.warningLight}; border: 1px solid ${COLORS.warningBorder}; border-radius: 8px;">
            <tr>
                <td style="padding: 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                            ${iconBox('rgba(217, 119, 6, 0.15)', ICONS.alert(COLORS.warning))}
                            <td style="padding-left: 16px; vertical-align: middle;">
                                <p style="margin: 0; font-size: 13px; font-weight: 500; color: #92400e;">Keep Your Credentials Safe</p>
                                <p style="margin: 4px 0 0; font-size: 12px; color: #a16207;">Do not share your password with anyone. Delete this email after you've logged in.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    return baseHtmlTemplate(content, data);
};

export const generateWelcomeCredentialsText = (data: WelcomeCredentialsData): string => {
    const companyName = data.companyName || config.templates.companyName;

    return `
${companyName} - Welcome to the Team

Hello ${data.userName},

An administrator has created your account. Use the credentials below to access the platform.

Email: ${data.userEmail}
Temporary Password: ${data.tempPassword}

${data.isTemporaryPassword ? 'IMPORTANT: You will be asked to create a new password when you first log in.' : ''}

Log in here: ${data.loginUrl}

Security: Do not share your password with anyone. Delete this email after you've logged in.

---
${new Date().getFullYear()} ${companyName}
`.trim();
};
