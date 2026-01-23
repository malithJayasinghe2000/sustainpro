const iot = require('aws-iot-device-sdk-v2');
const mqtt = require('aws-iot-device-sdk-v2').mqtt;
const io = require('aws-iot-device-sdk-v2').io;

async function connectAndSubscribe() {
  // Configuration
  const config = {
    endpoint: 'a3a0yoo2557wbr-ats.iot.me-central-1.amazonaws.com', // e.g., xxxxx-ats.iot.us-east-1.amazonaws.com
    certPath: './certificates/certificate.pem.crt',
    keyPath: './certificates/private.pem.key',
    caPath: './certificates/AmazonRootCA1.pem',
    clientId: 'myNodeClient-' + Math.floor(Math.random() * 100000),
    topic: 'my/topic' // Change to your topic
  };

  try {
    // Create MQTT connection configuration
    const clientBootstrap = new io.ClientBootstrap();
    
    const configBuilder = iot.AwsIotMqttConnectionConfigBuilder.new_mtls_builder_from_path(
      config.certPath,
      config.keyPath
    );
    
    configBuilder.with_certificate_authority_from_path(undefined, config.caPath);
    configBuilder.with_clean_session(false);
    configBuilder.with_client_id(config.clientId);
    configBuilder.with_endpoint(config.endpoint);
    
    const mqttConfig = configBuilder.build();
    
    // Create MQTT client
    const client = new mqtt.MqttClient(clientBootstrap);
    const connection = client.new_connection(mqttConfig);
    
    // Connect
    console.log('Connecting to AWS IoT Core...');
    await connection.connect();
    console.log('Connected successfully!');
    
    // Subscribe to topic
    console.log(`Subscribing to topic: ${config.topic}`);
    await connection.subscribe(
      config.topic,
      mqtt.QoS.AtLeastOnce,
      (topic, payload) => {
        const message = new TextDecoder('utf-8').decode(payload);
        console.log('\n--- Message Received ---');
        console.log('Topic:', topic);
        console.log('Message:', message);
        
        // Try to parse as JSON
        try {
          const data = JSON.parse(message);
          console.log('Parsed Data:', JSON.stringify(data, null, 2));
        } catch (e) {
          console.log('Raw Data:', message);
        }
        console.log('------------------------\n');
      }
    );
    
    console.log('Waiting for messages... (Press Ctrl+C to exit)');
    
    // Keep the connection alive
    process.on('SIGINT', async () => {
      console.log('\nDisconnecting...');
      await connection.disconnect();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the connection
connectAndSubscribe();