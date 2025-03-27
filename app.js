require("dotenv").config();
const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const upload = multer({ storage: multer.memoryStorage() });
const { healthCheck } = require("./controllers/healthCheckController");

// Import the File model from your models
const { File } = require("./models/index");

const logger = require("./logger");
// Import metric functions
const { recordAPICall, recordS3Operation } = require("./metrics");

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

// Health check route (delegated to the healthCheck controller which now includes explicit metric calls)
app.get("/healthz", healthCheck);
app.all("/healthz", (req, res) => {
  logger.warn(`Received ${req.method} request on /healthz; returning 405`);
  recordAPICall("GET_/healthz", 0, 405);
  res.status(405).header("Cache-Control", "no-cache").send();
});

// Global middleware for /v1/file endpoints
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
  // Expecting the file under the "profilepic" field.
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

// Apply global middleware to /v1/file routes.
app.use("/v1/file", validateFileGlobal);

app.post("/v1/file", multerSingleFile, validateFileBody, async (req, res) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      logger.warn("Rejected because no file was provided in the request");
      recordAPICall("POST_/v1/file", Date.now() - startTime, 400);
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
    recordS3Operation("upload", s3Duration);

    const fileRecord = await File.create({
      fileId: id,
      filename: req.file.originalname,
      s3Path: s3Result.Location,
      upload_date: new Date().toISOString().split("T")[0],
    });

    logger.info(`File uploaded successfully: ${fileRecord.fileId}`);
    recordAPICall("POST_/v1/file", Date.now() - startTime, 201);
    return res.status(201).json({
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      s3Path: fileRecord.s3Path,
      upload_date: fileRecord.upload_date.toISOString().split("T")[0],
    });
  } catch (error) {
    logger.error("Failed during file upload: " + error);
    recordAPICall("POST_/v1/file", Date.now() - startTime, 503);
    return res
      .status(503)
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .header("Pragma", "no-cache")
      .header("X-Content-Type-Options", "nosniff")
      .send();
  }
});

app.all("/v1/file", (req, res) => {
  if (req.method !== "POST") {
    logger.warn("Rejected; only POST is allowed");
    recordAPICall("POST_/v1/file", 0, 405);
    return res.status(405).send();
  }
});

app.head("/v1/file/:id", (req, res) => {
  logger.warn("Rejected; HEAD method is not allowed on /v1/file/:id");
  recordAPICall("HEAD_/v1/file", 0, 405);
  return res.status(405).send();
});

app.get("/v1/file/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const fileRecord = await File.findByPk(req.params.id);
    if (!fileRecord) {
      logger.warn(`File not found for ID: ${req.params.id}`);
      recordAPICall("GET_/v1/file", Date.now() - startTime, 404);
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
    recordAPICall("GET_/v1/file", Date.now() - startTime, 200);
    return res.status(200).json({
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      s3Path: fileRecord.s3Path,
      downloadUrl: signedUrl,
    });
  } catch (error) {
    logger.error("Error retrieving file metadata: " + error);
    recordAPICall("GET_/v1/file", Date.now() - startTime, 503);
    return res.status(503).send();
  }
});

app.delete("/v1/file/:id", async (req, res) => {
  const startTime = Date.now();
  try {
    const fileRecord = await File.findByPk(req.params.id);
    if (!fileRecord) {
      logger.warn(`File not found for ID: ${req.params.id}`);
      recordAPICall("DELETE_/v1/file", Date.now() - startTime, 404);
      return res.status(404).send();
    }

    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET;
    const params = { Bucket: bucketName, Key: fileRecord.filename };

    const s3Start = Date.now();
    await s3.deleteObject(params).promise();
    const s3Duration = Date.now() - s3Start;
    recordS3Operation("delete", s3Duration);

    await fileRecord.destroy();
    logger.info(`File deleted successfully: ${req.params.id}`);
    recordAPICall("DELETE_/v1/file", Date.now() - startTime, 204);
    return res.status(204).send();
  } catch (error) {
    logger.error("Error deleting file: " + error);
    recordAPICall("DELETE_/v1/file", Date.now() - startTime, 503);
    return res.status(503).send();
  }
});

app.all("/v1/file/:id", (req, res) => {
  logger.warn("Rejected; only GET, DELETE are allowed on /v1/file/:id");
  recordAPICall("OTHER_/v1/file", 0, 405);
  return res.status(405).send();
});

app.all("*", (req, res) => {
  logger.warn("Rejected; route not defined");
  recordAPICall("OTHER", 0, 405);
  return res.status(405).send();
});

if (require.main === module) {
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`Server is running on port ${SERVER_PORT}`);
  });
}

module.exports = { app };
