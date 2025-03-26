// logger.js
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, errors } = format;

// Custom log format: includes timestamp, level, and message (or stack trace)
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: "info",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new transports.File({ filename: "logs/app-error.log", level: "error" }),
    new transports.File({ filename: "logs/app-combined.log" }),
  ],
});

// In non-production environments, log to console as well.
if (process.env.NODE_ENV !== "production") {
  logger.add(new transports.Console({ format: format.simple() }));
}

module.exports = logger;
