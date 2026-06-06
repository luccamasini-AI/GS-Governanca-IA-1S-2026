#include <ArduinoJson.h>
#include <DHT.h>
#include <PubSubClient.h>
#include <WiFi.h>

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_PIN 34
#define LDR_PIN 35
#define WATER_LEVEL_PIN 32
#define FLOW_PIN 27
#define RELAY_PIN 26
#define ALERT_LED_PIN 25

const char* WIFI_SSID = "SEU_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA";
const char* MQTT_HOST = "192.168.0.10";
const int MQTT_PORT = 1883;
const char* DEVICE_ID = "astroagro-esp32-01";

const char* TOPIC_SENSORS = "astroagro/sensores";
const char* TOPIC_STATUS = "astroagro/status";
const char* TOPIC_COMMANDS = "astroagro/comandos/irrigacao";

DHT dht(DHT_PIN, DHT_TYPE);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

bool irrigationActive = false;
unsigned long lastPublish = 0;
unsigned long lastFlowPulse = 0;
unsigned long sequence = 0;

float mapAnalogPercent(int rawValue, bool invert) {
  float percent = (rawValue / 4095.0) * 100.0;
  if (invert) {
    percent = 100.0 - percent;
  }
  return constrain(percent, 0.0, 100.0);
}

void IRAM_ATTR onFlowPulse() {
  lastFlowPulse = millis();
}

void setIrrigation(bool active, const char* origin) {
  irrigationActive = active;
  digitalWrite(RELAY_PIN, active ? HIGH : LOW);
  digitalWrite(ALERT_LED_PIN, active ? HIGH : LOW);

  StaticJsonDocument<192> status;
  status["device_id"] = DEVICE_ID;
  status["irrigation_active"] = irrigationActive;
  status["origin"] = origin;
  status["message"] = active ? "Irrigação ligada" : "Irrigação desligada";

  char buffer[192];
  serializeJson(status, buffer);
  mqtt.publish(TOPIC_STATUS, buffer, true);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String command;
  for (unsigned int i = 0; i < length; i++) {
    command += (char)payload[i];
  }
  command.trim();
  command.toUpperCase();

  if (String(topic) == TOPIC_COMMANDS) {
    if (command == "ON" || command == "{\"COMMAND\":\"ON\"}") {
      setIrrigation(true, "remote");
    } else if (command == "OFF" || command == "{\"COMMAND\":\"OFF\"}") {
      setIrrigation(false, "remote");
    }
  }
}

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void connectMqtt() {
  while (!mqtt.connected()) {
    String clientId = String(DEVICE_ID) + "-" + String(random(0xffff), HEX);
    if (mqtt.connect(clientId.c_str())) {
      mqtt.subscribe(TOPIC_COMMANDS);
      mqtt.publish(TOPIC_STATUS, "{\"device_id\":\"astroagro-esp32-01\",\"message\":\"online\"}", true);
    } else {
      delay(1500);
    }
  }
}

float simulatedOrbitalIndex(float temperature, float luminosity, float soilMoisture) {
  float heatFactor = constrain((temperature - 26.0) / 14.0, 0.0, 1.0);
  float lightFactor = constrain(luminosity / 100.0, 0.0, 1.0);
  float dryFactor = constrain((45.0 - soilMoisture) / 45.0, 0.0, 1.0);
  return constrain((heatFactor * 0.35) + (lightFactor * 0.25) + (dryFactor * 0.40), 0.0, 1.0);
}

void publishTelemetry() {
  float airTemperature = dht.readTemperature();
  float airHumidity = dht.readHumidity();

  if (isnan(airTemperature) || isnan(airHumidity)) {
    airTemperature = 29.0;
    airHumidity = 60.0;
  }

  float soilMoisture = mapAnalogPercent(analogRead(SOIL_PIN), true);
  float luminosity = mapAnalogPercent(analogRead(LDR_PIN), false);
  float waterLevel = mapAnalogPercent(analogRead(WATER_LEVEL_PIN), false);
  bool flowDetected = irrigationActive && (millis() - lastFlowPulse < 5000);
  float orbitalIndex = simulatedOrbitalIndex(airTemperature, luminosity, soilMoisture);

  if (waterLevel < 20.0 && irrigationActive) {
    setIrrigation(false, "water_safety");
  }

  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["soil_moisture"] = round(soilMoisture * 10) / 10.0;
  doc["air_temperature"] = round(airTemperature * 10) / 10.0;
  doc["air_humidity"] = round(airHumidity * 10) / 10.0;
  doc["luminosity"] = round(luminosity * 10) / 10.0;
  doc["water_level"] = round(waterLevel * 10) / 10.0;
  doc["flow_detected"] = flowDetected;
  doc["irrigation_active"] = irrigationActive;
  doc["orbital_index"] = round(orbitalIndex * 100) / 100.0;
  doc["sequence"] = ++sequence;

  char buffer[512];
  serializeJson(doc, buffer);
  mqtt.publish(TOPIC_SENSORS, buffer);
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(ALERT_LED_PIN, OUTPUT);
  pinMode(FLOW_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(ALERT_LED_PIN, LOW);

  Serial.begin(115200);
  dht.begin();
  attachInterrupt(digitalPinToInterrupt(FLOW_PIN), onFlowPulse, FALLING);
  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }
  if (!mqtt.connected()) {
    connectMqtt();
  }
  mqtt.loop();

  if (millis() - lastPublish >= 5000) {
    lastPublish = millis();
    publishTelemetry();
  }
}
