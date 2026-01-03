# AWS IoT Core Setup Guide

This guide walks you through setting up AWS IoT Core for the SustainPro platform with dynamic device provisioning.

## Prerequisites

- AWS account with IoT Core access
- AWS CLI installed (optional, but recommended)
- Admin access to AWS Console
- SustainPro backend running

## Step 1: Create IAM User for Backend

1. Go to **AWS Console** → **IAM** → **Users** → **Create User**
2. User name: `sustainpro-iot-backend`
3. **Attach policies directly**:
   - `AWSIoTFullAccess` (or create a custom policy with minimum permissions)

### Minimum Required Permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:CreateThing",
        "iot:DescribeThing",
        "iot:DeleteThing",
        "iot:CreateKeysAndCertificate",
        "iot:UpdateCertificate",
        "iot:DeleteCertificate",
        "iot:AttachThingPrincipal",
        "iot:DetachThingPrincipal",
        "iot:CreatePolicy",
        "iot:GetPolicy",
        "iot:AttachPolicy",
        "iot:DetachPolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

4. **Create access key** → Download credentials
5. Save `Access Key ID` and `Secret Access Key`

## Step 2: Configure Backend Environment

1. Edit `backend/.env`:

```env
AWS_IOT_ENABLED=true
AWS_REGION=us-east-1  # Or your preferred region
AWS_ACCESS_KEY_ID=<your_access_key_id>
AWS_SECRET_ACCESS_KEY=<your_secret_access_key>
AWS_IOT_ENDPOINT=<your_endpoint>-ats.iot.<region>.amazonaws.com
AWS_IOT_POLICY_NAME=SustainProDevicePolicy
AWS_IOT_WEBHOOK_SECRET=<generate_random_secret>
```

### Getting your AWS IoT Endpoint:

**Option 1: AWS Console**
- Go to **AWS IoT Core** → **Settings**
- Copy the **Endpoint** (e.g., `a3kxxx-ats.iot.us-east-1.amazonaws.com`)

**Option 2: AWS CLI**
```bash
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```

2. Generate a random webhook secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Restart backend server:
```bash
npm run dev
```

Check logs for: `✅ AWS IoT Client initialized for region: us-east-1`

## Step 3: Create IoT Policy (Automatic)

The backend automatically creates the ` SustainProDevicePolicy` on first device provisioning. However, you can create it manually if needed:

1. Go to **AWS IoT Core** → **Security** → **Policies** → **Create Policy**
2. Policy name: `SustainProDevicePolicy`
3. Policy document:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:*:*:client/${iot:Connection.Thing.ThingName}"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": [
        "arn:aws:iot:*:*:topic/sustainpro/*/*/telemetry",
        "arn:aws:iot:*:*:topic/sustainpro/*/*/status"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": "arn:aws:iot:*:*:topicfilter/sustainpro/*/*/commands"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": "arn:aws:iot:*:*:topic/sustainpro/*/*/commands"
    }
  ]
}
```

## Step 4: Set Up IoT Rule for Webhook

This rule forwards telemetry data from devices to your backend webhook.

1. Go to **AWS IoT Core** → **Message routing** → **Rules** → **Create Rule**

2. **Rule properties**:
   - Rule name: `SustainProTelemetryIngestion`
   - Description: `Forward device telemetry to SustainPro backend webhook`

3. **SQL statement**:
```sql
SELECT * FROM 'sustainpro/+/+/telemetry'
```

4. **Rule actions** → **Add action** → **HTTPS**:
   - URL: `https://your-domain.com/api/v1/aws-iot/webhook`
   - For local testing: `https://your-ngrok-url.ngrok.io/api/v1/aws-iot/webhook`
   - Authorization header: `Bearer <your_webhook_secret>`

5. **Create Rule**

### Testing the Rule (optional):

1. Go to **MQTT test client**
2. Publish to topic: `sustainpro/test-org-id/SPS_001/telemetry`
3. Message:
```json
{
  "device_code": "SPS_001",
  "organization_id": "test-org-id",
  "data": {
    "temperature": 25.5,
    "humidity": 60
  },
  "timestamp": "2026-01-03T10:00:00Z"
}
```

4. Check backend logs for webhook receipt

## Step 5: Provision Your First Device

### Via API:

```bash
curl -X POST http://localhost:5000/api/v1/devices/<device_id>/provision-iot \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "provisioning_data": {
    "thing_name": "SPS_001",
    "iot_endpoint": "xxxxx-ats.iot.us-east-1.amazonaws.com",
    "certificate_pem": "-----BEGIN CERTIFICATE-----\n...",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
    "root_ca": "-----BEGIN CERTIFICATE-----\n...",
    "topics": {
      "telemetry": "sustainpro/<org_id>/SPS_001/telemetry",
      "status": "sustainpro/<org_id>/SPS_001/status",
      "commands": "sustainpro/<org_id>/SPS_001/commands"
    }
  }
}
```

### Configure Device (ESP32):

1. Flash firmware with MQTT client
2. Store certificates and keys in device flash
3. Connect device to AWS IoT Core using:
   - Client ID: `SPS_001` (thing_name)
   - Host: IoT endpoint
   - Port: 8883 (MQTT over TLS)
   - Certificates from provisioning response

## Verification

### 1. Check Thing Created:
```bash
aws iot describe-thing --thing-name SPS_001
```

### 2. Check Certificate Active:
```bash
aws iot list-thing-principals --thing-name SPS_001
```

### 3. Test MQTT Connection:
- Use AWS IoT Core MQTT test client
- Subscribe to: `sustainpro/#`
- Should see messages from your device

### 4. Check Webhook Logs:
```
📡 [AWS IoT Webhook] Received telemetry from SPS_001
✅ Emitted telemetry data via Socket.IO
```

## Troubleshooting

### "AWS IoT Client not initialized"
- Check `.env` file has correct AWS credentials
- Verify `AWS_IOT_ENABLED=true`
- Restart backend server

### Device can't connect to AWS IoT
- Verify certificates are correctly installed in device
- Check thing name matches client ID
- Verify IoT endpoint is correct
- Check device clock (must be within 5 minutes of actual time)

### Webhook not receiving data
- Verify IoT Rule is enabled
- Check SQL statement matches topic pattern
- Verify webhook URL is accessible from AWS
- Check authorization header matches `AWS_IOT_WEBHOOK_SECRET`

### Certificate already exists error
- Thing name (device_code) already exists in AWS
- Delete orphaned Thing: `aws iot delete-thing --thing-name <name>`
- Or use different device code

## Security Best Practices

1. **Rotate Credentials**: Regularly rotate AWS IAM credentials
2. **Minimum Permissions**: Use most restrictive IAM policy possible
3. **Secure Webhook**: Always use HTTPS for webhook endpoint
4. **Strong Secret**: Use cryptographically strong webhook secret
5. **Monitor Access**: Enable AWS CloudTrail for audit logging

## Cost Considerations

AWS IoT Core pricing (as of 2024):
- **Connectivity**: $0.08 per million minutes connected
- **Messaging**: $1.00 per million messages
- **Rules Engine**: $0.15 per million actions

Example: 100 devices sending data every 5 seconds:
- ~30M messages/month = ~$30/month

## Next Steps

1. Provision all devices via API
2. Flash devices with certificates
3. Monitor telemetry on dashboard
4. Set up alerts and analytics
5. Implement commands (device control)
