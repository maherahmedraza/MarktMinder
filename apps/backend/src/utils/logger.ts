import winston from 'winston';
import config from '../config/index.js';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format for development (human-readable)
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add stack trace for errors
    if (stack) {
        msg += `\n${stack}`;
    }

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
    }

    return msg;
});

// Structured JSON format for production
const prodFormat = combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    errors({ stack: true }),
    json()
);

// Create logger instance
export const logger = winston.createLogger({
    level: config.logLevel,
    format: config.isProduction ? prodFormat : combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        devFormat
    ),
    defaultMeta: {
        service: 'marktminder-backend',
        environment: config.nodeEnv,
    },
    transports: [
        // Console transport
        new winston.transports.Console({
            format: config.isProduction ? prodFormat : combine(
                colorize({ all: true }),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                devFormat
            ),
        }),
    ],
});

// Add file transport in production
if (config.isProduction) {
    logger.add(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            format: prodFormat,
        })
    );

    logger.add(
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            format: prodFormat,
        })
    );
}

// Create a stream for Morgan HTTP logging
export const httpLogStream = {
    write: (message: string) => {
        logger.http(message.trim());
    },
};

/**
 * Performance timer utility for measuring operation duration
 */
export function createTimer(operationName: string) {
    const start = Date.now();
    return {
        end: (meta?: Record<string, unknown>) => {
            const duration = Date.now() - start;
            logger.debug(`${operationName} completed`, {
                operation: operationName,
                duration: `${duration}ms`,
                ...meta,
            });
            return duration;
        },
    };
}

export default logger;
