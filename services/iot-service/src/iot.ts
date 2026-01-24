// AWS IoT Core MQTT Subscriber for Water Wall Monitor
// TypeScript version

import awsIot from 'aws-iot-device-sdk';
import path from 'path';

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

const config: IotConfig = {
  host: 'a3a0yoo2557wbr-ats.iot.me-central-1.amazonaws.com',
  region: 'me-central-1',

  keyPath: path.join(__dirname, 'certificates', 'private.pem.key'),
  certPath: path.join(__dirname, 'certificates', 'certificate.pem.crt'),
  caPath: path.join(__dirname, 'certificates', 'AmazonRootCA1.pem'),

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
      const timestamp = new Date().toISOString();

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📥 Message Received at ${timestamp}`);
      console.log(`📍 Topic: ${topic}`);

      const topicParts = topic.split('/');
      if (topicParts.length > 1) {
        console.log('📂 Topic Structure:');
        if (topicParts[1]) console.log(`   Organization ID: ${topicParts[1]}`);
        if (topicParts[2]) console.log(`   Event ID: ${topicParts[2]}`);
        if (topicParts[3]) console.log(`   Department ID: ${topicParts[3]}`);
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
      }

      console.log(`\n⏰ Device Timestamp: ${message.timestamp}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      processData(message);
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

// ============================================================
// DATA PROCESSING
// ============================================================

function processData(message: TelemetryMessage): void {
  if (message.data && message.data.flow_rate > 2.5) {
    console.log('⚠️ WARNING: High flow rate detected!');
  }

  // saveToDatabase(message)
  // triggerAlerts(message)
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
