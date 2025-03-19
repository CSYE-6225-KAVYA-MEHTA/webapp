const Sequelize = require("sequelize");
require("dotenv").config();

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
  }
);

// Define the Check model
const Check = sequelize.define(
  "Check",
  {
    checkId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    datetime: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  },
  {
    timestamps: false,
  }
);

const File = sequelize.define(
  "File",
  {
    fileId: {
      type: Sequelize.UUID, // Use UUID type
      defaultValue: Sequelize.UUIDV4, // Automatically generate UUID
      primaryKey: true,
      allowNull: false,
    },
    filename: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    s3Path: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Test connection to the database
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    // Synchronize the Check model with the database
    await Check.sync({ alter: true }); // Adjust database to match model
    console.log("Check model synchronized with the database.");

    await File.sync({ alter: true });
    console.log("File model synchronized with the database.");
  } catch (error) {
    console.error(
      "Unable to connect to the database or synchronize the model:",
      error
    );
  }
})();

module.exports = { Check, File };
