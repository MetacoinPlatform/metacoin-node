const router = require('express').Router()
const config = require('../../config.json');

const { request } = require('../utils/lib.superagent')
const { ParameterCheck } = require('../utils/lib')
const { default_response_process,
    response } = require('../utils/lib.express')

function post_mrc020(req, res) {
    ParameterCheck(req.body, 'owner', "address");
    ParameterCheck(req.body, 'algorithm', "", true, 0, 64);
    ParameterCheck(req.body, 'data', "", false, 1, 2048);
    ParameterCheck(req.body, 'publickey');
    ParameterCheck(req.body, 'opendate');
    ParameterCheck(req.body, 'referencekey', "", true, 0, 64);
    ParameterCheck(req.body, 'signature');

    if (req.body.data.length > 2048) {
        response(req, res, 400, 'data is too long');
        return;
    }

    if (req.body.referencekey.length > 64) {
        response(req, res, 400, 'referencekey is too long');
        return;
    }

    if (!/[^a-zA-Z0-9]/.test(req.body.referencekey)) {
        response(req, res, 400, 'Reference key is a-z, A-Z, 0-9 only');
        return;
    }

    if (req.body.algorithm.length > 64) {
        response(req, res, 400, 'algorithm is too long');
        return;
    }

    let now = Math.round(new Date().getTime() / 1000);
    let opendate = parseInt(req.body.opendate);
    if (opendate == NaN) {
        response(req, res, 400, 'The opendate value is not unix timesamp');
        return;
    }

    if ((opendate - now) <= 0) {
        response(req, res, 400, 'The opendate value is not a future');
        return;
    }

    if ((opendate - now) > 3600) {
        response(req, res, 400, 'The opendate value is not within one hour.');
        return;
    }

    request.post(config.MTCBridge + "/mrc020",
        req.body,
        function (err, response) { default_response_process(err, req, res, response) });
}

function get_mrc020(req, res) {
    request.get(config.MTCBridge + "/mrc020/" + req.params.mrc020key,
        function (err, response) { default_response_process(err, req, res, response) });
}

// mrc020
router.post('/mrc020', post_mrc020);
router.get('/mrc020/:mrc020key', get_mrc020);

module.exports = router
