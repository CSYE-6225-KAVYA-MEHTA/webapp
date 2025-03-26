require("dotenv").config();
const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const upload = multer({ storage: multer.memoryStorage() });
const { healthCheck } = require("./controllers/healthCheckController");

// Import the File model (from index.js)
const { File } = require("./models/index");

const logger = require("./logger"); // Logging module
const {
  logApiCall,
  logApiResponseTime,
  logDbQueryTime,
  logS3Call,
} = require("./metrics"); // Metrics module

const app = express();
const SERVER_PORT = process.env.SERVER_PORT || 8080;

app.use(express.json());

// Middleware to catch JSON parsing errors
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      logger.error("JSON parse error: " + err.message);
      return res.status(400).send();
    }
    next();
  });
});

// Routes
app.get("/healthz", healthCheck);
app.all("/healthz", (req, res) => {
  logger.warn(`Received ${req.method} request on /healthz; returning 405`);
  res.status(405).header("Cache-Control", "no-cache").send();
});

// Middleware for /v1/file endpoints

// Global middleware to validate unexpected query parameters and headers
function validateFileGlobal(req, res, next) {
  if (Object.keys(req.query).length > 0) {
    logger.warn(`Unexpected query parameters: ${JSON.stringify(req.query)}`);
    return res.status(400).send();
  }
  if (req.headers.authorization) {
    logger.warn("Unexpected Authorization header");
    return res.status(400).send();
  }
  next();
}

// Middleware to validate that no extra form fields are present in POST requests
function validateFileBody(req, res, next) {
  if (req.method === "POST" && req.body && Object.keys(req.body).length > 0) {
    logger.warn(`Unexpected request body: ${JSON.stringify(req.body)}`);
    return res.status(400).send();
  }
  next();
}

function multerSingleFile(req, res, next) {
  upload.single("profilepic")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        logger.warn(`Multer error: ${err.message}`);
        return res.status(400).send();
      }
      return next(err);
    }
    next();
  });
}

// Apply global middleware to /v1/file routes
app.use("/v1/file", validateFileGlobal);

// Middleware to track API request times and count calls
app.use((req, res, next) => {
  logApiCall(req.url); // Increment API call count
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logApiResponseTime(req.url, duration); // Record response time
    logger.info(
      `Request: ${req.method} ${req.url} | Response Time: ${duration}ms`
    );
  });
  next();
});

app.post("/v1/file", multerSingleFile, validateFileBody, async (req, res) => {
  try {
    if (!req.file) {
      logger.warn("Rejected because no file was provided in the request");
      return res.status(400).send();
    }

    const id = uuidv4();
    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET;
    const params = {
      Bucket: bucketName,
      Key: `${id}-${req.file.originalname}`,
      Body: req.file.buffer,
    };

    const s3Start = Date.now();
    const s3Result = await s3.upload(params).promise();
    const s3Duration = Date.now() - s3Start;
    logS3Call("upload", s3Duration);

    const fileRecord = await File.create({
      fileId: id,
      filename: req.file.originalname,
      s3Path: s3Result.Location,
      upload_date: new Date().toISOString().split("T")[0],
    });

    logger.info(`File uploaded successfully: ${fileRecord.fileId}`);
    return res.status(201).json({
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      s3Path: fileRecord.s3Path,
      upload_date: fileRecord.upload_date.toISOString().split("T")[0],
    });
  } catch (error) {
    logger.error("Failed during file upload: " + error);
    return res
      .status(503)
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .send();
  }
});

// Disallow any methods on /v1/file (without ID) other than POST
app.all("/v1/file", (req, res) => {
  if (req.method !== "POST") {
    logger.warn("Rejected; only POST is allowed");
    return res.status(405).send();
  }
});

app.head("/v1/file/:id", (req, res) => {
  logger.warn("Rejected; HEAD method is not allowed on /v1/file/:id");
  return res.status(405).send();
});

app.get("/v1/file/:id", async (req, res) => {
  try {
    const fileRecord = await File.findByPk(req.params.id);
    if (!fileRecord) {
      logger.warn(`File not found for ID: ${req.params.id}`);
      return res.status(404).send();
    }

    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET;
    const params = {
      Bucket: bucketName,
      Key: fileRecord.filename,
      Expires: 60,
    };
    const signedUrl = s3.getSignedUrl("getObject", params);

    logger.info(`File metadata retrieved for ID: ${req.params.id}`);
    return res.status(200).json({
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      s3Path: fileRecord.s3Path,
      downloadUrl: signedUrl,
    });
  } catch (error) {
    logger.error("Error retrieving file metadata: " + error);
    return res.status(503).send();
  }
});

app.delete("/v1/file/:id", async (req, res) => {
  try {
    const fileRecord = await File.findByPk(req.params.id);
    if (!fileRecord) {
      logger.warn(`File not found for ID: ${req.params.id}`);
      return res.status(404).send();
    }

    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET;
    const params = { Bucket: bucketName, Key: fileRecord.filename };

    const s3Start = Date.now();
    await s3.deleteObject(params).promise();
    const s3Duration = Date.now() - s3Start;
    logS3Call("delete", s3Duration);

    await fileRecord.destroy();
    logger.info(`File deleted successfully: ${req.params.id}`);
    return res.status(204).send();
  } catch (error) {
    logger.error("Error deleting file: " + error);
    return res.status(503).send();
  }
});

app.all("/v1/file/:id", (req, res) => {
  logger.warn("Rejected; only GET, DELETE are allowed on /v1/file/:id");
  return res.status(405).send();
});

app.all("*", (req, res) => {
  logger.warn("Rejected; route not defined");
  return res.status(405).send();
});

if (require.main === module) {
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`Server is running on port ${SERVER_PORT}`);
  });
}

module.exports = { app };
