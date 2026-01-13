# SustainPro Notification Service

A centralized notification service that handles all email, SMS, and push notifications for the SustainPro platform using RabbitMQ for message queuing.

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Auth Service   │────▶│    RabbitMQ      │────▶│ Notification Service │
│  Core Service   │     │ (Message Queue)  │     │    - Email           │
│  IoT Service    │     │                  │     │    - SMS (future)    │
│  Other Services │     │                  │     │    - Push (future)   │
└─────────────────┘     └──────────────────┘     └──────────────────────┘
                                                          │
                                                          ▼
                                                 ┌────────────────┐
                                                 │  SMTP Server   │
                                                 │  (Ethereal/    │
                                                 │   Real SMTP)   │
                                                 └────────────────┘
```

## 🚀 Quick Start

### 1. Start the Service

```bash
cd services/notification-service
npm run dev
```

The service will start on **port 5003**.

### 2. View API Documentation

Open: http://localhost:5003/api/v1/docs

## 📧 API Endpoints

### Health & Status

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/notifications/health` | GET | Health check |
| `/api/v1/notifications/status` | GET | Detailed service status |

### Email Sending

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/notifications/email/send` | POST | Send email directly (synchronous) |
| `/api/v1/notifications/email/queue` | POST | Queue email via RabbitMQ (async) |
| `/api/v1/notifications/otp` | POST | Send OTP verification email |

## 📝 API Examples

### 1. Send OTP Email

**Best for:** Login 2FA, password reset, email verification

```bash
POST /api/v1/notifications/otp
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "purpose": "login_2fa",       # Options: login_2fa, password_reset, email_verification, phone_verification
  "recipientName": "John Doe",   # Optional
  "expiryMinutes": 10            # Optional, defaults to 10
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP email queued"
}
```

### 2. Send Direct Email with Template

**Best for:** Immediate delivery, testing

```bash
POST /api/v1/notifications/email/send
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Your Subject",
  "template": "otp",           # Options: otp, password_changed, 2fa_status, welcome, alert
  "templateData": {
    "code": "654321",
    "purpose": "password_reset",
    "recipientName": "John"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "<abc123@sustainpro.io>",
  "previewUrl": "https://ethereal.email/message/..."  // Only in test mode
}
```

### 3. Send Direct Email with Custom HTML

```bash
POST /api/v1/notifications/email/send
Content-Type: application/json

{
  "to": "user@example.com",
  "subject": "Custom Email",
  "html": "<h1>Hello!</h1><p>This is a custom email.</p>",
  "text": "Hello! This is a custom email."
}
```

### 4. Queue Email via RabbitMQ

**Best for:** High-volume, async processing, guaranteed delivery

```bash
POST /api/v1/notifications/email/queue
Content-Type: application/json

{
  "to": "user@example.com",
  "type": "welcome",           # Determines template
  "recipientName": "John",
  "loginUrl": "https://app.sustainpro.io/login"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email queued successfully",
  "routingKey": "notification.email.welcome"
}
```

## 📋 Available Templates

| Template | Purpose | Required Data |
|----------|---------|---------------|
| `otp` | Verification codes | `code`, `purpose` |
| `password_changed` | Password change confirmation | `recipientName` (optional) |
| `2fa_status` | 2FA enabled/disabled | `enabled` (boolean), `recipientName` |
| `welcome` | New user welcome | `recipientName`, `loginUrl` |
| `alert` | System alerts | `title`, `message`, `severity` |

## 🔧 Environment Configuration

```env
# Server
PORT=5003
NODE_ENV=development

# RabbitMQ
RABBITMQ_URL=amqp://sustainpro:sustainpro_dev@localhost:5672
RABBITMQ_ENABLED=true

# SMTP (Leave empty for Ethereal test mode)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=

# Email Settings
EMAIL_FROM_NAME=SustainPro
EMAIL_FROM_ADDRESS=noreply@sustainpro.io
```

### Test Mode (Ethereal)

When `SMTP_USER` and `SMTP_PASSWORD` are empty, the service automatically creates an Ethereal test account. Emails are captured but **not delivered**. You can view sent emails at https://ethereal.email.

### Production SMTP

For real email delivery, configure:
- **Gmail**: Use App Password (not regular password)
- **SendGrid/Mailgun/SES**: Use API credentials
- **Custom SMTP**: Use your mail server credentials

## 🔌 Integration with Other Services

### From Auth Service (Already Integrated)

The auth service uses the shared `publishNotification` utility to send notifications via RabbitMQ:

```typescript
import { publishNotification } from '@sustainpro/shared-utils';

