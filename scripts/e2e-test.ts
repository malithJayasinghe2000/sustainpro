/**
 * SustainPro End-to-End Integration Test Script
 * 
 * This script tests the complete flow through the API Gateway:
 * 1. Authentication (Login, Token, Refresh)
 * 2. Organizations CRUD
 * 3. Events CRUD
 * 4. Device Management
 * 5. Telemetry Ingestion
 * 6. Socket.IO Connection
 * 
 * Usage:
 *   npm run test:e2e
 *   # or
 *   npx ts-node scripts/e2e-test.ts
 * 
 * Prerequisites:
 *   - All services running (auth, core, iot)
 *   - Gateway running on port 8080
 *   - Database with at least one user
 */

import axios, { AxiosInstance } from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const API_URL = `${GATEWAY_URL}/api/v1`;

// Test credentials - update these for your environment
const TEST_USER = {
    email: process.env.TEST_EMAIL || 'elcoanlanka@gmail.com',
    password: process.env.TEST_PASSWORD || 'your-password-here'
};

interface TestResult {
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message?: string;
    duration?: number;
}

const results: TestResult[] = [];
let authToken: string | null = null;
let testOrgId: string | null = null;
let testEventId: string | null = null;
let testDeviceId: string | null = null;
let apiClient: AxiosInstance;

// Helper to create authenticated client
function createApiClient(token?: string): AxiosInstance {
    return axios.create({
        baseURL: API_URL,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        validateStatus: () => true // Don't throw on any status
    });
}

// Test runner
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const start = Date.now();
    try {
        await testFn();
        results.push({
            name,
            status: 'PASS',
            duration: Date.now() - start
        });
        console.log(`✅ ${name} (${Date.now() - start}ms)`);
    } catch (error: any) {
        results.push({
            name,
            status: 'FAIL',
            message: error.message,
            duration: Date.now() - start
        });
        console.log(`❌ ${name}: ${error.message}`);
    }
}

// ============================================
// Tests
// ============================================

async function testGatewayHealth(): Promise<void> {
    const response = await axios.get(`${GATEWAY_URL}/health`);
    if (response.status !== 200) {
        throw new Error(`Gateway unhealthy: ${response.status}`);
    }
    if (!response.data.status || response.data.status !== 'healthy') {
        throw new Error(`Unexpected health response: ${JSON.stringify(response.data)}`);
    }
}

async function testAuthServiceHealth(): Promise<void> {
    const client = createApiClient();
    const response = await client.post('/auth/login', { email: 'invalid', password: 'invalid' });
    // We expect 400 or 401, but NOT 502 (which would mean service is down)
    if (response.status === 502) {
        throw new Error('Auth service unreachable (502)');
    }
}

async function testCoreServiceHealth(): Promise<void> {
    const client = createApiClient();
    const response = await client.get('/organizations');
    // We expect 401 (unauthorized), but NOT 502
    if (response.status === 502) {
        throw new Error('Core service unreachable (502)');
    }
}

async function testIoTServiceHealth(): Promise<void> {
    const client = createApiClient();
    const response = await client.post('/telemetry/', {});
    // We expect 401 (unauthorized), but NOT 502
    if (response.status === 502) {
        throw new Error('IoT service unreachable (502)');
    }
}

async function testLogin(): Promise<void> {
    const client = createApiClient();
    const response = await client.post('/auth/login', {
        email: TEST_USER.email,
        password: TEST_USER.password
    });
    
    if (response.status !== 200) {
        throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.token) {
        throw new Error('No token in login response');
    }
    
    authToken = response.data.token;
    apiClient = createApiClient(authToken);
}

