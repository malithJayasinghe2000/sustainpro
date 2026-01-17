import amqplib, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';
import { handleNotificationMessage } from '../handlers/notification.handler';

const logger = createLogger({ service: 'notification-service' });

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

const EXCHANGE_NAME = config.rabbitmq.exchange;
const QUEUES = config.rabbitmq.queues;

// Routing key patterns for binding
const ROUTING_PATTERNS = {
    email: [
        'notification.email.*',      // notification.email.otp, notification.email.welcome, etc.
        'user.*.email',              // user.created.email, user.password_changed.email
        'alert.*.email',             // alert.critical.email, alert.warning.email
    ],
    sms: [
        'notification.sms.*',
    ],
    push: [
        'notification.push.*',
    ],
};

/**
 * Connect to RabbitMQ and setup consumers
 */
export const connectRabbitMQ = async (): Promise<void> => {
    if (!config.rabbitmq.enabled) {
        logger.info('RabbitMQ disabled - notifications will only work via direct API');
        return;
    }

    try {
        connection = await amqplib.connect(config.rabbitmq.url);
        channel = await connection!.createChannel();

        // Set prefetch to process one message at a time (for rate limiting)
        await channel!.prefetch(1);

        // Declare exchange for notifications
        await channel!.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        // Also subscribe to the main sustainpro.events exchange
        await channel!.assertExchange('sustainpro.events', 'topic', { durable: true });

        // Setup queues and bindings
        await setupQueues();

        logger.info('📨 RabbitMQ connected - Notification consumers ready');

        // Handle connection events
        connection!.on('error', (err: Error) => {
            logger.error('RabbitMQ connection error', { error: err.message });
        });

        connection!.on('close', () => {
            logger.warn('RabbitMQ connection closed - attempting reconnect');
            channel = null;
            connection = null;
            // Attempt reconnect after delay
            setTimeout(connectRabbitMQ, 5000);
        });

    } catch (error) {
        logger.error('Failed to connect to RabbitMQ', { error: (error as Error).message });
        // Retry after delay
        setTimeout(connectRabbitMQ, 5000);
    }
};

/**
 * Setup queues and consumers
 */
async function setupQueues(): Promise<void> {
    if (!channel) return;

    // ===============================
    // Email Queue
    // ===============================
    await channel.assertQueue(QUEUES.email, {
        durable: true,
        arguments: {
            'x-dead-letter-exchange': `${EXCHANGE_NAME}.dlx`,
            'x-dead-letter-routing-key': 'email.failed',
        },
    });

    // Bind to notification exchange patterns
    for (const pattern of ROUTING_PATTERNS.email) {
        await channel.bindQueue(QUEUES.email, EXCHANGE_NAME, pattern);
    }

    // Also bind to main events exchange for user events
    await channel.bindQueue(QUEUES.email, 'sustainpro.events', 'user.*');
    await channel.bindQueue(QUEUES.email, 'sustainpro.events', 'alert.*');
    await channel.bindQueue(QUEUES.email, 'sustainpro.events', 'notification.email.*');
    await channel.bindQueue(QUEUES.email, 'sustainpro.events', 'event.end_requested');

    // Start consuming
    channel.consume(QUEUES.email, async (msg) => {
        if (msg) {
            await processMessage(msg, 'email');
        }
    }, { noAck: false });

    logger.info(`📧 Email consumer ready on queue: ${QUEUES.email}`);

    // ===============================
    // SMS Queue (for future use)
    // ===============================
    await channel.assertQueue(QUEUES.sms, { durable: true });
    for (const pattern of ROUTING_PATTERNS.sms) {
        await channel.bindQueue(QUEUES.sms, EXCHANGE_NAME, pattern);
    }
    channel.consume(QUEUES.sms, async (msg) => {
        if (msg) {
            await processMessage(msg, 'sms');
        }
    }, { noAck: false });

    logger.info(`📱 SMS consumer ready on queue: ${QUEUES.sms}`);

    // ===============================
    // Push Queue (for future use)
    // ===============================
    await channel.assertQueue(QUEUES.push, { durable: true });
    for (const pattern of ROUTING_PATTERNS.push) {
        await channel.bindQueue(QUEUES.push, EXCHANGE_NAME, pattern);
    }
    channel.consume(QUEUES.push, async (msg) => {
        if (msg) {
            await processMessage(msg, 'push');
        }
    }, { noAck: false });

    logger.info(`🔔 Push consumer ready on queue: ${QUEUES.push}`);

    // ===============================
    // Dead Letter Queue for failed messages
    // ===============================
    await channel.assertExchange(`${EXCHANGE_NAME}.dlx`, 'direct', { durable: true });
    await channel.assertQueue(`${QUEUES.email}.failed`, { durable: true });
    await channel.bindQueue(`${QUEUES.email}.failed`, `${EXCHANGE_NAME}.dlx`, 'email.failed');
}

/**
 * Process incoming message
 */
async function processMessage(msg: ConsumeMessage, type: 'email' | 'sms' | 'push'): Promise<void> {
    if (!channel) return;

    const routingKey = msg.fields.routingKey;

    try {
        const payload = JSON.parse(msg.content.toString());

        logger.debug(`Processing ${type} notification`, { routingKey, payload: { ...payload, code: '***' } });

        // Handle the notification
        const success = await handleNotificationMessage(type, routingKey, payload);

        if (success) {
            channel.ack(msg);
            logger.debug(`✅ ${type} notification processed`, { routingKey });
        } else {
            // Reject and requeue if not exceeded max retries
            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) as number;

            if (retryCount < config.retry.maxAttempts) {
                // Delay before retry
                await new Promise(resolve =>
                    setTimeout(resolve, config.retry.initialDelayMs * Math.pow(config.retry.backoffMultiplier, retryCount))
                );

                channel.nack(msg, false, true);
                logger.warn(`Retrying ${type} notification`, { routingKey, attempt: retryCount + 1 });
            } else {
                // Max retries exceeded, send to DLQ
                channel.nack(msg, false, false);
                logger.error(`❌ ${type} notification failed permanently`, { routingKey, retryCount });
            }
        }
    } catch (error) {
        logger.error(`Error processing ${type} message`, {
            error: (error as Error).message,
            routingKey,
        });
        channel.nack(msg, false, false); // Don't requeue, send to DLQ
    }
}

/**
 * Publish a notification event
 */
export const publishNotification = async (
    routingKey: string,
    payload: object
): Promise<boolean> => {
    if (!channel) {
        logger.warn('RabbitMQ not connected - cannot publish', { routingKey });
        return false;
    }

    try {
        const message = Buffer.from(JSON.stringify({
            ...payload,
            timestamp: new Date().toISOString(),
        }));

        channel.publish(EXCHANGE_NAME, routingKey, message, {
            persistent: true,
            contentType: 'application/json',
            headers: {
                'x-retry-count': 0,
            },
        });

        logger.debug('Notification published', { routingKey });
        return true;
    } catch (error) {
        logger.error('Failed to publish notification', {
            routingKey,
            error: (error as Error).message
        });
        return false;
    }
};

/**
 * Close RabbitMQ connection gracefully
 */
export const closeRabbitMQ = async (): Promise<void> => {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        logger.info('RabbitMQ connection closed gracefully');
    } catch (error) {
        logger.error('Error closing RabbitMQ', { error: (error as Error).message });
    }
};

/**
 * Check if RabbitMQ is connected
 */
export const isConnected = (): boolean => {
    return channel !== null && connection !== null;
};
