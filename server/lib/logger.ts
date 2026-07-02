import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Utiliser process.cwd() pour que le chemin soit relatif au projet
// En production (Docker), cwd = /app, donc logs = /app/logs
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// List of sensitive fields to redact from logs
const sensitiveFields = ['password', 'token', 'auth', 'p256dh', 'secret', 'apiKey', 'sessionId'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function redactSensitiveFields(value: Record<string, unknown>) {
  const sanitized = { ...value };
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  return sanitized;
}

// Custom format to sanitize sensitive data
const sanitizeMetadata = winston.format((info) => {
  if (isRecord(info.subscription)) {
    info.subscription = redactSensitiveFields(info.subscription);
  }
  
  // Recursively sanitize objects in metadata
  Object.keys(info).forEach(key => {
    const value = info[key];
    if (isRecord(value) && key !== 'level' && key !== 'message') {
      info[key] = redactSensitiveFields(value);
    }
  });
  
  return info;
});

// Custom format to extract error details
const errorFormat = winston.format((info) => {
  if (info.error instanceof Error) {
    info.error = {
      name: info.error.name,
      message: info.error.message,
      stack: info.error.stack,
    };
  }
  return info;
});

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  if (stack) {
    msg += `\n${stack}`;
  }
  return msg;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: combine(
    sanitizeMetadata(),
    errorFormat(),
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        logFormat
      )
    }),
    new winston.transports.File({ 
      filename: join(logsDir, 'combined.log'),
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
      )
    }),
    new winston.transports.File({ 
      filename: join(logsDir, 'error.log'), 
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json()
      )
    })
  ]
});
