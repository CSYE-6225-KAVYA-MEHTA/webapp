const { Check } = require("../models/index");
const logger = require("../logger");
const { recordAPICall } = require("../metrics");

const healthCheck = async (req, res) => {
  const startTime = Date.now();
  try {
    if (req.method !== "GET") {
      logger.warn(`Health check received unsupported method: ${req.method}`);
      recordAPICall("GET_/healthz", Date.now() - startTime, 405);
      return res
        .status(405)
        .header("Cache-Control", "no-cache, no-store, must-revalidate")
        .send();
    }
    if (
      Object.keys(req.body).length > 0 ||
      Object.keys(req.query).length > 0 ||
      req.get("Content-Length") > 0 ||
      req.get("Authorization") ||
      req.get("authentication")
    ) {
      logger.warn(
        "Health check request rejected due to unexpected payload or headers."
      );
      recordAPICall("GET_/healthz", Date.now() - startTime, 400);
      return res.status(400).header("Cache-Control", "no-cache").send();
    }
    await Check.create();
    logger.info("Health check processed successfully.");
    recordAPICall("GET_/healthz", Date.now() - startTime, 200);
    return res
      .status(200)
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .send();
  } catch (error) {
    logger.error("Health check failed:", error);
    recordAPICall("GET_/healthz", Date.now() - startTime, 503);
    return res
      .status(503)
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .send();
  }
};

const healthCheckcicd = async (req, res) => {
  const startTime = Date.now();
  try {
    if (req.method !== "GET") {
      logger.warn(`Health check received unsupported method: ${req.method}`);
      recordAPICall("GET_/cicd", Date.now() - startTime, 405);
      return res
        .status(405)
        .header("Cache-Control", "no-cache, no-store, must-revalidate")
        .send();
    }
    if (
      Object.keys(req.body).length > 0 ||
      Object.keys(req.query).length > 0 ||
      req.get("Content-Length") > 0 ||
      req.get("Authorization") ||
      req.get("authentication")
    ) {
      logger.warn(
        "Health check request rejected due to unexpected payload or headers."
      );
      recordAPICall("GET_/cicd", Date.now() - startTime, 400);
      return res.status(400).header("Cache-Control", "no-cache").send();
    }
    await Check.create();
    logger.info("Health check processed successfully.");
    recordAPICall("GET_/cicd", Date.now() - startTime, 200);
    return res
      .status(200)
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .send();
  } catch (error) {
    logger.error("Health check failed:", error);
    recordAPICall("GET_/cicd", Date.now() - startTime, 503);
    return res
      .status(503)
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .send();
  }
};

module.exports = { healthCheck };
module.exports = { healthCheckcicd };
