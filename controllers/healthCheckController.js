const { Check } = require("../models/index");
const healthCheck = async (req, res) => {
  try {
    // Only allow GET requests
    if (req.method !== "GET") {
      return res
        .status(405)
        .header("Cache-Control", "no-cache", "no-store", "must-revalidate")
        .send();
    }
    //Object.keys(req.body).params.length > 0
    //
    // Reject requests with a payload
    if (
      Object.keys(req.body).length > 0 ||
      Object.keys(req.query).length > 0 ||
      req.get("Content-Length") > 0
    ) {
      return res.status(400).header("Cache-Control", "no-cache").send();
    }

    // Insert a new record in the Check table
    await Check.create();
    return res
      .status(200)
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .send();
  } catch (error) {
    console.error("Health check failed:", error);
    return res
      .status(503)
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .send();
  }
};

module.exports = { healthCheck };
