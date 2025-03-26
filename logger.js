const winston = require("winston");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

// Determine the environment (test or production/development)
const env = process.env.NODE_ENV || "development";

// Use "./logs" for test environments, otherwise use /opt/csye6225
const logDir = env === "test" ? path.join(__dirname, "logs") : "/opt/csye6225";

// Ensure the log directory exists (create it if it doesn't)
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define the full path for the log file
const logFilePath = path.join(logDir, "app.log");

// Ensure the log file exists with proper permissions (if it doesn't, create it)
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, "", { mode: 0o666 });
}

// Only attempt CloudWatch setup if not in test mode and if AWS credentials are available
if (env !== "test" && process.env.AWS_ACCESS_KEY_ID) {
  AWS.config.update({ region: "us-east-1" });
  const cloudwatchLogs = new AWS.CloudWatchLogs();
  const logGroupName = "csye6225";
  const logStreamName = `webapp-log-stream-${Date.now()}`;

  async function setupCloudWatchLogging() {
    try {
      const groups = await cloudwatchLogs
        .describeLogGroups({ logGroupNamePrefix: logGroupName })
        .promise();
      if (
        !groups.logGroups.some((group) => group.logGroupName === logGroupName)
      ) {
        await cloudwatchLogs.createLogGroup({ logGroupName }).promise();
        console.log(`Created log group: ${logGroupName}`);
      }
      await cloudwatchLogs
        .createLogStream({ logGroupName, logStreamName })
        .promise();
      console.log(
        `Created log stream: ${logStreamName} in log group: ${logGroupName}`
      );
    } catch (error) {
      if (
        error.code === "CredentialsError" ||
        (error.originalError &&
          error.originalError.message.includes(
            "EC2 Metadata token request returned 400"
          ))
      ) {
        console.error(
          "Not running in an EC2 environment or missing credentials. Skipping CloudWatch log group creation."
        );
      } else {
        console.error("Error setting up CloudWatch logging:", error);
      }
    }
  }
  setupCloudWatchLogging();
} else {
  console.log(
    "Skipping CloudWatch logging setup (test environment or missing credentials)."
  );
}

// Configure and create the Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: logFilePath }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

module.exports = logger;
