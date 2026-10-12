const winston = require('winston');

const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: 'info', // default level
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Dynamically updates the logger level at runtime without restarting the container
 */
function setLogLevel(newLevel) {
  const validLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  const levelToSet = validLevels.includes(newLevel.toLowerCase()) ? newLevel.toLowerCase() : 'info';
  logger.level = levelToSet;
  logger.transports.forEach(t => {
    t.level = levelToSet;
  });
  logger.info(`[LOGGER] Dynamic Console Log Level updated to: ${levelToSet.toUpperCase()}`);
  return levelToSet;
}

module.exports = {
  logger,
  setLogLevel
};
