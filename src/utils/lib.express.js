/* jshint esversion: 6 */
/* jshint node: true */
"use strict";

const { logger } = require('../utils/lib.winston')

function wrapRoute(callback) {
    return function (req, res, next) {
        callback(req, res, next)
            .catch(next)
    }
}

function errorHandler(err, req, res, next) {
    if (err.message.indexOf('not found') > -1) {
        default_response(req, res, 404, err.message);
    } else {
        logger.error('%s', err);
        default_response(req, res, 412, err.message);
    }
}

async function default_response_process(error, req, res, body, saveKey) {
    if (error != null) {
        default_response(req, res, 412, "MTC Server connection error");
        return;
    }

    let data;
    try {
        data = JSON.parse(body.text);
    } catch (err) {
        default_response(req, res, 400, 'MTC Main node response error');
        return;
    }
    if (data == null || data.result === undefined) {
        default_response(req, res, 400, 'MTC Main node response error');
        return;
    }

    if (data.result != 'SUCCESS') {
        default_response(req, res, 412, data.msg);
    } else {
        if (typeof saveKey === typeof "" && saveKey.length > 0) {
            try {
                await req.db.put(saveKey, JSON.stringify(data.data))
            } catch (err) {
                logger.error(err)
            }
        }
        default_response(req, res, 200, data.data)
    }
}


function default_txresponse_process(error, req, res, body, extra_key) {
    if (error != null) {
        default_response(req, res, 412, "MTC Server connection error");
        return;
    }

    var data;
    try {
        data = JSON.parse(body.text);
    } catch (err) {
        default_response(req, res, 400, 'MTC Main node response parsing error');
        return;
    }
    if (data == null || data.result === undefined) {
        default_response(req, res, 400, 'MTC Main node response error');
        return;
    }
    if (data.result != 'SUCCESS') {
        default_response(req, res, 412, data.msg);
        return;
    }

    let rv = {
        txid: data.data
    };

    if (extra_key && data.msg) {
        rv[extra_key] = data.msg;
    }
    default_response(req, res, 200, rv);
}

function txresponse_process_v2(error, req, res, body, extra_key) {
    let rv = {
        txid: '',
        result: 'ERROR',
        message: '',
        data: '',
        code: '0'
    };

    if (error != null) {
        rv.message = 'MTC Server connection error'
        default_response(req, res, 412, rv);
        return;
    }

    var data;
    try {
        data = JSON.parse(body.text);
    } catch (err) {
        rv.message = 'MTC Main node response parsing error'
        default_response(req, res, 400, rv);
        return;
    }
    if (data == null || data.result === undefined) {
        rv.message = 'MTC Main node response error'
        default_response(req, res, 400, rv);
        return;
    }
    if (data.result != 'SUCCESS') {
        if (data.msg.substring(4, 5) == ",") {
            rv.message = data.msg.substring(5)
            rv.code = data.msg.substring(0, 4)
        } else {
            rv.message = data.msg
        }

        default_response(req, res, 412, rv);
        return;
    }

    rv.txid = data.data
    rv.result = 'SUCCESS'
    if (extra_key && data.msg) {
        rv[extra_key] = data.msg;
    }
    default_response(req, res, 200, rv);
}

function default_response(req, res, status_code, return_data) {
    let ip = req.headers['x-forwarded-for'] || req.ip
    if (typeof(ip) != undefined) {
        ip = ip.replace('::ffff:', '').replace('::1', '127.0.0.1')
    } else {
        ip = "unknown"
    }
    let agent = req.headers['user-agent'] || '-'
    let nowTS = new Date().getTime();

    if (status_code == '200') {
        logger.http("%s %s %s %s %sms %s",
            ip.replace('::ffff:', ''),
            req.method,
            req.url,
            status_code,
            (nowTS - req.requestTime.getTime()),
            agent)
    } else {
        logger.http("%s %s %s %s %sms %s \"%s\"",
            ip.replace('::ffff:', ''),
            req.method,
            req.url,
            status_code,
            (nowTS - req.requestTime.getTime()),
            agent,
            return_data || "")
    }
    try {
        res.status(status_code)
            .header('X-METACOIN-NODE', "v2.2.0")
            .send(return_data)
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    default_response_process,
    default_txresponse_process,
    default_response,

    txresponse_process_v2,

    errorHandler,
    wrapRoute
}
