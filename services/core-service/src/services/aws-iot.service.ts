import {
    IoTClient,
    CreateThingCommand,
    CreateKeysAndCertificateCommand,
    AttachPolicyCommand,
    AttachThingPrincipalCommand,
    DeleteThingCommand,
    DescribeThingCommand,
    DetachThingPrincipalCommand,
    DetachPolicyCommand,
    DeleteCertificateCommand,
    UpdateCertificateCommand,
} from '@aws-sdk/client-iot';
import { config } from '../config';
import { createLogger } from '@sustainpro/shared-utils';

const logger = createLogger({ service: 'aws-iot' });

export interface ProvisioningResult {
    thing_name: string;
    iot_endpoint: string;
    certificate_pem: string;
    private_key: string;
    certificate_arn: string;
    topics: {
        telemetry: string;
        status: string;
        commands: string;
    };
}

export class AwsIotService {
    private client: IoTClient | null = null;

    constructor() {
        if (config.aws.iot.enabled) {
            this.client = new IoTClient({
                region: config.aws.region,
                credentials: {
                    accessKeyId: config.aws.accessKeyId,
                    secretAccessKey: config.aws.secretAccessKey,
                },
            });
            logger.info('AWS IoT client initialized');
        } else {
            logger.warn('AWS IoT is disabled - provisioning will be simulated');
        }
    }

    isEnabled(): boolean {
        return this.client !== null;
    }

    async provisionDevice(
        deviceCode: string,
        organizationId: string
    ): Promise<ProvisioningResult> {
        if (!this.client) {
            // Return simulated data for development
            return this.simulateProvisioning(deviceCode, organizationId);
        }

        try {
            // 1. Create Thing
            logger.info('Creating IoT Thing', { deviceCode });
            await this.client.send(
                new CreateThingCommand({
                    thingName: deviceCode,
                    attributePayload: {
                        attributes: {
                            organization_id: organizationId,
                            created_at: new Date().toISOString(),
                        },
                    },
                })
            );

            // 2. Create Certificate
            logger.info('Creating certificate', { deviceCode });
            const certResponse = await this.client.send(
                new CreateKeysAndCertificateCommand({ setAsActive: true })
            );

            if (!certResponse.certificateArn || !certResponse.certificatePem || !certResponse.keyPair?.PrivateKey) {
                throw new Error('Failed to create certificate');
            }

            // 3. Attach Policy to Certificate
            logger.info('Attaching policy', { deviceCode, policy: config.aws.iot.policyName });
            await this.client.send(
                new AttachPolicyCommand({
                    policyName: config.aws.iot.policyName,
                    target: certResponse.certificateArn,
                })
            );

            // 4. Attach Certificate to Thing
            logger.info('Attaching certificate to thing', { deviceCode });
            await this.client.send(
                new AttachThingPrincipalCommand({
                    thingName: deviceCode,
                    principal: certResponse.certificateArn,
                })
            );

            const topics = {
                telemetry: `sustainpro/${organizationId}/${deviceCode}/telemetry`,
                status: `sustainpro/${organizationId}/${deviceCode}/status`,
                commands: `sustainpro/${organizationId}/${deviceCode}/commands`,
            };

            logger.info('Device provisioned successfully', { deviceCode, topics });

            return {
                thing_name: deviceCode,
                iot_endpoint: config.aws.iot.endpoint,
                certificate_pem: certResponse.certificatePem,
                private_key: certResponse.keyPair.PrivateKey,
                certificate_arn: certResponse.certificateArn,
                topics,
            };
        } catch (error: any) {
            logger.error('Failed to provision device', { deviceCode, error: error.message });
            throw error;
        }
    }

    async deprovisionDevice(
        thingName: string,
        certificateArn?: string
    ): Promise<void> {
        if (!this.client) {
            logger.info('Simulating device deprovisioning', { thingName });
            return;
        }

        try {
            // If we have a certificate, clean it up first
            if (certificateArn) {
                const certId = certificateArn.split('/').pop();

                // Detach certificate from thing
                await this.client.send(
                    new DetachThingPrincipalCommand({
                        thingName,
                        principal: certificateArn,
                    })
                );

                // Detach policy from certificate
                await this.client.send(
                    new DetachPolicyCommand({
                        policyName: config.aws.iot.policyName,
                        target: certificateArn,
                    })
                );

                // Deactivate certificate
                await this.client.send(
                    new UpdateCertificateCommand({
                        certificateId: certId,
                        newStatus: 'INACTIVE',
                    })
                );

                // Delete certificate
                await this.client.send(
                    new DeleteCertificateCommand({
                        certificateId: certId,
                    })
                );
            }

            // Delete the thing
            await this.client.send(
                new DeleteThingCommand({ thingName })
            );

            logger.info('Device deprovisioned successfully', { thingName });
        } catch (error: any) {
            logger.error('Failed to deprovision device', { thingName, error: error.message });
            throw error;
        }
    }

    async getThingInfo(thingName: string): Promise<any> {
        if (!this.client) {
            return { thingName, simulated: true };
        }

        const response = await this.client.send(
            new DescribeThingCommand({ thingName })
        );

        return {
            thingName: response.thingName,
            thingArn: response.thingArn,
            attributes: response.attributes,
            version: response.version,
        };
    }

    private simulateProvisioning(
        deviceCode: string,
        organizationId: string
    ): ProvisioningResult {
        logger.info('Simulating IoT provisioning', { deviceCode });

        return {
            thing_name: deviceCode,
            iot_endpoint: 'simulated-endpoint.iot.us-east-1.amazonaws.com',
            certificate_pem: `-----BEGIN CERTIFICATE-----\nSIMULATED_CERTIFICATE_FOR_${deviceCode}\n-----END CERTIFICATE-----`,
            private_key: `-----BEGIN RSA PRIVATE KEY-----\nSIMULATED_PRIVATE_KEY_FOR_${deviceCode}\n-----END RSA PRIVATE KEY-----`,
            certificate_arn: `arn:aws:iot:us-east-1:000000000000:cert/simulated-${deviceCode}`,
            topics: {
                telemetry: `sustainpro/${organizationId}/${deviceCode}/telemetry`,
                status: `sustainpro/${organizationId}/${deviceCode}/status`,
                commands: `sustainpro/${organizationId}/${deviceCode}/commands`,
            },
        };
    }
}

// Singleton instance
export const awsIotService = new AwsIotService();
