import { getPrismaClient } from '@sustainpro/shared-database';
import { createLogger } from '@sustainpro/shared-utils';
import { config } from '../config';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'auth-service' });

// Configuration IDs (must match core-service)
const CONFIG_IDS = {
    LOGIN: 'sps_login_policy',
    SESSION: 'sps_session_policy',
    TWO_FACTOR: 'sps_2fa_config',
    PASSWORD: 'sps_password_policy',
};

// Default values (fallback if database settings don't exist)
const DEFAULTS = {
    login: {
        max_login_attempts: 5,
        lockout_duration_minutes: 30,
        progressive_lockout: true,
        progressive_lockout_multiplier: 2.0,
        max_lockout_duration_minutes: 1440,
        enable_ip_blocking: false,
        ip_block_threshold: 10,
        ip_block_duration_minutes: 60,
        notify_on_lockout: true,
        notify_on_new_device_login: true,
        notify_on_password_change: true,
    },
    session: {
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
    twoFactor: {
        enabled: true,
        enforce_globally: false,
        enforce_for_admins: false,
        email_method_enabled: true,
        totp_method_enabled: true,
        email_otp_length: 6,
        email_otp_expiry_minutes: 10,
        email_otp_max_attempts: 3,
    },
};

export interface LoginPolicies {
    max_login_attempts: number;
    lockout_duration_minutes: number;
    progressive_lockout: boolean;
    progressive_lockout_multiplier: number;
    max_lockout_duration_minutes: number;
    enable_ip_blocking: boolean;
    ip_block_threshold: number;
    ip_block_duration_minutes: number;
    notify_on_lockout: boolean;
    notify_on_new_device_login: boolean;
    notify_on_password_change: boolean;
}

export interface SessionPolicies {
    session_timeout_enabled: boolean;
    session_timeout_minutes: number;
    idle_timeout_enabled: boolean;
    idle_timeout_minutes: number;
    max_concurrent_sessions: number;
    enforce_single_session: boolean;
    access_token_expire_minutes: number;
    refresh_token_expire_days: number;
    remember_me_expire_days: number;
    bind_session_to_ip: boolean;
    bind_session_to_user_agent: boolean;
    regenerate_session_on_login: boolean;
}

export interface TwoFactorConfig {
    enabled: boolean;
    enforce_globally: boolean;
    enforce_for_admins: boolean;
    email_method_enabled: boolean;
    totp_method_enabled: boolean;
    email_otp_length: number;
    email_otp_expiry_minutes: number;
    email_otp_max_attempts: number;
}

// Cache for settings to avoid frequent DB queries
let loginPoliciesCache: LoginPolicies | null = null;
let sessionPoliciesCache: SessionPolicies | null = null;
let twoFactorConfigCache: TwoFactorConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Clear the settings cache (call when settings are updated)
 */
export function clearSettingsCache(): void {
    loginPoliciesCache = null;
    sessionPoliciesCache = null;
    twoFactorConfigCache = null;
    cacheTimestamp = 0;
    logger.debug('Settings cache cleared');
}

/**
 * Check if cache is still valid
 */
function isCacheValid(): boolean {
    return Date.now() - cacheTimestamp < CACHE_TTL;
}

/**
 * Get login policies from database with caching
 */
export async function getLoginPolicies(): Promise<LoginPolicies> {
    if (loginPoliciesCache && isCacheValid()) {
        return loginPoliciesCache;
    }

    try {
        const policies = await prisma.sps_login_policies.findUnique({
            where: { id: CONFIG_IDS.LOGIN },
        });

        if (policies) {
            loginPoliciesCache = {
                max_login_attempts: policies.max_login_attempts ?? DEFAULTS.login.max_login_attempts,
                lockout_duration_minutes: policies.lockout_duration_minutes ?? DEFAULTS.login.lockout_duration_minutes,
                progressive_lockout: policies.progressive_lockout ?? DEFAULTS.login.progressive_lockout,
                progressive_lockout_multiplier: policies.progressive_lockout_multiplier ?? DEFAULTS.login.progressive_lockout_multiplier,
                max_lockout_duration_minutes: policies.max_lockout_duration_minutes ?? DEFAULTS.login.max_lockout_duration_minutes,
                enable_ip_blocking: policies.enable_ip_blocking ?? DEFAULTS.login.enable_ip_blocking,
                ip_block_threshold: policies.ip_block_threshold ?? DEFAULTS.login.ip_block_threshold,
                ip_block_duration_minutes: policies.ip_block_duration_minutes ?? DEFAULTS.login.ip_block_duration_minutes,
                notify_on_lockout: policies.notify_on_lockout ?? DEFAULTS.login.notify_on_lockout,
                notify_on_new_device_login: policies.notify_on_new_device_login ?? DEFAULTS.login.notify_on_new_device_login,
                notify_on_password_change: policies.notify_on_password_change ?? DEFAULTS.login.notify_on_password_change,
            };
            cacheTimestamp = Date.now();
            logger.debug('Login policies loaded from database', { 
                max_login_attempts: loginPoliciesCache.max_login_attempts,
                lockout_duration_minutes: loginPoliciesCache.lockout_duration_minutes,
                progressive_lockout: loginPoliciesCache.progressive_lockout,
                progressive_lockout_multiplier: loginPoliciesCache.progressive_lockout_multiplier,
                max_lockout_duration_minutes: loginPoliciesCache.max_lockout_duration_minutes,
            });
            return loginPoliciesCache;
        }
    } catch (error) {
        logger.error('Failed to fetch login policies from database, using defaults', { error });
    }

    // Return defaults if database query fails
    return DEFAULTS.login;
}

/**
 * Get session policies from database with caching
 */
export async function getSessionPolicies(): Promise<SessionPolicies> {
    if (sessionPoliciesCache && isCacheValid()) {
        return sessionPoliciesCache;
    }

    try {
        const policies = await prisma.sps_session_policies.findUnique({
            where: { id: CONFIG_IDS.SESSION },
        });

        if (policies) {
            sessionPoliciesCache = {
                session_timeout_enabled: policies.session_timeout_enabled ?? DEFAULTS.session.session_timeout_enabled,
                session_timeout_minutes: policies.session_timeout_minutes ?? DEFAULTS.session.session_timeout_minutes,
                idle_timeout_enabled: policies.idle_timeout_enabled ?? DEFAULTS.session.idle_timeout_enabled,
                idle_timeout_minutes: policies.idle_timeout_minutes ?? DEFAULTS.session.idle_timeout_minutes,
                max_concurrent_sessions: policies.max_concurrent_sessions ?? DEFAULTS.session.max_concurrent_sessions,
                enforce_single_session: policies.enforce_single_session ?? DEFAULTS.session.enforce_single_session,
                access_token_expire_minutes: policies.access_token_expire_minutes ?? DEFAULTS.session.access_token_expire_minutes,
                refresh_token_expire_days: policies.refresh_token_expire_days ?? DEFAULTS.session.refresh_token_expire_days,
                remember_me_expire_days: policies.remember_me_expire_days ?? DEFAULTS.session.remember_me_expire_days,
                bind_session_to_ip: policies.bind_session_to_ip ?? DEFAULTS.session.bind_session_to_ip,
                bind_session_to_user_agent: policies.bind_session_to_user_agent ?? DEFAULTS.session.bind_session_to_user_agent,
                regenerate_session_on_login: policies.regenerate_session_on_login ?? DEFAULTS.session.regenerate_session_on_login,
            };
            cacheTimestamp = Date.now();
            logger.debug('Session policies loaded from database', { access_token_expire_minutes: sessionPoliciesCache.access_token_expire_minutes });
            return sessionPoliciesCache;
        }
    } catch (error) {
        logger.error('Failed to fetch session policies from database, using defaults', { error });
    }

    return DEFAULTS.session;
}

/**
 * Get two-factor authentication config from database with caching
 */
export async function getTwoFactorConfig(): Promise<TwoFactorConfig> {
    if (twoFactorConfigCache && isCacheValid()) {
        return twoFactorConfigCache;
    }

    try {
        const tfConfig = await prisma.sps_two_factor_config.findUnique({
            where: { id: CONFIG_IDS.TWO_FACTOR },
        });

        if (tfConfig) {
            twoFactorConfigCache = {
                enabled: tfConfig.enabled ?? DEFAULTS.twoFactor.enabled,
                enforce_globally: tfConfig.enforce_globally ?? DEFAULTS.twoFactor.enforce_globally,
                enforce_for_admins: tfConfig.enforce_for_admins ?? DEFAULTS.twoFactor.enforce_for_admins,
                email_method_enabled: tfConfig.email_method_enabled ?? DEFAULTS.twoFactor.email_method_enabled,
                totp_method_enabled: tfConfig.totp_method_enabled ?? DEFAULTS.twoFactor.totp_method_enabled,
                email_otp_length: tfConfig.email_otp_length ?? DEFAULTS.twoFactor.email_otp_length,
                email_otp_expiry_minutes: tfConfig.email_otp_expiry_minutes ?? DEFAULTS.twoFactor.email_otp_expiry_minutes,
                email_otp_max_attempts: tfConfig.email_otp_max_attempts ?? DEFAULTS.twoFactor.email_otp_max_attempts,
            };
            cacheTimestamp = Date.now();
            logger.debug('Two-factor config loaded from database', { enabled: twoFactorConfigCache.enabled });
            return twoFactorConfigCache;
        }
    } catch (error) {
        logger.error('Failed to fetch two-factor config from database, using defaults', { error });
    }

    return DEFAULTS.twoFactor;
}

/**
 * Get all security settings needed for authentication
 */
export async function getSecuritySettings() {
    const [loginPolicies, sessionPolicies, twoFactorConfig] = await Promise.all([
        getLoginPolicies(),
        getSessionPolicies(),
        getTwoFactorConfig(),
    ]);

    return {
        login: loginPolicies,
        session: sessionPolicies,
        twoFactor: twoFactorConfig,
    };
}
