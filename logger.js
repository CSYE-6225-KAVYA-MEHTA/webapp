const { createLogger, format, transports } = require("winston");

// Use a different log file path for local development.
const logFilePath =
  process.env.NODE_ENV === "test"
    ? "./app.log" // Relative path for local dev
    : "/opt/csye6225/app.log"; // Production path

const logger = createLogger({
  level: "info",
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({ filename: logFilePath }),
  ],
});

module.exports = logger;
