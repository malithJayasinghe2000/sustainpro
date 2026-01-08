import { getPrismaClient } from '@sustainpro/shared-database';
import { SystemSettings } from '@sustainpro/shared-types';

const prisma = getPrismaClient();
const SETTINGS_ID = 'sps_main_config';

export class SettingsRepository {
    /**
     * Get system settings
     */
    async get(): Promise<SystemSettings | null> {
        const settings = await prisma.sps_system_settings.findUnique({
            where: { id: SETTINGS_ID },
        });
        return settings as any as SystemSettings | null;
    }

    /**
     * Get security settings (public)
     */
    async getSecuritySettings(): Promise<{
        max_login_attempts: number;
        account_lock_duration_minutes: number;
        token_expire_minutes: number;
    }> {
        const settings = await prisma.sps_system_settings.findUnique({
            where: { id: SETTINGS_ID },
            select: {
                max_login_attempts: true,
                account_lock_duration_minutes: true,
                token_expire_minutes: true,
            },
        });

        if (!settings) {
            return {
                max_login_attempts: 5,
                account_lock_duration_minutes: 15,
                token_expire_minutes: 60,
            };
        }

        return {
            max_login_attempts: settings.max_login_attempts ?? 5,
            account_lock_duration_minutes: settings.account_lock_duration_minutes ?? 15,
            token_expire_minutes: settings.token_expire_minutes ?? 60,
        };
    }

    /**
     * Update system settings
     */
    async update(data: Partial<SystemSettings>): Promise<SystemSettings | null> {
        const updateData: any = {};

        const allowedFields = [
            'site_title', 'site_logo', 'maintenance_mode', 'default_timezone',
            'account_lock_duration_minutes', 'token_expire_minutes', 'max_login_attempts',
            'session_timeout_enabled', 'support_email', 'support_phone',
            'global_alert_message', 'device_api_url'
        ];

        for (const field of allowedFields) {
            if ((data as any)[field] !== undefined) {
                updateData[field] = (data as any)[field];
            }
        }

        if (Object.keys(updateData).length === 0) return this.get();

        const updated = await prisma.sps_system_settings.update({
            where: { id: SETTINGS_ID },
            data: updateData,
        });
        return updated as any as SystemSettings;
    }

    /**
     * Get public settings (for unauthenticated users)
     */
    async getPublicSettings(): Promise<{
        site_title: string;
        site_logo: string | null;
        maintenance_mode: boolean;
        support_email: string | null;
        support_phone: string | null;
        global_alert_message: string | null;
    } | null> {
        const settings = await prisma.sps_system_settings.findUnique({
            where: { id: SETTINGS_ID },
            select: {
                site_title: true,
                site_logo: true,
                maintenance_mode: true,
                support_email: true,
                support_phone: true,
                global_alert_message: true,
            },
        });
        
        if (!settings) return null;
        
        return {
            site_title: settings.site_title ?? 'SustainPro',
            site_logo: settings.site_logo,
            maintenance_mode: settings.maintenance_mode ?? false,
            support_email: settings.support_email,
            support_phone: settings.support_phone,
            global_alert_message: settings.global_alert_message,
        };
    }
}
