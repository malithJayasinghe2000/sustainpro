/**
 * Cache Invalidation via RabbitMQ
 * Best Practice: Distributed cache invalidation for microservices
 * 
 * When a user's role or permissions are changed in auth-service,
 * this publishes an event that all other services subscribe to
 * so they can clear their local permission caches.
 */

import amqp, { ChannelModel, Channel, ConsumeMessage } from 'amqplib';
import { logger } from './logger';

export interface CacheInvalidationMessage {
    type: 'user_permissions' | 'role_updated' | 'user_role_changed' | 'all_permissions';
    userId?: string;
    roleCode?: string;
    timestamp: string;
    source: string; // Service name that triggered the invalidation
}

interface CacheInvalidationConfig {
    url: string;
    exchange?: string;
    queue?: string;
    serviceName: string;
    enabled?: boolean;
}

type CacheInvalidationHandler = (message: CacheInvalidationMessage) => void | Promise<void>;

class CacheInvalidationService {
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    private config: Required<CacheInvalidationConfig>;
    private handlers: CacheInvalidationHandler[] = [];
    private isConnecting: boolean = false;
    private reconnectAttempts: number = 0;
    private maxRetries: number = 10;

    constructor(config: CacheInvalidationConfig) {
        this.config = {
            exchange: 'sustainpro.cache',
            queue: `cache-invalidation-${config.serviceName}`,
            enabled: true,
            ...config
        };
    }

    async connect(): Promise<boolean> {
        if (!this.config.enabled) {
            logger.info('[CacheInvalidation] Disabled by configuration');
            return false;
        }

        if (this.isConnecting) {
            return false;
        }

        this.isConnecting = true;

        try {
            this.connection = await amqp.connect(this.config.url);
            this.channel = await this.connection!.createChannel();

            // Assert the exchange (fanout for broadcast to all services)
            await this.channel!.assertExchange(this.config.exchange, 'fanout', {
                durable: true
            });

            // Assert queue for this service
            await this.channel!.assertQueue(this.config.queue, {
                durable: false, // Non-durable since cache is transient
                exclusive: false,
                autoDelete: true // Auto-delete when service disconnects
            });

            // Bind queue to exchange
            await this.channel!.bindQueue(this.config.queue, this.config.exchange, '');

            // Start consuming messages
            await this.channel!.consume(this.config.queue, this.handleMessage.bind(this), {
                noAck: true // Auto-acknowledge (cache invalidation is idempotent)
            });

            // Handle connection errors
            this.connection!.on('error', (err) => {
                logger.error('[CacheInvalidation] Connection error:', err.message);
                this.scheduleReconnect();
            });

            this.connection!.on('close', () => {
                logger.warn('[CacheInvalidation] Connection closed');
                this.scheduleReconnect();
            });

            this.reconnectAttempts = 0;
            this.isConnecting = false;
            logger.info(`[CacheInvalidation] ${this.config.serviceName} connected and listening`);
            return true;
        } catch (err) {
            this.isConnecting = false;
            const error = err as Error;
            logger.error('[CacheInvalidation] Failed to connect:', { message: error.message });
            this.scheduleReconnect();
            return false;
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.maxRetries) {
            logger.error('[CacheInvalidation] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        logger.info(`[CacheInvalidation] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxRetries}`);

        setTimeout(() => {
            this.connect();
        }, 5000);
    }

    private handleMessage(msg: ConsumeMessage | null): void {
        if (!msg) return;

        try {
            const message: CacheInvalidationMessage = JSON.parse(msg.content.toString());

            // Don't process messages from ourselves
            if (message.source === this.config.serviceName) {
                return;
            }

            logger.debug(`[CacheInvalidation] Received: ${message.type} from ${message.source}`, {
                userId: message.userId,
                roleCode: message.roleCode
            });

            // Call all registered handlers
            for (const handler of this.handlers) {
                try {
                    handler(message);
                } catch (err) {
                    const error = err as Error;
                    logger.error('[CacheInvalidation] Handler error:', { message: error.message });
                }
            }
        } catch (err) {
            const error = err as Error;
            logger.error('[CacheInvalidation] Failed to parse message:', { message: error.message });
        }
    }

    /**
     * Register a handler for cache invalidation events
     */
    onInvalidation(handler: CacheInvalidationHandler): void {
        this.handlers.push(handler);
    }

    /**
     * Publish cache invalidation event
     */
    async publish(message: Omit<CacheInvalidationMessage, 'timestamp' | 'source'>): Promise<boolean> {
        if (!this.config.enabled) {
            return false;
        }

        if (!this.channel) {
            logger.warn('[CacheInvalidation] Channel not available');
            return false;
        }

        try {
            const fullMessage: CacheInvalidationMessage = {
                ...message,
                timestamp: new Date().toISOString(),
                source: this.config.serviceName
            };

            const messageBuffer = Buffer.from(JSON.stringify(fullMessage));
            
            const result = this.channel.publish(
                this.config.exchange,
                '', // Empty routing key for fanout
                messageBuffer,
                {
                    contentType: 'application/json'
                }
            );

            if (result) {
                logger.debug(`[CacheInvalidation] Published: ${message.type}`, {
                    userId: message.userId,
                    roleCode: message.roleCode
                });
            }

            return result;
        } catch (err) {
            const error = err as Error;
            logger.error('[CacheInvalidation] Failed to publish:', { message: error.message });
            return false;
        }
    }

    /**
     * Invalidate a specific user's permission cache
     */
    async invalidateUserPermissions(userId: string): Promise<boolean> {
        return this.publish({
            type: 'user_permissions',
            userId
        });
    }

    /**
     * Invalidate caches for all users with a specific role
     */
    async invalidateRolePermissions(roleCode: string): Promise<boolean> {
        return this.publish({
            type: 'role_updated',
            roleCode
        });
    }

    /**
     * Invalidate when a user's role assignment changes
     */
    async invalidateUserRole(userId: string, roleCode: string): Promise<boolean> {
        return this.publish({
            type: 'user_role_changed',
            userId,
            roleCode
        });
    }

    /**
     * Invalidate ALL permission caches (use sparingly)
     */
    async invalidateAll(): Promise<boolean> {
        return this.publish({
            type: 'all_permissions'
        });
    }

    async close(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            logger.info('[CacheInvalidation] Connection closed');
        } catch (err) {
            const error = err as Error;
            logger.error('[CacheInvalidation] Error closing connection:', { message: error.message });
        }
    }

    isConnected(): boolean {
        return this.channel !== null && this.connection !== null;
    }
}

// Singleton instance
let serviceInstance: CacheInvalidationService | null = null;

export const initCacheInvalidation = async (config: CacheInvalidationConfig): Promise<CacheInvalidationService> => {
    if (!serviceInstance) {
        serviceInstance = new CacheInvalidationService(config);
        await serviceInstance.connect();
    }
    return serviceInstance;
};

export const getCacheInvalidationService = (): CacheInvalidationService | null => {
    return serviceInstance;
};

export const closeCacheInvalidation = async (): Promise<void> => {
    if (serviceInstance) {
        await serviceInstance.close();
        serviceInstance = null;
    }
};

export { CacheInvalidationService };
