import { getPrismaClient } from '@sustainpro/shared-database';
import crypto from 'crypto';

const prisma = getPrismaClient();

export type OtpPurpose = 'email_verification' | 'password_reset' | 'login_2fa';

export interface CreateOtpData {
    userId: string;
    purpose: OtpPurpose;
    expiresInMinutes?: number;
    codeLength?: number;
    maxAttempts?: number;
}

export interface OtpRecord {
    id: string;
    user_id: string;
    code_hash: string;
    purpose: string;
    expires_at: Date;
    used_at: Date | null;
    attempts: number;
    max_attempts: number;
    created_at: Date;
}

export interface GeneratedOtp {
    code: string;
    expiresAt: Date;
    record: OtpRecord;
}

export class OtpRepository {
    /**
     * Generate a random OTP code
     */
    private generateCode(length: number = 6): string {
        const digits = '0123456789';
        let code = '';
        for (let i = 0; i < length; i++) {
            code += digits[crypto.randomInt(0, digits.length)];
        }
        return code;
    }

    /**
     * Hash an OTP code for secure storage
     */
    private hashCode(code: string): string {
        return crypto.createHash('sha256').update(code).digest('hex');
    }

    /**
     * Create a new OTP code
     */
    async create(data: CreateOtpData): Promise<GeneratedOtp> {
        const codeLength = data.codeLength || 6;
        const expiresInMinutes = data.expiresInMinutes || 10;
        const maxAttempts = data.maxAttempts || 3;
        
        const code = this.generateCode(codeLength);
        const codeHash = this.hashCode(code);
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60000);

        // Invalidate any existing unused OTPs for this user and purpose
        await this.invalidateExisting(data.userId, data.purpose);

        const record = await prisma.sps_otp_codes.create({
            data: {
                user_id: data.userId,
                code_hash: codeHash,
                purpose: data.purpose,
                expires_at: expiresAt,
                max_attempts: maxAttempts,
            },
        });

        return {
            code,
            expiresAt,
            record: record as OtpRecord,
        };
    }

    /**
     * Verify an OTP code
     */
    async verify(userId: string, code: string, purpose: OtpPurpose): Promise<{ valid: boolean; error?: string }> {
        const codeHash = this.hashCode(code);

        // Find the most recent valid OTP for this user and purpose
        const otp = await prisma.sps_otp_codes.findFirst({
            where: {
                user_id: userId,
                purpose: purpose,
                used_at: null,
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        if (!otp) {
            return { valid: false, error: 'No pending verification code found' };
        }

        // Check if expired
        if (new Date(otp.expires_at) < new Date()) {
            return { valid: false, error: 'Verification code has expired' };
        }

        // Check max attempts
        if (otp.attempts >= otp.max_attempts) {
            return { valid: false, error: 'Maximum verification attempts exceeded' };
        }

        // Verify the code
        if (otp.code_hash !== codeHash) {
            // Increment attempts
            await prisma.sps_otp_codes.update({
                where: { id: otp.id },
                data: { attempts: otp.attempts + 1 },
            });

            const remainingAttempts = otp.max_attempts - otp.attempts - 1;
            return { 
                valid: false, 
                error: remainingAttempts > 0 
                    ? `Invalid code. ${remainingAttempts} attempt(s) remaining.`
                    : 'Invalid code. Maximum attempts exceeded.' 
            };
        }

        // Mark as used
        await prisma.sps_otp_codes.update({
            where: { id: otp.id },
            data: { used_at: new Date() },
        });

        return { valid: true };
    }

    /**
     * Invalidate existing OTPs for a user and purpose
     */
    async invalidateExisting(userId: string, purpose: OtpPurpose): Promise<number> {
        const result = await prisma.sps_otp_codes.updateMany({
            where: {
                user_id: userId,
                purpose: purpose,
                used_at: null,
            },
            data: {
                used_at: new Date(),
            },
        });

        return result.count;
    }

    /**
     * Check if user has a pending OTP
     */
    async hasPendingOtp(userId: string, purpose: OtpPurpose): Promise<boolean> {
        const count = await prisma.sps_otp_codes.count({
            where: {
                user_id: userId,
                purpose: purpose,
                used_at: null,
                expires_at: {
                    gt: new Date(),
                },
            },
        });

        return count > 0;
    }

    /**
     * Clean up expired OTPs (maintenance task)
     */
    async cleanupExpiredOtps(): Promise<number> {
        const result = await prisma.sps_otp_codes.deleteMany({
            where: {
                OR: [
                    { expires_at: { lt: new Date() } },
                    { used_at: { not: null } },
                ],
            },
        });

        return result.count;
    }
}
