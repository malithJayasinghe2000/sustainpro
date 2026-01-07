# RabbitMQ Event-Driven Architecture

## 📨 What is RabbitMQ?

RabbitMQ is a **message broker** that enables **asynchronous communication** between microservices. Instead of services calling each other directly (tight coupling), they publish events to RabbitMQ and subscribe to events they're interested in.

## 🎯 Why We Use RabbitMQ

### 1. **Decoupling Services**
Services don't need to know about each other. They only need to know about events.

**Without RabbitMQ:**
```
Core Service -> (HTTP) -> Auth Service
Core Service -> (HTTP) -> Notification Service  
Core Service -> (HTTP) -> Analytics Service
```
If any service is down, the request fails.

**With RabbitMQ:**
```
Core Service -> RabbitMQ -> Auth Service
                        -> Notification Service
                        -> Analytics Service
```
Core service publishes the event and continues. Other services process it when ready.

### 2. **Reliability**
- Messages are **persisted** to disk
- If a service crashes, messages wait in the queue
- **Dead Letter Exchanges** handle failed messages

### 3. **Scalability**
- Multiple instances of a service can consume from the same queue (load balancing)
- Add new consumers without changing publishers

### 4. **Asynchronous Processing**
- Long-running tasks don't block API responses
- Example: Sending 1000 notifications after an event is created

## 🏗️ SustainPro RabbitMQ Architecture

### Exchanges

| Exchange | Type | Purpose |
|----------|------|---------|
| `sustainpro.events` | topic | Device lifecycle events |
| `sustainpro.telemetry` | direct | Telemetry data routing |
| `sustainpro.alerts` | fanout | System-wide alerts |
| `sustainpro.dlx` | direct | Dead letter exchange |

### Queues

| Queue | TTL | Dead Letter | Priority |
|-------|-----|-------------|----------|
| `device.events` | 24h | Yes | - |
| `telemetry.raw` | 1h | Yes | - |
| `telemetry.processed` | 24h | No | - |
| `alerts` | 7d | No | 10 |
| `notifications` | 24h | No | - |

### Event Routing

```
┌─────────────────┐
│  Core Service   │
└────────┬────────┘
         │ publishes "organization.created"
         ▼
┌─────────────────────────────┐
│ sustainpro.events (Exchange)│
└────────┬────────────────────┘
         │ routing key: "organization.*"
         ▼
┌────────────────┐
│ device.events  │ ◄── Auth Service subscribes
│    (Queue)     │ ◄── Analytics Service subscribes
└────────────────┘
```

## 📝 Event Types

### Core Service Events
- `organization.created`
- `organization.updated`
- `organization.deleted`
- `event.created`
- `event.started`
- `event.stopped`
- `event.archived`
- `department.created`
- `department.updated`
- `department.deleted`

### IoT Service Events
- `device.registered`
- `device.connected`
- `device.disconnected`
- `telemetry.received`
- `alert.triggered`

## 💻 Code Examples

### Publishing an Event (Core Service)

```typescript
// services/core-service/src/messaging/publisher.ts
import { publishEvent } from './messaging/publisher';

// When an organization is created
await publishEvent('organization.created', {
  organizationId: org.id,
  name: org.name,
  createdBy: userId,
  timestamp: new Date().toISOString()
});
```

### Subscribing to Events (Future: Notification Service)

```typescript
// services/notification-service/src/messaging/consumer.ts
import amqplib from 'amqplib';

const connection = await amqplib.connect(process.env.RABBITMQ_URL);
const channel = await connection.createChannel();

// Subscribe to organization events
await channel.assertQueue('notifications');
await channel.bindQueue('notifications', 'sustainpro.events', 'organization.*');

channel.consume('notifications', (msg) => {
  if (msg) {
    const event = JSON.parse(msg.content.toString());
    console.log('Received event:', event);
    
    // Send notification to admins
    await sendEmailNotification(event);
    
    // Acknowledge message
    channel.ack(msg);
  }
});
```

