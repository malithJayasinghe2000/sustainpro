import { getPrismaClient } from '@sustainpro/shared-database';

const prisma = getPrismaClient();

export interface CreateSessionData {
    userId: string;
    refreshTokenId?: string;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
}

export interface SessionRecord {
    id: string;
    user_id: string;
    refresh_token_id: string | null;
    device_info: string | null;
    ip_address: string | null;
    user_agent: string | null;
    last_activity: Date;
    expires_at: Date;
    is_active: boolean;
    created_at: Date;
}

export class SessionRepository {
    /**
     * Create a new session
     */
    async create(data: CreateSessionData): Promise<SessionRecord> {
        const record = await prisma.sps_user_sessions.create({
            data: {
                user_id: data.userId,
                refresh_token_id: data.refreshTokenId || null,
                device_info: data.deviceInfo || null,
                ip_address: data.ipAddress || null,
                user_agent: data.userAgent || null,
                expires_at: data.expiresAt,
                is_active: true,
            },
        });

        return record as SessionRecord;
    }

    /**
     * Find session by ID
     */
    async findById(id: string): Promise<SessionRecord | null> {
        const record = await prisma.sps_user_sessions.findUnique({
            where: { id },
        });

        return record as SessionRecord | null;
    }

    /**
     * Update session last activity (for session timeout tracking)
     */
    async updateLastActivity(id: string): Promise<SessionRecord | null> {
        try {
            const record = await prisma.sps_user_sessions.update({
                where: { id },
                data: {
                    last_activity: new Date(),
                },
            });

            return record as SessionRecord;
        } catch {
            return null;
        }
    }

    /**
     * Check if session has timed out based on inactivity
     */
    async isSessionTimedOut(id: string, timeoutMinutes: number): Promise<boolean> {
        const session = await prisma.sps_user_sessions.findUnique({
            where: { id },
        });

        if (!session || !session.is_active) {
            return true;
        }

        const lastActivity = new Date(session.last_activity);
        const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60000);

        return lastActivity < timeoutThreshold;
    }

    /**
     * Deactivate a session
     */
    async deactivate(id: string): Promise<boolean> {
        try {
            await prisma.sps_user_sessions.update({
                where: { id },
                data: { is_active: false },
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Deactivate all sessions for a user
     */
    async deactivateAllForUser(userId: string): Promise<number> {
        const result = await prisma.sps_user_sessions.updateMany({
            where: {
                user_id: userId,
                is_active: true,
            },
            data: {
                is_active: false,
            },
        });

        return result.count;
    }

    /**
     * Get all active sessions for a user
     */
    async getActiveSessionsForUser(userId: string): Promise<SessionRecord[]> {
        const records = await prisma.sps_user_sessions.findMany({
            where: {
                user_id: userId,
                is_active: true,
                expires_at: {
                    gt: new Date(),
                },
            },
            orderBy: {
                last_activity: 'desc',
            },
        });

        return records as SessionRecord[];
    }

    /**
     * Count active sessions for a user
     */
    async countActiveSessionsForUser(userId: string): Promise<number> {
        return await prisma.sps_user_sessions.count({
            where: {
                user_id: userId,
                is_active: true,
                expires_at: {
                    gt: new Date(),
                },
            },
        });
    }

    /**
     * Clean up expired and inactive sessions
     */
    async cleanupExpiredSessions(): Promise<number> {
        const result = await prisma.sps_user_sessions.deleteMany({
            where: {
                OR: [
                    { expires_at: { lt: new Date() } },
                    { is_active: false },
                ],
            },
        });

        return result.count;
    }

    /**
     * Find sessions with timeout exceeded
     */
    async findTimedOutSessions(timeoutMinutes: number): Promise<SessionRecord[]> {
        const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60000);
        
        const records = await prisma.sps_user_sessions.findMany({
            where: {
                is_active: true,
                last_activity: {
                    lt: timeoutThreshold,
                },
            },
        });

        return records as SessionRecord[];
    }

    /**
     * Validate session binding (IP and User Agent)
     * Returns { valid: boolean, reason?: string }
     */
    async validateSessionBinding(
        sessionId: string,
        currentIp: string | null,
        currentUserAgent: string | null,
        bindToIp: boolean,
        bindToUserAgent: boolean
    ): Promise<{ valid: boolean; reason?: string }> {
        const session = await this.findById(sessionId);

        if (!session) {
            return { valid: false, reason: 'Session not found' };
        }

        if (!session.is_active) {
            return { valid: false, reason: 'Session is inactive' };
        }

        // Check IP binding
        if (bindToIp && session.ip_address && currentIp) {
            if (session.ip_address !== currentIp) {
                return { 
                    valid: false, 
                    reason: 'Session IP mismatch - session may have been hijacked' 
                };
            }
        }

        // Check User Agent binding
        if (bindToUserAgent && session.user_agent && currentUserAgent) {
            // Normalize user agents for comparison (remove minor version differences)
            const normalizeUA = (ua: string) => ua.replace(/\d+\.\d+\.\d+/g, 'X.X.X');
            const storedUA = normalizeUA(session.user_agent);
            const currentUA = normalizeUA(currentUserAgent);
            
            if (storedUA !== currentUA) {
                return { 
                    valid: false, 
                    reason: 'Session browser/device mismatch' 
                };
            }
        }

        return { valid: true };
    }
}
