require("dotenv").config(); // Load environment variables
const express = require("express");
const { healthCheck } = require("./controllers/healthCheckController");

const app = express();
const PORT = process.env.PORT;

// Middleware to catch JSON parsing errors
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      console.error("JSON parse error:", err.message);
      return res.status(400).send();
    }
    next();
  });
});

// Routes
app.get("/healthz", healthCheck);
app.all("/healthz", (req, res) => {
  res.status(405).header("Cache-Control", "no-cache").send();
});

// Start the server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = { app };
