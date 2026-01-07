import { SettingsRepository } from '../repositories/settings.repository';
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
     * Get security settings (public)
     */
    async getSecuritySettings() {
        return this.repo.getSecuritySettings();
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
