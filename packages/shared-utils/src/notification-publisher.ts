import amqp, { ChannelModel, Channel } from 'amqplib';
import { logger } from './logger';

export interface NotificationMessage {
    type: 'otp' | 'password_reset' | 'password_changed' | '2fa_enabled' | '2fa_disabled' | 'welcome' | 'account_locked' | 'login_alert' | 'custom';
    to: string;
    data: Record<string, any>;
    template?: string;
    priority?: 'low' | 'normal' | 'high';
    metadata?: {
        userId?: string;
        correlationId?: string;
        source?: string;
    };
}

interface RabbitMQPublisherConfig {
    url: string;
    exchange?: string;
    enabled?: boolean;
    reconnectInterval?: number;
    maxRetries?: number;
}

class NotificationPublisher {
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;
    private config: RabbitMQPublisherConfig;
    private isConnecting: boolean = false;
    private reconnectAttempts: number = 0;

    constructor(config: RabbitMQPublisherConfig) {
        this.config = {
            exchange: 'sustainpro.notifications',
            enabled: true,
            reconnectInterval: 5000,
            maxRetries: 10,
            ...config
        };
    }

    async connect(): Promise<boolean> {
        if (!this.config.enabled) {
            logger.info('[RabbitMQ Publisher] Disabled by configuration');
            return false;
        }

        if (this.isConnecting) {
            return false;
        }

        this.isConnecting = true;

        try {
            this.connection = await amqp.connect(this.config.url);
            this.channel = await this.connection!.createChannel();

            // Assert the exchange (using topic for flexible routing)
            await this.channel!.assertExchange(this.config.exchange!, 'topic', {
                durable: true
            });

            // Handle connection errors
            this.connection!.on('error', (err) => {
                logger.error('[RabbitMQ Publisher] Connection error:', err.message);
                this.scheduleReconnect();
            });

            this.connection!.on('close', () => {
                logger.warn('[RabbitMQ Publisher] Connection closed');
                this.scheduleReconnect();
            });

            this.reconnectAttempts = 0;
            this.isConnecting = false;
            logger.info('[RabbitMQ Publisher] Connected successfully');
            return true;
        } catch (err) {
            this.isConnecting = false;
            const error = err as Error;
            logger.error('[RabbitMQ Publisher] Failed to connect:', { message: error.message });
            this.scheduleReconnect();
            return false;
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= this.config.maxRetries!) {
            logger.error('[RabbitMQ Publisher] Max reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        logger.info(`[RabbitMQ Publisher] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxRetries}`);
        
        setTimeout(() => {
            this.connect();
        }, this.config.reconnectInterval);
    }

    /**
     * Generate routing key based on message type
     * Format: notification.email.<type>
     */
    private getRoutingKey(message: NotificationMessage): string {
        // Default to email channel for now
        return `notification.email.${message.type}`;
    }

    async publish(message: NotificationMessage): Promise<boolean> {
        if (!this.config.enabled) {
            logger.debug('[RabbitMQ Publisher] Publishing disabled, message not sent');
            return false;
        }

        if (!this.channel) {
            logger.warn('[RabbitMQ Publisher] Channel not available, attempting to connect');
            await this.connect();
            if (!this.channel) {
                logger.error('[RabbitMQ Publisher] Failed to establish channel');
                return false;
            }
        }

        try {
            const messageBuffer = Buffer.from(JSON.stringify({
                ...message,
                timestamp: new Date().toISOString()
            }));

            const routingKey = this.getRoutingKey(message);
            const result = this.channel.publish(
                this.config.exchange!,
                routingKey,
                messageBuffer,
                {
                    persistent: true,
                    contentType: 'application/json',
                    priority: message.priority === 'high' ? 10 : message.priority === 'low' ? 1 : 5
                }
            );

            if (result) {
                logger.debug(`[RabbitMQ Publisher] Published ${message.type} notification to ${message.to} (routing: ${routingKey})`);
            }

            return result;
        } catch (err) {
            const error = err as Error;
            logger.error('[RabbitMQ Publisher] Failed to publish message:', { message: error.message });
            return false;
        }
    }

    async close(): Promise<void> {
        try {
            if (this.channel) {
                await this.channel.close();
            }
            if (this.connection) {
                await this.connection.close();
            }
            logger.info('[RabbitMQ Publisher] Connection closed');
        } catch (err) {
            const error = err as Error;
            logger.error('[RabbitMQ Publisher] Error closing connection:', { message: error.message });
        }
    }

    isConnected(): boolean {
        return this.channel !== null && this.connection !== null;
    }
}

// Singleton instance
let publisherInstance: NotificationPublisher | null = null;

export const initNotificationPublisher = async (config: RabbitMQPublisherConfig): Promise<NotificationPublisher> => {
    if (!publisherInstance) {
        publisherInstance = new NotificationPublisher(config);
        await publisherInstance.connect();
    }
    return publisherInstance;
};

export const getNotificationPublisher = (): NotificationPublisher | null => {
    return publisherInstance;
};

export const publishNotification = async (message: NotificationMessage): Promise<boolean> => {
    if (!publisherInstance) {
        logger.warn('[RabbitMQ Publisher] Publisher not initialized');
        return false;
    }
    return publisherInstance.publish(message);
};

export const closeNotificationPublisher = async (): Promise<void> => {
    if (publisherInstance) {
        await publisherInstance.close();
        publisherInstance = null;
    }
};

export { NotificationPublisher };
