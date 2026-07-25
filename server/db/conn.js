const mongoose = require("mongoose");

const DB = process.env.MONGODB_URI || process.env.DATABASE;

if (DB) {
  mongoose.connect(DB)
    .then(() => console.log("Database Connected"))
    .catch((err) => {
      console.error("Database connection error:", err);
      console.warn("Skipping MongoDB connection and continuing startup.");
    });
} else {
  console.warn("No MongoDB URI configured; skipping database connection.");
}