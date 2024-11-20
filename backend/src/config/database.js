// src/config/database.js
const { MongoClient, ServerApiVersion } = require("mongodb");
const logger = require("../utils/logger");

class Database {
  constructor() {
    this.client = null;
    this.db = null;
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
      this.db = this.client.db(process.env.DB_NAME || "instagram_messenger");

      // Verify connection
      await this.client.db("admin").command({ ping: 1 });
      logger.info("Successfully connected to MongoDB");

      return this.db;
    } catch (error) {
      logger.error("MongoDB connection error:", error);
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

module.exports = new Database();
