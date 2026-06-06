CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    device_id TEXT NOT NULL,
    soil_moisture REAL NOT NULL,
    air_temperature REAL NOT NULL,
    air_humidity REAL NOT NULL,
    luminosity REAL NOT NULL,
    water_level REAL NOT NULL,
    flow_detected INTEGER NOT NULL,
    irrigation_active INTEGER NOT NULL,
    orbital_index REAL NOT NULL,
    risk_score REAL NOT NULL,
    risk_level TEXT NOT NULL,
    application_state TEXT NOT NULL,
    recommendation TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created_at
ON telemetry (created_at);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_id
ON telemetry (device_id);
