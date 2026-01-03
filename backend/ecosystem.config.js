module.exports = {
    apps: [
        // ---------------------------------------------------------
        // PRIORITY 1: Core System (Users, Events, Admin)
        // Critical for business operations. Must never go down.
        // ---------------------------------------------------------
        {
            name: "sp-core-api",
            script: "./dist/index.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: "production",
                PORT: 5000,
                SERVICE_ROLE: "CORE"
            },
            env_development: {
                NODE_ENV: "development",
                PORT: 5000,
                SERVICE_ROLE: "CORE"
            }
        },

        // ---------------------------------------------------------
        // PRIORITY 2: IoT Ingestion (Telemetry, Webhooks)
        // High volume. Isolated so it doesn't block Admin Dashboard.
        // AWS buffers data if this restarts.
        // ---------------------------------------------------------
        {
            name: "sp-iot-worker",
            script: "./dist/index.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '500M',
            env: {
                NODE_ENV: "production",
                PORT: 5001,
                SERVICE_ROLE: "IOT"
            }
        },

        // ---------------------------------------------------------
        // PRIORITY 3: Mobile API
        // Dedicated for mobile app traffic.
        // Allows scaling mobile traffic independently of admin users.
        // ---------------------------------------------------------
        {
            name: "sp-mobile-api",
            script: "./dist/index.js",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: "production",
                PORT: 5002,
                SERVICE_ROLE: "MOBILE"
            }
        }
    ]
};
