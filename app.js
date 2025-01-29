require("dotenv").config(); // Load environment variables
const express = require("express");
const { healthCheck } = require("./controllers/healthCheckController");

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(express.json());

// Routes
app.get("/healthz", healthCheck);
app.all("/healthz", (req, res) => {
  res.status(405).header("Cache-Control", "no-cache").send();
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
