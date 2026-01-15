import { SettingsRepository, SecuritySettings } from '../repositories/settings.repository';
import { SystemSettings } from '@sustainpro/shared-types';
import { NotFoundError, createLogger, publishNotification } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });

export class SettingsService {
    private repo = new SettingsRepository();

    // =========================================================================
    // SYSTEM SETTINGS
    // =========================================================================

    async getSystemSettings() {
        const settings = await this.repo.getSystemSettings();
        if (!settings) {
            throw new NotFoundError('System settings');
        }
        return settings;
    }

    async updateSystemSettings(data: any) {
        const settings = await this.repo.updateSystemSettings(data);
        logger.info('System settings updated', { updates: Object.keys(data) });
        return settings;
    }

    /**
     * Get security settings (public - limited)
     */
    async getSecuritySettings() {
        return this.repo.getSecuritySettings();
    }

    /**
     * Get full security settings (authenticated)
     */
    async getFullSecuritySettings(): Promise<SecuritySettings> {
        return this.repo.getFullSecuritySettings();
    }

    /**
     * Update security settings
     */
    async updateSecuritySettings(data: Partial<SecuritySettings>): Promise<SecuritySettings> {
        const settings = await this.repo.updateSecuritySettings(data);
        logger.info('Security settings updated', { updates: Object.keys(data) });
        return settings;
    }

    /**
     * Get public settings (no auth required)
     */
    async getPublicSettings() {
        return this.repo.getPublicSettings();
    }

    // =========================================================================
    // PASSWORD POLICIES
    // =========================================================================

    async getPasswordPolicies() {
        const policies = await this.repo.getPasswordPolicies();
        if (!policies) {
            throw new NotFoundError('Password policies');
        }
        return policies;
    }

    async updatePasswordPolicies(data: any) {
        const policies = await this.repo.updatePasswordPolicies(data);
        logger.info('Password policies updated', { updates: Object.keys(data) });
        return policies;
    }

    // =========================================================================
    // SESSION POLICIES
    // =========================================================================

    async getSessionPolicies() {
        const policies = await this.repo.getSessionPolicies();
        if (!policies) {
            throw new NotFoundError('Session policies');
        }
        return policies;
    }

    async updateSessionPolicies(data: any) {
        const policies = await this.repo.updateSessionPolicies(data);
        logger.info('Session policies updated', { updates: Object.keys(data) });
        return policies;
    }

    // =========================================================================
    // LOGIN POLICIES
    // =========================================================================

    async getLoginPolicies() {
        const policies = await this.repo.getLoginPolicies();
        if (!policies) {
            throw new NotFoundError('Login policies');
        }
        return policies;
    }

    async updateLoginPolicies(data: any) {
        const policies = await this.repo.updateLoginPolicies(data);
        logger.info('Login policies updated', { updates: Object.keys(data) });
        return policies;
    }

    // =========================================================================
    // TWO-FACTOR CONFIG
    // =========================================================================

    async getTwoFactorConfig() {
        const config = await this.repo.getTwoFactorConfig();
        if (!config) {
            throw new NotFoundError('2FA configuration');
        }
        return config;
    }

    async updateTwoFactorConfig(data: any) {
        const config = await this.repo.updateTwoFactorConfig(data);
        logger.info('2FA configuration updated', { updates: Object.keys(data) });
        return config;
    }

    // =========================================================================
    // API SECURITY CONFIG
    // =========================================================================

    async getApiSecurityConfig() {
        const config = await this.repo.getApiSecurityConfig();
        if (!config) {
            throw new NotFoundError('API security configuration');
        }
        return config;
    }

    async updateApiSecurityConfig(data: any) {
        const config = await this.repo.updateApiSecurityConfig(data);
        logger.info('API security configuration updated', { updates: Object.keys(data) });
        return config;
    }

    // =========================================================================
    // SMTP SETTINGS
    // =========================================================================

    async getSmtpSettings() {
        const settings = await this.repo.getSmtpSettings();
        if (!settings) {
            throw new NotFoundError('SMTP settings');
        }
        return settings;
    }

    async updateSmtpSettings(data: any) {
        const settings = await this.repo.updateSmtpSettings(data);
        logger.info('SMTP settings updated', { updates: Object.keys(data) });
        return settings;
    }

    async sendTestEmail(recipient: string) {
        await publishNotification({
            type: 'generic',
            to: recipient,
            email: recipient, // for compatibility
            data: {
                subject: 'SustainPro: SMTP Configuration Test',
                text: 'Congratulations! Your SMTP configuration is working correctly.',
                html: '<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;"><h2>SMTP Test Successful</h2><p>Your email settings are configured correctly.</p></div>'
            }
        });
        logger.info('Test email requested', { recipient });
        return true;
    }

    // =========================================================================
    // NOTIFICATION SETTINGS
    // =========================================================================

    async getNotificationSettings() {
        const settings = await this.repo.getNotificationSettings();
        if (!settings) {
            throw new NotFoundError('Notification settings');
        }
        return settings;
    }

    async updateNotificationSettings(data: any) {
        const settings = await this.repo.updateNotificationSettings(data);
        logger.info('Notification settings updated', { updates: Object.keys(data) });
        return settings;
    }

    // =========================================================================
    // EMAIL TEMPLATES
    // =========================================================================

    async getEmailTemplates(): Promise<any[]> {
        return this.repo.getEmailTemplates();
    }

    async getEmailTemplate(code: string): Promise<any> {
        const template = await this.repo.getEmailTemplate(code);
        if (!template) {
            throw new NotFoundError('Email template');
        }
        return template;
    }

    async updateEmailTemplate(code: string, data: any): Promise<any> {
        const template = await this.repo.updateEmailTemplate(code, data);
        logger.info('Email template updated', { code });
        return template;
    }

    async createEmailTemplate(data: any): Promise<any> {
        const template = await this.repo.createEmailTemplate(data);
        logger.info('Email template created', { code: data.code });
        return template;
    }

    async deleteEmailTemplate(code: string) {
        await this.repo.deleteEmailTemplate(code);
        logger.info('Email template deleted', { code });
        return true;
    }

    // =========================================================================
    // COMBINED ENDPOINTS
    // =========================================================================

    async getAllSettings() {
        return this.repo.getAllSettings();
    }


}
