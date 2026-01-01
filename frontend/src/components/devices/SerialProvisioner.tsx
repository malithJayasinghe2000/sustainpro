'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, Cpu, Wifi, ArrowRight, Loader } from 'lucide-react';

// Types
type ProvisionStep = 'connect' | 'identify' | 'wifi' | 'flashing' | 'success';

interface DeviceIdentity {
    m: string; // Model
    s: string; // Serial
}

// Hex Protocol
const CMD_IDENTIFY = '{"c":"0xAB"}\n';
const CMD_REBOOT = '{"c":"0xFF"}\n';

interface SerialProvisionerProps {
    onProvision: (serial: string, model: string, ssid: string, pass: string) => Promise<{ device_code: string, api_key: string, server_url: string }>;
    onSuccess: () => void;
}

export default function SerialProvisioner({ onProvision, onSuccess }: SerialProvisionerProps) {
    const [step, setStep] = useState<ProvisionStep>('connect');
    const [logs, setLogs] = useState<string[]>([]);
    const [port, setPort] = useState<SerialPort | null>(null);
    const [reader, setReader] = useState<ReadableStreamDefaultReader<string> | null>(null);
    const [writer, setWriter] = useState<WritableStreamDefaultWriter<string> | null>(null);

    // Identity Data
    const [deviceInfo, setDeviceInfo] = useState<DeviceIdentity | null>(null);

    // Provisioned Credentials
    const [credentials, setCredentials] = useState<{ device_code: string, api_key: string, server_url: string } | null>(null);

    // User Inputs
    const [ssid, setSsid] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const log = (msg: string) => {
        setLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // 1. Connect Serial
    const connectSerial = async () => {
        try {
            if (!navigator.serial) {
                setError("Web Serial API not supported in this browser. Use Chrome/Edge.");
                return;
            }

            const p = await navigator.serial.requestPort();
            await p.open({ baudRate: 115200 });
            setPort(p);
            log("Port Connected");

            // Setup Streams
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = p.readable?.pipeTo(textDecoder.writable as any);
            const r = textDecoder.readable.getReader();
            setReader(r);

            const textEncoder = new TextEncoderStream();
            const writableStreamClosed = textEncoder.readable.pipeTo(p.writable as any);
            const w = textEncoder.writable.getWriter();
            setWriter(w);

            setStep('identify');
            readLoop(r);
        } catch (err: any) {
            log("Connection Error: " + err.message);
        }
    };

    // 2. Read Loop
    const readLoop = async (r: ReadableStreamDefaultReader<string>) => {
        try {
            while (true) {
                const { value, done } = await r.read();
                if (done) break;
                if (value) {
                    processSerialData(value);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 3. Process Incoming Data
    const bufferRef = useRef("");
    const processSerialData = (chunk: string) => {
        bufferRef.current += chunk;
        if (bufferRef.current.includes('\n')) {
            const lines = bufferRef.current.split('\n');
            bufferRef.current = lines.pop() || ""; // Keep incomplete line

            for (const line of lines) {
                if (line.trim().length === 0) continue;
                log("RX: " + line.trim());
                try {
                    const json = JSON.parse(line);
                    handleJsonMessage(json);
                } catch (e) {
                    // Ignore non-json
                }
            }
        }
    };

    const handleJsonMessage = (msg: any) => {
        // Handle Identify Response: { s: 200, d: { m: "...", s: "..." } }
        if (msg.s === 200 && msg.d && msg.d.m && msg.d.s) {
            setDeviceInfo(msg.d);
            if (step === 'identify') {
                log(`Identified: ${msg.d.m} (${msg.d.s})`);
                // Auto-advance
            }
        }

        // Handle Provision Ack: { s: 200, msg: "Saved" }
        if (msg.s === 200 && msg.msg === "Saved") {
            setStep('success');
            onSuccess();
        }
    };

    // 4. Send Identify
    const sendIdentify = async () => {
        if (!writer) return;
        await writer.write(CMD_IDENTIFY);
        log("TX: IDENTIFY (0xAB)");
    };

    // 5. Flash Config
    const flashConfig = async () => {
        if (!deviceInfo) return;
        setStep('flashing');
        setError(null);

        try {
            // A. Call Backend
            log("Requesting keys from backend...");
            const creds = await onProvision(
                deviceInfo.s,
                deviceInfo.m,
                ssid,
                password
            );

            // Store credentials for success screen
            setCredentials(creds);
            const { device_code, api_key, server_url } = creds;

            // B. Prepare Payload (Hex Protocol)
            // { l: "0xCD", p: { w: SSID, k: PASS, i: CODE, t: KEY, u: URL } }
            const payload = {
                c: "0xCD",
                p: {
                    w: ssid,
                    k: password,
                    i: device_code,
                    t: api_key,
                    u: server_url
                }
            };

            // C. Send Serial
            if (writer) {
                await writer.write(JSON.stringify(payload) + "\n");
                log("TX: PROVISION (0xCD)");
            }

            // Wait for Ack in readLoop...

        } catch (err: any) {
            setError(err.message);
            setStep('wifi');
        }
    };

    // UI RENDER
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm">
            {/* Header Steps */}
            <div className="flex border-b border-border">
                {['connect', 'identify', 'wifi', 'flashing'].map((s, i) => (
                    <div key={s} className={`flex-1 p-3 text-center text-sm font-medium ${step === s ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
                        {i + 1}. {s.toUpperCase()}
                    </div>
                ))}
            </div>

            <div className="p-6 min-h-[300px] flex flex-col items-center justify-center">

                {/* STEP 1: CONNECT */}
                {step === 'connect' && (
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <Cpu className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold">Connect Device</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                            Plug your device into USB. Click below to select the serial port.
                        </p>
                        <button onClick={connectSerial} className="btn-primary">
                            Connect via Serial
                        </button>
                        {error && <p className="text-destructive text-sm">{error}</p>}
                    </div>
                )}

                {/* STEP 2: IDENTIFY */}
                {step === 'identify' && (
                    <div className="text-center space-y-4 w-full max-w-md">
                        <h3 className="text-lg font-bold">Checking Device...</h3>
                        {deviceInfo ? (
                            <div className="bg-muted p-4 rounded-md space-y-2 text-left">
                                <div className="flex justify-between"><span>Model:</span> <span className="font-mono font-bold">{deviceInfo.m}</span></div>
                                <div className="flex justify-between"><span>Serial:</span> <span className="font-mono font-bold">{deviceInfo.s}</span></div>
                                <button onClick={() => setStep('wifi')} className="btn-primary w-full mt-4">
                                    Next: Configure WiFi
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Loader className="w-8 h-8 animate-spin mx-auto text-primary" />
                                <p className="text-sm">Waiting for handshake...</p>
                                <button onClick={sendIdentify} className="btn-secondary text-xs">
                                    Retry Handshake
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 3: WIFI */}
                {step === 'wifi' && (
                    <div className="w-full max-w-sm space-y-4">
                        <h3 className="text-lg font-bold text-center">WiFi Credentials</h3>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Network Name (SSID)</label>
                            <input
                                type="text"
                                className="input-field w-full"
                                value={ssid}
                                onChange={e => setSsid(e.target.value)}
                                placeholder="Home_WiFi_2.4G"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Password</label>
                            <input
                                type="password"
                                className="input-field w-full"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                        {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}
                        <button onClick={flashConfig} className="btn-primary w-full" disabled={!ssid}>
                            Provision Device
                        </button>
                    </div>
                )}

                {/* STEP 4: FLASHING */}
                {step === 'flashing' && (
                    <div className="text-center space-y-4">
                        <Loader className="w-12 h-12 text-primary animate-spin mx-auto" />
                        <h3 className="text-lg font-medium">Flashing Logic...</h3>
                        <p className="text-sm text-muted-foreground">Do not disconnect device.</p>
                    </div>
                )}

                {/* SUCCESS */}
                {step === 'success' && (
                    <div className="w-full max-w-lg space-y-6">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold">Setup Complete!</h3>
                            <p className="text-sm text-muted-foreground">Device has been configured successfully.</p>
                        </div>

                        {/* Credentials Display */}
                        {credentials && (
                            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                                <h4 className="font-semibold text-sm text-muted-foreground">Provisioning Details:</h4>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Device ID</label>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono">
                                                {credentials.device_code}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(credentials.device_code);
                                                    log("Copied Device ID");
                                                }}
                                                className="btn-secondary text-xs px-3"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">API Key</label>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono truncate">
                                                {credentials.api_key}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(credentials.api_key);
                                                    log("Copied API Key");
                                                }}
                                                className="btn-secondary text-xs px-3"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">Server URL</label>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono">
                                                {credentials.server_url}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(credentials.server_url);
                                                    log("Copied Server URL");
                                                }}
                                                className="btn-secondary text-xs px-3"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">WiFi Network</label>
                                        <code className="block bg-muted px-3 py-2 rounded-md text-sm font-mono">
                                            {ssid}
                                        </code>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <p className="text-xs text-muted-foreground">
                                        ℹ️ These credentials have been saved to the device. It should start sending data shortly.
                                    </p>
                                </div>
                            </div>
                        )}

                        <button onClick={() => window.location.href = '/devices'} className="btn-primary w-full">
                            Go to Devices Dashboard
                        </button>
                    </div>
                )}

            </div>

            {/* Serial Terminal */}
            <div className="bg-black text-green-500 font-mono text-xs p-3 h-32 overflow-y-auto rounded-b-lg border-t border-border">
                {logs.length === 0 && <span className="opacity-50">Serial logs will appear here...</span>}
                {logs.map((L, i) => (
                    <div key={i}>{L}</div>
                ))}
            </div>
        </div>
    );
}

