// AWS IoT Core MQTT Subscriber for Water Wall Monitor
// TypeScript version

import awsIot from 'aws-iot-device-sdk';
import path from 'path';
import { emitTelemetry, emitDashboardStats } from './socket'
import { ruleEngineService } from './services/rule-engine.service';
import { LiveDataEntry } from './services/live-data.service';

// ============================================================
// TYPES
// ============================================================

// 12: interface TelemetryData {
// 13:   flow_rate: number;
// 14:   total_liters: number;
// 15:   bottles_avoided: number;
// 16:   co2_saved: number;
// 17:   wifi_strength: number;
// 18: }

type TelemetryData = Record<string, any>;

interface TelemetryMessage {
  hardware_id: string;
  device_code: string;
  organization_id: string;
  data?: TelemetryData;
  timestamp: string;
}

interface IotConfig {
  host: string;
  region: string;
  keyPath: string;
  certPath: string;
  caPath: string;
  clientId: string;
  topic: string;
  cmdTopic: string;
}

// ============================================================
// CONFIGURATION
// ============================================================

const isProduction = process.env.NODE_ENV === 'production';
const baseDir = isProduction ? 'dist' : 'src';

const config: IotConfig = {
  host: 'a3a0yoo2557wbr-ats.iot.me-central-1.amazonaws.com',
  region: 'me-central-1',

  keyPath: path.join(process.cwd(), baseDir, 'certificates', 'private.pem.key'),
  certPath: path.join(process.cwd(), baseDir, 'certificates', 'certificate.pem.crt'),
  caPath: path.join(process.cwd(), baseDir, 'certificates', 'AmazonRootCA1.pem'),

  clientId: `NodeJS_Subscriber_${Math.random().toString(16).slice(2, 8)}`,

  topic: 'sustainpro/#',

  cmdTopic:
    'sustainpro/5ceaf041-d66d-4805-8d70-c7bf5cfade94/deb075e0-4114-4bc6-8059-ea9a24b7aae0/f06a81ce-dc1b-4ccf-a603-f4384fb23d94/cmd',
};

// ============================================================
// CREATE MQTT CONNECTION
// ============================================================

let device: awsIot.device;

export function startIotSubscriber() {
  console.log('🔌 Connecting to AWS IoT Core...');
  console.log(`📡 Endpoint: ${config.host}`);
  console.log(`🆔 Client ID: ${config.clientId}`);

  device = new awsIot.device({
    keyPath: config.keyPath,
    certPath: config.certPath,
    caPath: config.caPath,
    clientId: config.clientId,
    host: config.host,
    region: config.region,
  });

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  device.on('connect', () => {
    console.log('✅ Connected to AWS IoT Core!');
    console.log(`📥 Subscribing to topic: ${config.topic}`);

    device.subscribe(config.topic, undefined, (err?: Error) => {
      if (err) {
        console.error('❌ Subscription error:', err);
      } else {
        console.log('✅ Subscribed to telemetry data');
      }
    });

    device.subscribe(config.cmdTopic, undefined, () => {
      console.log(`✅ Subscribed to command topic: ${config.cmdTopic}`);
    });
  });

  device.on('message', (topic: string, payload: Buffer) => {
    try {
      const message = JSON.parse(payload.toString()) as TelemetryMessage;
      handleMessage(topic, message);
    } catch (err) {
      console.error('❌ Error parsing message:', err);
      console.log('Raw payload:', payload.toString());
    }
  });

  device.on('error', (error: string | Error) => {
    console.error('❌ Connection error:', error);
  });

  device.on('close', () => console.log('🔌 Connection closed'));
  device.on('reconnect', () => console.log('🔄 Reconnecting...'));
  device.on('offline', () => console.log('📴 Device offline'));
}

export function injectSimulatedMessage(topic: string, message: TelemetryMessage) {
  console.log('🧪 Injecting Simulated Message...');
  handleMessage(topic, message);
}

