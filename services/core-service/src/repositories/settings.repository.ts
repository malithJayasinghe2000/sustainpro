import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

// Configuration IDs
const CONFIG_IDS = {
    SYSTEM: 'sps_main_config',
    PASSWORD: 'sps_password_policy',
    SESSION: 'sps_session_policy',
    LOGIN: 'sps_login_policy',
    TWO_FACTOR: 'sps_2fa_config',
    API_SECURITY: 'sps_api_security',
    SMTP: 'sps_smtp_config',
    NOTIFICATION: 'sps_notification_config',
};

export class SettingsRepository {
    // =========================================================================
    // SYSTEM SETTINGS
    // =========================================================================

    async getSystemSettings() {
        const settings = await prisma.sps_system_settings.findUnique({
            where: { id: CONFIG_IDS.SYSTEM },
        });
        return settings;
    }

    async updateSystemSettings(data: any) {
        const settings = await prisma.sps_system_settings.upsert({
            where: { id: CONFIG_IDS.SYSTEM },
            update: { ...data, updated_at: new Date() },
            create: { id: CONFIG_IDS.SYSTEM, ...data },
        });
        return settings;
    }

    async getPublicSettings() {
        const settings = await prisma.sps_system_settings.findUnique({
            where: { id: CONFIG_IDS.SYSTEM },
            select: {
                system_name: true,
                site_title: true,
                site_tagline: true,
                site_logo: true,
                site_favicon: true,
                primary_color: true,
                secondary_color: true,
                default_timezone: true,
                date_format: true,
                time_format: true,
                maintenance_mode: true,
                maintenance_message: true,
                global_alert_message: true,
                global_alert_type: true,
                support_email: true,
                support_phone: true,
                support_url: true,
            },
        });
        return settings;
    }

    // =========================================================================
    // PASSWORD POLICIES
    // =========================================================================

    async getPasswordPolicies() {
        const policies = await prisma.sps_password_policies.findUnique({
            where: { id: CONFIG_IDS.PASSWORD },
        });
        return policies;
    }

    async updatePasswordPolicies(data: any) {
        const policies = await prisma.sps_password_policies.upsert({
            where: { id: CONFIG_IDS.PASSWORD },
            update: { ...data, updated_at: new Date() },
            create: { id: CONFIG_IDS.PASSWORD, ...data },
        });
        return policies;
    }

    // =========================================================================
    // SESSION POLICIES
    // =========================================================================

    async getSessionPolicies() {
        const policies = await prisma.sps_session_policies.findUnique({
            where: { id: CONFIG_IDS.SESSION },
        });
        return policies;
    }

    async updateSessionPolicies(data: any) {
        const policies = await prisma.sps_session_policies.upsert({
            where: { id: CONFIG_IDS.SESSION },
            update: { ...data, updated_at: new Date() },
            create: { id: CONFIG_IDS.SESSION, ...data },
        });
        return policies;
    }

    // =========================================================================
    // LOGIN POLICIES
    // =========================================================================

    async getLoginPolicies() {
        const policies = await prisma.sps_login_policies.findUnique({
            where: { id: CONFIG_IDS.LOGIN },
        });
        return policies;
    }

    async updateLoginPolicies(data: any) {
        const policies = await prisma.sps_login_policies.upsert({
            where: { id: CONFIG_IDS.LOGIN },
            update: { ...data, updated_at: new Date() },
            create: { id: CONFIG_IDS.LOGIN, ...data },
        });
        return policies;
    }

    // =========================================================================
    // TWO-FACTOR CONFIG
    // =========================================================================

    async getTwoFactorConfig() {
        const config = await prisma.sps_two_factor_config.findUnique({
            where: { id: CONFIG_IDS.TWO_FACTOR },
        });
        return config;
    }

    async updateTwoFactorConfig(data: any) {
        const config = await prisma.sps_two_factor_config.upsert({
            where: { id: CONFIG_IDS.TWO_FACTOR },
            update: { ...data, updated_at: new Date() },
            create: { id: CONFIG_IDS.TWO_FACTOR, ...data },
        });
        return config;
    }

    // =========================================================================
    // API SECURITY CONFIG
    // =========================================================================

    async getApiSecurityConfig() {
        const config = await prisma.sps_api_security_config.findUnique({
            where: { id: CONFIG_IDS.API_SECURITY },
        });
        return config;
    }

    async updateApiSecurityConfig(data: any) {
        const config = await prisma.sps_api_security_config.upsert({
            where: { id: CONFIG_IDS.API_SECURITY },
            update: { ...data, updated_at: new Date() },
            create: { id: CONFIG_IDS.API_SECURITY, ...data },
        });
        return config;
    }

