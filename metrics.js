const AWS = require("aws-sdk");
const SDC = require("statsd-client");
const db = require("./models/index.js"); // Your Sequelize configuration

// Configure AWS SDK using the region from environment variables
AWS.config.update({ region: process.env.AWS_REGION });

// Initialize CloudWatch and StatsD client
const cloudwatch = new AWS.CloudWatch();
const sdc = new SDC({ host: "localhost", port: 8125 });

/**
 * Records API metrics by sending data to CloudWatch and StatsD.
 * @param {string} apiName - Name of the API endpoint.
 * @param {number} duration - Duration in milliseconds.
 * @param {number} statusCode - HTTP status code of the response.
 */
const recordAPIMetrics = (apiName, duration, statusCode) => {
  const params = {
    MetricData: [
      {
        MetricName: "APICallCount",
        Dimensions: [
          { Name: "API", Value: apiName },
          { Name: "StatusCode", Value: statusCode.toString() },
        ],
        Unit: "Count",
        Value: 1,
      },
      {
        MetricName: "APIResponseTime",
        Dimensions: [{ Name: "API", Value: apiName }],
        Unit: "Milliseconds",
        Value: duration,
      },
    ],
    Namespace: "WebApp",
  };

  // Send metrics to CloudWatch
  cloudwatch.putMetricData(params, (err) => {
    if (err) console.error("Error sending metrics:", err);
  });

  // Also send metrics to StatsD
  sdc.increment(`api.${apiName}.count`);
  sdc.timing(`api.${apiName}.response_time`, duration);
};

/**
 * Records database query execution time.
 * @param {string} queryName - Identifier for the query.
 * @param {number} duration - Duration in milliseconds.
 */
const recordDBQueryTime = (queryName, duration) => {
  sdc.timing("db.query_time", duration);
  // Optionally, send a similar metric to CloudWatch if desired.
};

/**
 * Records AWS S3 operation execution time.
 * @param {string} operation - The type of S3 operation (e.g., 'upload', 'delete').
 * @param {number} duration - Duration in milliseconds.
 */
const recordS3Time = (operation, duration) => {
  sdc.timing(`s3.${operation}.time`, duration);
  // Optionally, send a similar metric to CloudWatch if desired.
};

// Add Sequelize hooks for query timing if the Sequelize instance is available
if (db.sequelize && typeof db.sequelize.addHook === "function") {
  db.sequelize.addHook("beforeQuery", (options) => {
    options.startTime = Date.now();
  });

  db.sequelize.addHook("afterQuery", (result, options) => {
    const duration = Date.now() - options.startTime;
    recordDBQueryTime(options.type || "unknown", duration);
  });
}

// Export middleware to capture API metrics per request
module.exports = {
  recordAPIMetrics,
  recordDBQueryTime,
  recordS3Time,
  middleware: (req, res, next) => {
    req.startTime = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - req.startTime;
      const apiName = req.route ? `${req.method}_${req.route.path}` : "unknown";
      recordAPIMetrics(apiName, duration, res.statusCode);
    });
    next();
  },
};
