// AWS IoT Core MQTT Subscriber for Water Wall Monitor
// This receives real-time telemetry data from your ESP32 device

const awsIot = require('aws-iot-device-sdk');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURATION
// ============================================================
const config = {
  // Your AWS IoT endpoint (same as in Arduino code)
  host: 'a3a0yoo2557wbr-ats.iot.me-central-1.amazonaws.com',
  
  // AWS Region
  region: 'me-central-1',
  
  // Path to your certificates (you need to download these from AWS IoT)
  keyPath: path.join(__dirname, 'certs', 'private.pem.key'),
  certPath: path.join(__dirname, 'certs', 'certificate.pem.crt'),
  caPath: path.join(__dirname, 'certs', 'AmazonRootCA1.pem'),
  
  // Client ID (must be unique - can be anything)
  clientId: 'NodeJS_Subscriber_' + Math.random().toString(16).slice(2, 8),
  
  // MQTT Topic to subscribe to (use wildcard to catch all organizations/events/departments)
  topic: 'sustainpro/#',  // '#' wildcard subscribes to all sub-topics
  
  // Specific topic if you know your hierarchy:
  // topic: 'sustainpro/5ceaf041-d66d-4805-8d70-c7bf5cfade94/deb075e0-4114-4bc6-8059-ea9a24b7aae0/f06a81ce-dc1b-4ccf-a603-f4384fb23d94',
  
  // Command topic for sending commands
  cmdTopic: 'sustainpro/5ceaf041-d66d-4805-8d70-c7bf5cfade94/deb075e0-4114-4bc6-8059-ea9a24b7aae0/f06a81ce-dc1b-4ccf-a603-f4384fb23d94/cmd'
};

// ============================================================
// CREATE MQTT CONNECTION
// ============================================================
console.log('🔌 Connecting to AWS IoT Core...');
console.log(`📡 Endpoint: ${config.host}`);
console.log(`🆔 Client ID: ${config.clientId}`);

const device = awsIot.device({
  keyPath: config.keyPath,
  certPath: config.certPath,
  caPath: config.caPath,
  clientId: config.clientId,
  host: config.host,
  region: config.region
});

// ============================================================
// EVENT HANDLERS
// ============================================================

// Connection successful
device.on('connect', () => {
  console.log('✅ Connected to AWS IoT Core!');
  console.log(`📥 Subscribing to topic: ${config.topic}`);
  
  // Subscribe to telemetry topic
  device.subscribe(config.topic, (err) => {
    if (err) {
      console.error('❌ Subscription error:', err);
    } else {
      console.log('✅ Successfully subscribed to telemetry data');
      console.log('⏳ Waiting for messages...\n');
    }
  });
  
  // Also subscribe to command topic to see command confirmations
  device.subscribe(config.cmdTopic, (err) => {
    if (!err) {
      console.log(`✅ Subscribed to command topic: ${config.cmdTopic}\n`);
    }
  });
});

// Message received
device.on('message', (topic, payload) => {
  try {
    const message = JSON.parse(payload.toString());
    const timestamp = new Date().toISOString();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📥 Message Received at ${timestamp}`);
    console.log(`📍 Topic: ${topic}`);
    
    // Parse hierarchical topic structure
    const topicParts = topic.split('/');
    if (topicParts.length > 1) {
      console.log(`📂 Topic Structure:`);
      if (topicParts[1]) console.log(`   Organization ID: ${topicParts[1]}`);
      if (topicParts[2]) console.log(`   Event ID: ${topicParts[2]}`);
      if (topicParts[3]) console.log(`   Department ID: ${topicParts[3]}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Display device info
    console.log(`\n🔧 Device Information:`);
    console.log(`   Hardware ID: ${message.hardware_id}`);
    console.log(`   Device Code: ${message.device_code}`);
    console.log(`   Organization: ${message.organization_id}`);
    
    // Display sensor data
    if (message.data) {
      console.log(`\n💧 Water Wall Data:`);
      console.log(`   Flow Rate: ${message.data.flow_rate} L/min`);
      console.log(`   Total Liters: ${message.data.total_liters.toFixed(2)} L`);
      console.log(`   Bottles Avoided: ${message.data.bottles_avoided}`);
      console.log(`   CO₂ Saved: ${message.data.co2_saved.toFixed(3)} kg`);
      console.log(`   WiFi Strength: ${message.data.wifi_strength} dBm`);
    }
    
    console.log(`\n⏰ Device Timestamp: ${message.timestamp}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // You can process the data here - save to database, trigger alerts, etc.
    processData(message);
    
  } catch (error) {
    console.error('❌ Error parsing message:', error);
    console.log('Raw payload:', payload.toString());
  }
});

// Connection error
device.on('error', (error) => {
  console.error('❌ Connection error:', error);
});

// Connection closed
device.on('close', () => {
  console.log('🔌 Connection closed');
});

// Reconnecting
device.on('reconnect', () => {
  console.log('🔄 Reconnecting to AWS IoT...');
});

// Offline
device.on('offline', () => {
  console.log('📴 Device is offline');
});

// ============================================================
// DATA PROCESSING FUNCTION
// ============================================================
function processData(message) {
  // Example: Check if flow rate is abnormal
  if (message.data && message.data.flow_rate > 2.5) {
    console.log('⚠️  WARNING: High flow rate detected!');
  }
  
  // Example: Save to database (implement your own logic)
  // saveToDatabase(message);
  
  // Example: Trigger webhook or notification
  // sendNotification(message);
}

// ============================================================
// COMMAND FUNCTIONS
// ============================================================

// Send command to device
function sendCommand(cmd, params = {}) {
  const command = {
    cmd: cmd,
    params: params,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  console.log(`📤 Sending command: ${cmd}`);
  device.publish(config.cmdTopic, JSON.stringify(command), (err) => {
    if (err) {
      console.error('❌ Error sending command:', err);
    } else {
      console.log('✅ Command sent successfully');
    }
  });
}

// Example command functions
function startSession() {
  sendCommand('START_SESSION');
}

function stopSession() {
  sendCommand('STOP_SESSION');
}

function setReportInterval(intervalSeconds) {
  sendCommand('SET_INTERVAL', { interval: intervalSeconds });
}

function rebootDevice() {
  sendCommand('REBOOT');
}

// ============================================================
// EXPORT FUNCTIONS (if using as module)
// ============================================================
module.exports = {
  device,
  sendCommand,
  startSession,
  stopSession,
  setReportInterval,
  rebootDevice
};

// ============================================================
// EXAMPLE USAGE IN TERMINAL
// ============================================================
// Uncomment these to test sending commands:

// Wait 5 seconds after connection, then start session
// setTimeout(() => {
//   console.log('\n🎬 Starting session...');
//   startSession();
// }, 5000);

// Change reporting interval to 10 seconds
// setTimeout(() => {
//   console.log('\n⏱️  Changing report interval to 10 seconds...');
//   setReportInterval(10);
// }, 10000);

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  device.end();
  process.exit(0);
});