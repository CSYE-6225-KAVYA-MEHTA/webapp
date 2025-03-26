require("dotenv").config(); // Load environment variables
const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage for file uploads
const { healthCheck } = require("./controllers/healthCheckController");

// Import the File model from your models (assumed to be defined in your index.js)
const { File } = require("./models/index");

const logger = require("./logger");

const app = express();
const SERVER_PORT = process.env.SERVER_PORT;

// Middleware to catch JSON parsing errors
app.use((req, res, next) => {
  express.json()(req, res, (err) => {
    if (err) {
      // console.error("JSON parse error:", err.message);
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
  // Reject if any query parameters are provided
  if (Object.keys(req.query).length > 0) {
    logger.warn(
      `[${
        req.method
      } /v1/file] Rejected due to unexpected query parameters: ${JSON.stringify(
        req.query
      )}`
    );
    return res.status(400).send();
  }
  // Reject if an unexpected Authorization header is provided
  if (req.headers.authorization) {
    logger.warn(
      `[${req.method} /v1/file] Rejected due to unexpected Authorization header`
    );
    return res.status(400).send();
  }
  next();
}

// Middleware to validate that no extra form fields are present in POST requests
function validateFileBody(req, res, next) {
  // For POST requests, ensure that req.body does not contain any keys
  if (req.method === "POST" && req.body && Object.keys(req.body).length > 0) {
    logger.warn(
      `[POST /v1/file] Rejected due to unexpected request body: ${JSON.stringify(
        req.body
      )}`
    );
    return res.status(400).send();
  }
  next();
}

function multerSingleFile(req, res, next) {
  // This tells Multer to look for a field named "profilepic"
  upload.single("profilepic")(req, res, (err) => {
    if (err) {
      // Check if the error is a MulterError (like "Unexpected field")
      if (err instanceof multer.MulterError) {
        logger.warn(
          `[POST /v1/file] Rejected due to Multer error: ${err.message}`
        );
        return res.status(400).send();
      }
      // If it's some other error, pass it to the final error handler
      return next(err);
    }
    next();
  });
}

// Apply the global middleware to all /v1/file routes
app.use("/v1/file", validateFileGlobal);

app.post("/v1/file", multerSingleFile, validateFileBody, async (req, res) => {
  try {
    if (!req.file) {
      logger.warn(
        "[POST /v1/file] Rejected because no file was provided in the request"
      );
      return res.status(400).send();
    }

    // Initialize the S3 client
    const id = uuidv4();
    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET; // S3 bucket name from .env
    const params = {
      Bucket: bucketName,
      Key: `${id}-${req.file.originalname}`, // In production, consider adding a unique prefix/timestamp
      Body: req.file.buffer,
    };

    const s3Result = await s3.upload(params).promise();

    // Save file metadata in the database
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

// Disallow any HTTP methods on /v1/file (without ID) other than POST
app.all("/v1/file", (req, res) => {
  if (req.method !== "POST") {
    logger.warn(`[${req.method} /v1/file] Rejected; only POST is allowed`);
    return res.status(405).send();
  }
});

app.head("/v1/file/:id", (req, res) => {
  logger.warn(`[HEAD /v1/file/:id] Rejected; method not allowed`);
  return res.status(405).send();
});

// GET /v1/file/:id - Retrieve file metadata (returns a presigned S3 URL and metadata)
app.get("/v1/file/:id", async (req, res) => {
  try {
    const fileRecord = await File.findByPk(req.params.id);
    if (!fileRecord) {
      logger.warn(`[GET /v1/file/:id] File not found for ID: ${req.params.id}`);
      return res.status(404).send();
    }

    // Optionally generate a pre-signed URL for downloading the file directly from S3
    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET;
    const params = {
      Bucket: bucketName,
      Key: fileRecord.filename, // The S3 key is assumed to be stored in fileRecord.filename
      Expires: 60, // URL valid for 60 seconds (adjust as needed)
    };
    const signedUrl = s3.getSignedUrl("getObject", params);

    logger.info(`File metadata retrieved for ID: ${req.params.id}`);
    return res.status(200).json({
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      s3Path: fileRecord.s3Path,
      downloadUrl: signedUrl, // Include a presigned URL to download the file
    });
  } catch (error) {
    // console.error("Error retrieving file metadata:", error);
    logger.error("Error retrieving file metadata: " + error);
    return res.status(503).send();
  }
});

// Delete a file from S3 and remove its record from the database
app.delete("/v1/file/:id", async (req, res) => {
  try {
    const fileRecord = await File.findByPk(req.params.id);
    if (!fileRecord) {
      logger.warn(
        `[DELETE /v1/file/:id] File not found for ID: ${req.params.id}`
      );
      return res.status(404).send();
    }

    // Delete the file from S3
    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET;
    const params = {
      Bucket: bucketName,
      Key: fileRecord.filename, // Assumes fileRecord.filename is the S3 key
    };
    await s3.deleteObject(params).promise();

    // Remove the file record from the database
    await fileRecord.destroy();

    logger.info(`File deleted successfully: ${req.params.id}`);
    return res.status(204).send();
  } catch (error) {
    // console.error("Error deleting file:", error);
    logger.error("Error deleting file: " + error);
    return res.status(503).send();
  }
});

// Disallow all other methods on /v1/file/:id
app.all("/v1/file/:id", (req, res) => {
  // If it's not GET, DELETE, or HEAD, return 405
  logger.warn(
    `[${req.method} /v1/file/:id] Rejected; only GET, DELETE are allowed`
  );
  return res.status(405).send();
});

app.all("*", (req, res) => {
  logger.warn(`[${req.method} ${req.path}] Rejected; route not defined`);
  return res.status(405).send();
});

// Start the server
if (require.main === module) {
  const server = app.listen(SERVER_PORT, () => {
    logger.info(`Server is running on port ${SERVER_PORT}`);
    // console.log(`Server is running`);
  });
}

module.exports = { app };
