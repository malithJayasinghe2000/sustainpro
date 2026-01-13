import { config } from '../config';

/**
 * Email Template Generator
 * Generates beautiful HTML and plain text email templates
 */

interface BaseTemplateData {
    recipientName?: string;
    supportEmail?: string;
    companyName?: string;
    logoUrl?: string;
}

// Base HTML template wrapper
const baseHtmlTemplate = (content: string, data: BaseTemplateData = {}): string => {
    const companyName = data.companyName || config.templates.companyName;
    const supportEmail = data.supportEmail || config.templates.supportEmail;
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${companyName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f3f4f6; }
        .wrapper { width: 100%; padding: 40px 20px; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 32px 40px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
        .content { padding: 40px; }
        .content h2 { color: #111827; font-size: 22px; margin-bottom: 16px; }
        .content p { color: #4b5563; margin-bottom: 16px; font-size: 16px; }
        .code-box { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #10b981; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #059669; font-family: 'Courier New', monospace; }
        .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 16px 0; }
        .button:hover { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
        .warning { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .warning p { color: #991b1b; margin: 0; font-size: 14px; }
        .success { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .success p { color: #166534; margin: 0; font-size: 14px; }
        .info { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .info p { color: #1e40af; margin: 0; font-size: 14px; }
        .footer { background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 13px; margin: 4px 0; }
        .footer a { color: #10b981; text-decoration: none; }
        .divider { height: 1px; background-color: #e5e7eb; margin: 24px 0; }
        @media only screen and (max-width: 600px) {
            .wrapper { padding: 20px 10px; }
            .header { padding: 24px 20px; }
            .content { padding: 24px 20px; }
            .footer { padding: 20px; }
            .code { font-size: 28px; letter-spacing: 6px; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <h1>${companyName}</h1>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>&copy; ${year} ${companyName}. All rights reserved.</p>
                <p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
                <p style="margin-top: 12px; font-size: 11px; color: #9ca3af;">
                    This is an automated message. Please do not reply directly to this email.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// ============================================
// OTP / Verification Code Templates
// ============================================

export interface OtpTemplateData extends BaseTemplateData {
    code: string;
    expiryMinutes?: number;
    purpose: 'email_verification' | 'password_reset' | 'login_2fa' | 'phone_verification';
}

const otpPurposeConfig = {
    email_verification: {
        title: 'Verify Your Email',
        description: 'Use the code below to verify your email address:',
        action: 'verify your email',
    },
    password_reset: {
        title: 'Reset Your Password',
        description: 'Use the code below to reset your password:',
        action: 'reset your password',
    },
    login_2fa: {
        title: 'Two-Factor Authentication',
        description: 'Use the code below to complete your login:',
        action: 'complete your login',
    },
    phone_verification: {
        title: 'Verify Your Phone',
        description: 'Use the code below to verify your phone number:',
        action: 'verify your phone',
    },
};

export const generateOtpEmailHtml = (data: OtpTemplateData): string => {
    // Default to login_2fa if purpose is not provided or invalid
    const purpose = data.purpose && otpPurposeConfig[data.purpose] ? data.purpose : 'login_2fa';
    const purposeConfig = otpPurposeConfig[purpose];
    const expiryMinutes = data.expiryMinutes || config.templates.otpExpiryMinutes;

    const content = `
        <h2>${purposeConfig.title}</h2>
        <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
        <p>${purposeConfig.description}</p>
        
        <div class="code-box">
            <span class="code">${data.code}</span>
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 14px;">
            This code expires in <strong>${expiryMinutes} minutes</strong>
        </p>
        
        <div class="divider"></div>
        
        <div class="warning">
            <p><strong>Security Notice:</strong> If you didn't request this code, please ignore this email. Never share this code with anyone.</p>
        </div>
    `;

    return baseHtmlTemplate(content, data);
};

export const generateOtpEmailText = (data: OtpTemplateData): string => {
    // Default to login_2fa if purpose is not provided or invalid
    const purpose = data.purpose && otpPurposeConfig[data.purpose] ? data.purpose : 'login_2fa';
    const purposeConfig = otpPurposeConfig[purpose];
    const expiryMinutes = data.expiryMinutes || config.templates.otpExpiryMinutes;
    const companyName = data.companyName || config.templates.companyName;

    return `
${companyName} - ${purposeConfig.title}

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

${purposeConfig.description}

Your verification code is: ${data.code}

This code expires in ${expiryMinutes} minutes.

SECURITY NOTICE: If you didn't request this code, please ignore this email. Never share this code with anyone.

---
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
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
        dateStyle: 'full',
        timeStyle: 'short',
    });

    const content = `
        <h2>Password Changed Successfully</h2>
        <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
        <p>Your password was successfully changed.</p>
        
        <div class="success">
            <p><strong>Changed at:</strong> ${changedAt}</p>
            ${data.ipAddress ? `<p><strong>IP Address:</strong> ${data.ipAddress}</p>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="warning">
            <p><strong>Wasn't you?</strong> If you didn't make this change, please contact support immediately and secure your account.</p>
        </div>
    `;

    return baseHtmlTemplate(content, data);
};

export const generatePasswordChangedText = (data: PasswordChangedData): string => {
    const changedAt = (data.changedAt || new Date()).toLocaleString();
    const companyName = data.companyName || config.templates.companyName;

    return `
${companyName} - Password Changed

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

Your password was successfully changed on ${changedAt}.

If you didn't make this change, please contact support immediately.

---
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
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
    const status = data.enabled ? 'Enabled' : 'Disabled';
    const method = data.method || 'email';

    const content = data.enabled ? `
        <h2 style="color: #10b981;">Two-Factor Authentication Enabled ✓</h2>
        <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
        <p>Two-factor authentication has been successfully enabled on your account using <strong>${method}</strong>.</p>
        
        <div class="success">
            <p>Your account is now more secure. You'll need to enter a verification code each time you log in.</p>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #6b7280; font-size: 14px;">
            Keep your recovery methods secure. If you lose access to your 2FA device, you may need to contact support.
        </p>
    ` : `
        <h2 style="color: #f59e0b;">Two-Factor Authentication Disabled</h2>
        <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
        <p>Two-factor authentication has been disabled on your account.</p>
        
        <div class="warning">
            <p><strong>Security Notice:</strong> Your account is now less secure. We recommend re-enabling 2FA for better protection.</p>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #6b7280; font-size: 14px;">
            If you didn't make this change, please contact support immediately.
        </p>
    `;

    return baseHtmlTemplate(content, data);
};

export const generateTwoFactorStatusText = (data: TwoFactorStatusData): string => {
    const companyName = data.companyName || config.templates.companyName;
    const status = data.enabled ? 'Enabled' : 'Disabled';

    return `
${companyName} - Two-Factor Authentication ${status}

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

Two-factor authentication has been ${data.enabled ? 'enabled' : 'disabled'} on your account.

${data.enabled ? 'Your account is now more secure.' : 'WARNING: Your account is now less secure. We recommend re-enabling 2FA.'}

If you didn't make this change, please contact support immediately.

---
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
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

    const content = `
        <h2>Welcome to ${data.companyName || config.templates.companyName}! 🎉</h2>
        <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
        <p>Your account has been successfully created${data.organizationName ? ` for <strong>${data.organizationName}</strong>` : ''}.</p>
        
        <p style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" class="button">Get Started →</a>
        </p>
        
        <div class="info">
            <p><strong>What's next?</strong></p>
            <p>• Complete your profile setup</p>
            <p>• Enable two-factor authentication for security</p>
            <p>• Explore the dashboard and features</p>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #6b7280; font-size: 14px;">
            Need help getting started? Check out our documentation or contact support.
        </p>
    `;

    return baseHtmlTemplate(content, data);
};

export const generateWelcomeText = (data: WelcomeEmailData): string => {
    const companyName = data.companyName || config.templates.companyName;
    const loginUrl = data.loginUrl || 'https://app.sustainpro.io/login';

    return `
Welcome to ${companyName}!

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

Your account has been successfully created${data.organizationName ? ` for ${data.organizationName}` : ''}.

Get started: ${loginUrl}

What's next?
• Complete your profile setup
• Enable two-factor authentication for security
• Explore the dashboard and features

Need help? Contact us at ${config.templates.supportEmail}

---
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
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
    const alertColors = {
        critical: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '🚨' },
        warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
        info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' },
    };

    const colors = alertColors[data.alertType];
    const timestamp = (data.timestamp || new Date()).toLocaleString();

    const content = `
        <h2>${colors.icon} ${data.title}</h2>
        <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
        
        <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="color: ${colors.text}; margin: 0; font-weight: 600;">${data.alertType.toUpperCase()} Alert</p>
            <p style="color: ${colors.text}; margin: 8px 0 0 0;">${data.message}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            ${data.deviceName ? `<tr><td style="padding: 8px 0; color: #6b7280;">Device:</td><td style="padding: 8px 0; font-weight: 600;">${data.deviceName}</td></tr>` : ''}
            ${data.eventName ? `<tr><td style="padding: 8px 0; color: #6b7280;">Event:</td><td style="padding: 8px 0; font-weight: 600;">${data.eventName}</td></tr>` : ''}
            <tr><td style="padding: 8px 0; color: #6b7280;">Time:</td><td style="padding: 8px 0;">${timestamp}</td></tr>
        </table>
        
        ${data.actionUrl ? `
            <p style="text-align: center; margin: 24px 0;">
                <a href="${data.actionUrl}" class="button">View Details →</a>
            </p>
        ` : ''}
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

${data.actionUrl ? `View details: ${data.actionUrl}` : ''}

---
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
`.trim();
};
