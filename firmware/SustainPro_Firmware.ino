#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <time.h>
#include <esp_task_wdt.h>

// ================== GLOBALS & PREFERENCES ==================
Preferences preferences;

// Network & Cloud
static const uint32_t BAUD = 115200;
static const uint32_t WIFI_CONNECT_TIMEOUT_MS = 20000;
static const uint32_t WIFI_RETRY_BACKOFF_MS = 30000;
uint32_t SENSOR_SEND_INTERVAL_MS = 2000; // Increased to 2s for stability
uint32_t SAMPLE_INTERVAL_MS = 1000;       // 1 sec default for flow calculation

// Default fallback server - Use your computer's local IP (not localhost!)
#ifndef DEFAULT_SERVER_URL
#define DEFAULT_SERVER_URL "http://10.64.175.133:5000"
#endif

// Device Identity
String deviceType = "water_monitor";
String deviceModel = "SPS_WW01";
String deviceSerial = ""; // Auto-generated from MAC
String fwVersion = "1.1.0";

// Provisioned Data
String serverUrl = "";
String apiKey = "";
String deviceCode = ""; // e.g. SPS_001
String wifiSSID = "";
String wifiPassword = "";

// WiFi State Management
enum WifiState : uint8_t { WIFI_IDLE = 0, WIFI_CONNECTING, WIFI_CONNECTED, WIFI_WAIT_RETRY };
struct {
    WifiState state = WIFI_IDLE;
    String ssid;
    String pass;
    unsigned long attemptStartMs = 0;
    unsigned long nextRetryMs = 0;
    String lastError;
} wifiCtl;

bool ntpSynced = false;

// ================== HARDWARE PINS ==================
// Flow Sensor
#define FLOW_SENSOR_PIN 18
// Status LED (Optional)
#define LED_PIN 2

// ================== FLOW METER VARS ==================
volatile unsigned long pulseCount = 0;
float calibrationFactor = 476.0; // Pulses per liter
float flowRate = 0.0;
float totalVolume = 0.0;
unsigned long oldTime = 0;

// Demo mode - simulate data when no real sensor
bool demoMode = true;
const float DEMO_FLOW_RATE = 5.0;    // Constant flow rate: 5.0 L/min
float demoTotalLiters = 0.0;         // Accumulated total liters
int demoBottlesAvoided = 0;          // Calculated: total / 0.5L
float demoCO2Saved = 0.0;            // Calculated: bottles * 0.082 kg

void IRAM_ATTR pulseCounter() {
    pulseCount++;
}

// ================== UTILS ==================
String trimTrailingSlash(String s) { s.trim(); while (s.endsWith("/")) s.remove(s.length() - 1); return s; }
String ensureHttpScheme(String s) { s.trim(); if (s.startsWith("http") || s.startsWith("https")) return s; return String("http://") + s; }

String makeUrl(const String& path) {
    String base = serverUrl.length() ? serverUrl : String(DEFAULT_SERVER_URL);
    base = ensureHttpScheme(trimTrailingSlash(base));
    if (!path.startsWith("/")) return base + "/" + path;
    return base + path;
}

// ================== CALCULATE DEMO DATA ==================
void updateDemoData() {
    // Use constant flow rate
    float currentFlowRate = DEMO_FLOW_RATE; // 5.0 L/min constant
    
    // Calculate liters added this interval
    // Flow rate is L/min, interval is in ms, convert to minutes
    float intervalMinutes = SENSOR_SEND_INTERVAL_MS / 60000.0;
    float litersThisInterval = currentFlowRate * intervalMinutes;
    
    // Accumulate total liters
    demoTotalLiters += litersThisInterval;
    
    // Calculate derived values
    demoBottlesAvoided = (int)(demoTotalLiters / 0.5);  // 500ml plastic bottles
    demoCO2Saved = demoBottlesAvoided * 0.082;          // kg CO2 per bottle
    
    Serial.println("[DEMO] Flow: " + String(currentFlowRate, 2) + " L/min | Total: " + String(demoTotalLiters, 2) + " L | Bottles: " + String(demoBottlesAvoided) + " | CO2: " + String(demoCO2Saved, 2) + " kg");
}

// ================== SERIAL PROTOCOL (HEX OBFUSCATED) ==================
// KEYS: c=CMD, w=SSID, k=PASS, i=ID, t=TOKEN, u=URL
// CMDS: 0xAB=IDENTIFY, 0xCD=PROVISION, 0xFF=REBOOT

