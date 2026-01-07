import amqplib from 'amqplib';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });

let connection: amqplib.ChannelModel | null = null;
let channel: amqplib.Channel | null = null;

const EXCHANGE_NAME = 'sustainpro.events';

/**
 * Connect to RabbitMQ and set up exchange
 */
export const connectRabbitMQ = async (): Promise<void> => {
    if (!config.rabbitmq.enabled) {
        logger.info('RabbitMQ disabled - skipping connection');
        return;
    }

    try {
        connection = await amqplib.connect(config.rabbitmq.url);
        channel = await connection.createChannel();

        // Declare exchanges for different event types
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        logger.info('📨 RabbitMQ connected');

        // Handle connection errors
        connection.on('error', (err: Error) => {
            logger.error('RabbitMQ connection error', { error: err.message });
        });

        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed');
            channel = null;
            connection = null;
        });
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ', { error: (error as Error).message });
        // Don't throw - allow service to run without RabbitMQ
    }
};

/**
 * Publish an event to RabbitMQ
 */
export const publishEvent = async (
    routingKey: string,
    payload: object
): Promise<boolean> => {
    if (!channel) {
        logger.warn('RabbitMQ not connected - event not published', { routingKey });
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
        });

        logger.debug('Event published', { routingKey });
        return true;
    } catch (error) {
        logger.error('Failed to publish event', { routingKey, error: (error as Error).message });
        return false;
    }
};

/**
 * Close RabbitMQ connection
 */
export const closeRabbitMQ = async (): Promise<void> => {
    if (channel) {
        await channel.close();
    }
    if (connection) {
        await connection.close();
    }
    logger.info('RabbitMQ connection closed');
};

// Event routing keys:
// - organization.created
// - organization.updated
// - organization.deleted
// - event.created
// - event.started
// - event.stopped
// - event.archived
// - department.created
// - department.updated
// - department.deleted
// - service.assigned
// - service.unassigned
