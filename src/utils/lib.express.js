/* jshint esversion: 6 */
/* jshint node: true */
"use strict";

const { logger } = require('../utils/lib.winston')

function errorHandler(err, req, res, next) {
    if (err.message.indexOf('not found') > -1) {
        response(req, res, 404, message);
    } else {
        logger.error('%s', err);
        response(req, res, 412, err.message);
    }
}

function default_response_process(error, req, res, body, saveKey) {
    if (error != null) {
        response(req, res, 412, "MTC Server connection error");
        return;
    }

    var data;
    try {
        data = JSON.parse(body.text);
    } catch (err) {
        response(req, res, 400, 'MTC Main node response error');
        return;
    }
    if (data == null || data.result === undefined) {
        response(req, res, 400, 'MTC Main node response error');
        return;
    }

    if (saveKey === undefined) {
        if (data.result != 'SUCCESS') {
            response(req, res, 412, data.msg);
        } else {
            response(req, res, 200, data.data);
        }
    } else {
        if (data.result != 'SUCCESS') {
            response(req, res, 404, data.msg);
        } else {
            req.db.put(saveKey, data.data, function () {
                response(req, res, 200, data.data);
            });
        }
    }

}


function default_txresponse_process(error, req, res, body, extra_key) {
    if (error != null) {
        response(req, res, 412, "MTC Server connection error");
        return;
    }

    var data;
    try {
        data = JSON.parse(body.text);
    } catch (err) {
        response(req, res, 400, 'MTC Main node response parsing error');
        return;
    }
    if (data == null || data.result === undefined) {
        response(req, res, 400, 'MTC Main node response error');
        return;
    }
    if (data.result != 'SUCCESS') {
        response(req, res, 412, data.msg);
        return;
    }

    let rv = {
        txid: data.data
    };

    if (extra_key && data.msg) {
        rv[extra_key] = data.msg;
    }
    response(req, res, 200, rv);
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
        response(req, res, 412, rv);
        return;
    }

    var data;
    try {
        data = JSON.parse(body.text);
    } catch (err) {
        rv.message = 'MTC Main node response parsing error'
        response(req, res, 400, rv);
        return;
    }
    if (data == null || data.result === undefined) {
        rv.message = 'MTC Main node response error'
        response(req, res, 400, rv);
        return;
    }
    if (data.result != 'SUCCESS') {
        if (data.msg.substring(4, 5) == ",") {
            rv.message = data.msg.substring(5)
            rv.code = data.msg.substring(0, 4)
        } else {
            rv.message = data.msg
        }

        response(req, res, 412, rv);
        return;
    }

    rv.txid = data.data
    rv.result = 'SUCCESS'
    if (extra_key && data.msg) {
        rv[extra_key] = data.msg;
    }
    response(req, res, 200, rv);
}

function response(req, res, status_code, message) {
    let ip = req.headers['x-forwarded-for'] || req.ip
    ip = ip.replace('::ffff:', '').replace('::1', '127.0.0.1')
    let agent = req.headers['user-agent'] || '-'
    let nowTS = new Date().getTime();
    logger.http("%s %s %s %s %sms %s",
        ip.replace('::ffff:', ''),
        req.method,
        req.url,
        status_code,
        (nowTS - req.requestTime.getTime()),
        agent)
    try {
        res.status(status_code)
            .header('X-METACOIN-NODE', "v2.2.0")
            .send(message)
    } catch (e) {
        logger.error(e);
    }
}

module.exports = {
    default_response_process,
    default_txresponse_process,
    response,
    errorHandler
}
