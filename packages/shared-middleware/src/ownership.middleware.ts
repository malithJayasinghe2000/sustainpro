/**
 * Ownership-based Authorization Middleware
 * Best Practice: Check if user has ownership/responsibility for a resource
 * 
 * Examples:
 * - DEPT_HEAD can only manage events in their department
 * - EVENT_MANAGER can only manage their assigned events
 * - Users can only edit their own profile (unless admin)
 */

import { Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '@sustainpro/shared-database';
import { ForbiddenError, UnauthorizedError, NotFoundError, createLogger } from '@sustainpro/shared-utils';

const prisma = getPrismaClient();
const logger = createLogger({ service: 'ownership-middleware' });

type ResourceType = 'event' | 'department' | 'device' | 'user' | 'organization';

interface OwnershipContext {
    userId: string;
    isSuperAdmin: boolean;
    organizationId: string | null | undefined;
    roles: string[];
}

/**
 * Check if user owns or is responsible for a resource
 */
async function checkOwnership(
    resourceType: ResourceType,
    resourceId: string,
    context: OwnershipContext
): Promise<{ allowed: boolean; reason?: string }> {
    // Super admins always have access
    if (context.isSuperAdmin) {
        return { allowed: true };
    }

    switch (resourceType) {
        case 'event':
            return checkEventOwnership(resourceId, context);
        case 'department':
            return checkDepartmentOwnership(resourceId, context);
        case 'device':
            return checkDeviceOwnership(resourceId, context);
        case 'user':
            return checkUserOwnership(resourceId, context);
        case 'organization':
            return checkOrganizationOwnership(resourceId, context);
        default:
            return { allowed: false, reason: 'Unknown resource type' };
    }
}

/**
 * Check event ownership
 * - ORG_ADMIN: Can manage any event in their organization
 * - EVENT_MANAGER: Can manage events in their organization
 * - DEPT_HEAD: Can manage events they have department access to
 */
async function checkEventOwnership(
    eventId: string,
    context: OwnershipContext
): Promise<{ allowed: boolean; reason?: string }> {
    const event = await prisma.sps_events.findUnique({
        where: { id: eventId },
        select: {
            id: true,
            organization_id: true,
        }
    });

    if (!event) {
        return { allowed: false, reason: 'Event not found' };
    }

    // ORG_ADMIN can manage any event in their org
    if (context.roles.includes('ORG_ADMIN') && event.organization_id === context.organizationId) {
        return { allowed: true };
    }

    // EVENT_MANAGER can manage events in their org
    if (context.roles.includes('EVENT_MANAGER') && event.organization_id === context.organizationId) {
        return { allowed: true };
    }

    // DEPT_HEAD can manage events where they head a department
    if (context.roles.includes('DEPT_HEAD')) {
        const hasAccess = await prisma.sps_departments.findFirst({
            where: {
                event_id: eventId,
                head_user_id: context.userId
            }
        });
        if (hasAccess) {
            return { allowed: true };
        }
    }

    return { allowed: false, reason: 'You do not have permission to manage this event' };
}

/**
 * Check department ownership
 * - ORG_ADMIN: Can manage any department in their organization's events
 * - DEPT_HEAD: Can manage their assigned department
 */
async function checkDepartmentOwnership(
    departmentId: string,
    context: OwnershipContext
): Promise<{ allowed: boolean; reason?: string }> {
    const department = await prisma.sps_departments.findUnique({
        where: { id: departmentId },
        select: {
            id: true,
            head_user_id: true,
            sps_events: {
                select: { organization_id: true }
            }
        }
    });

    if (!department) {
        return { allowed: false, reason: 'Department not found' };
    }

    // ORG_ADMIN can manage any department in their org's events
    if (context.roles.includes('ORG_ADMIN') && department.sps_events?.organization_id === context.organizationId) {
        return { allowed: true };
    }

    // DEPT_HEAD can manage their department
    if (context.roles.includes('DEPT_HEAD') && department.head_user_id === context.userId) {
        return { allowed: true };
    }

    return { allowed: false, reason: 'You do not have permission to manage this department' };
}

/**
 * Check device ownership
 * - ORG_ADMIN: Can manage any device in their organization
 * - TECHNICIAN: Can manage devices in their organization
 */
async function checkDeviceOwnership(
    deviceId: string,
    context: OwnershipContext
): Promise<{ allowed: boolean; reason?: string }> {
    // Device IDs are integers
    const deviceIdNum = parseInt(deviceId, 10);
    if (isNaN(deviceIdNum)) {
        return { allowed: false, reason: 'Invalid device ID' };
    }

    const device = await prisma.sps_devices.findUnique({
        where: { id: deviceIdNum },
        select: {
            id: true,
            organization_id: true,
        }
    });

    if (!device) {
        return { allowed: false, reason: 'Device not found' };
    }

    // ORG_ADMIN can manage any device in their org
    if (context.roles.includes('ORG_ADMIN') && device.organization_id === context.organizationId) {
        return { allowed: true };
    }

    // TECHNICIAN can manage devices in their org
    if (context.roles.includes('TECHNICIAN') && device.organization_id === context.organizationId) {
        return { allowed: true };
    }

    return { allowed: false, reason: 'You do not have permission to manage this device' };
}

/**
 * Check user ownership
 * - User can always manage themselves
 * - ORG_ADMIN: Can manage any user in their organization
 */
async function checkUserOwnership(
    targetUserId: string,
    context: OwnershipContext
): Promise<{ allowed: boolean; reason?: string }> {
    // Users can always manage themselves
    if (targetUserId === context.userId) {
        return { allowed: true };
    }

    const targetUser = await prisma.sps_users.findUnique({
        where: { id: targetUserId },
        select: { organization_id: true }
    });

    if (!targetUser) {
        return { allowed: false, reason: 'User not found' };
    }

    // ORG_ADMIN can manage users in their org
    if (context.roles.includes('ORG_ADMIN') && targetUser.organization_id === context.organizationId) {
        return { allowed: true };
    }

    return { allowed: false, reason: 'You do not have permission to manage this user' };
}

/**
 * Check organization ownership
 * - ORG_ADMIN: Can manage their own organization
 */
async function checkOrganizationOwnership(
    orgId: string,
    context: OwnershipContext
): Promise<{ allowed: boolean; reason?: string }> {
    if (context.roles.includes('ORG_ADMIN') && orgId === context.organizationId) {
        return { allowed: true };
    }

    return { allowed: false, reason: 'You do not have permission to manage this organization' };
}

/**
 * Middleware factory to require ownership of a resource
 * @param resourceType - Type of resource (event, department, device, user, organization)
 * @param getResourceId - Function to extract resource ID from request (defaults to req.params.id)
 */
export function requireOwnership(
    resourceType: ResourceType,
    getResourceId?: (req: Request) => string | undefined
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            const resourceId = getResourceId 
                ? getResourceId(req) 
                : req.params.id || req.params.eventId || req.params.departmentId || req.params.deviceId || req.params.userId;

            if (!resourceId) {
                throw new NotFoundError('Resource ID not provided');
            }

            const context: OwnershipContext = {
                userId: req.user.id,
                isSuperAdmin: req.user.isSuperAdmin || false,
                organizationId: req.user.organization_id,
                roles: req.user.roles || []
            };

            const result = await checkOwnership(resourceType, resourceId, context);

            if (!result.allowed) {
                logger.warn('Ownership check failed', {
                    userId: context.userId,
                    resourceType,
                    resourceId,
                    reason: result.reason
                });
                throw new ForbiddenError(result.reason || 'Access denied');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Middleware to check ownership OR permission
 * Allows access if user either owns the resource OR has the specified permission
 */
export function requireOwnershipOrPermission(
    resourceType: ResourceType,
    permission: string,
    getResourceId?: (req: Request) => string | undefined
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.id) {
                throw new UnauthorizedError('Authentication required');
            }

            // Super admin bypass
            if (req.user.isSuperAdmin) {
                return next();
            }

            const resourceId = getResourceId 
                ? getResourceId(req) 
                : req.params.id || req.params.eventId || req.params.departmentId || req.params.deviceId || req.params.userId;

            if (!resourceId) {
                throw new NotFoundError('Resource ID not provided');
            }

            const context: OwnershipContext = {
                userId: req.user.id,
                isSuperAdmin: req.user.isSuperAdmin || false,
                organizationId: req.user.organization_id,
                roles: req.user.roles || []
            };

            // Check ownership first
            const ownershipResult = await checkOwnership(resourceType, resourceId, context);
            if (ownershipResult.allowed) {
                return next();
            }

            // If not owner, check if they have the broader permission
            const { getUserPermissionsList } = await import('./permission.middleware');
            const userPermissions = await getUserPermissionsList(req.user.id, false);
            
            if (userPermissions.includes(permission)) {
                return next();
            }

            throw new ForbiddenError('You do not have permission to access this resource');
        } catch (error) {
            next(error);
        }
    };
}

export { checkOwnership, OwnershipContext, ResourceType };
