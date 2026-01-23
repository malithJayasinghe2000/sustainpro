import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListBucketsCommand,
    HeadBucketCommand,
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
 * Check if S3 is configured with valid credentials
 */
export const isS3Configured = (): boolean => {
    const { accessKeyId, secretAccessKey } = config.aws;

    // Check if credentials exist
    if (!accessKeyId || !secretAccessKey) {
        return false;
    }

    // Check for common placeholder values
    const placeholders = ['your-access-key', 'your-secret-key', 'placeholder', 'xxx', 'changeme'];
    const isPlaceholder = placeholders.some(p =>
        accessKeyId.toLowerCase().includes(p) ||
        secretAccessKey.toLowerCase().includes(p)
    );

    if (isPlaceholder) {
        return false;
    }

    // AWS access keys start with 'AKIA' for long-term or 'ASIA' for temporary
    const validKeyPattern = /^(AKIA|ASIA)[A-Z0-9]{16}$/;
    return validKeyPattern.test(accessKeyId);
};

/**
 * Get S3 storage status for health checks
 */
export const getS3Status = async (): Promise<{
    configured: boolean;
    connected: boolean;
    bucket: string;
    region: string;
    error?: string;
}> => {
    const status = {
        configured: isS3Configured(),
        connected: false,
        bucket: config.aws.s3Bucket,
        region: config.aws.region,
    };

    if (!status.configured) {
        return { ...status, error: 'S3 credentials not configured' };
    }

    const client = getS3Client();
    if (!client) {
        return { ...status, error: 'Failed to create S3 client' };
    }

    try {
        // Check bucket access
        await client.send(new HeadBucketCommand({
            Bucket: config.aws.s3Bucket,
        }));
        status.connected = true;
        logger.info('S3 bucket accessible', { bucket: config.aws.s3Bucket });
    } catch (error: any) {
        const errorMessage = error.name === 'NotFound' 
            ? `Bucket "${config.aws.s3Bucket}" not found`
            : error.name === 'Forbidden'
            ? 'Access denied - check IAM permissions'
            : error.message || 'Unknown error';
        
        logger.error('S3 connection failed', { error: errorMessage });
        return { ...status, error: errorMessage };
    }

    return status;
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