async function handleMessage(topic: string, message: TelemetryMessage) {
  const timestamp = new Date().toISOString();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📥 Message Received at ${timestamp}`);
  console.log(`📍 Topic: ${topic}`);

  let topicEventId: string | undefined;
  let topicDeptId: string | undefined;

  const topicParts = topic.split('/');
  if (topicParts.length > 1) {
    console.log('📂 Topic Structure:');
    if (topicParts[1]) console.log(`   Organization ID: ${topicParts[1]}`);
    if (topicParts[2]) {
      console.log(`   Event ID: ${topicParts[2]}`);
      topicEventId = topicParts[2];
    }
    if (topicParts[3]) {
      console.log(`   Department ID: ${topicParts[3]}`);
      topicDeptId = topicParts[3];
    }
  }

  console.log('\n🔧 Device Information:');
  console.log(`   Hardware ID: ${message.hardware_id}`);
  console.log(`   Device Code: ${message.device_code}`);
  console.log(`   Organization: ${message.organization_id}`);

  // 1. Get Device Metadata EARLY (for correct Socket emission)
  let deviceMetadata: any = null;
  try {
    const deviceRes = await query(
      `SELECT 
            d.id, 
            d.service_id, 
            d.event_id, 
            d.organization_id, 
            ds.department_id 
           FROM sps_devices d
           LEFT JOIN sps_department_services ds ON d.service_id = ds.id
           WHERE d.device_code = $1`,
      [message.device_code]
    );
    if (deviceRes.rows.length > 0) {
      deviceMetadata = deviceRes.rows[0];
    } else {
      console.warn(`⚠️ Device not found for code: ${message.device_code}.`);
    }
  } catch (err) {
    console.error('❌ Failed to fetch device metadata:', err);
  }

  if (message.data) {
    console.log('\n� Telemetry Data Received:');
    Object.entries(message.data).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    let data: TelemetryData = message.data;

    // Use DB metadata if available, otherwise fall back to topic/message
    const finalOrgId = message.organization_id || deviceMetadata?.organization_id;
    const finalEventId = topicEventId || deviceMetadata?.event_id;
    const finalDeptId = topicDeptId || deviceMetadata?.department_id;
    const finalServiceId = deviceMetadata?.service_id;
    const finalDeviceId = deviceMetadata?.id ? String(deviceMetadata.id) : undefined;

    emitTelemetry({
      device_code: message.device_code,
      device_id: finalDeviceId,
      organization_id: finalOrgId,
      event_id: finalEventId,
      department_id: finalDeptId,
      service_id: finalServiceId, // NEW: Emit to service room
      timestamp: new Date(),
      data,
      status: 'online',
    });

    console.log('\n📨 Emitted telemetry data to Socket.IO clients.');
  }

  console.log(`\n⏰ Device Timestamp: ${message.timestamp}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  processData(message, topicEventId, topicDeptId, deviceMetadata);
}

// ============================================================
// DATA PROCESSING - with Queue for 100+ devices optimization
// ============================================================

import { query } from './db';

// ============================================================
// MESSAGE QUEUE FOR RULE ENGINE (Handles 100+ devices)
// ============================================================

interface QueuedMessage {
  liveData: LiveDataEntry;
  addedAt: number;
}

// Queue for batching rule engine evaluations
const ruleEngineQueue: QueuedMessage[] = [];
const QUEUE_FLUSH_INTERVAL = 500; // Flush every 500ms
const MAX_QUEUE_SIZE = 100; // Max items before forced flush
const CONCURRENT_EVALUATIONS = 10; // Max concurrent rule evaluations
let isProcessingQueue = false;
let queueFlushTimer: NodeJS.Timeout | null = null;

/**
 * Queue a message for rule engine processing
 * This prevents overload when 100+ devices send data simultaneously
 */
function queueForRuleEngine(liveData: LiveDataEntry): void {
  ruleEngineQueue.push({
    liveData,
    addedAt: Date.now(),
  });

  // Force flush if queue is too large
  if (ruleEngineQueue.length >= MAX_QUEUE_SIZE) {
    processRuleEngineQueue();
    return;
  }

  // Schedule flush if not already scheduled
  if (!queueFlushTimer) {
    queueFlushTimer = setTimeout(() => {
      queueFlushTimer = null;
      processRuleEngineQueue();
    }, QUEUE_FLUSH_INTERVAL);
  }
}

/**
 * Process the rule engine queue in batches
 */
