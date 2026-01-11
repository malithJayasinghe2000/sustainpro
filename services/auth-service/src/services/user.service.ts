import argon2 from 'argon2';
import { UserRepository } from '../repositories/user.repository';
import { passwordValidationService } from './password-validation.service';
import {
    NotFoundError,
    BadRequestError,
    ConflictError,
    createLogger
} from '@sustainpro/shared-utils';
import { CreateUserDto, UpdateUserDto, User } from '@sustainpro/shared-types';

const logger = createLogger({ service: 'auth-service' });

export class UserService {
    private userRepo = new UserRepository();

    /**
     * Get all users (filtered by org for non-super-admins)
     */
    async getAll(organizationId?: string | null): Promise<User[]> {
        return this.userRepo.findAll(organizationId || undefined);
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
     * Create new user
     */
    async create(data: CreateUserDto & { organizationId?: string }): Promise<User> {
        // Check for existing email
        const existing = await this.userRepo.findByEmail(data.email);
        if (existing) {
            throw new ConflictError('Email already in use');
        }

        // Validate password against configured policies
        await passwordValidationService.validatePasswordStrength(data.password);

        // Hash password
        const passwordHash = await argon2.hash(data.password);

        // Generate user code
        const code = await this.generateUserCode();

        const user = await this.userRepo.create({
            email: data.email,
            password_hash: passwordHash,
            full_name: data.full_name,
            organization_id: data.organizationId || data.organization_id,
            timezone: data.timezone,
            code,
        });

        logger.info('User created', { userId: user.id, email: user.email });

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
        const users = await this.userRepo.findAll(organizationId);
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