void sendSerialResponse(const String& json) {
    Serial.println(json); 
}

void handleCommand(const String& line) {
    // 1. Identify Handshake (0xAB)
    if (line.indexOf("\"c\":\"0xAB\"") >= 0 || line.indexOf("\"c\": \"0xAB\"") >= 0) {
        StaticJsonDocument<200> doc;
        doc["s"] = 200;
        JsonObject d = doc.createNestedObject("d");
        d["m"] = deviceModel;
        d["s"] = deviceSerial;
        d["v"] = fwVersion;
        String resp;
        serializeJson(doc, resp);
        sendSerialResponse(resp);
        return;
    }

    // 2. Reboot (0xFF)
    if (line.indexOf("\"c\":\"0xFF\"") >= 0) {
        sendSerialResponse("{\"s\":200, \"msg\":\"Rebooting\"}");
        delay(500);
        ESP.restart();
        return;
    }

    // 3. Provision / Config (0xCD)
    if (line.indexOf("\"c\":\"0xCD\"") >= 0) {
        // Extract Payload "p": { ... }
        DynamicJsonDocument doc(1024);
        DeserializationError error = deserializeJson(doc, line);
        
        if (error) {
            sendSerialResponse("{\"s\":400, \"e\":\"JSON Error\"}");
            return;
        }

        JsonObject p = doc["p"];
        if (p.isNull()) {
            sendSerialResponse("{\"s\":400, \"e\":\"No Payload\"}");
            return;
        }

        String w = p["w"] | ""; // SSID
        String k = p["k"] | ""; // Pass
        String u = p["u"] | ""; // URL
        String i = p["i"] | ""; // Device ID
        String t = p["t"] | ""; // Token

        if (w.length() == 0 || i.length() == 0 || t.length() == 0) {
            sendSerialResponse("{\"s\":400, \"e\":\"Missing Fields\"}");
            return;
        }

        // Save to Preferences
        preferences.begin("device", false);
        preferences.putString("code", i);
        preferences.putString("key", t);
        if (u.length() > 0) preferences.putString("srv", u);
        preferences.end();

        preferences.begin("wifi", false);
        preferences.putString("ssid", w);
        preferences.putString("pass", k);
        preferences.end();

        // Update Runtime
        deviceCode = i;
        apiKey = t;
        if (u.length() > 0) serverUrl = u;
        wifiSSID = w;
        wifiPassword = k;

        // Ack
        sendSerialResponse("{\"s\":200, \"msg\":\"Saved\"}");
        return;
    }
}

// ================== DATA UPLOAD ==================
bool postTelemetry() {
    if (wifiCtl.state != WIFI_CONNECTED) return false;
    if (apiKey.length() == 0 || deviceCode.length() == 0) return false;

    WiFiClient client;
    HTTPClient http;
    
    // Use the telemetry endpoint
    String url = makeUrl("api/v1/telemetry");

    http.setTimeout(5000);
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    
    // Required authentication headers
    http.addHeader("X-Device-ID", deviceCode);
    http.addHeader("X-API-Key", apiKey);

    // Build the payload with all parameter values
    StaticJsonDocument<512> doc;
    JsonObject data = doc.createNestedObject("data");
    
    if (demoMode) {
        // Demo mode - send calculated data
        data["flow_rate"] = DEMO_FLOW_RATE;           // Constant 5.0 L/min
        data["total_liters"] = demoTotalLiters;       // Match model key
        data["bottles_avoided"] = demoBottlesAvoided;
        data["co2_saved"] = demoCO2Saved;
    } else {
        // Real sensor mode
        data["flow_rate"] = flowRate;
        data["total_liters"] = totalVolume;           // Match model key
        data["bottles_avoided"] = (int)(totalVolume / 0.5);
        data["co2_saved"] = (totalVolume / 0.5) * 0.082;
    }

    String payload;
    serializeJson(doc, payload);

    Serial.print("[HTTP] POST ");
    Serial.print(url);
    Serial.print(" -> ");

    int code = http.POST(payload);
    String response = http.getString();
    
    Serial.print(code);
    Serial.print(" ");
    Serial.println(response);
    
    http.end();
    
    bool success = (code >= 200 && code < 300);
    if (success) {
        digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Toggle LED on success
    }
    return success;
}

// ================== WIFI LOGIC ==================
void startWifi() {
    if (wifiSSID.length() == 0) return;
    Serial.print("[WiFi] Connecting to ");
    Serial.println(wifiSSID);
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
    wifiCtl.state = WIFI_CONNECTING;
    wifiCtl.attemptStartMs = millis();
}

