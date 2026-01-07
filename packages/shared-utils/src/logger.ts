/**
 * Simple logger utility
 * Can be upgraded to Pino/Winston later for production
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
    service?: string;
    minLevel?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

class Logger {
    private service: string;
    private minLevel: number;

    constructor(options: LoggerOptions = {}) {
        this.service = options.service || 'app';
        this.minLevel = LOG_LEVELS[options.minLevel || 'debug'];
    }

    private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
        if (LOG_LEVELS[level] < this.minLevel) return;

        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] [${level.toUpperCase()}] [${this.service}] ${message}`;

        switch (level) {
            case 'debug':
                console.debug(formatted, meta ? JSON.stringify(meta) : '');
                break;
            case 'info':
                console.log(formatted, meta ? JSON.stringify(meta) : '');
                break;
            case 'warn':
                console.warn(formatted, meta ? JSON.stringify(meta) : '');
                break;
            case 'error':
                console.error(formatted, meta ? JSON.stringify(meta) : '');
                break;
        }
    }

    debug(message: string, meta?: Record<string, any>): void {
        this.log('debug', message, meta);
    }

    info(message: string, meta?: Record<string, any>): void {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: Record<string, any>): void {
        this.log('warn', message, meta);
    }

    error(message: string, meta?: Record<string, any>): void {
        this.log('error', message, meta);
    }
}

export const createLogger = (options?: LoggerOptions): Logger => {
    return new Logger(options);
};

// Default logger instance
export const logger = createLogger();
