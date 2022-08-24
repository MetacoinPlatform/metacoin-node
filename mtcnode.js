/* jshint esversion: 6 */
/* jshint node: true */
"use strict";

const app_ver = "ver 2.2.0"
const app_title = "MetaCoin node"
const config = require('./config.json')

const express = require('express')
const { logger } = require('./src/utils/lib.winston')
const { errorHandler } = require('./src/utils/lib.express')

// rocksdb
const pluginRocksDB = require('./src/plugins/express-rocksdb')
const rocksDB = pluginRocksDB(config.DB_PATH)

const  MetacoinBlockProcessor  = require('./src/plugins/mtcnode-block')

// setup express
const app = express()
app.disable('x-powered-by')
app.use(express.json({
    limit: '50mb'
}))

app.use(express.urlencoded({
    limit: '50mb',
    extended: true
}));

// Save request time
app.use((req, res, next) => {
    req.requestTime = new Date()
    next()
});

// rocksdb
app.use(rocksDB)
app.use(MetacoinBlockProcessor(rocksDB))

// Add Router 
app.use(require('./src/router'))

// error handler 
app.use(errorHandler);

try {
    app.listen(config.port, () => {
        logger.info('%s %s listening on port %d', app_title, app_ver, config.port);
    });
} catch (err) {
    logger.error(err)
    logger.error('%s %s port %d bind error', app_title, app_ver, config.port);
}