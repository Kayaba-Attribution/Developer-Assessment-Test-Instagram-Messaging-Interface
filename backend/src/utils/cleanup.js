// src/utils/cleanup.js
const fs = require("fs").promises;
const path = require("path");
const logger = require("./logger");
const { config, isDev } = require("../config");
const { DIRECTORIES } = require("../config/constants");

async function cleanup() {
  if (!config.cleanupOldFiles) return;

  for (const dir of DIRECTORIES) {
    try {
      const dirPath = config[`${dir.replace("debug_", "")}Dir`];
      if (
        !(await fs
          .access(dirPath)
          .then(() => true)
          .catch(() => false))
      )
        continue;

      const files = await fs.readdir(dirPath);
      const now = Date.now();
      const threshold = config.cleanupThreshold * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();

        if (age > threshold) {
          await fs.unlink(filePath);
          if (isDev) {
            logger.debug(`Cleaned up old file: ${file}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Cleanup error in ${dir}:`, error);
    }
  }
}

module.exports = cleanup;
