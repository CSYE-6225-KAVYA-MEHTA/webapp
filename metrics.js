const AWS = require("aws-sdk");
const SDC = require("statsd-client");
const db = require("./models/index"); // Ensure index.js exports { sequelize, Check, File }

// Configure AWS SDK region
AWS.config.update({ region: process.env.AWS_REGION });

// Initialize CloudWatch and StatsD clients
const cloudWatchClient = new AWS.CloudWatch();
const statsdClient = new SDC({ host: "localhost", port: 8125 });

/**
 * Helper: Send a metric to CloudWatch.
 * @param {string} metricName - The name of the metric.
 * @param {Array} dimensions - Array of {Name, Value} pairs.
 * @param {string} unit - The metric unit (e.g., "Count", "Milliseconds").
 * @param {number} value - The metric value.
 */
function sendMetricToCloudWatch(metricName, dimensions, unit, value) {
  const params = {
    MetricData: [
      {
        MetricName: metricName,
        Dimensions: dimensions,
        Unit: unit,
        Value: value,
      },
    ],
    Namespace: "CSYE6225/WebApp",
  };

  cloudWatchClient.putMetricData(params, (err) => {
    if (err) {
      console.error(`Error sending ${metricName} metric:`, err);
    }
  });
}

/**
 * Record API usage metrics:
 * - Increments a counter for API calls.
 * - Records a timer for the API response time.
 * Also sends metrics to StatsD.
 * @param {string} apiIdentifier - Unique identifier (e.g., "GET_/healthz").
 * @param {number} responseTime - Response time in milliseconds.
 * @param {number} statusCode - HTTP response status code.
 */
function recordApiUsage(apiIdentifier, responseTime, statusCode) {
  const dimensions = [
    { Name: "API", Value: apiIdentifier },
    { Name: "Status", Value: String(statusCode) },
  ];

  sendMetricToCloudWatch("APICallCount", dimensions, "Count", 1);
  sendMetricToCloudWatch(
    "APIResponseTime",
    dimensions,
    "Milliseconds",
    responseTime
  );

  statsdClient.increment(`api.${apiIdentifier}.calls`);
  statsdClient.timing(`api.${apiIdentifier}.response_time`, responseTime);
}

/**
 * Record database query timing:
 * - Sends a timer metric for each query executed.
 * @param {string} queryType - Type of query (or "unknown").
 * @param {number} execTime - Execution time in milliseconds.
 */
function recordDbQuery(queryType, execTime) {
  const dimensions = [{ Name: "QueryType", Value: queryType }];
  sendMetricToCloudWatch("DBQueryTime", dimensions, "Milliseconds", execTime);
  statsdClient.timing("db.query_time", execTime);
}

/**
 * Record AWS S3 operation timing:
 * - Sends a timer metric for each S3 call.
 * @param {string} operationName - The S3 operation (e.g., "upload", "delete").
 * @param {number} opTime - Operation time in milliseconds.
 */
function recordS3Operation(operationName, opTime) {
  const dimensions = [{ Name: "S3Operation", Value: operationName }];
  sendMetricToCloudWatch("S3OperationTime", dimensions, "Milliseconds", opTime);
  statsdClient.timing(`s3.${operationName}.time`, opTime);
}

/**
 * Express middleware to capture API usage metrics.
 * Starts a timer at request start and, on response finish, records API metrics.
 */
function apiMetricsMiddleware(req, res, next) {
  const startTime = Date.now();
  res.on("finish", () => {
    const elapsedTime = Date.now() - startTime;
    const apiIdentifier =
      req.route && req.route.path
        ? `${req.method}_${req.route.path}`
        : req.path;
    recordApiUsage(apiIdentifier, elapsedTime, res.statusCode);
  });
  next();
}

// Attach Sequelize hooks to record database query timings if Sequelize instance exists.
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
  recordDbQuery,
  recordS3Operation,
  apiMetricsMiddleware,
};
