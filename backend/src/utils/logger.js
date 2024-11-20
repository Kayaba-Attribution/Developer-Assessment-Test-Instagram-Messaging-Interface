// src/utils/logger.js
const winston = require("winston");
const { config, isDev } = require("../config");

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    isDev ? winston.format.colorize() : winston.format.json(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.File({
      filename: `${config.logsDir}/error.log`,
      level: "error",
      maxsize: config.logRetention.maxSize,
      maxFiles: config.logRetention.maxFiles,
    }),
    new winston.transports.File({
      filename: `${config.logsDir}/combined.log`,
      maxsize: config.logRetention.maxSize,
      maxFiles: config.logRetention.maxFiles,
    }),
    new winston.transports.Console(),
  ],
});

module.exports = logger;