void wifiTask() {
    if (wifiCtl.state == WIFI_CONNECTING) {
        if (WiFi.status() == WL_CONNECTED) {
            wifiCtl.state = WIFI_CONNECTED;
            Serial.println("{\"evt\":\"wifi_connected\",\"ip\":\"" + WiFi.localIP().toString() + "\"}");
            configTime(0, 0, "pool.ntp.org"); // Simple NTP
        } else if (millis() - wifiCtl.attemptStartMs > WIFI_CONNECT_TIMEOUT_MS) {
            wifiCtl.state = WIFI_WAIT_RETRY;
            wifiCtl.nextRetryMs = millis() + WIFI_RETRY_BACKOFF_MS;
            Serial.println("{\"evt\":\"wifi_fail\"}");
        }
    } else if (wifiCtl.state == WIFI_WAIT_RETRY) {
        if (millis() > wifiCtl.nextRetryMs) {
            startWifi();
        }
    }
}

// ================== SETUP ==================
void setup() {
    Serial.begin(BAUD);
    delay(1000);
    
    Serial.println("\n========================================");
    Serial.println("SustainPro Water Monitor v" + fwVersion);
    Serial.println("Demo Mode: " + String(demoMode ? "ENABLED" : "DISABLED"));
    Serial.println("========================================\n");
    
    // LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);
    
    // Identity
    uint64_t chipid = ESP.getEfuseMac();
    deviceSerial = String((uint32_t)(chipid >> 32), HEX) + String((uint32_t)chipid, HEX);

    // Init Flow Sensor
    pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

    // Load Config
    preferences.begin("device", true); // ReadOnly
    deviceCode = preferences.getString("code", "");
    apiKey = preferences.getString("key", "");
    serverUrl = preferences.getString("srv", "");
    preferences.end();

    // FIX: If saved URL contains 'localhost', clear it to use DEFAULT_SERVER_URL
    // This is because localhost on ESP32 means the ESP itself, not the server
    if (serverUrl.indexOf("localhost") >= 0) {
        Serial.println("[Config] WARNING: Saved URL contains 'localhost' - using default instead");
        serverUrl = ""; // Will use DEFAULT_SERVER_URL in makeUrl()
        
        // Also clear from preferences so next boot uses default
        preferences.begin("device", false);
        preferences.remove("srv");
        preferences.end();
    }

    preferences.begin("wifi", true);
    wifiSSID = preferences.getString("ssid", "");
    wifiPassword = preferences.getString("pass", "");
    preferences.end();
    
    Serial.println("[Config] Device Code: " + (deviceCode.length() ? deviceCode : "NOT SET"));
    Serial.println("[Config] Server: " + (serverUrl.length() ? serverUrl : DEFAULT_SERVER_URL));
    Serial.println("[Config] WiFi SSID: " + (wifiSSID.length() ? wifiSSID : "NOT SET"));

    if (wifiSSID.length() > 0) {
        startWifi();
    } else {
        Serial.println("{\"evt\":\"waiting_provision\"}");
    }
    
    // Seed random for demo mode
    randomSeed(analogRead(0));
}

// ================== LOOP ==================
unsigned long lastSerialCheck = 0;
unsigned long lastFlowSample = 0;
unsigned long lastCloudSend = 0;

void loop() {
    unsigned long now = millis();

    // 1. Serial Command Handling
    if (Serial.available()) {
        String line = Serial.readStringUntil('\n');
        line.trim();
        if (line.length() > 0) handleCommand(line);
    }

    // 2. WiFi Task
    wifiTask();

    // 3. Flow Calculation (Every 1s) - Only if not in demo mode
    if (!demoMode && (now - lastFlowSample >= SAMPLE_INTERVAL_MS)) {
        // Calculate Flow
        noInterrupts();
        unsigned long pulses = pulseCount;
        pulseCount = 0;
        interrupts();

        float freq = pulses; // Hz (since sample is 1s)
        flowRate = (freq / calibrationFactor) * 60.0; // L/min
        totalVolume += (flowRate / 60.0); // Add liters for this second
        
        lastFlowSample = now;
    }

    // 4. Cloud Send (Every Interval)
    if (now - lastCloudSend >= SENSOR_SEND_INTERVAL_MS) {
        if (wifiCtl.state == WIFI_CONNECTED && deviceCode.length() > 0) {
            if (demoMode) {
                updateDemoData();
            }
            postTelemetry();
        }
        lastCloudSend = now;
    }
}
