import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'core-service' });

let s3Client: S3Client | null = null;

/**
 * Initialize S3 client
 */
const getS3Client = (): S3Client | null => {
    if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
        return null;
    }

    if (!s3Client) {
        s3Client = new S3Client({
            region: config.aws.region,
            credentials: {
                accessKeyId: config.aws.accessKeyId,
                secretAccessKey: config.aws.secretAccessKey,
            },
        });
    }

    return s3Client;
};

/**
 * Check if S3 is configured
 */
export const isS3Configured = (): boolean => {
    return !!(config.aws.accessKeyId && config.aws.secretAccessKey);
};

/**
 * Upload a file to S3
 */
export const uploadToS3 = async (
    buffer: Buffer,
    key: string,
    contentType: string
): Promise<string> => {
    const client = getS3Client();

    if (!client) {
        throw new Error('S3 not configured - missing AWS credentials');
    }

    await client.send(new PutObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'max-age=31536000', // 1 year cache
    }));

    const url = `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
    logger.info('File uploaded to S3', { key, url });

    return url;
};

/**
 * Delete a file from S3
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
    const client = getS3Client();

    if (!client) {
        throw new Error('S3 not configured - missing AWS credentials');
    }

    await client.send(new DeleteObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: key,
    }));

    logger.info('File deleted from S3', { key });
};

/**
 * Check if a file exists in S3
 */
export const existsInS3 = async (key: string): Promise<boolean> => {
    const client = getS3Client();

    if (!client) {
        return false;
    }

    try {
        await client.send(new HeadObjectCommand({
            Bucket: config.aws.s3Bucket,
            Key: key,
        }));
        return true;
    } catch {
        return false;
    }
};

/**
 * Generate a unique S3 key for uploads
 */
export const generateS3Key = (
    folder: string,
    filename: string,
    organizationId?: string
): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop() || 'bin';
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    if (organizationId) {
        return `${folder}/${organizationId}/${timestamp}-${random}.${ext}`;
    }

    return `${folder}/${timestamp}-${random}-${safeName}`;
};
