import { getPrismaClient } from '@sustainpro/shared-database';
import crypto from 'crypto';

const prisma = getPrismaClient();

export interface CreateRefreshTokenData {
    userId: string;
    token: string;
    deviceInfo?: string;
    ipAddress?: string;
    expiresAt: Date;
}

export interface RefreshTokenRecord {
    id: string;
    user_id: string;
    token_hash: string;
    device_info: string | null;
    ip_address: string | null;
    expires_at: Date;
    revoked_at: Date | null;
    revoked_reason: string | null;
    created_at: Date;
}

export class RefreshTokenRepository {
    /**
     * Hash a refresh token for secure storage
     */
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Create a new refresh token record
     */
    async create(data: CreateRefreshTokenData): Promise<RefreshTokenRecord> {
        const tokenHash = this.hashToken(data.token);
        
        const record = await prisma.sps_refresh_tokens.create({
            data: {
                user_id: data.userId,
                token_hash: tokenHash,
                device_info: data.deviceInfo || null,
                ip_address: data.ipAddress || null,
                expires_at: data.expiresAt,
            },
        });

        return record as RefreshTokenRecord;
    }

    /**
     * Find a refresh token by its value (hashed for lookup)
     */
    async findByToken(token: string): Promise<RefreshTokenRecord | null> {
        const tokenHash = this.hashToken(token);
        
        const record = await prisma.sps_refresh_tokens.findFirst({
            where: {
                token_hash: tokenHash,
            },
        });

        return record as RefreshTokenRecord | null;
    }

    /**
     * Find a valid (not expired, not revoked) refresh token
     */
    async findValidToken(token: string): Promise<RefreshTokenRecord | null> {
        const tokenHash = this.hashToken(token);
        
        const record = await prisma.sps_refresh_tokens.findFirst({
            where: {
                token_hash: tokenHash,
                revoked_at: null,
                expires_at: {
                    gt: new Date(),
                },
            },
        });

        return record as RefreshTokenRecord | null;
    }

    /**
     * Revoke a specific refresh token
     */
    async revokeToken(token: string, reason: string = 'logout'): Promise<boolean> {
        const tokenHash = this.hashToken(token);
        
        const result = await prisma.sps_refresh_tokens.updateMany({
            where: {
                token_hash: tokenHash,
                revoked_at: null,
            },
            data: {
                revoked_at: new Date(),
                revoked_reason: reason,
            },
        });

        return result.count > 0;
    }

    /**
     * Revoke a token by ID
     */
    async revokeById(id: string, reason: string = 'admin_action'): Promise<boolean> {
        const result = await prisma.sps_refresh_tokens.update({
            where: { id },
            data: {
                revoked_at: new Date(),
                revoked_reason: reason,
            },
        });

        return !!result;
    }

    /**
     * Revoke all refresh tokens for a user (e.g., on password change)
     */
    async revokeAllForUser(userId: string, reason: string = 'password_change'): Promise<number> {
        const result = await prisma.sps_refresh_tokens.updateMany({
            where: {
                user_id: userId,
                revoked_at: null,
            },
            data: {
                revoked_at: new Date(),
                revoked_reason: reason,
            },
        });

        return result.count;
    }

    /**
     * Get all active sessions for a user
     */
    async getActiveTokensForUser(userId: string): Promise<RefreshTokenRecord[]> {
        const records = await prisma.sps_refresh_tokens.findMany({
            where: {
                user_id: userId,
                revoked_at: null,
                expires_at: {
                    gt: new Date(),
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        return records as RefreshTokenRecord[];
    }

    /**
     * Clean up expired tokens (maintenance task)
     */
    async cleanupExpiredTokens(): Promise<number> {
        const result = await prisma.sps_refresh_tokens.deleteMany({
            where: {
                OR: [
                    { expires_at: { lt: new Date() } },
                    { revoked_at: { not: null } },
                ],
            },
        });

        return result.count;
    }

    /**
     * Count active sessions for a user
     */
    async countActiveSessionsForUser(userId: string): Promise<number> {
        return await prisma.sps_refresh_tokens.count({
            where: {
                user_id: userId,
                revoked_at: null,
                expires_at: {
                    gt: new Date(),
                },
            },
        });
    }
}