// Send OTP for 2FA login
await publishNotification({
    type: 'otp',
    to: user.email,
    data: {
        code: '123456',
        purpose: 'login_2fa',
        userName: user.full_name,
        expiryMinutes: 10
    },
    metadata: { userId: user.id, source: 'auth-service' }
});
```

### From Any Service (Using RabbitMQ)

1. **Add dependency:**
```bash
npm install amqplib
```

2. **Initialize publisher in server.ts:**
```typescript
import { initNotificationPublisher } from '@sustainpro/shared-utils';

await initNotificationPublisher({
    url: process.env.RABBITMQ_URL,
    enabled: true
});
```

3. **Publish notifications:**
```typescript
import { publishNotification } from '@sustainpro/shared-utils';

// Send password changed notification
await publishNotification({
    type: 'password_changed',
    to: user.email,
    data: { userName: user.full_name },
    metadata: { userId: user.id, source: 'your-service' }
});
```

### From Frontend/External (Using HTTP API)

```typescript
// Direct API call
const response = await fetch('http://localhost:5003/api/v1/notifications/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'user@example.com',
        code: '123456',
        purpose: 'email_verification'
    })
});
```

## 📊 Message Flow

### Async (Recommended for Production)

```
1. Service publishes to RabbitMQ exchange (sustainpro.notifications)
2. Notification Service consumes from queue (notifications.email)
3. Email is processed and sent via SMTP
4. Failed emails go to Dead Letter Queue for retry
```

### Sync (For Testing/Immediate)

```
1. HTTP POST to /api/v1/notifications/email/send
2. Email is sent immediately via SMTP
3. Response includes messageId and previewUrl (test mode)
```

## 🔒 RabbitMQ Exchange & Queues

| Exchange | Type | Description |
|----------|------|-------------|
| `sustainpro.notifications` | topic | Main notification exchange |
| `sustainpro.notifications.dlx` | direct | Dead letter exchange |

| Queue | Routing Key Pattern | Description |
|-------|---------------------|-------------|
| `notifications.email` | `notification.email.*` | Email notifications |
| `notifications.sms` | `notification.sms.*` | SMS (future) |
| `notifications.push` | `notification.push.*` | Push notifications (future) |
| `notifications.email.failed` | `email.failed` | Failed emails (DLQ) |

## 🧪 Testing

### Test with Ethereal (Development)

1. Start service without SMTP credentials
2. Send a test email via API
3. Check logs for Ethereal preview URL
4. View email at https://ethereal.email

### Test with Real Email

1. Configure SMTP credentials in `.env`
2. Restart service
3. Send email to your address

## 📁 Project Structure

```
services/notification-service/
├── src/
│   ├── config/
│   │   └── index.ts          # Configuration
│   ├── controllers/
│   │   └── notification.controller.ts
│   ├── handlers/
│   │   └── notification.handler.ts
│   ├── messaging/
│   │   └── consumer.ts       # RabbitMQ consumer
│   ├── routes/
│   │   └── notification.routes.ts
│   ├── services/
│   │   └── email.service.ts  # Email sending logic
│   ├── templates/
│   │   └── email.templates.ts # HTML email templates
│   ├── app.ts
│   └── server.ts
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

## 🚨 Troubleshooting

### Email not being sent
1. Check SMTP credentials in `.env`
2. Check logs for error messages
3. Verify RabbitMQ is running: `docker ps | grep rabbitmq`

### RabbitMQ connection failed
1. Verify RabbitMQ is running
2. Check credentials: `sustainpro:sustainpro_dev`
3. Verify port 5672 is accessible

### Template errors
1. Ensure required fields are provided
2. Check `purpose` is one of: `login_2fa`, `password_reset`, `email_verification`, `phone_verification`

## 📈 Future Enhancements

- [ ] SMS notifications (Twilio integration)
- [ ] Push notifications (Firebase/OneSignal)
- [ ] Email scheduling
- [ ] Notification preferences per user
- [ ] Delivery status tracking
- [ ] Email analytics
