
import { query } from '../db';
import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';

async function checkDevice() {
    try {
        const res = await query("SELECT device_code, api_key, status, name FROM sps_devices WHERE device_code = 'SPS_001'");
        if (res.rows.length === 0) {
            fs.writeFileSync('key.txt', 'Device SPS_001 not found.');
        } else {
            const info = `Device Found: ${JSON.stringify(res.rows[0])}\nEXPECTED HEADER: x-api-key: ${res.rows[0].api_key}`;
            fs.writeFileSync('key.txt', info);
        }
        process.exit(0);
    } catch (e: any) {
        fs.writeFileSync('key.txt', 'Error: ' + (e.message || String(e)));
        process.exit(1);
    }
}

checkDevice();
