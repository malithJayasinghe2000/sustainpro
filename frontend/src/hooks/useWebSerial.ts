
import { useState, useRef, useCallback, useEffect } from 'react';

export interface SerialDeviceIdentity {
    hw_id: string;
    type: string;
}

export const useWebSerial = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const portRef = useRef<any>(null);
    const readerRef = useRef<any>(null);
    const writerRef = useRef<any>(null);
    const [identity, setIdentity] = useState<SerialDeviceIdentity | null>(null);

    // Filter for ESP32/Serial devices if needed, otherwise generic
    const requestPort = async () => {
        try {
            if (!('serial' in navigator)) {
                alert('WebSerial is not supported in this browser. Please use Chrome or Edge.');
                return;
            }

            // @ts-ignore - Navigator.serial is experimental
            const port = await navigator.serial.requestPort();

            // Check if already open
            if (!port.readable) {
                await port.open({ baudRate: 115200 });
            }

            portRef.current = port;
            setIsConnected(true);

            // Start reading loop
            readLoop(port);

            // Setup Writer
            if (port.writable && !port.writable.locked) {
                const textEncoder = new TextEncoderStream();
                const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
                const writer = textEncoder.writable.getWriter();
                writerRef.current = writer;
            }

        } catch (error: any) {
            console.error('Serial Connection Failed:', error);
            if (error.name === 'InvalidStateError') {
                // Already open, probably re-clicked. Just assume connected.
                setIsConnected(true);
            } else if (error.name === 'NotFoundError') {
                // User cancelled
            } else {
                alert('Failed to connect to device: ' + error.message);
            }
        }
    };

    const disconnect = async () => {
        try {
            if (readerRef.current) {
                await readerRef.current.cancel();
                readerRef.current.releaseLock();
                readerRef.current = null;
            }
            if (writerRef.current) {
                await writerRef.current.close();
                writerRef.current.releaseLock();
                writerRef.current = null;
            }
            if (portRef.current) {
                await portRef.current.close();
                portRef.current = null;
            }
            setIsConnected(false);
            setIdentity(null);
            setLogs([]);
        } catch (e) {
            console.error('Disconnect error:', e);
        }
    };

    const readLoop = async (port: any) => {
        if (port.readable && !port.readable.locked) {
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = port.readable.pipeThrough(textDecoder);
            const reader = textDecoder.readable.getReader();
            readerRef.current = reader;

            let buffer = '';

            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    if (value) {
                        buffer += value;
                        // Check for newlines
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep the last partial line in buffer

                        for (const line of lines) {
                            handleLine(line.trim());
                        }
                    }
                }
            } catch (error) {
                console.error('Read Error:', error);
            } finally {
                reader.releaseLock();
            }
        }
    };

    const handleLine = (line: string) => {
        if (!line) return;
        setLogs(prev => [...prev.slice(-19), line]); // Keep last 20 logs
        console.log('[Device]:', line);

        // Try to parse identity JSON
        if (line.startsWith('{') && line.includes('"hw_id"')) {
            try {
                const json = JSON.parse(line);
                if (json.hw_id && json.type) {
                    setIdentity(json);
                }
            } catch (e) {
                // Not JSON or partial
            }
        }
    };

    const sendCommand = async (cmd: string) => {
        if (!writerRef.current) return;
        try {
            await writerRef.current.write(cmd + '\n');
            console.log('[Host]:', cmd);
        } catch (e) {
            console.error('Write Error:', e);
        }
    };

    return {
        isConnected,
        requestPort,
        disconnect,
        sendCommand,
        logs,
        identity
    };
};
