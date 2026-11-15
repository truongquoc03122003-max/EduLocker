#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include <Arduino_GFX_Library.h>
#include <lvgl.h>
#include "secrets.h"

// =============================================================================
// EduLocker ESP32-S3 hardware bridge
// Board/pins are based on the uploaded prototype: ESP32-S3 N16R8 + ST7789 + MG90S.
// The device NEVER receives a plaintext order OTP and NEVER uses service_role.
// =============================================================================

static const char *SUPABASE_URL = "https://mwsqesgrmdjppicmwcfd.supabase.co";
static const char *FIRMWARE_VERSION = "edulocker-hw-bridge-1.0.0";
static const char *KIOSK_URL = "https://edu-locker.vercel.app/lockers";

#define TFT_CS 8
#define TFT_DC 9
#define TFT_RST 10
#define TFT_MOSI 11
#define TFT_SCLK 12
#define TFT_ROTATION 1

#define SERVO_PIN 5
#define ANGLE_CLOSE 0
#define ANGLE_OPEN 95
#define STEP_DELAY_MS 15

#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 240

static const unsigned long POLL_INTERVAL_MS = 2000;
static const unsigned long DEFAULT_OPEN_DURATION_MS = 60000;

Arduino_DataBus *bus =
    new Arduino_ESP32SPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI, GFX_NOT_DEFINED);
Arduino_GFX *gfx =
    new Arduino_ST7789(bus, TFT_RST, TFT_ROTATION, true, 240, 320);

static lv_disp_draw_buf_t drawBuf;
static lv_color_t *displayBuffer;
static lv_disp_drv_t displayDriver;

Servo doorServo;
int currentAngle = ANGLE_CLOSE;
bool isDoorOpen = false;
unsigned long doorOpenedAt = 0;
unsigned long openDurationMs = DEFAULT_OPEN_DURATION_MS;
unsigned long lastPollAt = 0;
unsigned long lastUiUpdateAt = 0;

lv_obj_t *qrObj = nullptr;
lv_obj_t *statusLabel = nullptr;
lv_obj_t *countdownLabel = nullptr;

static void setStatus(const String &text) {
  if (!statusLabel) return;
  lv_label_set_text(statusLabel, text.c_str());
  lv_timer_handler();
}

static void displayFlush(
    lv_disp_drv_t *disp,
    const lv_area_t *area,
    lv_color_t *colorP) {
  uint32_t width = area->x2 - area->x1 + 1;
  uint32_t height = area->y2 - area->y1 + 1;

#if (LV_COLOR_16_SWAP != 0)
  gfx->draw16bitBeRGBBitmap(
      area->x1,
      area->y1,
      reinterpret_cast<uint16_t *>(&colorP->full),
      width,
      height);
#else
  gfx->draw16bitRGBBitmap(
      area->x1,
      area->y1,
      reinterpret_cast<uint16_t *>(&colorP->full),
      width,
      height);
#endif

  lv_disp_flush_ready(disp);
}

static void moveDoorSmooth(int targetAngle) {
  doorServo.attach(SERVO_PIN, 500, 2400);

  if (currentAngle < targetAngle) {
    for (int pos = currentAngle; pos <= targetAngle; ++pos) {
      doorServo.write(pos);
      delay(STEP_DELAY_MS);
      lv_timer_handler();
    }
  } else {
    for (int pos = currentAngle; pos >= targetAngle; --pos) {
      doorServo.write(pos);
      delay(STEP_DELAY_MS);
      lv_timer_handler();
    }
  }

  currentAngle = targetAngle;
  delay(200);
  doorServo.detach();
}

static bool openDoor(unsigned long durationMs) {
  if (isDoorOpen) return true;

  setStatus("DANG MO CUA...");
  moveDoorSmooth(ANGLE_OPEN);

  isDoorOpen = true;
  doorOpenedAt = millis();
  openDurationMs =
      constrain(durationMs, 1000UL, 120000UL);
  lastUiUpdateAt = 0;

  setStatus("CUA DANG MO\nTu dong dong sau:");
  return true;
}