## 🔧 Configuration

### Default Credentials
- **User**: sustainpro
- **Password**: sustainpro_dev
- **Management UI**: http://localhost:15672

### Environment Variables

```bash
RABBITMQ_URL=amqp://sustainpro:sustainpro_dev@localhost:5672
RABBITMQ_ENABLED=true
```

### Disable RabbitMQ (Development)

```bash
# In service .env file
RABBITMQ_ENABLED=false
```

Services will continue to work but events won't be published.

## 📊 Management UI

Access: http://localhost:15672

**Features:**
- View queues and message counts
- Monitor message rates
- Manually publish/consume messages
- View exchange bindings
- Track connection health

## 🎛️ Message Patterns

### 1. Topic Exchange (Pattern Matching)

```typescript
// Publisher
publishEvent('device.temperature.high', data);
publishEvent('device.temperature.normal', data);
publishEvent('device.battery.low', data);

// Subscriber patterns
'device.#'              // All device events
'device.temperature.*'  // Only temperature events
'device.*.high'         // All high severity events
```

### 2. Dead Letter Exchange (Error Handling)

If a message fails after 3 retries:
```
telemetry.raw -> (fails) -> sustainpro.dlx -> telemetry.raw.dead
```

Monitor dead letter queues for failed messages.

### 3. Priority Queues

```typescript
// High priority alert
channel.publish(
  'sustainpro.alerts',
  '',
  Buffer.from(JSON.stringify(alert)),
  { priority: 10 }  // 0-10, 10 is highest
);
```

## 🚀 Best Practices

### 1. Always Acknowledge Messages
```typescript
channel.consume('queue-name', async (msg) => {
  try {
    await processMessage(msg);
    channel.ack(msg);  // ✅ Success
  } catch (error) {
    channel.nack(msg, false, true);  // ❌ Retry
  }
});
```

### 2. Set Message TTL
Prevents old messages from piling up:
```javascript
{
  "x-message-ttl": 86400000,  // 24 hours
  "x-max-length": 10000       // Max 10k messages
}
```

### 3. Use Prefetch Limit
Prevents one consumer from taking all messages:
```typescript
channel.prefetch(10);  // Process max 10 messages at a time
```

### 4. Monitor Queue Depth
If a queue has 1000+ messages, scale up consumers.

## 🔮 Future Use Cases

### 1. Notification Service
- Subscribe to all `*.created` events
- Send email/SMS notifications to relevant users

### 2. Analytics Service
- Subscribe to telemetry events
- Aggregate data for dashboards
- Generate reports

### 3. Audit Log Service
- Subscribe to all events (`#`)
- Store in separate database for compliance

### 4. Webhook Service
- Subscribe to configured events
- POST to external URLs

### 5. Device Provisioning
- `device.registered` → Auto-provision AWS IoT Thing
- `device.deleted` → Clean up IoT resources

## 📚 Further Reading

- [RabbitMQ Official Docs](https://www.rabbitmq.com/documentation.html)
- [AMQP Protocol](https://www.rabbitmq.com/tutorials/amqp-concepts.html)
- [Exchange Types](https://www.rabbitmq.com/tutorials/amqp-concepts.html#exchanges)
- [Message TTL](https://www.rabbitmq.com/ttl.html)

## 🆘 Troubleshooting

### Service Won't Start
```bash
# Check RabbitMQ is running
docker-compose ps rabbitmq

# View logs
docker-compose logs rabbitmq
```

### Messages Not Being Consumed
1. Check queue bindings in Management UI
2. Verify routing keys match
3. Check consumer is connected

### High Memory Usage
1. Check queue message counts
2. Increase TTL to purge old messages
3. Scale up consumers

---

**💡 Key Takeaway**: RabbitMQ enables **loosely coupled**, **scalable**, **asynchronous** microservices. Services can publish events and forget about them, while subscribers process at their own pace.
