const AWS = require("aws-sdk");
const SDC = require("statsd-client");
const db = require("./models/index"); // Ensure index.js exports { sequelize, Check, File }

// Update AWS region (defaulting to us-east-1 if not provided)
AWS.config.update({ region: process.env.AWS_REGION || "us-east-1" });

// Initialize CloudWatch and StatsD clients
const cloudWatchClient = new AWS.CloudWatch();
const statsdClient = new SDC({ host: "localhost", port: 8125 });

/**
 * Helper function to send a metric to CloudWatch.
 * @param {string} metricName - Name of the metric.
 * @param {Array} dimensions - Array of {Name, Value} objects.
 * @param {string} unit - Unit of measure ("Count", "Milliseconds", etc.).
 * @param {number} value - Metric value.
 */
function sendMetric(metricName, dimensions, unit, value) {
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
    } else {
      console.log(`${metricName} metric sent successfully.`);
    }
  });
}

/**
 * Record API call metrics:
 * - Increments a counter for the API call.
 * - Records the API response time.
 * Also sends metrics to StatsD.
 *
 * @param {string} apiName - Unique identifier (e.g., "POST_/v1/file").
 * @param {number} responseTime - Response time in milliseconds.
 * @param {number} statusCode - HTTP status code.
 */
function recordAPICall(apiName, responseTime, statusCode) {
  const dimensions = [
    { Name: "API", Value: apiName },
    { Name: "Status", Value: String(statusCode) },
  ];
  sendMetric("APICallCount", dimensions, "Count", 1);
  sendMetric("APIResponseTime", dimensions, "Milliseconds", responseTime);

  statsdClient.increment(`api.${apiName}.calls`);
  statsdClient.timing(`api.${apiName}.response_time`, responseTime);
}

/**
 * Record database query timing:
 * - Sends a timer metric for each database query.
 *
 * @param {string} queryType - Type of query (or "unknown").
 * @param {number} execTime - Execution time in milliseconds.
 */
function recordDBQuery(queryType, execTime) {
  const dimensions = [{ Name: "QueryType", Value: queryType }];
  sendMetric("DBQueryTime", dimensions, "Milliseconds", execTime);
  statsdClient.timing("db.query_time", execTime);
}

/**
 * Record AWS S3 operation timing:
 * - Sends a timer metric for each S3 call.
 *
 * @param {string} operation - S3 operation (e.g., "upload", "delete").
 * @param {number} opTime - Operation time in milliseconds.
 */
function recordS3Operation(operation, opTime) {
  const dimensions = [{ Name: "S3Operation", Value: operation }];
  sendMetric("S3OperationTime", dimensions, "Milliseconds", opTime);
  statsdClient.timing(`s3.${operation}.time`, opTime);
}

// Attach Sequelize hooks for DB queries.
if (db.sequelize) {
  db.sequelize.addHook("beforeQuery", (options) => {
    options.__startTime = Date.now();
  });
  db.sequelize.addHook("afterQuery", (result, options) => {
    const queryDuration = Date.now() - options.__startTime;
    recordDBQuery(options.type || "unknown", queryDuration);
  });
}

module.exports = {
  recordAPICall,
  recordDBQuery,
  recordS3Operation,
};
