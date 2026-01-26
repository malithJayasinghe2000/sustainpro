# AWS S3 Storage Setup Guide

This guide walks you through setting up AWS S3 for file storage in SustainPro. The system is designed to automatically use S3 when configured, with fallback to local storage for development.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [AWS Account Setup](#aws-account-setup)
3. [Create S3 Bucket](#create-s3-bucket)
4. [Configure Bucket Policy & CORS](#configure-bucket-policy--cors)
5. [Create IAM User](#create-iam-user)
6. [Configure Environment Variables](#configure-environment-variables)
7. [Verify Setup](#verify-setup)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SustainPro                               │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)                                             │
│    └── Upload Component → API Request                           │
│                              ↓                                  │
│  Core Service (Express)                                         │
│    └── /api/v1/upload                                           │
│          ├── S3 Configured? → Upload to S3 → Return S3 URL      │
│          └── Not Configured → Save Locally → Return Local URL   │
│                                                                 │
│  S3 Bucket Structure:                                           │
│    sustainpro-uploads/                                          │
│    ├── services/          # Service template images             │
│    ├── organizations/     # Organization logos & files          │
│    ├── devices/           # Device images                       │
│    ├── events/            # Event images                        │
│    └── general/           # Miscellaneous uploads               │
└─────────────────────────────────────────────────────────────────┘
```

---

## AWS Account Setup

### Step 1: Create an AWS Account (if you don't have one)

1. Go to [AWS Console](https://aws.amazon.com/console/)
2. Click "Create an AWS Account"
3. Follow the registration process
4. Add a payment method (required, but free tier covers most basic usage)

### Step 2: Enable Free Tier Benefits

AWS S3 Free Tier includes:
- 5 GB of Standard Storage
- 20,000 GET requests
- 2,000 PUT requests

---

## Create S3 Bucket

### Step 1: Navigate to S3

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Search for "S3" in the search bar
3. Click "S3" to open the S3 dashboard

### Step 2: Create Bucket

1. Click **"Create bucket"**

2. **Bucket name**: `sustainpro-uploads-production`
   - Must be globally unique
   - Use lowercase letters, numbers, and hyphens only
   - Recommended format: `sustainpro-uploads-{environment}`

3. **AWS Region**: Choose closest to your users
   - For Digital Ocean deployment, match regions if possible
   - Examples: `us-east-1`, `ap-southeast-1`, `eu-west-1`

4. **Object Ownership**: Keep "ACLs disabled (recommended)"

5. **Block Public Access settings**:
   - **UNCHECK** "Block all public access"
   - Acknowledge the warning (we need public read for images)

6. **Bucket Versioning**: Disable (not needed for images)

7. **Default encryption**: Enable with SSE-S3

8. Click **"Create bucket"**

---

## Configure Bucket Policy & CORS

### Step 1: Set Bucket Policy (Public Read)

1. Click on your bucket name
2. Go to **"Permissions"** tab
3. Scroll to **"Bucket policy"** → Click **"Edit"**
4. Paste this policy (replace `YOUR-BUCKET-NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

5. Click **"Save changes"**

### Step 2: Configure CORS

1. Still in **"Permissions"** tab
2. Scroll to **"Cross-origin resource sharing (CORS)"** → Click **"Edit"**
3. Paste this configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": [
            "https://your-production-domain.com",
            "https://www.your-production-domain.com",
            "http://localhost:3000",
            "http://localhost:8888"
        ],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

4. Replace `your-production-domain.com` with your actual domain
5. Click **"Save changes"**

---

## Create IAM User

### Step 1: Create IAM User for Application

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Click **"Users"** → **"Add users"**

3. **User name**: `sustainpro-s3-uploader`

4. **Permissions**:
   - Select **"Attach policies directly"**
   - Click **"Create policy"** (opens new tab)

### Step 2: Create Custom Policy

1. In the new tab, select **"JSON"** tab
2. Paste this policy (replace `YOUR-BUCKET-NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "SustainProS3Access",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:HeadObject",
                "s3:HeadBucket"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR-BUCKET-NAME",
                "arn:aws:s3:::YOUR-BUCKET-NAME/*"
            ]
        }
    ]
}
```

3. Click **"Next"**
4. **Policy name**: `SustainProS3UploadPolicy`
5. Click **"Create policy"**

### Step 3: Attach Policy to User

1. Go back to the user creation tab
2. Click refresh icon next to policies
3. Search for `SustainProS3UploadPolicy`
4. Select it and click **"Next"**
5. Click **"Create user"**

### Step 4: Generate Access Keys

1. Click on the user name `sustainpro-s3-uploader`
2. Go to **"Security credentials"** tab
3. Scroll to **"Access keys"** → Click **"Create access key"**
4. Select **"Application running outside AWS"**
5. Click **"Next"** → **"Create access key"**
6. **IMPORTANT**: Save these credentials securely!
   - **Access Key ID**: `AKIA...` (starts with AKIA)
   - **Secret Access Key**: `...` (only shown once!)

---

## Configure Environment Variables

### For Production (Digital Ocean / Server)

Add these environment variables to your deployment:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_S3_BUCKET=sustainpro-uploads-production
```

### For Digital Ocean App Platform

1. Go to your App → Settings → App-Level Environment Variables
2. Add each variable as an **Encrypted** variable

### For Docker / docker-compose

Update your `docker-compose.yml` or `.env` file:

```yaml
# In docker-compose.yml
environment:
  - AWS_REGION=us-east-1
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - AWS_S3_BUCKET=sustainpro-uploads-production
```

### Local Development (.env)

Update `services/core-service/.env`:

```bash
# AWS S3 (optional for local dev - leave empty to use local storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=sustainpro-uploads-dev
```

---

## Verify Setup

### Method 1: API Endpoint (Recommended)

After deployment, check S3 status via API:

```bash
# Login first to get token
TOKEN="your-jwt-token"

# Check storage status (Super Admin only)
curl -H "Authorization: Bearer $TOKEN" \
  https://your-api-domain.com/api/v1/admin/storage-status
```

Expected response when configured:
```json
{
  "success": true,
  "data": {
    "provider": "s3",
    "s3": {
      "configured": true,
      "connected": true,
      "bucket": "sustainpro-uploads-production",
      "region": "us-east-1"
    },
    "message": "S3 storage is active and connected"
  }
}
```

### Method 2: Test Upload

1. Log in to SustainPro dashboard
2. Go to Admin → Services → Create New Service
3. Upload a service image
4. Check if the returned URL is an S3 URL:
   - ✅ S3: `https://sustainpro-uploads-production.s3.us-east-1.amazonaws.com/services/...`
   - ❌ Local: `/api/v1/images/public/services/...`

### Method 3: Check Server Logs

Look for these log messages:

```
✅ Success: "File uploaded to S3" with key and url
❌ Fallback: "File uploaded locally" (S3 not configured)
❌ Error: "S3 not configured - missing AWS credentials"
```

---

## Troubleshooting

### Issue: "S3 not configured"

**Cause**: Missing or invalid AWS credentials

**Solution**:
1. Check environment variables are set correctly
2. Verify Access Key ID starts with `AKIA`
3. Ensure no extra whitespace in values
4. Restart the core-service after changes

### Issue: "Access Denied"

**Cause**: IAM policy missing permissions

**Solution**:
1. Go to IAM → Users → your user → Permissions
2. Verify `SustainProS3UploadPolicy` is attached
3. Check policy includes correct bucket ARN

### Issue: "Bucket not found"

**Cause**: Bucket name mismatch or bucket in different region

**Solution**:
1. Verify `AWS_S3_BUCKET` matches exactly
2. Check bucket exists in the specified `AWS_REGION`
3. Bucket names are case-sensitive

### Issue: Images not loading (CORS error)

**Cause**: CORS not configured for your domain

**Solution**:
1. Go to S3 → Bucket → Permissions → CORS
2. Add your production domain to AllowedOrigins
3. Include both with and without `www.`

### Issue: Images return 403 Forbidden

**Cause**: Bucket policy not allowing public read

**Solution**:
1. Go to S3 → Bucket → Permissions → Bucket policy
2. Add the public read policy from Step 1
3. Ensure "Block public access" is disabled for GetObject

---

## Best Practices

### Security

1. **Never commit credentials** to version control
2. Use **environment variables** for all secrets
3. Create **dedicated IAM user** with minimal permissions
4. Enable **MFA** on AWS root account
5. Rotate access keys periodically

### Performance

1. Use **CloudFront CDN** for faster global delivery (optional)
2. Set **Cache-Control headers** (already configured in code)
3. Use appropriate **image compression** before upload

### Cost Optimization

1. Monitor usage in **AWS Cost Explorer**
2. Set up **billing alerts** for unexpected charges
3. Use **S3 Intelligent-Tiering** for infrequently accessed files
4. Clean up unused files periodically

### Folder Structure

The system uses this folder structure:

| Folder | Purpose |
|--------|---------|
| `services/` | Service template images |
| `organizations/{org_id}/` | Organization-specific files |
| `devices/` | Device photos |
| `events/` | Event banners and images |
| `general/` | Miscellaneous uploads |

---

## Migration: Local to S3

If you have existing files in local storage:

1. Set up S3 with the steps above
2. Run migration script (if needed):

```bash
# From project root
cd services/core-service
npx ts-node scripts/migrate-local-to-s3.ts
```

This will:
- Scan local `uploads/` folder
- Upload files to S3 with same structure
- Update database URLs (if applicable)

---

## Support

For issues:
1. Check server logs for detailed error messages
2. Use `/api/v1/admin/storage-status` endpoint
3. Verify AWS Console shows successful uploads
4. Check IAM policy and bucket permissions

