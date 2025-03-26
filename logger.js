const winston = require("winston");
const AWS = require("aws-sdk");
const fs = require("fs");

// Set AWS region for CloudWatch Logs
AWS.config.update({ region: "us-east-1" });
const cloudwatchLogs = new AWS.CloudWatchLogs();

const logGroupName = "csye6225"; // This is the log group name in CloudWatch

// Function to create log group and stream if they don't exist
async function setupCloudWatchLogging() {
  try {
    // Check if the log group exists
    const groups = await cloudwatchLogs
      .describeLogGroups({ logGroupNamePrefix: logGroupName })
      .promise();
    if (
      !groups.logGroups.some((group) => group.logGroupName === logGroupName)
    ) {
      await cloudwatchLogs.createLogGroup({ logGroupName }).promise();
      console.log(`Created log group: ${logGroupName}`);
    }
    // Create a log stream (here we use a timestamp-based stream name)
    const logStreamName = `app-log-stream-${Date.now()}`;
    await cloudwatchLogs
      .createLogStream({ logGroupName, logStreamName })
      .promise();
    console.log(
      `Created log stream: ${logStreamName} in log group: ${logGroupName}`
    );
  } catch (error) {
    console.error("Error setting up CloudWatch logging:", error);
  }
}

// Call the setup function on startup (asynchronously)
setupCloudWatchLogging();

// Define the path for the local log file (ensure it’s under /opt/csye6225)
const logFilePath = "/opt/csye6225/app.log";

// Ensure the log file exists and has proper permissions
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, "", { mode: 0o666 });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Log to a file at /opt/csye6225/app.log
    new winston.transports.File({ filename: logFilePath }),
    // Also log to console (for development/debug)
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

module.exports = logger;
