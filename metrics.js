const StatsD = require("node-statsd");

// Create a StatsD client – assuming a local StatsD server (adjust host/port if needed)
const statsd = new StatsD({
  host: "localhost",
  port: 8125,
});

// Function to log API call counts
function logApiCall(apiName) {
  statsd.increment(`api.${apiName}.calls`);
}

// Function to log API response times (in milliseconds)
function logApiResponseTime(apiName, duration) {
  statsd.timing(`api.${apiName}.response_time`, duration);
}

// Function to log database query execution time (in milliseconds)
function logDbQueryTime(queryName, duration) {
  statsd.timing(`db.${queryName}.execution_time`, duration);
}

// Function to log AWS S3 operation time (in milliseconds)
function logS3Call(apiAction, duration) {
  statsd.timing(`s3.${apiAction}.execution_time`, duration);
}

module.exports = { logApiCall, logApiResponseTime, logDbQueryTime, logS3Call };
