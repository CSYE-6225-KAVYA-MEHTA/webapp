const winston = require("winston");
const AWS = require("aws-sdk");
const fs = require("fs");

// Configure AWS SDK for CloudWatch Logs (adjust region as needed)
AWS.config.update({ region: "us-east-1" });
const cloudwatchLogs = new AWS.CloudWatchLogs();

const logGroupName = "csye6225";
const logStreamName = `webapp-log-stream-${Date.now()}`;

// Function to create CloudWatch Log Group and Log Stream if needed
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
    // If error is due to not being on an EC2 environment (metadata request returns 400), log a message and skip
    if (
      error.code === "CredentialsError" &&
      error.originalError &&
      error.originalError.message.includes(
        "EC2 Metadata token request returned 400"
      )
    ) {
      console.error(
        "Not running in an EC2 environment. Skipping CloudWatch log group and stream creation."
      );
    } else {
      console.error("Error setting up CloudWatch logging:", error);
    }
  }
}

// Attempt to set up CloudWatch logging
setupCloudWatchLogging();

// Define the local log file path (ensuring it is under /opt/csye6225)
const logFilePath = "/opt/csye6225/app.log";

// Ensure the log file exists with proper permissions
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
    new winston.transports.File({ filename: logFilePath }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

module.exports = logger;
