const winston = require('winston');

winston.addColors({
    error: 'red',
    warn: 'magenta',
    info: 'green',
    http: 'white',
    debug: 'gray',
});
const logger = winston.createLogger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
    },
    level: process.env.LOG_LEVEL || 'debug',
    format: winston.format.combine(
        winston.format.splat(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize({ all: true }),
        winston.format.printf(
            (info) => `${info.timestamp} ${info.level} ${info.message}`,
        ),
    ),
    transports: [
        new winston.transports.Console({
            stderrLevels: ['error'],
            handleExceptions: true,
        }),
    ],
});

module.exports = {
    logger
}
