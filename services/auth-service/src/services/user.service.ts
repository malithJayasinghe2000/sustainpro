import argon2 from 'argon2';
import crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { passwordValidationService } from './password-validation.service';
import {
    NotFoundError,
    BadRequestError,
    ConflictError,
    createLogger,
    publishNotification,
} from '@sustainpro/shared-utils';
import { clearPermissionCache, publishPermissionCacheInvalidation } from '@sustainpro/shared-middleware';
import { CreateUserDto, UpdateUserDto, User } from '@sustainpro/shared-types';
import { config } from '../config';

const logger = createLogger({ service: 'auth-service' });

export class UserService {
    private userRepo = new UserRepository();

    /**
     * Generate a secure random password
     */
    private generateTempPassword(length: number = 12): string {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const special = '@#$%&*!';
        const all = uppercase + lowercase + numbers + special;

        // Ensure at least one of each type
        let password = '';
        password += uppercase[crypto.randomInt(0, uppercase.length)];
        password += lowercase[crypto.randomInt(0, lowercase.length)];
        password += numbers[crypto.randomInt(0, numbers.length)];
        password += special[crypto.randomInt(0, special.length)];

        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += all[crypto.randomInt(0, all.length)];
        }

        // Shuffle the password
        return password.split('').sort(() => crypto.randomInt(-1, 2)).join('');
    }

    /**
     * Get all users (filtered by org for non-super-admins)
     */
    async getAll(
        organizationId?: string | null,
        page: number = 1,
        limit: number = 20,
        search?: string,
        role?: string
    ): Promise<{ users: User[], total: number, pages: number }> {
        const skip = (page - 1) * limit;
        const { users, total } = await this.userRepo.findAll({
            organizationId: organizationId || undefined,
            skip,
            take: limit,
            search,
            role
        });

        return {
            users,
            total,
            pages: Math.ceil(total / limit)
        };
    }

    /**
     * Get user by ID
     */
    async getById(id: string): Promise<User> {
        const user = await this.userRepo.findById(id);
        if (!user) {
            throw new NotFoundError('User', id);
        }
        return user;
    }

    /**
     * Create new user (admin-created)
     * - Admin must provide password
     * - Always send welcome email with credentials
     * - Always set force_password_change = true (user must set their own password on first login)
     */
    async create(data: CreateUserDto & { organizationId?: string; sendWelcomeEmail?: boolean }): Promise<User> {
        // Check for existing email
        const existing = await this.userRepo.findByEmail(data.email);
        if (existing) {
            throw new ConflictError('Email already in use');
        }

        // Password is REQUIRED for admin-created users
        if (!data.password || data.password.trim() === '') {
            throw new BadRequestError('Password is required');
        }

        const passwordToUse = data.password;

        // Validate password against configured policies
        await passwordValidationService.validatePasswordStrength(passwordToUse);

        // Hash password
        const passwordHash = await argon2.hash(passwordToUse);

        // Generate user code
        const code = await this.generateUserCode();

        // Create user with force_password_change = true (ALWAYS for admin-created users)
        const user = await this.userRepo.create({
            email: data.email,
            password_hash: passwordHash,
            full_name: data.full_name,
            organization_id: data.organizationId || data.organization_id,
            timezone: data.timezone,
            code,
            force_password_change: true, // User MUST change password on first login
        });

        // ALWAYS send welcome email with credentials
        if (data.sendWelcomeEmail !== false) {
            try {
                const loginUrl = config.app?.frontendUrl
                    ? `${config.app.frontendUrl}/login`
                    : 'http://localhost:3000/login';

                const published = await publishNotification({
                    type: 'welcome_credentials',
                    to: data.email,
                    data: {
                        userName: data.full_name || data.email.split('@')[0],
                        userEmail: data.email,
                        tempPassword: passwordToUse, // Send the admin-entered password
                        loginUrl: loginUrl,
                        isTemporaryPassword: true, // Always true - user must change it
                    },
                    metadata: { userId: user.id, source: 'auth-service' },
                });

                if (published) {
                    logger.info('Welcome email notification published', { userId: user.id, email: user.email });
                } else {
                    logger.warn('Failed to publish welcome email notification (RabbitMQ may be down or disabled)', { userId: user.id });
                }
            } catch (emailError) {
                // Log error but don't fail user creation
                logger.error('Failed to send welcome email', {
                    userId: user.id,
                    error: (emailError as Error).message
                });
            }
        }

        logger.info('User created', {
            userId: user.id,
            email: user.email,
            forcePasswordChange: true
        });

        return user;
    }

    /**
     * Update user
     */
    async update(id: string, data: UpdateUserDto): Promise<User> {
        const user = await this.userRepo.update(id, data);
        if (!user) {
            throw new NotFoundError('User', id);
        }

        logger.info('User updated', { userId: id });
        return user;
    }

    /**
     * Delete user
     */
    async delete(id: string): Promise<void> {
        const deleted = await this.userRepo.delete(id);
        if (!deleted) {
            throw new NotFoundError('User', id);
        }
        logger.info('User deleted', { userId: id });
    }

    /**
     * Assign role to user
     */
    async assignRole(
        userId: string,
        role: string,
        context: { org_id?: string; event_id?: string }
    ) {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new NotFoundError('User', userId);
        }

        const assignment = await this.userRepo.assignRole(userId, role, context);
        
        // Clear local cache
        clearPermissionCache(userId);
        
        // Publish distributed cache invalidation
        await publishPermissionCacheInvalidation('user_role_changed', { userId, roleCode: role });
        
        logger.info('Role assigned', { userId, role });
        return assignment;
    }

    /**
     * Remove role from user
     */
    async removeRole(assignmentId: string): Promise<void> {
        await this.userRepo.removeRole(assignmentId);
        logger.info('Role removed', { assignmentId });
    }

    /**
     * Get users who can be managers (for assignment dropdowns)
     */
    async getManagerCandidates(organizationId?: string): Promise<User[]> {
        // No pagination for dropdown candidates (or use high limit)
        const { users } = await this.userRepo.findAll({
            organizationId,
            take: 1000
        });
        // Filter to active users only
        return users.filter(u => u.is_active);
    }

    /**
     * Generate unique user code
     */
    private async generateUserCode(): Promise<string> {
        // Simple implementation - in production, use a sequence
        const timestamp = Date.now().toString(36).toUpperCase();
        return `SPS-USR-${timestamp}`;
    }
}

