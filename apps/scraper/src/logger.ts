import winston from 'winston';
import config from './config.js';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let msg = `${timestamp} [${level}] [scraper]: ${message}`;
    if (stack) msg += `\n${stack}`;
    if (Object.keys(meta).length > 0) msg += ` ${JSON.stringify(meta)}`;
    return msg;
});

export const logger = winston.createLogger({
    level: config.logLevel,
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize({ all: true }),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                logFormat
            ),
        }),
    ],
});

export default logger;
