#pragma once

// Copy this file to include/secrets.h and fill the values locally.
// NEVER commit include/secrets.h.

#define EDULOCKER_WIFI_SSID "YOUR_WIFI_NAME"
#define EDULOCKER_WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Public/publishable Supabase key only. NEVER use service_role on ESP32.
#define EDULOCKER_SUPABASE_ANON_KEY "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"

// Values created from EduLocker Admin -> Smart Locker -> "Ghép / đổi mã ESP32".
#define EDULOCKER_DEVICE_ID "EDULOCKER-A01"
#define EDULOCKER_DEVICE_SECRET "PASTE_ONE_TIME_DEVICE_SECRET_HERE"
