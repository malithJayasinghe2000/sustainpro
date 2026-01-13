import { SettingsRepository, SecuritySettings } from '../repositories/settings.repository';
import { SystemSettings } from '@sustainpro/shared-types';
import { NotFoundError, createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });

export class SettingsService {
    private repo = new SettingsRepository();

    /**
     * Get system settings
     */
    async get(): Promise<SystemSettings> {
        const settings = await this.repo.get();
        if (!settings) {
            throw new NotFoundError('System settings');
        }
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

    /**
     * Update system settings
     */
    async update(data: Partial<SystemSettings>): Promise<SystemSettings> {
        const settings = await this.repo.update(data);
        if (!settings) {
            throw new NotFoundError('System settings');
        }

        logger.info('System settings updated', { updates: Object.keys(data) });

        return settings;
    }
}