async function processRuleEngineQueue(): Promise<void> {
  if (isProcessingQueue || ruleEngineQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  try {
    // Take items from queue
    const itemsToProcess = ruleEngineQueue.splice(0, MAX_QUEUE_SIZE);

    if (itemsToProcess.length === 0) {
      return;
    }

    console.log(`📊 Processing ${itemsToProcess.length} queued messages for rule engine...`);

    // Process in parallel batches with concurrency limit
    for (let i = 0; i < itemsToProcess.length; i += CONCURRENT_EVALUATIONS) {
      const batch = itemsToProcess.slice(i, i + CONCURRENT_EVALUATIONS);

      await Promise.allSettled(
        batch.map(item =>
          ruleEngineService.evaluate(item.liveData).catch((err) => {
            console.error('❌ Error executing rule engine:', err);
          })
        )
      );
    }

    console.log(`✅ Processed ${itemsToProcess.length} messages through rule engine`);

  } catch (err: any) {
    console.error('Error processing rule engine queue:', err);
  } finally {
    isProcessingQueue = false;

    // If more items were added during processing, schedule another flush
    if (ruleEngineQueue.length > 0) {
      setTimeout(processRuleEngineQueue, 100);
    }
  }
}

// ============================================================
// MAIN DATA PROCESSOR
// ============================================================

function processData(message: TelemetryMessage, topicEventId?: string, topicDeptId?: string, deviceMetadata?: any): void {
  // Save to database (non-blocking)
  saveToDatabase(message, topicEventId, topicDeptId, deviceMetadata).catch(err => {
    console.error('❌ Failed to save telemetry to DB:', err);
  });

  // Queue rule evaluation (optimized for 100+ devices)
  if (deviceMetadata && message.data) {
    const liveData: LiveDataEntry = {
      device_id: deviceMetadata.id,
      device_code: message.device_code,
      organization_id: message.organization_id || deviceMetadata.organization_id,
      event_id: topicEventId || deviceMetadata.event_id,
      service_id: deviceMetadata.service_id,
      data: message.data,
      timestamp: message.timestamp
        ? (typeof message.timestamp === 'number'
          ? new Date(message.timestamp * (Number(message.timestamp) < 10000000000 ? 1000 : 1))
          : new Date(message.timestamp))
        : new Date(),
      status: 'online',
    };

    // Add to queue instead of direct evaluation
    queueForRuleEngine(liveData);
  }
}

async function saveToDatabase(message: TelemetryMessage, topicEventId?: string, topicDeptId?: string, deviceMetadata?: any) {
  try {
    let device = deviceMetadata;

    // If metadata wasn't passed (e.g. called from elsewhere), fetch it now
    if (!device) {
      const deviceRes = await query(
        `SELECT 
           d.id, 
           d.service_id, 
           d.event_id, 
           d.organization_id 
         FROM sps_devices d
         WHERE d.device_code = $1`,
        [message.device_code]
      );

      if (deviceRes.rows.length === 0) {
        console.warn(`⚠️ Device not found for code: ${message.device_code}. Skipping DB save.`);
        return;
      }
      device = deviceRes.rows[0];
    }

    // 2. Insert Telemetry
    await query(
      `INSERT INTO sps_telemetry 
            (device_id, device_code, organization_id, event_id, service_id, data, recorded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        device.id,
        message.device_code,
        message.organization_id || device.organization_id, // Prefer message/topic org
        topicEventId || device.event_id,         // Prefer topic event
        device.service_id,       // From DB
        JSON.stringify(message.data),
        message.timestamp ?
          (typeof message.timestamp === 'number'
            // Handle Unix timestamp (check if seconds or milliseconds)
            ? new Date(message.timestamp * (Number(message.timestamp) < 10000000000 ? 1000 : 1)).toISOString()
            : new Date(message.timestamp).toISOString() // Handle string
          )
          : new Date().toISOString()
      ]
    );

    console.log('💾 Saved telemetry to database');

    // 3. Update Device Status & Last Seen
    await query(
      `UPDATE sps_devices 
       SET status = 'ONLINE', 
           last_seen = $1,
           metadata = metadata || $2::jsonb
       WHERE id = $3`,
      [
        new Date().toISOString(),
        JSON.stringify(message.data || {}),
        device.id
      ]
    );
    console.log('🔄 Updated device status to ONLINE');

  } catch (error) {
    console.error('Error in saveToDatabase:', error);
    throw error;
  }
}

// ============================================================
// COMMAND FUNCTIONS
// ============================================================

interface CommandPayload {
  cmd: string;
  params?: Record<string, unknown>;
  timestamp: number;
}

function sendCommand(cmd: string, params: Record<string, unknown> = {}): void {
  if (!device) {
    console.error('❌ Cannot send command: Device not initialized');
    return;
  }

  const command: CommandPayload = {
    cmd,
    params,
    timestamp: Math.floor(Date.now() / 1000),
  };

  console.log(`📤 Sending command: ${cmd}`);
  device.publish(config.cmdTopic, JSON.stringify(command));
}

export function startSession() {
  sendCommand('START_SESSION');
}

export function stopSession() {
  sendCommand('STOP_SESSION');
}

export function setReportInterval(intervalSeconds: number) {
  sendCommand('SET_INTERVAL', { interval: intervalSeconds });
}

export function rebootDevice() {
  sendCommand('REBOOT');
}

export { device };