    // =========================================================================
    // SMTP SETTINGS
    // =========================================================================

    async getSmtpSettings() {
        const settings = await prisma.sps_smtp_settings.findUnique({
            where: { id: CONFIG_IDS.SMTP },
        });
        // Don't expose password
        if (settings) {
            return { ...settings, smtp_password: settings.smtp_password ? '********' : null };
        }
        return settings;
    }

    async updateSmtpSettings(data: any) {
        // Only update password if it's not masked
        if (data.smtp_password === '********') {
            delete data.smtp_password;
        }

        const settings = await prisma.sps_smtp_settings.upsert({
            where: { id: CONFIG_IDS.SMTP },
            update: { ...data, updated_at: new Date() },
            create: { id: CONFIG_IDS.SMTP, ...data },
        });
        return { ...settings, smtp_password: settings.smtp_password ? '********' : null };
    }

    // =========================================================================
    // NOTIFICATION SETTINGS
    // =========================================================================

    async getNotificationSettings() {
        const settings = await prisma.sps_notification_settings.findUnique({
            where: { id: CONFIG_IDS.NOTIFICATION },
        });
        return settings;
    }

    async updateNotificationSettings(data: any) {
        const settings = await prisma.sps_notification_settings.upsert({
            where: { id: CONFIG_IDS.NOTIFICATION },
            update: { ...data, updated_at: new Date() },
            create: { id: CONFIG_IDS.NOTIFICATION, ...data },
        });
        return settings;
    }

    // =========================================================================
    // EMAIL TEMPLATES
    // =========================================================================

    async getEmailTemplates(): Promise<any[]> {
        const templates = await prisma.sps_email_templates.findMany({
            orderBy: { category: 'asc' },
        });
        return templates;
    }

    async getEmailTemplate(code: string): Promise<any | null> {
        const template = await prisma.sps_email_templates.findUnique({
            where: { code },
        });
        return template;
    }

    async updateEmailTemplate(code: string, data: any): Promise<any> {
        const template = await prisma.sps_email_templates.update({
            where: { code },
            data: { ...data, updated_at: new Date() },
        });
        return template;
    }

    async createEmailTemplate(data: any): Promise<any> {
        const template = await prisma.sps_email_templates.create({
            data,
        });
        return template;
    }

    async deleteEmailTemplate(code: string) {
        // Check if it's a system template
        const existing = await prisma.sps_email_templates.findUnique({
            where: { code },
        });

        if (existing?.is_system_template) {
            throw new Error('Cannot delete system templates');
        }

        await prisma.sps_email_templates.delete({
            where: { code },
        });
        return true;
    }

    // =========================================================================
    // COMBINED SETTINGS (For frontend dashboard)
    // =========================================================================

    async getAllSettings() {
        const [
            system,
            password,
            session,
            login,
            twoFactor,
            apiSecurity,
            smtp,
            notification,
        ] = await Promise.all([
            this.getSystemSettings(),
            this.getPasswordPolicies(),
            this.getSessionPolicies(),
            this.getLoginPolicies(),
            this.getTwoFactorConfig(),
            this.getApiSecurityConfig(),
            this.getSmtpSettings(),
            this.getNotificationSettings(),
        ]);

        return {
            system,
            password,
            session,
            login,
            twoFactor,
            apiSecurity,
            smtp,
            notification,
        };
    }

    // =========================================================================
    // SECURITY SETTINGS (for auth-service)
    // =========================================================================

    async getSecuritySettings() {
        const [login, session, password] = await Promise.all([
            this.getLoginPolicies(),
            this.getSessionPolicies(),
            this.getPasswordPolicies(),
        ]);

        return {
            max_login_attempts: login?.max_login_attempts ?? 5,
            lockout_duration_minutes: login?.lockout_duration_minutes ?? 30,
            access_token_expire_minutes: session?.access_token_expire_minutes ?? 60,
            refresh_token_expire_days: session?.refresh_token_expire_days ?? 7,
            session_timeout_minutes: session?.session_timeout_minutes ?? 60,
            idle_timeout_minutes: session?.idle_timeout_minutes ?? 30,
            min_password_length: password?.min_length ?? 8,
            require_uppercase: password?.require_uppercase ?? true,
            require_lowercase: password?.require_lowercase ?? true,
            require_numbers: password?.require_numbers ?? true,
            require_special_chars: password?.require_special_chars ?? true,
        };
    }
}
