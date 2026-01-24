import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
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
        // Check S3 access by listing objects in the bucket (requires s3:ListBucket)
        // This verifies both credentials and bucket access without needing s3:ListAllMyBuckets
        await client.send(new ListObjectsV2Command({
            Bucket: config.aws.s3Bucket,
            MaxKeys: 1,  // Only fetch 1 object to minimize overhead
        }));
        
        status.connected = true;
        logger.info('S3 bucket accessible', { bucket: config.aws.s3Bucket });
    } catch (error: any) {
        // Better error handling for AWS SDK errors
        let errorMessage = 'Unknown error';
        
        if (error.name === 'NotFound' || error.Code === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            errorMessage = `Bucket "${config.aws.s3Bucket}" not found`;
        } else if (error.name === 'Forbidden' || error.Code === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
            errorMessage = 'Access denied - check IAM permissions';
        } else if (error.name === 'InvalidAccessKeyId' || error.Code === 'InvalidAccessKeyId') {
            errorMessage = 'Invalid AWS Access Key ID';
        } else if (error.name === 'SignatureDoesNotMatch' || error.Code === 'SignatureDoesNotMatch') {
            errorMessage = 'Invalid AWS Secret Access Key';
        } else if (error.name === 'CredentialsProviderError') {
            errorMessage = 'AWS credentials provider error - check your credentials';
        } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
            errorMessage = 'Network error - cannot reach AWS S3';
        } else if (error.message) {
            errorMessage = error.message;
        } else if (error.name) {
            errorMessage = error.name;
        }
        
        logger.error('S3 connection failed', { 
            error: errorMessage, 
            errorName: error.name,
            errorCode: error.Code || error.code,
            httpStatus: error.$metadata?.httpStatusCode,
            bucket: config.aws.s3Bucket,
            region: config.aws.region
        });
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

    try {
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
    } catch (error: any) {
        // Better error messages for S3 upload failures
        let errorMessage = 'S3 upload failed';
        
        if (error.name === 'InvalidAccessKeyId' || error.Code === 'InvalidAccessKeyId') {
            errorMessage = 'Invalid AWS Access Key ID';
        } else if (error.name === 'SignatureDoesNotMatch' || error.Code === 'SignatureDoesNotMatch') {
            errorMessage = 'Invalid AWS Secret Access Key';
        } else if (error.name === 'AccessDenied' || error.Code === 'AccessDenied') {
            errorMessage = 'Access denied - check S3 bucket permissions';
        } else if (error.name === 'NoSuchBucket' || error.Code === 'NoSuchBucket') {
            errorMessage = `Bucket "${config.aws.s3Bucket}" does not exist`;
        } else if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
            errorMessage = 'Network error - cannot reach AWS S3';
        } else if (error.message) {
            errorMessage = `S3 upload error: ${error.message}`;
        }
        
        logger.error('S3 upload failed', {
            error: errorMessage,
            errorName: error.name,
            errorCode: error.Code || error.code,
            key,
            bucket: config.aws.s3Bucket
        });
        
        throw new Error(errorMessage);
    }
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
