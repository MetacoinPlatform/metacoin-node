const winston = require('winston');

winston.addColors({
	error: 'red',
	warn: 'magenta',
	info: 'green',
	http: 'white',
	debug: 'gray',
});

const logger = new winston.Logger({
	level: process.env.LOG_LEVEL || 'debug',

	levels: {
		error: 0,
		warn: 1,
		info: 2,
		http: 3,
		debug: 4,
	},

	transports: [
		new winston.transports.Console({
			colorize: true,
			timestamp: function () {
				const d = new Date();

				const pad = (v) => String(v).padStart(2, '0');

				return (
					d.getFullYear() + '-' +
					pad(d.getMonth() + 1) + '-' +
					pad(d.getDate()) + ' ' +
					pad(d.getHours()) + ':' +
					pad(d.getMinutes()) + ':' +
					pad(d.getSeconds())
				);
			},

			formatter: function (options) {
				return (
					options.timestamp() +
					' ' +
					options.level +
					': ' +
					options.message
				);
			},

			stderrLevels: ['error'],
			handleExceptions: true
		})
	]
});

module.exports = { logger };
