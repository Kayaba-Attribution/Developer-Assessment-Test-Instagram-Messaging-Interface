// src/config/database.js
const { MongoClient, ServerApiVersion } = require("mongodb");
class Database {
  constructor(logger) {
    this.logger = logger;
    this.client = null;
    this.db = null;

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is required");
    }
    if(!this.logger) {
      throw new Error("Logger is required");
    }

    logger.info("Database initialized");
  }

  async connect() {
    if (this.db) return this.db;

    try {
      const uri = process.env.MONGODB_URI;
      this.client = new MongoClient(uri, {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        },
      });

      await this.client.connect();

      // Verify connection
      await this.client.db("admin").command({ ping: 1 });
      this.logger.info("Successfully connected to MongoDB");

      this.db = this.client.db(process.env.DB_NAME || "instagram_messenger");

      return this.db;
    } catch (error) {
      this.logger.error("MongoDB connection error:", error);
      throw error;
    }
  }

  async getCollection(name) {
    if (!this.db) await this.connect();
    return this.db.collection(name);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}

module.exports = Database;
