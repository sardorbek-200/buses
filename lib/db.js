const mongoose = require("mongoose");
const models = require("./models");

let connection;

async function connectDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (connection) return connection;
  connection = mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    .then(async () => {
      await Promise.all(Object.values(models).map((model) => model.init()));
      return mongoose;
    });
  try {
    await connection;
    return connection;
  } catch (error) {
    connection = undefined;
    throw error;
  }
}

module.exports = connectDb;
