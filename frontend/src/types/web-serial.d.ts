export { };

declare global {
    interface Navigator {
        serial: Serial;
    }

    interface Serial {
        requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
        getPorts(): Promise<SerialPort[]>;
    }

    interface SerialPort {
        open(options: SerialOptions): Promise<void>;
        close(): Promise<void>;
        readable: ReadableStream<Uint8Array>;
        writable: WritableStream<Uint8Array>;
        usbProductId?: number;
        usbVendorId?: number;
    }

    interface SerialOptions {
        baudRate: number;
        dataBits?: number;
        stopBits?: number;
        parity?: 'none' | 'even' | 'odd';
        bufferSize?: number;
        flowControl?: 'none' | 'hardware';
    }

    interface SerialPortRequestOptions {
        filters?: SerialPortFilter[];
    }

    interface SerialPortFilter {
        usbVendorId?: number;
        usbProductId?: number;
    }
}
