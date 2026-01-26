// AWS IoT Core MQTT Subscriber for Water Wall Monitor
// TypeScript version

import awsIot from 'aws-iot-device-sdk';
import path from 'path';
import { emitTelemetry, emitDashboardStats } from './socket'

// ============================================================
// TYPES
// ============================================================

interface TelemetryData {
  flow_rate: number;
  total_liters: number;
  bottles_avoided: number;
  co2_saved: number;
  wifi_strength: number;
}

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

function handleMessage(topic: string, message: TelemetryMessage) {
  const timestamp = new Date().toISOString();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📥 Message Received at ${timestamp}`);
  console.log(`📍 Topic: ${topic}`);

  let eventId: string | undefined;
  let departmentId: string | undefined;

  const topicParts = topic.split('/');
  if (topicParts.length > 1) {
    console.log('📂 Topic Structure:');
    if (topicParts[1]) console.log(`   Organization ID: ${topicParts[1]}`);
    if (topicParts[2]) {
      console.log(`   Event ID: ${topicParts[2]}`);
      eventId = topicParts[2];
    }
    if (topicParts[3]) {
      console.log(`   Department ID: ${topicParts[3]}`);
      departmentId = topicParts[3];
    }
  }

  console.log('\n🔧 Device Information:');
  console.log(`   Hardware ID: ${message.hardware_id}`);
  console.log(`   Device Code: ${message.device_code}`);
  console.log(`   Organization: ${message.organization_id}`);

  if (message.data) {
    console.log('\n💧 Water Wall Data:');
    console.log(`   Flow Rate: ${message.data.flow_rate} L/min`);
    console.log(`   Total Liters: ${message.data.total_liters.toFixed(2)} L`);
    console.log(`   Bottles Avoided: ${message.data.bottles_avoided}`);
    console.log(`   CO₂ Saved: ${message.data.co2_saved.toFixed(3)} kg`);
    console.log(`   WiFi Strength: ${message.data.wifi_strength} dBm`);
    let data: TelemetryData = message.data;

    emitTelemetry({
      device_code: message.device_code,
      device_id: String(1), // TODO: Look up device ID from DB if needed
      organization_id: message.organization_id,
      event_id: eventId,
      department_id: departmentId,
      timestamp: new Date(),
      data,
      status: 'online',
    });

    console.log('\n📨 Emitted telemetry data to Socket.IO clients.');

  }

  console.log(`\n⏰ Device Timestamp: ${message.timestamp}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  processData(message, eventId, departmentId);
}

// ============================================================
// DATA PROCESSING
// ============================================================

import { query } from './db';

// ... (existing imports)

function processData(message: TelemetryMessage, topicEventId?: string, topicDeptId?: string): void {
  if (message.data && message.data.flow_rate > 2.5) {
    console.log('⚠️ WARNING: High flow rate detected!');
  }

  saveToDatabase(message, topicEventId, topicDeptId).catch(err => {
    console.error('❌ Failed to save telemetry to DB:', err);
  });

  // triggerAlerts(message)
}

async function saveToDatabase(message: TelemetryMessage, topicEventId?: string, topicDeptId?: string) {
  try {
    // 1. Get Device Metadata (ID, Service, Event)
    // We use device_code as the lookup key
    const deviceRes = await query(
      'SELECT id, service_id, event_id, organization_id FROM sps_devices WHERE device_code = $1',
      [message.device_code]
    );

    if (deviceRes.rows.length === 0) {
      console.warn(`⚠️ Device not found for code: ${message.device_code}. Skipping DB save.`);
      return;
    }

    const device = deviceRes.rows[0];

    // Use incoming IDs if available in topic, else fall back to device's provisioned IDs
    // Note: message.organization_id comes from topic/payload usually

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
        message.timestamp || new Date().toISOString()
      ]
    );

    console.log('💾 Saved telemetry to database');

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