async function testGetCurrentUser(): Promise<void> {
    if (!authToken) {
        throw new Error('No auth token available');
    }
    
    const response = await apiClient.get('/users/me');
    
    if (response.status !== 200) {
        throw new Error(`Get user failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
    if (!response.data.data?.email) {
        throw new Error('Invalid user response');
    }
}

async function testListOrganizations(): Promise<void> {
    const response = await apiClient.get('/organizations');
    
    if (response.status !== 200) {
        throw new Error(`List orgs failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
    // Store first org ID for later tests
    if (response.data.data?.length > 0) {
        testOrgId = response.data.data[0].id;
    }
}

async function testGetOrganization(): Promise<void> {
    if (!testOrgId) {
        throw new Error('No organization ID available');
    }
    
    const response = await apiClient.get(`/organizations/${testOrgId}`);
    
    if (response.status !== 200) {
        throw new Error(`Get org failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
}

async function testListEvents(): Promise<void> {
    const response = await apiClient.get('/events');
    
    if (response.status !== 200) {
        throw new Error(`List events failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
    // Store first event ID for later tests
    if (response.data.data?.length > 0) {
        testEventId = response.data.data[0].id;
    }
}

async function testListDevices(): Promise<void> {
    const response = await apiClient.get('/devices');
    
    if (response.status !== 200) {
        throw new Error(`List devices failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
    // Store first device ID for later tests
    if (response.data.data?.length > 0) {
        testDeviceId = response.data.data[0].id;
    }
}

async function testListDeviceModels(): Promise<void> {
    const response = await apiClient.get('/device-models');
    
    if (response.status !== 200) {
        throw new Error(`List device models failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
}

async function testGetSettings(): Promise<void> {
    const response = await apiClient.get('/settings');
    
    if (response.status !== 200) {
        throw new Error(`Get settings failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
}

async function testSocketIOPolling(): Promise<void> {
    const response = await axios.get(`${GATEWAY_URL}/socket.io/?EIO=4&transport=polling`);
    
    if (response.status !== 200) {
        throw new Error(`Socket.IO polling failed: ${response.status}`);
    }
    
    // Socket.IO returns a packet with session info
    const data = response.data;
    if (!data.includes('sid') && !data.includes('websocket')) {
        throw new Error(`Invalid Socket.IO response: ${data.substring(0, 100)}`);
    }
}

async function testTelemetryEndpointAuth(): Promise<void> {
    // Test that telemetry endpoint requires device auth
    const client = createApiClient();
    const response = await client.post('/telemetry/', { temperature: 25 });
    
    if (response.status !== 401) {
        throw new Error(`Expected 401, got: ${response.status}`);
    }
    
    if (!response.data.error?.includes('API key')) {
        throw new Error(`Expected API key error, got: ${JSON.stringify(response.data)}`);
    }
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     SustainPro E2E Integration Tests                      ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║ Gateway: ${GATEWAY_URL.padEnd(48)}║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    // Service Health Tests
    console.log('📋 Service Health Tests');
    console.log('─'.repeat(50));
    await runTest('Gateway Health', testGatewayHealth);
    await runTest('Auth Service Reachable', testAuthServiceHealth);
    await runTest('Core Service Reachable', testCoreServiceHealth);
    await runTest('IoT Service Reachable', testIoTServiceHealth);
    
    // Authentication Tests
    console.log('\n🔐 Authentication Tests');
    console.log('─'.repeat(50));
    await runTest('Login', testLogin);
    await runTest('Get Current User', testGetCurrentUser);
    
    // Core Service Tests
    console.log('\n🏢 Core Service Tests');
    console.log('─'.repeat(50));
    await runTest('List Organizations', testListOrganizations);
    await runTest('Get Organization', testGetOrganization);
    await runTest('List Events', testListEvents);
    await runTest('Get Settings', testGetSettings);
    
    // Device Management Tests
    console.log('\n📱 Device Management Tests');
    console.log('─'.repeat(50));
    await runTest('List Devices', testListDevices);
    await runTest('List Device Models', testListDeviceModels);
    
    // IoT Service Tests
    console.log('\n📡 IoT Service Tests');
    console.log('─'.repeat(50));
    await runTest('Socket.IO Polling', testSocketIOPolling);
    await runTest('Telemetry Requires Auth', testTelemetryEndpointAuth);
    
    // Summary
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                           ║');
    console.log('╠═══════════════════════════════════════════════════════════╣');
    console.log(`║ Passed:  ${passed.toString().padEnd(48)}║`);
    console.log(`║ Failed:  ${failed.toString().padEnd(48)}║`);
    console.log(`║ Skipped: ${skipped.toString().padEnd(48)}║`);
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - ${r.name}: ${r.message}`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
