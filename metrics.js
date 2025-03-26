const StatsD = require("node-statsd");

const statsd = new StatsD({ host: "localhost", port: 8125 });

// Log API call counts
function logApiCall(apiName) {
  statsd.increment(`api.${apiName}.calls`);
}

// Log API response times (in milliseconds)
function logApiResponseTime(apiName, duration) {
  statsd.timing(`api.${apiName}.response_time`, duration);
}

// Log database query execution time (in milliseconds)
function logDbQueryTime(queryName, duration) {
  statsd.timing(`db.${queryName}.execution_time`, duration);
}

// Log AWS S3 operation time (in milliseconds)
function logS3Call(apiAction, duration) {
  statsd.timing(`s3.${apiAction}.execution_time`, duration);
}

module.exports = { logApiCall, logApiResponseTime, logDbQueryTime, logS3Call };
