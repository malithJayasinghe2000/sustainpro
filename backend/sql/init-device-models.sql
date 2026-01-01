-- ===================================
-- Table: sps_device_models
-- ===================================
CREATE TABLE IF NOT EXISTS sps_device_models (
    id VARCHAR(50) PRIMARY KEY,         -- Unique ID (e.g., 'dm_sensor_v1')
    name VARCHAR(100) UNIQUE NOT NULL,  -- Display Name (e.g., 'DHT22 Sensor Node')
    description TEXT,
    
    -- Scalable Parameter Definition (JSONB)
    -- Structure Example:
    -- [
    --   { "key": "temperature", "name": "Temperature", "unit": "°C", "dataType": "float", "min": -40, "max": 80 },
    --   { "key": "humidity", "name": "Humidity", "unit": "%", "dataType": "float", "min": 0, "max": 100 }
    -- ]
    parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    created_by VARCHAR(50) REFERENCES sps_users(id), -- Audit who created it
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for faster searching inside JSON parameters if needed later
CREATE INDEX idx_device_models_parameters ON sps_device_models USING GIN (parameters);

-- Comment for documentation
COMMENT ON TABLE sps_device_models IS 'Defines the schema/template for devices, including their data parameters.';
COMMENT ON COLUMN sps_device_models.parameters IS 'JSON array defining the data points this model reports (key, unit, type, etc.)';
