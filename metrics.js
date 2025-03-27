const AWS = require("aws-sdk");
const SDC = require("statsd-client");
const db = require("./models/index"); // Ensure index.js exports { sequelize, Check, File }

// Configure AWS SDK region
AWS.config.update({ region: process.env.AWS_REGION });

// Initialize CloudWatch and StatsD clients
const cloudWatchClient = new AWS.CloudWatch();
const statsdClient = new SDC({ host: "localhost", port: 8125 });

// Jest cleanup: Close the Sequelize connection after tests complete
afterAll(async () => {
  if (db.sequelize) {
    await db.sequelize.close();
  }
});

/**
 * Helper: Send a metric to CloudWatch.
 * @param {string} name - Metric name.
 * @param {Array} dimensions - Array of {Name, Value} pairs.
 * @param {string} unit - Metric unit (e.g., "Count", "Milliseconds").
 * @param {number} value - Metric value.
 */
function sendMetricToCloudWatch(name, dimensions, unit, value) {
  const params = {
    MetricData: [
      {
        MetricName: name,
        Dimensions: dimensions,
        Unit: unit,
        Value: value,
      },
    ],
    Namespace: "CSYE6225/WebApp",
  };

  cloudWatchClient.putMetricData(params, (err) => {
    if (err) {
      console.error(`Error sending ${name} metric:`, err);
    }
  });
}

/**
 * Record API metrics:
 * - Increments a count metric for API calls.
 * - Records a timer metric for the API response time.
 * Also sends the metrics to StatsD.
 * @param {string} apiIdentifier - Unique API identifier (e.g., "GET_/healthz").
 * @param {number} responseTime - API response time in milliseconds.
 * @param {number} statusCode - HTTP response status code.
 */
function recordApiUsage(apiIdentifier, responseTime, statusCode) {
  const dimensions = [
    { Name: "API", Value: apiIdentifier },
    { Name: "Status", Value: String(statusCode) },
  ];

  // CloudWatch metrics
  sendMetricToCloudWatch("APICallCount", dimensions, "Count", 1);
  sendMetricToCloudWatch(
    "APIResponseTime",
    dimensions,
    "Milliseconds",
    responseTime
  );

  // StatsD metrics
  statsdClient.increment(`api.${apiIdentifier}.calls`);
  statsdClient.timing(`api.${apiIdentifier}.response_time`, responseTime);
}

/**
 * Record database query timing:
 * - Uses a timer metric to record query execution time.
 * @param {string} queryType - Type of query (if available; otherwise "unknown").
 * @param {number} execTime - Execution time in milliseconds.
 */
function recordDbQuery(queryType, execTime) {
  const dimensions = [{ Name: "QueryType", Value: queryType }];
  sendMetricToCloudWatch("DBQueryTime", dimensions, "Milliseconds", execTime);
  statsdClient.timing("db.query_time", execTime);
}

/**
 * Record AWS S3 operation timing:
 * - Uses a timer metric for the S3 operation duration.
 * @param {string} operationName - S3 operation (e.g., "upload", "delete").
 * @param {number} opTime - Operation time in milliseconds.
 */
function recordS3Operation(operationName, opTime) {
  const dimensions = [{ Name: "S3Operation", Value: operationName }];
  sendMetricToCloudWatch("S3OperationTime", dimensions, "Milliseconds", opTime);
  statsdClient.timing(`s3.${operationName}.time`, opTime);
}

/**
 * Express middleware to capture API usage metrics.
 * It starts a timer when a request is received and then records the API call count
 * and response time once the response finishes.
 */
function apiMetricsMiddleware(req, res, next) {
  const startTime = Date.now();
  res.on("finish", () => {
    const elapsedTime = Date.now() - startTime;
    // Determine API identifier from method and route (fallback to path if route is undefined)
    const apiIdentifier =
      req.route && req.route.path
        ? `${req.method}_${req.route.path}`
        : req.path;
    recordApiUsage(apiIdentifier, elapsedTime, res.statusCode);
  });
  next();
}

// Attach Sequelize hooks to record DB query timings if the Sequelize instance exists.
if (db.sequelize) {
  db.sequelize.addHook("beforeQuery", (options) => {
    options.__startTime = Date.now();
  });
  db.sequelize.addHook("afterQuery", (result, options) => {
    const queryDuration = Date.now() - options.__startTime;
    recordDbQuery(options.type || "unknown", queryDuration);
  });
}

module.exports = {
  recordApiUsage,
  recordDbQuery: recordDbQuery, // exporting for potential direct usage if needed
  recordS3Operation,
  apiMetricsMiddleware,
};
