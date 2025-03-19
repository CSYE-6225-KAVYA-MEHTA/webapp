require("dotenv").config(); // Load environment variables
const express = require("express");
const AWS = require("aws-sdk");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage for file uploads
const { healthCheck } = require("./controllers/healthCheckController");

// Import the File model from your models (assumed to be defined in your index.js)
const { File } = require("./models/index");

const app = express();
const SERVER_PORT = process.env.SERVER_PORT;

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

// AWS.config.update({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID, // AWS Access Key from .env
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // AWS Secret Key from .env
//   region: process.env.AWS_REGION, // AWS Region from .env
// });

// Routes
app.get("/healthz", healthCheck);
app.all("/healthz", (req, res) => {
  res.status(405).header("Cache-Control", "no-cache").send();
});

app.post("/v1/file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // Initialize the S3 client
    const s3 = new AWS.S3();
    const bucketName = process.env.S3_BUCKET; // S3 bucket name from .env
    const params = {
      Bucket: bucketName,
      Key: req.file.originalname, // In production, consider adding a unique prefix/timestamp
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };
    const s3Result = await s3.upload(params).promise();

    // Save file metadata in the database
    const fileRecord = await File.create({
      filename: req.file.originalname,
      s3Path: s3Result.Location,
      metadata: { contentType: req.file.mimetype, size: req.file.size },
    });

    return res.status(201).json({
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      s3Path: fileRecord.s3Path,
      metadata: fileRecord.metadata,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({ error: "File upload failed" });
  }
});

// Disallow any HTTP methods on /v1/file (without ID) other than POST
app.all("/v1/file", (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "HTTP Method not supported" });
  }
});

app.head("/v1/file/:id", (req, res) => {
  return res.status(405).json({ error: "HTTP Method not supported" });
});

// GET /v1/file/:id - Retrieve file metadata (returns a presigned S3 URL and metadata)
app.get("/v1/file/:id", async (req, res) => {
  try {
    const fileRecord = await File.findByPk(req.params.id);
    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
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

    return res.status(200).json({
      fileId: fileRecord.fileId,
      filename: fileRecord.filename,
      s3Path: fileRecord.s3Path,
      metadata: fileRecord.metadata,
      downloadUrl: signedUrl, // Include a presigned URL to download the file
    });
  } catch (error) {
    console.error("Error retrieving file metadata:", error);
    return res.status(500).json({ error: "Failed to retrieve file" });
  }
});

// DELETE /v1/file/:id - Delete a file from S3 and remove its record from the database
app.delete("/v1/file/:id", async (req, res) => {
  try {
    const fileRecord = await File.findByPk(req.params.id);
    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
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

    return res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ error: "Failed to delete file" });
  }
});

// Disallow all other methods on /v1/file/:id
app.all("/v1/file/:id", (req, res) => {
  // If it's not GET, DELETE, or HEAD, return 405
  return res.status(405).json({ error: "HTTP Method not supported" });
});

app.all("*", (req, res) => {
  return res.status(405).json({ error: "HTTP Method not supported" });
});

// Start the server
if (require.main === module) {
  const server = app.listen(SERVER_PORT, () => {
    console.log(`Server is running on http://${DB_HOST}:${SERVER_PORT}`);
  });
}

module.exports = { app };
