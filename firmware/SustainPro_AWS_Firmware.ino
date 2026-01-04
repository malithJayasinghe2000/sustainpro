#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h> // For saving WiFi Credentials & Org ID

// ============================================================
// 1. HARDWARE IDENTITY (Flashed at Factory - SECRET)
// ============================================================
// INSTRUCTIONS:
// 1. Create Thing & Policy in AWS. Match the HARDWARE_ID below.
// 2. Download Certs.
// 3. Paste Certs + HARDWARE_ID below.
// ============================================================

const char* AWS_IOT_ENDPOINT = "xxxxx-ats.iot.us-east-1.amazonaws.com";
const char* HARDWARE_ID = "WaterWall_x9k2m5"; // SECRET HARDWARE ID
const char* SERVICE_TYPE = "waterwall";       // Used for Provisioning Verification

// AWS Root CA 1 (Same for all devices)
const char* AWS_CERT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
... Download AmazonRootCA1.pem manually and paste here ...
-----END CERTIFICATE-----
)EOF";

// UNIQUE Device Certificate
const char* AWS_CERT_CRT = R"EOF(
-----BEGIN CERTIFICATE-----
... Paste UNIQUE xxxxx-certificate.pem.crt here ...
-----END CERTIFICATE-----
)EOF";

// UNIQUE Device Private Key
const char* AWS_CERT_PRIVATE = R"EOF(
-----BEGIN RSA PRIVATE KEY-----
... Paste UNIQUE xxxxx-private.pem.key here ...
-----END RSA PRIVATE KEY-----
)EOF";

// ============================================================
// 2. DYNAMIC CONFIG (Entered via WebSerial / Provisioning)
// ============================================================
char WIFI_SSID[32] = "";
char WIFI_PASS[64] = "";
char ORG_ID[50] = "";           // e.g. "uuid-123"

WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);
Preferences preferences;

void connectWiFi();
void connectAWS();
void publishTelemetry();

void setup() {
  Serial.begin(115200);
  
  // Load Dynamic Config (WiFi + Org only)
  preferences.begin("sps-config", true);
  String saved_ssid = preferences.getString("ssid", "");
  String saved_pass = preferences.getString("pass", "");
  String saved_org = preferences.getString("org", "DEFAULT_ORG");
  preferences.end();
  
  if(saved_ssid == "") {
    Serial.println("❌ No WiFi Configured! Waiting for WebSerial Provisioning...");
    Serial.println("👉 Send 'admin:identify' to verify device.");
  } else {
    // Use saved config
    strcpy(WIFI_SSID, saved_ssid.c_str());
    strcpy(WIFI_PASS, saved_pass.c_str());
    strcpy(ORG_ID, saved_org.c_str());
    
    connectWiFi();
    connectAWS();
  }
}

void checkSerial() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    
    // Command: Identify
    if (input == "admin:identify") {
      StaticJsonDocument<200> doc;
      doc["hw_id"] = HARDWARE_ID;
      doc["type"] = SERVICE_TYPE;
      serializeJson(doc, Serial);
      Serial.println(); // Newline for JSON parsing
    }
    
    // Command: Config
    // Format: admin:config {"ssid":"...","pass":"...","org":"..."}
    else if (input.startsWith("admin:config ")) {
        String jsonPart = input.substring(13); // Length of "admin:config "
        StaticJsonDocument<200> doc;
        DeserializationError error = deserializeJson(doc, jsonPart);
        
        if (error) {
            Serial.print("❌ JSON Error: ");
            Serial.println(error.c_str());
            return;
        }
        
        const char* ssid = doc["ssid"];
        const char* pass = doc["pass"];
        const char* org = doc["org"];
        
        if (ssid && pass && org) {
             preferences.begin("sps-config", false); // RW mode
             preferences.putString("ssid", ssid);
             preferences.putString("pass", pass);
             preferences.putString("org", org);
             preferences.end();
             
             Serial.println("✅ Config Saved! Rebooting...");
             delay(1000);
             ESP.restart();
        } else {
            Serial.println("❌ Missing fields in config JSON");
        }
    }
  }
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  Serial.println("Connecting to WiFi");
  Serial.println(WIFI_SSID);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    checkSerial(); // Allow re-provisioning loops if WiFi fails
  }

  Serial.println("");
  Serial.println("WiFi connected");
}

void connectAWS() {
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  client.setServer(AWS_IOT_ENDPOINT, 8883);

  Serial.println("Connecting to AWS IoT...");

  // IMPORTANT: Use unique HARDWARE_ID as Client ID
  if (client.connect(HARDWARE_ID)) { 
      Serial.println("✅ AWS IoT Connected!");
  } else {
      Serial.print("Failed. State: ");
      Serial.println(client.state());
      delay(2000);
    }
}

void loop() {
  checkSerial(); // Always listen for admin commands (even when online)
  
  if (WiFi.status() == WL_CONNECTED) {
      if (!client.connected()) {
        connectAWS();
      } else {
        client.loop();
        publishTelemetry();
        delay(5000); // Send every 5s
      }
  }
}

void publishTelemetry() {
  StaticJsonDocument<300> doc;
  
  // Send Hardware ID so backend knows who this is
  doc["hardware_id"] = HARDWARE_ID;
  doc["organization_id"] = ORG_ID;
  
  // Water Wall Real-World Sample Data
  static float total_liters = 1200.0; // Simulated accumulator
  
  float flow = random(15, 30) / 10.0; // 1.5 - 3.0 L/min
  total_liters += (flow / 12.0);      // Add flow for 5 sec interval
  
  doc["data"]["flow_rate"] = flow;
  doc["data"]["total_liters"] = total_liters;
  doc["data"]["bottles_avoided"] = (int)(total_liters / 0.5); // 500ml per bottle
  doc["data"]["co2_saved"] = total_liters * 0.082;            // Approx kgCO2 per liter
  doc["data"]["wifi_strength"] = WiFi.RSSI();
  
  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  // Publish to AWS Topic rule
  client.publish("sustainpro/telemetry", jsonBuffer);
  Serial.print("Sent: "); Serial.println(jsonBuffer);
}