static bool closeDoor() {
  if (!isDoorOpen && currentAngle == ANGLE_CLOSE) return true;

  setStatus("DANG DONG CUA...");
  moveDoorSmooth(ANGLE_CLOSE);
  isDoorOpen = false;
  lv_label_set_text(countdownLabel, "");
  setStatus("SAN SANG\nCho lenh tu EduLocker");
  return true;
}

static void addSupabaseHeaders(HTTPClient &http) {
  http.addHeader("apikey", EDULOCKER_SUPABASE_ANON_KEY);
  http.addHeader(
      "Authorization",
      String("Bearer ") + EDULOCKER_SUPABASE_ANON_KEY);
  http.addHeader("Content-Type", "application/json");
}

static bool postRpc(
    const String &rpcName,
    JsonDocument &request,
    JsonDocument &response,
    int &httpCode) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;

  // MVP/demo compatibility with the original firmware.
  // Production hardware should validate the Supabase TLS certificate instead.
  client.setInsecure();

  HTTPClient http;
  String endpoint =
      String(SUPABASE_URL) + "/rest/v1/rpc/" + rpcName;

  if (!http.begin(client, endpoint)) return false;
  addSupabaseHeaders(http);

  String body;
  serializeJson(request, body);

  httpCode = http.POST(body);
  String payload = http.getString();
  http.end();

  if (httpCode < 200 || httpCode >= 300) {
    Serial.printf("RPC %s HTTP %d: %s\n",
                  rpcName.c_str(),
                  httpCode,
                  payload.c_str());
    return false;
  }

  DeserializationError err = deserializeJson(response, payload);
  if (err) {
    Serial.printf("JSON error in %s: %s\n",
                  rpcName.c_str(),
                  err.c_str());
    return false;
  }

  return true;
}

static bool acknowledgeCommand(
    const String &commandId,
    bool success,
    const String &message) {
  JsonDocument request;
  request["p_device_id"] = EDULOCKER_DEVICE_ID;
  request["p_device_secret"] = EDULOCKER_DEVICE_SECRET;
  request["p_command_id"] = commandId;
  request["p_success"] = success;
  request["p_message"] = message;

  JsonDocument response;
  int httpCode = 0;
  bool ok = postRpc(
      "rpc_locker_device_ack",
      request,
      response,
      httpCode);

  return ok && response["ok"].as<bool>();
}

static void pollHardwareCommand() {
  JsonDocument request;
  request["p_device_id"] = EDULOCKER_DEVICE_ID;
  request["p_device_secret"] = EDULOCKER_DEVICE_SECRET;
  request["p_firmware_version"] = FIRMWARE_VERSION;

  JsonDocument response;
  int httpCode = 0;

  if (!postRpc(
          "rpc_locker_device_poll",
          request,
          response,
          httpCode)) {
    setStatus("MAT KET NOI\nDang thu lai...");
    return;
  }

  if (!response["ok"].as<bool>()) {
    const char *errorCode = response["error_code"] | "UNKNOWN";
    setStatus(String("LOI THIET BI\n") + errorCode);
    return;
  }

  JsonVariant command = response["command"];
  if (command.isNull()) {
    if (!isDoorOpen) {
      setStatus("SAN SANG\nCho lenh tu EduLocker");
    }
    return;
  }

  String commandId = command["id"] | "";
  String action = command["action"] | "";
  unsigned long duration =
      command["duration_ms"] | DEFAULT_OPEN_DURATION_MS;

  if (commandId.isEmpty()) return;

  bool success = false;
  String message;

  if (action == "OPEN") {
    success = openDoor(duration);
    message = success ? "Servo opened" : "Open failed";
  } else if (action == "CLOSE") {
    success = closeDoor();
    message = success ? "Servo closed" : "Close failed";
  } else {
    message = "Unsupported action";
  }

  bool ackOk =
      acknowledgeCommand(commandId, success, message);

  Serial.printf(
      "Command %s action=%s success=%s ack=%s\n",
      commandId.c_str(),
      action.c_str(),
      success ? "true" : "false",
      ackOk ? "true" : "false");
}

