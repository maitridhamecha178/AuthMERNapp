const mongoose = require("mongoose");

const DB = process.env.MONGODB_URI || process.env.DATABASE || "mongodb://127.0.0.1:27017/Authusers";

mongoose.connect(DB)
  .then(() => console.log("Database Connected"))
  .catch((err) => {
    console.error("Database connection error:", err);
  });