static void buildDisplay() {
  lv_obj_t *screen = lv_scr_act();
  lv_obj_set_style_bg_color(screen, lv_color_white(), 0);

  qrObj =
      lv_qrcode_create(screen, 155, lv_color_black(), lv_color_white());
  lv_obj_align(qrObj, LV_ALIGN_LEFT_MID, 14, 0);
  lv_qrcode_update(qrObj, KIOSK_URL, strlen(KIOSK_URL));

  lv_obj_t *title = lv_label_create(screen);
  lv_label_set_text(title, "EDULOCKER\nSMART LOCKER");
  lv_obj_set_style_text_align(title, LV_TEXT_ALIGN_CENTER, 0);
  lv_obj_align(title, LV_ALIGN_TOP_RIGHT, -15, 18);

  statusLabel = lv_label_create(screen);
  lv_label_set_text(statusLabel, "Dang khoi dong...");
  lv_obj_set_style_text_align(statusLabel, LV_TEXT_ALIGN_CENTER, 0);
  lv_obj_align(statusLabel, LV_ALIGN_RIGHT_MID, -8, 12);

  countdownLabel = lv_label_create(screen);
  lv_label_set_text(countdownLabel, "");
  lv_obj_set_style_text_align(countdownLabel, LV_TEXT_ALIGN_CENTER, 0);
  lv_obj_align(countdownLabel, LV_ALIGN_BOTTOM_RIGHT, -40, -20);
}

static void connectWifi() {
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.begin(EDULOCKER_WIFI_SSID, EDULOCKER_WIFI_PASSWORD);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);

  setStatus("Dang ket noi\nWi-Fi...");

  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - started < 20000) {
    delay(200);
    lv_timer_handler();
  }

  if (WiFi.status() == WL_CONNECTED) {
    setStatus("SAN SANG\nCho lenh tu EduLocker");
    Serial.printf(
        "WiFi connected: %s | IP: %s | Device: %s\n",
        EDULOCKER_WIFI_SSID,
        WiFi.localIP().toString().c_str(),
        EDULOCKER_DEVICE_ID);
  } else {
    setStatus("KHONG CO WI-FI\nKiem tra secrets.h");
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(48, OUTPUT);
  digitalWrite(48, LOW);

  doorServo.attach(SERVO_PIN, 500, 2400);
  doorServo.write(ANGLE_CLOSE);
  delay(400);
  doorServo.detach();

  gfx->begin();
  gfx->fillScreen(WHITE);

  lv_init();
  displayBuffer = static_cast<lv_color_t *>(
      heap_caps_malloc(
          sizeof(lv_color_t) * SCREEN_WIDTH * 40,
          MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT));

  lv_disp_draw_buf_init(
      &drawBuf,
      displayBuffer,
      nullptr,
      SCREEN_WIDTH * 40);

  lv_disp_drv_init(&displayDriver);
  displayDriver.hor_res = SCREEN_WIDTH;
  displayDriver.ver_res = SCREEN_HEIGHT;
  displayDriver.flush_cb = displayFlush;
  displayDriver.draw_buf = &drawBuf;
  lv_disp_drv_register(&displayDriver);

  buildDisplay();
  connectWifi();
}

void loop() {
  lv_timer_handler();

  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnectAt = 0;
    if (millis() - lastReconnectAt >= 10000) {
      lastReconnectAt = millis();
      WiFi.reconnect();
    }
  }

  if (millis() - lastPollAt >= POLL_INTERVAL_MS) {
    lastPollAt = millis();
    pollHardwareCommand();
  }

  if (isDoorOpen) {
    unsigned long elapsed = millis() - doorOpenedAt;

    if (elapsed >= openDurationMs) {
      closeDoor();
    } else if (millis() - lastUiUpdateAt >= 1000) {
      lastUiUpdateAt = millis();
      unsigned long secondsLeft =
          (openDurationMs - elapsed + 999) / 1000;

      char buffer[20];
      snprintf(buffer, sizeof(buffer), "%lu giay", secondsLeft);
      lv_label_set_text(countdownLabel, buffer);
    }
  }

  // Local bench test only; does not touch Supabase order/OTP state.
  if (Serial.available() > 0) {
    char command = Serial.read();
    if (command == '1') openDoor(DEFAULT_OPEN_DURATION_MS);
    if (command == '0') closeDoor();
  }

  delay(5);
}
